import { useEffect, useRef, useState, useCallback } from "react";
import { Market } from "../engine/market";

export interface SimOpts {
  seed?: number;
  cash?: number;
  feeDrag?: number;
  autoplay?: boolean;
  maxStep?: number;
}

// Drives a Market instance on a wall-clock interval with pause/play/speed.
// The Market mutates in place; we bump a counter to re-render.
export function useSim(opts: SimOpts = {}) {
  const { seed = 12345, cash = 1000, feeDrag = 0, autoplay = false, maxStep = 150 } = opts;
  const marketRef = useRef<Market>(new Market(seed, cash, feeDrag));
  const [, force] = useState(0);
  const [speed, setSpeed] = useState(0); // 0 = paused, 1 = play, 2 = fast, 4 = faster
  const [done, setDone] = useState(false);
  const render = useCallback(() => force((n) => n + 1), []);

  useEffect(() => {
    if (autoplay) setSpeed(1);
  }, [autoplay]);

  useEffect(() => {
    if (speed === 0) return;
    const base = 620; // ms per day at 1x
    const id = setInterval(() => {
      const m = marketRef.current;
      if (m.step >= maxStep) { setDone(true); setSpeed(0); return; }
      m.tick();
      render();
    }, base / speed);
    return () => clearInterval(id);
  }, [speed, maxStep, render]);

  const reset = useCallback(() => {
    marketRef.current = new Market(seed, cash, feeDrag);
    setDone(false);
    setSpeed(0);
    render();
  }, [seed, cash, feeDrag, render]);

  const act = useCallback((fn: (m: Market) => void) => {
    fn(marketRef.current);
    render();
  }, [render]);

  return { m: marketRef.current, speed, setSpeed, done, reset, act, render };
}
