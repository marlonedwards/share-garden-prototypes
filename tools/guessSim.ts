// Headless acceptance harness for Guess the Stock. It runs the real model in
// src/lib/guess/model.ts against the real baked pool in
// src/data/guessPuzzles.json, with no React and no browser, and prints pass or
// fail for the seven acceptance tests in docs/guess-the-stock-spec.md section 8
// that are arithmetic rather than pixels:
//
//   test 1  matching: name, ticker and every alias solve; case and punctuation
//           never matter; a near miss never lands
//   test 2  the ladder deals in the fixed order and never repeats a hint
//   test 3  data integrity across the whole baked pool
//   test 4  the percent axis and the dollar axis both read the baked numbers
//   test 5  the scorecard records under par, at par, over par and fails
//   test 6  the deal order repeats nothing until the pool is exhausted
//   test 7  the company catalog behind the typeahead
//   test 8  easy mode's sector comparator
//   test 9  the collection shelf's state reducer
//   test 10 the stream order, most guessable first
//   test 11 copy audit: no em dash anywhere in the new files
//
// Run it with: npx tsx tools/guessSim.ts
//
// The repo carries no @types/node, so the one Node global this file touches is
// declared here and the one Node module it reads is declared in
// tools/node-fs.d.ts.
declare const process: { exit(code: number): never };

import { readFileSync } from "node:fs";
import puzzleData from "../src/data/guessPuzzles.json";
import { COMPANIES } from "../src/data/companyCatalog";
import {
  EMPTY_SHELF, EMPTY_STATS, HINT_LADDER, Order, Puzzle, PuzzleState, Shelf, Stats,
  advanceOrder, answerKeys, canDealHint, companyKeys, currentId, dealHint,
  dealtHints, dollarAt, dollarTicks, findCompany, giveUp, hasHint, initialOrder, isCorrect,
  isSubmittable, markShelf, monthMarks, newPuzzle, normalizeGuess, percentAt, percentTicks,
  recordFail, recordSolve, resultLine, scorecardLine, sectorVerdict, shelfCounts, shelfLine,
  shelfMark, submitGuess, suggestCompanies, verdictLabel, visibleWindow,
} from "../src/lib/guess/model";

const PUZZLES = puzzleData as Puzzle[];
const IDS = PUZZLES.map((p) => p.id);

let failures = 0;
const notes: string[] = [];

function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) {
    failures++;
    notes.push(`    ${name}${detail ? `: ${detail}` : ""}`);
  }
}

function report(test: string): void {
  const bad = notes.length;
  console.log(`${bad ? "FAIL" : "pass"}  ${test}`);
  for (const n of notes.splice(0, notes.length)) console.log(n);
}

// ------------------------------------------------------- test 1: matching

const byId = new Map(PUZZLES.map((p) => [p.id, p]));

function scramble(s: string): string {
  // the same word, shouted, spaced out and punctuated at random
  return `  ${s.toUpperCase().split("").join(s.length > 6 ? "" : ".")}!  `;
}

for (const p of PUZZLES) {
  for (const key of [p.name, p.ticker, ...p.aliases]) {
    check(`${p.id} solves on "${key}"`, isCorrect(p, key));
    check(`${p.id} solves on scrambled "${key}"`, isCorrect(p, scramble(key)));
  }
  check(`${p.id} ignores an empty guess`, !isCorrect(p, "   "));
}

// near misses never land, including one real company against another
const meta = byId.get("meta-2022");
if (meta) {
  for (const miss of ["google", "alphabet", "snap", "twitter", "met", "metaverse", "fbook"]) {
    check(`"${miss}" never solves Meta`, !isCorrect(meta, miss));
  }
}
for (const a of PUZZLES) {
  for (const b of PUZZLES) {
    if (a.name === b.name) continue;
    for (const key of answerKeys(a)) {
      check(`${a.name} key "${key}" never solves ${b.name}`, !isCorrect(b, key));
    }
  }
}
check("normalizer folds punctuation", normalizeGuess("The Coca-Cola Company") === normalizeGuess("coca cola"));
check("normalizer keeps a bare ticker", normalizeGuess("F") === "f");
report("test 1  matching");

// --------------------------------------------------- test 2: the ladder

