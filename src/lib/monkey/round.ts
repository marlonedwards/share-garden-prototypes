// Monkey Trade's round rules: the level table, the seeded window and board, the
// ten monkeys and their darts, the baskets they buy, the worth path each one
// walks, the rank at the end, and the two localStorage keys that carry
// progress. Contract: docs/monkey-spec.md sections 2, 3, 4 and 14, on top of
// the shared engine in docs/tape-shared.md.
//
// Pure TypeScript. No React, no DOM, no timers, no imports out of src/lib/tape
// except the engine's own functions: every dollar a monkey is worth is
// computed by the same newRun/advanceTo/buy/worthAt the player's desk uses, so
// the troop and the player can never disagree about what a share costs or what
// a thousand dollars buys.

import {
  EraId, RunConfig, RunState, Ticker,
  INDEX_TICKER,
  advanceTo, buy, deathIndex, eraMonths, eraTickers, indexBaseline,
  newRun, seriesOf, wholeShares, worthAt,
} from "../tape/engine";
import { mulberry32 } from "../tape/headlines";
import { listingIndexOf } from "../floor/campaign";
import { ERA_NAME, companyName } from "../trigger/deal";
import { money } from "../trigger/format";

export { companyName };

// ------------------------------------------------------------- the levels

export type LevelId = 1 | 2 | 3;
export type DartTarget = "calendar" | "board";

export interface LevelSpec {
  id: LevelId;
  stocks: number | "all";   // how wide the choice is; "all" is the whole file
  eras: EraId[];            // one era, or the two a seed picks between
  windowMonths: number;     // months in the window, counted inclusively
  speed: number;            // market months per real second
  darts: number;            // darts per monkey
  target: DartTarget;       // what the troop throws at
  seconds: number;          // windowMonths / speed, the round length
  card: string;             // the level card line, copy table section 12
  proves: string;           // what the rank proves, section 3
}

export const MONKEYS = 10;
export const START_CASH = 1000;
export const ROUND_SECONDS = 60;
export const UNLOCK_AT = 5;

// The two crash windows level 2 picks between. Both are 30 months and both
// carry the fall and the recovery.
export const CRASH_WINDOWS: Record<string, { start: string; end: string }> = {
  gfc: { start: "2007-10", end: "2010-03" },
  covid: { start: "2019-10", end: "2022-03" },
};

// Level 1 needs a stock a thousand dollars buys at least five shares of.
export const LEVEL_ONE_MAX_PRICE = START_CASH / 5;

// Level 2 needs a stock the money can open a position in at all.
export const LEVEL_TWO_MAX_PRICE = START_CASH;

export const LEVELS: Record<LevelId, LevelSpec> = {
  1: {
    id: 1, stocks: 1, eras: ["covid"], windowMonths: 24, speed: 0.4, darts: 1,
    target: "calendar", seconds: ROUND_SECONDS,
    card: "Level 1. One stock.",
    proves: "When you got in mattered less than staying in",
  },
  2: {
    id: 2, stocks: 3, eras: ["gfc", "covid"], windowMonths: 30, speed: 0.5, darts: 2,
    target: "board", seconds: ROUND_SECONDS,
    card: "Level 2. Three stocks.",
    proves: "Crashes are survivable if you stay",
  },
  3: {
    id: 3, stocks: "all", eras: ["dotcom"], windowMonths: 36, speed: 0.6, darts: 3,
    target: "board", seconds: ROUND_SECONDS,
    card: "Level 3. Ten stocks.",
    proves: "Spreading beats picking",
  },
};

export const LEVEL_IDS: LevelId[] = [1, 2, 3];

export function levelOf(level: number): LevelSpec {
  const spec = LEVELS[level as LevelId];
  if (!spec) throw new Error(`no monkey level ${level}`);
  return spec;
}

// ------------------------------------------------------------------- the rng

// The engine's own mulberry32, so a seed means the same thing in every game on
// the tape. The level is mixed into the seed rather than kept beside it, so
// ?level=2&seed=7 is a different round from ?level=1&seed=7 instead of the
// same darts thrown at a different board.
export function roundRng(level: LevelId, seed: number): () => number {
  return mulberry32(((seed >>> 0) * 2654435761 + level * 40503) >>> 0);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1e9) + 1;
}

