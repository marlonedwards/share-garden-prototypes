// Headless acceptance harness for The Tally. It plays whole ladders through
// the real engine in src/lib/tally/run.ts, with no React and no browser, and
// it prints pass or fail for the three acceptance tests that are arithmetic
// rather than pixels:
//
//   test 8   a run cleared entirely by buying the rainbow card on turn one and
//            never trading again clears every chapter. This is the calibration
//            test, and if it fails the targets are wrong.
//   test 9   a run played entirely in cash fails at chapter 3 or earlier.
//   test 10  ten concentrated ladders clear fewer than four full runs.
//
// It also prints the per chapter target table and the wall range, which is
// acceptance test 6, and it cross checks the compact reference model that
// chapters.ts uses to set the targets against the real engine. If those two
// ever disagree, the targets are being set from a model of the game rather
// than from the game.
//
// Run it with: npx tsx tools/tallySim.ts
//
// The repo has no @types/node and does not need one for a single exit code,
// so the one Node global this file touches is declared here.
declare const process: { exit(code: number): never };

import { CHAPTERS, referenceLadder, assetOf, savingsRate } from "../src/lib/tally/chapters";
import { INDEX_ID, SAVINGS_ID, cardCost, cardWorth } from "../src/lib/tally/deck";
import {
  RunState, advance, beginChapter, buy, canBuy, canSell, chapterOf,
  chapterSummary, endTurn, newRun, sell, wallColumns, worthOf,
} from "../src/lib/tally/run";

// ---------------------------------------------------------------- plumbing

interface ChapterResult {
  id: number;
  denom: number;
  cleared: boolean;
  target: number;
  finishedAt: number;
  minBlocks: number;
  maxBlocks: number;
  ceremonies: number;
}

interface LadderResult {
  chapters: ChapterResult[];
  clearedAll: boolean;
  failedAt: number | null;
}

type Decide = (run: RunState) => RunState;

// Play a whole ladder from a start point with one decision function. The
// harness never reaches into state: it only uses the same calls the UI will.
function playLadder(startChapter: number, decide: Decide): LadderResult {
  let run = newRun(startChapter, 1_700_000_000_000);
  const chapters: ChapterResult[] = [];
  let guard = 0;

  while (run.phase !== "over" && run.phase !== "won") {
    if (guard++ > 5000) throw new Error("ladder did not terminate");
    if (run.phase === "chapter") {
      run = beginChapter(run);
      continue;
    }
    if (run.phase === "plan") {
      const ch = chapterOf(run);
      const ceremonies = run.ceremony?.steps ?? 0;
      let min = Infinity;
      let max = 0;
      // one chapter, start to finish
      for (;;) {
        run = decide(run);
        for (const col of wallColumns(run)) {
          if (col.totalBlocks < min) min = col.totalBlocks;
          if (col.totalBlocks > max) max = col.totalBlocks;
        }
        run = endTurn(run);
        if (run.phase !== "plan") break;
      }
      for (const col of wallColumns(run)) {
        if (col.totalBlocks < min) min = col.totalBlocks;
        if (col.totalBlocks > max) max = col.totalBlocks;
      }
      const s = chapterSummary(run);
      chapters.push({
        id: ch.id, denom: run.denom, cleared: s.cleared, target: s.target,
        finishedAt: s.finishedAt, minBlocks: min, maxBlocks: max, ceremonies,
      });
      run = advance(run);
      continue;
    }
    if (run.phase === "summary") { run = advance(run); continue; }
  }

  const failed = chapters.find((c) => !c.cleared);
  return {
    chapters,
    clearedAll: run.phase === "won",
    failedAt: failed ? failed.id : null,
  };
}

// ------------------------------------------------------------- strategies

// Buy the basket on turn one and never touch it again. Where a chapter has no
// rainbow card, spread across what it does have, which is the closest honest
// analogue the chapter allows.
const basketOnce: Decide = (run) => {
  if (run.turn !== 0) return run;
  const ch = chapterOf(run);
  const spread = ch.referenceSpread;
  if (spread.length === 0) return run;
  let next = run;
  let i = 0;
  while (canBuy(next, spread[i % spread.length])) {
    next = buy(next, spread[i % spread.length]);
    i++;
  }
  return next;
};

