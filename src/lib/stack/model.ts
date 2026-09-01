// Stack: the model layer. The only source of truth for money, shares,
// lots, the deck, chests, and the clock. Pages read exports and draw.
// Contract: docs/stack-desktop-spec.md.

import { UNITS_CONTENT, COMPANY_BLURBS } from "../../content/stackContent";

export const BASE_PAY = 50;
export const L1_PREPAY = 80;
export const PERFECT_BONUS = 10;
export const REVIEW_PAY = 15;
export const ARCADE_PAY = 5;
export const ARCADE_PAID_PLAYS = 3;
export const OPTION_PREMIUM_RATE = 0.02; // of share price, see spec "Open"
export const OPTION_EXPIRY_DAYS = 3;

export type CardId = "buy" | "sell" | "schedule" | "the500" | "options";
export type ChestId = "unit1" | "unit2" | "endgame";

export type Lot = { p: number; d: number };

export type OptionPosition = {
  stock: string;
  dir: "up" | "down";
  premium: number;
  strike: number; // price when opened
  opened: number; // day
  expires: number; // day
};

export type StackState = {
  day: number;
  cash: number;
  lots: Record<string, Lot[]>;
  learned: string[];
  done: Record<string, boolean>;
  missKinds: Record<string, boolean>;
  deck: CardId[];
  chestsEarned: ChestId[];
  chestsOpened: ChestId[];
  conceptCards: string[];
  autopilot: string[]; // stock ids with Schedule playing
  options: OptionPosition[];
  dayChg: number | null; // pinned at day tick; a sale never reads as a loss
  arc: { day: number; paidWins: number; plays: number };
};

// ---------------- companies and prices

export type Company = {
  id: string;
  name: string;
  color: "cream" | "red" | "black" | "slate" | "gold";
  blurb: string;
  fund?: boolean;
  px: number[];
};

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CO_SPEC: [string, string, Company["color"], number, number, number, number, boolean?][] = [
  ["aapl", "Apple", "slate", 232.1, 0.0005, 0.012, 7],
  ["nke", "Nike", "black", 75.4, -0.0003, 0.013, 43],
  ["cost", "Costco", "cream", 912.4, 0.0006, 0.009, 41],
  ["ko", "Coca-Cola", "red", 69.85, 0.0002, 0.007, 53],
  ["pfe", "Pfizer", "cream", 27.6, -0.0004, 0.011, 71],
  ["nvda", "Nvidia", "black", 121.3, 0.0015, 0.028, 29],
  ["mcd", "McDonald's", "red", 291.8, 0.0003, 0.008, 47],
  ["xom", "ExxonMobil", "slate", 112.5, 0.0002, 0.013, 59],
  ["jnj", "Johnson & Johnson", "red", 156.2, 0.0002, 0.007, 67],
  ["voo", "The 500 fund", "gold", 530.1, 0.0004, 0.008, 11, true],
];

export const COMPANIES: Record<string, Company> = {};
for (const [id, name, color, p0, dr, vol, seed, fund] of CO_SPEC) {
  const r = rng(seed);
  const px = [p0];
  for (let d = 1; d <= 400; d++) px.push(px[d - 1] * (1 + dr + (r() - 0.5) * 2 * vol));
  COMPANIES[id] = { id, name, color, blurb: COMPANY_BLURBS[id] ?? "", fund, px };
}

export const MAX_DAY = 399;

export function priceAt(id: string, day: number): number {
  return COMPANIES[id].px[Math.max(0, Math.min(MAX_DAY, day - 1))];
}