function pickIndex(rnd: () => number, length: number): number {
  return Math.min(length - 1, Math.floor(rnd() * length));
}

function pick<T>(rnd: () => number, list: T[]): T {
  return list[pickIndex(rnd, list.length)];
}

function shuffled<T>(rnd: () => number, list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ------------------------------------------------------------- the deal

export interface Monkey {
  index: number;                    // 1 to 10, the number the strip shows
  darts: number[];                  // wedge indices, or month offsets on level 1
  buyMonth: number;                 // run index the monkey buys at, 0 on board levels
  basket: Record<Ticker, number>;   // whole shares, by ticker
  cashLeft: number;                 // the remainder the whole-share rule left
}

export interface Deal {
  level: LevelId;
  seed: number;
  era: EraId;
  startIndex: number;               // era month index of the window open
  endIndex: number;                 // era month index of the window close, inclusive
  startMonth: string;
  endMonth: string;
  months: string[];                 // the window's months, in order
  tickers: Ticker[];                // the board, in wedge order
  dead: Ticker[];                   // companies that go to zero inside the window
  crashIndex: number | null;        // run index of the crash month, level 2 only
  guideIndex: number;               // which monkey speaks, always 1
  monkeys: Monkey[];
  target: DartTarget;
  speed: number;
  startCash: number;
}

// The guide is monkey one on every level and every seed. Nothing in the spec
// asks it to move, and a fixed guide means the strip can reserve its slot.
export const GUIDE_INDEX = 1;

// A company is on the board if it is listed, priced, and not already at zero
// when the window opens. The listing rule is The Floor's, computed rather than
// hardcoded, so a backfilled pre-IPO stretch can never be dealt as a stock.
function isOpenable(era: EraId, ticker: Ticker, startIndex: number): boolean {
  if (listingIndexOf(era, ticker) > startIndex) return false;
  const values = seriesOf(era, ticker);
  if (!(values[startIndex] > 0)) return false;
  const death = deathIndex(values);
  return death === null || death > startIndex;
}

function aliveThrough(era: EraId, ticker: Ticker, endIndex: number): boolean {
  const death = deathIndex(seriesOf(era, ticker));
  return death === null || death > endIndex;
}

// Companies that die between the window's open and its close. Level 3's lesson.
function deadInside(era: EraId, tickers: Ticker[], startIndex: number, endIndex: number): Ticker[] {
  return tickers.filter((t) => {
    const death = deathIndex(seriesOf(era, t));
    return death !== null && death > startIndex && death <= endIndex;
  });
}

// Level 1's pool: listed, alive through the window, and cheap enough that a
// thousand dollars buys five shares at the open.
function levelOnePool(era: EraId, startIndex: number, endIndex: number): Ticker[] {
  return eraTickers(era).filter((t) =>
    isOpenable(era, t, startIndex)
    && aliveThrough(era, t, endIndex)
    && seriesOf(era, t)[startIndex] <= LEVEL_ONE_MAX_PRICE);
}

// Level 2's pool: listed, buyable at the open, alive through the window, and
// carrying its own recovery. The last clause is the spec's promise made true
// of every wedge: "monkeys that sat through it recover". A wedge whose last
// close sits below its first one never recovered, and dealing it would make
// the level teach the opposite of what section 3 says it proves.
function levelTwoPool(era: EraId, startIndex: number, endIndex: number): Ticker[] {
  const buyable = eraTickers(era).filter((t) =>
    isOpenable(era, t, startIndex)
    && aliveThrough(era, t, endIndex)
    && seriesOf(era, t)[startIndex] <= LEVEL_TWO_MAX_PRICE);
  const recovered = buyable.filter((t) => {
    const values = seriesOf(era, t);
    return values[endIndex] >= values[startIndex];
  });
  return recovered.length >= 3 ? recovered : buyable;
}

// The crash month: the month the index falls hardest inside the window. It is
// computed rather than authored, which lands on October 2008 in the crash and
// March 2020 in the 2020s, the two months section 3 names.
export function crashIndexOf(era: EraId, startIndex: number, endIndex: number): number | null {
  const values = seriesOf(era, INDEX_TICKER);
  let worst = 1;
  let at: number | null = null;
  for (let i = startIndex; i < endIndex; i++) {
    if (!(values[i] > 0)) continue;
    const step = values[i + 1] / values[i];
    if (step < worst) {
      worst = step;
      at = i + 1 - startIndex;
    }
  }
  return at;
}

// Windows a level can open on, in era month indices.
function windowStarts(era: EraId, months: number): number[] {
  const out: number[] = [];
  const total = eraMonths(era).length;
  for (let s = 0; s + months <= total; s++) out.push(s);
  return out;
}

// How many dollars each monkey aims at each ticker. Two darts on one wedge
// double that stock's allotment, and the allotment is aggregated before any
// share is bought, so a doubled wedge buys one position rather than two.
export function allotmentOf(deal: Deal, monkey: Monkey): Record<Ticker, number> {
  const out: Record<Ticker, number> = {};
  for (const ticker of deal.tickers) out[ticker] = 0;
  const share = deal.startCash / monkey.darts.length;
  for (const dart of monkey.darts) {
    const ticker = deal.target === "calendar" ? deal.tickers[0] : deal.tickers[dart];
    out[ticker] += share;
  }
  return out;
}

// The opening buy, under the engine's own whole-share rule and in the board's
// wedge order, so it matches what monkeyRun() gets out of the engine exactly.
function basketFor(
  prices: Record<Ticker, number[]>, tickers: Ticker[],
  allot: Record<Ticker, number>, buyMonth: number, startCash: number,
): { basket: Record<Ticker, number>; cashLeft: number } {
  const basket: Record<Ticker, number> = {};
  let cash = startCash;
  for (const ticker of tickers) {
    const price = prices[ticker][buyMonth] ?? 0;
    const shares = wholeShares(cash, price, allot[ticker] ?? 0);
    basket[ticker] = shares;
    cash -= shares * price;
  }
  return { basket, cashLeft: cash };
}

// Level 1's ten buy months, at least six of them distinct. A plain draw over a
// 24 month window clears six distinct months in all but a vanishing fraction
// of seeds; the redraw makes acceptance test C true of every seed rather than
// almost all of them, and the forced fallback makes it true even if a future
// window is short enough for the redraw to keep missing.
const MIN_DISTINCT_MONTHS = 6;
const DRAW_ATTEMPTS = 32;

function calendarMonths(rnd: () => number, months: number): number[] {
  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt++) {
    const draw: number[] = [];
    for (let i = 0; i < MONKEYS; i++) draw.push(pickIndex(rnd, months));
    if (new Set(draw).size >= Math.min(MIN_DISTINCT_MONTHS, months)) return draw;
  }
  const spread = shuffled(rnd, range(months));
  const draw: number[] = [];
  for (let i = 0; i < MONKEYS; i++) {
    draw.push(i < spread.length ? spread[i] : pickIndex(rnd, months));
  }
  return draw;
}

