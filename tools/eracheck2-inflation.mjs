// Sanity checks for src/data/eraInflation.json against known market history,
// run before committing a bake (docs/overnight-plan.md, W5). Kept beside
// tools/eracheck2.mjs (the covid-era checks) as its own file so the two
// parallel workstreams never write the same script; the final sweep runs
// both. Run: node tools/eracheck2-inflation.mjs  (exits 1 on any failure)
//
// The dataset is Yahoo's dividend-and-split-adjusted monthly series with
// each series re-anchored at its real January 2021 close (the WMT 3-for-1
// split of 2024-02-26 is the one split in the window; the factor is
// documented in tools/bake_era_inflation.mjs). That means:
// - Starting values must match the real, verified closes of January 29,
//   2021 almost exactly.
// - Later values carry reinvested dividends, so for the dividend payers the
//   honest later checks are published calendar-year TOTAL returns, plus
//   quoted-close anchors with a dividend-drift tolerance.
// - ^SP500TR is the S&P 500 total return index itself, so its December
//   ratios must reproduce the published annual total returns to the digit
//   (+28.71, -18.11, +26.29, +25.02 percent for 2021 through 2024).
import { readFileSync } from "fs";

const d = JSON.parse(readFileSync(new URL("../src/data/eraInflation.json", import.meta.url), "utf8"));
let failures = 0;
const idx = (m) => d.months.indexOf(m);
const val = (s, m) => d.series[s][idx(m)];
const ret = (s, a, b) => val(s, b) / val(s, a);
const check = (label, actual, expected, tolFrac) => {
  const err = Math.abs(actual - expected) / Math.abs(expected);
  const ok = err <= tolFrac;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: got ${actual.toFixed(4)}, expected ${expected} (±${(tolFrac * 100).toFixed(1)}%, off ${(err * 100).toFixed(2)}%)`);
};

// ---- structure ----
const months = d.months;
if (months[0] !== "2021-01" || months[months.length - 1] !== "2024-12" || months.length !== 48) {
  failures++;
  console.log(`FAIL months: ${months[0]}..${months[months.length - 1]} (${months.length}), expected 2021-01..2024-12 (48)`);
} else console.log("ok   months: 2021-01 to 2024-12, 48 rows");
for (const s of ["AAPL", "WMT", "XOM", "PG", "TLT", "^SP500TR"]) {
  const a = d.series[s];
  if (!a || a.length !== 48 || a.some((x) => typeof x !== "number" || !isFinite(x) || x <= 0)) {
    failures++;
    console.log(`FAIL series ${s}: missing, wrong length, or non-positive entries`);
  } else console.log(`ok   series ${s}: 48 positive numbers`);
}

// ---- AAPL (no splits in or after the window; modest dividend) ----
check("AAPL 2021-01 start ($131.96 real close)", val("AAPL", "2021-01"), 131.96, 0.001);
check("AAPL 2021-12 ($177.57 quoted)", val("AAPL", "2021-12"), 177.57, 0.02);
check("AAPL 2022 total return (-26.4%)", ret("AAPL", "2021-12", "2022-12"), 0.736, 0.015);
check("AAPL 2023 total return (+49.0%)", ret("AAPL", "2022-12", "2023-12"), 1.49, 0.02);
check("AAPL 2024-12 ($250.42 quoted, plus 4 years of dividends)", val("AAPL", "2024-12"), 250.42, 0.04);

// ---- WMT (3-for-1 split 2024-02-26, re-anchored at the real 2021 quote;
// series values before the split match the quoted tape, values after it run
// at 3x the post-split quote) ----
check("WMT 2021-01 start ($140.49 real close)", val("WMT", "2021-01"), 140.49, 0.001);
check("WMT 2021-12 ($144.65 quoted)", val("WMT", "2021-12"), 144.65, 0.025);
check("WMT 2022 total return (about -0.5%)", ret("WMT", "2021-12", "2022-12"), 0.995, 0.02);
check("WMT 2024 total return (about +74%)", ret("WMT", "2023-12", "2024-12"), 1.74, 0.025);
check("WMT 2024-12 ($90.35 quoted x3, plus dividends)", val("WMT", "2024-12") / 3, 90.35, 0.07);

// ---- XOM (no splits; heavy dividend, so later anchors drift well above
// the quote and calendar total returns carry the verification) ----
check("XOM 2021-01 start ($44.84 real close)", val("XOM", "2021-01"), 44.84, 0.001);
check("XOM 2021-12 ($61.19 quoted, plus a year of dividends)", val("XOM", "2021-12"), 61.19, 0.08);
check("XOM 2022 total return (+87%)", ret("XOM", "2021-12", "2022-12"), 1.87, 0.03);
check("XOM 2023 total return (about -6%)", ret("XOM", "2022-12", "2023-12"), 0.94, 0.03);
check("XOM era total return (roughly tripled)", ret("XOM", "2021-01", "2024-12"), 2.83, 0.08);

// ---- PG (no splits; steady dividend) ----
check("PG 2021-01 start ($128.21 real close)", val("PG", "2021-01"), 128.21, 0.001);
check("PG 2021-12 ($163.58 quoted, plus a year of dividends)", val("PG", "2021-12"), 163.58, 0.03);
check("PG 2022 total return (about -5%)", ret("PG", "2021-12", "2022-12"), 0.95, 0.025);
check("PG 2023 total return (about flat)", ret("PG", "2022-12", "2023-12"), 0.99, 0.03);
check("PG 2024-12 ($167.66 quoted, plus 4 years of dividends)", val("PG", "2024-12"), 167.66, 0.11);

// ---- TLT (the era's honest lesson: the long-Treasury fund lost 31.2
// percent in 2022 even with interest reinvested, its worst year ever) ----
check("TLT 2021-01 start ($152.00 real close, verified on the daily tape)", val("TLT", "2021-01"), 152.0, 0.001);
check("TLT 2022 total return (-31.2%)", ret("TLT", "2021-12", "2022-12"), 0.688, 0.015);
check("TLT 2022-10 (trough months, high-90s with interest reinvested)", val("TLT", "2022-10"), 99, 0.06);
check("TLT era total return (about -36%)", ret("TLT", "2021-01", "2024-12"), 0.643, 0.05);
{
  const peakMonth = d.months[d.series.TLT.indexOf(Math.max(...d.series.TLT))];
  const ok = peakMonth === "2021-11" || peakMonth === "2021-12";
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} TLT peak month is late 2021 (got ${peakMonth})`);
}

// ---- ^SP500TR (December ratios reproduce published annual total returns;
// the 2022 month-end low must be September, whose 3,585.62 close of
// September 30 was the lowest month-end of the bear) ----
check("^SP500TR 2021-01 level (about 7,681)", val("^SP500TR", "2021-01"), 7681, 0.005);
check("^SP500TR 2022 total return (-18.11%)", ret("^SP500TR", "2021-12", "2022-12"), 0.8189, 0.005);
check("^SP500TR 2023 total return (+26.29%)", ret("^SP500TR", "2022-12", "2023-12"), 1.2629, 0.005);
check("^SP500TR 2024 total return (+25.02%)", ret("^SP500TR", "2023-12", "2024-12"), 1.2502, 0.005);
{
  const s = d.series["^SP500TR"];
  const y22 = s.slice(idx("2022-01"), idx("2023-01"));
  const lowMonth = d.months[s.indexOf(Math.min(...y22))];
  const ok = lowMonth === "2022-09";
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ^SP500TR 2022 month-end low is 2022-09 (got ${lowMonth})`);
}

console.log(failures === 0 ? "\nAll eraInflation checks passed." : `\n${failures} eraInflation check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
