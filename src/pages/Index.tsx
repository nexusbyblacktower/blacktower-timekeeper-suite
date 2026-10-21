import { useState } from "react";
import { LogOut, Clock, Camera, Navigation, ShieldCheck, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { IntelligenceProvider, useIntelligence } from "@/hooks/useIntelligence";
import { useSharedSecondClock } from "@/hooks/useTimeEngine";
import LiveClock from "@/components/LiveClock";
import TimestampConverter from "@/components/TimestampConverter";
import TimeDifference from "@/components/TimeDifference";
import WorldClocks from "@/components/WorldClocks";
import TimestampFormats from "@/components/TimestampFormats";
import EpochCountdown from "@/components/EpochCountdown";
import PhotoProof from "@/components/PhotoProof";
import GeospatialTimeline from "@/components/GeospatialTimeline";
import ForensicIntelligencePanel from "@/components/ForensicIntelligencePanel";
import FocusIntelligencePanel from "@/components/FocusIntelligencePanel";
import PeopleIntelligencePanel from "@/components/PeopleIntelligencePanel";

type TerminalTab =
  | "TIME"
  | "PROOF"
  | "TIMELINE"
  | "FORENSICS"
  | "INTELLIGENCE"
  | "PEOPLE";

const NAV_TABS: { id: TerminalTab; label: string }[] = [
  { id: "TIME", label: "TIME" },
  { id: "PROOF", label: "PROOF" },
  { id: "TIMELINE", label: "TIMELINE" },
  { id: "FORENSICS", label: "FORENSICS" },
  { id: "INTELLIGENCE", label: "INTELLIGENCE" },
  { id: "PEOPLE", label: "PEOPLE" },
];

const TerminalWorkspace = () => {
  const { user, fullName, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TerminalTab>("TIME");
  const now = useSharedSecondClock();

  const {
    proofRecords,
    latestForensic,
    activeSession,
    temporalAIResult,
    geospatialSummary,
    contextMetrics,
  } = useIntelligence();

  const latestProof = proofRecords[0] ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — Concise Nav Links — 1 Primary Action) */}
      <header className="border-b border-border py-4 px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("TIME");
            }}
            className="font-display text-lg font-bold tracking-wider text-foreground whitespace-nowrap shrink-0"
          >
            BLACKTOWER<span className="text-primary">™</span>
          </a>

          {/* Zone 2: Concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-display tracking-widest">
            {NAV_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === t.id
                    ? "text-primary border-primary font-bold"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="font-display tracking-wider text-[11px] whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" /> SIGN OUT
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (visible on small screens) */}
      <div className="md:hidden border-b border-border bg-secondary/40 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {NAV_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded text-xs font-display tracking-wider whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Compact Home Operational Status Strip (8 Live Telemetry Readouts) */}
      <section className="border-b border-border bg-secondary/20 px-6 py-3">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
            <span>
              TEMPORAL INTELLIGENCE &amp; FORENSIC TIME OS · OPERATOR:{" "}
              <strong className="text-foreground">{fullName || user?.email || "ACTIVE"}</strong> ·
               CLEARANCE:{" "}
              <strong className="text-primary">{isAdmin ? "ADMIN" : "MEMBER"}</strong>
            </span>
            <span>UTC: {now.toISOString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono tabular-nums text-xs">
            {/* 1. CURRENT TIME */}
            <button
              type="button"
              onClick={() => setActiveTab("TIME")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">CURRENT TIME</div>
              <div className="text-foreground font-bold truncate">
                {now.toLocaleTimeString("en-US", { hour12: false })}
              </div>
            </button>

            {/* 2. ACTIVE SESSION */}
            <button
              type="button"
              onClick={() => setActiveTab("INTELLIGENCE")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">ACTIVE SESSION</div>
              <div className="text-primary font-bold truncate">
                {activeSession ? activeSession.category : "IDLE"}
              </div>
            </button>

            {/* 3. LATEST PROOF */}
            <button
              type="button"
              onClick={() => setActiveTab("PROOF")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">LATEST PROOF</div>
              <div className="text-foreground font-bold truncate">
                {latestProof ? latestProof.ref_number : "NONE"}
              </div>
            </button>

            {/* 4. TEMPORAL STATUS */}
            <button
              type="button"
              onClick={() => setActiveTab("FORENSICS")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">TEMPORAL STATUS</div>
              <div
                className={`font-bold truncate ${
                  temporalAIResult.risk_level === "NORMAL"
                    ? "text-emerald-400"
                    : temporalAIResult.risk_level === "REVIEW" ||
                      temporalAIResult.risk_level === "UNAVAILABLE"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {temporalAIResult.risk_level}
              </div>
            </button>

            {/* 5. LOCATION STATUS */}
            <button
              type="button"
              onClick={() => setActiveTab("TIMELINE")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">LOCATION STATUS</div>
              <div
                className={`font-bold truncate ${
                  geospatialSummary.overallStatus === "NORMAL"
                    ? "text-emerald-400"
                    : geospatialSummary.overallStatus === "REVIEW"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {geospatialSummary.totalEvents > 0
                  ? `${geospatialSummary.overallStatus} (${geospatialSummary.totalDistanceKm}km)`
                  : "STANDBY"}
              </div>
            </button>

            {/* 6. FORENSIC STATUS */}
            <button
              type="button"
              onClick={() => setActiveTab("FORENSICS")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">FORENSIC STATUS</div>
              <div
                className={`font-bold truncate ${
                  latestForensic?.assessment.finalVerdict === "PASS"
                    ? "text-emerald-400"
                    : latestForensic?.assessment.finalVerdict === "REJECTED"
                    ? "text-destructive"
                    : "text-amber-400"
                }`}
              >
                {latestForensic
                  ? latestForensic.assessment.finalVerdict
                  : latestProof?.verdict || "READY"}
              </div>
            </button>

            {/* 7. CONTEXT SWITCHING */}
            <button
              type="button"
              onClick={() => setActiveTab("INTELLIGENCE")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">CONTEXT SWITCHING</div>
              <div
                className={`font-bold truncate ${
                  contextMetrics.classification === "LOW"
                    ? "text-emerald-400"
                    : contextMetrics.classification === "MODERATE"
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {contextMetrics.classification} ({contextMetrics.switchesPerHour}/hr)
              </div>
            </button>

            {/* 8. PEOPLE INTELLIGENCE */}
            <button
              type="button"
              onClick={() => setActiveTab("PEOPLE")}
              className="text-left bg-card border border-border hover:border-primary/50 rounded px-2.5 py-2 transition-colors"
            >
              <div className="text-[10px] text-muted-foreground">PEOPLE INTEL</div>
              <div className="text-primary font-bold truncate">
                {isAdmin ? "ADMIN DOSSIERS" : "MY PROFILE"}
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Viewport */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        {activeTab === "TIME" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PhotoProof />
            <LiveClock />
            <TimestampConverter />
            <TimeDifference />
            <EpochCountdown />
            <WorldClocks />
            <TimestampFormats />
          </div>
        )}

        {activeTab === "PROOF" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PhotoProof />
          </div>
        )}

        {activeTab === "TIMELINE" && <GeospatialTimeline />}

        {activeTab === "FORENSICS" && <ForensicIntelligencePanel />}

        {activeTab === "INTELLIGENCE" && <FocusIntelligencePanel />}

        {activeTab === "PEOPLE" && <PeopleIntelligencePanel />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-display tracking-widest">
            © {new Date().getFullYear()} BLACKTOWER™ — ALL RIGHTS RESERVED
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
            <button
              type="button"
              onClick={() => setActiveTab("TIME")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3" /> TIME
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PROOF")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Camera className="w-3 h-3" /> PROOF
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TIMELINE")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" /> TIMELINE
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("FORENSICS")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> FORENSICS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("INTELLIGENCE")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Layers className="w-3 h-3" /> INTELLIGENCE
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PEOPLE")}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Users className="w-3 h-3" /> PEOPLE
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Index = () => (
  <IntelligenceProvider>
    <TerminalWorkspace />
  </IntelligenceProvider>
);

export default Index;
