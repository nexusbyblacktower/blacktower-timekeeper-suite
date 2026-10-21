import { describe, it, expect } from "vitest";
import {
  generateSecureRefNumber,
  sha256DigestHex,
  computeProofSha256,
  isValidSha256Hex,
} from "../lib/crypto/sha256";
import {
  calculateClockDriftSeconds,
  computeTemporalMetrics,
} from "../lib/temporal/temporalMetrics";
import {
  validateTemporalAIResponse,
  buildGracefulTemporalFallback,
} from "../lib/temporal/anomalyDetector";
import {
  calculateHaversineDistanceKm,
  calculateMovementSpeedKmh,
  buildGeospatialTimeline,
} from "../lib/geospatial/geospatialEngine";
import {
  computeContextSwitchingMetrics,
  type ObservableActivitySession,
} from "../lib/context/contextSwitchingEngine";
import {
  validateForensicAIResponse,
  evaluateFivePillarForensics,
  buildUnavailableVisualForensics,
} from "../lib/forensics/forensicEngine";

describe("BLACKTOWER™ Intelligence & Forensic Suite — Comprehensive Verification", () => {
  // 1. SHA-256 generation & CSPRNG Ref Number
  describe("1. Cryptographic SHA-256 & CSPRNG Integrity", () => {
    it("generates a real 64-character hex SHA-256 digest and rejects legacy 16-char base64 strings", async () => {
      const ref = generateSecureRefNumber(1760000000000);
      expect(ref).toMatch(/^BT-[A-Z0-9]+-[A-Z0-9]{6}$/);

      const sampleHex = await sha256DigestHex("BLACKTOWER-TEST-PAYLOAD");
      expect(sampleHex).toHaveLength(64);
      expect(isValidSha256Hex(sampleHex)).toBe(true);
      expect(isValidSha256Hex(btoa("BT-12345").slice(0, 16))).toBe(false);

      const tinyPngBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const digest1 = await computeProofSha256({
        refNumber: ref,
        isoTime: "2026-10-20T09:00:00.000Z",
        unixTime: 1792486800,
        latitude: 1.4927,
        longitude: 103.7414,
        accuracy: 12,
        imageBase64: tinyPngBase64,
      });

      const digest2 = await computeProofSha256({
        refNumber: ref,
        isoTime: "2026-10-20T09:00:00.000Z",
        unixTime: 1792486800,
        latitude: 1.4927,
        longitude: 103.7414,
        accuracy: 12,
        imageBase64: tinyPngBase64,
      });

      // Deterministic binding: identical inputs produce identical SHA-256 digests
      expect(digest1.sha256Hex).toBe(digest2.sha256Hex);
      expect(isValidSha256Hex(digest1.sha256Hex)).toBe(true);

      // Mutating coordinate changes the final SHA-256 digest
      const digestMutated = await computeProofSha256({
        refNumber: ref,
        isoTime: "2026-10-20T09:00:00.000Z",
        unixTime: 1792486800,
        latitude: 1.5001,
        longitude: 103.7414,
        accuracy: 12,
        imageBase64: tinyPngBase64,
      });
      expect(digestMutated.sha256Hex).not.toBe(digest1.sha256Hex);
    });
  });

  // 2. Timestamp integrity, 3. Clock drift, 4. Temporal anomaly detection
  describe("2–4. Temporal Integrity, Clock Drift & Anomaly Detection", () => {
    it("calculates clock drift deterministically", () => {
      expect(calculateClockDriftSeconds(1700000000, 1700000250)).toBe(250);
    });

    it("detects clock drift, duplicate timestamps, future timestamps, and sequence inversions", () => {
      const refNowMs = Date.parse("2026-10-20T12:00:00Z");
      const records = [
        {
          id: "1",
          ref_number: "BT-001",
          captured_at: "2026-10-20T09:00:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T09:00:00Z") / 1000),
          created_at: "2026-10-20T09:00:05Z",
        },
        {
          // Duplicate timestamp with BT-001
          id: "2",
          ref_number: "BT-002",
          captured_at: "2026-10-20T09:00:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T09:00:00Z") / 1000),
          created_at: "2026-10-20T09:01:00Z",
        },
        {
          // Sequence inversion (08:30 captured AFTER 09:00) + Clock drift vs server created_at (09:10)
          id: "3",
          ref_number: "BT-003",
          captured_at: "2026-10-20T08:30:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T08:30:00Z") / 1000),
          created_at: "2026-10-20T09:10:00Z",
        },
        {
          // Future timestamp (14:00 vs 12:00 reference time)
          id: "4",
          ref_number: "BT-004",
          captured_at: "2026-10-20T14:00:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T14:00:00Z") / 1000),
          created_at: "2026-10-20T12:00:00Z",
        },
      ];

      const metrics = computeTemporalMetrics(records, refNowMs);
      expect(metrics.duplicateTimestampCount).toBe(1);
      expect(metrics.chronologicalOrderValid).toBe(false);
      expect(metrics.futureTimestampCount).toBe(1);
      expect(metrics.clockDriftFlagsCount).toBeGreaterThanOrEqual(1);
      expect(metrics.deterministicRiskLevel).toBe("SUSPICIOUS");
      expect(metrics.deterministicAnomalies.map((a) => a.type)).toEqual(
        expect.arrayContaining([
          "DUPLICATE_TIMESTAMP",
          "SEQUENCE_INVERSION",
          "FUTURE_TIMESTAMP",
          "CLOCK_DRIFT",
        ])
      );
    });
  });

  // 5. Haversine distance, 6. Movement speed, 7. Geospatial timeline ordering
  describe("5–7. Geospatial Haversine Distance, Velocity & Timeline Ordering", () => {
    it("calculates Haversine distance between Johor Bahru and Singapore accurately", () => {
      // JB Sentral (1.4634, 103.7648) to Marina Bay Singapore (1.2834, 103.8607) ~ 22.7 km
      const distKm = calculateHaversineDistanceKm(1.4634, 103.7648, 1.2834, 103.8607);
      expect(distKm).toBeGreaterThan(20);
      expect(distKm).toBeLessThan(26);
    });

    it("calculates movement speed in km/h and flags impossible transit velocities", () => {
      // 31.4 km in 42 minutes (2520 seconds) => ~44.9 km/h
      const speed = calculateMovementSpeedKmh(31.4, 42 * 60);
      expect(speed).toBeCloseTo(44.9, 1);

      // Chronological sorting and plausibility detection
      const unorderedRecords = [
        {
          id: "b",
          ref_number: "BT-SG",
          captured_at: "2026-10-20T09:05:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T09:05:00Z") / 1000),
          latitude: 1.2834,
          longitude: 103.8607,
          location_name: "Singapore",
        },
        {
          id: "a",
          ref_number: "BT-JB",
          captured_at: "2026-10-20T09:00:00Z",
          unix_time: Math.floor(Date.parse("2026-10-20T09:00:00Z") / 1000),
          latitude: 1.4634,
          longitude: 103.7648,
          location_name: "Johor Bahru",
        },
      ];

      const timeline = buildGeospatialTimeline(unorderedRecords);
      expect(timeline.nodes[0].refNumber).toBe("BT-JB");
      expect(timeline.nodes[1].refNumber).toBe("BT-SG");
      // 22.7 km in 5 minutes => ~272 km/h => HIGHLY_UNUSUAL
      expect(timeline.nodes[1].transitionFromPrevious?.plausibility).toBe("HIGHLY_UNUSUAL");
      expect(timeline.overallStatus).toBe("HIGHLY_UNUSUAL");
    });
  });

  // 8. Context switch calculation
  describe("8. Context Switching & Focus Intelligence Calculation", () => {
    it("computes context switches, switches/hr, average block, and HIGH fragmentation from activity transitions", () => {
      const sessions: ObservableActivitySession[] = [
        {
          id: "1",
          category: "CONTENT",
          activity_label: "CONTENT",
          source_type: "MANUAL",
          started_at: "2026-10-20T09:00:00Z",
          ended_at: "2026-10-20T09:12:00Z",
        },
        {
          id: "2",
          category: "ADMIN",
          activity_label: "ADMIN",
          source_type: "MANUAL",
          started_at: "2026-10-20T09:12:00Z",
          ended_at: "2026-10-20T09:18:00Z",
        },
        {
          id: "3",
          category: "CLIENT",
          activity_label: "CLIENT",
          source_type: "MANUAL",
          started_at: "2026-10-20T09:18:00Z",
          ended_at: "2026-10-20T09:26:00Z",
        },
        {
          id: "4",
          category: "CONTENT",
          activity_label: "CONTENT",
          source_type: "MANUAL",
          started_at: "2026-10-20T09:26:00Z",
          ended_at: "2026-10-20T09:31:00Z",
        },
        {
          id: "5",
          category: "ADMIN",
          activity_label: "ADMIN",
          source_type: "MANUAL",
          started_at: "2026-10-20T09:31:00Z",
          ended_at: "2026-10-20T09:36:00Z",
        },
      ];

      const metrics = computeContextSwitchingMetrics(
        sessions,
        Date.parse("2026-10-20T09:36:00Z")
      );
      expect(metrics.totalEvents).toBe(5);
      expect(metrics.contextSwitches).toBe(4);
      expect(metrics.fragmentationPercent).toBe(100);
      expect(metrics.classification).toBe("HIGH");
    });
  });

  // 9. Forensic result schema validation & 10–15. Edge Cases & Graceful Fallbacks
  describe("9–15. Forensic Schema Validation, Missing GPS/Image, AI Timeout, Invalid JSON & DB Failure Resilience", () => {
    const validSha = "a".repeat(64);

    it("9. validates well-formed AI forensic output and enforces limitation disclosure", () => {
      const validated = validateForensicAIResponse({
        verdict: "PASS",
        confidence: 92,
        visual_risk_score: 12,
        signals: [],
        summary: "Visual analysis indicates low risk.",
        limitations: [],
      });
      expect(validated.verdict).toBe("PASS");
      expect(validated.ai_available).toBe(true);
      expect(validated.limitations).toContain(
        "AI visual inspection is probabilistic and cannot independently prove physical presence."
      );
    });

    it("10 & 13. degrades to FINAL VERDICT = REVIEW (never REJECTED) when Gemini times out or is unavailable and deterministic checks pass", () => {
      const assessment = evaluateFivePillarForensics({
        sha256Hex: validSha,
        hasImage: true,
        clockDriftSeconds: 10,
        latitude: 1.4927,
        longitude: 103.7414,
        accuracyMeters: 15,
        antiCheatScore: 95,
        antiCheatFlags: [],
        cameraStreamDetected: true,
        aiVisualResult: buildUnavailableVisualForensics("Gemini API timeout"),
      });

      expect(assessment.cryptographic.status).toBe("PASS");
      expect(assessment.temporal.status).toBe("PASS");
      expect(assessment.gps.status).toBe("PASS");
      expect(assessment.device.status).toBe("PASS");
      expect(assessment.visualForensics.status).toBe("UNAVAILABLE");
      expect(assessment.finalVerdict).toBe("REVIEW");
    });

    it("11. fails GPS pillar and marks FINAL VERDICT = REJECTED when GPS coordinates are missing", () => {
      const assessment = evaluateFivePillarForensics({
        sha256Hex: validSha,
        hasImage: true,
        clockDriftSeconds: 5,
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        antiCheatScore: 90,
        antiCheatFlags: ["NO_GPS_FIX"],
        cameraStreamDetected: true,
        aiVisualResult: validateForensicAIResponse({
          verdict: "PASS",
          confidence: 95,
          visual_risk_score: 5,
          signals: [],
          summary: "Visual looks clean.",
        }),
      });

      expect(assessment.gps.status).toBe("FAIL");
      // Even if AI says PASS, missing GPS must prevent a PASS verdict
      expect(assessment.finalVerdict).toBe("REJECTED");
    });

    it("12. fails CRYPTOGRAPHIC pillar and marks FINAL VERDICT = REJECTED when image or valid SHA-256 is missing", () => {
      const assessment = evaluateFivePillarForensics({
        sha256Hex: validSha,
        hasImage: false,
        clockDriftSeconds: 5,
        latitude: 1.4927,
        longitude: 103.7414,
        accuracyMeters: 10,
        antiCheatScore: 100,
        antiCheatFlags: [],
        cameraStreamDetected: true,
        aiVisualResult: null,
      });

      expect(assessment.cryptographic.status).toBe("FAIL");
      expect(assessment.finalVerdict).toBe("REJECTED");
    });

    it("14 & 15. handles malformed AI JSON and database/network failures without losing deterministic anomalies", () => {
      const metrics = computeTemporalMetrics([
        {
          id: "1",
          ref_number: "BT-ERR-1",
          captured_at: "2026-10-20T09:00:00Z",
          unix_time: 1792486800,
          created_at: "2026-10-20T09:15:00Z", // 900s clock drift
        },
      ]);

      // Pass malformed/corrupted AI JSON
      const fallback = validateTemporalAIResponse("<<<MALFORMED_JSON>>>", metrics);
      expect(fallback.ai_available).toBe(false);
      expect(fallback.anomalies.length).toBeGreaterThanOrEqual(1);
      expect(fallback.anomalies[0].type).toBe("CLOCK_DRIFT");

      // Explicit fallback builder
      const dbFallback = buildGracefulTemporalFallback(metrics, "Database connection error");
      expect(dbFallback.anomalies).toEqual(metrics.deterministicAnomalies);
    });
  });
});
