import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hash,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIntelligence } from "@/hooks/useIntelligence";
import { isValidSha256Hex } from "@/lib/crypto/sha256";

const ForensicIntelligencePanel = () => {
  const {
    proofRecords,
    forensicRecords,
    temporalMetrics,
    temporalAIResult,
    analyzingTemporal,
    triggerTemporalAIAnalysis,
  } = useIntelligence();

  return (
    <div className="space-y-6">
      {/* FEATURE 5 — TEMPORAL ANOMALY DETECTION ENGINE */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              TEMPORAL ANOMALY DETECTION ENGINE
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Deterministic sequence verification, client/server clock drift detection, and Gemini anomaly interpretation.
            </p>
          </div>
          <Button
            onClick={triggerTemporalAIAnalysis}
            disabled={analyzingTemporal || proofRecords.length === 0}
            className="font-display tracking-wider text-xs whitespace-nowrap shrink-0"
          >
            {analyzingTemporal ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            RUN AI TEMPORAL SCAN
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deterministic Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums text-xs">
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">TEMPORAL RISK</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  temporalAIResult.risk_level === "NORMAL"
                    ? "text-emerald-400"
                    : temporalAIResult.risk_level === "REVIEW" ||
                      temporalAIResult.risk_level === "UNAVAILABLE"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {temporalAIResult.risk_level} ({temporalAIResult.risk_score}/100)
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">SEQUENCE ORDER</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  temporalMetrics.chronologicalOrderValid ? "text-emerald-400" : "text-destructive"
                }`}
              >
                {temporalMetrics.chronologicalOrderValid ? "ORDERED" : "INVERTED"}
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">MAX CLOCK DRIFT</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {temporalMetrics.maxClockDriftSeconds}s
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">AVG EVENT GAP</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {temporalMetrics.averageGapMinutes}m
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">DUPLICATE / FUTURE</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {temporalMetrics.duplicateTimestampCount} / {temporalMetrics.futureTimestampCount}
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">CAPTURE RATE</div>
              <div className="text-sm font-bold text-primary mt-0.5">
                {temporalMetrics.capturesPerHourRate}/hr
              </div>
            </div>
          </div>

          {/* Summary & Recommended Action */}
          <div className="bg-background/70 border border-border rounded-md p-4 font-mono text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-display tracking-wider text-primary">
                TEMPORAL INTELLIGENCE SUMMARY
              </span>
              <span className="text-[11px] text-muted-foreground">
                ENGINE: {temporalAIResult.model || "DETERMINISTIC-V1"}
              </span>
            </div>
            <p className="text-foreground">{temporalAIResult.summary}</p>
            <p className="text-muted-foreground">
              <span>RECOMMENDED DIRECTIVE: </span>
              <span className="text-foreground">{temporalAIResult.recommended_action}</span>
            </p>
          </div>

          {/* Detected Anomaly Signals */}
          {temporalAIResult.anomalies.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-display tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                DETECTED TEMPORAL ANOMALIES ({temporalAIResult.anomalies.length})
              </div>
              <div className="space-y-2">
                {temporalAIResult.anomalies.map((anom, i) => (
                  <div
                    key={`${anom.type}-${i}`}
                    className="bg-secondary/40 border border-border rounded-md p-3 font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{anom.type}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          anom.severity === "HIGH"
                            ? "text-destructive"
                            : anom.severity === "MEDIUM"
                            ? "text-amber-400"
                            : "text-primary"
                        }`}
                      >
                        SEVERITY: {anom.severity}
                      </span>
                    </div>
                    <p className="text-foreground">{anom.description}</p>
                    <p className="text-[11px] text-muted-foreground">EVIDENCE: {anom.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FEATURE 7 — HISTORICAL CRYPTOGRAPHIC & MULTIMODAL FORENSIC AUDIT LEDGER */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            PROOF EVIDENCE &amp; CRYPTOGRAPHIC AUDIT LEDGER ({proofRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proofRecords.length === 0 ? (
            <div className="py-10 text-center font-mono text-xs text-muted-foreground">
              NO PROOF RECORDS AVAILABLE IN LEDGER.
            </div>
          ) : (
            <div className="space-y-3">
              {proofRecords.map((rec) => {
                const validSha = isValidSha256Hex(rec.hash);
                const forensicMatch = forensicRecords.find(
                  (f) => f.refNumber === rec.ref_number
                );
                return (
                  <div
                    key={rec.id || rec.ref_number}
                    className="bg-secondary/30 border border-border rounded-md p-4 font-mono tabular-nums text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold text-foreground">{rec.ref_number}</span>
                        <span aria-hidden="true" className="text-muted-foreground">·</span>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{rec.captured_at}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">ANTI-CHEAT: {rec.anti_cheat_score ?? 100}/100</span>
                        <span aria-hidden="true" className="text-muted-foreground">·</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            rec.verdict === "PASS"
                              ? "text-emerald-400"
                              : rec.verdict === "REVIEW"
                              ? "text-amber-400"
                              : "text-destructive"
                          }`}
                        >
                          {rec.verdict === "PASS" ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : rec.verdict === "REVIEW" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {rec.verdict || "REVIEW"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-background/60 rounded px-3 py-1.5 border border-border/60 break-all">
                        <span className="text-muted-foreground">CRYPTOGRAPHIC DIGEST: </span>
                        {validSha ? (
                          <span className="text-emerald-400">
                            ✓ SHA-256 ({rec.hash})
                          </span>
                        ) : rec.hash ? (
                          <span className="text-amber-400">
                            LEGACY ENCODING ({rec.hash}) — NOT SHA-256
                          </span>
                        ) : (
                          <span className="text-destructive">MISSING DIGEST</span>
                        )}
                      </div>
                      <div className="bg-background/60 rounded px-3 py-1.5 border border-border/60">
                        <span className="text-muted-foreground">LOCATION &amp; FLAGS: </span>
                        <span className="text-foreground">
                          {rec.location_name ||
                            (rec.latitude != null
                              ? `${rec.latitude.toFixed(5)}, ${rec.longitude?.toFixed(5)}`
                              : "NO GPS")}
                        </span>
                        {rec.anti_cheat_flags && rec.anti_cheat_flags.length > 0 && (
                          <span className="text-amber-400 ml-2">
                            [{rec.anti_cheat_flags.join(", ")}]
                          </span>
                        )}
                      </div>
                    </div>

                    {forensicMatch && (
                      <div className="text-[11px] text-muted-foreground pt-1">
                        <span>VISUAL FORENSICS: </span>
                        <span className="text-foreground">
                          {forensicMatch.assessment.visualForensics.summary}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForensicIntelligencePanel;
