import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  DeterministicTemporalMetrics,
  ProofTemporalRecord,
  TemporalAnalysisAIResponse,
} from "@/lib/temporal/temporalTypes";
import {
  runDeterministicAnomalyDetection,
  validateTemporalAIResponse,
  buildGracefulTemporalFallback,
} from "@/lib/temporal/anomalyDetector";
import {
  buildGeospatialTimeline,
  type GeospatialTimelineSummary,
} from "@/lib/geospatial/geospatialEngine";
import {
  computeContextSwitchingMetrics,
  type ActivityCategory,
  type ActivitySourceType,
  type ContextSwitchingAIResponse,
  type DeterministicContextMetrics,
  type ObservableActivitySession,
} from "@/lib/context/contextSwitchingEngine";
import type { FivePillarForensicAssessment } from "@/lib/forensics/forensicEngine";

const LOCAL_PROOFS_KEY = "blacktower_local_proof_records_v1";
const LOCAL_SESSIONS_KEY = "blacktower_local_time_sessions_v1";
const LOCAL_FORENSICS_KEY = "blacktower_local_forensic_verifications_v1";

export interface StoredForensicRecord {
  id: string;
  refNumber: string;
  capturedAtIso: string;
  assessment: FivePillarForensicAssessment;
  imagePreview?: string | null;
}

interface IntelligenceContextValue {
  proofRecords: ProofTemporalRecord[];
  forensicRecords: StoredForensicRecord[];
  latestForensic: StoredForensicRecord | null;
  sessions: ObservableActivitySession[];
  activeSession: ObservableActivitySession | null;
  temporalMetrics: DeterministicTemporalMetrics;
  temporalAIResult: TemporalAnalysisAIResponse;
  geospatialSummary: GeospatialTimelineSummary;
  contextMetrics: DeterministicContextMetrics;
  contextAIResult: ContextSwitchingAIResponse | null;
  loadingRecords: boolean;
  analyzingTemporal: boolean;
  analyzingGeospatial: boolean;
  analyzingContext: boolean;
  refreshProofRecords: () => Promise<void>;
  registerCapturedProof: (
    proof: ProofTemporalRecord,
    forensic: FivePillarForensicAssessment,
    imagePreview?: string | null
  ) => void;
  startOrSwitchSession: (
    category: ActivityCategory,
    label: string,
    sourceType?: ActivitySourceType
  ) => Promise<void>;
  logToolInteraction: (label: string, category?: ActivityCategory) => void;
  triggerTemporalAIAnalysis: () => Promise<void>;
  triggerGeospatialAIAnalysis: () => Promise<void>;
  triggerContextSwitchingAIAnalysis: () => Promise<void>;
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJsonToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export const IntelligenceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [proofRecords, setProofRecords] = useState<ProofTemporalRecord[]>(() =>
    loadJsonFromStorage<ProofTemporalRecord[]>(LOCAL_PROOFS_KEY, [])
  );
  const [forensicRecords, setForensicRecords] = useState<StoredForensicRecord[]>(() =>
    loadJsonFromStorage<StoredForensicRecord[]>(LOCAL_FORENSICS_KEY, [])
  );
  const [sessions, setSessions] = useState<ObservableActivitySession[]>(() => {
    const stored = loadJsonFromStorage<ObservableActivitySession[]>(LOCAL_SESSIONS_KEY, []);
    if (stored.length > 0) return stored;
    const initial: ObservableActivitySession = {
      id: "session-init-1",
      category: "FIELD_OPS",
      activity_label: "TERMINAL_BOOT_VERIFICATION",
      source_type: "MANUAL",
      started_at: new Date().toISOString(),
      ended_at: null,
    };
    return [initial];
  });

  const [loadingRecords, setLoadingRecords] = useState(false);
  const [analyzingTemporal, setAnalyzingTemporal] = useState(false);
  const [analyzingGeospatial, setAnalyzingGeospatial] = useState(false);
  const [analyzingContext, setAnalyzingContext] = useState(false);

