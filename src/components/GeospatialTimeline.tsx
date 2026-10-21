import {
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIntelligence } from "@/hooks/useIntelligence";
import { isValidSha256Hex } from "@/lib/crypto/sha256";

const GeospatialTimeline = () => {
  const {
    geospatialSummary,
    analyzingGeospatial,
    triggerGeospatialAIAnalysis,
  } = useIntelligence();

  const { nodes, totalEvents, gpsResolvedCount, totalDistanceKm, maxSpeedKmh, overallStatus } =
    geospatialSummary;

  return (
    <div className="space-y-6">
      {/* Header & Summary KPI Bar */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              AI GEOSPATIAL TIMELINE &amp; MOVEMENT PLAUSIBILITY
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Deterministic Haversine distance, elapsed duration, and transit velocity verification across chronological proofs.
            </p>
          </div>
          <Button
            onClick={triggerGeospatialAIAnalysis}
            disabled={analyzingGeospatial || totalEvents === 0}
            className="font-display tracking-wider text-xs whitespace-nowrap shrink-0"
          >
            {analyzingGeospatial ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            INTERPRET MOVEMENT PATTERN
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono tabular-nums text-xs">
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">CHECKPOINTS</div>
              <div className="text-lg font-bold text-foreground">{totalEvents}</div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">GPS VERIFIED</div>
              <div className="text-lg font-bold text-foreground">
                {gpsResolvedCount} / {totalEvents}
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">TOTAL DISTANCE</div>
              <div className="text-lg font-bold text-primary">{totalDistanceKm} km</div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">PEAK VELOCITY</div>
              <div className="text-lg font-bold text-foreground">{maxSpeedKmh} km/h</div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-muted-foreground">CONTINUITY STATUS</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  overallStatus === "NORMAL"
                    ? "text-emerald-400"
                    : overallStatus === "REVIEW"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {overallStatus}
              </div>
            </div>
          </div>

          {geospatialSummary.aiSummary && (
            <div className="bg-background/80 border border-border rounded-md p-3 font-mono text-xs space-y-1">
              <div className="text-[11px] text-primary font-display tracking-wider">
                AI GEOSPATIAL INTERPRETATION
              </div>
              <p className="text-foreground">{geospatialSummary.aiSummary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chronological Movement Chain: TIME -> LOCATION -> PROOF -> TIME GAP -> NEXT LOCATION */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm tracking-widest text-primary">
            CHRONOLOGICAL MOVEMENT LEDGER (TIME → LOCATION → PROOF → TRANSIT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-muted-foreground space-y-2">
              <MapPin className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p>NO GEOSPATIAL PROOF RECORDS LOGGED YET.</p>
              <p className="text-[11px]">
                Capture a field proof in the PROOF tab to populate the chronological movement timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {nodes.map((node, idx) => {
                const tr = node.transitionFromPrevious;
                const shaValid = isValidSha256Hex(node.hash);
                return (
                  <div key={node.id || `${node.refNumber}-${idx}`} className="space-y-2">
                    {/* Transition Connector from Previous Event */}
                    {tr && (
                      <div className="ml-6 pl-5 py-2.5 border-l border-dashed border-primary/40 font-mono tabular-nums text-xs flex flex-wrap items-center gap-4 bg-secondary/20 rounded-r-md pr-3">
                        <div className="flex items-center gap-1.5 text-primary">
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>TIME GAP: {tr.elapsed_minutes}m ({tr.elapsed_seconds}s)</span>
                        </div>
                        <span aria-hidden="true" className="text-muted-foreground">·</span>
                        <div>
                          <span className="text-muted-foreground">HAVERSINE DIST: </span>
                          <span className="text-foreground">
                            {tr.distance_km !== null ? `${tr.distance_km} km` : "NO GPS"}
                          </span>
                        </div>
                        <span aria-hidden="true" className="text-muted-foreground">·</span>
                        <div>
                          <span className="text-muted-foreground">EST. SPEED: </span>
                          <span className="text-foreground">
                            {tr.estimated_speed_kmh !== null
                              ? `${tr.estimated_speed_kmh} km/h`
                              : "N/A"}
                          </span>
                        </div>
                        <span aria-hidden="true" className="text-muted-foreground">·</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold ${
                              tr.plausibility === "NORMAL"
                                ? "text-emerald-400"
                                : tr.plausibility === "REVIEW" || tr.plausibility === "NO_GPS"
                                ? "text-amber-400"
                                : "text-destructive"
                            }`}
                          >
                            {tr.plausibility}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            — {tr.reason}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Event Checkpoint Node */}
                    <div className="bg-secondary/40 border border-border rounded-md p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center font-mono tabular-nums text-xs">
                      {/* Time Column */}
                      <div className="md:col-span-3 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-primary font-bold text-sm">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{node.localTimeFormatted}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {node.localDateFormatted} · {node.timezoneLabel}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          UNIX: {node.unixTime}
                        </div>
                      </div>

                      {/* Location Column */}
                      <div className="md:col-span-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{node.locationName}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {node.latitude !== null && node.longitude !== null
                            ? `${node.latitude.toFixed(6)}, ${node.longitude.toFixed(6)} (${
                                node.accuracy !== null ? `±${Math.round(node.accuracy)}m` : "GPS"
                              })`
                            : "COORDINATES UNAVAILABLE"}
                        </div>
                      </div>

                      {/* Proof Reference & Cryptographic Hash */}
                      <div className="md:col-span-3 space-y-0.5">
                        <div className="text-foreground font-semibold">{node.refNumber}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {shaValid
                            ? `SHA-256: ${node.hash!.slice(0, 14).toUpperCase()}...`
                            : node.hash
                            ? `LEGACY REF: ${node.hash}`
                            : "NO DIGEST"}
                        </div>
                      </div>

                      {/* Anti-Cheat & Verdict Column */}
                      <div className="md:col-span-2 flex md:flex-col md:items-end justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          {node.verdict === "PASS" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span
                            className={`font-bold ${
                              node.verdict === "PASS"
                                ? "text-emerald-400"
                                : node.verdict === "REVIEW"
                                ? "text-amber-400"
                                : "text-destructive"
                            }`}
                          >
                            {node.verdict}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-primary" />
                          <span>SCORE: {node.antiCheatScore}/100</span>
                        </div>
                      </div>
                    </div>
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

export default GeospatialTimeline;