// Never buy anything. Every block stays a green cash block, visibly doing
// nothing.
const allCash: Decide = (run) => run;

// One name, every block, on turn one. The name is the k-th temptation on the
// chapter's market, wrapping, so ten values of k give ten different ladders.
// A chapter with no temptation on it falls back to the chapter's own spread,
// because there is nothing to concentrate in.
function concentrated(k: number): Decide {
  return (run) => {
    if (run.turn !== 0) return run;
    const ch = chapterOf(run);
    const names = ch.market.filter((id) => {
      const a = assetOf(id);
      return a.suit === "own" || a.suit === "spec";
    });
    const pick = names.length > 0 ? [names[k % names.length]] : ch.referenceSpread;
    if (pick.length === 0) return run;
    let next = run;
    while (canBuy(next, pick[0])) next = buy(next, pick[0]);
    return next;
  };
}

// One chapter, played on its own with one decision function, handed back at
// the moment its last turn resolved.
function playChapter(chapterId: number, decide: Decide): RunState {
  let run = newRun(chapterId, 1_700_000_000_000);
  run = beginChapter(run);
  for (;;) {
    run = decide(run);
    run = endTurn(run);
    if (run.phase !== "plan") break;
  }
  return run;
}

// One named asset, every block, for a single chapter played on its own. This
// is what the temptation table below reports.
function soloChapter(chapterId: number, assetId: string): { cleared: boolean; finishedAt: number; target: number } {
  let run = newRun(chapterId, 1_700_000_000_000);
  run = beginChapter(run);
  for (;;) {
    if (run.turn === 0) {
      while (canBuy(run, assetId)) run = buy(run, assetId);
    }
    run = endTurn(run);
    if (run.phase !== "plan") break;
  }
  const s = chapterSummary(run);
  return { cleared: s.cleared, finishedAt: s.finishedAt, target: s.target };
}

// ---------------------------------------------------------------- output

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pad = (s: string | number, n: number) => String(s).padStart(n);

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
}

console.log("The Tally, headless acceptance run\n");

// ---------------------------------------------------- the target table

const ref = referenceLadder();
const basket = playLadder(1, basketOnce);

console.log("Per chapter, playing the basket on turn one and never trading again");
console.log("ch  name             denom  stake  income  turns     target   reference    wall min  wall max");
for (let i = 0; i < CHAPTERS.length; i++) {
  const ch = CHAPTERS[i];
  const r = ref[i];
  const played = basket.chapters.find((c) => c.id === ch.id);
  console.log(
    pad(ch.id, 2), " ",
    ch.name.padEnd(16),
    pad(money(r.denom), 6),
    pad(ch.stakeBlocks, 6),
    pad(ch.incomeBlocks, 7),
    pad(ch.turns, 6),
    pad(money(ch.target), 10),
    pad(money(played?.finishedAt ?? 0), 12),
    pad((played?.minBlocks ?? 0).toFixed(1), 11),
    pad((played?.maxBlocks ?? 0).toFixed(1), 10),
  );
}
console.log("");

// The compact model chapters.ts uses to set targets has to agree with the
// engine, or the targets are calibrated against a model of the game.
let drift = 0;
for (let i = 0; i < CHAPTERS.length; i++) {
  const played = basket.chapters.find((c) => c.id === CHAPTERS[i].id);
  if (!played) continue;
  drift = Math.max(drift, Math.abs(played.finishedAt - ref[i].endDollars) / Math.max(1, ref[i].endDollars));
}
check("calibration model matches the engine", drift < 0.005, `worst drift ${(drift * 100).toFixed(2)}%`);

// ------------------------------------------------------------- test 6

const outOfBand = basket.chapters.filter((c) => c.maxBlocks > 40 || c.minBlocks < 8);
check(
  "test 6: the wall stays between 8 and 40 blocks",
  outOfBand.length === 0,
  outOfBand.length ? `chapters ${outOfBand.map((c) => c.id).join(", ")}` : "every chapter, every turn",
);

