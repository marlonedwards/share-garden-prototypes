// Bake the Guess the Stock puzzle pool into src/data/guessPuzzles.json.
//
// One puzzle is one real company and one real calendar year of daily closes,
// plus a real year on each side so the widen hint has somewhere to go. Prices
// come from Yahoo's chart API the same way tools/bake_era.mjs takes them: the
// split and dividend adjusted series is kept, then rescaled so it starts at the
// real quoted price on the mystery year's first trading day. That keeps the
// shape honest and keeps the dollar hint at the scale the era actually quoted.
//
// Because the kept series is the adjusted one, a year of dividends rides along
// inside it, so a high paying stock reads a percent or two above its bare quote
// by December. The shape and the January anchor are the honest parts, and a
// split inside the mystery year never puts a false cliff in the line.
//
// The curated manifest lives in tools/guessPool.mjs, so the order, the pars and
// the stories can be reshaped by tools/reshape_guess.mjs without asking Yahoo
// for anything again.
//
// Run it with: node tools/bake_guess.mjs
import { writeFileSync } from "fs";
import { POOL } from "./guessPool.mjs";

// The same header bake_era.mjs sends. Yahoo answers this one and rate limits a
// fuller Chrome string, so it is copied here exactly rather than dressed up.
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };

// The pool, in the order it is dealt on a first run: most iconic first.

// Yahoo wants seconds. The window runs from Jan 1 of the year before through
// Dec 31 of the year after, which is what the widen hint reveals.
function utcSeconds(y, m, d) {
  return Math.floor(Date.UTC(y, m, d) / 1000);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Yahoo rate limits bursts with a 429, so a refused call waits and tries again
// rather than dropping a puzzle that has perfectly good data behind it.
async function getJson(url, attempts = 4) {
  let last = "";
  for (let i = 0; i < attempts; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    last = `http ${r.status}`;
    await sleep(2000 * (i + 1));
  }
  throw new Error(last);
}

/**
 * Yahoo quotes every past close on today's share basis, so a 2007 Apple close
 * comes back at 2.99 rather than the 83.80 the screen actually read that day.
 * This asks for every split from the mystery year to now and multiplies them
 * back in, which puts the first day of the mystery year at the price the era
 * really quoted. Reverse splits come back as ratios below one and work the same
 * way.
 */
async function splitFactorSince(ticker, year) {
  const period1 = utcSeconds(year, 0, 1);
  const period2 = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1mo&events=div%2Csplit`;
  const j = await getJson(url);
  const splits = j?.chart?.result?.[0]?.events?.splits ?? {};
  let factor = 1;
  const applied = [];
  for (const s of Object.values(splits)) {
    const num = Number(s.numerator), den = Number(s.denominator);
    if (!num || !den) continue;
    factor *= num / den;
    applied.push(`${new Date(s.date * 1000).toISOString().slice(0, 10)} ${num}:${den}`);
  }
  return { factor, applied };
}

async function fetchDaily(ticker, year) {
  const period1 = utcSeconds(year - 1, 0, 1);
  const period2 = utcSeconds(year + 1, 11, 31) + 86400;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplit`;
  const j = await getJson(url);
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(j?.chart?.error?.description ?? "no result");
  const ts = res.timestamp ?? [];
  const rawClose = res.indicators?.quote?.[0]?.close ?? [];
  const adjRaw = res.indicators?.adjclose?.[0]?.adjclose ?? rawClose;
  if (!ts.length) throw new Error("no timestamps");
  // any split event Yahoo returns for this window means the dollar labels past
  // it drift from the era's quoted scale, so the chart owns up with a note
  const splitsInWindow = Object.keys(res.events?.splits ?? {}).length > 0;

  // one row per calendar day, nulls dropped, dates in UTC like bake_era
  const rows = [];
  const seen = new Set();
  for (let i = 0; i < ts.length; i++) {
    const adj = adjRaw[i], raw = rawClose[i];
    if (adj == null || raw == null) continue;
    const d = new Date(ts[i] * 1000);
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (seen.has(date)) continue;
    seen.add(date);
    rows.push({ date, adj, raw });
  }
  return { rows, splitsInWindow };
}

const puzzles = [];
const dropped = [];

for (const p of POOL) {
  try {
    const { rows, splitsInWindow } = await fetchDaily(p.ticker, p.year);
    const stamp = String(p.year);
    const yearStartIndex = rows.findIndex((r) => r.date.slice(0, 4) === stamp);
    let yearEndIndex = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].date.slice(0, 4) === stamp) { yearEndIndex = i; break; }
    }
    if (yearStartIndex < 0 || yearEndIndex < 0) throw new Error("mystery year missing");
    const inYear = yearEndIndex - yearStartIndex + 1;
    if (inYear < 248) throw new Error(`only ${inYear} closes in ${p.year}`);

    // rescale the adjusted series so it starts at the real quoted price on the
    // mystery year's first trading day
    await sleep(600);
    const { factor, applied } = await splitFactorSince(p.ticker, p.year);
    const first = rows[yearStartIndex];
    const realFirst = first.raw * factor;
    const scale = first.adj ? realFirst / first.adj : 1;
    const closes = rows.map((r) => +(r.adj * scale).toFixed(3));
    if (closes.some((c) => !Number.isFinite(c) || c <= 0)) throw new Error("bad close");

    puzzles.push({
      id: p.id,
      name: p.name,
      ticker: p.ticker,
      aliases: p.aliases,
      sector: p.sector,
      year: p.year,
      marketCap: p.marketCap,
      story: p.story,
      par: p.par,
      dates: rows.map((r) => r.date),
      closes,
      yearStartIndex,
      yearEndIndex,
      ...(splitsInWindow ? { splitAdjusted: true } : {}),
    });
    console.log(
      `ok   ${p.id.padEnd(11)} ${String(rows.length).padStart(4)} days, ` +
        `${inYear} in ${p.year}, jan ${closes[yearStartIndex].toFixed(2)}, ` +
        `dec ${closes[yearEndIndex].toFixed(2)}` +
        (applied.length ? `, unsplit ${applied.join(" ")}` : ""),
    );
  } catch (e) {
    dropped.push({ id: p.id, reason: e.message });
    console.log(`drop ${p.id.padEnd(11)} ${e.message}`);
  }
  await sleep(900);
}

if (puzzles.length < 20) {
  console.error(`only ${puzzles.length} puzzles baked, need at least 20`);
  process.exit(1);
}

const json = JSON.stringify(puzzles);
writeFileSync("src/data/guessPuzzles.json", json);
console.log(
  `\nbaked ${puzzles.length} puzzles, ${(json.length / 1024).toFixed(0)} KB` +
    (dropped.length ? `, dropped ${dropped.map((d) => d.id).join(", ")}` : ", nothing dropped"),
);
