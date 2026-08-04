import { useEffect, useRef, useState, useCallback } from "react";
import { Market, MarketEvent, EVENTS } from "../engine/market";

export interface SimOpts {
  seed?: number;
  cash?: number;
  feeDrag?: number;
  autoplay?: boolean;
  maxStep?: number;
  events?: MarketEvent[];
  baseMs?: number;      // wall-clock ms per day at 1x speed
}

// Drives a market-like instance on a wall-clock interval with pause/play/speed.
// The market mutates in place; we bump a counter to re-render. Pass `make` to
// drive something other than the seeded Market (e.g. the history replay).
export interface Tickable { step: number; tick(): void; }

export function useSim<T extends Tickable = Market>(opts: SimOpts & { make?: () => T } = {}) {
  const { seed = 12345, cash = 1000, feeDrag = 0, autoplay = false, maxStep = 150, events = EVENTS, baseMs = 620 } = opts;
  const make = (opts.make ?? (() => new Market(seed, cash, feeDrag, events) as unknown as T)) as () => T;
  const marketRef = useRef<T>(make());
  const [, force] = useState(0);
  const [speed, setSpeed] = useState(0); // 0 = paused, 1 = play, 2 = fast, 4 = faster
  const [done, setDone] = useState(false);
  const render = useCallback(() => force((n) => n + 1), []);

  useEffect(() => {
    if (autoplay) setSpeed(1);
  }, [autoplay]);

  useEffect(() => {
    if (speed === 0) return;
    const base = baseMs; // ms per day at 1x
    const id = setInterval(() => {
      const m = marketRef.current;
      if (m.step >= maxStep) { setDone(true); setSpeed(0); return; }
      m.tick();
      render();
    }, base / speed);
    return () => clearInterval(id);
  }, [speed, maxStep, baseMs, render]);

  const reset = useCallback(() => {
    marketRef.current = make();
    setDone(false);
    setSpeed(0);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, cash, feeDrag, events, render]);

  const act = useCallback((fn: (m: T) => void) => {
    fn(marketRef.current);
    render();
  }, [render]);

  return { m: marketRef.current, speed, setSpeed, done, reset, act, render };
}
