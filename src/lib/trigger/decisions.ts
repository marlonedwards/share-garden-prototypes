// End card arithmetic the shared engine does not owe either game: how much
// each single decision was worth, and how long you were actually in.
//
// "The dollar delta between a trade and the alternative of not trading that
// month" is measured to your next decision, because that is where the two
// stories stop being comparable: after the next trade both paths are holding
// the same thing again.
//
//   a buy   you put value V into shares at p and the price is q at the next
//           decision, so the trade earned V * (q / p - 1) against the cash
//           you would still be sitting on
//   a sell  you took V in cash out at p, and the shares you no longer own are
//           worth n * q at the next decision, so the trade earned V - n * q
//
// Both reduce to the same sentence: shares times the move you took or missed.

import type { RunState, Ticker, Trade } from "../tape/engine";
import { lastIndex, priceAt } from "../tape/engine";

export interface Decision {
  trade: Trade;
  until: number;      // the fractional month the comparison runs to
  delta: number;      // dollars the trade won, or lost when negative
}

export function decisionsOf(run: RunState, ticker: Ticker): Decision[] {
  const end = lastIndex(run);
  return run.trades.map((trade, i) => {
    const until = i + 1 < run.trades.length ? run.trades[i + 1].at : end;
    const q = priceAt(run, ticker, until);
    const move = q - trade.price;
    const delta = trade.kind === "buy" ? trade.shares * move : -trade.shares * move;
    return { trade, until, delta };
  });
}

export function bestDecision(list: Decision[]): Decision | null {
  return list.reduce<Decision | null>((best, d) => (best === null || d.delta > best.delta ? d : best), null);
}

export function worstDecision(list: Decision[]): Decision | null {
  return list.reduce<Decision | null>((worst, d) => (worst === null || d.delta < worst.delta ? d : worst), null);
}

// Months holding anything, in fractional months, from the trade log alone.
export function monthsInMarket(run: RunState, ticker: Ticker): number {
  const end = lastIndex(run);
  let held = 0;
  let openedAt: number | null = null;
  for (const trade of run.trades) {
    if (trade.kind === "buy" && openedAt === null) openedAt = trade.at;
    if (trade.kind === "sell" && openedAt !== null) {
      held += trade.at - openedAt;
      openedAt = null;
    }
  }
  if (openedAt !== null) held += end - openedAt;
  return held;
}

export interface Span {
  from: number;
  to: number;
  kind: "in" | "out";
}

// In and out bands for the end card chart, covering the whole run with no gaps.
export function spansOf(run: RunState): Span[] {
  const end = lastIndex(run);
  const out: Span[] = [];
  let at = 0;
  let inMarket = false;
  for (const trade of run.trades) {
    const wantIn = trade.kind === "buy";
    if (wantIn === inMarket) continue;
    if (trade.at > at) out.push({ from: at, to: trade.at, kind: inMarket ? "in" : "out" });
    at = trade.at;
    inMarket = wantIn;
  }
  if (end > at) out.push({ from: at, to: end, kind: inMarket ? "in" : "out" });
  return out;
}
