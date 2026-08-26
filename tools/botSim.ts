// Headless harness for the bot shelf. Every bot in src/lib/trigger/bots is
// compiled by the real compiler and played through the real action law
// (src/lib/trigger/bot.ts) against thousands of random tapes: geometric
// walks with shock months, flat tapes, penny prices, unaffordable prices and
// companies that die mid run. A shelf bot that ever breaks a rule is a
// shipped crash, so any error here is a failure, not a report.
//
//   file_names          every bot file declares the function it is named for
//   scaffold_assembles  the assembled scaffold compiles and picks PLAYER
//   solo_compiles       every bot also compiles alone
//   fuzz_<bot>          N tapes: no rule broken, the account stays finite and
//                       non-negative, and the bot traded somewhere in the batch
//
// The tapes are seeded, and Math.random is replaced by the tape's own seeded
// stream while a bot plays, so a failure reproduces from the printed tape
// number alone, randomBot included.
//
// Run it with: npx tsx tools/botSim.ts [tapes per bot]   (default 1000)

import { readFileSync, readdirSync } from "node:fs";
import type { RunState } from "../src/lib/tape/engine";
import type { BotFn } from "../src/lib/trigger/bot";
import { botAct, compileBot } from "../src/lib/trigger/bot";
import { PLAYER, assembleScaffold, shelfNames } from "../src/lib/trigger/bots/assemble";

declare const process: { argv: string[]; exit(code: number): never };

const TAPES = (() => {
  const n = Number(process.argv[2]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1000;
})();

// ------------------------------------------------------------------ the shelf

const DIR = new URL("../src/lib/trigger/bots/", import.meta.url);
const files: Record<string, string> = {};
for (const f of readdirSync(DIR)) {
  if (!f.endsWith(".js")) continue;
  files[f.replace(/\.js$/, "")] = readFileSync(new URL(f, DIR), "utf8");
}
const names = shelfNames(files);

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  if (!ok) failures += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(26)}  ${detail}`);
}

// ------------------------------------------------------------------ the tapes

// Deterministic and fast; the standard 32 bit mixer.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

// A monthly close series a bot might meet: a geometric walk with a random
// start (sometimes over the starting cash, sometimes pennies), random
// volatility and drift, rare shock months, the odd flat tape, and one run in
// six ending in a company that goes to zero and stays there.
function makeTape(rnd: () => number): number[] {
  const len = 12 + Math.floor(rnd() * 189);
  let p = 0.5 + rnd() * rnd() * 800;
  const vol = 0.02 + rnd() * 0.23;
  const drift = (rnd() - 0.48) * 0.02;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(p);
    p *= Math.exp(drift + vol * gauss(rnd));
    if (rnd() < 0.01) p *= 0.05 + rnd() * 19.95;
    if (p < 1e-4) p = 1e-4;
  }
  if (rnd() < 0.05) out.fill(out[0]);
  if (rnd() < 1 / 6) {
    const at = 1 + Math.floor(rnd() * (len - 1));
    for (let i = at; i < len; i++) out[i] = 0;
  }
  return out;
}

// The smallest honest RunState: one synthetic ticker, the same fields the
// law reads on the page. No engine run is dealt because the whole point is
// tapes the baked eras never contain.
function fuzzRun(series: number[]): RunState {
  const months = series.map((_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
  return {
    era: "covid", months, startIndex: 0, tickers: ["FUZZ"],
    prices: { FUZZ: series }, death: { FUZZ: null }, speed: 1.6,
    startCash: 1000, t: 0, cash: 1000, holdings: { FUZZ: 0 }, trades: [],
  };
}

// One run, exactly as the page drives it: the bot acts on every close except
// the last, and the account must stay finite and non-negative throughout.
function playTape(bot: BotFn, series: number[]): { error: string } | { trades: number } {
  let run = fuzzRun(series);
  const last = series.length - 1;
  for (let month = 0; month < last; month++) {
    const acted = botAct(run, "FUZZ", bot, month);
    if ("error" in acted) return { error: `month ${month}: ${acted.error}` };
    run = acted.run;
    const shares = run.holdings.FUZZ;
    if (!Number.isFinite(run.cash) || !Number.isFinite(shares) || run.cash < 0 || shares < 0) {
      return { error: `month ${month}: account went bad, cash ${run.cash}, shares ${shares}` };
    }
  }
  return { trades: run.trades.length };
}

// ------------------------------------------------------------------ the checks

const misnamed = names.filter((n) => !new RegExp(`function ${n}\\(prices, shares, cash\\)`).test(files[n]));
check("file_names", names.length > 0 && misnamed.length === 0,
  misnamed.length ? `misnamed: ${misnamed.join(", ")}` : `${names.length} bots, each declaring the function it is named for`);

const scaffold = assembleScaffold(files);
const whole = compileBot(scaffold);
check("scaffold_assembles", !("error" in whole) && scaffold.trimEnd().endsWith(`bot = ${PLAYER};`),
  "error" in whole ? whole.error : `${scaffold.split("\n").length} lines ending in bot = ${PLAYER}`);

const broken = names
  .map((n) => ({ n, res: compileBot(`${files[n]}\nbot = ${n};`) }))
  .filter((x): x is { n: string; res: { error: string } } => "error" in x.res);
check("solo_compiles", broken.length === 0,
  broken.length ? broken.map((x) => `${x.n}: ${x.res.error}`).join("; ") : `all ${names.length} compile alone`);

const realRandom = Math.random;
for (const name of names) {
  let traded = 0;
  let failed: string | null = null;
  for (let i = 0; i < TAPES && failed === null; i++) {
    const rnd = mulberry32(0x9e3779b9 + i);
    const series = makeTape(rnd);
    const compiled = compileBot(`${files[name]}\nbot = ${name};`);
    if ("error" in compiled) {
      failed = `tape ${i}: ${compiled.error}`;
      break;
    }
    Math.random = rnd;
    const played = playTape(compiled.bot, series);
    Math.random = realRandom;
    if ("error" in played) failed = `tape ${i}: ${played.error}`;
    else traded += played.trades;
  }
  check(`fuzz_${name}`, failed === null && traded > 0,
    failed ?? `${TAPES} tapes, ${traded} trades, no rule broken`);
}

console.log(failures === 0
  ? `\nBOTS: every check passes at ${TAPES} tapes per bot`
  : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
