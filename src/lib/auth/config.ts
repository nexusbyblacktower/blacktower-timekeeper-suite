/** Accept only normal environment configuration for the dedicated identity project. */
export function isDedicatedAuthConfiguration(url?: string, key?: string): boolean {
  if (!url || !key || key.includes("placeholder") || key.startsWith("sb_secret_")) return false;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://ipsywhsxpxibzichdytb.supabase.co" || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) return false;
    if (key.startsWith("sb_publishable_")) return true;
    // Legacy anon JWTs are public, but never accept a service-role JWT.
    const payload = JSON.parse(atob(key.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
    return payload.role === "anon" && payload.ref === "ipsywhsxpxibzichdytb";
  } catch { return false; }
}

export function createConfiguredClient<T>(url: string | undefined, key: string | undefined, factory: (url: string, key: string) => T): T | null {
  if (!url || !key || !isDedicatedAuthConfiguration(url, key)) return null;
  return factory(url, key);
}