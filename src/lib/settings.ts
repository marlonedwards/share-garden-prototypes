import { useState } from "react";

// Player-facing presentation settings. Saved in localStorage so a choice made
// in one lesson holds across every game on this computer.

export interface OrbSettings {
  clippings: boolean;  // real-headline newspaper cards at era moments
  ticker: boolean;     // live price strip under the stage
}

const KEY = "orb-settings";
const DEFAULTS: OrbSettings = { clippings: true, ticker: true };

export function getSettings(): OrbSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useOrbSettings(): [OrbSettings, (patch: Partial<OrbSettings>) => void] {
  const [s, setS] = useState<OrbSettings>(getSettings);
  const update = (patch: Partial<OrbSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* private browsing; holds for this session only */ }
  };
  return [s, update];
}
