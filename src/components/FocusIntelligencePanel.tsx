import { useState } from "react";
import {
  Layers,
  Play,
  Sparkles,
  Loader2,
  Clock,
  Activity,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIntelligence } from "@/hooks/useIntelligence";
import type { ActivityCategory } from "@/lib/context/contextSwitchingEngine";

const CATEGORIES: ActivityCategory[] = [
  "FIELD_OPS",
  "CONTENT",
  "ADMIN",
  "CLIENT",
  "RESEARCH",
  "SYSTEM",
];

const FocusIntelligencePanel = () => {
  const {
    sessions,
    activeSession,
    contextMetrics,
    contextAIResult,
    analyzingContext,
    startOrSwitchSession,
    triggerContextSwitchingAIAnalysis,
  } = useIntelligence();

  const [selectedCategory, setSelectedCategory] =
    useState<ActivityCategory>("FIELD_OPS");
  const [customLabel, setCustomLabel] = useState("");

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = customLabel.trim() || `${selectedCategory}_BLOCK`;
    await startOrSwitchSession(selectedCategory, label, "MANUAL");
    setCustomLabel("");
  };

  const quickSwitch = async (cat: ActivityCategory) => {
    setSelectedCategory(cat);
    await startOrSwitchSession(cat, `${cat}_SESSION`, "MANUAL");
  };

  const assessmentLabel =
    contextAIResult?.assessment && contextAIResult.assessment !== "UNAVAILABLE"
      ? contextAIResult.assessment
      : contextMetrics.classification;

  return (
    <div className="space-y-6">
      {/* FEATURE 10 — FOCUS INTELLIGENCE & CONTEXT SWITCHING INDEX */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
              <Layers className="w-4 h-4" />
              FOCUS INTELLIGENCE &amp; CONTEXT SWITCHING INDEX
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Calculated strictly from observable in-terminal sessions, proof events, and tool transitions.
            </p>
          </div>
          <Button
            onClick={triggerContextSwitchingAIAnalysis}
            disabled={analyzingContext || sessions.length === 0}
            className="font-display tracking-wider text-xs whitespace-nowrap shrink-0"
          >
            {analyzingContext ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            EVALUATE FOCUS PATTERN
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 5 Core Context Switching Telemetry Readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono tabular-nums text-xs">
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">CONTEXT SWITCHES</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {contextMetrics.contextSwitches}
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">SWITCHES / HOUR</div>
              <div className="text-2xl font-bold text-primary mt-0.5">
                {contextMetrics.switchesPerHour}
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">AVERAGE FOCUS BLOCK</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {contextMetrics.averageContextDurationMinutes}m
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground">FRAGMENTATION</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {contextMetrics.fragmentationPercent}%
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-md p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-muted-foreground">AI ASSESSMENT</div>
              <div
                className={`text-xl font-bold mt-0.5 ${
                  assessmentLabel === "LOW"
                    ? "text-emerald-400"
                    : assessmentLabel === "MODERATE"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {assessmentLabel}
              </div>
            </div>
          </div>

          {/* Assessment Summary Box */}
          <div className="bg-background/80 border border-border rounded-md p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-display tracking-wider text-primary">
                PATTERN INTERPRETATION
              </span>
              <span className="text-[11px] text-muted-foreground">
                LONGEST BLOCK: {contextMetrics.longestUninterruptedMinutes}m · SHORTEST:{" "}
                {contextMetrics.shortestContextDurationMinutes}m
              </span>
            </div>
            <p className="text-foreground">
              {contextAIResult?.interpretation || contextMetrics.deterministicSummary}
            </p>
            {contextAIResult?.recommendations && contextAIResult.recommendations.length > 0 && (
              <div className="pt-1 space-y-1 text-[11px] text-muted-foreground">
                {contextAIResult.recommendations.map((rec, i) => (
                  <div key={i}>· {rec}</div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Activity & Focus Session Logger */}
          <div className="bg-secondary/30 border border-border rounded-md p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-xs tracking-wider text-primary flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                LOG / SWITCH ACTIVE WORKSPACE CONTEXT
              </span>
              {activeSession && (
                <span className="font-mono text-xs text-muted-foreground">
                  ACTIVE: <strong className="text-primary">{activeSession.category}</strong> ·{" "}
                  {activeSession.activity_label}
                </span>
              )}
            </div>

            {/* Quick Category Switcher */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeSession?.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => quickSwitch(cat)}
                    className={`px-3 py-1.5 rounded-md font-display text-xs tracking-wider transition-colors whitespace-nowrap shrink-0 border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleLogSession} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Enter specific task or session objective (e.g. PERIMETER_AUDIT_SECTOR_4)"
                className="font-mono text-xs flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                className="font-display tracking-wider text-xs whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                LOG CONTEXT TRANSITION
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Chronological Activity Transition Tape */}
      <Card className="border-border glow-cyan">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
            <Activity className="w-4 h-4" />
            OBSERVABLE ACTIVITY TRANSITION LOG ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {[...sessions].reverse().map((sess, idx) => {
              const startDate = new Date(sess.started_at);
              const timeStr = startDate.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <div
                  key={sess.id || idx}
                  className="bg-secondary/40 border border-border rounded-md px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {timeStr}
                    </span>
                    <span className="font-semibold text-foreground">{sess.category}</span>
                    <span aria-hidden="true" className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{sess.activity_label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span>SOURCE: {sess.source_type}</span>
                    {typeof sess.duration_seconds === "number" && (
                      <span> · DURATION: {Math.round(sess.duration_seconds / 60)}m ({sess.duration_seconds}s)</span>
                    )}
                    {!sess.ended_at && <span className="text-primary ml-2">· ACTIVE</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FocusIntelligencePanel;
