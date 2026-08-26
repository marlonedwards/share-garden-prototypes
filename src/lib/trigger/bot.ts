// The bot: a run played by a user-written function instead of the space bar.
// Contract: docs/trigger-spec.md section 10.
//
// The source is compiled once per run with new Function, with the two helpers
// in scope under the snake_case names the scaffold advertises. The bot is
// called once per market month, the game's unit of time, with the monthly
// closes so far, and answers with one action: { buy: n }, positive to buy n
// shares, negative to sell n. Fractional shares are allowed here, unlike the
// space bar, because a bot held to whole shares would spend its whole line
// count on rounding.
//
// A wrong action stops the run rather than being corrected. The bot is the
// player, and a player the game silently fixes is not being judged.

import type { RunState, Ticker, Trade } from "../tape/engine";
import { worthAt } from "../tape/engine";
import { price as fmtPrice } from "./format";

export type BotFn = (prices: number[], shares: number, cash: number) => unknown;

// What the editor opens with: the contract in comments and a bot that buys
// and sells at random, so the first Run bot always produces a full run.
export const BOT_SCAFFOLD = `// Your bot plays the run one month at a time.
//
//   prices  every monthly price so far; prices[prices.length - 1] is this month's
//   shares  what you hold right now, fractional shares allowed
//   cash    what you have left to spend
//
// Return an action { buy: n }:
//   n > 0 buys n shares, n < 0 sells n shares, 0 does nothing.
// Buying more than cash covers, or selling more than you hold, stops the run.
//
// Helpers already in scope:
//   max_shares_can_buy(prices, shares, cash)   the most you can buy this month
//   max_shares_can_sell(prices, shares, cash)  the most you can sell this month

function bot(prices, shares, cash) {
  if (Math.random() < 0.5) {
    return { buy: Math.random() * max_shares_can_buy(prices, shares, cash) };
  }
  return { buy: -Math.random() * max_shares_can_sell(prices, shares, cash) };
}
`;

// Float slop only, the engine's own posture: a bot that asks for exactly
// max_shares_can_buy must never die to the last binary digit.
const SLOP = 1e-9;
// Below this an action is a hold, so float noise never draws a trade dot.
const HOLD = 1e-9;

export function maxSharesCanBuy(prices: number[], shares: number, cash: number): number {
  void shares;
  const p = prices[prices.length - 1];
  return p > 0 && cash > 0 ? cash / p : 0;
}

export function maxSharesCanSell(prices: number[], shares: number, cash: number): number {
  void prices;
  void cash;
  return shares > 0 ? shares : 0;
}

// Compile the source and hand back the bot with the helpers closed over. The
// three ways this fails are told apart, because "your code does not parse" and
// "you never defined bot" send the author to different lines.
export function compileBot(source: string): { bot: BotFn } | { error: string } {
  let factory: (buyMax: typeof maxSharesCanBuy, sellMax: typeof maxSharesCanSell) => unknown;
  try {
    factory = new Function(
      "max_shares_can_buy",
      "max_shares_can_sell",
      `"use strict";\n${source}\n;return typeof bot === "function" ? bot : null;`,
    ) as typeof factory;
  } catch (e) {
    return { error: `the code does not parse: ${(e as Error).message}` };
  }
  let bot: unknown;
  try {
    bot = factory(maxSharesCanBuy, maxSharesCanSell);
  } catch (e) {
    return { error: `the code throws while loading: ${(e as Error).message}` };
  }
  if (typeof bot !== "function") {
    return { error: "define a function named bot(prices, shares, cash)" };
  }
  return { bot: bot as BotFn };
}

function describe(v: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(v) ?? String(v);
  } catch {
    s = String(v);
  }
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function fmtShares(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// One month of the bot's run: ask it for an action against the closes up to
// `month` and apply that action at that month's close. An error is a verdict,
// not an exception: the caller stops the run and puts the sentence on screen.
export function botAct(
  run: RunState, ticker: Ticker, bot: BotFn, month: number,
): { run: RunState } | { error: string } {
  const prices = run.prices[ticker].slice(0, month + 1);
  const shares = run.holdings[ticker] ?? 0;
  const cash = run.cash;

  let action: unknown;
  try {
    action = bot(prices, shares, cash);
  } catch (e) {
    return { error: `the bot threw: ${(e as Error)?.message ?? String(e)}` };
  }
  const n = (action as { buy?: unknown } | null)?.buy;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return { error: `the bot returned ${describe(action)}; an action is { buy: number }` };
  }
  if (Math.abs(n) < HOLD) return { run };

  const price = prices[month];
  if (n > 0) {
    if (!(price > 0)) {
      return { error: `the bot bought ${fmtShares(n)} shares of a stock priced at zero` };
    }
    const max = cash / price;
    if (n > max + SLOP * Math.max(1, max)) {
      return {
        error: `the bot bought ${fmtShares(n)} shares at ${fmtPrice(price)} with `
          + `${fmtPrice(cash)} cash; that covers at most ${fmtShares(max)}`,
      };
    }
    return { run: applyTrade(run, ticker, "buy", Math.min(n, max), price, month) };
  }

  const want = -n;
  if (want > shares + SLOP * Math.max(1, shares)) {
    return { error: `the bot sold ${fmtShares(want)} shares while holding ${fmtShares(shares)}` };
  }
  return { run: applyTrade(run, ticker, "sell", Math.min(want, shares), price, month) };
}

// The engine's buy() and sell() speak whole shares, so the fractional trade is
// applied here, with the same bookkeeping: cash and holdings move together and
// the trade lands in the log the chart and the end card already read.
function applyTrade(
  run: RunState, ticker: Ticker, kind: "buy" | "sell", shares: number, price: number, month: number,
): RunState {
  const moved = shares * price;
  const cash = Math.max(0, kind === "buy" ? run.cash - moved : run.cash + moved);
  const held = run.holdings[ticker] ?? 0;
  const holdings = {
    ...run.holdings,
    [ticker]: Math.max(0, kind === "buy" ? held + shares : held - shares),
  };
  const next: RunState = { ...run, cash, holdings };
  const trade: Trade = {
    kind, ticker, shares, price,
    at: month,
    month: run.months[month],
    cash,
    worth: worthAt(next, month),
  };
  return { ...next, trades: [...run.trades, trade] };
}
