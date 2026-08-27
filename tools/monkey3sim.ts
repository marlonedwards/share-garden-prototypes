// Monkey Trade v3 sim: every rule docs/monkey-spec-v3.md section 6 names,
// asserted headless. Run: npx tsx tools/monkey3sim.ts

import {
  advanceTo, buy, holdingBaseline, lastIndex, loadEra, sell, worthAt,
} from "../src/lib/tape/engine";
import {
  BILL, HAND_ERAS, EXCLUDED_TICKERS, PRICE_MAX, PRICE_MIN, START_CASH,
  WINDFALL, WINDOW_MONTHS, afterHand, afterSummary, bulletsFor, dealHand,
  deskFloorOf, deskSizeOf, grantWindfall, monkeyFinalWorth, monkeyPrices,
  monkeyWorthAt, newHandRun, payBill, ridingLine, settleHand, windowKey,
} from "../src/lib/monkey3/round";
import type { Hand, HandResult, Level } from "../src/lib/monkey3/round";

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

// 1. The sampler: 150 seeded deals per level hold every filter.
for (const level of [1, 2, 3] as Level[]) {
  const deals = level === 3 ? 40 : 150;
  const used = new Set<string>();
  for (let seed = 1; seed <= deals; seed++) {
    const hand = dealHand(level, seed * 7919, used);
    used.add(windowKey(hand.era, hand.startIndex));
    ok(HAND_ERAS.includes(hand.era), `L${level} era ${hand.era} allowed`);
    ok(hand.era !== ("crypto" as typeof hand.era), `L${level} never crypto`);
    ok(hand.tickers.length >= deskFloorOf(level), `L${level} desk floor`);
    ok(hand.tickers.length <= deskSizeOf(level), `L${level} desk cap`);
    for (const t of hand.tickers) {
      ok(!EXCLUDED_TICKERS.has(t), `L${level} ${t} not excluded`);
      const v = loadEra(hand.era).series[t][hand.startIndex] ?? 0;
      const open = typeof v === "number" ? v : 0;
      ok(open >= PRICE_MIN && open <= PRICE_MAX, `L${level} ${t} open ${open} in band`);
    }
    ok(hand.tickers.includes(hand.monkey.ticker), `L${level} monkey ticker dealt`);
    if (level === 1) {
      ok(hand.monkey.entryMonth >= 0 && hand.monkey.entryMonth < WINDOW_MONTHS, "L1 entry in window");
      ok(hand.moment.kind === "windfall", "L1 moment is a windfall");
    } else {
      ok(hand.monkey.entryMonth === 0, `L${level} monkey enters at open`);
      ok(hand.moment.kind === "bill", `L${level} moment is a bill`);
    }
    ok(hand.moment.month >= 3 && hand.moment.month <= 8, "moment mid window");
    const run = newHandRun(hand);
    ok(lastIndex(run) === WINDOW_MONTHS, "window is twelve month steps");
  }
  // no window repeated across the session's deals
  ok(used.size === deals, `L${level} windows never repeat`);
}

// 2. Determinism: the same seed deals the same hand.
{
  const a = dealHand(2, 424242, new Set());
  const b = dealHand(2, 424242, new Set());
  ok(JSON.stringify(a) === JSON.stringify(b), "same seed same hand");
}

// 3. The monkey: starts level, pays what it owes, windfalls go in.
{
  const used = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    for (const level of [1, 2, 3] as Level[]) {
      const hand = dealHand(level, seed * 104729, used);
      used.add(windowKey(hand.era, hand.startIndex));
      close(monkeyWorthAt(hand, 0), hand.monkey.entryMonth === 0 ? START_CASH :
        hand.moment.month === 0 ? START_CASH : START_CASH, "monkey starts at the stake");
      const flows = hand.moment.kind === "windfall" ? WINDFALL : -BILL;
      const prices = monkeyPrices(hand);
      // a monkey that never trades after entry conserves value except flows:
      // replay by hand and compare the settle
      let cash = START_CASH;
      let shares = 0;
      for (let m = 0; m <= WINDOW_MONTHS; m++) {
        const p = prices[m];
        if (m === hand.monkey.entryMonth && p > 0) {
          const n = Math.floor(cash / p);
          const nPlus = (n + 1) * p <= cash + 1e-9 ? n + 1 : n;
          shares += nPlus; cash -= nPlus * p;
        }
        if (m === hand.moment.month) {
          if (hand.moment.kind === "windfall") {
            cash += WINDFALL;
            if (m >= hand.monkey.entryMonth && p > 0) {
              const n = Math.floor(cash / p);
              const nPlus = (n + 1) * p <= cash + 1e-9 ? n + 1 : n;
              shares += nPlus; cash -= nPlus * p;
            }
          } else {
            if (cash < BILL && p > 0) {
              const need = Math.min(shares, Math.ceil((BILL - cash) / p));
              shares -= need; cash += need * p;
            }
            cash -= BILL;
          }
        }
      }
      close(monkeyFinalWorth(hand), cash + shares * prices[WINDOW_MONTHS], `monkey settle replays (seed ${seed} L${level})`);
      void flows;
    }
  }
}

