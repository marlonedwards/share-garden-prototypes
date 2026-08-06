// Adversarial pass 2: gate fold behaviour with settle time, act-option flow,
// and the full six-item quiz walk. Port 4331. Throwaway.
import { chromium } from "playwright";
import fs from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4331";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
const body = async () => await p.evaluate(() => document.body.innerText);
const fast = async () => { const b = p.locator("button", { hasText: /^4×$/ }).first(); if (await b.count()) await b.click().catch(() => {}); };

const geom = async () => await p.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter((b) => /Buy |Sell |Hold|Keep my cash|Change nothing|Take some profits|Watch from the side|Stay with the boring/.test(b.textContent || ""));
  return {
    scrollY: window.scrollY, docH: document.documentElement.scrollHeight, winH: window.innerHeight,
    optionBottoms: btns.map((b) => Math.round(b.getBoundingClientRect().bottom)),
    optionLabels: btns.map((b) => (b.textContent || "").trim()),
  };
});

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
for (let i = 1; i <= 6; i++) { await p.getByRole("button", { name: `card ${i}`, exact: true }).click(); await wait(320); }
await p.locator("button", { hasText: "Start in 2018" }).first().click();
await wait(800);
await fast();

// answer gate 1 with the ACT option to prove trading really works
const answers = ["Buy other coins instead", "Buy the crash", "Watch from the side", "Take some profits", "Hold"];
let n = 0;
for (let i = 0; i < 1400 && n < 5; i++) {
  await wait(220);
  const txt = await body();
  if (/Read more:/.test(txt)) {
    await wait(1600); // let any scroll-into-view settle
    const g = await geom();
    console.log(`GATE${n + 1} settled`, JSON.stringify(g));
    const off = g.optionBottoms.filter((b) => b > g.winH);
    console.log(`GATE${n + 1} options below fold: ${off.length}/${g.optionBottoms.length}`);
    await p.screenshot({ path: OUT + `adv2-gate${n + 1}.png` });
    await p.getByRole("button", { name: answers[n], exact: true }).click();
    n++;
    await wait(900);
    if (n === 1) {
      // act option: buy something so the run has holdings
      const t2 = await body();
      console.log("after act option, paused?", /paused for your move/.test(t2));
      await p.screenshot({ path: OUT + "adv2-act-pause.png" });
      // buy Coin Alpha
      const buy = p.locator("button", { hasText: /^Coin Alpha/ }).first();
      if (await buy.count()) { await buy.click(); await wait(500); }
      const t3 = await body();
      console.log("holdings after buy attempt:", /empty/.test(t3) ? "STILL EMPTY" : "has holdings");
      await p.screenshot({ path: OUT + "adv2-after-buy.png" });
      const play = p.locator("button", { hasText: /^1×$|Play/ }).first();
      if (await play.count()) await play.click().catch(() => {});
    }
    if (n === 2) {
      const buy = p.locator("button", { hasText: /^Coin Beta/ }).first();
      if (await buy.count()) { await buy.click(); await wait(400); }
      const play = p.locator("button", { hasText: /^1×$|Play/ }).first();
      if (await play.count()) await play.click().catch(() => {});
    }
    if (n === 4) {
      const sell = p.locator("button", { hasText: /Sell/ }).first();
      if (await sell.count()) { await sell.click().catch(() => {}); await wait(400); }
      const play = p.locator("button", { hasText: /^1×$|Play/ }).first();
      if (await play.count()) await play.click().catch(() => {});
    }
    await wait(500);
    await fast();
  }
}

for (let i = 0; i < 1400; i++) {
  await wait(220);
  const txt = await body();
  if (/Two winters came/.test(txt)) break;
}
let t = await body();
fs.writeFileSync("/tmp/crypto-end2.txt", t);
console.log("END reached:", /Two winters came/.test(t));
await p.screenshot({ path: OUT + "adv2-end.png", fullPage: true });

// quiz: click through all items, always picking the first option
const qb = p.locator("button", { hasText: /Quick check|Prove what/ }).first();
if (await qb.count()) { await qb.click(); await wait(700); }
const seen = [];
for (let i = 0; i < 10; i++) {
  const txt = await body();
  const m = txt.match(/Quick check[\s\S]*$/);
  if (!m) break;
  seen.push(m[0].slice(0, 700));
  const QL = await p.evaluate(() => {
    const cards = [...document.querySelectorAll("div")].filter((d) => typeof d.className === "string" && /rounded-2xl/.test(d.className) && /border-black\/8/.test(d.className) && d.getBoundingClientRect().height > 60);
    return { cards: cards.length, docH: document.documentElement.scrollHeight, winH: window.innerHeight };
  });
  console.log(`quiz item ${i + 1}`, JSON.stringify(QL));
  await p.screenshot({ path: OUT + `adv2-quiz${i + 1}.png` });
  // pick an answer: option buttons inside the quiz block
  const opts = p.locator("button.w-full, button").filter({ hasText: /./ });
  const clicked = await p.evaluate(() => {
    const bs = [...document.querySelectorAll("button")];
    const idx = bs.findIndex((b) => /Back to the debrief/.test(b.textContent || ""));
    // the option buttons are the four immediately before the footer buttons
    const cand = idx > 0 ? bs.slice(Math.max(0, idx - 4), idx) : [];
    if (cand.length) { cand[0].click(); return cand.map((c) => c.textContent?.slice(0, 30)); }
    return null;
  });
  console.log("  options:", JSON.stringify(clicked));
  await wait(600);
  const nx = p.locator("button", { hasText: /^Next question|^Next|^See how you did|^Finish/ }).first();
  if (await nx.count()) { await nx.click(); await wait(600); } else { console.log("  no next button"); break; }
}
fs.writeFileSync("/tmp/crypto-quiz2.txt", seen.join("\n\n===\n\n"));
await p.screenshot({ path: OUT + "adv2-quiz-end.png", fullPage: true });
console.log("quiz screens walked:", seen.length);
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await browser.close();
