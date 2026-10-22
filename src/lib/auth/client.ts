import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database";
import { createConfiguredClient } from "./config";

const client = createConfiguredClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  (url, key) => createClient<AuthDatabase>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_publishable_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  }),
);

export const isSupabaseConfigured = client !== null;
export const AUTH_CONFIGURATION_ERROR = "Internal sign-in is unavailable: the dedicated identity connection is not configured.";

// Lazy access preserves public sign-in rendering but cannot initialize or call a
// legacy backend when environment configuration is missing or targets another project.
export const supabase = new Proxy({} as NonNullable<typeof client>, {
  get(_target, property) {
    if (!client) throw new Error(AUTH_CONFIGURATION_ERROR);
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});