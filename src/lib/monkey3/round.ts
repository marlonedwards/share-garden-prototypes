// Monkey Trade v3: the hand, the monkey, the moment, the summary.
// Contract: docs/monkey-spec-v3.md. Pure TypeScript over the tape engine;
// the page owns the clock, this file owns every rule a walk can assert.

import type { EraId, RunConfig, RunState, Ticker, Trade } from "../tape/engine";
import {
  eraMonths, loadEra, newRun, priceAt, sell, wholeShares, worthAt,
} from "../tape/engine";
import { mulberry32 } from "../tape/headlines";

export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];

export const START_CASH = 1000;
export const WINDOW_MONTHS = 12;          // 12 month steps, 13 closes
export const SPEED = 0.5;                 // months per second, 24s a hand
export const PRICE_MIN = 2;               // opening price band, both ends
export const PRICE_MAX = 150;
export const BUY_CHUNK = 250;             // levels 2 and 3 buy budget
export const WINDFALL = 200;
export const BILL = 150;
export const HANDS_PER_SUMMARY = 5;

// Equities only. Crypto is coins wall to wall and TLT is a bond fund; the
// sampler never deals what the spec's scope excludes.
export const HAND_ERAS: EraId[] = ["dotcom", "gfc", "covid", "inflation"];
export const EXCLUDED_TICKERS = new Set<Ticker>(["TLT"]);

export function deskSizeOf(level: Level): number {
  return level === 1 ? 1 : level === 2 ? 3 : 10;
}

// Minimum eligible stocks a window must hold to host the level. Level 3
// deals every eligible stock up to ten and needs at least eight.
export function deskFloorOf(level: Level): number {
  return level === 1 ? 1 : level === 2 ? 3 : 8;
}

export interface Moment {
  month: number;                  // integer month the tape pauses on
  kind: "windfall" | "bill";
  amount: number;
}

export interface MonkeyPlan {
  ticker: Ticker;
  entryMonth: number;             // level 1: seeded 0..11, otherwise 0
}

export interface Hand {
  level: Level;
  seed: number;
  era: EraId;
  startIndex: number;             // era month index of the window start
  startMonth: string;
  endMonth: string;
  tickers: Ticker[];
  monkey: MonkeyPlan;
  moment: Moment;
}

// ------------------------------------------------------------- the sampler

export function windowKey(era: EraId, startIndex: number): string {
  return `${era}:${startIndex}`;
}

