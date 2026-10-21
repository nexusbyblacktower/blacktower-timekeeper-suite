import { computeTemporalMetrics } from "./temporalMetrics";
import type {
  DeterministicTemporalMetrics,
  ProofTemporalRecord,
  TemporalAnalysisAIResponse,
  TemporalAnomalySignal,
  TemporalRiskLevel,
} from "./temporalTypes";

/**
 * Validates and normalizes an AI response for Temporal Anomaly Detection.
 * Never trusts malformed AI JSON; gracefully falls back to deterministic evidence.
 */
export function validateTemporalAIResponse(
  raw: unknown,
  deterministic: DeterministicTemporalMetrics
): TemporalAnalysisAIResponse {
  if (!raw || typeof raw !== "object") {
    return buildGracefulTemporalFallback(deterministic, "Invalid or empty AI response payload");
  }

  const obj = raw as Record<string, unknown>;
  const validLevels: TemporalRiskLevel[] = ["NORMAL", "REVIEW", "SUSPICIOUS", "UNAVAILABLE"];
  const rawLevel = typeof obj.risk_level === "string" ? obj.risk_level.toUpperCase() : "";

  if (!validLevels.includes(rawLevel as TemporalRiskLevel)) {
    return buildGracefulTemporalFallback(deterministic, "Missing or invalid risk_level in AI response");
  }

  const rawScore = typeof obj.risk_score === "number" && Number.isFinite(obj.risk_score)
    ? Math.max(0, Math.min(100, Math.round(obj.risk_score)))
    : deterministic.deterministicRiskScore;

  // Application Verdict Authority (Level 4):
  // AI cannot downgrade a deterministic HIGH anomaly below REVIEW
  const finalScore = Math.max(rawScore, deterministic.deterministicRiskScore);
  let finalLevel = rawLevel as TemporalRiskLevel;
  if (deterministic.deterministicRiskLevel === "SUSPICIOUS" && finalLevel === "NORMAL") {
    finalLevel = "SUSPICIOUS";
  } else if (deterministic.deterministicRiskLevel === "REVIEW" && finalLevel === "NORMAL") {
    finalLevel = "REVIEW";
  }

  const aiAnomalies: TemporalAnomalySignal[] = [];
  if (Array.isArray(obj.anomalies)) {
    for (const item of obj.anomalies) {
      if (item && typeof item === "object") {
        const a = item as Record<string, unknown>;
        const sev = String(a.severity ?? "LOW").toUpperCase();
        aiAnomalies.push({
          type: String(a.type ?? "TEMPORAL_SIGNAL"),
          severity: sev === "HIGH" || sev === "MEDIUM" ? sev : "LOW",
          description: String(a.description ?? "Temporal anomaly signal detected."),
          evidence: String(a.evidence ?? "Deterministic metric correlation"),
        });
      }
    }
  }

  // Merge deterministic anomalies so AI never erases deterministic findings
  const mergedAnomalies = mergeAnomalies(deterministic.deterministicAnomalies, aiAnomalies);

  const summary =
    typeof obj.summary === "string" && obj.summary.trim().length > 0
      ? obj.summary.trim()
      : deterministic.deterministicAnomalies.length === 0
      ? "Deterministic sequence verification passed with no clock drift or ordering violations."
      : `Detected ${deterministic.deterministicAnomalies.length} deterministic temporal anomaly signal(s).`;

  const recommendedAction =
    typeof obj.recommended_action === "string" && obj.recommended_action.trim().length > 0
      ? obj.recommended_action.trim()
      : finalLevel === "NORMAL"
      ? "Continue standard field proof monitoring."
      : "Inspect flagged proof references for device clock synchronization or sequence tampering.";

  return {
    risk_level: finalLevel,
    risk_score: finalScore,
    anomalies: mergedAnomalies,
    summary,
    recommended_action: recommendedAction,
    ai_available: obj.ai_available !== false,
    model: typeof obj.model === "string" ? obj.model : "gemini-3.8-flash",
  };
}

function mergeAnomalies(
  deterministic: TemporalAnomalySignal[],
  aiSignals: TemporalAnomalySignal[]
): TemporalAnomalySignal[] {
  const result = [...deterministic];
  for (const sig of aiSignals) {
    const duplicate = result.some(
      (d) => d.type === sig.type && d.evidence === sig.evidence
    );
    if (!duplicate) {
      result.push(sig);
    }
  }
  return result;
}

/**
 * Graceful fallback when Gemini is unavailable, timed out, or returns malformed output.
 * Preserves all deterministic findings without destroying or rejecting underlying records.
 */
export function buildGracefulTemporalFallback(
  deterministic: DeterministicTemporalMetrics,
  reason: string = "AI VERIFICATION UNAVAILABLE"
): TemporalAnalysisAIResponse {
  // Per Failure Policy: When AI is unavailable, preserve deterministic verification and mark REVIEW if uncertain
  const fallbackLevel: TemporalRiskLevel =
    deterministic.deterministicRiskLevel === "SUSPICIOUS"
      ? "SUSPICIOUS"
      : "REVIEW";

  return {
    risk_level: fallbackLevel,
    risk_score: deterministic.deterministicRiskScore,
    anomalies: deterministic.deterministicAnomalies,
    summary:
      deterministic.deterministicAnomalies.length === 0
        ? `Deterministic temporal checks passed (${deterministic.recordCount} records ordered). AI interpretation unavailable (${reason}).`
        : `Deterministic engine identified ${deterministic.deterministicAnomalies.length} temporal signal(s). AI interpretation unavailable (${reason}).`,
    recommended_action:
      deterministic.deterministicAnomalies.length === 0
        ? "Deterministic temporal integrity verified. Re-run AI interpretation when service is available."
        : "Review deterministic clock drift and timestamp ordering flags manually.",
    ai_available: false,
    model: "deterministic-fallback",
  };
}

/**
 * Runs complete local deterministic anomaly detection immediately.
 */
export function runDeterministicAnomalyDetection(
  records: ProofTemporalRecord[],
  referenceNowMs: number = Date.now()
): {
  metrics: DeterministicTemporalMetrics;
  baselineVerdict: TemporalAnalysisAIResponse;
} {
  const metrics = computeTemporalMetrics(records, referenceNowMs);
  const baselineVerdict: TemporalAnalysisAIResponse = {
    risk_level: metrics.deterministicRiskLevel,
    risk_score: metrics.deterministicRiskScore,
    anomalies: metrics.deterministicAnomalies,
    summary:
      metrics.recordCount === 0
        ? "No proof records available for temporal analysis."
        : metrics.deterministicAnomalies.length === 0
        ? `All ${metrics.recordCount} proof records maintain valid chronological ordering and clock consistency.`
        : `Detected ${metrics.deterministicAnomalies.length} temporal anomaly signal(s) across ${metrics.recordCount} proof records.`,
    recommended_action:
      metrics.deterministicRiskLevel === "NORMAL"
        ? "Temporal chain verified. No corrective action required."
        : "Audit flagged proof events for device clock drift or anomalous intervals.",
    ai_available: false,
    model: "deterministic-engine-v1",
  };

  return { metrics, baselineVerdict };
}