{
  const p = PUZZLES[0];
  let s = newPuzzle(p.id);
  const seen: string[] = [];
  for (let i = 0; i < HINT_LADDER.length; i++) {
    s = dealHint(s);
    const dealt = dealtHints(s);
    check(`hint ${i + 1} is ${HINT_LADDER[i]}`, dealt[i] === HINT_LADDER[i]);
    check(`hint ${i + 1} adds exactly one`, dealt.length === i + 1);
    seen.push(dealt[i]);
  }
  check("the ladder never repeats", new Set(seen).size === HINT_LADDER.length);
  check("the ladder is four hints long", HINT_LADDER.length === 4, `${HINT_LADDER.length}`);
  check("the ladder opens on widen", HINT_LADDER[0] === "widen", HINT_LADDER[0]);
  check("the year is not on the ladder", !(HINT_LADDER as readonly string[]).includes("year"));
  check("the ladder runs out", !canDealHint(s));
  const past = dealHint(s);
  check("one press past the end changes nothing", past.hints === HINT_LADDER.length);

  let over = newPuzzle(p.id);
  over = submitGuess(over, p, p.name).state;
  check("a solved puzzle deals no more hints", dealHint(over).hints === 0);

  // hasHint agrees with the count at every step
  let t = newPuzzle(p.id);
  for (let i = 0; i < HINT_LADDER.length; i++) {
    check(`before ${HINT_LADDER[i]} it is unseen`, !hasHint(t, HINT_LADDER[i]));
    t = dealHint(t);
    check(`after ${HINT_LADDER[i]} it is seen`, hasHint(t, HINT_LADDER[i]));
  }
}
report("test 2  the hint ladder");

// ------------------------------------------------ test 3: data integrity

check("the pool is at least 20 puzzles", PUZZLES.length >= 20, `${PUZZLES.length} baked`);
check("puzzle ids are unique", new Set(IDS).size === IDS.length);

for (const p of PUZZLES) {
  const inYear = p.yearEndIndex - p.yearStartIndex + 1;
  check(`${p.id} has a full mystery year`, inYear >= 248, `${inYear} closes`);
  check(`${p.id} year indexes point at ${p.year}`,
    p.dates[p.yearStartIndex]?.startsWith(String(p.year)) &&
    p.dates[p.yearEndIndex]?.startsWith(String(p.year)));
  check(`${p.id} year start is the first day of ${p.year}`,
    p.yearStartIndex === 0 || !p.dates[p.yearStartIndex - 1].startsWith(String(p.year)));
  check(`${p.id} year end is the last day of ${p.year}`,
    p.yearEndIndex === p.dates.length - 1 ||
    !p.dates[p.yearEndIndex + 1].startsWith(String(p.year)));
  check(`${p.id} has widen data on a side`,
    p.yearStartIndex > 20 || p.dates.length - 1 - p.yearEndIndex > 20);
  check(`${p.id} par is 2 or 3`, p.par === 2 || p.par === 3, String(p.par));
  check(`${p.id} has a sector`, p.sector.trim().length > 0);
  check(`${p.id} has a story`, p.story.trim().length > 12);
  check(`${p.id} story is one sentence`, (p.story.match(/[.!?]/g) ?? []).length >= 1);
  check(`${p.id} has a market cap`, /^\$[\d.]+[BT]$/.test(p.marketCap), p.marketCap);
  check(`${p.id} dates and closes line up`, p.dates.length === p.closes.length);
  check(`${p.id} closes are real numbers`, p.closes.every((c) => Number.isFinite(c) && c > 0));
  check(`${p.id} dates rise`, p.dates.every((d, i) => i === 0 || d > p.dates[i - 1]));
  check(`${p.id} closes are rounded to 3 places`,
    p.closes.every((c) => Math.abs(c * 1000 - Math.round(c * 1000)) < 1e-6));
  check(`${p.id} has aliases`, p.aliases.length > 0);
}

// no alias shared by two different companies
const owner = new Map<string, string>();
for (const p of PUZZLES) {
  for (const key of answerKeys(p)) {
    const held = owner.get(key);
    check(`alias "${key}" belongs to one company`, held === undefined || held === p.name,
      held ? `${held} and ${p.name}` : "");
    owner.set(key, p.name);
  }
}
report("test 3  the baked pool");

// ------------------------------------------------------- test 4: the axis