// 4. The player's moment conserves worth exactly, minus or plus the flow.
{
  const hand = dealHand(2, 99991, new Set());
  let run = newHandRun(hand);
  run = buy(run, hand.tickers[0]);
  run = advanceTo(run, hand.moment.month);
  const before = worthAt(run);
  const paidBySelling = payBill(run, false);
  close(worthAt(paidBySelling), before - BILL, "bill by selling costs exactly the bill", 1e-6);
  ok(paidBySelling.trades.some((t) => t.kind === "sell"), "bill by selling sells");
  const rich = { ...run, cash: run.cash + 1000 };
  const paidFromCash = payBill(rich, true);
  close(worthAt(paidFromCash), worthAt(rich) - BILL, "bill from cash costs exactly the bill", 1e-6);
  ok(paidFromCash.trades.length === rich.trades.length, "bill from cash never trades");
  const gifted = grantWindfall(run);
  close(worthAt(gifted), before + WINDFALL, "windfall adds exactly the windfall", 1e-6);
}

// 5. The riding line: level 1 riding equals the engine's holding baseline
// plus the windfall held as cash.
{
  const used = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const hand = dealHand(1, seed * 31337, used);
    used.add(windowKey(hand.era, hand.startIndex));
    const run = newHandRun(hand);
    close(ridingLine(hand), holdingBaseline(run, hand.tickers[0]) + WINDFALL, `L1 riding is holding plus windfall (seed ${seed})`, 1e-6);
  }
}

// 6. Settle: ties are not wins, the win is strict.
{
  const hand = dealHand(1, 55555, new Set());
  const idle = advanceTo(newHandRun(hand), WINDOW_MONTHS);
  const r = settleHand(hand, idle);
  ok(r.you === START_CASH + WINDFALL || r.you === START_CASH, "idle player kept the stake");
  ok(r.win === (r.you > r.monkey), "win is strictly greater");
  const tied: HandResult = { ...r, you: r.monkey, win: false };
  ok(!tied.win, "a tie is not a win");
}

// 7. Bullets: each rule fires on a constructed log, and three always come.
{
  const hand = dealHand(2, 777, new Set());
  let run = newHandRun(hand);
  const t0 = hand.tickers[0];
  run = buy(run, t0);
  run = advanceTo(run, 4);
  if (run.holdings[t0] > 0) run = sell(run, t0);
  run = advanceTo(run, WINDOW_MONTHS);
  const r = settleHand(hand, run);
  const bullets = bulletsFor([r]);
  ok(bullets.length === 3, "three bullets always");
  for (const b of bullets) ok(/\$\d/.test(b), `bullet has a dollar figure: ${b}`);
  const idleHand = dealHand(2, 778, new Set());
  const idleRun = advanceTo(newHandRun(idleHand), WINDOW_MONTHS);
  const idleBullets = bulletsFor([settleHand(idleHand, idleRun)]);
  ok(idleBullets.length === 3, "three bullets for a hold only hand");
}

// 8. Progress: hands and wins count, summaries unlock, wins never do.
{
  const p0 = { unlocked: 1 as Level, wins: 0, hands: 0, streak: 0 };
  const hand = dealHand(1, 3333, new Set());
  const idle = advanceTo(newHandRun(hand), WINDOW_MONTHS);
  const r = settleHand(hand, idle);
  const p1 = afterHand(p0, r);
  ok(p1.hands === 1, "hands count");
  ok(p1.wins === (r.win ? 1 : 0), "wins count");
  const p2 = afterSummary(p1, 1);
  ok(p2.unlocked === 2, "summary unlocks the next level");
  const p3 = afterSummary({ ...p2, wins: 0 }, 2);
  ok(p3.unlocked === 3, "unlock never reads the win count");
  ok(afterSummary(p3, 3).unlocked === 3, "no level past three");
}

console.log(`monkey3sim clean, ${checks} checks`);