export function money(n: number): string {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------- fake friends (demo)

export type Friend = { name: string; streakBase: number; worth: number[]; stacks: [Company["color"], number][] };

function friendSeries(seed: number, base: number): number[] {
  const r = rng(seed);
  const a = [base];
  for (let d = 1; d <= 400; d++) a.push(a[d - 1] * (1 + 0.0006 + (r() - 0.5) * 0.02));
  return a;
}

export const FRIENDS: Friend[] = [
  { name: "Ada", streakBase: 20, worth: friendSeries(101, 480), stacks: [["slate", 4], ["red", 3], ["gold", 2]] },
  { name: "Nick", streakBase: 2, worth: friendSeries(102, 130), stacks: [["black", 2]] },
  { name: "Jared", streakBase: 11, worth: friendSeries(103, 350), stacks: [["red", 3], ["slate", 1]] },
];

// ---------------- state

const SAVE_KEY = "stackv2-save";

export function freshState(): StackState {
  return {
    day: 1,
    cash: 0,
    lots: {},
    learned: [],
    done: {},
    missKinds: {},
    deck: [],
    chestsEarned: [],
    chestsOpened: [],
    conceptCards: [],
    autopilot: [],
    options: [],
    dayChg: null,
    arc: { day: 1, paidWins: 0, plays: 0 },
  };
}

export function loadState(): StackState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StackState;
      if (s && typeof s.day === "number") return { ...freshState(), ...s };
    }
  } catch {
    // fall through to fresh
  }
  return freshState();
}

export function saveState(s: StackState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // storage may be unavailable; the demo keeps playing in memory
  }
}

export function resetState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to clear
  }
}

// A seeded mid-game state so layouts can be looked at with content on
// screen (?demo=1). Never written over a real save unless asked.
export function demoState(): StackState {
  const s = freshState();
  s.day = 6;
  s.cash = 131.75;
  s.deck = ["buy", "sell"];
  s.learned = ["aapl", "nke", "pfe", "cost", "ko", "nvda", "mcd"];
  s.done = { "0-0": true, "0-1": true, "0-2": true, "0-3": true };
  s.lots = {
    nke: [{ p: priceAt("nke", 1), d: 1 }, { p: priceAt("nke", 3), d: 3 }, { p: priceAt("nke", 5), d: 5 }],
    ko: [{ p: priceAt("ko", 2), d: 2 }],
    pfe: [{ p: priceAt("pfe", 2), d: 2 }, { p: priceAt("pfe", 4), d: 4 }],
    aapl: [{ p: priceAt("aapl", 5), d: 5 }],
  };
  s.dayChg = 4.2;
  s.conceptCards = ["share", "price", "volatility"];
  return s;
}

// ---------------- selectors

export function lotsOf(s: StackState, id: string): Lot[] {
  return s.lots[id] ?? [];
}

export function holdingsWorth(s: StackState): number {
  let w = 0;
  for (const id of Object.keys(s.lots)) w += lotsOf(s, id).length * priceAt(id, s.day);
  return w;
}

export function totalWorth(s: StackState): number {
  return s.cash + holdingsWorth(s);
}

export function putIn(s: StackState): number {
  let p = 0;
  for (const id of Object.keys(s.lots)) for (const l of lotsOf(s, id)) p += l.p;
  return p;
}

export function hasCard(s: StackState, c: CardId): boolean {
  return s.deck.includes(c);
}

export function lessonKey(u: number, l: number): string {
  return `${u}-${l}`;
}

export function unitUnlocked(s: StackState, u: number): boolean {
  if (u === 0) return true;
  return UNITS_CONTENT[u - 1].lessons.every((_, i) => s.done[lessonKey(u - 1, i)]);
}

export function nextLesson(s: StackState, u: number): number {
  for (let i = 0; i < UNITS_CONTENT[u].lessons.length; i++) {
    if (!s.done[lessonKey(u, i)]) return i;
  }
  return -1;
}

export function allCapstonesDone(s: StackState): boolean {
  return UNITS_CONTENT.every((unit, u) =>
    unit.lessons.every((_, i) => s.done[lessonKey(u, i)]),
  );
}

// ---------------- actions (each returns a new state; callers save)

export function buyShare(s: StackState, id: string): StackState | null {
  const p = priceAt(id, s.day);
  if (s.cash < p) return null;
  const lots = { ...s.lots, [id]: [...lotsOf(s, id), { p, d: s.day }] };
  return { ...s, cash: s.cash - p, lots };
}

export function sellLots(s: StackState, id: string, idxs: number[]): StackState {
  const keep = lotsOf(s, id).filter((_, i) => !idxs.includes(i));
  const lots = { ...s.lots };
  if (keep.length) lots[id] = keep;
  else delete lots[id];
  const proceeds = idxs.length * priceAt(id, s.day);
  return { ...s, cash: s.cash + proceeds, lots };
}