for (const p of PUZZLES) {
  const base = p.closes[p.yearStartIndex];
  for (const i of [p.yearStartIndex, Math.floor((p.yearStartIndex + p.yearEndIndex) / 2), p.yearEndIndex]) {
    check(`${p.id} percent at ${i}`, Math.abs(percentAt(p, i) - (p.closes[i] / base - 1)) < 1e-12);
    check(`${p.id} dollars at ${i}`, dollarAt(p, i) === p.closes[i]);
  }
  check(`${p.id} january is zero percent`, Math.abs(percentAt(p, p.yearStartIndex)) < 1e-12);

  const narrow = visibleWindow(p, false);
  const wide = visibleWindow(p, true);
  check(`${p.id} the narrow window is the mystery year`,
    narrow.start === p.yearStartIndex && narrow.end === p.yearEndIndex);
  check(`${p.id} widening only adds days`,
    wide.start <= narrow.start && wide.end >= narrow.end && wide.end - wide.start > narrow.end - narrow.start);

  const marks = monthMarks(p, narrow, false);
  check(`${p.id} the mystery year has twelve months`, marks.length === 12, `${marks.length}`);
  check(`${p.id} four months carry a name`, marks.filter((m) => m.label).length === 4);
  const stamped = monthMarks(p, narrow, true);
  check(`${p.id} every axis label carries the free year`,
    stamped.every((m) => !m.label || m.label.endsWith(String(p.year))));
  const wideStamped = monthMarks(p, wide, true);
  check(`${p.id} the widened axis labels the side years too`,
    wideStamped.some((m) => m.label?.endsWith(String(p.year - 1))) ||
    wideStamped.some((m) => m.label?.endsWith(String(p.year + 1))));
}

// ticks land inside the range they are asked for and step evenly
for (const [min, max] of [[-0.62, 0.04], [-0.1, 0.2], [0, 3.4], [-0.02, 0.02]]) {
  const ticks = percentTicks(min, max);
  check(`percent ticks exist for ${min}..${max}`, ticks.length >= 2, `${ticks.length}`);
  check(`percent ticks stay in range for ${min}..${max}`, ticks.every((t) => t >= min - 1e-9 && t <= max + 1e-9));
}
check("a bad year gets a minus 25 line", percentTicks(-0.62, 0.04).some((t) => Math.abs(t + 0.25) < 1e-9));
check("a bad year gets a minus 50 line", percentTicks(-0.62, 0.04).some((t) => Math.abs(t + 0.5) < 1e-9));
check("a flat year still gets a zero line", percentTicks(-0.02, 0.02).some((t) => Math.abs(t) < 1e-9));
check("dollar ticks exist", dollarTicks(83, 200).length >= 2);
check("dollar ticks stay in range", dollarTicks(83, 200).every((t) => t >= 83 && t <= 200));
report("test 4  the axis");

// --------------------------------------------------- test 5: the scorecard

