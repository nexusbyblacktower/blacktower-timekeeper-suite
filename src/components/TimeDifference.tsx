import { useState } from "react";

const TimeDifference = () => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const calculate = () => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      setResult("Invalid date(s)");
      return;
    }
    const diffMs = Math.abs(e.getTime() - s.getTime());
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const years = Math.floor(days / 365.25);
    const remainDays = days - Math.floor(years * 365.25);

    setResult(
      `${diffMs.toLocaleString()} milliseconds\n${seconds.toLocaleString()} seconds\n${minutes.toLocaleString()} minutes\n${hours.toLocaleString()} hours\n${days.toLocaleString()} days\n${years > 0 ? `${years} years, ${remainDays} days` : `${days} days`}`
    );
  };

  const setNow = (setter: (v: string) => void) => {
    setter(new Date().toISOString().slice(0, 16));
  };

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <h2 className="font-display text-sm tracking-widest text-primary mb-4 uppercase">Time Difference</h2>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground font-display tracking-wider">START</label>
            <button onClick={() => setNow(setStart)} className="text-xs text-primary hover:opacity-80">Now</button>
          </div>
          <input
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-4 py-3 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground font-display tracking-wider">END</label>
            <button onClick={() => setNow(setEnd)} className="text-xs text-primary hover:opacity-80">Now</button>
          </div>
          <input
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-4 py-3 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
          />
        </div>
        <button onClick={calculate} className="w-full bg-primary text-primary-foreground font-display text-sm tracking-wider py-3 rounded-md hover:opacity-90 transition-opacity">
          CALCULATE
        </button>
      </div>
      {result && (
        <div className="mt-4 bg-secondary rounded-md p-4">
          <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
};

export default TimeDifference;
