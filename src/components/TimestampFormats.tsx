import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

const TimestampFormats = () => {
  const [now, setNow] = useState(new Date());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formats = [
    { label: "Unix (s)", value: String(Math.floor(now.getTime() / 1000)) },
    { label: "Unix (ms)", value: String(now.getTime()) },
    { label: "ISO 8601", value: now.toISOString() },
    { label: "RFC 2822", value: now.toUTCString() },
    { label: "Date Only", value: now.toISOString().split("T")[0] },
    { label: "Time Only", value: now.toISOString().split("T")[1].replace("Z", "") },
    { label: "Year-Week", value: `${now.getFullYear()}-W${String(getWeekNumber(now)).padStart(2, "0")}` },
    { label: "Day of Year", value: String(getDayOfYear(now)) },
    { label: "Locale (en-US)", value: now.toLocaleString("en-US") },
    { label: "Locale (ja-JP)", value: now.toLocaleString("ja-JP") },
  ];

  const copy = (value: string, idx: number) => {
    navigator.clipboard.writeText(value);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <h2 className="font-display text-sm tracking-widest text-primary mb-4 uppercase">All Formats</h2>
      <div className="space-y-1.5">
        {formats.map((f, i) => (
          <div key={f.label} className="flex items-center justify-between bg-secondary rounded-md px-3 py-2 group">
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground font-display tracking-wider mr-3">{f.label}</span>
              <span className="font-mono text-sm text-foreground break-all">{f.value}</span>
            </div>
            <button onClick={() => copy(f.value, i)} className="ml-2 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
              {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function getWeekNumber(d: Date) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
}

function getDayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export default TimestampFormats;
