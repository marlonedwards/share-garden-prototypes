// Throwaway verifier walk: play the dot-com era end to end at 1280x800.
import { chromium } from "playwright";
import fs from "node:fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4332";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const shot = (n) => p.screenshot({ path: OUT + `w4s2-dc-${n}.png` });
const cards = () => p.evaluate(() => {
  const isCard = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return r.width > 260 && r.height > 90 && /rgb\(255, 255, 255\)/.test(cs.backgroundColor)
      && parseFloat(cs.borderRadius) >= 12 && cs.boxShadow !== "none";
  };
  const out = [];
  document.querySelectorAll("div,section").forEach((el) => {
    if (isCard(el) && !out.some((o) => o.el.contains(el))) out.push({ el, t: (el.innerText || "").trim().slice(0, 50).replace(/\n/g, " / ") });
  });
  return { count: out.length, titles: out.map((o) => o.t), scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight };
});
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

await p.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1500);
console.log("== BRIEF ==", (await body()).slice(0, 500));
console.log("cards", JSON.stringify(await cards()));
await shot("01-brief");

await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await shot("02-scout-front");
console.log("== SCOUT ==", (await body()).slice(0, 400));

// flip each of the 10 cards by tapping the front, reading the report
const n = await p.locator('button[aria-label^="card "]').count();
console.log("deck size", n);
for (let i = 0; i < n; i++) {
  await p.locator(`button[aria-label="card ${i + 1}"]`).click();
  await wait(500);
  const txt = await body();
  console.log(`-- card ${i + 1}:`, txt.slice(txt.indexOf("Scout the menu")).slice(0, 420));
  if (i === 0 || i === 8) await shot(`03-card${i + 1}`);
}
console.log("cards on scout screen", JSON.stringify(await cards()));
const start = p.locator("button", { hasText: "Start in 2000" }).first();
console.log("start disabled after full deck:", await start.isDisabled());
await shot("04-scout-done");
await start.click();
await wait(1200);

// run: answer every gate, screenshot each
let gate = 0;
const seen = [];
for (let t = 0; t < 700; t++) {
  const txt = await body();
  if (/February 2000|April 2000|September 2001|June 2002|October 2002/.test(txt) && /Read more/.test(txt)) {
    gate++;
    const title = txt.match(/(February 2000|April 2000|September 2001|June 2002|October 2002)/)[1];
    if (!seen.includes(title)) {
      seen.push(title);
      console.log(`\n== GATE ${gate} (${title}) ==`);
      console.log(txt.slice(0, 1400));
      console.log("cards", JSON.stringify(await cards()));
      await shot(`05-gate${gate}-${title.replace(/\s/g, "")}`);
      const opts = await p.locator("button").filter({ hasText: /^(All-in|Spread|Wait in cash|Buy the dip|Hold what|Get out|Sell and wait|Hold and stick|Buy while|Sell what|Hold and hope|Sell before)/ }).allInnerTexts();
      console.log("options:", JSON.stringify(opts));
      // pick the middle-ish option; take a hold where possible
      const hold = p.locator("button").filter({ hasText: /^(Spread across everything|Hold what I have|Hold and stick to the plan|Hold and hope it survives|Buy while it's cheap)$/ }).first();
      if (await hold.count()) await hold.click();
      else await p.locator("button").filter({ hasText: /^(Wait in cash)$/ }).first().click();
      await wait(700);
      // if the tape paused for a move, press play
      const playBtn = p.locator("button", { hasText: /^Play$/ }).first();
      if (await playBtn.count()) { await playBtn.click(); await wait(300); }
      const fast = p.locator("button", { hasText: /^4×$/ }).first();
      if (await fast.count()) await fast.click();
      continue;
    }
  }
  if (/Quick check/.test(txt)) break;
  if (t === 0) { const fast = p.locator("button", { hasText: /^4×$/ }).first(); if (await fast.count()) await fast.click(); }
  await wait(400);
}
console.log("\ngates fired:", gate, seen);

await wait(1500);
console.log("\n== END/DEBRIEF ==", (await body()).slice(0, 1800));
console.log("cards", JSON.stringify(await cards()));
await shot("06-debrief");

await p.locator("button", { hasText: /^Quick check$/ }).first().click();
await wait(900);
for (let q = 1; q <= 9; q++) {
  const txt = await body();
  if (!/Question|of \d/.test(txt) && q > 1) break;
  console.log(`\n== QUIZ SCREEN ${q} ==`, txt.slice(0, 1100));
  console.log("cards", JSON.stringify(await cards()));
  await shot(`07-quiz${q}`);
  const opts = p.locator("main button").filter({ hasText: /.{6,}/ });
  // click the first answer-looking button inside the quiz card
  const answer = p.locator('button[data-quiz-option], main ul button, main li button').first();
  let clicked = false;
  if (await answer.count()) { await answer.click(); clicked = true; }
  if (!clicked) {
    const all = await opts.all();
    for (const b of all) {
      const t = (await b.innerText()).trim();
      if (/^(Back to the debrief|Play again|Quick check|Restart|Save it as an image|Real names|Whole shares|Fractional|Play|Pause|1×|2×|4×|scenarios|Next|Continue|Done|See my score|Finish)$/.test(t)) continue;
      await b.click(); clicked = true; break;
    }
  }
  await wait(700);
  await shot(`07-quiz${q}-answered`);
  console.log("after answer:", (await body()).slice(0, 900));
  const next = p.locator("button").filter({ hasText: /^(Next|Continue|Next question|Done|Finish|See how you did)$/ }).first();
  if (await next.count()) { await next.click(); await wait(600); }
  else break;
}
console.log("\n== QUIZ END ==", (await body()).slice(0, 1200));
await shot("08-quiz-end");

// briefing page
await p.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(1000);
console.log("\n== BRIEFING PAGE ==", (await body()));
console.log("cards", JSON.stringify(await cards()));
await p.screenshot({ path: OUT + "w4s2-dc-09-briefing.png", fullPage: true });
await browser.close();
console.log("DONE");
