import type {
  DeterministicTemporalMetrics,
  ProofTemporalRecord,
  TemporalAnomalySignal,
  TemporalPairInterval,
} from "./temporalTypes";

/**
 * LEVEL 2 — DETERMINISTIC TEMPORAL METRICS ENGINE
 *
 * Calculates exact mathematical relationships between recorded time events:
 * - client vs server clock drift
 * - future timestamps & stale timestamps
 * - duplicate timestamps
 * - chronological sequence inversions
 * - inter-event temporal gaps (min, max, average, median)
 * - capture frequency & rapid burst detection
 */

export function parseEpochSeconds(record: ProofTemporalRecord): number {
  if (typeof record.unix_time === "number" && Number.isFinite(record.unix_time)) {
    return record.unix_time > 1e12
      ? Math.floor(record.unix_time / 1000)
      : Math.floor(record.unix_time);
  }
  const parsed = Date.parse(record.captured_at);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

export function calculateClockDriftSeconds(
  clientUnixSeconds: number,
  serverEpochSeconds: number
): number {
  return Math.abs(Math.floor(serverEpochSeconds) - Math.floor(clientUnixSeconds));
}

export function computeTemporalMetrics(
  records: ProofTemporalRecord[],
  referenceNowMs: number = Date.now()
): DeterministicTemporalMetrics {
  const referenceSec = Math.floor(referenceNowMs / 1000);
  const anomalies: TemporalAnomalySignal[] = [];

  if (!records || records.length === 0) {
    return {
      recordCount: 0,
      evaluatedAtIso: new Date(referenceNowMs).toISOString(),
      chronologicalOrderValid: true,
      duplicateTimestampCount: 0,
      futureTimestampCount: 0,
      clockDriftFlagsCount: 0,
      maxClockDriftSeconds: 0,
      minGapSeconds: 0,
      maxGapSeconds: 0,
      averageGapMinutes: 0,
      medianGapMinutes: 0,
      capturesPerHourRate: 0,
      burstEventsCount: 0,
      intervals: [],
      deterministicAnomalies: [],
      deterministicRiskScore: 0,
      deterministicRiskLevel: "NORMAL",
    };
  }

  let duplicateTimestampCount = 0;
  let futureTimestampCount = 0;
  let clockDriftFlagsCount = 0;
  let maxClockDriftSeconds = 0;
  let chronologicalOrderValid = true;
  let burstEventsCount = 0;

  // Inspect individual records for future timestamps, server/client drift, and embedded flags
  for (const rec of records) {
    const clientSec = parseEpochSeconds(rec);
    const serverCreatedSec = rec.created_at
      ? Math.floor(Date.parse(rec.created_at) / 1000)
      : clientSec;

    // 1. Future Timestamp check (> 60s ahead of server creation or reference time)
    const effectiveCompareSec =
      Number.isFinite(serverCreatedSec) && serverCreatedSec > 0
        ? Math.max(serverCreatedSec, referenceSec)
        : referenceSec;

    if (clientSec - effectiveCompareSec > 60) {
      futureTimestampCount++;
      const aheadSec = clientSec - effectiveCompareSec;
      anomalies.push({
        type: "FUTURE_TIMESTAMP",
        severity: aheadSec > 600 ? "HIGH" : "MEDIUM",
        description: `Captured timestamp is ${aheadSec}s in the future relative to reference clock.`,
        evidence: `ref=${rec.ref_number}, captured_unix=${clientSec}, reference_unix=${effectiveCompareSec}`,
        recordRef: rec.ref_number,
      });
    }

    // 2. Client vs Server Clock Drift check
    if (rec.created_at && !Number.isNaN(Date.parse(rec.created_at))) {
      const driftSec = calculateClockDriftSeconds(clientSec, serverCreatedSec);
      if (driftSec > maxClockDriftSeconds) {
        maxClockDriftSeconds = driftSec;
      }
      if (driftSec > 120) {
        clockDriftFlagsCount++;
        anomalies.push({
          type: "CLOCK_DRIFT",
          severity: driftSec > 600 ? "HIGH" : "MEDIUM",
          description: `Client timestamp diverges from server ingestion timestamp by ${driftSec}s.`,
          evidence: `ref=${rec.ref_number}, client_iso=${rec.captured_at}, server_iso=${rec.created_at}, drift=${driftSec}s`,
          recordRef: rec.ref_number,
        });
      }
    }

    // Also inspect server-recorded drift flags if present
    if (Array.isArray(rec.anti_cheat_flags)) {
      for (const flag of rec.anti_cheat_flags) {
        if (flag.startsWith("DEVICE_CLOCK_DRIFT:")) {
          const parsedDrift = Number(flag.split(":")[1]?.replace("s", ""));
          if (Number.isFinite(parsedDrift) && parsedDrift > maxClockDriftSeconds) {
            maxClockDriftSeconds = parsedDrift;
          }
          if (clockDriftFlagsCount === 0) {
            clockDriftFlagsCount++;
          }
        }
      }
    }
  }

  // Check if input sequence (when ordered by DB creation or array order) has inversions
  // We evaluate sequence in ascending creation order (oldest to newest)
  const byCreation = [...records].sort((a, b) => {
    const aCreated = a.created_at ? Date.parse(a.created_at) : parseEpochSeconds(a) * 1000;
    const bCreated = b.created_at ? Date.parse(b.created_at) : parseEpochSeconds(b) * 1000;
    return aCreated - bCreated;
  });

  const intervals: TemporalPairInterval[] = [];
  const gapSecondsList: number[] = [];

  for (let i = 1; i < byCreation.length; i++) {
    const prev = byCreation[i - 1];
    const curr = byCreation[i];
    const prevSec = parseEpochSeconds(prev);
    const currSec = parseEpochSeconds(curr);
    const rawDeltaSec = currSec - prevSec;
    const isOrdered = rawDeltaSec >= 0;
    const isDuplicate = rawDeltaSec === 0;
    const absGapSec = Math.abs(rawDeltaSec);

    if (!isOrdered) {
      chronologicalOrderValid = false;
      anomalies.push({
        type: "SEQUENCE_INVERSION",
        severity: "HIGH",
        description: `Event ${curr.ref_number} has an earlier capture timestamp than preceding record ${prev.ref_number}.`,
        evidence: `prev=${prev.ref_number} (${prev.captured_at}) -> curr=${curr.ref_number} (${curr.captured_at}), delta=${rawDeltaSec}s`,
        recordRef: curr.ref_number,
      });
    }

    if (isDuplicate) {
      duplicateTimestampCount++;
      anomalies.push({
        type: "DUPLICATE_TIMESTAMP",
        severity: "HIGH",
        description: `Identical timestamp recorded across distinct proof events (${prev.ref_number} and ${curr.ref_number}).`,
        evidence: `timestamp=${curr.captured_at} (${currSec})`,
        recordRef: curr.ref_number,
      });
    } else if (absGapSec < 15) {
      burstEventsCount++;
      anomalies.push({
        type: "HIGH_FREQUENCY_BURST",
        severity: "LOW",
        description: `Rapid consecutive proof capture within ${absGapSec}s.`,
        evidence: `${prev.ref_number} -> ${curr.ref_number} (${absGapSec}s interval)`,
        recordRef: curr.ref_number,
      });
    } else if (absGapSec > 86400 * 3) {
      // Gap > 72 hours
      const gapHours = (absGapSec / 3600).toFixed(1);
      anomalies.push({
        type: "ABNORMAL_GAP",
        severity: absGapSec > 86400 * 7 ? "MEDIUM" : "LOW",
        description: `Extended temporal silence of ${gapHours} hours between recorded proofs.`,
        evidence: `${prev.ref_number} -> ${curr.ref_number} (${gapHours}h gap)`,
        recordRef: curr.ref_number,
      });
    }

    gapSecondsList.push(absGapSec);
    intervals.push({
      fromRef: prev.ref_number,
      toRef: curr.ref_number,
      fromIso: prev.captured_at,
      toIso: curr.captured_at,
      gapSeconds: absGapSec,
      gapMinutes: Number((absGapSec / 60).toFixed(2)),
      isOrdered,
      isDuplicate,
    });
  }

  const minGapSeconds = gapSecondsList.length > 0 ? Math.min(...gapSecondsList) : 0;
  const maxGapSeconds = gapSecondsList.length > 0 ? Math.max(...gapSecondsList) : 0;
  const totalSpanSeconds = gapSecondsList.reduce((acc, v) => acc + v, 0);
  const averageGapMinutes =
    gapSecondsList.length > 0
      ? Number((totalSpanSeconds / gapSecondsList.length / 60).toFixed(2))
      : 0;

  const sortedGaps = [...gapSecondsList].sort((a, b) => a - b);
  const mid = Math.floor(sortedGaps.length / 2);
  const medianGapSeconds =
    sortedGaps.length === 0
      ? 0
      : sortedGaps.length % 2 !== 0
      ? sortedGaps[mid]
      : (sortedGaps[mid - 1] + sortedGaps[mid]) / 2;
  const medianGapMinutes = Number((medianGapSeconds / 60).toFixed(2));

  const spanHours = Math.max(1 / 60, totalSpanSeconds / 3600);
  const capturesPerHourRate =
    records.length > 1 ? Number((records.length / spanHours).toFixed(2)) : records.length;

  // Calculate deterministic risk score (0 to 100)
  let riskScore = 0;
  for (const a of anomalies) {
    if (a.severity === "HIGH") riskScore += 35;
    else if (a.severity === "MEDIUM") riskScore += 20;
    else riskScore += 8;
  }
  riskScore = Math.min(100, riskScore);

  const deterministicRiskLevel: "NORMAL" | "REVIEW" | "SUSPICIOUS" =
    riskScore >= 50 ? "SUSPICIOUS" : riskScore >= 20 ? "REVIEW" : "NORMAL";

  return {
    recordCount: records.length,
    evaluatedAtIso: new Date(referenceNowMs).toISOString(),
    chronologicalOrderValid,
    duplicateTimestampCount,
    futureTimestampCount,
    clockDriftFlagsCount,
    maxClockDriftSeconds,
    minGapSeconds,
    maxGapSeconds,
    averageGapMinutes,
    medianGapMinutes,
    capturesPerHourRate,
    burstEventsCount,
    intervals,
    deterministicAnomalies: anomalies,
    deterministicRiskScore: riskScore,
    deterministicRiskLevel,
  };
}