// The unit ladder a full run produces, and where the ceremonies fire.
const ladder = basket.chapters.map((c) => `${c.id}:${money(c.denom)}${c.ceremonies ? ` (x4 ceremony)` : ""}`);
console.log(`\nUnit ladder over a full run: ${ladder.join("  ")}`);
const doubles = basket.chapters.filter((c) => c.ceremonies > 1);
check("no transition needs more than one ceremony", doubles.length === 0, doubles.length ? `chapters ${doubles.map((c) => c.id).join(", ")}` : "four single ceremonies");
console.log("");

// ------------------------------------------------------------- test 8

check(
  "test 8: the basket on turn one clears every chapter",
  basket.clearedAll,
  basket.clearedAll ? "all eight" : `missed at chapter ${basket.failedAt}`,
);
for (const c of basket.chapters) {
  const margin = ((c.finishedAt / c.target - 1) * 100).toFixed(1);
  console.log(`      chapter ${c.id}: finished ${money(c.finishedAt)} against ${money(c.target)}, ${margin}% clear`);
}
console.log("");

// ------------------------------------------------------------- test 9

const cash = playLadder(1, allCash);
check(
  "test 9: a run played entirely in cash fails at chapter 3 or earlier",
  cash.failedAt !== null && cash.failedAt <= 3,
  cash.failedAt ? `missed at chapter ${cash.failedAt}` : "it cleared the whole ladder",
);
for (const c of cash.chapters) {
  console.log(`      chapter ${c.id}: finished ${money(c.finishedAt)} against ${money(c.target)}, ${c.cleared ? "cleared" : "missed"}`);
}
console.log("");

// ------------------------------------------------------------ test 10

const conc: LadderResult[] = [];
for (let k = 0; k < 10; k++) conc.push(playLadder(1, concentrated(k)));
const concCleared = conc.filter((r) => r.clearedAll).length;
check(
  "test 10: fewer than four of ten concentrated ladders clear",
  concCleared < 4,
  `${concCleared} of 10 cleared`,
);
conc.forEach((r, k) => {
  console.log(`      ladder ${k}: ${r.clearedAll ? "cleared all eight" : `ended at chapter ${r.failedAt}`}`);
});
console.log("");

// ------------------------------------------------- chapter 2, the deposit