  const [temporalAIOverride, setTemporalAIOverride] =
    useState<TemporalAnalysisAIResponse | null>(null);
  const [geospatialAISummary, setGeospatialAISummary] = useState<string | null>(null);
  const [contextAIResult, setContextAIResult] =
    useState<ContextSwitchingAIResponse | null>(null);

  const refreshProofRecords = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoadingRecords(true);
    try {
      const { data: proofs, error } = await supabase
        .from("proof_records")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(100);

      if (!error && Array.isArray(proofs)) {
        const mapped: ProofTemporalRecord[] = proofs.map((p) => ({
          id: p.id,
          ref_number: p.ref_number,
          captured_at: p.captured_at,
          unix_time: p.unix_time,
          created_at: p.created_at,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          location_name: p.location_name,
          anti_cheat_score: p.anti_cheat_score,
          anti_cheat_flags: p.anti_cheat_flags,
          verdict: p.verdict,
          hash: p.hash,
        }));
        setProofRecords((prev) => {
          // Merge local unsynced proofs with remote proofs by ref_number
          const byRef = new Map<string, ProofTemporalRecord>();
          for (const item of prev) byRef.set(item.ref_number, item);
          for (const item of mapped) byRef.set(item.ref_number, item);
          const merged = Array.from(byRef.values()).sort(
            (a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at)
          );
          saveJsonToStorage(LOCAL_PROOFS_KEY, merged);
          return merged;
        });
      }

      const { data: remoteSessions } = await supabase
        .from("time_sessions")
        .select("*")
        .order("started_at", { ascending: true })
        .limit(100);

      if (Array.isArray(remoteSessions) && remoteSessions.length > 0) {
        const mappedSessions: ObservableActivitySession[] = remoteSessions.map((s) => ({
          id: s.id,
          category: (s.category as ActivityCategory) || "FIELD_OPS",
          activity_label: s.activity_label,
          source_type: (s.source_type as ActivitySourceType) || "MANUAL",
          started_at: s.started_at,
          ended_at: s.ended_at,
          duration_seconds: s.duration_seconds,
        }));
        setSessions(mappedSessions);
        saveJsonToStorage(LOCAL_SESSIONS_KEY, mappedSessions);
      }
    } catch {
      // Preserve local records on network error
    } finally {
      setLoadingRecords(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProofRecords();
  }, [refreshProofRecords]);

  // Deterministic computations (Level 2) — memoized for zero unnecessary re-computation
  const { metrics: temporalMetrics, baselineVerdict } = useMemo(
    () => runDeterministicAnomalyDetection(proofRecords),
    [proofRecords]
  );

  const temporalAIResult = temporalAIOverride ?? baselineVerdict;

  const geospatialSummary = useMemo(() => {
    const base = buildGeospatialTimeline(proofRecords);
    return {
      ...base,
      aiSummary: geospatialAISummary,
      aiAvailable: Boolean(geospatialAISummary),
    };
  }, [proofRecords, geospatialAISummary]);

  const contextMetrics = useMemo(
    () => computeContextSwitchingMetrics(sessions),
    [sessions]
  );

