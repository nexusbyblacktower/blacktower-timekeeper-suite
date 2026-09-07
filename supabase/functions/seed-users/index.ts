import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SEED = [
  { email: 'blackmasterong@blacktower.com', password: 'B3!xMaster#94K0', full_name: 'Kelvin Ong', admin: true },
  { email: 'lee.zixuan@blacktower.com', password: 'LZX#BT2026!Sec8', full_name: 'Lee Zi Xuan', admin: false },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const results: Record<string, string>[] = [];

  for (const u of SEED) {
    let userId: string | null = null;
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    if (error) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((x) => x.email?.toLowerCase() === u.email);
      if (found) {
        userId = found.id;
        await admin.auth.admin.updateUserById(found.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.full_name },
        });
        results.push({ email: u.email, status: 'updated' });
      } else {
        results.push({ email: u.email, status: `error: ${error.message}` });
      }
    } else {
      userId = data.user.id;
      results.push({ email: u.email, status: 'created' });
    }

    if (userId) {
      await admin.from('profiles').upsert({ id: userId, email: u.email, full_name: u.full_name });
      await admin.from('user_roles').upsert(
        { user_id: userId, role: u.admin ? 'admin' : 'member' },
        { onConflict: 'user_id,role' },
      );
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