{
  const p = byId.get("aapl-2007") ?? PUZZLES[0];
  let stats: Stats = EMPTY_STATS;
  check("an empty scorecard says so", scorecardLine(stats) === "no puzzles yet");

  stats = recordSolve(stats, 0, 2);
  check("a clean solve counts", stats.solved === 1 && stats.streak === 1 && stats.hints === 0);
  stats = recordSolve(stats, 2, 2);
  check("an at par solve counts", stats.solved === 2 && stats.streak === 2 && stats.par === 4);
  stats = recordSolve(stats, 4, 2);
  check("an over par solve counts", stats.hints === 6 && stats.streak === 3);
  stats = recordFail(stats);
  check("a fail breaks the streak", stats.streak === 0 && stats.failed === 1 && stats.played === 4);
  check("averages read from the totals", scorecardLine(stats) === "solved 3 of 4 . streak 0 . 2.0 hints against par 2.0",
    scorecardLine(stats));
  stats = recordSolve(stats, 1, 3);
  check("the streak starts again", stats.streak === 1);

  // reload safety: the shape is plain JSON and survives a round trip
  const round: Stats = JSON.parse(JSON.stringify(stats));
  check("the scorecard survives a round trip", scorecardLine(round) === scorecardLine(stats));

  // the result line reads the way the reveal says it does
  const solvedWith = (hints: number): PuzzleState => {
    let s: PuzzleState = newPuzzle(p.id);
    for (let i = 0; i < hints; i++) s = dealHint(s);
    return submitGuess(s, p, p.aliases[0]).state;
  };
  check("no hints reads under par", resultLine(solvedWith(0), p) === "solved with no hints, two under par",
    resultLine(solvedWith(0), p));
  check("one hint reads one under par", resultLine(solvedWith(1), p) === "solved with 1 hint, one under par",
    resultLine(solvedWith(1), p));
  check("par reads at par", resultLine(solvedWith(2), p) === "solved with 2 hints, at par", resultLine(solvedWith(2), p));
  check("over par reads over par", resultLine(solvedWith(3), p) === "solved with 3 hints, one over par",
    resultLine(solvedWith(3), p));
  check("giving up reads revealed", resultLine(giveUp(newPuzzle(p.id)), p) === "revealed");

  // a wrong guess only joins the line, and never twice
  let play = newPuzzle(p.id);
  play = submitGuess(play, p, "Google").state;
  play = submitGuess(play, p, "google").state;
  play = submitGuess(play, p, "Amazon").state;
  check("wrong guesses queue in order", play.guesses.join(",") === "google,amazon", play.guesses.join(","));
  check("a wrong guess never ends the puzzle", play.status === "playing");
  const solved = submitGuess(play, p, "AAPL");
  check("the right guess ends it", solved.correct && solved.state.status === "solved");
  check("a solved puzzle takes no more guesses", submitGuess(solved.state, p, "tesla").ignored);
}
report("test 5  the scorecard");

// ------------------------------------------------------ test 6: the order

{
  let order: Order = initialOrder(IDS);
  check("the first run is the curated order", currentId(order) === IDS[0]);

  // a fixed sequence so a failure is reproducible
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let pass = 0; pass < 4; pass++) {
    const seen: string[] = [];
    for (let i = 0; i < IDS.length; i++) {
      seen.push(currentId(order));
      order = advanceOrder(order, IDS, rnd);
    }
    check(`pass ${pass + 1} repeats nothing`, new Set(seen).size === IDS.length, `${new Set(seen).size} of ${IDS.length}`);
    check(`pass ${pass + 1} covers the pool`, seen.every((id) => IDS.includes(id)));
  }

  // and no puzzle lands twice across the seam between two passes
  let o2 = initialOrder(IDS);
  for (let i = 0; i < IDS.length - 1; i++) o2 = advanceOrder(o2, IDS, rnd);
  const last = currentId(o2);
  o2 = advanceOrder(o2, IDS, rnd);
  check("a new pass does not open on the puzzle that closed the last", currentId(o2) !== last);
}
report("test 6  the deal order");

// --------------------------------------------------- test 7: the catalog