  const activeSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions[sessions.length - 1];
  }, [sessions]);

  const latestForensic = useMemo(() => {
    if (forensicRecords.length === 0) return null;
    return forensicRecords[0];
  }, [forensicRecords]);

  const startOrSwitchSession = useCallback(
    async (
      category: ActivityCategory,
      label: string,
      sourceType: ActivitySourceType = "MANUAL"
    ) => {
      const nowIso = new Date().toISOString();
      const newSession: ObservableActivitySession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category,
        activity_label: label.trim().toUpperCase() || category,
        source_type: sourceType,
        started_at: nowIso,
        ended_at: null,
      };

      setSessions((prev) => {
        const updated = prev.map((s, idx) => {
          if (idx === prev.length - 1 && !s.ended_at) {
            const durSec = Math.max(
              1,
              Math.floor((Date.parse(nowIso) - Date.parse(s.started_at)) / 1000)
            );
            return { ...s, ended_at: nowIso, duration_seconds: durSec };
          }
          return s;
        });
        const next = [...updated, newSession];
        saveJsonToStorage(LOCAL_SESSIONS_KEY, next);
        return next;
      });

      if (user && isSupabaseConfigured) {
        supabase
          .from("time_sessions")
          .insert({
            user_id: user.id,
            category: newSession.category,
            activity_label: newSession.activity_label,
            source_type: newSession.source_type,
            started_at: newSession.started_at,
          })
          .then(() => {});
      }
    },
    [user]
  );

  const logToolInteraction = useCallback(
    (label: string, category: ActivityCategory = "SYSTEM") => {
      // Only log if the label or category differs from the active session to avoid noisy duplicates
      setSessions((prev) => {
        const last = prev[prev.length - 1];
        const cleanLabel = label.trim().toUpperCase();
        if (last && last.category === category && last.activity_label === cleanLabel) {
          return prev;
        }
        const nowIso = new Date().toISOString();
        const updated = prev.map((s, idx) => {
          if (idx === prev.length - 1 && !s.ended_at) {
            const durSec = Math.max(
              1,
              Math.floor((Date.parse(nowIso) - Date.parse(s.started_at)) / 1000)
            );
            return { ...s, ended_at: nowIso, duration_seconds: durSec };
          }
          return s;
        });
        const nextSession: ObservableActivitySession = {
          id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category,
          activity_label: cleanLabel,
          source_type: "AUTO_TOOL",
          started_at: nowIso,
          ended_at: null,
        };
        const next = [...updated, nextSession];
        saveJsonToStorage(LOCAL_SESSIONS_KEY, next);
        return next;
      });
    },
    []
  );

  const registerCapturedProof = useCallback(
    (
      proof: ProofTemporalRecord,
      forensic: FivePillarForensicAssessment,
      imagePreview?: string | null
    ) => {
      setProofRecords((prev) => {
        const filtered = prev.filter((p) => p.ref_number !== proof.ref_number);
        const next = [proof, ...filtered];
        saveJsonToStorage(LOCAL_PROOFS_KEY, next);
        return next;
      });

      const storedForensic: StoredForensicRecord = {
        id: proof.id,
        refNumber: proof.ref_number,
        capturedAtIso: proof.captured_at,
        assessment: forensic,
        imagePreview: imagePreview ?? null,
      };

      setForensicRecords((prev) => {
        const filtered = prev.filter((f) => f.refNumber !== proof.ref_number);
        const next = [storedForensic, ...filtered].slice(0, 30);
        // Avoid storing huge base64 strings in localStorage if quota is tight
        const lightCopy = next.map((item, idx) =>
          idx === 0 ? item : { ...item, imagePreview: null }
        );
        saveJsonToStorage(LOCAL_FORENSICS_KEY, lightCopy);
        return next;
      });

      logToolInteraction(`PROOF_CAPTURE_${proof.ref_number}`, "FIELD_OPS");
    },
    [logToolInteraction]
  );

  const triggerTemporalAIAnalysis = useCallback(async () => {
    setAnalyzingTemporal(true);
    try {
      const { data, error } = await supabase.functions.invoke("temporal-analysis", {
        body: {
          mode: "temporal_anomaly",
          deterministicMetrics: temporalMetrics,
          sourceRecordIds: proofRecords.map((p) => p.id),
        },
      });

      if (error || !data || data.ai_available === false) {
        const fallback = buildGracefulTemporalFallback(
          temporalMetrics,
          data?.reason || error?.message || "Edge Function AI service unavailable"
        );
        setTemporalAIOverride(fallback);
        return;
      }

      const validated = validateTemporalAIResponse(data.result, temporalMetrics);
      setTemporalAIOverride(validated);
    } catch (err) {
      setTemporalAIOverride(
        buildGracefulTemporalFallback(
          temporalMetrics,
          err instanceof Error ? err.message : "Network timeout"
        )
      );
    } finally {
      setAnalyzingTemporal(false);
    }
  }, [temporalMetrics, proofRecords]);

  const triggerGeospatialAIAnalysis = useCallback(async () => {
    setAnalyzingGeospatial(true);
    try {
      const transitions = geospatialSummary.nodes
        .map((n) => n.transitionFromPrevious)
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke("temporal-analysis", {
        body: {
          mode: "geospatial_timeline",
          transitions,
          summaryStats: {
            totalEvents: geospatialSummary.totalEvents,
            totalDistanceKm: geospatialSummary.totalDistanceKm,
            maxSpeedKmh: geospatialSummary.maxSpeedKmh,
            unusualTransitionsCount: geospatialSummary.unusualTransitionsCount,
          },
        },
      });

      if (error || !data || data.ai_available === false) {
        setGeospatialAISummary(
          `AI VERIFICATION UNAVAILABLE — Deterministic Haversine assessment remains authoritative (${geospatialSummary.totalDistanceKm} km total across ${geospatialSummary.totalEvents} checkpoints; status: ${geospatialSummary.overallStatus}).`
        );
        return;
      }

      setGeospatialAISummary(
        data.result?.executive_summary ||
          `Movement sequence analyzed (${geospatialSummary.totalDistanceKm} km total).`
      );
    } catch {
      setGeospatialAISummary(
        `AI VERIFICATION UNAVAILABLE — Deterministic Haversine timeline verified (${geospatialSummary.totalDistanceKm} km total; max speed ${geospatialSummary.maxSpeedKmh} km/h).`
      );
    } finally {
      setAnalyzingGeospatial(false);
    }
  }, [geospatialSummary]);

  const triggerContextSwitchingAIAnalysis = useCallback(async () => {
    setAnalyzingContext(true);
    try {
      const { data, error } = await supabase.functions.invoke("temporal-analysis", {
        body: {
          mode: "context_switching",
          contextMetrics,
        },
      });

      if (error || !data || data.ai_available === false) {
        setContextAIResult({
          assessment: "UNAVAILABLE",
          interpretation: `${contextMetrics.deterministicSummary} (AI interpretation unavailable; deterministic metrics shown).`,
          recommendations: [
            "Group administrative and client dispatches into dedicated 30-minute blocks.",
            "Minimize rapid category transitions under 15 minutes.",
          ],
          ai_available: false,
        });
        return;
      }

      const res = data.result ?? {};
      setContextAIResult({
        assessment: res.assessment || contextMetrics.classification,
        interpretation: res.interpretation || contextMetrics.deterministicSummary,
        recommendations: Array.isArray(res.recommendations)
          ? res.recommendations
          : ["Maintain structured operational blocks."],
        ai_available: true,
      });
    } catch {
      setContextAIResult({
        assessment: "UNAVAILABLE",
        interpretation: `${contextMetrics.deterministicSummary} (AI service unreachable).`,
        recommendations: [
          "Consolidate short task transitions into uninterrupted focus blocks.",
        ],
        ai_available: false,
      });
    } finally {
      setAnalyzingContext(false);
    }
  }, [contextMetrics]);

  return (
    <IntelligenceContext.Provider
      value={{
        proofRecords,
        forensicRecords,
        latestForensic,
        sessions,
        activeSession,
        temporalMetrics,
        temporalAIResult,
        geospatialSummary,
        contextMetrics,
        contextAIResult,
        loadingRecords,
        analyzingTemporal,
        analyzingGeospatial,
        analyzingContext,
        refreshProofRecords,
        registerCapturedProof,
        startOrSwitchSession,
        logToolInteraction,
        triggerTemporalAIAnalysis,
        triggerGeospatialAIAnalysis,
        triggerContextSwitchingAIAnalysis,
      }}
    >
      {children}
    </IntelligenceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIntelligence = () => {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) {
    throw new Error("useIntelligence must be used within an IntelligenceProvider");
  }
  return ctx;
};
