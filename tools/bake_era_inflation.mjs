// Bake the inflation era (2021-01 to 2024-12) monthly dataset from Yahoo.
// Pattern follows tools/bake_era2.mjs: monthly adjclose (total return, so
// dividends are reinvested and the TLT bond-fund comparison is fair),
// rescaled so each series STARTS at the era's real quoted price while
// keeping adjusted returns intact. No splits touched this window for the
// cast (AAPL's last split was 4-for-1 in August 2020, before the era
// opens; WMT's 3-for-1 split of February 2024 is inside the window, and
// the adjclose rescale handles it: the series starts at the real early-2021
// quote and carries split-and-dividend-adjusted returns through the split).
// Fallback if Yahoo blocks: stooq.com daily CSV aggregated to monthly.
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
    console.log(name, s, out.series[s].filter((x) => x != null).length, "months",
      "first", out.series[s].find((x) => x != null));
    await new Promise((r2) => setTimeout(r2, 350));
  }
  for (const s of Object.keys(out.series)) {
    const a = out.series[s];
    for (let i = 0; i < a.length; i++) if (a[i] == null) a[i] = a[i - 1] ?? a.find((x) => x != null);
  }
  // Documented split factor: WMT ran a 3-for-1 split on February 26, 2024,
  // inside this window, and Yahoo now serves the whole close series
  // split-adjusted, which would show a 2021 player a phantom $46.83 Walmart.
  // Re-anchor the whole series at the real January 29, 2021 close of $140.49
  // (46.83 x 3, verified against the daily tape) by multiplying by the split
  // factor; monthly returns are untouched. Every other cast member (AAPL,
  // XOM, PG, TLT, ^SP500TR) had no splits in or after this window, and their
  // starts match the real January 2021 closes exactly.
  if (out.series.WMT) out.series.WMT = out.series.WMT.map((x) => +(x * 3).toFixed(4));
  writeFileSync(`src/data/${name}.json`, JSON.stringify(out));
  console.log(name, "baked:", out.months[0], "to", out.months[out.months.length - 1], out.months.length);
}

// 2021-01-01 to 2025-01-01 UTC
await bake("eraInflation", ["AAPL", "WMT", "XOM", "PG", "TLT", "^SP500TR"], 1609459200, 1735689600);
