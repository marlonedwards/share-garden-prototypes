// Bake the covid era dataset (2019-01 to 2024-12 monthly, split/dividend
// adjusted) from Yahoo's chart API into src/data/eraCovid.json, following the
// bake_era.mjs / bake_era2.mjs pattern. Sanity checks live in
// tools/eracheck2.mjs and must pass before the dataset is committed.
//
// Split factors inside this era (documented so the checks can convert known
// quoted prices into the dataset's basis, which is Yahoo's present-day
// split-adjusted basis rescaled to start at the era's first monthly close):
//   AAPL 4-for-1 on 2020-08-31            (era total 4x)
//   TSLA 5-for-1 on 2020-08-31, 3-for-1 on 2022-08-25   (era total 15x)
//   NVDA 4-for-1 on 2021-07-20, 10-for-1 on 2024-06-10  (era total 40x)
//   AMZN 20-for-1 on 2022-06-06           (era total 20x)
//   GME  4-for-1 on 2022-07-22            (era total 4x)
//   ZM and PTON never split. ^SP500TR is the S&P 500 total return index.
// Listing dates: ZM listed 2019-04-18 and PTON listed 2019-09-26, so their
// leading months are backfilled with the first month-end close (ZM 72.47,
// the 2019-04 close; PTON 25.10, the 2019-09 close), the same forward/
// backfill rule every era bake uses. Note this is NOT the first traded
// price (ZM's first daily close was $62.00 on 2019-04-18); the backfill
// exists only to keep the series arrays rectangular, and the era content's
// listedAtStep hides those rows and blocks buying until the listing month.
import { writeFileSync } from "fs";
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };
async function bake(name, syms, p1, p2) {
  const out = { months: [], series: {} };
  for (const s of syms) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=${p1}&period2=${p2}&interval=1mo&events=div%2Csplit`;
    const r = await fetch(url, { headers: UA });
    const j = await r.json();
    const res = j.chart.result?.[0];
    if (!res) { console.log(name, s, "FAILED", JSON.stringify(j.chart.error).slice(0, 120)); continue; }
    const ts = res.timestamp;
    const adjRaw = res.indicators.adjclose?.[0]?.adjclose ?? res.indicators.quote[0].close;
    const rawClose = res.indicators.quote[0].close;
    // rescale so the series STARTS at the era's real quoted price while keeping
    // adjusted (total) returns intact; avoids reverse-split phantom prices
    const a0 = adjRaw.find((x) => x != null), r0 = rawClose.find((x) => x != null);
    const scale = a0 && r0 ? r0 / a0 : 1;
    const adj = adjRaw.map((x) => (x == null ? null : x * scale));
    const seen = new Map();
    ts.forEach((t, i) => {
      const d = new Date(t * 1000);
      const mkey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(mkey) && adj[i] != null) seen.set(mkey, +adj[i].toFixed(4));
    });
    if (!out.months.length) out.months = [...seen.keys()];
    out.series[s] = out.months.map((mk) => seen.get(mk) ?? null);
    console.log(name, s, out.series[s].filter((x) => x != null).length, "months");
    await new Promise((r2) => setTimeout(r2, 350));
  }
  for (const s of Object.keys(out.series)) {
    const a = out.series[s];
    for (let i = 0; i < a.length; i++) if (a[i] == null) a[i] = a[i - 1] ?? a.find((x) => x != null);
  }
  writeFileSync(`src/data/${name}.json`, JSON.stringify(out));
  console.log(name, "baked:", out.months[0], "to", out.months[out.months.length - 1], out.months.length);
}
// 2019-01-01 to 2025-01-01 UTC
await bake("eraCovid", ["AAPL", "AMZN", "NVDA", "TSLA", "ZM", "PTON", "GME", "^SP500TR"], 1546300800, 1735689600);
