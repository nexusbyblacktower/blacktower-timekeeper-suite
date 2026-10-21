import { useEffect, useState } from "react";

/**
 * SHARED HIGH-PRECISION TIME ENGINE
 *
 * Replaces multiple duplicate `setInterval(..., 50)` and `setInterval(..., 1000)`
 * timers across components with a shared subscription model.
 */

type Listener = (now: Date) => void;

const secondListeners = new Set<Listener>();
let secondIntervalId: ReturnType<typeof setInterval> | null = null;

function notifySecondListeners() {
  const now = new Date();
  secondListeners.forEach((fn) => fn(now));
}

function subscribeSecond(listener: Listener): () => void {
  secondListeners.add(listener);
  if (secondIntervalId === null) {
    secondIntervalId = setInterval(notifySecondListeners, 1000);
  }
  return () => {
    secondListeners.delete(listener);
    if (secondListeners.size === 0 && secondIntervalId !== null) {
      clearInterval(secondIntervalId);
      secondIntervalId = null;
    }
  };
}

/**
 * Shared 1-second precision clock hook.
 * All components using this share a single 1000ms timer.
 */
export function useSharedSecondClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    return subscribeSecond(setNow);
  }, []);

  return now;
}

/**
 * High-precision animation-frame clock hook for visual millisecond displays
 * (`LiveClock` and active `EpochCountdown`).
 */
export function usePrecisionClock(enabled: boolean = true): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    let rafId: number;
    let lastUpdate = 0;

    const loop = (timestamp: number) => {
      // Throttle state updates to ~20fps (50ms) via requestAnimationFrame
      // so background tabs automatically pause rendering
      if (timestamp - lastUpdate >= 48) {
        lastUpdate = timestamp;
        setNow(new Date());
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  return now;
}
