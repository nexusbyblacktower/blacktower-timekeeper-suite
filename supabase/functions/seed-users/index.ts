import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';

interface SeedUserConfig {
  email: string;
  password?: string;
  full_name: string;
  admin: boolean;
}

/**
 * SECURED ADMIN USER PROVISIONING ENDPOINT
 * - Zero hardcoded plaintext credentials in source code.
 * - Requires Timing-Safe Cron Secret OR authenticated Admin JWT.
 * - Reads seed user definitions strictly from SEED_USERS_JSON environment secret.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server configuration error' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Authorization Check 1: Cron Secret
  const cronAuthError = authenticateCronRequest(req);
  let isAuthorized = cronAuthError === null;

  // Authorization Check 2: Authenticated Admin User via Bearer JWT
  if (!isAuthorized) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (jwt) {
      const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
      if (!userErr && userData?.user) {
        const { data: roleRow } = await admin
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (roleRow?.role === 'admin') {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    return json({ error: 'Unauthorized: Admin privileges or provisioning secret required' }, 401);
  }

  // Load seed payload from environment secret or request body (never hardcoded)
  const envSeedRaw = Deno.env.get('SEED_USERS_JSON');
  let seedList: SeedUserConfig[] = [];

  try {
    const bodyJson = await req.json().catch(() => null);
    if (bodyJson && Array.isArray(bodyJson.users)) {
      seedList = bodyJson.users;
    } else if (envSeedRaw) {
      seedList = JSON.parse(envSeedRaw);
    }
  } catch {
    return json({ error: 'Invalid seed configuration payload' }, 400);
  }

  if (!Array.isArray(seedList) || seedList.length === 0) {
    return json({ error: 'No seed users configured in SEED_USERS_JSON or request payload' }, 400);
  }

  const results: Record<string, string>[] = [];

  for (const u of seedList) {
    if (!u.email || typeof u.email !== 'string') continue;
    const normalizedEmail = u.email.trim().toLowerCase();

    if (!u.password || u.password.length < 12) {
      results.push({ email: normalizedEmail, status: 'skipped: password missing or shorter than 12 chars' });
      continue;
    }

    let userId: string | null = null;
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    if (error) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((x) => x.email?.toLowerCase() === normalizedEmail);
      if (found) {
        userId = found.id;
        await admin.auth.admin.updateUserById(found.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.full_name },
        });
        results.push({ email: normalizedEmail, status: 'updated' });
      } else {
        results.push({ email: normalizedEmail, status: `error: ${error.message}` });
      }
    } else {
      userId = data.user.id;
      results.push({ email: normalizedEmail, status: 'created' });
    }

    if (userId) {
      await admin.from('profiles').upsert({ id: userId, email: normalizedEmail, full_name: u.full_name });
      await admin.from('user_roles').upsert(
        { user_id: userId, role: u.admin ? 'admin' : 'member' },
        { onConflict: 'user_id,role' },
      );
    }
  }

  return json({ ok: true, results });
});