// The savings chapter, played three ways. A savings card costs one block, its
// worth never moves in either direction, and the bank pays its interest into
// cash at the end of every turn on whatever was on deposit through that turn.
// So the only thing that makes the next payment bigger is holding more of it,
// which is the whole of chapter 2 said as arithmetic and never as a sentence.
//
// Chapter 2's floor is authored rather than calibrated, because the chapter has
// no basket to calibrate against and because chapters 1 and 2 are the last two
// a player can clear sitting in cash. It therefore has to stay under the pile
// that does nothing, and the saver has to finish clearly above it.
{
  const ch2 = CHAPTERS.find((c) => c.id === 2)!;
  const buyAll = (id: string): Decide => (run) => {
    let next = run;
    while (canBuy(next, id)) next = buy(next, id);
    return next;
  };
  const onTurnOne = (d: Decide): Decide => (run) => (run.turn === 0 ? d(run) : run);

  const cashOnly = playChapter(2, allCash);
  const held = playChapter(2, onTurnOne(buyAll(SAVINGS_ID)));
  const reinvested = playChapter(2, buyAll(SAVINGS_ID));

  console.log(`Chapter 2, the deposit, at ${(savingsRate(ch2) * 100).toFixed(0)}% a year, target ${money(ch2.target)}`);
  for (const [label, run] of [
    ["nothing but cash", cashOnly],
    ["deposit on turn one", held],
    ["deposit, payments put back", reinvested],
  ] as [string, RunState][]) {
    const s = chapterSummary(run);
    console.log(`      ${label.padEnd(28)} ${pad(money(worthOf(run)), 8)}  ${s.cleared ? "cleared" : "missed"}`);
  }
  console.log("");

  check(
    "chapter 2 is still clearable sitting in cash",
    worthOf(cashOnly) + 1e-6 >= ch2.target,
    `cash finished ${money(worthOf(cashOnly))} against ${money(ch2.target)}`,
  );
  check(
    "saving, with the payments put back, finishes clearly ahead of cash",
    worthOf(reinvested) > worthOf(cashOnly) * 1.05 && worthOf(reinvested) > worthOf(held),
    `${money(worthOf(reinvested))} against ${money(worthOf(cashOnly))} in cash and ${money(worthOf(held))} left alone`,
  );

  // Rule 2 of the reward function contract, for the one thing in the game that
  // pays: interest is earned by holding and by nothing else. A card bought and
  // sold back inside the same plan is not on deposit when the turn resolves, so
  // it is paid nothing at all.
  const washed = playChapter(2, (run) => {
    if (!canBuy(run, SAVINGS_ID)) return run;
    const bought = buy(run, SAVINGS_ID);
    const fresh = bought.cards[bought.cards.length - 1];
    return sell(bought, fresh.uid);
  });
  check(
    "rule 2: a savings card bought and sold back inside one plan is paid no interest",
    Math.abs(worthOf(washed) - worthOf(cashOnly)) < 1e-6,
    `it finished ${money(worthOf(washed))} against ${money(worthOf(cashOnly))} for doing nothing`,
  );

  // A savings card cannot fall and its price cannot creep, so it is worth one
  // block on the turn it is bought and one block on every turn after it, and
  // the withdrawal is exactly the deposit.
  let run = newRun(2, 1_700_000_000_000);
  run = beginChapter(run);
  const cost = cardCost(run.denom, SAVINGS_ID);
  run = buy(run, SAVINGS_ID);
  const uid = run.cards[run.cards.length - 1].uid;
  let moved = 0;
  for (;;) {
    run = endTurn(run);
    const card = run.cards.find((c) => c.uid === uid)!;
    moved = Math.max(moved, Math.abs(cardWorth(card, run.prices[SAVINGS_ID][run.turn]) - cost));
    if (run.phase !== "plan") break;
  }
  check(
    "a savings card is worth one block on every turn it is held",
    moved < 1e-9 && cost === run.denom,
    `one card cost ${money(cost)} at a ${money(run.denom)} block and never moved by more than ${moved.toFixed(9)}`,
  );

  // The withdrawal, five turns after the deposit: the money that comes back is
  // the money that went in, to the cent, whatever the table did in between.
  let w = newRun(2, 1_700_000_000_000);
  w = beginChapter(w);
  w = buy(w, SAVINGS_ID);
  const heldUid = w.cards[w.cards.length - 1].uid;
  for (let t = 0; t < 5; t++) w = endTurn(w);
  const cashBefore = w.cash;
  w = sell(w, heldUid);
  check(
    "selling a savings card back returns exactly what it cost",
    Math.abs(w.cash - cashBefore - cost) < 1e-9,
    `${money(w.cash - cashBefore)} came back out of a ${money(cost)} deposit`,
  );
  console.log("");
}

// --------------------------------------------- every temptation, chapter 6 and 7

for (const chapterId of [6, 7]) {
  const ch = CHAPTERS.find((c) => c.id === chapterId)!;
  const names = ch.market.filter((id) => {
    const a = assetOf(id);
    return a.suit === "own" || a.suit === "spec";
  });
  console.log(`Chapter ${chapterId}, one name only, target ${money(ch.target)}`);
  let clears = 0;
  for (const id of names) {
    const r = soloChapter(chapterId, id);
    if (r.cleared) clears++;
    console.log(`      ${assetOf(id).name.padEnd(22)} ${pad(money(r.finishedAt), 10)}  ${r.cleared ? "cleared" : "missed"}`);
  }
  const idx = soloChapter(chapterId, INDEX_ID);
  console.log(`      ${"The Index Fund".padEnd(22)} ${pad(money(idx.finishedAt), 10)}  ${idx.cleared ? "cleared" : "missed"}`);
  console.log(`      ${clears} of ${names.length} single names clear this chapter\n`);
}

