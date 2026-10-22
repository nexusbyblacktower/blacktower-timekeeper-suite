import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/auth/client";
import type { AppRole } from "@/lib/people/peopleTypes";

interface AuthState {
  user: User | null;
  session: Session | null;
  fullName: string | null;
  personCode: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}
const emptyIdentity = { user: null, session: null, fullName: null, personCode: null, roles: [] as AppRole[] };
const AuthContext = createContext<AuthState>({ ...emptyIdentity, isAdmin: false, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [identity, setIdentity] = useState<{ user: User | null; session: Session | null; fullName: string | null; personCode: string | null; roles: AppRole[] }>(emptyIdentity);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setIdentity(emptyIdentity); setLoading(false); return; }
    let active = true;
    let revision = 0;
    const validateIdentity = async (session: Session | null) => {
      const current = ++revision;
      setIdentity(emptyIdentity);
      setLoading(true);
      try {
        // getUser validates the persisted identity with Auth; getSession alone is not trusted.
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return;
        const [roleResult, operatorResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", data.user.id),
          supabase.from("operator_profiles").select("person_code, full_name, auth_user_id").eq("auth_user_id", data.user.id).maybeSingle(),
        ]);
        // No access when protected role or canonical identity lookup fails.
        if (roleResult.error || operatorResult.error || !operatorResult.data || operatorResult.data.auth_user_id !== data.user.id) return;
        const roles = (roleResult.data ?? []).map(r => r.role).filter((role): role is AppRole => role === "admin" || role === "member");
        if (!roles.length) return;
        if (active && revision === current) setIdentity({ user: data.user, session, roles, fullName: operatorResult.data.full_name, personCode: operatorResult.data.person_code });
      } catch { /* Closed on Auth, network or schema errors. */ }
      finally { if (active && revision === current) setLoading(false); }
    };
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        revision++; setIdentity(emptyIdentity); setLoading(false);
      } else {
        // Never await another Auth request inside the Auth lock's callback.
        setTimeout(() => { if (active) void validateIdentity(session); }, 0);
      }
    });
    void validateIdentity(null);
    return () => { active = false; revision++; subscription.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    setIdentity(emptyIdentity);
    setLoading(false);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  };
  return <AuthContext.Provider value={{ ...identity, isAdmin: identity.roles.includes("admin"), loading, signOut }}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);