import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/people/peopleTypes";
import { isActorAdmin } from "@/lib/people/peopleSecurityEngine";

interface AuthState {
  user: User | null;
  session: Session | null;
  fullName: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  enableLocalTerminalSession: (email: string, name?: string, explicitRoles?: AppRole[], explicitUserId?: string) => void;
  setLocalOperatorRoleAndIdentity: (params: {
    userId: string;
    email: string;
    fullName: string;
    roles: AppRole[];
  }) => void;
}

const LOCAL_TERMINAL_KEY = "blacktower_local_terminal_operator";

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  fullName: null,
  roles: [],
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  enableLocalTerminalSession: () => {},
  setLocalOperatorRoleAndIdentity: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocalFallbackUser = () => {
    try {
      const saved = localStorage.getItem(LOCAL_TERMINAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email) {
          setUser(parsed as User);
          setFullName(parsed.user_metadata?.full_name || "Kelvin Ong");
          const savedRoles: AppRole[] = Array.isArray(parsed.explicit_roles)
            ? parsed.explicit_roles.filter((r: string) => r === "admin" || r === "member")
            : ["admin", "member"];
          setRoles(savedRoles);
          return true;
        }
      }
    } catch {
      // ignore storage errors
    }
    return false;
  };

  const fetchUserProfileAndRoles = async (authUser: User) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", authUser.id),
      ]);

      setFullName(profileRes.data?.full_name ?? authUser.user_metadata?.full_name ?? null);

      if (rolesRes.data && Array.isArray(rolesRes.data)) {
        const dbRoles = rolesRes.data
          .map((r) => r.role)
          .filter((r): r is AppRole => r === "admin" || r === "member");
        setRoles(dbRoles);
      } else {
        setRoles([]);
      }
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        setLoading(false);
        setTimeout(() => {
          fetchUserProfileAndRoles(s.user);
        }, 0);
      } else if (!loadLocalFallbackUser()) {
        setSession(null);
        setUser(null);
        setFullName(null);
        setRoles([]);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data?.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          fetchUserProfileAndRoles(data.session.user);
        } else {
          loadLocalFallbackUser();
        }
        setLoading(false);
      })
      .catch(() => {
        loadLocalFallbackUser();
        setLoading(false);
      });

    return () => sub.subscription.unsubscribe();
  }, []);

  const enableLocalTerminalSession = (
    email: string,
    name: string = "Kelvin Ong",
    explicitRoles: AppRole[] = ["admin", "member"],
    explicitUserId: string = "00000000-0000-4000-8000-000000000001"
  ) => {
    const mockUser = {
      id: explicitUserId,
      aud: "authenticated",
      role: "authenticated",
      email: email.trim().toLowerCase(),
      app_metadata: { provider: "email" },
      user_metadata: { full_name: name },
      explicit_roles: explicitRoles,
      created_at: new Date().toISOString(),
    } as unknown as User;

    try {
      localStorage.setItem(LOCAL_TERMINAL_KEY, JSON.stringify(mockUser));
    } catch {
      // ignore
    }
    setUser(mockUser);
    setFullName(name);
    setRoles(explicitRoles);
    setLoading(false);
  };

  const setLocalOperatorRoleAndIdentity = ({
    userId,
    email,
    fullName: name,
    roles: nextRoles,
  }: {
    userId: string;
    email: string;
    fullName: string;
    roles: AppRole[];
  }) => {
    enableLocalTerminalSession(email, name, nextRoles, userId);
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_TERMINAL_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
    setFullName(null);
    setRoles([]);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  // Strictly determined from explicit user_roles (`admin`), NEVER from name, email, or title
  const isAdmin = isActorAdmin({
    userId: user?.id ?? null,
    roles,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        fullName,
        roles,
        isAdmin,
        loading,
        signOut,
        enableLocalTerminalSession,
        setLocalOperatorRoleAndIdentity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
