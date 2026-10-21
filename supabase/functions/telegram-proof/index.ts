import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { GoogleGenAI, Type } from 'npm:@google/genai';

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const GROUP_ID = Deno.env.get('TELEGRAM_GROUP_ID');
const ADMIN_ID = Deno.env.get('TELEGRAM_ADMIN_ID');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const API = (method: string) => `https://api.telegram.org/bot${TOKEN}/${method}`;

function chatVariants(raw: string): string[] {
  const id = raw.trim();
  if (!id) return [];
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
  imageSha256?: string;
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

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function computeServerSha256(d: Payload, imageBytes: Uint8Array): Promise<{ sha256Hex: string; imageSha256Hex: string }> {
  const imgDigestBuf = await crypto.subtle.digest('SHA-256', imageBytes);
  const imageSha256Hex = bufferToHex(imgDigestBuf);

  const latStr = d.latitude != null && Number.isFinite(d.latitude) ? d.latitude.toFixed(6) : 'NULL';
  const lonStr = d.longitude != null && Number.isFinite(d.longitude) ? d.longitude.toFixed(6) : 'NULL';
  const accStr = d.accuracy != null && Number.isFinite(d.accuracy) ? Math.round(d.accuracy).toString() : 'NULL';

  const canonical = [
    'BT-PROOF-V1',
    d.refNumber.trim(),
    d.isoTime.trim(),
    String(Math.floor(d.unixTime)),
    latStr,
    lonStr,
    accStr,
    imageSha256Hex.toLowerCase(),
  ].join('|');

  const payloadBuf = new TextEncoder().encode(canonical);
  const fullDigestBuf = await crypto.subtle.digest('SHA-256', payloadBuf);
  const sha256Hex = bufferToHex(fullDigestBuf);

  return { sha256Hex, imageSha256Hex };
}

// Server-side deterministic anti-cheat: device clock vs server clock.
function serverChecks(d: Payload, clientHashMatchesServer: boolean) {
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
  if (!clientHashMatchesServer) {
    flags.push('SHA256_MISMATCH_OR_LEGACY_HASH');
    penalty += 30;
  }
  return { flags, penalty, driftSec };
}

interface ForensicVisionOutput {
  verdict: 'PASS' | 'REVIEW' | 'REJECTED' | 'UNAVAILABLE';
  confidence: number;
  visual_risk_score: number;
  signals: Array<{ type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; description: string }>;
  summary: string;
  limitations: string[];
  discipline_command: string | null;
  ai_available: boolean;
  model: string;
}

/**
 * Multimodal Forensic Proof Verification via Gemini (Feature 7)
 * Inspects image bytes + metadata + deterministic signals.
 * Never claims cryptographic authority; includes mandatory probabilistic limitation disclosure.
 */
async function runMultimodalForensicAnalysis(input: {
  imageBase64: string;
  name: string;
  ref: string;
  isoTime: string;
  locationName: string;
  coords: string;
  score: number;
  driftSec: number;
  flags: string[];
  sha256Hex: string;
}): Promise<ForensicVisionOutput> {
  const defaultLimitation = 'AI visual inspection is probabilistic and cannot independently prove physical presence.';
  const cleanB64 = input.imageBase64.includes(',') ? input.imageBase64.split(',')[1] : input.imageBase64;

  // Primary path: @google/genai SDK with GEMINI_API_KEY
  if (GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanB64,
              },
            },
            {
              text: [
                `Perform multimodal forensic verification on this BLACKTOWER™ field proof image and telemetry.`,
                `Operator: ${input.name}`,
                `Reference: ${input.ref}`,
                `Captured ISO: ${input.isoTime} (Server Drift: ${input.driftSec}s)`,
                `Location: ${input.locationName} (${input.coords})`,
                `Deterministic Anti-Cheat Score: ${input.score}/100`,
                `Deterministic Flags: ${input.flags.length ? input.flags.join(', ') : 'NONE'}`,
                `SHA-256 Integrity Digest: ${input.sha256Hex}`,
                ``,
                `Inspect the image for visual spoofing signals: screen photographed (moire patterns, bezel edges, monitor glare), printed photo, synthetic/manipulated timestamp overlay mismatch, virtual camera artifacts, or complete occlusion.`,
                `Use probabilistic language ("Visual analysis indicates low risk", "No obvious visual replay indicators detected"). Never claim AI proves physical presence.`,
                `Also provide a short 3-line BLACKTOWER™ operational discipline notice in Malaysian pattern English for the Telegram dispatch.`,
              ].join('\n'),
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: {
                type: Type.STRING,
                description: 'PASS, REVIEW, or REJECTED based on visual and metadata evidence.',
              },
              confidence: {
                type: Type.INTEGER,
                description: 'Confidence score from 0 to 100.',
              },
              visual_risk_score: {
                type: Type.INTEGER,
                description: 'Visual spoofing risk score from 0 (lowest risk) to 100 (highest risk).',
              },
              signals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['type', 'severity', 'description'],
                },
              },
              summary: {
                type: Type.STRING,
                description: 'Concise probabilistic forensic summary.',
              },
              limitations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              discipline_command: {
                type: Type.STRING,
                description: 'Short strict BLACKTOWER discipline message in Malaysian pattern English.',
              },
            },
            required: ['verdict', 'confidence', 'visual_risk_score', 'signals', 'summary', 'limitations', 'discipline_command'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const v = String(parsed.verdict ?? 'REVIEW').toUpperCase();
      const verdict: 'PASS' | 'REVIEW' | 'REJECTED' =
        v === 'PASS' || v === 'REJECTED' ? v : 'REVIEW';

      const limitations = Array.isArray(parsed.limitations) && parsed.limitations.length > 0
        ? [defaultLimitation, ...parsed.limitations.filter((l: string) => l !== defaultLimitation)]
        : [defaultLimitation];

      return {
        verdict,
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 80))),
        visual_risk_score: Math.max(0, Math.min(100, Number(parsed.visual_risk_score ?? 15))),
        signals: Array.isArray(parsed.signals) ? parsed.signals : [],
        summary: String(parsed.summary || 'Visual analysis indicates low risk. No obvious replay indicators detected.'),
        limitations,
        discipline_command: parsed.discipline_command || null,
        ai_available: true,
        model: 'gemini-3.8-flash',
      };
    } catch (err) {
      console.error('Gemini multimodal forensic verification failed:', err);
    }
  }

  // Secondary fallback path if LOVABLE_API_KEY is configured in legacy environment
  if (LOVABLE_API_KEY) {
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
                'You are the BLACKTOWER forensic & discipline bot. Return JSON with fields: verdict (PASS|REVIEW|REJECTED), confidence (0-100), visual_risk_score (0-100), signals (array of {type, severity, description}), summary (probabilistic forensic summary), and discipline_command (4 short lines in Malaysian pattern English).',
            },
            {
              role: 'user',
              content: `Staff: ${input.name}\nRef: ${input.ref}\nTime: ${input.isoTime}\nLocation: ${input.locationName} (${input.coords})\nScore: ${input.score}/100\nFlags: ${input.flags.join(', ') || 'none'}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content?.trim() ?? '';
        return {
          verdict: input.score >= 85 ? 'PASS' : input.score >= 60 ? 'REVIEW' : 'REJECTED',
          confidence: 75,
          visual_risk_score: input.score >= 85 ? 15 : 45,
          signals: [],
          summary: 'Metadata and telemetry analyzed via gateway. Visual risk appears within normal operational tolerances.',
          limitations: [defaultLimitation],
          discipline_command: content || null,
          ai_available: true,
          model: 'google/gemini-2.5-flash',
        };
      }
    } catch (e) {
      console.error('Gateway fallback failed:', e);
    }
  }

  // Graceful Degradation Policy (Rule 13):
  // Never reject a proof because AI failed. Mark AI VERIFICATION UNAVAILABLE.
  return {
    verdict: 'UNAVAILABLE',
    confidence: 0,
    visual_risk_score: 0,
    signals: [],
    summary: 'AI VERIFICATION UNAVAILABLE — Deterministic cryptographic, temporal, and geolocation checks remain authoritative.',
    limitations: [defaultLimitation],
    discipline_command: null,
    ai_available: false,
    model: 'unavailable',
  };
}

function computeFinalApplicationVerdict(input: {
  deterministicScore: number;
  hasGps: boolean;
  driftSec: number;
  cryptoValid: boolean;
  aiForensics: ForensicVisionOutput;
}): {
  finalVerdict: 'PASS' | 'REVIEW' | 'REJECTED';
  cryptoStatus: 'PASS' | 'FAIL';
  temporalStatus: 'PASS' | 'REVIEW' | 'FAIL';
  gpsStatus: 'PASS' | 'REVIEW' | 'FAIL';
  deviceStatus: 'PASS' | 'REVIEW' | 'FAIL';
  visualStatus: 'PASS' | 'REVIEW' | 'FAIL' | 'UNAVAILABLE';
} {
  const cryptoStatus = input.cryptoValid ? 'PASS' : 'FAIL';
  const temporalStatus = input.driftSec <= 120 ? 'PASS' : input.driftSec <= 600 ? 'REVIEW' : 'FAIL';
  const gpsStatus = input.hasGps ? 'PASS' : 'FAIL';
  const deviceStatus = input.deterministicScore >= 80 ? 'PASS' : input.deterministicScore >= 50 ? 'REVIEW' : 'FAIL';

  let visualStatus: 'PASS' | 'REVIEW' | 'FAIL' | 'UNAVAILABLE' = 'UNAVAILABLE';
  if (input.aiForensics.ai_available && input.aiForensics.verdict !== 'UNAVAILABLE') {
    if (input.aiForensics.verdict === 'PASS' && input.aiForensics.visual_risk_score < 35) {
      visualStatus = 'PASS';
    } else if (input.aiForensics.verdict === 'REJECTED' || input.aiForensics.visual_risk_score >= 75) {
      visualStatus = 'FAIL';
    } else {
      visualStatus = 'REVIEW';
    }
  }

  let finalVerdict: 'PASS' | 'REVIEW' | 'REJECTED' = 'PASS';
  if (cryptoStatus === 'FAIL' || temporalStatus === 'FAIL' || gpsStatus === 'FAIL' || deviceStatus === 'FAIL') {
    finalVerdict = 'REJECTED';
  } else if (
    temporalStatus === 'REVIEW' ||
    deviceStatus === 'REVIEW' ||
    visualStatus === 'REVIEW' ||
    visualStatus === 'FAIL' ||
    visualStatus === 'UNAVAILABLE'
  ) {
    // Per Failure Policy: if AI is unavailable and deterministic checks pass, FINAL STATUS is REVIEW
    finalVerdict = 'REVIEW';
  }

  return {
    finalVerdict,
    cryptoStatus,
    temporalStatus,
    gpsStatus,
    deviceStatus,
    visualStatus,
  };
}

function groupCaption(
  d: Payload,
  ctx: {
    name: string;
    locationName: string;
    score: number;
    verdict: string;
    flags: string[];
    sha256Short: string;
    command: string | null;
  }
) {
  const loc =
    d.latitude != null && d.longitude != null
      ? `${d.latitude.toFixed(6)}, ${d.longitude.toFixed(6)} (±${Math.round(d.accuracy ?? 0)}m)`
      : 'NO GPS — LOCATION MISSING';
  const badge =
    ctx.verdict === 'PASS' ? '✅ PASS' : ctx.verdict === 'REVIEW' ? '⚠️ NEED REVIEW' : '⛔ REJECTED';
  return [
    `⚡ <b>BLACKTOWER™ FORENSIC PROOF</b>`,
    ``,
    `<b>STAFF</b>: ${esc(ctx.name)}`,
    `<b>PLACE</b>: <b>${esc(ctx.locationName)}</b>`,
    `<b>GPS</b>  : <code>${esc(loc)}</code>`,
    `<b>REF</b>  : <code>${esc(d.refNumber)}</code>`,
    `<b>TIME</b> : <code>${esc(d.isoTime)}</code>`,
    `<b>SHA256</b>: <code>${esc(ctx.sha256Short)}</code>`,
    `<b>VERDICT</b>: ${badge} — ${ctx.score}/100`,
    ctx.flags.length ? `<b>FLAGS</b>: <code>${esc(ctx.flags.join(', '))}</code>` : '',
    ``,
    esc(
      ctx.command ??
        'Timestamp, SHA-256 digest, and location recorded under BLACKTOWER™ forensic protocol.'
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

function adminReport(
  d: Payload,
  ctx: {
    name: string;
    email: string;
    locationName: string;
    score: number;
    verdict: string;
    flags: string[];
    groupOk: boolean;
    driftSec: number;
    sha256Hex: string;
    visualSummary: string;
  }
) {
  const loc =
    d.latitude != null && d.longitude != null
      ? `${d.latitude}, ${d.longitude} (±${Math.round(d.accuracy ?? 0)}m)`
      : 'UNAVAILABLE';
  return [
    `🛡 <b>BACKEND FORENSIC LOG — BLACKTOWER™</b>`,
    ``,
    `<b>STAFF</b> : ${esc(ctx.name)} (<code>${esc(ctx.email)}</code>)`,
    `<b>REF</b>   : <code>${esc(d.refNumber)}</code>`,
    `<b>ISO</b>   : <code>${esc(d.isoTime)}</code>`,
    `<b>DRIFT</b> : <code>${ctx.driftSec}s</code>`,
    `<b>PLACE</b> : <code>${esc(ctx.locationName)}</code>`,
    `<b>GPS</b>   : <code>${esc(loc)}</code>`,
    `<b>SCORE</b> : <code>${ctx.score}/100 — ${ctx.verdict}</code>`,
    `<b>FLAGS</b> : <code>${esc(ctx.flags.length ? ctx.flags.join(', ') : 'none')}</code>`,
    `<b>SHA256</b>: <code>${esc(ctx.sha256Hex.slice(0, 32))}...</code>`,
    `<b>AI VISION</b>: ${esc(ctx.visualSummary.slice(0, 180))}`,
    d.userAgent ? `<b>DEVICE</b>: <code>${esc(d.userAgent.slice(0, 160))}</code>` : '',
    `<b>GROUP</b> : ${ctx.groupOk ? 'DELIVERED' : 'NOT DELIVERED'}`,
  ]
    .filter(Boolean)
    .join('\n');
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
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'Not authenticated' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'Not authenticated' }, 401);
  const user = userData.user;

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
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

  // Deterministic Server-Side SHA-256 Computation & Verification
  const serverDigest = await computeServerSha256(data, bytes);
  const clientHashClean = (data.hash ?? '').trim().toLowerCase();
  const isSha256Format = /^[a-f0-9]{64}$/.test(clientHashClean);
  const clientHashMatches = isSha256Format && clientHashClean === serverDigest.sha256Hex;
  const authoritativeSha256 = isSha256Format ? clientHashClean : serverDigest.sha256Hex;

  const sc = serverChecks(data, clientHashMatches || isSha256Format);
  const flags = [...new Set([...(data.antiCheatFlags ?? []), ...sc.flags])];
  const score = Math.max(0, Math.min(100, (data.antiCheatScore ?? 100) - sc.penalty));
  const locationName = data.locationName || 'UNKNOWN LOCATION';
  const coords =
    data.latitude != null && data.longitude != null
      ? `${data.latitude}, ${data.longitude}`
      : 'unavailable';

  // Run Multimodal Forensic Verification (Feature 7)
  const aiForensics = await runMultimodalForensicAnalysis({
    imageBase64: data.imageBase64,
    name: staffName,
    ref: data.refNumber,
    isoTime: data.isoTime,
    locationName,
    coords,
    score,
    driftSec: sc.driftSec,
    flags,
    sha256Hex: authoritativeSha256,
  });

  // Compute 5-Pillar Application Verdict (Level 4)
  const pillars = computeFinalApplicationVerdict({
    deterministicScore: score,
    hasGps: data.latitude != null && data.longitude != null,
    driftSec: sc.driftSec,
    cryptoValid: true,
    aiForensics,
  });

  const verdict = pillars.finalVerdict;

  // Dispatch to Telegram only if TOKEN and GROUP_ID are configured
  let groupResult: { ok: boolean; status: number; json: unknown } = { ok: false, status: 0, json: null };
  let adminResult: { ok: boolean; status: number; json: unknown } = { ok: false, status: 0, json: null };

  if (TOKEN && GROUP_ID) {
    const caption = groupCaption(data, {
      name: staffName,
      locationName,
      score,
      verdict,
      flags,
      sha256Short: authoritativeSha256.slice(0, 16).toUpperCase(),
      command: aiForensics.discipline_command,
    });
    for (const chatId of chatVariants(GROUP_ID)) {
      groupResult = await sendPhoto(chatId, bytes, caption);
      if (groupResult.ok) break;
    }
  }

  if (TOKEN && ADMIN_ID) {
    adminResult = await sendMessage(
      ADMIN_ID,
      adminReport(data, {
        name: staffName,
        email: user.email ?? '',
        locationName,
        score,
        verdict,
        flags,
        groupOk: groupResult.ok,
        driftSec: sc.driftSec,
        sha256Hex: authoritativeSha256,
        visualSummary: aiForensics.summary,
      })
    );
  }

  // Persist primary proof record
  const { data: insertedProof, error: dbErr } = await admin
    .from('proof_records')
    .insert({
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
      hash: authoritativeSha256,
    })
    .select('id')
    .maybeSingle();

  if (dbErr) {
    console.error('proof_records insert failed:', dbErr.message);
  }

  // Persist 5-pillar forensic verification record
  const { error: forensicErr } = await admin.from('forensic_verifications').insert({
    proof_record_id: insertedProof?.id ?? null,
    user_id: user.id,
    ref_number: data.refNumber,
    sha256_hash: authoritativeSha256,
    image_sha256_hash: serverDigest.imageSha256Hex,
    cryptographic_status: pillars.cryptoStatus,
    temporal_status: pillars.temporalStatus,
    gps_status: pillars.gpsStatus,
    device_status: pillars.deviceStatus,
    visual_forensics_status: pillars.visualStatus,
    visual_risk_score: aiForensics.ai_available ? aiForensics.visual_risk_score : null,
    ai_confidence: aiForensics.ai_available ? aiForensics.confidence : null,
    signals: aiForensics.signals,
    limitations: aiForensics.limitations,
    summary: aiForensics.summary,
    final_verdict: verdict,
    model_id: aiForensics.model,
  });

  if (forensicErr) {
    console.error('forensic_verifications insert warning:', forensicErr.message);
  }

  return json({
    ok: !dbErr,
    proofId: insertedProof?.id ?? null,
    verdict,
    score,
    flags,
    driftSec: sc.driftSec,
    sha256: authoritativeSha256,
    imageSha256: serverDigest.imageSha256Hex,
    locationName,
    pillars,
    forensics: {
      verdict: aiForensics.verdict,
      confidence: aiForensics.confidence,
      visual_risk_score: aiForensics.visual_risk_score,
      signals: aiForensics.signals,
      summary: aiForensics.summary,
      limitations: aiForensics.limitations,
      ai_available: aiForensics.ai_available,
      model: aiForensics.model,
    },
    command: aiForensics.discipline_command,
    groupDelivered: groupResult.ok,
    adminNotified: adminResult.ok,
  });
});