{
  check("the catalog is a real universe", COMPANIES.length >= 250, `${COMPANIES.length} companies`);

  // no ticker twice, and no name twice
  const tickers = new Map<string, string>();
  for (const c of COMPANIES) {
    const held = tickers.get(c.ticker);
    check(`ticker ${c.ticker} belongs to one company`, held === undefined, held ? `${held} and ${c.name}` : "");
    tickers.set(c.ticker, c.name);
  }

  // no key belongs to two companies, so a pick can never submit as another
  const holder = new Map<string, string>();
  for (const c of COMPANIES) {
    for (const key of companyKeys(c)) {
      const held = holder.get(key);
      check(`catalog key "${key}" belongs to one company`, held === undefined,
        held ? `${held} and ${c.name}` : "");
      holder.set(key, c.name);
    }
  }

  // every pool company is here, with the same ticker and the same sector, and
  // picking it off the catalog solves its puzzle
  for (const p of PUZZLES) {
    const entry = COMPANIES.find((c) => c.ticker === p.ticker);
    check(`${p.ticker} is in the catalog`, entry !== undefined);
    if (!entry) continue;
    check(`${p.ticker} carries the pool sector`, entry.sector === p.sector, `${entry.sector} vs ${p.sector}`);
    check(`${p.id} is solved by its catalog name`, isCorrect(p, entry.name), entry.name);
    check(`${p.id} is solved by its catalog ticker`, isCorrect(p, entry.ticker));
  }

  // sectors stay inside one lower case vocabulary
  for (const c of COMPANIES) {
    check(`${c.ticker} sector is lower case`, c.sector === c.sector.toLowerCase(), c.sector);
    check(`${c.ticker} has a name`, c.name.trim().length > 0);
  }

  // the typeahead: what a player sees after one letter
  const g = suggestCompanies("g");
  check("one letter returns rows", g.length === 6, `${g.length}`);
  check("g reaches Alphabet through google", g.some((s) => s.company.ticker === "GOOGL"),
    g.map((s) => s.company.name).join(", "));
  const goo = suggestCompanies("goo");
  check("goo puts Alphabet first", goo[0]?.company.ticker === "GOOGL", goo[0]?.company.name);
  check("goo shows the matched alias", goo[0]?.matched === "google", goo[0]?.matched);
  check("goog reaches Alphabet", suggestCompanies("goog")[0]?.company.ticker === "GOOGL");
  check("an exact ticker leads", suggestCompanies("f")[0]?.company.ticker === "F",
    suggestCompanies("f")[0]?.company.name);
  check("a household name leads", suggestCompanies("coke")[0]?.company.ticker === "KO");
  check("case and punctuation do not matter",
    suggestCompanies("  CoCa-CoLa ")[0]?.company.ticker === "KO");
  check("garbage returns nothing", suggestCompanies("zzqqxx").length === 0);
  check("an empty box returns nothing", suggestCompanies("   ").length === 0);
  check("the list is capped", suggestCompanies("a", 6).length <= 6);

  // only catalog entries can be submitted
  check("a real company can be submitted", isSubmittable("apple"));
  check("a ticker can be submitted", isSubmittable("aapl"));
  check("garbage cannot be submitted", !isSubmittable("zzqqxx"));
  check("a partial name cannot be submitted", !isSubmittable("appl"));
  check("findCompany returns nothing for garbage", findCompany("zzqqxx") === null);
  check("findCompany is exact", findCompany("apple")?.ticker === "AAPL");
}
report("test 7  the company catalog");

// ---------------------------------------------------- test 8: easy mode

{
  const apple = byId.get("aapl-2007");
  const tesla = byId.get("tsla-2020");
  if (apple) {
    check("a technology guess on a technology year reads same",
      sectorVerdict("microsoft", apple) === "same");
    check("an alias carries the same verdict", sectorVerdict("google", apple) === "same");
    check("a carmaker on a technology year reads different",
      sectorVerdict("ford", apple) === "different");
    check("a bank on a technology year reads different", sectorVerdict("citi", apple) === "different");
    check("an unknown name gets no tag", sectorVerdict("zzqqxx", apple) === null);
  }
  if (tesla) {
    check("a carmaker on a carmaker year reads same", sectorVerdict("ford", tesla) === "same");
    check("a technology name on a carmaker year reads different",
      sectorVerdict("microsoft", tesla) === "different");
  }
  check("the same tag reads plainly", verdictLabel("same") === "same sector");
  check("the different tag reads plainly", verdictLabel("different") === "different sector");
  check("no verdict has no words", verdictLabel(null) === "");

  // every pool answer can be tagged against every catalog company, and the
  // answer's own company always reads same
  for (const p of PUZZLES) {
    const entry = COMPANIES.find((c) => c.ticker === p.ticker);
    if (entry) check(`${p.id} reads same against itself`, sectorVerdict(entry.name, p) === "same");
  }
}
report("test 8  easy mode");

// -------------------------------------------------- test 9: the shelf

{
  let shelf: Shelf = EMPTY_SHELF;
  check("an empty shelf knows nothing", shelfMark(shelf, IDS[0]) === null);
  check("an empty shelf counts every puzzle as locked", shelfCounts(shelf, IDS).locked === IDS.length);

  shelf = markShelf(shelf, IDS[0], "solved");
  shelf = markShelf(shelf, IDS[1], "revealed");
  check("a solve is remembered", shelfMark(shelf, IDS[0]) === "solved");
  check("a reveal is remembered", shelfMark(shelf, IDS[1]) === "revealed");
  const counts = shelfCounts(shelf, IDS);
  check("the counts add up",
    counts.solved === 1 && counts.revealed === 1 && counts.locked === IDS.length - 2,
    JSON.stringify(counts));

  // a solve outranks a reveal, and nothing already earned is taken away
  shelf = markShelf(shelf, IDS[1], "solved");
  check("solving a revealed puzzle promotes it", shelfMark(shelf, IDS[1]) === "solved");
  shelf = markShelf(shelf, IDS[1], "revealed");
  check("revealing a solved puzzle never demotes it", shelfMark(shelf, IDS[1]) === "solved");

  check("the shelf line reads plainly",
    shelfLine(shelf, IDS) === `2 solved . 0 revealed . ${IDS.length} in the pool`,
    shelfLine(shelf, IDS));

  // plain JSON, so a reload finds it exactly as it was left
  const round: Shelf = JSON.parse(JSON.stringify(shelf));
  check("the shelf survives a round trip", shelfLine(round, IDS) === shelfLine(shelf, IDS));
  check("marking never mutates the shelf handed in", Object.keys(EMPTY_SHELF).length === 0);
}
report("test 9  the collection shelf");

