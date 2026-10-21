import type { ProofTemporalRecord } from "../temporal/temporalTypes";
import { parseEpochSeconds } from "../temporal/temporalMetrics";

/**
 * LEVEL 2 — DETERMINISTIC GEOSPATIAL TIMELINE ENGINE
 *
 * Uses the Haversine formula to compute exact surface distance (km),
 * elapsed time (minutes), and estimated transit velocity (km/h) between
 * chronological proof records.
 *
 * AI never calculates distances or invents coordinates.
 */

export type MovementPlausibility = "NORMAL" | "REVIEW" | "HIGHLY_UNUSUAL" | "NO_GPS";

export interface GeospatialTransitionSegment {
  fromRef: string;
  toRef: string;
  distance_km: number | null;
  elapsed_minutes: number;
  elapsed_seconds: number;
  estimated_speed_kmh: number | null;
  plausibility: MovementPlausibility;
  reason: string;
}

export interface GeospatialTimelineNode {
  id: string;
  refNumber: string;
  capturedAtIso: string;
  localTimeFormatted: string;
  localDateFormatted: string;
  timezoneLabel: string;
  unixTime: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationName: string;
  antiCheatScore: number;
  verdict: string;
  hash: string | null;
  transitionFromPrevious: GeospatialTransitionSegment | null;
}

export interface GeospatialTimelineSummary {
  nodes: GeospatialTimelineNode[];
  totalEvents: number;
  gpsResolvedCount: number;
  totalDistanceKm: number;
  maxSpeedKmh: number;
  unusualTransitionsCount: number;
  reviewTransitionsCount: number;
  overallStatus: "NORMAL" | "REVIEW" | "HIGHLY_UNUSUAL";
  aiSummary?: string | null;
  aiAvailable?: boolean;
}

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates great-circle distance in kilometers between two WGS84 coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return Number((EARTH_RADIUS_KM * c).toFixed(3));
}

/**
 * Calculates estimated transit velocity in km/h given distance in km and elapsed seconds.
 */
export function calculateMovementSpeedKmh(
  distanceKm: number,
  elapsedSeconds: number
): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    // Instantaneous jump across non-zero distance
    return 9999;
  }
  const hours = elapsedSeconds / 3600;
  return Number((distanceKm / hours).toFixed(1));
}

/**
 * Classifies movement plausibility deterministically based on distance, elapsed time, and speed.
 */
export function evaluateMovementPlausibility(
  distanceKm: number | null,
  elapsedSeconds: number
): { plausibility: MovementPlausibility; reason: string } {
  if (distanceKm === null) {
    return {
      plausibility: "NO_GPS",
      reason: "GPS coordinates unavailable for one or both events.",
    };
  }

  if (distanceKm < 0.05) {
    return {
      plausibility: "NORMAL",
      reason: "Stationary or within immediate facility radius (< 50m).",
    };
  }

  if (elapsedSeconds <= 0 && distanceKm >= 0.25) {
    return {
      plausibility: "HIGHLY_UNUSUAL",
      reason: `Simultaneous or inverted timestamp with ${distanceKm.toFixed(2)} km spatial displacement.`,
    };
  }

  const speedKmh = calculateMovementSpeedKmh(distanceKm, Math.abs(elapsedSeconds));

  // Ignore micro-jitter if within 200m
  if (distanceKm <= 0.2) {
    return {
      plausibility: "NORMAL",
      reason: `Short local displacement (${(distanceKm * 1000).toFixed(0)}m).`,
    };
  }

  if (speedKmh > 950) {
    return {
      plausibility: "HIGHLY_UNUSUAL",
      reason: `Estimated transit speed (${speedKmh} km/h over ${distanceKm.toFixed(1)} km) exceeds plausible terrestrial/commercial aviation velocity.`,
    };
  }

  if (speedKmh > 160) {
    return {
      plausibility: "HIGHLY_UNUSUAL",
      reason: `Estimated ground velocity (${speedKmh} km/h over ${distanceKm.toFixed(1)} km in ${(elapsedSeconds / 60).toFixed(1)}m) exceeds standard ground transport limits.`,
    };
  }

  if (speedKmh > 110) {
    return {
      plausibility: "REVIEW",
      reason: `High-speed transit detected (${speedKmh} km/h over ${distanceKm.toFixed(1)} km). Verify highway/express transit.`,
    };
  }

  return {
    plausibility: "NORMAL",
    reason: `Plausible movement velocity (${speedKmh} km/h over ${distanceKm.toFixed(1)} km).`,
  };
}

/**
 * Transforms a list of proof records into a chronologically ordered Geospatial Timeline
 * with deterministic Haversine transitions.
 */
