import { isValidSha256Hex } from "../crypto/sha256";

/**
 * FEATURE 7 — MULTIMODAL FORENSIC PROOF VERIFICATION ENGINE
 *
 * Separates verification into 5 explicit pillars:
 * 1. CRYPTOGRAPHIC INTEGRITY (SHA-256 over canonical payload + image bytes)
 * 2. METADATA INTEGRITY (Anti-cheat score, device stream, reference format)
 * 3. TEMPORAL INTEGRITY (Client vs Server clock consistency)
 * 4. GEOLOCATION INTEGRITY (GPS availability, accuracy bounds, staleness)
 * 5. VISUAL FORENSIC SIGNALS (Gemini Vision probabilistic analysis)
 *
 * Never collapses everything into an unexplained score, and never allows AI
 * to override failed deterministic checks.
 */

export type PillarStatus = "PASS" | "REVIEW" | "FAIL" | "UNAVAILABLE";
export type ForensicVerdict = "PASS" | "REVIEW" | "REJECTED";

export interface VisualForensicSignal {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

export interface AIVisualForensicResult {
  verdict: ForensicVerdict | "UNAVAILABLE";
  confidence: number;
  visual_risk_score: number;
  signals: VisualForensicSignal[];
  summary: string;
  limitations: string[];
  ai_available: boolean;
}

export interface FivePillarForensicAssessment {
  cryptographic: {
    status: PillarStatus;
    label: string;
    sha256Hex: string | null;
    detail: string;
  };
  temporal: {
    status: PillarStatus;
    label: string;
    driftSeconds: number;
    detail: string;
  };
  gps: {
    status: PillarStatus;
    label: string;
    accuracyMeters: number | null;
    detail: string;
  };
  device: {
    status: PillarStatus;
    label: string;
    antiCheatScore: number;
    flags: string[];
    detail: string;
  };
  visualForensics: {
    status: PillarStatus;
    label: string;
    riskScore: number | null;
    confidence: number | null;
    signals: VisualForensicSignal[];
    summary: string;
    limitations: string[];
  };
  finalVerdict: ForensicVerdict;
  finalReason: string;
}

export const DEFAULT_FORENSIC_LIMITATION =
  "AI visual inspection is probabilistic and cannot independently prove physical presence.";

/**
 * Validates and normalizes the JSON returned by Gemini Vision for Feature 7.
 * Handles timeouts, malformed JSON, or missing fields gracefully.
 */
export function validateForensicAIResponse(raw: unknown): AIVisualForensicResult {
  if (!raw || typeof raw !== "object") {
    return buildUnavailableVisualForensics("AI forensic response unavailable or malformed.");
  }

  const obj = raw as Record<string, unknown>;
  if (obj.ai_available === false || obj.verdict === "UNAVAILABLE") {
    return buildUnavailableVisualForensics(
      typeof obj.summary === "string" ? obj.summary : "AI visual analysis unavailable."
    );
  }

  const rawVerdict = typeof obj.verdict === "string" ? obj.verdict.toUpperCase() : "";
  if (rawVerdict !== "PASS" && rawVerdict !== "REVIEW" && rawVerdict !== "REJECTED") {
    return buildUnavailableVisualForensics("Invalid verdict schema from AI visual inspector.");
  }

  const confidence =
    typeof obj.confidence === "number" && Number.isFinite(obj.confidence)
      ? Math.max(0, Math.min(100, Math.round(obj.confidence)))
      : 50;

  const visualRiskScore =
    typeof obj.visual_risk_score === "number" && Number.isFinite(obj.visual_risk_score)
      ? Math.max(0, Math.min(100, Math.round(obj.visual_risk_score)))
      : rawVerdict === "PASS"
      ? 10
      : rawVerdict === "REVIEW"
      ? 50
      : 85;

  const signals: VisualForensicSignal[] = [];
  if (Array.isArray(obj.signals)) {
    for (const s of obj.signals) {
      if (s && typeof s === "object") {
        const item = s as Record<string, unknown>;
        const sev = String(item.severity ?? "LOW").toUpperCase();
        signals.push({
          type: String(item.type ?? "VISUAL_SIGNAL"),
          severity: sev === "HIGH" || sev === "MEDIUM" ? sev : "LOW",
          description: String(item.description ?? "Visual anomaly noted."),
        });
      }
    }
  }

  const limitations: string[] = [DEFAULT_FORENSIC_LIMITATION];
  if (Array.isArray(obj.limitations)) {
    for (const lim of obj.limitations) {
      if (typeof lim === "string" && lim.trim().length > 0 && !limitations.includes(lim.trim())) {
        limitations.push(lim.trim());
      }
    }
  }

  const summary =
    typeof obj.summary === "string" && obj.summary.trim().length > 0
      ? obj.summary.trim()
      : rawVerdict === "PASS"
      ? "Visual analysis indicates low risk. No obvious screen replay or synthetic overlay indicators detected."
      : "Visual inspection identified signals requiring operator review.";

  return {
    verdict: rawVerdict as ForensicVerdict,
    confidence,
    visual_risk_score: visualRiskScore,
    signals,
    summary,
    limitations,
    ai_available: true,
  };
}

export function buildUnavailableVisualForensics(
  reason: string = "Gemini visual analysis service unavailable."
): AIVisualForensicResult {
  return {
    verdict: "UNAVAILABLE",
    confidence: 0,
    visual_risk_score: 0,
    signals: [],
    summary: `AI VERIFICATION UNAVAILABLE: ${reason}`,
    limitations: [
      DEFAULT_FORENSIC_LIMITATION,
      "Automated visual inspection did not complete; deterministic verification pillars remain authoritative.",
    ],
    ai_available: false,
  };
}

/**
 * Computes the complete 5-Pillar Forensic Assessment combining deterministic
 * evidence (Level 2) with AI visual inspection (Level 3) to produce the
 * authoritative Application Verdict (Level 4).
 *
 * CRITICAL RULE:
 * - Never displays PASS if a required deterministic pillar failed.
 * - If AI is unavailable and deterministic checks pass, FINAL VERDICT is REVIEW (never REJECTED).
 */
export function evaluateFivePillarForensics(input: {
  sha256Hex: string | null | undefined;
  hasImage: boolean;
  clockDriftSeconds: number;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracyMeters: number | null | undefined;
  antiCheatScore: number;
  antiCheatFlags: string[];
  cameraStreamDetected: boolean;
  aiVisualResult: AIVisualForensicResult | null;
}): FivePillarForensicAssessment {
  // 1. CRYPTOGRAPHIC PILLAR
  const validHash = isValidSha256Hex(input.sha256Hex);
  const cryptoStatus: PillarStatus =
    validHash && input.hasImage ? "PASS" : "FAIL";
  const cryptoLabel =
    cryptoStatus === "PASS"
      ? "SHA-256 VERIFIED"
      : !input.hasImage
      ? "IMAGE PAYLOAD MISSING"
      : "HASH UNVERIFIED / LEGACY BASE64";

  // 2. TEMPORAL PILLAR
  const drift = Math.abs(input.clockDriftSeconds || 0);
  const temporalStatus: PillarStatus =
    drift <= 120 ? "PASS" : drift <= 600 ? "REVIEW" : "FAIL";
  const temporalLabel =
    temporalStatus === "PASS"
      ? `SERVER TIME CONSISTENT (${drift}s DRIFT)`
      : temporalStatus === "REVIEW"
      ? `MODERATE CLOCK DRIFT (${drift}s)`
      : `EXCESSIVE CLOCK DRIFT (${drift}s)`;

  // 3. GEOLOCATION PILLAR
  const hasGps =
    typeof input.latitude === "number" &&
    Number.isFinite(input.latitude) &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.longitude);
  const acc =
    typeof input.accuracyMeters === "number" && Number.isFinite(input.accuracyMeters)
      ? Math.round(input.accuracyMeters)
      : null;

