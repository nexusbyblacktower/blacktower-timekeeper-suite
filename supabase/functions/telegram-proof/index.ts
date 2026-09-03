import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const GROUP_ID = Deno.env.get('TELEGRAM_GROUP_ID') ?? '3572071479';
const ADMIN_ID = Deno.env.get('TELEGRAM_ADMIN_ID') ?? '6973122708';

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
  return { ok: true, data: p };
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Strict discipline consultant. Malaysian pattern English only.
function groupCaption(d: Payload) {
  const loc = d.latitude != null && d.longitude != null
    ? `${d.latitude.toFixed(6)}, ${d.longitude.toFixed(6)} (±${Math.round(d.accuracy ?? 0)}m)`
    : 'NO GPS — this one cannot accept, ah';
  return [
    `⚡ <b>BLACKTOWER™ DISCIPLINE CHECK</b>`,
    ``,
    `Listen here. One proof just come in. Don't play play, I already record everything.`,
    ``,
    `<b>REF</b>  : <code>${esc(d.refNumber)}</code>`,
    `<b>TIME</b> : <code>${esc(d.isoTime)}</code>`,
    `<b>UNIX</b> : <code>${d.unixTime}</code>`,
    `<b>LOC</b>  : <code>${esc(loc)}</code>`,
    d.hash ? `<b>HASH</b> : <code>${esc(d.hash)}</code>` : '',
    ``,
    `Timestamp cannot cincai change one. If got funny business, straight away I flag. Be on time, be on location — no excuse, understand or not?`,
  ].filter(Boolean).join('\n');
}

function adminReport(d: Payload, groupOk: boolean) {
  const loc = d.latitude != null && d.longitude != null
    ? `${d.latitude}, ${d.longitude} (±${Math.round(d.accuracy ?? 0)}m)`
    : 'UNAVAILABLE';
  return [
    `🛡 <b>BACKEND LOG — BLACKTOWER™</b>`,
    ``,
    `Boss, I report to you straight, no sugar coat.`,
    ``,
    `<b>REF</b>   : <code>${esc(d.refNumber)}</code>`,
    `<b>ISO</b>   : <code>${esc(d.isoTime)}</code>`,
    `<b>UNIX</b>  : <code>${d.unixTime}</code>`,
    `<b>GPS</b>   : <code>${esc(loc)}</code>`,
    d.hash ? `<b>HASH</b>  : <code>${esc(d.hash)}</code>` : '',
    d.userAgent ? `<b>DEVICE</b>: <code>${esc(d.userAgent.slice(0, 200))}</code>` : '',
    `<b>GROUP</b> : ${groupOk ? 'photo delivered already' : '<b>FAILED lah</b> — go check the group id'}`,
    ``,
    `That's all. Anything not right, you settle it now, don't wait until last minute.`,
  ].filter(Boolean).join('\n');
}

async function sendPhoto(chatId: string, bytes: Uint8Array, caption: string) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = validate(await req.json().catch(() => null));
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const data = parsed.data;

  let bytes: Uint8Array;
  try {
    bytes = b64ToBytes(data.imageBase64);
  } catch {
    return new Response(JSON.stringify({ error: 'imageBase64 is not valid base64' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const caption = groupCaption(data);
  let groupResult: { ok: boolean; status: number; json: unknown } = { ok: false, status: 0, json: null };
  for (const chatId of chatVariants(GROUP_ID)) {
    groupResult = await sendPhoto(chatId, bytes, caption);
    if (groupResult.ok) break;
    console.error(`sendPhoto to ${chatId} failed [${groupResult.status}]:`, JSON.stringify(groupResult.json));
  }

  const adminResult = await sendMessage(ADMIN_ID, adminReport(data, groupResult.ok));
  if (!adminResult.ok) {
    console.error(`admin sendMessage failed [${adminResult.status}]:`, JSON.stringify(adminResult.json));
  }

  const ok = groupResult.ok;
  return new Response(
    JSON.stringify({
      ok,
      groupDelivered: groupResult.ok,
      adminNotified: adminResult.ok,
      details: ok ? undefined : groupResult.json,
    }),
    { status: ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
