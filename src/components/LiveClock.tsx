import { usePrecisionClock } from "@/hooks/useTimeEngine";

const LiveClock = () => {
  const now = usePrecisionClock(true);

  const unix = Math.floor(now.getTime() / 1000);
  const ms = now.getTime();

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <h2 className="font-display text-sm tracking-widest text-primary mb-4 uppercase">Live Timestamp</h2>
      <div className="font-mono tabular-nums text-5xl font-bold text-foreground tracking-tight mb-2 text-glow animate-pulse-glow">
        {now.toLocaleTimeString("en-US", { hour12: false })}
        <span className="text-2xl text-primary">.{String(now.getMilliseconds()).padStart(3, "0")}</span>
      </div>
      <div className="font-mono text-sm text-muted-foreground mt-2">
        {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-md p-3">
          <div className="text-xs text-muted-foreground font-display tracking-wider">UNIX (seconds)</div>
          <div className="font-mono tabular-nums text-lg text-foreground">{unix}</div>
        </div>
        <div className="bg-secondary rounded-md p-3">
          <div className="text-xs text-muted-foreground font-display tracking-wider">UNIX (ms)</div>
          <div className="font-mono tabular-nums text-lg text-foreground">{ms}</div>
        </div>
      </div>
      <div className="mt-3 bg-secondary rounded-md p-3">
        <div className="text-xs text-muted-foreground font-display tracking-wider">ISO 8601</div>
        <div className="font-mono tabular-nums text-sm text-foreground break-all">{now.toISOString()}</div>
      </div>
      <div className="mt-3 bg-secondary rounded-md p-3">
        <div className="text-xs text-muted-foreground font-display tracking-wider">UTC</div>
        <div className="font-mono tabular-nums text-sm text-foreground">{now.toUTCString()}</div>
      </div>
    </div>
  );
};

export default LiveClock;