  const gpsStatus: PillarStatus = !hasGps
    ? "FAIL"
    : acc !== null && (acc > 150 || acc < 1)
    ? "REVIEW"
    : "PASS";
  const gpsLabel = !hasGps
    ? "LOCATION UNAVAILABLE"
    : gpsStatus === "REVIEW"
    ? `LOW PRECISION FIX (±${acc}m)`
    : `LOCATION AVAILABLE (${acc !== null ? `±${acc}m` : "VERIFIED"})`;

  // 4. DEVICE & METADATA PILLAR
  const hasVirtualCamFlag = input.antiCheatFlags.some((f) =>
    f.startsWith("VIRTUAL_CAMERA") || f.startsWith("AUTOMATED_BROWSER")
  );
  const deviceStatus: PillarStatus =
    !input.cameraStreamDetected || hasVirtualCamFlag || input.antiCheatScore < 50
      ? "FAIL"
      : input.antiCheatScore < 80
      ? "REVIEW"
      : "PASS";
  const deviceLabel = hasVirtualCamFlag
    ? "SUSPECT VIRTUAL CAMERA / AUTOMATION"
    : !input.cameraStreamDetected
    ? "NO LIVE CAMERA STREAM"
    : deviceStatus === "PASS"
    ? `CAMERA STREAM DETECTED (${input.antiCheatScore}/100)`
    : `METADATA FLAGS PRESENT (${input.antiCheatScore}/100)`;