// ----------------------------------------------------- test 10: stream order

{
  // the front of the stream is the recognisable end of the pool and the back is
  // the deep cuts, so a first run opens on a chart a player has seen before
  const front = IDS.slice(0, 6);
  const back = IDS.slice(-6);
  for (const id of ["gme-2021", "tsla-2020", "nvda-2023", "aapl-2007"]) {
    check(`${id} opens the stream`, front.includes(id), front.join(", "));
  }
  for (const id of ["ko-1985", "ibm-1993", "wmt-1999", "sbux-2008"]) {
    check(`${id} sits at the back`, back.includes(id), back.join(", "));
  }
  check("the deal opens on the first of the stream", currentId(initialOrder(IDS)) === IDS[0]);
  check("the pool is still whole", IDS.length === 30, `${IDS.length}`);
}
report("test 10  the stream order");

// ----------------------------------------------------- test 11: copy audit

{
  const files = [
    "src/lib/guess/model.ts",
    "src/pages/GuessTheStock.tsx",
    "tools/bake_guess.mjs",
    "tools/guessSim.ts",
    "tools/guesscheck.mjs",
    "tools/guessPool.mjs",
    "tools/reshape_guess.mjs",
    "src/pages/Landing.tsx",
    "src/data/companyCatalog.ts",
  ];
  // spelled by code point so this file can hunt the character without carrying
  // one, which would fail its own audit
  const EM_DASH = String.fromCharCode(0x2014);
  const EN_DASH = String.fromCharCode(0x2013);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    check(`${f} has no em dash`, !text.includes(EM_DASH));
    check(`${f} has no en dash in prose`, !text.includes(` ${EN_DASH} `));
  }
  for (const p of PUZZLES) {
    check(`${p.id} story has no em dash`, !p.story.includes(EM_DASH));
    check(`${p.id} sector is lower case`, p.sector === p.sector.toLowerCase());
  }
  const model = readFileSync("src/lib/guess/model.ts", "utf8");
  const page = readFileSync("src/pages/GuessTheStock.tsx", "utf8");
  check("no stroke language in the model", !/\bstrokes?\b/i.test(model));
  check("no stroke language in the page", !/\bstroke\b(?!-|s?[A-Z])/.test(page.replace(/stroke(Width|Linejoin)?=/g, "")));
}
report("test 11  copy audit");

// ------------------------- test 8: split disclosure and finished-state no-ops

{
  // the five puzzles with a split inside their mystery year, plus the two whose
  // padding year splits, carry the flag; everything else must not
  const flagged = new Set(["tsla-2020", "amzn-1998", "csco-2000", "intc-2000", "wmt-1999", "gme-2021", "nvda-2023"]);
  for (const p of PUZZLES) {
    check(`${p.id} split disclosure is ${flagged.has(p.id) ? "on" : "off"}`,
      Boolean(p.splitAdjusted) === flagged.has(p.id));
  }

  // a failed puzzle is as inert as a solved one
  const p = byId.get("aapl-2007") ?? PUZZLES[0];
  const failed = giveUp(dealHint(newPuzzle(p.id)));
  check("a failed puzzle deals no more hints", dealHint(failed).hints === failed.hints);
  const after = submitGuess(failed, p, p.aliases[0]);
  check("a failed puzzle takes no guesses", after.state.status === failed.status && after.state.guesses.length === failed.guesses.length);
}
report("test 8  split disclosure and finished-state no-ops");

console.log(failures === 0 ? "\nall tests pass" : `\n${failures} checks failed`);
if (failures > 0) process.exit(1);
