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

// Cards stack and consume: one trade is one card, any number of shares.
export type Deck = Record<CardId, number>;

export const LESSON_DEAL: Partial<Deck> = { buy: 2, sell: 1 };
export const PERFECT_DEAL: Partial<Deck> = { buy: 1 };
export const REVIEW_DEAL: Partial<Deck> = { buy: 1 };
export const ARCADE_DEAL: Partial<Deck> = { buy: 1 };
export const CHEST_BUNDLE = 3;

export type Lot = { p: number; d: number };

export type OptionPosition = {
  stock: string;
  dir: "up" | "down";
  premium: number;
  strike: number; // price when opened
  opened: number; // day
  expires: number; // day
};

export type DayReportLine = { kind: "auto" | "option-win" | "option-loss"; text: string };

export type StackState = {
  day: number;
  cash: number;
  lots: Record<string, Lot[]>;
  learned: string[];
  done: Record<string, boolean>;
  missKinds: Record<string, boolean>;
  deck: Deck;
  chestsEarned: ChestId[];
  chestsOpened: ChestId[];
  conceptCards: string[];
  autopilot: string[]; // stock ids with Schedule playing
  options: OptionPosition[];
  optionsTaught: boolean; // the teach card that gates the first play
  dayChg: number | null; // pinned at day tick; a sale never reads as a loss
  lastReport: DayReportLine[]; // what the last day tick did on its own
  streak: number;
  lastActionDay: number; // last day with a market action (lesson, buy, sell)
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

export function emptyDeck(): Deck {
  return { buy: 0, sell: 0, schedule: 0, the500: 0, options: 0 };
}

export function freshState(): StackState {
  return {
    day: 1,
    cash: 0,
    lots: {},
    learned: [],
    done: {},
    missKinds: {},
    deck: emptyDeck(),
    chestsEarned: [],
    chestsOpened: [],
    conceptCards: [],
    autopilot: [],
    options: [],
    optionsTaught: false,
    dayChg: null,
    lastReport: [],
    streak: 0,
    lastActionDay: 0,
    arc: { day: 1, paidWins: 0, plays: 0 },
  };
}

export function loadState(): StackState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StackState;
      if (s && typeof s.day === "number") {
        const merged = { ...freshState(), ...s };
        // a pre-card-economy save carried the deck as an array
        if (Array.isArray(merged.deck)) merged.deck = emptyDeck();
        merged.deck = { ...emptyDeck(), ...merged.deck };
        return merged;
      }
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
  s.deck = { ...emptyDeck(), buy: 7, sell: 3 };
  s.streak = 5;
  s.lastActionDay = 6;
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

export function cardCount(s: StackState, c: CardId): number {
  return s.deck[c] ?? 0;
}

// whether the card slot shows face-up at all (ever dealt or currently held)
export function cardKnown(s: StackState, c: CardId): boolean {
  if (cardCount(s, c) > 0) return true;
  if (c === "buy" || c === "sell") return s.done["0-0"] === true;
  if (c === "schedule") return s.chestsOpened.includes("unit1");
  if (c === "the500") return s.chestsOpened.includes("unit2");
  return s.chestsOpened.includes("endgame");
}

export function dealCards(s: StackState, deal: Partial<Deck>): StackState {
  const deck = { ...s.deck };
  for (const k of Object.keys(deal) as CardId[]) deck[k] = (deck[k] ?? 0) + (deal[k] ?? 0);
  return { ...s, deck };
}

function consumeCard(s: StackState, c: CardId): StackState | null {
  if (cardCount(s, c) < 1) return null;
  return { ...s, deck: { ...s.deck, [c]: s.deck[c] - 1 } };
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

// any market action feeds the streak
export function markAction(s: StackState): StackState {
  if (s.lastActionDay === s.day) return s;
  const streak = s.lastActionDay === s.day - 1 || s.lastActionDay === 0 ? s.streak + 1 : 1;
  return { ...s, streak, lastActionDay: s.day };
}

// a bare share purchase; card consumption is the caller's contract
function mintShares(s: StackState, id: string, n: number): StackState | null {
  const p = priceAt(id, s.day);
  if (n < 1 || s.cash < p * n - 0.001) return null;
  const minted: Lot[] = Array.from({ length: n }, () => ({ p, d: s.day }));
  const lots = { ...s.lots, [id]: [...lotsOf(s, id), ...minted] };
  return markAction({ ...s, cash: Math.round((s.cash - p * n) * 100) / 100, lots });
}

export function maxAffordable(s: StackState, id: string): number {
  return Math.floor((s.cash + 0.001) / priceAt(id, s.day));
}

// one trade, one card: Buy n shares of one stock
export function playBuy(s: StackState, id: string, n: number): StackState | null {
  const afterCard = consumeCard(s, "buy");
  if (!afterCard) return null;
  return mintShares(afterCard, id, n);
}

// one trade, one card: Sell the newest n shares off a stack
export function playSell(s: StackState, id: string, n: number): StackState | null {
  const held = lotsOf(s, id);
  if (n < 1 || n > held.length) return null;
  const afterCard = consumeCard(s, "sell");
  if (!afterCard) return null;
  const keep = held.slice(0, held.length - n);
  const lots = { ...afterCard.lots };
  if (keep.length) lots[id] = keep;
  else delete lots[id];
  const proceeds = n * priceAt(id, s.day);
  return markAction({ ...afterCard, cash: Math.round((afterCard.cash + proceeds) * 100) / 100, lots });
}

export function playSchedule(s: StackState, id: string): StackState | null {
  if (s.autopilot.includes(id)) return null;
  const afterCard = consumeCard(s, "schedule");
  if (!afterCard) return null;
  return markAction({ ...afterCard, autopilot: [...afterCard.autopilot, id] });
}

// stopping does not refund the card
export function stopSchedule(s: StackState, id: string): StackState {
  return { ...s, autopilot: s.autopilot.filter((x) => x !== id) };
}

export function playThe500(s: StackState, n: number): StackState | null {
  const afterCard = consumeCard(s, "the500");
  if (!afterCard) return null;
  return mintShares(afterCard, "voo", n);
}

export function optionPremium(stock: string, day: number): number {
  return Math.round(priceAt(stock, day) * OPTION_PREMIUM_RATE * 100) / 100;
}

export function playOptions(s: StackState, stock: string, dir: "up" | "down"): StackState | null {
  const premium = optionPremium(stock, s.day);
  if (s.cash < premium) return null;
  const afterCard = consumeCard(s, "options");
  if (!afterCard) return null;
  const pos: OptionPosition = {
    stock, dir, premium, strike: priceAt(stock, s.day), opened: s.day, expires: s.day + OPTION_EXPIRY_DAYS,
  };
  return markAction({
    ...afterCard,
    cash: Math.round((afterCard.cash - premium) * 100) / 100,
    options: [...afterCard.options, pos],
  });
}

// lesson completion: pay, cards, learned companies, streak, due chests.
// Under 75% first-try accuracy pays nothing and deals nothing.
export function applyLesson(
  s: StackState,
  u: number,
  l: number,
  firstCorrect: number,
  total: number,
): { state: StackState; pay: number; dealt: Partial<Deck>; payNote: string } {
  const key = lessonKey(u, l);
  const isReview = !!s.done[key];
  const lesson = UNITS_CONTENT[u].lessons[l];
  const acc = total > 0 ? firstCorrect / total : 1;
  let pay = 0;
  let dealt: Partial<Deck> = {};
  let payNote = "lesson pay";
  if (isReview) {
    pay = REVIEW_PAY;
    payNote = "review pay";
    dealt = { ...REVIEW_DEAL };
    if (u === 0 && s.chestsOpened.includes("unit1")) dealt.schedule = (dealt.schedule ?? 0) + 1;
    if (u === 1 && s.chestsOpened.includes("unit2")) dealt.the500 = (dealt.the500 ?? 0) + 1;
    if (lesson.capstone && s.chestsOpened.includes("endgame")) dealt.options = (dealt.options ?? 0) + 1;
  } else if (lesson.prepay) {
    pay = 0;
    payNote = "your stock now";
    dealt = {}; // lesson 1's cards were dealt with the paycheck up front
  } else if (acc < 0.75) {
    pay = 0;
    payNote = "under 75%";
  } else {
    pay = BASE_PAY + (acc >= 0.999 ? PERFECT_BONUS : 0);
    payNote = acc >= 0.999 ? "perfect bonus" : "lesson pay";
    dealt = { ...LESSON_DEAL };
    if (acc >= 0.999) dealt.buy = (dealt.buy ?? 0) + (PERFECT_DEAL.buy ?? 0);
  }
  let next = { ...s, cash: Math.round((s.cash + pay) * 100) / 100 };
  next = dealCards(next, dealt);
  if (!next.done[key]) {
    next = { ...next, done: { ...next.done, [key]: true } };
    const learned = [...next.learned];
    for (const id of lesson.meet) if (!learned.includes(id)) learned.push(id);
    next = { ...next, learned };
  }
  next = markAction(next);
  next = earnDueChests(next);
  return { state: next, pay, dealt, payNote };
}

export function arcadeWin(s: StackState): { state: StackState; paid: boolean } {
  let next = { ...s, arc: { ...s.arc, plays: s.arc.plays + 1 } };
  const paid = next.arc.paidWins < ARCADE_PAID_PLAYS;
  if (paid) {
    next = {
      ...next,
      cash: Math.round((next.cash + ARCADE_PAY) * 100) / 100,
      arc: { ...next.arc, paidWins: next.arc.paidWins + 1 },
    };
    next = dealCards(next, ARCADE_DEAL);
  }
  return { state: next, paid };
}

export function arcadeLoss(s: StackState): StackState {
  return { ...s, arc: { ...s.arc, plays: s.arc.plays + 1 } };
}

// The Tomorrow tick: prices move, Schedule buys on its own (no card,
// the Schedule card already paid for the autopilot), options at expiry
// resolve. Loss on an option never exceeds its premium (payout >= 0).
export function tomorrow(s: StackState): StackState {
  const before = holdingsWorth(s);
  let next: StackState = { ...s, day: Math.min(s.day + 1, MAX_DAY) };
  next.dayChg = holdingsWorth(next) - before;
  if (next.arc.day !== next.day) next = { ...next, arc: { day: next.day, paidWins: 0, plays: 0 } };

  const report: DayReportLine[] = [];
  for (const id of next.autopilot) {
    const p = priceAt(id, next.day);
    if (next.cash >= p) {
      const lots = { ...next.lots, [id]: [...lotsOf(next, id), { p, d: next.day }] };
      next = { ...next, cash: Math.round((next.cash - p) * 100) / 100, lots };
      report.push({ kind: "auto", text: `Schedule bought 1 ${COMPANIES[id].name} at ${money(p)}.` });
    } else {
      report.push({ kind: "auto", text: `Schedule skipped ${COMPANIES[id].name}: not enough cash.` });
    }
  }

  const open: OptionPosition[] = [];
  for (const pos of next.options) {
    if (next.day >= pos.expires) {
      const now = priceAt(pos.stock, next.day);
      const move = pos.dir === "up" ? now - pos.strike : pos.strike - now;
      const payout = Math.max(0, Math.round(move * 100) / 100);
      next = { ...next, cash: Math.round((next.cash + payout) * 100) / 100 };
      const name = COMPANIES[pos.stock].name;
      report.push(
        payout > 0
          ? { kind: "option-win", text: `Your ${name} option paid ${money(payout)} on a ${money(pos.premium)} premium.` }
          : { kind: "option-loss", text: `Your ${name} option expired worthless. The ${money(pos.premium)} premium is gone.` },
      );
    } else {
      open.push(pos);
    }
  }
  next = { ...next, options: open, lastReport: report };

  return next;
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
  let next = dealCards(s, { [grant.strategy]: CHEST_BUNDLE });
  const conceptCards = [...next.conceptCards];
  for (const c of grant.concepts) if (!conceptCards.includes(c)) conceptCards.push(c);
  return { ...next, conceptCards, chestsOpened: [...next.chestsOpened, chest] };
}

export function unopenedChest(s: StackState): ChestId | null {
  for (const c of s.chestsEarned) if (!s.chestsOpened.includes(c)) return c;
  return null;
}
