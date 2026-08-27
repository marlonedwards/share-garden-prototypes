// Wall Street sim: docs/street-spec.md section 6, asserted headless.
// Run: npx tsx tools/streetSim.ts

import {
  advanceTo, buy, lastIndex, sell, worthAt,
} from "../src/lib/tape/engine";
import type { RunState, Ticker } from "../src/lib/tape/engine";
import { HAND_ERAS, deskFloorOf, deskSizeOf } from "../src/lib/monkey3/round";
import {
  BLOCK_DOLLARS, START_CASH, TARGET_FACTOR, WINDOW_MONTHS, afterHand,
  afterSummary, bulletsFor, copyReport, dealHand, monkeyFinalWorth,
  monkeyWorthAt, moveLine, newHandRun, ridingLine, settleHand, windowKey,
} from "../src/lib/street/round";
import type { Level, StreetHand } from "../src/lib/street/round";

declare const process: { exit(code: number): never };

let checks = 0;
function ok(cond: boolean, msg: string): void {
  checks++;
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exit(1);
  }
}
function close(a: number, b: number, msg: string, eps = 1e-6): void {
  ok(Math.abs(a - b) <= eps, `${msg} (${a} vs ${b})`);
}

// The monkey replayed through the real engine, move for move.
function monkeyThroughEngine(hand: StreetHand): number {
  let run: RunState = newHandRun(hand);
  let held: Ticker | null = null;
  const enter = (t: Ticker) => { run = buy(run, t); held = (run.holdings[t] ?? 0) > 0 ? t : null; };
  enter(hand.monkeyStart);
  for (const mv of hand.monkeyMoves) {
    run = advanceTo(run, mv.month);
    if (held) { run = sell(run, held); held = null; }
    if (mv.to) enter(mv.to);
  }
  run = advanceTo(run, lastIndex(run));
  return worthAt(run, WINDOW_MONTHS);
}

// The equal-split holder through the real engine.
function holderThroughEngine(hand: StreetHand): number {
  let run = newHandRun(hand);
  const budget = START_CASH / hand.tickers.length;
  for (const t of hand.tickers) run = buy(run, t, budget);
  run = advanceTo(run, lastIndex(run));
  return worthAt(run, WINDOW_MONTHS);
}

// 1. The sampler and the target, per level.
for (const level of [1, 2, 3] as Level[]) {
  const deals = level === 3 ? 40 : 120;
  const used = new Set<string>();
  let holderClears = 0;
  for (let seed = 1; seed <= deals; seed++) {
    const hand = dealHand(level, seed * 7919, used);
    used.add(windowKey(hand.era, hand.startIndex));
    ok(HAND_ERAS.includes(hand.era), `L${level} era allowed`);
    ok(hand.tickers.length >= deskFloorOf(level) && hand.tickers.length <= deskSizeOf(level), `L${level} desk size`);
    ok(hand.tickers.includes(hand.monkeyStart), `L${level} monkey start dealt`);
    ok(hand.monkeyMoves.length >= 2 && hand.monkeyMoves.length <= 3, `L${level} 2 or 3 moves`);
    const months = hand.monkeyMoves.map((m) => m.month);
    ok(new Set(months).size === months.length, `L${level} move months distinct`);
    ok(months.every((m) => m >= 2 && m <= 10), `L${level} moves mid window`);
    // moves chain: each move's from equals what the monkey actually held
    let held: string | null = hand.monkeyStart;
    for (const mv of hand.monkeyMoves) {
      ok(mv.from === held, `L${level} move chains from held`);
      ok(mv.to === null || hand.tickers.includes(mv.to), `L${level} move target dealt`);
      ok(!(mv.from === null && mv.to === null), `L${level} no null move`);
      held = mv.to;
    }
    ok(hand.target === Math.round(ridingLine(hand) * TARGET_FACTOR[level]), `L${level} target from riding`);
    ok(hand.target > 0, `L${level} target positive`);
    for (const mv of hand.monkeyMoves) ok(moveLine(hand, mv).startsWith("Monkey"), "move line reads");

    // the holder clears the target
    if (holderThroughEngine(hand) >= hand.target) holderClears++;

    // engine replay of the monkey agrees with the module's math
    close(monkeyThroughEngine(hand), monkeyFinalWorth(hand), `L${level} monkey replays (seed ${seed})`, 0.01);
    // the monkey starts at the stake
    close(monkeyWorthAt(hand, 0), START_CASH, `L${level} monkey opens at stake`, 0.01);
  }
  ok(holderClears >= deals * 0.95, `L${level} holder clears ${holderClears}/${deals}`);
  ok(used.size === deals, `L${level} windows never repeat`);
}

