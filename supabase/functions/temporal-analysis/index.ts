import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { GoogleGenAI, Type } from 'npm:@google/genai';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL_ID = 'gemini-3.8-flash';

/**
 * BLACKTOWER™ TEMPORAL, GEOSPATIAL & CONTEXT INTELLIGENCE EDGE FUNCTION
 *
 * Strictly adheres to the 4-Layer Trust Model:
 * - Receives pre-computed deterministic metrics (Level 2)
 * - Uses Gemini with structured responseSchema for Level 3 interpretation
 * - Never executes arbitrary SQL, never deletes evidence, and degrades gracefully if AI is unavailable
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Not authenticated' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'Not authenticated' }, 401);
  const user = userData.user;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Invalid JSON request body' }, 400);
  }

  const mode = String(body.mode ?? 'temporal_anomaly');

  if (!GEMINI_API_KEY) {
    return json({
      ok: true,
      ai_available: false,
      model: 'unavailable',
      reason: 'GEMINI_API_KEY is not configured in Edge Function environment.',
    });
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  try {
    // =========================================================================
    // MODE 1: TEMPORAL ANOMALY DETECTION (FEATURE 5)
    // =========================================================================
    if (mode === 'temporal_anomaly') {
      const metrics = body.deterministicMetrics ?? {};
      const sourceRecordIds: string[] = Array.isArray(body.sourceRecordIds)
        ? body.sourceRecordIds
        : [];

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          `You are the BLACKTOWER™ Temporal Intelligence Engine.`,
          `Interpret the following deterministically computed temporal metrics across recorded field proofs.`,
          `Do NOT re-calculate arithmetic; interpret what the deterministic pattern means operationally.`,
          `Deterministic Metrics JSON:`,
          JSON.stringify(metrics, null, 2),
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              risk_level: {
                type: Type.STRING,
                description: 'NORMAL, REVIEW, or SUSPICIOUS',
              },
              risk_score: {
                type: Type.INTEGER,
                description: 'Risk score from 0 to 100',
              },
              anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                  },
                  required: ['type', 'severity', 'description', 'evidence'],
                },
              },
              summary: { type: Type.STRING },
              recommended_action: { type: Type.STRING },
            },
            required: ['risk_level', 'risk_score', 'anomalies', 'summary', 'recommended_action'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());

      // Traceable Persistence in public.temporal_analyses
      await admin.from('temporal_analyses').insert({
        user_id: user.id,
        source_record_ids: sourceRecordIds,
        deterministic_metrics: metrics,
        risk_level: parsed.risk_level ?? 'REVIEW',
        risk_score: typeof parsed.risk_score === 'number' ? parsed.risk_score : 0,
        anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
        summary: parsed.summary ?? null,
        recommended_action: parsed.recommended_action ?? null,
        model_id: MODEL_ID,
      });

      return json({
        ok: true,
        ai_available: true,
        model: MODEL_ID,
        result: {
          ...parsed,
          ai_available: true,
          model: MODEL_ID,
        },
      });
    }

    // =========================================================================
    // MODE 2: AI GEOSPATIAL TIMELINE INTERPRETATION (FEATURE 6)
    // =========================================================================
    if (mode === 'geospatial_timeline') {
      const transitions = Array.isArray(body.transitions) ? body.transitions : [];
      const summaryStats = body.summaryStats ?? {};

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          `You are the BLACKTOWER™ Geospatial Forensic Analyst.`,
          `Analyze these deterministically computed Haversine distances, elapsed minutes, and movement speeds (km/h) between chronological proof checkpoints.`,
          `Never invent coordinates or distances. Classify the movement continuity and explain whether transit velocities are NORMAL, REVIEW, or HIGHLY_UNUSUAL.`,
          `Summary Metrics: ${JSON.stringify(summaryStats)}`,
          `Transitions: ${JSON.stringify(transitions)}`,
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overall_classification: {
                type: Type.STRING,
                description: 'NORMAL, REVIEW, or HIGHLY_UNUSUAL',
              },
              executive_summary: {
                type: Type.STRING,
                description: 'Concise operational assessment of movement continuity and speeds.',
              },
              segment_notes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fromRef: { type: Type.STRING },
                    toRef: { type: Type.STRING },
                    classification: { type: Type.STRING },
                    interpretation: { type: Type.STRING },
                  },
                  required: ['fromRef', 'toRef', 'classification', 'interpretation'],
                },
              },
            },
            required: ['overall_classification', 'executive_summary', 'segment_notes'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());

      return json({
        ok: true,
        ai_available: true,
        model: MODEL_ID,
        result: parsed,
      });
    }

    // =========================================================================
    // MODE 3: CONTEXT SWITCHING & FOCUS INTELLIGENCE (FEATURE 10)
    // =========================================================================
    if (mode === 'context_switching') {
      const contextMetrics = body.contextMetrics ?? {};

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          `You are the BLACKTOWER™ Operational Focus Analyst.`,
          `Interpret the following deterministic context-switching telemetry derived from observable in-app sessions and tool events.`,
          `Do NOT make psychological or medical claims, and do NOT claim OS-wide surveillance.`,
          `Deterministic Context Metrics: ${JSON.stringify(contextMetrics)}`,
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assessment: {
                type: Type.STRING,
                description: 'LOW, MODERATE, or HIGH',
              },
              interpretation: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence operational interpretation of the activity pattern.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['assessment', 'interpretation', 'recommendations'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());

      return json({
        ok: true,
        ai_available: true,
        model: MODEL_ID,
        result: {
          ...parsed,
          ai_available: true,
        },
      });
    }

    return json({ error: `Unsupported analysis mode: ${mode}` }, 400);
  } catch (err) {
    console.error('temporal-analysis Edge Function error:', err);
    return json({
      ok: false,
      ai_available: false,
      model: 'unavailable',
      error: err instanceof Error ? err.message : 'AI evaluation failed',
    });
  }
});