function range(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}

export function dealRound(level: LevelId, seed: number): Deal {
  const spec = levelOf(level);
  const rnd = roundRng(level, seed);

  const era: EraId = spec.eras.length === 1 ? spec.eras[0] : pick(rnd, spec.eras);

  let startIndex: number;
  let endIndex: number;
  let tickers: Ticker[];

  if (level === 2) {
    const window = CRASH_WINDOWS[era];
    const months = eraMonths(era);
    startIndex = months.indexOf(window.start);
    endIndex = months.indexOf(window.end);
    const pool = levelTwoPool(era, startIndex, endIndex);
    tickers = shuffled(rnd, pool).slice(0, Math.min(spec.stocks as number, pool.length));
  } else if (level === 3) {
    const starts = windowStarts(era, spec.windowMonths);
    startIndex = pick(rnd, starts);
    endIndex = startIndex + spec.windowMonths - 1;
    tickers = eraTickers(era).filter((t) => isOpenable(era, t, startIndex));
  } else {
    const starts = windowStarts(era, spec.windowMonths)
      .filter((s) => levelOnePool(era, s, s + spec.windowMonths - 1).length > 0);
    startIndex = pick(rnd, starts);
    endIndex = startIndex + spec.windowMonths - 1;
    tickers = [pick(rnd, levelOnePool(era, startIndex, endIndex))];
  }

  const months = eraMonths(era).slice(startIndex, endIndex + 1);
  const prices: Record<Ticker, number[]> = {};
  for (const ticker of tickers) prices[ticker] = seriesOf(era, ticker).slice(startIndex, endIndex + 1);

  const deal: Deal = {
    level, seed, era, startIndex, endIndex,
    startMonth: months[0],
    endMonth: months[months.length - 1],
    months,
    tickers,
    dead: deadInside(era, tickers, startIndex, endIndex),
    crashIndex: level === 2 ? crashIndexOf(era, startIndex, endIndex) : null,
    guideIndex: GUIDE_INDEX,
    monkeys: [],
    target: spec.target,
    speed: spec.speed,
    startCash: START_CASH,
  };

  const calendar = spec.target === "calendar" ? calendarMonths(rnd, months.length) : null;

  for (let i = 0; i < MONKEYS; i++) {
    const darts: number[] = [];
    if (calendar) {
      darts.push(calendar[i]);
    } else {
      for (let d = 0; d < spec.darts; d++) darts.push(pickIndex(rnd, tickers.length));
    }
    const buyMonth = calendar ? calendar[i] : 0;
    const monkey: Monkey = { index: i + 1, darts, buyMonth, basket: {}, cashLeft: deal.startCash };
    const allot = allotmentOf(deal, monkey);
    const bought = basketFor(prices, tickers, allot, buyMonth, deal.startCash);
    monkey.basket = bought.basket;
    monkey.cashLeft = bought.cashLeft;
    deal.monkeys.push(monkey);
  }

  return deal;
}

