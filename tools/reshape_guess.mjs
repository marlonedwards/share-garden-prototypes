// Re-apply the curated manifest to the already baked puzzles: stream order,
// par, sector, market cap, story, aliases and decoys. Prices are never touched and
// Yahoo is never asked, so changing how the pool is ordered or scored costs
// nothing and cannot move a single close.
//
// Run it with: node tools/reshape_guess.mjs
import { readFileSync, writeFileSync } from "fs";
import { POOL } from "./guessPool.mjs";

const path = "src/data/guessPuzzles.json";
const baked = JSON.parse(readFileSync(path, "utf8"));
const byId = new Map(baked.map((p) => [p.id, p]));

const out = [];
const missing = [];
for (const m of POOL) {
  const p = byId.get(m.id);
  if (!p) {
    missing.push(m.id);
    continue;
  }
  const parChanged = p.par !== m.par ? ` par ${p.par} to ${m.par}` : "";
  out.push({
    ...p,
    name: m.name,
    ticker: m.ticker,
    aliases: m.aliases,
    sector: m.sector,
    year: m.year,
    marketCap: m.marketCap,
    story: m.story,
    par: m.par,
    decoys: m.decoys,
  });
  console.log(`${String(out.length).padStart(2)} ${m.id.padEnd(11)} par ${m.par}${parChanged}`);
}

const dropped = baked.filter((p) => !POOL.some((m) => m.id === p.id));
if (dropped.length) console.log("not in the manifest, dropped:", dropped.map((p) => p.id).join(", "));
if (missing.length) console.log("in the manifest but never baked:", missing.join(", "));

writeFileSync(path, JSON.stringify(out));
console.log(`\nreshaped ${out.length} puzzles in stream order, prices untouched`);
