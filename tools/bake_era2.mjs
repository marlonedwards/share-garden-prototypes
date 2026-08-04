// Bake GFC (2007-2015) and crypto (2018-2024) monthly datasets from Yahoo.
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
await bake("eraGfc", ["C", "AIG", "F", "GE", "WMT", "AAPL", "XOM", "AMZN", "^SP500TR"], 1167609600, 1451606400);
await bake("eraCrypto", ["BTC-USD", "ETH-USD", "LTC-USD", "XRP-USD", "DOGE-USD", "^SP500TR"], 1514764800, 1735689600);
