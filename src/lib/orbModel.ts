// Shared model for the Orb game: which assets are infusable, their essence
// colors, and the value -> orb-size law. Kept apart from the renderer so the
// 2D canvas scene and a future three.js scene draw from the same source.

export interface OrbAsset {
  id: string;          // engine asset id
  color: string;       // essence hue (Finder-tag family)
  glow: string;        // lighter partner tone for gradient depth
}

// The four infusable colors of the tutorial. Distinct hues, Apple-tag energy.
export const ORB_ASSETS: OrbAsset[] = [
  { id: "nova", color: "#0a84ff", glow: "#7cc0ff" },
  { id: "btx",  color: "#bf5af2", glow: "#e0a9ff" },
  { id: "volt", color: "#ff9f0a", glow: "#ffcf7a" },
  { id: "aura", color: "#30d158", glow: "#8ff0ae" },
];

export function orbAsset(id: string): OrbAsset | undefined {
  return ORB_ASSETS.find((a) => a.id === id);
}

// the full eight-color cast for the freeplay sandbox
export const FREE_ASSETS: OrbAsset[] = [
  ...ORB_ASSETS,
  { id: "pepr", color: "#64d2ff", glow: "#b0e8ff" },
  { id: "iron", color: "#a2845e", glow: "#d4b795" },
  { id: "cane", color: "#ff453a", glow: "#ff9d97" },
  { id: "etna", color: "#ffd60a", glow: "#ffe97a" },
];

// The sealed rainbow orb holds a slice of everything; its colors can never be
// separated. Fixed, even composition.
export const RAINBOW: OrbAsset[] = [
  { id: "r-red",    color: "#ff453a", glow: "#ff9d97" },
  { id: "r-orange", color: "#ff9f0a", glow: "#ffcf7a" },
  { id: "r-yellow", color: "#ffd60a", glow: "#ffe97a" },
  { id: "r-green",  color: "#30d158", glow: "#8ff0ae" },
  { id: "r-teal",   color: "#64d2ff", glow: "#b0e8ff" },
  { id: "r-blue",   color: "#0a84ff", glow: "#7cc0ff" },
  { id: "r-purple", color: "#bf5af2", glow: "#e0a9ff" },
];

// One slice of the orb's liquid: a color and its share of the volume.
export interface CompSlice {
  key: string;
  color: string;
  glow: string;
  frac: number;        // 0..1 share of orb value
}

// Area encodes value so the your-orb / rainbow-orb comparison stays honest.
// $1000 -> ~98px radius on the reference stage.
export function valueToRadius(value: number): number {
  return Math.max(6, 3.1 * Math.sqrt(Math.max(0, value)));
}

export function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// largest-remainder rounding so displayed percentages always sum to 100
export function roundPcts(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v * 100) / total);
  const floors = raw.map(Math.floor);
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem && order.length; k++) floors[order[k % order.length][1]]++;
  return floors;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const c = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
}
