import { useState, useEffect } from "react";

const ZONES = [
  { label: "UTC", tz: "UTC" },
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Singapore", tz: "Asia/Singapore" },
  { label: "Los Angeles", tz: "America/Los_Angeles" },
];

const WorldClocks = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg bg-card border border-glow p-6 glow-cyan">
      <h2 className="font-display text-sm tracking-widest text-primary mb-4 uppercase">World Clocks</h2>
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map(z => (
          <div key={z.tz} className="bg-secondary rounded-md p-3">
            <div className="text-xs text-muted-foreground font-display tracking-wider">{z.label}</div>
            <div className="font-mono text-sm text-foreground">
              {now.toLocaleTimeString("en-US", { timeZone: z.tz, hour12: false })}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {now.toLocaleDateString("en-US", { timeZone: z.tz, month: "short", day: "numeric" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldClocks;
