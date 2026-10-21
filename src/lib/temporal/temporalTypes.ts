/**
 * BLACKTOWER™ TEMPORAL INTELLIGENCE — TYPES & SCHEMAS
 */

export type TemporalRiskLevel = "NORMAL" | "REVIEW" | "SUSPICIOUS" | "UNAVAILABLE";
export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH";

export type TemporalAnomalyType =
  | "CLOCK_DRIFT"
  | "FUTURE_TIMESTAMP"
  | "STALE_TIMESTAMP"
  | "DUPLICATE_TIMESTAMP"
  | "SEQUENCE_INVERSION"
  | "ABNORMAL_GAP"
  | "HIGH_FREQUENCY_BURST"
  | "UNUSUAL_TIMING_WINDOW";

export interface TemporalAnomalySignal {
  type: TemporalAnomalyType | string;
  severity: AnomalySeverity;
  description: string;
  evidence: string;
  recordRef?: string;
}

export interface ProofTemporalRecord {
  id: string;
  ref_number: string;
  captured_at: string;
  unix_time: number | null;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location_name?: string | null;
  anti_cheat_score?: number;
  anti_cheat_flags?: string[];
  verdict?: string | null;
  hash?: string | null;
}

export interface TemporalPairInterval {
  fromRef: string;
  toRef: string;
  fromIso: string;
  toIso: string;
  gapSeconds: number;
  gapMinutes: number;
  isOrdered: boolean;
  isDuplicate: boolean;
}

export interface DeterministicTemporalMetrics {
  recordCount: number;
  evaluatedAtIso: string;
  chronologicalOrderValid: boolean;
  duplicateTimestampCount: number;
  futureTimestampCount: number;
  clockDriftFlagsCount: number;
  maxClockDriftSeconds: number;
  minGapSeconds: number;
  maxGapSeconds: number;
  averageGapMinutes: number;
  medianGapMinutes: number;
  capturesPerHourRate: number;
  burstEventsCount: number;
  intervals: TemporalPairInterval[];
  deterministicAnomalies: TemporalAnomalySignal[];
  deterministicRiskScore: number;
  deterministicRiskLevel: "NORMAL" | "REVIEW" | "SUSPICIOUS";
}

export interface TemporalAnalysisAIResponse {
  risk_level: TemporalRiskLevel;
  risk_score: number;
  anomalies: TemporalAnomalySignal[];
  summary: string;
  recommended_action: string;
  ai_available?: boolean;
  model?: string;
}