// A deal read off the url, falling back a piece at a time so a half written
// link still plays. An unknown level plays level one.
export function dealFromParams(levelParam: string | null, seedParam: string | null): Deal {
  const asLevel = Number(levelParam);
  const level: LevelId = LEVEL_IDS.includes(asLevel as LevelId) ? (asLevel as LevelId) : 1;
  const asSeed = seedParam === null ? NaN : Number(seedParam);
  const seed = Number.isFinite(asSeed) && asSeed > 0 ? Math.floor(asSeed) : randomSeed();
  return dealRound(level, seed);
}

// -------------------------------------------------------------- the run

export function runConfigFor(deal: Deal): RunConfig {
  return {
    era: deal.era,
    tickers: [...deal.tickers],
    startCash: deal.startCash,
    speed: deal.speed,
    startMonth: deal.startMonth,
    endMonth: deal.endMonth,
  };
}

export function newPlayerRun(deal: Deal): RunState {
  return newRun(runConfigFor(deal));
}

export function lastMonthIndex(deal: Deal): number {
  return deal.months.length - 1;
}

// A monkey's run, played through the engine rather than summed here: open the
// same window, wait for its buy month, spend its allotment wedge by wedge with
// the engine's own buy(), then never trade again. Acceptance test B holds this
// against a zero-trade run built from the same basket.
export function monkeyRun(deal: Deal, monkey: Monkey): RunState {
  let run = newPlayerRun(deal);
  if (monkey.buyMonth > 0) run = advanceTo(run, monkey.buyMonth);
  const allot = allotmentOf(deal, monkey);
  for (const ticker of deal.tickers) {
    if ((allot[ticker] ?? 0) > 0) run = buy(run, ticker, allot[ticker]);
  }
  return run;
}

// Building ten runs a frame would be wasteful, and nothing about a deal ever
// changes after it is dealt, so the runs are memoised against the deal and the
// monkey object rather than its number: a harness can hand this a monkey it
// built itself and still get that monkey's run back.
const RUN_CACHE = new WeakMap<Deal, Map<Monkey, RunState>>();

function runOf(deal: Deal, monkey: Monkey): RunState {
  let byMonkey = RUN_CACHE.get(deal);
  if (!byMonkey) {
    byMonkey = new Map<Monkey, RunState>();
    RUN_CACHE.set(deal, byMonkey);
  }
  const hit = byMonkey.get(monkey);
  if (hit) return hit;
  const run = monkeyRun(deal, monkey);
  byMonkey.set(monkey, run);
  return run;
}

// A monkey is worth its thousand dollars in cash until its buy month, and its
// basket after it. On levels 2 and 3 the buy month is the window's open, so the
// first clause never fires.
export function monkeyWorthAt(deal: Deal, monkey: Monkey, t: number): number {
  if (t < monkey.buyMonth) return deal.startCash;
  return worthAt(runOf(deal, monkey), t);
}

