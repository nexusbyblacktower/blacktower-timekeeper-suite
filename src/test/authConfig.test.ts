import { describe, expect, it, vi } from "vitest";
import { createConfiguredClient, isDedicatedAuthConfiguration } from "@/lib/auth/config";

describe("dedicated auth configuration", () => {
  const url = "https://ipsywhsxpxibzichdytb.supabase.co";
  it("does not construct a client without the configured URL", () => {
    const factory = vi.fn();
    expect(createConfiguredClient(undefined, "publishable-test", factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
  it("does not construct a client without the configured publishable key", () => {
    const factory = vi.fn();
    expect(createConfiguredClient(url, undefined, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
  it("rejects legacy projects, placeholders and private keys", () => {
    expect(isDedicatedAuthConfiguration("https://legacy.supabase.co", "sb_publishable_test")).toBe(false);
    expect(isDedicatedAuthConfiguration(url, "sb_publishable_preview_placeholder_key")).toBe(false);
    expect(isDedicatedAuthConfiguration(url, "sb_secret_test")).toBe(false);
  });
  it("constructs only the dedicated project from configured public values", () => {
    const factory = vi.fn(() => ({ configured: true }));
    expect(createConfiguredClient(url, "sb_publishable_test", factory)).toEqual({ configured: true });
    expect(factory).toHaveBeenCalledWith(url, "sb_publishable_test");
  });
});