import { useState } from "react";
import { Copy, Check, ArrowRightLeft } from "lucide-react";

const TimestampConverter = () => {
  const [unixInput, setUnixInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"toDate" | "toUnix">("toDate");

  const convertToDate = () => {
    const num = Number(unixInput);
    if (isNaN(num)) { setResult("Invalid timestamp"); return; }
    const ms = num > 1e12 ? num : num * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) { setResult("Invalid timestamp"); return; }
    setResult(
      `${d.toISOString()}\n${d.toUTCString()}\n${d.toLocaleString()}\nUnix (s): ${Math.floor(ms / 1000)}\nUnix (ms): ${ms}`
    );
  };

  const convertToUnix = () => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) { setResult("Invalid date string"); return; }
    setResult(
      `Unix (s): ${Math.floor(d.getTime() / 1000)}\nUnix (ms): ${d.getTime()}\nISO: ${d.toISOString()}\nUTC: ${d.toUTCString()}`
    );
  };

  const copy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm tracking-widest text-primary uppercase">Converter</h2>
        <button
          onClick={() => { setMode(m => m === "toDate" ? "toUnix" : "toDate"); setResult(null); }}
          className="flex items-center gap-1.5 text-xs font-display tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowRightLeft size={14} />
          {mode === "toDate" ? "Unix → Date" : "Date → Unix"}
        </button>
      </div>

      {mode === "toDate" ? (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter Unix timestamp (s or ms)"
            value={unixInput}
            onChange={e => setUnixInput(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={convertToDate} className="w-full bg-primary text-primary-foreground font-display text-sm tracking-wider py-3 rounded-md hover:opacity-90 transition-opacity">
            CONVERT
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter date (e.g. 2024-01-15 or Jan 15, 2024)"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={convertToUnix} className="w-full bg-primary text-primary-foreground font-display text-sm tracking-wider py-3 rounded-md hover:opacity-90 transition-opacity">
            CONVERT
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-secondary rounded-md p-4 relative">
          <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{result}</pre>
          <button onClick={copy} className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default TimestampConverter;
