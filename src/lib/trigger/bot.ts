// The bot law: how a run played by a user-written function instead of the
// space bar is compiled and judged. Contract: docs/trigger-spec.md section
// 10. The scaffold the editor opens with lives next door in bots/, one bot
// per file, assembled by bots/index.ts.
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
// "you never picked a bot" send the author to different lines.
//
// The wrapper is deliberately sloppy mode: the scaffold picks its player with
// a bare `bot = randomBot`, which strict mode would refuse and sloppy mode
// writes to globalThis. The global is swept on both sides of the call, so a
// bot left over from an earlier compile can never answer for a source that
// stopped choosing one. `function bot` and `const bot` stay local to the
// wrapper and work unchanged.
export function compileBot(source: string): { bot: BotFn } | { error: string } {
  let factory: (buyMax: typeof maxSharesCanBuy, sellMax: typeof maxSharesCanSell) => unknown;
  try {
    factory = new Function(
      "max_shares_can_buy",
      "max_shares_can_sell",
      `${source}\n;return typeof bot === "function" ? bot : null;`,
    ) as typeof factory;
  } catch (e) {
    return { error: `the code does not parse: ${(e as Error).message}` };
  }
  const g = globalThis as { bot?: unknown };
  delete g.bot;
  let bot: unknown;
  let threw: string | null = null;
  try {
    bot = factory(maxSharesCanBuy, maxSharesCanSell);
  } catch (e) {
    threw = (e as Error)?.message ?? String(e);
  }
  delete g.bot;
  if (threw !== null) return { error: `the code throws while loading: ${threw}` };
  if (typeof bot !== "function") {
    return { error: "point bot at a function: bot = randomBot, or define function bot(prices, shares, cash)" };
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
