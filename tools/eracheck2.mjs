// Sanity checks for src/data/eraCovid.json against known market history.
// Run: node tools/eracheck2.mjs  (exits 1 on any failure)
//
// The dataset is Yahoo's dividend-and-split-adjusted monthly series rescaled
// so each series starts at its first monthly close in Yahoo's present-day
// split basis (see tools/bake_era3.mjs for the split factors). That means:
// - Non-dividend payers (AMZN, TSLA, ZM, PTON) must match known quoted
//   closes, converted by the documented split factor, almost exactly.
// - Dividend payers (AAPL, NVDA, and GME which paid dividends into 2019)
//   drift a few percent ABOVE the quoted close as reinvested dividends
//   accumulate, so their later anchors carry a wider tolerance.
// - ^SP500TR is the S&P 500 total return index itself, so its December
//   ratios must reproduce the published annual total returns to the digit.
//
// Every expected value below is a known, publicly documented price:
// e.g. AAPL closed January 2019 at $166.44 (41.61 after the 2020 4-for-1
// split), AMZN closed 2022 at $84.00, TSLA closed 2019 at $418.33 (27.89
// after 15x of splits), ZM's peak monthly close was $478.36 in November
// 2020 (its intraday peak of $588.84 came in October, but October's monthly
// close was $460.91), PTON closed 2020 at $151.72, GME closed January 2021
// at $325.00 ($81.25 post-split), and the S&P 500 returned +18.40, +28.71,
// -18.11, +26.29 and +25.02 percent with dividends in 2020 through 2024.
import { readFileSync } from "fs";

