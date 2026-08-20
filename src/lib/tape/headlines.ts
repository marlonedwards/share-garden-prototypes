// The tape's headline layer: pool selection, seeded draw, and truth computed
// from the real forward move. Contract: docs/tape-shared.md section 5.
//
// Nothing here authors a headline. The pool is data (src/data/headlinePool.ts)
// and is passed in rather than imported, so a harness can run this code
// against a fixture and the games can run it against the real pool.
//
// Elijah's requirement is the whole design: headlines are random each time,
// they conflict, and reading them alone cannot win the run. That is why truth
// is a label the series computes after the fact, never a field an author sets.

import { EraId, INDEX_TICKER, Ticker, loadEra, monthIndexOf, seriesOf } from "./engine";

export type Slant = "up" | "down" | "steady";
export type TruthLabel = "signal" | "lie" | "noise";

// The shape src/data/headlinePool.ts exports. Authored in that file, read here.
export interface PooledHeadline {
  era: EraId;
  month: string;        // "2008-09"; with monthEnd it is an inclusive range start
  monthEnd?: string;    // inclusive range end
  about: string;        // a ticker in the era's series, or "market" for the index
  text: string;
  slant: Slant;
  real?: boolean;       // verified archived headline
  source?: string;
  date?: string;
}

// How far ahead the label looks, and the move that counts as a move.
export const HORIZON = 3;
export const MOVE = 0.04;

// The mix a run has to land on before its sample is accepted.
export const MIN_SIGNAL = 0.3;
export const MIN_LIE = 0.25;

// One headline per this many tape months.
export const PER_MONTHS = 2.5;

const ATTEMPTS = 60;

// -------------------------------------------------------------------- truth

export function judgeSeries(about: string): Ticker {
  return about === "market" ? INDEX_TICKER : about;
}

// r = p[m+3] / p[m] - 1, clamped at the series end. Null when there is nothing
// to judge: a company already at zero has no forward move, only a hole.
export function forwardReturn(era: EraId, about: string, monthIndex: number): number | null {
  const values = seriesOf(era, judgeSeries(about));
  if (monthIndex < 0 || monthIndex >= values.length) return null;
  const now = values[monthIndex];
  if (!(now > 0)) return null;
  const then = values[Math.min(monthIndex + HORIZON, values.length - 1)];
  return then / now - 1;
}

// The rule, whole:
//
//   up      r >= +4% signal, r <= -4% lie, otherwise noise
//   down    r <= -4% signal, r >= +4% lie, otherwise noise
//   steady  |r| < 4% signal, |r| >= 4% lie
//
// Steady is the case the contract left open. It is a directionless claim, so
// it is graded on the same 4% band rather than a sign: quiet is a signal, a
// real move is a lie. That leaves steady with no noise band, which is the
// smallest rule that stays consistent with the two directional cases, since
// noise there is exactly the band where the claim was neither right nor wrong
// and a steady claim is always one or the other.
export function labelOf(slant: Slant, r: number | null): TruthLabel {
  if (r === null || !Number.isFinite(r)) return "noise";
  if (slant === "steady") return Math.abs(r) < MOVE ? "signal" : "lie";
  if (Math.abs(r) < MOVE) return "noise";
  const up = r > 0;
  const claimUp = slant === "up";
  return up === claimUp ? "signal" : "lie";
}

export function labelHeadline(h: PooledHeadline, monthIndex: number): TruthLabel {
  return labelOf(h.slant, forwardReturn(h.era, h.about, monthIndex));
}

