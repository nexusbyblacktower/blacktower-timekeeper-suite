/**
 * LEVEL 2 — DETERMINISTIC CONTEXT SWITCHING & FOCUS INTELLIGENCE ENGINE
 *
 * Analyzes observable application activity and recorded time sessions to
 * calculate context switching rates, average focus block durations, and
 * activity fragmentation.
 *
 * Strictly scoped to legitimate in-application observations (never claims OS-wide surveillance).
 */

export type ActivityCategory =
  | "CONTENT"
  | "ADMIN"
  | "CLIENT"
  | "FIELD_OPS"
  | "RESEARCH"
  | "SYSTEM";

export type ActivitySourceType = "MANUAL" | "AUTO_TOOL" | "PROOF_EVENT";

export interface ObservableActivitySession {
  id: string;
  category: ActivityCategory;
  activity_label: string;
  source_type: ActivitySourceType;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
}

export interface DeterministicContextMetrics {
  totalEvents: number;
  contextSwitches: number;
  switchesPerHour: number;
  averageContextDurationMinutes: number;
  shortestContextDurationMinutes: number;
  longestUninterruptedMinutes: number;
  fragmentationPercent: number;
  totalObservedMinutes: number;
  categoryBreakdown: Record<string, { count: number; minutes: number }>;
  classification: "LOW" | "MODERATE" | "HIGH";
  deterministicSummary: string;
}

export interface ContextSwitchingAIResponse {
  assessment: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  interpretation: string;
  recommendations: string[];
  ai_available: boolean;
}

/**
 * Computes deterministic context-switching metrics from chronological activity sessions.
 * A "context switch" is counted whenever consecutive ordered sessions transition from
 * one category (or distinct task context) to a different category.
 */
export function computeContextSwitchingMetrics(
  sessions: ObservableActivitySession[],
  referenceNowMs: number = Date.now()
): DeterministicContextMetrics {
  if (!sessions || sessions.length === 0) {
    return {
      totalEvents: 0,
      contextSwitches: 0,
      switchesPerHour: 0,
      averageContextDurationMinutes: 0,
      shortestContextDurationMinutes: 0,
      longestUninterruptedMinutes: 0,
      fragmentationPercent: 0,
      totalObservedMinutes: 0,
      categoryBreakdown: {},
      classification: "LOW",
      deterministicSummary: "No activity transitions recorded in the current observation window.",
    };
  }

  // Sort oldest to newest by started_at
  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at)
  );

  // Merge or compute contiguous category blocks and transitions
  let contextSwitches = 0;
  const blockDurationsMin: number[] = [];
  const categoryBreakdown: Record<string, { count: number; minutes: number }> = {};

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const startMs = Date.parse(curr.started_at);
    let endMs: number;

    if (curr.ended_at && !Number.isNaN(Date.parse(curr.ended_at))) {
      endMs = Date.parse(curr.ended_at);
    } else if (typeof curr.duration_seconds === "number" && curr.duration_seconds > 0) {
      endMs = startMs + curr.duration_seconds * 1000;
    } else if (i < sorted.length - 1) {
      endMs = Date.parse(sorted[i + 1].started_at);
    } else {
      endMs = Math.max(startMs + 60_000, referenceNowMs);
    }

    const durationMin = Math.max(0.5, (endMs - startMs) / 60_000);
    blockDurationsMin.push(durationMin);

    if (!categoryBreakdown[curr.category]) {
      categoryBreakdown[curr.category] = { count: 0, minutes: 0 };
    }
    categoryBreakdown[curr.category].count += 1;
    categoryBreakdown[curr.category].minutes = Number(
      (categoryBreakdown[curr.category].minutes + durationMin).toFixed(1)
    );

    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.category !== curr.category || prev.activity_label !== curr.activity_label) {
        contextSwitches++;
      }
    }
  }

  const firstStartMs = Date.parse(sorted[0].started_at);
  const lastEntry = sorted[sorted.length - 1];
  const lastEndMs = lastEntry.ended_at
    ? Date.parse(lastEntry.ended_at)
    : Math.max(Date.parse(lastEntry.started_at) + 60_000, referenceNowMs);

  const windowSpanMinutes = Math.max(
    blockDurationsMin.reduce((sum, d) => sum + d, 0),
    (lastEndMs - firstStartMs) / 60_000,
    1
  );

  const totalObservedMinutes = Number(
    blockDurationsMin.reduce((sum, d) => sum + d, 0).toFixed(1)
  );

  const averageContextDurationMinutes = Number(
    (totalObservedMinutes / blockDurationsMin.length).toFixed(1)
  );
  const shortestContextDurationMinutes = Number(
    Math.min(...blockDurationsMin).toFixed(1)
  );
  const longestUninterruptedMinutes = Number(
    Math.max(...blockDurationsMin).toFixed(1)
  );

  const windowHours = Math.max(0.25, windowSpanMinutes / 60);
  const switchesPerHour = Number((contextSwitches / windowHours).toFixed(1));

  // Fragmented sessions are blocks shorter than 15 minutes when >1 event exists
  const shortBlocksCount =
    blockDurationsMin.length > 1
      ? blockDurationsMin.filter((d) => d < 15).length
      : 0;
  const fragmentationPercent = Math.round(
    (shortBlocksCount / blockDurationsMin.length) * 100
  );

  let classification: "LOW" | "MODERATE" | "HIGH" = "LOW";
  if (
    (contextSwitches >= 4 && averageContextDurationMinutes < 15) ||
    (switchesPerHour >= 6 && fragmentationPercent >= 50)
  ) {
    classification = "HIGH";
  } else if (
    contextSwitches >= 2 &&
    (switchesPerHour >= 3 || fragmentationPercent >= 30 || averageContextDurationMinutes < 25)
  ) {
    classification = "MODERATE";
  }

  const deterministicSummary =
    classification === "HIGH"
      ? `High fragmentation detected (${contextSwitches} transitions across ${Math.round(windowSpanMinutes)}m; ${fragmentationPercent}% short blocks).`
      : classification === "MODERATE"
      ? `Moderate activity switching (${switchesPerHour} switches/hr, ${averageContextDurationMinutes}m average block).`
      : `Sustained focus blocks observed (${averageContextDurationMinutes}m average block, low fragmentation).`;

  return {
    totalEvents: sorted.length,
    contextSwitches,
    switchesPerHour,
    averageContextDurationMinutes,
    shortestContextDurationMinutes,
    longestUninterruptedMinutes,
    fragmentationPercent,
    totalObservedMinutes,
    categoryBreakdown,
    classification,
    deterministicSummary,
  };
}