// The worth at every month boundary in the window, for the strip and the chart.
export function monkeyWorthPath(deal: Deal, monkey: Monkey): number[] {
  const out: number[] = [];
  for (let i = 0; i <= lastMonthIndex(deal); i++) out.push(monkeyWorthAt(deal, monkey, i));
  return out;
}

export function monkeyWorths(deal: Deal, t: number): number[] {
  return deal.monkeys.map((m) => monkeyWorthAt(deal, m, t));
}

export function monkeyFinalWorth(deal: Deal, monkey: Monkey): number {
  return monkeyWorthAt(deal, monkey, lastMonthIndex(deal));
}

// The one muted line on the end card. The same dollars in the index over the
// same months, straight off the engine.
export function indexWorth(deal: Deal): number {
  return indexBaseline(newPlayerRun(deal));
}

// ------------------------------------------------------------------ the rank

export interface RankSlot {
  who: "you" | number;      // the monkey's number, or you
  worth: number;
}

export interface Rank {
  beaten: number;           // monkeys strictly below you
  order: RankSlot[];        // largest worth first, ties to the monkey
}

// Worth compared to the cent, never to the raw float. A monkey that holds
// whole shares bought with exactly $1,000 accumulates float dust (say
// 999.9999999999999) that a raw compare would read as behind a player worth
// exactly 1000, when the two are the same dollar and cent and the tie is the
// monkey's by rule. Rounding both sides the same way before comparing is what
// keeps a fresh round's header reading "you beat 0 of 10" instead of "1 of 10".
function cents(worth: number): number {
  return Math.round(worth * 100);
}

export function rank(playerWorth: number, worths: number[]): Rank {
  const order: RankSlot[] = worths.map((worth, i) => ({ who: i + 1, worth } as RankSlot));
  order.push({ who: "you", worth: playerWorth });
  order.sort((a, b) => {
    const ca = cents(a.worth);
    const cb = cents(b.worth);
    if (cb !== ca) return cb - ca;
    if (a.who === "you") return 1;      // ties go to the monkey
    if (b.who === "you") return -1;
    return (a.who as number) - (b.who as number);   // monkeys tied on each other, by index
  });
  const playerCents = cents(playerWorth);
  return { beaten: worths.filter((w) => cents(w) < playerCents).length, order };
}

export function rankAt(deal: Deal, playerWorth: number, t: number): Rank {
  return rank(playerWorth, monkeyWorths(deal, t));
}

export function bestMonkey(deal: Deal): Monkey {
  return [...deal.monkeys].sort((a, b) => {
    const diff = cents(monkeyFinalWorth(deal, b)) - cents(monkeyFinalWorth(deal, a));
    return diff !== 0 ? diff : a.index - b.index;
  })[0];
}

export function worstMonkey(deal: Deal): Monkey {
  return [...deal.monkeys].sort((a, b) => {
    const diff = cents(monkeyFinalWorth(deal, a)) - cents(monkeyFinalWorth(deal, b));
    return diff !== 0 ? diff : a.index - b.index;
  })[0];
}

// --------------------------------------------------------------- the save

export const BEST_KEY = "monkey-best";
export const PROGRESS_KEY = "monkey-progress";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// The best rank each level has ever returned, keyed by level number.
export function readBest(): Record<string, number> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(BEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const level of LEVEL_IDS) {
      const value = Number(parsed?.[String(level)]);
      if (Number.isFinite(value) && value > 0) out[String(level)] = Math.floor(value);
    }
    return out;
  } catch {
    return {};
  }
}

export function bestFor(level: LevelId): number {
  return readBest()[String(level)] ?? 0;
}

// Unlocked levels are derived from the best ranks as well as read from the
// progress key, so a cleared or corrupt progress key cannot take back a level
// the player has already earned.
function unlockedFrom(best: Record<string, number>, stored: LevelId[]): LevelId[] {
  const open = new Set<LevelId>([1]);
  for (const level of stored) if (LEVEL_IDS.includes(level)) open.add(level);
  for (const level of LEVEL_IDS) {
    if ((best[String(level)] ?? 0) >= UNLOCK_AT) {
      const next = (level + 1) as LevelId;
      if (LEVEL_IDS.includes(next)) open.add(next);
    }
  }
  return LEVEL_IDS.filter((l) => open.has(l));
}