// Opening price inside the band, at the window's first month, alive.
export function eligibleAt(era: EraId, startIndex: number): Ticker[] {
  const data = loadEra(era);
  const out: Ticker[] = [];
  for (const t of Object.keys(data.series)) {
    if (t === "^SP500TR" || EXCLUDED_TICKERS.has(t)) continue;
    const v = data.series[t][startIndex];
    const open = v === null || !Number.isFinite(v) ? 0 : (v as number);
    if (open >= PRICE_MIN && open <= PRICE_MAX) out.push(t);
  }
  return out;
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

// Deal a hand: era and window seeded, no window repeated in a session,
// desk drawn from the eligible stocks, monkey and moment seeded with it.
export function dealHand(level: Level, seed: number, used: Set<string>): Hand {
  const rng = mulberry32(seed);
  // Two passes: fresh windows first, and when a long session has drunk the
  // pool dry (level 3 has under a hundred hostable windows), repeats beat
  // no deal at all.
  for (let attempt = 0; attempt < 800; attempt++) {
    const era = HAND_ERAS[Math.floor(rng() * HAND_ERAS.length)];
    const months = eraMonths(era);
    const startIndex = Math.floor(rng() * (months.length - WINDOW_MONTHS));
    const key = windowKey(era, startIndex);
    if (attempt < 400 && used.has(key)) continue;
    const eligible = eligibleAt(era, startIndex);
    if (eligible.length < deskFloorOf(level)) continue;
    const tickers = shuffled(eligible, rng).slice(0, deskSizeOf(level));
    const monkey: MonkeyPlan =
      level === 1
        ? { ticker: tickers[0], entryMonth: Math.floor(rng() * WINDOW_MONTHS) }
        : { ticker: tickers[Math.floor(rng() * tickers.length)], entryMonth: 0 };
    const moment: Moment =
      level === 1
        ? { month: 3 + Math.floor(rng() * 6), kind: "windfall", amount: WINDFALL }
        : { month: 3 + Math.floor(rng() * 6), kind: "bill", amount: BILL };
    return {
      level, seed, era, startIndex,
      startMonth: months[startIndex],
      endMonth: months[startIndex + WINDOW_MONTHS],
      tickers, monkey, moment,
    };
  }
  throw new Error("no dealable window");
}

export function runConfigFor(hand: Hand): RunConfig {
  return {
    era: hand.era,
    tickers: hand.tickers,
    startCash: START_CASH,
    speed: SPEED,
    startMonth: hand.startMonth,
    endMonth: hand.endMonth,
  };
}

export function newHandRun(hand: Hand): RunState {
  return newRun(runConfigFor(hand));
}

// --------------------------------------------------- the player's moment

// The windfall lands as cash; "put it in" is an ordinary buy the page makes
// right after. External flows never pass through the trade log.
export function grantWindfall(run: RunState): RunState {
  return { ...run, cash: run.cash + WINDFALL };
}

// Pay the bill from cash, or sell just enough whole shares first, largest
// position down, at the live price. Cash may go below zero only when the
// desk is worth less than the bill, which is the hand telling the truth.
export function payBill(run: RunState, fromCash: boolean): RunState {
  let next = run;
  if (!fromCash || next.cash < BILL) {
    const order = [...next.tickers].sort(
      (a, b) => (next.holdings[b] ?? 0) * priceAt(next, b) - (next.holdings[a] ?? 0) * priceAt(next, a),
    );
    for (const t of order) {
      if (next.cash >= BILL) break;
      const price = priceAt(next, t);
      const held = next.holdings[t] ?? 0;
      if (!(price > 0) || held <= 0) continue;
      const need = Math.min(held, Math.ceil((BILL - next.cash) / price));
      next = sell(next, t, need);
    }
  }
  return { ...next, cash: next.cash - BILL };
}

// ------------------------------------------------------------- the monkey

// The monkey replayed as month-by-month state, whole shares, same flows.
// Windfalls go in, bills sell just enough: the dealer's fixed rule.
interface MonkeyStep { cash: number; shares: number }

function monkeySteps(hand: Hand, prices: number[]): MonkeyStep[] {
  const steps: MonkeyStep[] = [];
  let cash = START_CASH;
  let shares = 0;
  for (let m = 0; m <= WINDOW_MONTHS; m++) {
    const p = prices[m];
    if (m === hand.monkey.entryMonth && p > 0) {
      const n = wholeShares(cash, p);
      shares += n;
      cash -= n * p;
    }
    if (m === hand.moment.month) {
      if (hand.moment.kind === "windfall") {
        cash += WINDFALL;
        if (m >= hand.monkey.entryMonth && p > 0) {
          const n = wholeShares(cash, p);
          shares += n;
          cash -= n * p;
        }
      } else {
        if (cash < BILL && p > 0) {
          const need = Math.min(shares, Math.ceil((BILL - cash) / p));
          shares -= need;
          cash += need * p;
        }
        cash -= BILL;
      }
    }
    steps.push({ cash, shares });
  }
  return steps;
}

// Smoothstep between closes, the same easing the engine draws with.
function smoothPrice(prices: number[], t: number): number {
  const last = prices.length - 1;
  const tt = t < 0 ? 0 : t > last ? last : t;
  const m = Math.floor(tt);
  if (m >= last) return prices[last];
  const f = tt - m;
  const s = f * f * (3 - 2 * f);
  return prices[m] + (prices[m + 1] - prices[m]) * s;
}

export function monkeyPrices(hand: Hand): number[] {
  const data = loadEra(hand.era);
  const raw = data.series[hand.monkey.ticker];
  return raw
    .slice(hand.startIndex, hand.startIndex + WINDOW_MONTHS + 1)
    .map((v) => (v === null || !Number.isFinite(v) ? 0 : (v as number)));
}

export function monkeyWorthAt(hand: Hand, t: number): number {
  const prices = monkeyPrices(hand);
  const steps = monkeySteps(hand, prices);
  const m = Math.max(0, Math.min(WINDOW_MONTHS, Math.floor(t)));
  const s = steps[m];
  return s.cash + s.shares * smoothPrice(prices, t);
}

export function monkeyFinalWorth(hand: Hand): number {
  return monkeyWorthAt(hand, WINDOW_MONTHS);
}

// -------------------------------------------------------- the riding line

// Equal split across the desk at month one, held. Windfalls sit as cash,
// bills are paid the monkey's way. The stable third comparator.
export function ridingLine(hand: Hand): number {
  const data = loadEra(hand.era);
  const slice = (t: Ticker) =>
    data.series[t]
      .slice(hand.startIndex, hand.startIndex + WINDOW_MONTHS + 1)
      .map((v) => (v === null || !Number.isFinite(v) ? 0 : (v as number)));
  const series = hand.tickers.map(slice);
  let cash = START_CASH;
  const shares = series.map(() => 0);
  const budget = START_CASH / hand.tickers.length;
  series.forEach((p, i) => {
    if (!(p[0] > 0)) return;
    const n = wholeShares(cash, p[0], budget);
    shares[i] = n;
    cash -= n * p[0];
  });
  const m = hand.moment.month;
  if (hand.moment.kind === "windfall") cash += WINDFALL;
  else {
    const order = series
      .map((p, i) => i)
      .sort((a, b) => shares[b] * series[b][m] - shares[a] * series[a][m]);
    for (const i of order) {
      if (cash >= BILL) break;
      const p = series[i][m];
      if (!(p > 0) || shares[i] <= 0) continue;
      const need = Math.min(shares[i], Math.ceil((BILL - cash) / p));
      shares[i] -= need;
      cash += need * p;
    }
    cash -= BILL;
  }
  return cash + series.reduce((sum, p, i) => sum + shares[i] * p[WINDOW_MONTHS], 0);
}

// ------------------------------------------------------------- the result

export interface HandResult {
  level: Level;
  seed: number;
  era: EraId;
  startMonth: string;
  endMonth: string;
  tickers: Ticker[];
  monkeyTicker: Ticker;
  monkeyEntry: number;
  you: number;
  monkey: number;
  riding: number;
  win: boolean;                   // strictly better; a tie is not a win
  trades: Trade[];
  prices: Record<Ticker, number[]>;   // the window's closes, for the bullets
  finalHoldings: Record<Ticker, number>;
}

export function settleHand(hand: Hand, run: RunState): HandResult {
  const you = worthAt(run, WINDOW_MONTHS);
  const monkey = monkeyFinalWorth(hand);
  const prices: Record<Ticker, number[]> = {};
  for (const t of hand.tickers) prices[t] = run.prices[t];
  return {
    level: hand.level,
    seed: hand.seed,
    era: hand.era,
    startMonth: hand.startMonth,
    endMonth: hand.endMonth,
    tickers: hand.tickers,
    monkeyTicker: hand.monkey.ticker,
    monkeyEntry: hand.monkey.entryMonth,
    you: Math.round(you),
    monkey: Math.round(monkey),
    riding: Math.round(ridingLine(hand)),
    win: Math.round(you) > Math.round(monkey),
    trades: [...run.trades],
    prices,
    finalHoldings: { ...run.holdings },
  };
}

// ------------------------------------------------------------ the bullets

// Three phrases with dollar figures, rule pool by priority, fallbacks that
// always compute. No fees exist, so every figure is realized arithmetic.
const FIRES_AT = 10;

function endPrice(r: HandResult, t: Ticker): number {
  const p = r.prices[t];
  return p ? p[p.length - 1] : 0;
}

function sellsGaveUp(results: HandResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades)
      if (tr.kind === "sell") sum += tr.shares * (endPrice(r, tr.ticker) - tr.price);
  return Math.round(sum);
}

