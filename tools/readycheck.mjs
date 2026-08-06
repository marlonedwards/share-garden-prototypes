// Sanity checks for the finale's asset shelf in src/lib/readyAssets.ts.
// Run: node tools/readycheck.mjs  (exits 1 on any failure)
//
// The shelf states, in the file header and in user-facing copy on the shelf
// screen and the printed plan, that its numbers are rounded closing prices as
// of READY_AS_OF. This script holds it to that: every shelf price must sit
// within a rounding tolerance of the verified close for that date.
//
// Expected values are the actual 2026-01-02 closes from Yahoo daily data
// (BRK.B fetched as BRK-B, the coins as BTC-USD and ETH-USD), re-verified
// 2026-08-06. Tolerance is 3 percent: wide enough for friendly rounding
// (SCHD 27 vs 27.73 is the widest honest gap on the shelf at 2.6 percent),
// tight enough to catch a stale or invented figure.
//
// The shelf is TypeScript, so this script parses the source text rather than
// importing it: each entry is one literal on one line, extracted by regex.
import { readFileSync } from "fs";

const src = readFileSync(new URL("../src/lib/readyAssets.ts", import.meta.url), "utf8");
let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
};

// ---- the as-of date every surface quotes ----
const asOf = /READY_AS_OF = "([^"]+)"/.exec(src)?.[1];
check('READY_AS_OF is "January 2, 2026"', asOf === "January 2, 2026", `got "${asOf}"`);

// ---- parse the shelf ----
const entries = [];
const re = /\{ id: "([a-z]+)", name: "[^"]+", ticker: "([^"]+)", kind: "[a-z]+", price: ([\d.]+),/g;
for (let m; (m = re.exec(src)); ) entries.push({ id: m[1], ticker: m[2], price: Number(m[3]) });
check("shelf parses to 20 entries", entries.length === 20, `got ${entries.length}`);

// ---- verified closes for 2026-01-02 ----
const CLOSES = {
  VOO: 628.30, VTI: 336.31, VXUS: 76.54, QQQ: 613.12, SCHD: 27.73,
  AAPL: 271.01, MSFT: 472.94, GOOGL: 315.15, AMZN: 226.50, NVDA: 188.85,
  TSLA: 438.07, "BRK.B": 496.85, JPM: 325.48, WMT: 112.76, KO: 69.12,
  DIS: 111.85, V: 346.48, BND: 74.04, BTC: 89944.70, ETH: 3124.42,
};
const TOL = 0.03;

for (const e of entries) {
  const actual = CLOSES[e.ticker];
  if (actual === undefined) {
    failures++;
    console.log(`FAIL ${e.ticker}: no verified close on record; add it to CLOSES`);
    continue;
  }
  const err = Math.abs(e.price - actual) / actual;
  check(
    `${e.ticker.padEnd(6)} shelf ${e.price} vs close ${actual}`,
    err <= TOL,
    `off ${(err * 100).toFixed(2)}% (tolerance ${(TOL * 100).toFixed(0)}%)`
  );
}
for (const t of Object.keys(CLOSES)) {
  if (!entries.some((e) => e.ticker === t)) {
    failures++;
    console.log(`FAIL ${t}: expected on the shelf but not found`);
  }
}

console.log(failures === 0 ? "\nAll readyAssets checks passed." : `\n${failures} readyAssets check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
