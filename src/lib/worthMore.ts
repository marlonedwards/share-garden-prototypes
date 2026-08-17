// Worth More: the deal logic behind the higher-or-lower board.
//
// Everything a run needs is decided here so the page only has to draw: the
// day's seed, the deck that never repeats a company until it runs dry, the
// fairness floor (no pair closer than 20 percent), the ramp that starts with
// blowouts and tightens as the streak grows, and the one plain line that puts
// a number in something a person can picture.
//
// The whole run is a pure function of the day's seed, because a wrong answer
// ends the run: at any point the streak equals the number of cards drawn, so
// every player on a given day sees the same order in the same places.
import { COMPANIES, TakeoverCompany } from "../data/takeoverCompanies";

export type Company = TakeoverCompany;

// ------------------------------------------------------------------ random

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// yyyy-mm-dd in local time, and a stable number made from it
export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function seedFrom(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// ------------------------------------------------------------------- deck

export interface Dealer {
  rng: () => number;
  queue: Company[];
}

// the closest two companies are ever allowed to sit
export const FLOOR = 1.2;

export function ratio(a: Company, b: Company): number {
  const hi = Math.max(a.cap, b.cap);
  const lo = Math.min(a.cap, b.cap);
  return lo > 0 ? hi / lo : Infinity;
}

// blowouts while the player finds their feet, then real gaps, then the
// squeeze: from ten on, a pair can sit as close as the floor allows
function bands(streak: number): Array<[number, number]> {
  if (streak < 5) return [[5, Infinity], [3, Infinity], [FLOOR, Infinity]];
  if (streak < 10) return [[2, 5], [2, Infinity], [FLOOR, Infinity]];
  return [[FLOOR, 2], [FLOOR, 3], [FLOOR, Infinity]];
}

export function newDealer(seed: number): Dealer {
  const rng = mulberry32(seed);
  return { rng, queue: shuffle(COMPANIES, rng) };
}

function refill(d: Dealer, keep: Company | null) {
  d.queue = shuffle(COMPANIES, d.rng).filter((c) => c.name !== keep?.name);
}

function take(d: Dealer, anchor: Company, want: Array<[number, number]>): Company | null {
  for (const [lo, hi] of want) {
    const i = d.queue.findIndex((c) => {
      if (c.name === anchor.name) return false;
      const r = ratio(anchor, c);
      return r >= lo && r < hi;
    });
    if (i >= 0) return d.queue.splice(i, 1)[0];
  }
  return null;
}

export function drawFirst(d: Dealer): Company {
  if (!d.queue.length) refill(d, null);
  return d.queue.shift()!;
}

// the next challenger: fair by the floor, sized by the streak, and never a
// name this deck has already spent
export function drawNext(d: Dealer, anchor: Company, streak: number): Company {
  const want = bands(streak);
  let c = take(d, anchor, want);
  if (!c) {
    refill(d, anchor);
    c = take(d, anchor, want);
  }
  return c ?? COMPANIES.filter((x) => ratio(anchor, x) >= FLOOR)[0];
}

// ------------------------------------------------------------- scale lines

function plural(name: string): string {
  if (/s$/.test(name)) return name;
  if (/(x|z|ch|sh)$/.test(name)) return `${name}es`;
  return `${name}s`;
}

function fits(n: number): boolean {
  return n >= 2 && n <= 10000;
}

// one way to say "this many of those". buying counts down, because a company
// that covers one and three quarters of another cannot buy two of them; being
// worth about that many rounds, because about is allowed to round.
function howMany(big: Company, small: Company, rng: () => number): string | null {
  const r = ratio(big, small);
  const buy = Math.floor(r);
  const about = Math.round(r);
  const buyLine = `${big.name} could buy ${buy.toLocaleString()} ${plural(small.name)}`;
  const aboutLine = `${big.name} is worth about ${about.toLocaleString()} ${plural(small.name)}`;
  if (rng() < 0.5) {
    if (fits(buy)) return buyLine;
    return fits(about) ? aboutLine : null;
  }
  if (fits(about)) return aboutLine;
  return fits(buy) ? buyLine : null;
}

// one line per reveal, always built from the caps in the data, and always
// about the two companies on screen: the winner is measured in the company it
// just beat, never in some third name that was not part of the round.
export function scaleLine(a: Company, b: Company, rng: () => number): string {
  const big = a.cap >= b.cap ? a : b;
  const small = a.cap >= b.cap ? b : a;
  const pairLine = howMany(big, small, rng);
  if (pairLine) return pairLine;

  // close pairs (under 2x) read better as a percent gap
  const pct = Math.round((ratio(big, small) - 1) * 100);
  return `${big.name} is worth about ${pct} percent more than ${small.name}`;
}

// ------------------------------------------------------------------ money

// count-up friendly money: holds the unit of the final number so the digits
// never jump from millions to trillions mid animation
export function moneyIn(value: number, target: number): string {
  if (target >= 1e12) return `$${(value / 1e12).toFixed(value >= 1e13 ? 0 : 1)}T`;
  if (target >= 1e9) return `$${(value / 1e9).toFixed(target >= 1e10 ? 0 : 1)}B`;
  if (target >= 1e6) return `$${(value / 1e6).toFixed(target >= 1e7 ? 0 : 1)}M`;
  return `$${Math.round(value / 1e3)}K`;
}

// ------------------------------------------------------------------ color

// A company half is painted in that company's own hue, sunk deep enough that
// white type always reads on it. Brand colors arrive at every brightness, so
// the lightness is found by measurement, not by a fixed number: walk it down
// until the color is dark enough to carry white text.

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const t = hex.replace("#", "");
  const r = parseInt(t.slice(0, 2), 16) / 255;
  const g = parseInt(t.slice(2, 4), 16) / 255;
  const b = parseInt(t.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const p: [number, number, number] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return [p[0] + m, p[1] + m, p[2] + m];
}

function luminance(r: number, g: number, b: number): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function css(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(1)}%)`;
}

// hue and punch kept, greys kept grey
function base(hex: string): { h: number; s: number } {
  const { h, s } = hexToHsl(hex);
  return { h, s: s < 0.08 ? 0.05 : Math.min(0.92, Math.max(0.48, s)) };
}

// the deepest lightness that still carries white text at this hue
function sink(h: number, s: number, ceiling: number): number {
  let l = 0.46;
  for (let i = 0; i < 40; i++) {
    const [r, g, b] = hslToRgb(h, s, l);
    if (luminance(r, g, b) <= ceiling) break;
    l -= 0.01;
  }
  return Math.max(0.08, l);
}

// one company, one half of the screen: same hue all the way down
export function panelPaint(hex: string): string {
  const { h, s } = base(hex);
  const top = sink(h, s, 0.18);
  return `radial-gradient(120% 96% at 50% 26%, ${css(h, s, top)} 0%, ${css(
    h,
    s,
    top * 0.68,
  )} 46%, ${css(h, s, top * 0.4)} 100%)`;
}

// the flat version of the same paint, for anything behind the halves
export function panelFlat(hex: string): string {
  const { h, s } = base(hex);
  return css(h, s, sink(h, s, 0.18) * 0.68);
}

// the brand color pulled down far enough to read on a white disc
export function onWhite(hex: string): string {
  const { h } = hexToHsl(hex);
  const { s } = base(hex);
  return css(h, s, sink(h, s, 0.13));
}
