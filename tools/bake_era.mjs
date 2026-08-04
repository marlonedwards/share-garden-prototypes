// Bake the dot-com era dataset (1998-2007 monthly, split/dividend adjusted)
// from Yahoo's chart API into src/data/eraDotcom.json.
import { writeFileSync } from "fs";
const SYMS = ["AAPL", "AMZN", "MSFT", "CSCO", "INTC", "KO", "JNJ", "XOM", "^SP500TR"];
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };
const out = { months: [], series: {} };
for (const s of SYMS) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=946684800&period2=1199145600&interval=1mo&events=div%2Csplit`;
  const r = await fetch(url, { headers: UA });
  const j = await r.json();
  const res = j.chart.result[0];
  const ts = res.timestamp;
  const adjRaw = res.indicators.adjclose?.[0]?.adjclose ?? res.indicators.quote[0].close;
  const rawClose = res.indicators.quote[0].close;
  // rescale so the series STARTS at the era's real quoted price while keeping
  // adjusted (total) returns intact; avoids reverse-split phantom prices
  const a0 = adjRaw.find((x) => x != null), r0 = rawClose.find((x) => x != null);
  const scale = a0 && r0 ? r0 / a0 : 1;
  const adj = adjRaw.map((x) => (x == null ? null : x * scale));
  const months = ts.map((t) => {
    const d = new Date(t * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  // dedupe by month label, keep first
  const seen = new Map();
  months.forEach((m, i) => { if (!seen.has(m) && adj[i] != null) seen.set(m, +adj[i].toFixed(3)); });
  if (!out.months.length) out.months = [...seen.keys()];
  out.series[s] = out.months.map((m) => seen.get(m) ?? null);
  console.log(s, out.series[s].filter((x) => x != null).length, "months");
  await new Promise((r2) => setTimeout(r2, 400));
}
// forward-fill rare nulls
for (const s of SYMS) {
  const a = out.series[s];
  for (let i = 0; i < a.length; i++) if (a[i] == null) a[i] = a[i - 1] ?? a.find((x) => x != null);
}
writeFileSync("src/data/eraDotcom.json", JSON.stringify(out));
console.log("baked", out.months.length, "months:", out.months[0], "to", out.months[out.months.length - 1]);