function storedProgress(): LevelId[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => Number(v)).filter((v): v is LevelId => LEVEL_IDS.includes(v as LevelId));
  } catch {
    return [];
  }
}

export function readUnlocked(): LevelId[] {
  return unlockedFrom(readBest(), storedProgress());
}

export function isUnlocked(level: LevelId): boolean {
  return readUnlocked().includes(level);
}

export interface Saved {
  best: number;
  unlocked: LevelId[];
}

// Called once at the end of a round with how many monkeys the player beat.
export function recordRound(level: LevelId, beaten: number): Saved {
  const best = readBest();
  const was = best[String(level)] ?? 0;
  const now = Math.max(was, Math.max(0, Math.floor(beaten)));
  best[String(level)] = now;
  const unlocked = unlockedFrom(best, storedProgress());
  const store = storage();
  if (store) {
    try {
      store.setItem(BEST_KEY, JSON.stringify(best));
      store.setItem(PROGRESS_KEY, JSON.stringify(unlocked));
    } catch {
      // a blocked or full store never costs the player the round they just played
    }
  }
  return { best: now, unlocked };
}

export function clearSave(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(BEST_KEY);
    store.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------ the words

// "Month 14 of 24". One based, so the round opens on month one and never on a
// month zero nobody counts from.
export function clockLabel(deal: Deal, t: number): string {
  const total = deal.months.length;
  const at = Math.min(total, Math.max(1, Math.floor(t) + 1));
  return `Month ${at} of ${total}`;
}

export interface AxisTick {
  at: number;       // run index
  label: string;
}

// Months into the round, the labels the chart carries while the year is hidden.
export function monthTicks(deal: Deal, step = 6): AxisTick[] {
  const out: AxisTick[] = [];
  for (let month = step; month <= deal.months.length; month += step) {
    out.push({ at: month - 1, label: String(month) });
  }
  return out;
}

// Real years, for the end card's redrawn chart only.
export function yearTicks(deal: Deal): AxisTick[] {
  const out: AxisTick[] = [];
  const seen = new Set<string>();
  deal.months.forEach((month, i) => {
    const year = month.slice(0, 4);
    if (seen.has(year)) return;
    seen.add(year);
    out.push({ at: i, label: year });
  });
  return out;
}

export function yearsOf(deal: Deal): { from: string; to: string } {
  return { from: deal.startMonth.slice(0, 4), to: deal.endMonth.slice(0, 4) };
}

// "That was the dot-com bust, 2000 to 2003."
export function eraRevealText(deal: Deal): string {
  const years = yearsOf(deal);
  return `That was ${ERA_NAME[deal.era]}, ${years.from} to ${years.to}.`;
}

// "Apple", "Apple and Amazon", "Apple, Amazon and Cisco".
export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function basketNames(deal: Deal, monkey: Monkey): string[] {
  return deal.tickers.filter((t) => (monkey.basket[t] ?? 0) > 0).map(companyName);
}

// "Monkey 4 sat on Apple and Amazon: $1,391." on a board level, and
// "Monkey 4 bought in month 9: $1,391." on the calendar level.
export function monkeyLine(deal: Deal, monkey: Monkey, worth: number): string {
  const dollars = money(worth);
  if (deal.target === "calendar") {
    return `Monkey ${monkey.index} bought in month ${monkey.buyMonth + 1}: ${dollars}.`;
  }
  const names = basketNames(deal, monkey);
  if (names.length === 0) return `Monkey ${monkey.index} sat in cash: ${dollars}.`;
  return `Monkey ${monkey.index} sat on ${joinNames(names)}: ${dollars}.`;
}

// "eToys went to zero."
export function deadLine(ticker: Ticker): string {
  return `${companyName(ticker)} went to zero.`;
}

export function beatenLine(beaten: number): string {
  return `you beat ${beaten} of ${MONKEYS}`;
}

export function endLead(beaten: number): string {
  return `You beat ${beaten} of ${MONKEYS} monkeys.`;
}

export function youLine(worth: number): string {
  return `You: ${money(worth)}`;
}

export function indexLine(worth: number): string {
  return `An index fund: ${money(worth)}.`;
}

export function levelLocked(): string {
  return "Beat five monkeys to open this";
}
