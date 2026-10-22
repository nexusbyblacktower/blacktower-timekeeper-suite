import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  configured: true,
  signIn: vi.fn(), signOut: vi.fn(), getUser: vi.fn(), getSession: vi.fn(),
  from: vi.fn(), listener: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("@/lib/auth/client", () => ({
  get isSupabaseConfigured() { return mocks.configured; },
  supabase: {
    auth: {
      signInWithPassword: mocks.signIn, signOut: mocks.signOut,
      getUser: mocks.getUser, getSession: mocks.getSession,
      onAuthStateChange: mocks.listener,
    },
    from: mocks.from,
  },
}));
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "kelvin@blacktower.internal", user_metadata: { full_name: "Untrusted", roles: ["admin"] } } as unknown as User;
const Probe = () => {
  const auth = useAuth();
  return <><output data-testid="state">{JSON.stringify({ id: auth.user?.id ?? null, roles: auth.roles, isAdmin: auth.isAdmin, personCode: auth.personCode, loading: auth.loading })}</output><button onClick={() => void auth.signOut()}>Sign out</button></>;
};
function state() { return JSON.parse(screen.getByTestId("state").textContent || "{}"); }

beforeEach(() => {
  vi.clearAllMocks(); mocks.configured = true; localStorage.clear();
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.listener.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
  mocks.signIn.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => table === "user_roles" ? Promise.resolve({ data: [{ role: "member" }], error: null }) : { maybeSingle: () => Promise.resolve({ data: { person_code: "PERSON-0001", full_name: "Kelvin Ong", auth_user_id: user.id }, error: null }) } }) }));
});
afterEach(cleanup);

describe("production internal authentication", () => {
  it("never restores a fabricated local administrator", async () => {
    localStorage.setItem("blacktower_local_terminal_operator", JSON.stringify({ ...user, explicit_roles: ["admin"] }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(state().loading).toBe(false));
    expect(state()).toMatchObject({ id: null, roles: [], isAdmin: false });
  });
  it("submits the internal identity through real password Auth only", async () => {
    render(<MemoryRouter><AuthProvider><Auth /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("INTERNAL LOGIN ID"), { target: { value: "kelvin@blacktower.internal" } });
    fireEvent.change(screen.getByLabelText("PASSWORD"), { target: { value: "test-only-not-a-real-password" } });
    fireEvent.click(screen.getByRole("button", { name: "ENTER TERMINAL" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({ email: "kelvin@blacktower.internal", password: "test-only-not-a-real-password" }));
    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
  });
  it("uses DB roles, not administrator metadata, and binds canonical People separately", async () => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(state().loading).toBe(false));
    expect(mocks.from).toHaveBeenCalledWith("user_roles");
    expect(mocks.from).toHaveBeenCalledWith("operator_profiles");
    expect(state()).toMatchObject({ id: user.id, roles: ["member"], isAdmin: false, personCode: "PERSON-0001" });
    expect(state().id).not.toBe(state().personCode);
  });
  it("fails closed without configuration and never requests Auth or records", async () => {
    mocks.configured = false;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(state().loading).toBe(false));
    expect(state()).toMatchObject({ id: null, roles: [], isAdmin: false });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.listener).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("signs out through Auth and removes authorization", async () => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(state().loading).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(state().id).toBeNull());
  });
});