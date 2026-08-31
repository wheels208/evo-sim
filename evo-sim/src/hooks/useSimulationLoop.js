import { useRef, useState } from "react";

// Drives the tick interval. `onTick(deltaMs)` runs every tick;
// `onSample()` runs every `sampleEvery` ticks (for stats/chart updates,
// which don't need to happen at full tick rate).
export function useSimulationLoop({ tickRateRef, onTick, onSample, sampleEvery = 5 }) {
  const [isRunning, setIsRunning] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const intervalIdRef = useRef(null);
  const tickCountRef = useRef(0);

  const start = () => {
    if (intervalIdRef.current) return;
    setIsRunning(true);
    const intervalMs = Math.max(5, Math.floor(1000 / tickRateRef.current));
    let last = performance.now();
    intervalIdRef.current = setInterval(() => {
      const now = performance.now();
      const delta = now - last; last = now;
      onTick(delta);
      tickCountRef.current += 1;
      setTickCount(tickCountRef.current);
      if (tickCountRef.current % sampleEvery === 0) onSample(tickCountRef.current);
    }, intervalMs);
  };

  const stop = () => {
    setIsRunning(false);
    if (intervalIdRef.current) { clearInterval(intervalIdRef.current); intervalIdRef.current = null; }
  };

  const toggleRun = () => (isRunning ? stop() : start());

  const resetTickCount = () => { tickCountRef.current = 0; setTickCount(0); };

  return { isRunning, tickCount, start, stop, toggleRun, resetTickCount };
}