  // 5. VISUAL FORENSICS PILLAR (AI)
  const ai = input.aiVisualResult ?? buildUnavailableVisualForensics();
  let visualStatus: PillarStatus = "UNAVAILABLE";
  let visualLabel = "UNAVAILABLE";

  if (ai.ai_available && ai.verdict !== "UNAVAILABLE") {
    if (ai.verdict === "PASS" && ai.visual_risk_score < 35) {
      visualStatus = "PASS";
      visualLabel = `LOW RISK (RISK ${ai.visual_risk_score}/100)`;
    } else if (ai.verdict === "REJECTED" || ai.visual_risk_score >= 75) {
      visualStatus = "FAIL";
      visualLabel = `HIGH VISUAL RISK (RISK ${ai.visual_risk_score}/100)`;
    } else {
      visualStatus = "REVIEW";
      visualLabel = `MODERATE VISUAL RISK (RISK ${ai.visual_risk_score}/100)`;
    }
  }

  // LEVEL 4 — FINAL APPLICATION VERDICT
  let finalVerdict: ForensicVerdict = "PASS";
  let finalReason = "All deterministic and visual forensic pillars verified.";

  if (
    cryptoStatus === "FAIL" ||
    temporalStatus === "FAIL" ||
    gpsStatus === "FAIL" ||
    deviceStatus === "FAIL"
  ) {
    finalVerdict = "REJECTED";
    const failedNames = [
      cryptoStatus === "FAIL" ? "CRYPTOGRAPHIC" : null,
      temporalStatus === "FAIL" ? "TEMPORAL" : null,
      gpsStatus === "FAIL" ? "GPS" : null,
      deviceStatus === "FAIL" ? "DEVICE" : null,
    ].filter(Boolean);
    finalReason = `Deterministic verification failed on: ${failedNames.join(", ")}.`;
  } else if (visualStatus === "FAIL") {
    // Visual AI signal is high risk -> flag for REVIEW or REJECTED based on high-severity visual signals
    finalVerdict = "REVIEW";
    finalReason = "Deterministic pillars passed, but visual forensics detected high-risk spoofing indicators requiring review.";
  } else if (
    temporalStatus === "REVIEW" ||
    gpsStatus === "REVIEW" ||
    deviceStatus === "REVIEW" ||
    visualStatus === "REVIEW" ||
    visualStatus === "UNAVAILABLE"
  ) {
    finalVerdict = "REVIEW";
    finalReason =
      visualStatus === "UNAVAILABLE"
        ? "Deterministic pillars passed. AI visual verification was unavailable; marked REVIEW per safety policy."
        : "One or more verification pillars require manual review.";
  }

  return {
    cryptographic: {
      status: cryptoStatus,
      label: cryptoLabel,
      sha256Hex: validHash ? input.sha256Hex! : null,
      detail: validHash
        ? `Canonical SHA-256: ${input.sha256Hex!.slice(0, 24)}...`
        : "Digest missing or uses non-cryptographic encoding.",
    },
    temporal: {
      status: temporalStatus,
      label: temporalLabel,
      driftSeconds: drift,
      detail: `Client/server clock delta: ${drift}s.`,
    },
    gps: {
      status: gpsStatus,
      label: gpsLabel,
      accuracyMeters: acc,
      detail: hasGps
        ? `Coords: ${input.latitude!.toFixed(5)}, ${input.longitude!.toFixed(5)}`
        : "No valid WGS84 coordinates captured.",
    },
    device: {
      status: deviceStatus,
      label: deviceLabel,
      antiCheatScore: input.antiCheatScore,
      flags: input.antiCheatFlags,
      detail:
        input.antiCheatFlags.length > 0
          ? `Flags: ${input.antiCheatFlags.join(", ")}`
          : "No client hardware/browser spoofing flags triggered.",
    },
    visualForensics: {
      status: visualStatus,
      label: visualLabel,
      riskScore: ai.ai_available ? ai.visual_risk_score : null,
      confidence: ai.ai_available ? ai.confidence : null,
      signals: ai.signals,
      summary: ai.summary,
      limitations: ai.limitations,
    },
    finalVerdict,
    finalReason,
  };
}