// ---------------------------------------------------------------- stones

// Acceptance test 4 in arithmetic form: buy the name that goes bankrupt in
// chapter 4, then check that the card is worth nothing, cannot be discarded,
// and is still on the table at the end of the chapter.
{
  let run = newRun(4, 1_700_000_000_000);
  run = beginChapter(run);
  while (canBuy(run, "HARBOR")) run = buy(run, "HARBOR");
  const uid = run.cards.find((c) => c.assetId === "HARBOR")!.uid;
  for (;;) {
    run = endTurn(run);
    if (run.phase !== "plan") break;
  }
  const card = run.cards.find((c) => c.uid === uid);
  check(
    "test 4: a bankrupt card turns to stone, cannot be discarded, and stays",
    !!card && card.stone && !canSell(run, uid),
    card ? `Harbor Scooters is stone and still on the table at ${money(0)}` : "the card left the tableau",
  );
}

// Acceptance test 3 in arithmetic form: the worst resolve of chapter 6 takes
// blocks off the wall and removes no cards at all.
{
  let run = newRun(6, 1_700_000_000_000);
  run = beginChapter(run);
  while (canBuy(run, INDEX_ID)) run = buy(run, INDEX_ID);
  let worstDrop = 0;
  let cardsLost = 0;
  for (;;) {
    const before = wallColumns(run);
    const beforeBlocks = before[before.length - 1].totalBlocks;
    const beforeCards = run.cards.length;
    run = endTurn(run);
    const after = wallColumns(run);
    const drop = beforeBlocks - after[after.length - 1].totalBlocks;
    if (drop > worstDrop) worstDrop = drop;
    cardsLost += Math.max(0, beforeCards - run.cards.length);
    if (run.phase !== "plan") break;
  }
  check(
    "test 3: a crash resolve removes blocks and removes zero cards",
    worstDrop > 0 && cardsLost === 0,
    `worst resolve took ${worstDrop} blocks and ${cardsLost} cards`,
  );
}

// ---------------------------------------------------------------- badges

// Rule 2 of the reward function contract, in arithmetic form: no badge may pay
// for trading volume. Buying a card and selling it straight back inside the
// same plan is dollar neutral, costs nothing and takes no risk, so it is not
// putting blocks to work and it must earn neither of the two badges that are
// about deploying money. A real purchase held through the turn still earns
// Never idle, so the badge keeps its sanctioned meaning.
function badgesOfChapter(chapterId: number, decide: Decide): string[] {
  let run = newRun(chapterId, 1_700_000_000_000);
  run = beginChapter(run);
  for (;;) {
    run = decide(run);
    run = endTurn(run);
    if (run.phase !== "plan") break;
  }
  return chapterSummary(run).badges.map((b) => b.id);
}

// buy one basket card and sell the same card back before the turn is committed
const washEveryTurn: Decide = (run) => {
  if (!canBuy(run, INDEX_ID)) return run;
  const bought = buy(run, INDEX_ID);
  const fresh = bought.cards[bought.cards.length - 1];
  return sell(bought, fresh.uid);
};

// buy one basket card every turn and keep every one of them
const holdEveryTurn: Decide = (run) => (canBuy(run, INDEX_ID) ? buy(run, INDEX_ID) : run);

{
  const washed = badgesOfChapter(6, washEveryTurn);
  check(
    "rule 2: a wash trade on every turn of chapter 6 earns neither Bought the fear nor Never idle",
    !washed.includes("bought-the-fear") && !washed.includes("never-idle"),
    washed.length > 0 ? `it earned ${washed.join(", ")}` : "it earned no badge at all",
  );

  const held = badgesOfChapter(6, holdEveryTurn);
  check(
    "a purchase held on every turn of chapter 6 still earns Never idle",
    held.includes("never-idle"),
    held.length > 0 ? `it earned ${held.join(", ")}` : "it earned no badge at all",
  );
}

console.log(failures === 0 ? "\nAll checked tests passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