function panicCost(results: HandResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades) {
      if (tr.kind !== "sell") continue;
      const m = Math.floor(tr.at);
      const p = r.prices[tr.ticker];
      if (!p || m < 1 || !(p[m - 1] > 0)) continue;
      if (p[m] / p[m - 1] - 1 <= -0.06)
        sum += tr.shares * (endPrice(r, tr.ticker) - tr.price);
    }
  return Math.round(sum);
}

function peakCost(results: HandResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades) {
      if (tr.kind !== "buy") continue;
      const p = r.prices[tr.ticker];
      if (!p) continue;
      if (tr.price >= 0.95 * Math.max(...p))
        sum += tr.shares * (tr.price - endPrice(r, tr.ticker));
    }
  return Math.round(sum);
}

function concentrationGap(results: HandResult[]): number {
  let gap = 0;
  for (const r of results) {
    if (r.level === 1) continue;
    const values = r.tickers.map((t) => (r.finalHoldings[t] ?? 0) * endPrice(r, t));
    const total = values.reduce((a, b) => a + b, 0);
    if (total > 0 && Math.max(...values) >= 0.8 * r.you && r.riding > r.you)
      gap += r.riding - r.you;
  }
  return Math.round(gap);
}

function satOutGap(results: HandResult[]): number {
  let gap = 0;
  for (const r of results)
    if (!r.trades.some((t) => t.kind === "buy") && r.riding > r.you) gap += r.riding - r.you;
  return Math.round(gap);
}