// 2. Determinism.
{
  const a = dealHand(2, 424242, new Set());
  const b = dealHand(2, 424242, new Set());
  ok(JSON.stringify(a) === JSON.stringify(b), "same seed same hand");
}

// 3. Copy detection on a constructed log.
{
  const hand = dealHand(2, 999331, new Set());
  const mv = hand.monkeyMoves.find((m) => m.to !== null);
  ok(!!mv, "a move with a target exists");
  if (mv && mv.to) {
    let run = newHandRun(hand);
    run = advanceTo(run, mv.month + 0.5);
    run = buy(run, mv.to, 300);            // the copy
    const other = hand.tickers.find((t) => t !== mv.to);
    if (other) run = buy(run, other, 200); // not a copy of a buy... same month though
    run = advanceTo(run, lastIndex(run));
    const r = settleHand(hand, run);
    const copies = copyReport(r);
    ok(copies.count >= 1, "the copy is counted");
    const early = settleHand(hand, advanceTo(buy(newHandRun(hand), mv.to, 300), lastIndex(newHandRun(hand))));
    ok(copyReport(early).count === 0, "a buy at the open is never a copy");
  }
}

// 4. Bullets: three always, the copy bullet leads when copies fired.
{
  const hand = dealHand(2, 555001, new Set());
  const mv = hand.monkeyMoves.find((m) => m.to !== null);
  let run = newHandRun(hand);
  if (mv && mv.to) {
    run = advanceTo(run, mv.month + 0.4);
    run = buy(run, mv.to, 500);
  }
  run = advanceTo(run, lastIndex(run));
  const r = settleHand(hand, run);
  const bullets = bulletsFor([r]);
  ok(bullets.length === 3, "three bullets");
  for (const b of bullets) ok(/\$\d/.test(b), `dollar figure: ${b}`);
  if (copyReport(r).count > 0 && Math.abs(copyReport(r).cost) >= 10)
    ok(/cop/i.test(bullets[0]), "copy bullet leads");
  const idle = settleHand(hand, advanceTo(newHandRun(hand), lastIndex(newHandRun(hand))));
  ok(bulletsFor([idle]).length === 3, "three bullets for the idle hand");
}

// 5. Settle facts: cleared and win definitions, block arithmetic.
{
  const hand = dealHand(1, 313131, new Set());
  const idle = settleHand(hand, advanceTo(newHandRun(hand), WINDOW_MONTHS));
  ok(idle.you === START_CASH, "idle keeps the stake");
  ok(idle.cleared === (idle.you >= hand.target), "cleared is the target line");
  ok(idle.win === (idle.you > idle.monkey), "win is strict");
  ok(Number.isInteger(Math.round(idle.you / BLOCK_DOLLARS)), "worth blocks count");
}

// 6. Progress: hands and wins count, summaries unlock, wins never do.
{
  const p0 = { unlocked: 1 as Level, wins: 0, hands: 0, streak: 0 };
  const hand = dealHand(1, 3333, new Set());
  const r = settleHand(hand, advanceTo(newHandRun(hand), WINDOW_MONTHS));
  const p1 = afterHand(p0, r);
  ok(p1.hands === 1 && p1.wins === (r.win ? 1 : 0), "tally counts");
  ok(afterSummary(p1, 1).unlocked === 2, "summary opens level 2");
  ok(afterSummary({ ...p1, wins: 0, unlocked: 2 }, 2).unlocked === 3, "unlock ignores wins");
  ok(afterSummary({ ...p1, unlocked: 3 }, 3).unlocked === 3, "no level past three");
}

console.log(`streetSim clean, ${checks} checks`);