export function toggleAutopilot(s: StackState, id: string): StackState {
  const on = s.autopilot.includes(id);
  return { ...s, autopilot: on ? s.autopilot.filter((x) => x !== id) : [...s.autopilot, id] };
}

export function openOption(s: StackState, stock: string, dir: "up" | "down"): StackState | null {
  const price = priceAt(stock, s.day);
  const premium = Math.round(price * OPTION_PREMIUM_RATE * 100) / 100;
  if (s.cash < premium) return null;
  const pos: OptionPosition = {
    stock, dir, premium, strike: price, opened: s.day, expires: s.day + OPTION_EXPIRY_DAYS,
  };
  return { ...s, cash: s.cash - premium, options: [...s.options, pos] };
}

export type DayReport = {
  overnight: number; // holdings move
  autopilotBuys: { stock: string; price: number }[];
  optionResults: { pos: OptionPosition; payout: number }[];
};

// The Tomorrow tick: prices move, Schedule buys, options at expiry
// resolve. Loss on an option never exceeds its premium (payout >= 0).
export function tomorrow(s: StackState): { state: StackState; report: DayReport } {
  const before = holdingsWorth(s);
  let next: StackState = { ...s, day: Math.min(s.day + 1, MAX_DAY) };
  const overnight = holdingsWorth(next) - before;
  next.dayChg = overnight;
  if (next.arc.day !== next.day) next = { ...next, arc: { day: next.day, paidWins: 0, plays: 0 } };

  const autopilotBuys: { stock: string; price: number }[] = [];
  for (const id of next.autopilot) {
    const bought = buyShare(next, id);
    if (bought) {
      next = bought;
      autopilotBuys.push({ stock: id, price: priceAt(id, next.day) });
    }
  }

  const optionResults: { pos: OptionPosition; payout: number }[] = [];
  const open: OptionPosition[] = [];
  for (const pos of next.options) {
    if (next.day >= pos.expires) {
      const now = priceAt(pos.stock, next.day);
      const move = pos.dir === "up" ? now - pos.strike : pos.strike - now;
      const payout = Math.max(0, Math.round(move * 100) / 100);
      next = { ...next, cash: next.cash + payout };
      optionResults.push({ pos, payout });
    } else {
      open.push(pos);
    }
  }
  next = { ...next, options: open };

  return { state: next, report: { overnight, autopilotBuys, optionResults } };
}

// ---------------- chests

export const CHEST_CARDS: Record<ChestId, { strategy: CardId; concepts: string[] }> = {
  unit1: { strategy: "schedule", concepts: ["share", "price", "volatility", "zoomout", "pricetag"] },
  unit2: { strategy: "the500", concepts: ["fund", "fee", "index"] },
  endgame: { strategy: "options", concepts: [] },
};

// Called after a lesson completes; earns any chest now due, exactly once.
export function earnDueChests(s: StackState): StackState {
  let next = s;
  const due: ChestId[] = [];
  if (UNITS_CONTENT[0].lessons.every((_, i) => next.done[lessonKey(0, i)])) due.push("unit1");
  if (UNITS_CONTENT[1].lessons.every((_, i) => next.done[lessonKey(1, i)])) due.push("unit2");
  if (allCapstonesDone(next)) due.push("endgame");
  for (const c of due) {
    if (!next.chestsEarned.includes(c)) next = { ...next, chestsEarned: [...next.chestsEarned, c] };
  }
  return next;
}

export function openChest(s: StackState, chest: ChestId): StackState {
  if (!s.chestsEarned.includes(chest) || s.chestsOpened.includes(chest)) return s;
  const grant = CHEST_CARDS[chest];
  const deck = s.deck.includes(grant.strategy) ? s.deck : [...s.deck, grant.strategy];
  const conceptCards = [...s.conceptCards];
  for (const c of grant.concepts) if (!conceptCards.includes(c)) conceptCards.push(c);
  return { ...s, deck, conceptCards, chestsOpened: [...s.chestsOpened, chest] };
}

export function unopenedChest(s: StackState): ChestId | null {
  for (const c of s.chestsEarned) if (!s.chestsOpened.includes(c)) return c;
  return null;
}