function bestTrade(results: HandResult[]): number {
  let best = 0;
  for (const r of results)
    for (const tr of r.trades)
      if (tr.kind === "buy")
        best = Math.max(best, tr.shares * (endPrice(r, tr.ticker) - tr.price));
  return Math.round(best);
}

export function bulletsFor(results: HandResult[]): string[] {
  const out: string[] = [];
  const sells = sellsGaveUp(results);
  const panic = panicCost(results);
  const peak = peakCost(results);
  const conc = concentrationGap(results);
  const sat = satOutGap(results);
  if (sells >= FIRES_AT) out.push(`Your sells gave up $${sells} against holding to the settle.`);
  else if (sells <= -FIRES_AT) out.push(`Your sells dodged $${-sells} of losses.`);
  if (panic >= FIRES_AT) out.push(`Selling right after drops cost $${panic}.`);
  if (peak >= FIRES_AT) out.push(`Buying near the top cost $${peak}.`);
  if (conc >= FIRES_AT) out.push(`Riding one stock left $${conc} on the table against spreading out.`);
  if (sat >= FIRES_AT) out.push(`Sitting in cash gave up $${sat}.`);
  // fallbacks, always computable
  const you = results.reduce((a, r) => a + r.you, 0);
  const monkey = results.reduce((a, r) => a + r.monkey, 0);
  const riding = results.reduce((a, r) => a + r.riding, 0);
  if (out.length < 3)
    out.push(
      riding > you
        ? `Riding everything untouched would have finished $${riding - you} ahead of you.`
        : `You finished $${you - riding} ahead of just riding everything.`,
    );
  if (out.length < 3)
    out.push(
      monkey > you
        ? `The monkey's ${results.length} hands made $${monkey - you} more than yours.`
        : `Your ${results.length} hands made $${you - monkey} more than the monkey's.`,
    );
  if (out.length < 3) {
    const best = bestTrade(results);
    out.push(best > 0 ? `Your best buy grew $${best} by the settle.` : `No buy of yours grew by the settle.`);
  }
  return out.slice(0, 3);
}

// ------------------------------------------------------------ persistence

export interface Progress {
  unlocked: Level;
  wins: number;
  hands: number;
  streak: number;
}

const KEY = "monkey3-progress";

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p && p.unlocked >= 1) return p;
    }
  } catch {
    // fresh start
  }
  return { unlocked: 1, wins: 0, hands: 0, streak: 0 };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage may be unavailable; the session still plays
  }
}

export function afterHand(p: Progress, result: HandResult): Progress {
  return {
    ...p,
    hands: p.hands + 1,
    wins: p.wins + (result.win ? 1 : 0),
    streak: result.win ? p.streak + 1 : result.you === result.monkey ? p.streak : 0,
  };
}

// Finishing a level's summary opens the next level. Never the win count.
export function afterSummary(p: Progress, level: Level): Progress {
  const next = Math.min(3, level + 1) as Level;
  return { ...p, unlocked: next > p.unlocked ? next : p.unlocked };
}