export function buildGeospatialTimeline(
  records: ProofTemporalRecord[]
): GeospatialTimelineSummary {
  if (!records || records.length === 0) {
    return {
      nodes: [],
      totalEvents: 0,
      gpsResolvedCount: 0,
      totalDistanceKm: 0,
      maxSpeedKmh: 0,
      unusualTransitionsCount: 0,
      reviewTransitionsCount: 0,
      overallStatus: "NORMAL",
    };
  }

  // Sort chronologically (oldest first so the timeline flows top-to-bottom: TIME -> NEXT LOCATION)
  const sorted = [...records].sort(
    (a, b) => parseEpochSeconds(a) - parseEpochSeconds(b)
  );

  const tzLabel =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  let gpsResolvedCount = 0;
  let totalDistanceKm = 0;
  let maxSpeedKmh = 0;
  let unusualTransitionsCount = 0;
  let reviewTransitionsCount = 0;

  const nodes: GeospatialTimelineNode[] = sorted.map((rec, index) => {
    const unixSec = parseEpochSeconds(rec);
    const dateObj = new Date(unixSec * 1000);
    const hasCoords =
      typeof rec.latitude === "number" &&
      Number.isFinite(rec.latitude) &&
      typeof rec.longitude === "number" &&
      Number.isFinite(rec.longitude);

    if (hasCoords) {
      gpsResolvedCount++;
    }

    let transition: GeospatialTransitionSegment | null = null;
    if (index > 0) {
      const prev = sorted[index - 1];
      const prevSec = parseEpochSeconds(prev);
      const elapsedSec = Math.max(0, unixSec - prevSec);
      const elapsedMin = Number((elapsedSec / 60).toFixed(1));

      const prevHasCoords =
        typeof prev.latitude === "number" &&
        Number.isFinite(prev.latitude) &&
        typeof prev.longitude === "number" &&
        Number.isFinite(prev.longitude);

      if (hasCoords && prevHasCoords) {
        const distKm = calculateHaversineDistanceKm(
          prev.latitude as number,
          prev.longitude as number,
          rec.latitude as number,
          rec.longitude as number
        );
        const speedKmh =
          distKm < 0.05 ? 0 : calculateMovementSpeedKmh(distKm, elapsedSec);
        const evalResult = evaluateMovementPlausibility(distKm, elapsedSec);

        totalDistanceKm += distKm;
        if (speedKmh < 9999 && speedKmh > maxSpeedKmh) {
          maxSpeedKmh = speedKmh;
        } else if (speedKmh === 9999 && distKm > 0.2) {
          maxSpeedKmh = Math.max(maxSpeedKmh, 999);
        }

        if (evalResult.plausibility === "HIGHLY_UNUSUAL") {
          unusualTransitionsCount++;
        } else if (evalResult.plausibility === "REVIEW") {
          reviewTransitionsCount++;
        }

        transition = {
          fromRef: prev.ref_number,
          toRef: rec.ref_number,
          distance_km: Number(distKm.toFixed(2)),
          elapsed_minutes: elapsedMin,
          elapsed_seconds: elapsedSec,
          estimated_speed_kmh: speedKmh,
          plausibility: evalResult.plausibility,
          reason: evalResult.reason,
        };
      } else {
        transition = {
          fromRef: prev.ref_number,
          toRef: rec.ref_number,
          distance_km: null,
          elapsed_minutes: elapsedMin,
          elapsed_seconds: elapsedSec,
          estimated_speed_kmh: null,
          plausibility: "NO_GPS",
          reason: "Coordinates missing on one or both consecutive checkpoints.",
        };
      }
    }

    return {
      id: rec.id,
      refNumber: rec.ref_number,
      capturedAtIso: rec.captured_at,
      localTimeFormatted: dateObj.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      localDateFormatted: dateObj.toISOString().split("T")[0],
      timezoneLabel: tzLabel,
      unixTime: unixSec,
      latitude: hasCoords ? (rec.latitude as number) : null,
      longitude: hasCoords ? (rec.longitude as number) : null,
      accuracy: typeof rec.accuracy === "number" ? rec.accuracy : null,
      locationName:
        rec.location_name && rec.location_name.trim().length > 0
          ? rec.location_name
          : hasCoords
          ? `${(rec.latitude as number).toFixed(4)}, ${(rec.longitude as number).toFixed(4)}`
          : "LOCATION UNAVAILABLE",
      antiCheatScore:
        typeof rec.anti_cheat_score === "number" ? rec.anti_cheat_score : 100,
      verdict: rec.verdict || "REVIEW",
      hash: rec.hash ?? null,
      transitionFromPrevious: transition,
    };
  });

  const overallStatus: "NORMAL" | "REVIEW" | "HIGHLY_UNUSUAL" =
    unusualTransitionsCount > 0
      ? "HIGHLY_UNUSUAL"
      : reviewTransitionsCount > 0 || gpsResolvedCount < records.length
      ? "REVIEW"
      : "NORMAL";

  return {
    nodes,
    totalEvents: nodes.length,
    gpsResolvedCount,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    maxSpeedKmh: Number(maxSpeedKmh.toFixed(1)),
    unusualTransitionsCount,
    reviewTransitionsCount,
    overallStatus,
  };
}