// ---------------------------------------------------------------------- rng

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function shuffled<T>(rng: () => number, list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

// ----------------------------------------------------------------- sampling

// What the UI gets mid-run. No label anywhere on this shape, on purpose.
export interface PlacedHeadline {
  id: string;
  monthIndex: number;   // index into the era's months
  month: string;
  about: string;
  text: string;
  slant: Slant;
  real: boolean;
  source?: string;
  date?: string;
}

export interface SampleMix {
  signal: number;
  lie: number;
  noise: number;
  total: number;
  signalFrac: number;
  lieFrac: number;
  legal: boolean;
}

export interface HeadlineSample {
  items: PlacedHeadline[];              // the play surface
  labels: Record<string, TruthLabel>;   // the end-card reveal, kept apart
  mix: SampleMix;
  attempts: number;
  fallback: boolean;
}

export interface SampleOptions {
  era: EraId;
  pool: PooledHeadline[];
  seed: number;
  startIndex?: number;   // first month of the run, era indices
  endIndex?: number;     // last month of the run, inclusive
  count?: number;        // overrides the one per 2.5 months default
}

interface Candidate {
  id: string;
  entry: PooledHeadline;
  from: number;          // first month it may land on, inside the run
  to: number;            // last month it may land on, inside the run
}

// Pool entries that can legally land in this run: right era, a placement
// window that overlaps the run, and a subject the era actually carries.
export function candidatesFor(
  era: EraId, pool: PooledHeadline[], startIndex: number, endIndex: number,
): Candidate[] {
  const series = loadEra(era).series;
  const out: Candidate[] = [];
  pool.forEach((entry, i) => {
    if (entry.era !== era) return;
    if (entry.about !== "market" && !(entry.about in series)) return;
    const from = monthIndexOf(era, entry.month);
    if (from < 0) return;
    const rawTo = entry.monthEnd ? monthIndexOf(era, entry.monthEnd) : from;
    const to = rawTo < from ? from : rawTo;
    const lo = Math.max(from, startIndex);
    const hi = Math.min(to, endIndex);
    if (lo > hi) return;
    out.push({ id: `${era}-${i}`, entry, from: lo, to: hi });
  });
  return out;
}

function place(c: Candidate, monthIndex: number, era: EraId): PlacedHeadline {
  return {
    id: c.id,
    monthIndex,
    month: loadEra(era).months[monthIndex],
    about: c.entry.about,
    text: c.entry.text,
    slant: c.entry.slant,
    real: c.entry.real === true,
    source: c.entry.source,
    date: c.entry.date,
  };
}

function mixOf(labels: TruthLabel[]): SampleMix {
  let signal = 0;
  let lie = 0;
  let noise = 0;
  for (const l of labels) {
    if (l === "signal") signal++;
    else if (l === "lie") lie++;
    else noise++;
  }
  const total = labels.length;
  const signalFrac = total === 0 ? 0 : signal / total;
  const lieFrac = total === 0 ? 0 : lie / total;
  return {
    signal, lie, noise, total, signalFrac, lieFrac,
    legal: total > 0 && signalFrac >= MIN_SIGNAL && lieFrac >= MIN_LIE,
  };
}

function byMonth(a: PlacedHeadline, b: PlacedHeadline): number {
  return a.monthIndex - b.monthIndex || a.id.localeCompare(b.id);
}

function assemble(era: EraId, items: PlacedHeadline[]): HeadlineSample {
  const sorted = [...items].sort(byMonth);
  const labels: Record<string, TruthLabel> = {};
  const list: TruthLabel[] = [];
  for (const item of sorted) {
    const label = labelOf(item.slant, forwardReturn(era, item.about, item.monthIndex));
    labels[item.id] = label;
    list.push(label);
  }
  return { items: sorted, labels, mix: mixOf(list), attempts: 0, fallback: false };
}

// One draw: shuffle the candidates, take the first count, and give each a
// month inside its own window, preferring a month no other headline took so
// the tape does not bunch up.
function attempt(era: EraId, cands: Candidate[], count: number, rng: () => number): PlacedHeadline[] {
  const order = shuffled(rng, cands).slice(0, count);
  const taken = new Set<number>();
  const out: PlacedHeadline[] = [];
  for (const c of order) {
    const window: number[] = [];
    const free: number[] = [];
    for (let m = c.from; m <= c.to; m++) {
      window.push(m);
      if (!taken.has(m)) free.push(m);
    }
    const month = pick(rng, free.length > 0 ? free : window);
    taken.add(month);
    out.push(place(c, month, era));
  }
  return out;
}

// When no draw lands a legal mix, the run still has to be the same run for the
// same seed. This build is deterministic: every candidate sits at the first
// month of its window, which fixes its label, and the buckets are then filled
// to the quota in one seeded shuffle.
function fallbackDraw(
  era: EraId, cands: Candidate[], count: number, rng: () => number,
): PlacedHeadline[] {
  const signals: PlacedHeadline[] = [];
  const lies: PlacedHeadline[] = [];
  const rest: PlacedHeadline[] = [];
  for (const c of cands) {
    const item = place(c, c.from, era);
    const label = labelOf(item.slant, forwardReturn(era, item.about, item.monthIndex));
    if (label === "signal") signals.push(item);
    else if (label === "lie") lies.push(item);
    else rest.push(item);
  }
  const wantSignal = Math.ceil(MIN_SIGNAL * count);
  const wantLie = Math.ceil(MIN_LIE * count);
  const shuffledSignals = shuffled(rng, signals);
  const shuffledLies = shuffled(rng, lies);
  const picked: PlacedHeadline[] = [
    ...shuffledSignals.slice(0, wantSignal),
    ...shuffledLies.slice(0, wantLie),
  ];
  const chosen = new Set(picked.map((p) => p.id));
  const filler = shuffled(rng, [
    ...rest,
    ...shuffledSignals.slice(wantSignal),
    ...shuffledLies.slice(wantLie),
  ]);
  for (const item of filler) {
    if (picked.length >= count) break;
    if (!chosen.has(item.id)) picked.push(item);
  }
  return picked.slice(0, count);
}

// One headline per 2.5 tape months, drawn with a seeded rng so a seed pins the
// whole run. A draw is rejected and redrawn until the mix is at least 30%
// signal and 25% lies, then falls back to a built sample so the same seed
// always ends at the same place.
export function sampleHeadlines(opts: SampleOptions): HeadlineSample {
  const months = loadEra(opts.era).months;
  const startIndex = opts.startIndex ?? 0;
  const endIndex = opts.endIndex ?? months.length - 1;
  const span = endIndex - startIndex + 1;
  const cands = candidatesFor(opts.era, opts.pool, startIndex, endIndex);
  const want = opts.count ?? Math.max(1, Math.round(span / PER_MONTHS));
  const count = Math.min(want, cands.length);
  if (count === 0) {
    return { items: [], labels: {}, mix: mixOf([]), attempts: 0, fallback: false };
  }

  const rng = mulberry32(opts.seed);
  for (let i = 1; i <= ATTEMPTS; i++) {
    const sample = assemble(opts.era, attempt(opts.era, cands, count, rng));
    if (sample.mix.legal) return { ...sample, attempts: i };
  }
  const built = assemble(opts.era, fallbackDraw(opts.era, cands, count, rng));
  return { ...built, attempts: ATTEMPTS, fallback: true };
}
