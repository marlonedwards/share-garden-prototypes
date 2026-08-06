// Measure gate-screen fold behaviour at 1280x800.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4332";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
for (let i = 1; i <= 10; i++) { await p.locator(`button[aria-label="card ${i}"]`).click(); await wait(90); }
await p.locator("button", { hasText: "Start in 2000" }).first().click();
await wait(1000);
const at = async (label) => {
  const info = await p.evaluate(() => {
    const btns = [...document.querySelectorAll("main button")].filter((x) => /Sell|Hold|Buy|Spread|All-in|Wait|Get out/.test(x.innerText));
    const card = btns[0] ? btns[0].closest("div[class*=rounded]") : null;
    return {
      vh: innerHeight,
      scrollH: document.documentElement.scrollHeight,
      buttons: btns.map((x) => ({ t: x.innerText.replace(/\n/g, " "), bottom: Math.round(x.getBoundingClientRect().bottom) })),
      cardBottom: card ? Math.round(card.getBoundingClientRect().bottom) : null,
      railTop: (() => { const r = [...document.querySelectorAll("div")].find((d) => d.innerText && d.innerText.startsWith("Inside your orb")); return r ? Math.round(r.getBoundingClientRect().top) : null; })(),
    };
  });
  console.log(label, JSON.stringify(info));
};
for (let t = 0; t < 900; t++) {
  const txt = await p.evaluate(() => document.body.innerText);
  const g = txt.match(/(February 2000|April 2000|September 2001|June 2002|October 2002) · /);
  if (g) {
    await wait(700); // let the stage height transition (0.4s) finish before measuring
    await at("GATE " + g[1]);
    const btn = p.locator("main button").filter({ hasText: /^(Spread across everything|Hold what I have|Hold and stick to the plan|Hold and hope it survives|Hold what I have)$/ }).first();
    if (await btn.count()) await btn.click(); else await p.locator("main button").filter({ hasText: /^Wait in cash$/ }).first().click();
    await wait(500);
    const fast = p.locator("button", { hasText: /^4×$/ }).first();
    if (await fast.count()) await fast.click();
    continue;
  }
  if (/Quick check/.test(txt) && /You finished with/.test(txt)) break;
  if (t === 0) { const fast = p.locator("button", { hasText: /^4×$/ }).first(); if (await fast.count()) await fast.click(); }
  await wait(350);
}
await b.close();
console.log("DONE");
