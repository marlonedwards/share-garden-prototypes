// The one invariant the per holding tally rests on: the chips add up.
//
// Every chip the resolve prints is one holding's own change to the wall, and the
// wall's change is the number the header rail moves by. If the parts and the
// whole ever disagree the resolve is telling a story about the turn rather than
// showing the turn, so this walks whole ladders through the real engine and
// checks, on every single turn:
//
//   sum(holdings[].blocks) + cashBlocks === railAfter - railBefore
//   sum(holdings[].blocksTo) + cashBandBlocks === the closing wall column
//   the tally's band order is the wall's band order
//
// Run it with: npx tsx tools/tallycheck.ts
declare const process: { exit(code: number): never };

import { CHAPTERS } from "../src/lib/tally/chapters";
import { INDEX_ID, SAVINGS_ID } from "../src/lib/tally/deck";
import {
  RunState, beginChapter, buy, canBuy, chapterOf, endTurn, headerRail, newRun,
  turnTally, wallMonths,
} from "../src/lib/tally/run";

let checked = 0;
let bad = 0;

function report(msg: string): void {
  bad++;
  if (bad < 12) console.log(`FAIL  ${msg}`);
}

function walk(startChapter: number, label: string, decide: (run: RunState) => RunState): void {
  let run = newRun(startChapter, 1_700_000_000_000);
  let guard = 0;
  while (run.phase !== "over" && run.phase !== "won") {
    if (guard++ > 4000) throw new Error("did not terminate");
    if (run.phase === "chapter") { run = beginChapter(run); continue; }
    if (run.phase === "summary") {
      // one chapter's ladder is enough for this check
      break;
    }
    run = decide(run);
    const before = headerRail(run).blocks;
    // the column the player is looking at while they plan, and how tall it
    // stands at the moment they press Play
    const standing = wallMonths(run);
    const standingAt = standing.length - 1;
    const stood = standing[standingAt].totalBlocks;
    const next = endTurn(run);
    const after = headerRail(next).blocks;
    const t = turnTally(next);

    const parts = t.holdings.reduce((s, h) => s + h.blocks, 0) + t.cashBlocks;
    if (parts !== after - before) {
      report(`${label} ch${chapterOf(next).id} turn ${next.turn}: chips sum ${parts}, rail moved ${after - before}`);
    }
    if (t.blocksFrom !== before || t.blocksTo !== after) {
      report(`${label} ch${chapterOf(next).id} turn ${next.turn}: tally ends ${t.blocksFrom}..${t.blocksTo}, rail ${before}..${after}`);
    }

    // No block that was standing may vanish when the turn is played. The
    // column the player planned on keeps every block it had, and it is the
    // number the tally counts up from, so the resolve starts where the eye
    // already is.
    const cols = wallMonths(next);
    if (cols[standingAt].totalBlocks !== stood || stood !== t.blocksFrom) {
      report(
        `${label} ch${chapterOf(next).id} turn ${next.turn}: the standing column was ${stood} blocks and is now ${cols[standingAt].totalBlocks}, tally counts from ${t.blocksFrom}`,
      );
    }

    // the closing column of the wall, which is what the tally assembles
    const closing = cols[cols.length - 1];
    const bandTotal = t.holdings.reduce((s, h) => s + h.blocksTo, 0) + t.cashBandBlocks;
    if (bandTotal !== closing.totalBlocks) {
      report(`${label} ch${chapterOf(next).id} turn ${next.turn}: bands sum ${bandTotal}, column stands ${closing.totalBlocks}`);
    }
    // and in the same order, because the chip and the band are one thread
    const wallOrder = closing.bands.filter((b) => b.blocks > 0).map((b) => b.assetId).join(",");
    const tallyOrder = t.holdings.filter((h) => h.blocksTo > 0).map((h) => h.assetId).join(",");
    if (wallOrder !== tallyOrder) {
      report(`${label} ch${chapterOf(next).id} turn ${next.turn}: band order ${wallOrder} against chip order ${tallyOrder}`);
    }
    checked++;
    run = next;
  }
}

// every chapter, played four ways, so the check meets crashes, stones,
// bankruptcies, ceremonies and quiet months
for (const ch of CHAPTERS) {
  walk(ch.id, "spread", (run) => {
    const spread = chapterOf(run).referenceSpread;
    let next = run;
    let i = 0;
    while (spread.length && canBuy(next, spread[i % spread.length])) {
      next = buy(next, spread[i % spread.length]);
      i++;
    }
    return next;
  });
  walk(ch.id, "index", (run) => {
    let next = run;
    while (canBuy(next, INDEX_ID)) next = buy(next, INDEX_ID);
    return next;
  });
  walk(ch.id, "cash", (run) => run);
  // savings on every turn, so the interest the bank pays is inside the
  // reconciliation on every chapter that has a deposit on its table. Interest
  // is paid into cash, so it has to arrive with the cash band and never inside
  // the savings stack's own chip.
  walk(ch.id, "savings", (run) => {
    let next = run;
    while (canBuy(next, SAVINGS_ID)) next = buy(next, SAVINGS_ID);
    return next;
  });
  walk(ch.id, "one name", (run) => {
    const market = chapterOf(run).market;
    let next = run;
    while (canBuy(next, market[market.length - 1])) next = buy(next, market[market.length - 1]);
    return next;
  });
}

console.log(
  bad === 0
    ? `\nPASS  the chips add up on all ${checked} turns checked.`
    : `\n${bad} of ${checked} turns disagreed.`,
);
process.exit(bad === 0 ? 0 : 1);
