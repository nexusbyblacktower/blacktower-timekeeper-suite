import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const GROUP_ID = Deno.env.get('TELEGRAM_GROUP_ID') ?? '3572071479';
const ADMIN_ID = Deno.env.get('TELEGRAM_ADMIN_ID') ?? '6973122708';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const API = (method: string) => `https://api.telegram.org/bot${TOKEN}/${method}`;

// A group/supergroup chat id must be negative. Telegram supergroups are -100 prefixed.
function chatVariants(raw: string): string[] {
  const id = raw.trim();
  if (id.startsWith('-') || id.startsWith('@')) return [id];
  return [`-100${id}`, `-${id}`, id];
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Payload {
  imageBase64: string;
  refNumber: string;
  isoTime: string;
  unixTime: number;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  locationName?: string | null;
  locationDetails?: Record<string, unknown> | null;
  antiCheatScore?: number;
  antiCheatFlags?: string[];
  hash?: string;
  userAgent?: string;
}

function validate(b: unknown): { ok: true; data: Payload } | { ok: false; error: string } {
  const p = b as Payload;
  if (!p || typeof p !== 'object') return { ok: false, error: 'Body must be an object' };
  if (typeof p.imageBase64 !== 'string' || p.imageBase64.length < 100) return { ok: false, error: 'imageBase64 is required' };
  if (p.imageBase64.length > 12_000_000) return { ok: false, error: 'Image too large' };
  if (typeof p.refNumber !== 'string' || !p.refNumber) return { ok: false, error: 'refNumber is required' };
  if (typeof p.isoTime !== 'string' || !p.isoTime) return { ok: false, error: 'isoTime is required' };
  if (typeof p.unixTime !== 'number') return { ok: false, error: 'unixTime is required' };
  if (p.locationName != null && typeof p.locationName !== 'string') return { ok: false, error: 'locationName must be text' };
  if (p.antiCheatFlags != null && !Array.isArray(p.antiCheatFlags)) return { ok: false, error: 'antiCheatFlags must be an array' };
  return { ok: true, data: p };
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Server-side anti-cheat: device clock vs server clock.
function serverChecks(d: Payload) {
  const flags: string[] = [];
  let penalty = 0;
  const driftSec = Math.abs(Math.floor(Date.now() / 1000) - d.unixTime);
  if (driftSec > 120) {
    flags.push(`DEVICE_CLOCK_DRIFT:${driftSec}s`);
    penalty += Math.min(50, Math.floor(driftSec / 60) * 10);
  }
  if (d.latitude == null || d.longitude == null) {
    flags.push('NO_COORDINATES_AT_SERVER');
    penalty += 40;
  }
  if (!d.locationName) {
    flags.push('NO_LOCATION_NAME_AT_SERVER');
    penalty += 10;
  }
  return { flags, penalty, driftSec };
}

function verdictOf(score: number) {
  if (score >= 85) return 'PASS';
  if (score >= 60) return 'REVIEW';
  return 'REJECTED';
}

// AI discipline consultant — strict, Malaysian pattern English only.
async function aiCommand(input: {
  name: string;
  ref: string;
  isoTime: string;
  locationName: string;
  coords: string;
  score: number;
  verdict: string;
  flags: string[];
}): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You are the BLACKTOWER discipline consultant bot. You are strict, no nonsense, and you speak ONLY in Malaysian pattern English (lah, ah, one, cannot play play, don\'t cincai, settle it now). Never use other languages. Maximum 4 short lines. Always name the staff, the location name, and the anti-cheat verdict. If verdict is REVIEW or REJECTED, order the staff to retake the proof immediately and warn about consequences. Plain text only, no markdown.',
          },
          {
            role: 'user',
            content: `Staff: ${input.name}\nRef: ${input.ref}\nTime: ${input.isoTime}\nLocation name: ${input.locationName}\nCoordinates: ${input.coords}\nAnti-cheat score: ${input.score}/100\nVerdict: ${input.verdict}\nFlags: ${input.flags.length ? input.flags.join(', ') : 'none'}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error('AI gateway error', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error('AI gateway failed', e);
    return null;
  }
}

function groupCaption(d: Payload, ctx: { name: string; locationName: string; score: number; verdict: string; flags: string[]; command: string | null }) {
  const loc = d.latitude != null && d.longitude != null
    ? `${d.latitude.toFixed(6)}, ${d.longitude.toFixed(6)} (±${Math.round(d.accuracy ?? 0)}m)`
    : 'NO GPS — this one cannot accept, ah';
  const badge = ctx.verdict === 'PASS' ? '✅ PASS' : ctx.verdict === 'REVIEW' ? '⚠️ NEED REVIEW' : '⛔ REJECTED';
  return [
    `⚡ <b>BLACKTOWER™ DISCIPLINE CHECK</b>`,
    ``,
    `<b>STAFF</b>: ${esc(ctx.name)}`,
    `<b>PLACE</b>: <b>${esc(ctx.locationName)}</b>`,
    `<b>GPS</b>  : <code>${esc(loc)}</code>`,
    `<b>REF</b>  : <code>${esc(d.refNumber)}</code>`,
    `<b>TIME</b> : <code>${esc(d.isoTime)}</code>`,
    `<b>ANTI-CHEAT</b>: ${badge} — ${ctx.score}/100`,
    ctx.flags.length ? `<b>FLAGS</b>: <code>${esc(ctx.flags.join(', '))}</code>` : '',
    ``,
    esc(ctx.command ?? "Listen here. Timestamp and location cannot cincai change one. Be on time, be on location — no excuse, understand or not?"),
  ].filter(Boolean).join('\n');
}

function adminReport(d: Payload, ctx: { name: string; email: string; locationName: string; score: number; verdict: string; flags: string[]; groupOk: boolean; driftSec: number }) {
  const loc = d.latitude != null && d.longitude != null
    ? `${d.latitude}, ${d.longitude} (±${Math.round(d.accuracy ?? 0)}m)`
    : 'UNAVAILABLE';
  return [
    `🛡 <b>BACKEND LOG — BLACKTOWER™</b>`,
    ``,
    `Boss, I report to you straight, no sugar coat.`,
    ``,
    `<b>STAFF</b> : ${esc(ctx.name)} (<code>${esc(ctx.email)}</code>)`,
    `<b>REF</b>   : <code>${esc(d.refNumber)}</code>`,
    `<b>ISO</b>   : <code>${esc(d.isoTime)}</code>`,
    `<b>DRIFT</b> : <code>${ctx.driftSec}s</code>`,
    `<b>PLACE</b> : <code>${esc(ctx.locationName)}</code>`,
    `<b>GPS</b>   : <code>${esc(loc)}</code>`,
    `<b>SCORE</b> : <code>${ctx.score}/100 — ${ctx.verdict}</code>`,
    `<b>FLAGS</b> : <code>${esc(ctx.flags.length ? ctx.flags.join(', ') : 'none')}</code>`,
    d.hash ? `<b>HASH</b>  : <code>${esc(d.hash)}</code>` : '',
    d.userAgent ? `<b>DEVICE</b>: <code>${esc(d.userAgent.slice(0, 200))}</code>` : '',
    `<b>GROUP</b> : ${ctx.groupOk ? 'photo delivered already' : '<b>FAILED lah</b> — go check the group id'}`,
    ``,
    `That's all. Anything not right, you settle it now, don't wait until last minute.`,
  ].filter(Boolean).join('\n');
}

async function sendPhoto(chatId: string, bytes: Uint8Array, caption: string) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption.slice(0, 1024));
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([bytes], { type: 'image/png' }), 'proof.png');
  const res = await fetch(API('sendPhoto'), { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.ok === true, status: res.status, json };
}

async function sendMessage(chatId: string, text: string) {
  const res = await fetch(API('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.ok === true, status: res.status, json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!TOKEN) return json({ error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);

  // Auth: only signed-in BLACKTOWER staff may submit proof.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'Not authenticated' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'Not authenticated' }, 401);
  const user = userData.user;

  const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const staffName = profile?.full_name || user.email || 'UNKNOWN STAFF';

  const parsed = validate(await req.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const data = parsed.data;

  let bytes: Uint8Array;
  try {
    bytes = b64ToBytes(data.imageBase64);
  } catch {
    return json({ error: 'imageBase64 is not valid base64' }, 400);
  }

  const sc = serverChecks(data);
  const flags = [...(data.antiCheatFlags ?? []), ...sc.flags];
  const score = Math.max(0, Math.min(100, (data.antiCheatScore ?? 100) - sc.penalty));
  const verdict = verdictOf(score);
  const locationName = data.locationName || 'UNKNOWN LOCATION';
  const coords = data.latitude != null && data.longitude != null
    ? `${data.latitude}, ${data.longitude}`
    : 'unavailable';

  const command = await aiCommand({
    name: staffName, ref: data.refNumber, isoTime: data.isoTime,
    locationName, coords, score, verdict, flags,
  });

  const caption = groupCaption(data, { name: staffName, locationName, score, verdict, flags, command });
  let groupResult: { ok: boolean; status: number; json: unknown } = { ok: false, status: 0, json: null };
  for (const chatId of chatVariants(GROUP_ID)) {
    groupResult = await sendPhoto(chatId, bytes, caption);
    if (groupResult.ok) break;
    console.error(`sendPhoto to ${chatId} failed [${groupResult.status}]:`, JSON.stringify(groupResult.json));
  }

  const adminResult = await sendMessage(
    ADMIN_ID,
    adminReport(data, { name: staffName, email: user.email ?? '', locationName, score, verdict, flags, groupOk: groupResult.ok, driftSec: sc.driftSec }),
  );
  if (!adminResult.ok) {
    console.error(`admin sendMessage failed [${adminResult.status}]:`, JSON.stringify(adminResult.json));
  }

  const { error: dbErr } = await admin.from('proof_records').insert({
    user_id: user.id,
    ref_number: data.refNumber,
    captured_at: data.isoTime,
    unix_time: data.unixTime,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    accuracy: data.accuracy ?? null,
    location_name: data.locationName ?? null,
    location_details: data.locationDetails ?? null,
    anti_cheat_score: score,
    anti_cheat_flags: flags,
    verdict,
    device_info: data.userAgent ?? null,
    hash: data.hash ?? null,
  });
  if (dbErr) console.error('proof_records insert failed:', dbErr.message);

  return json(
    {
      ok: groupResult.ok,
      verdict,
      score,
      flags,
      locationName,
      command,
      groupDelivered: groupResult.ok,
      adminNotified: adminResult.ok,
      details: groupResult.ok ? undefined : groupResult.json,
    },
    groupResult.ok ? 200 : 502,
  );
});