const d = JSON.parse(readFileSync(new URL("../src/data/eraCovid.json", import.meta.url), "utf8"));
let failures = 0;
const idx = (m) => d.months.indexOf(m);
const val = (s, m) => d.series[s][idx(m)];
const check = (label, actual, expected, tolFrac) => {
  const err = Math.abs(actual - expected) / expected;
  const ok = err <= tolFrac;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: got ${actual.toFixed(4)}, expected ${expected} (±${(tolFrac * 100).toFixed(1)}%, off ${(err * 100).toFixed(2)}%)`);
};

// ---- structure ----
const months = d.months;
if (months[0] !== "2019-01" || months[months.length - 1] !== "2024-12" || months.length !== 72) {
  failures++;
  console.log(`FAIL months: ${months[0]}..${months[months.length - 1]} (${months.length}), expected 2019-01..2024-12 (72)`);
} else console.log("ok   months: 2019-01 to 2024-12, 72 rows");
for (const s of ["AAPL", "AMZN", "NVDA", "TSLA", "ZM", "PTON", "GME", "^SP500TR"]) {
  const a = d.series[s];
  if (!a || a.length !== 72 || a.some((x) => typeof x !== "number" || !isFinite(x) || x <= 0)) {
    failures++;
    console.log(`FAIL series ${s}: missing, wrong length, or non-positive entries`);
  } else console.log(`ok   series ${s}: 72 positive numbers`);
}

// ---- AAPL (4-for-1 split 2020-08-31; pays dividends, so later anchors sit
// a few percent above the quoted split-adjusted close) ----
check("AAPL 2019-01 ($166.44 quoted /4)", val("AAPL", "2019-01"), 41.61, 0.005);
check("AAPL 2020-03 ($254.29 quoted /4)", val("AAPL", "2020-03"), 63.57, 0.03);
check("AAPL 2020-08 ($129.04, post-split)", val("AAPL", "2020-08"), 129.04, 0.03);
check("AAPL 2021-12 ($177.57)", val("AAPL", "2021-12"), 177.57, 0.05);
check("AAPL 2024-12 ($250.42)", val("AAPL", "2024-12"), 250.42, 0.07);

// ---- AMZN (20-for-1 split 2022-06-06; no dividends, near-exact) ----
check("AMZN 2019-01 ($1,718.73 quoted /20)", val("AMZN", "2019-01"), 85.94, 0.005);
check("AMZN 2020-08 ($3,450.96 quoted /20)", val("AMZN", "2020-08"), 172.55, 0.01);
check("AMZN 2020-12 ($3,256.93 quoted /20)", val("AMZN", "2020-12"), 162.85, 0.01);
check("AMZN 2022-12 ($84.00, post-split)", val("AMZN", "2022-12"), 84.0, 0.01);
check("AMZN 2024-12 ($219.39)", val("AMZN", "2024-12"), 219.39, 0.01);

// ---- NVDA (4-for-1 2021-07-20 then 10-for-1 2024-06-10; tiny dividend) ----
check("NVDA 2019-12 ($235.30 quoted /40)", val("NVDA", "2019-12"), 5.88, 0.02);
check("NVDA 2020-12 ($522.20 quoted /40)", val("NVDA", "2020-12"), 13.06, 0.02);
check("NVDA 2021-12 ($294.11 quoted /10)", val("NVDA", "2021-12"), 29.41, 0.02);
check("NVDA 2022-12 ($146.14 quoted /10)", val("NVDA", "2022-12"), 14.61, 0.02);
check("NVDA 2024-12 ($134.29, post-split)", val("NVDA", "2024-12"), 134.29, 0.02);

// ---- TSLA (5-for-1 2020-08-31 then 3-for-1 2022-08-25; no dividends) ----
check("TSLA 2019-01 ($307.02 quoted /15)", val("TSLA", "2019-01"), 20.47, 0.005);
check("TSLA 2019-12 ($418.33 quoted /15)", val("TSLA", "2019-12"), 27.89, 0.005);
check("TSLA 2020-12 ($705.67 quoted /3)", val("TSLA", "2020-12"), 235.22, 0.005);
check("TSLA 2021-12 ($1,056.78 quoted /3)", val("TSLA", "2021-12"), 352.26, 0.005);
check("TSLA 2022-12 ($123.18, post-splits)", val("TSLA", "2022-12"), 123.18, 0.005);

// ---- ZM (listed 2019-04-18; never split, no dividends) ----
check("ZM 2019-12 ($68.04)", val("ZM", "2019-12"), 68.04, 0.01);
check("ZM 2020-10 ($460.91)", val("ZM", "2020-10"), 460.91, 0.01);
check("ZM 2020-11 ($478.36, the peak monthly close)", val("ZM", "2020-11"), 478.36, 0.01);
// confirm nothing in the series exceeds the documented peak monthly close
if (Math.max(...d.series.ZM) !== val("ZM", "2020-11")) {
  failures++;
  console.log("FAIL ZM peak: series maximum is not the 2020-11 close");
} else console.log("ok   ZM peak: 2020-11 is the series maximum");
check("ZM 2020-12 ($337.32)", val("ZM", "2020-12"), 337.32, 0.01);
check("ZM 2021-12 ($183.91)", val("ZM", "2021-12"), 183.91, 0.02);
check("ZM 2022-12 ($67.76)", val("ZM", "2022-12"), 67.76, 0.01);
// pre-listing months are backfilled flat at the first month-end close
// (not the first traded close: ZM's first daily close was $62.00 on
// 2019-04-18, but the monthly tape's first real row is the 2019-04 close).
// listedAtStep in the era content keeps these backfill rows off every
// player surface: they exist only to keep the series arrays rectangular
if (val("ZM", "2019-01") !== val("ZM", "2019-04")) {
  failures++;
  console.log("FAIL ZM backfill: 2019-01 should equal the 2019-04 month-end close");
} else console.log("ok   ZM backfill: pre-listing months hold the April 2019 close");

// ---- PTON (listed 2019-09-26; never split, no dividends) ----
check("PTON 2019-09 ($25.10, the IPO month close)", val("PTON", "2019-09"), 25.1, 0.02);
check("PTON 2019-12 ($28.40)", val("PTON", "2019-12"), 28.4, 0.01);
check("PTON 2020-12 ($151.72)", val("PTON", "2020-12"), 151.72, 0.01);
check("PTON 2021-12 ($35.76)", val("PTON", "2021-12"), 35.76, 0.01);
check("PTON 2022-12 ($7.94)", val("PTON", "2022-12"), 7.94, 0.01);
if (val("PTON", "2019-01") !== val("PTON", "2019-09")) {
  failures++;
  console.log("FAIL PTON backfill: 2019-01 should equal the 2019-09 month-end close");
} else console.log("ok   PTON backfill: pre-listing months hold the September 2019 close");

// ---- GME (4-for-1 split 2022-07-22; paid dividends into 2019, so anchors
// after mid-2019 drift about 3.4 percent above the quoted close) ----
check("GME 2019-01 ($11.34 quoted /4)", val("GME", "2019-01"), 2.835, 0.005);
check("GME 2021-01 ($325.00 quoted /4)", val("GME", "2021-01"), 81.25, 0.05);
check("GME 2021-05 ($222.00 quoted /4)", val("GME", "2021-05"), 55.5, 0.05);
check("GME 2022-12 ($18.46, post-split)", val("GME", "2022-12"), 18.46, 0.05);
check("GME 2024-12 ($31.34, post-split)", val("GME", "2024-12"), 31.34, 0.05);

// ---- ^SP500TR (the S&P 500 total return index; December-over-December
// ratios must reproduce the published annual total returns) ----
check("^SP500TR 2019-12 level (6,553.57)", val("^SP500TR", "2019-12"), 6553.57, 0.005);
check("^SP500TR 2020 total return (+18.40%)", val("^SP500TR", "2020-12") / val("^SP500TR", "2019-12"), 1.184, 0.005);
check("^SP500TR 2021 total return (+28.71%)", val("^SP500TR", "2021-12") / val("^SP500TR", "2020-12"), 1.2871, 0.005);
check("^SP500TR 2022 total return (-18.11%)", val("^SP500TR", "2022-12") / val("^SP500TR", "2021-12"), 0.8189, 0.005);
check("^SP500TR 2023 total return (+26.29%)", val("^SP500TR", "2023-12") / val("^SP500TR", "2022-12"), 1.2629, 0.005);
check("^SP500TR 2024 total return (+25.02%)", val("^SP500TR", "2024-12") / val("^SP500TR", "2023-12"), 1.2502, 0.005);

console.log(failures === 0 ? "\nAll eraCovid checks passed." : `\n${failures} eraCovid check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
