import { useState, useMemo } from "react";
import { usePrecisionClock } from "@/hooks/useTimeEngine";
import { useIntelligence } from "@/hooks/useIntelligence";

const EpochCountdown = () => {
  const [targetInput, setTargetInput] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const { logToolInteraction } = useIntelligence();

  // Only run rAF precision clock when a countdown target is actively set
  const now = usePrecisionClock(target !== null);

  const remaining = useMemo(() => {
    if (target === null) return "";
    const diff = target - now.getTime();
    if (diff <= 0) return "REACHED!";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const ms = diff % 1000;
    return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }, [target, now]);

  const setCountdown = () => {
    const num = Number(targetInput);
    if (isNaN(num)) return;
    setTarget(num > 1e12 ? num : num * 1000);
    logToolInteraction("EPOCH_COUNTDOWN_SET", "SYSTEM");
  };

  const presets = [
    { label: "+1 min", ms: 60000 },
    { label: "+1 hour", ms: 3600000 },
    { label: "+1 day", ms: 86400000 },
    { label: "2 billion", ms: 2000000000000 },
  ];

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <h2 className="font-display text-sm tracking-widest text-primary mb-4 uppercase">Countdown</h2>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Target Unix timestamp"
          value={targetInput}
          onChange={e => setTargetInput(e.target.value)}
          className="flex-1 bg-secondary border border-border rounded-md px-4 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={setCountdown} className="bg-primary text-primary-foreground font-display text-xs tracking-wider px-4 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap shrink-0">
          SET
        </button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => {
              const t = Date.now() + p.ms;
              setTargetInput(String(Math.floor(t / 1000)));
              setTarget(t);
              logToolInteraction(`EPOCH_PRESET_${p.label}`, "SYSTEM");
            }}
            className="text-xs font-display tracking-wider text-muted-foreground bg-secondary px-3 py-1.5 rounded-md hover:text-primary transition-colors whitespace-nowrap shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>
      {target !== null && (
        <div className="font-mono tabular-nums text-3xl font-bold text-foreground text-center text-glow">
          {remaining}
        </div>
      )}
    </div>
  );
};

export default EpochCountdown;
