// Fix verification: play gfc end to end at 1280x800 and measure every end
// screen (score, rewind, lessons, quiz) against the fold. Also confirms the
// 157-year-old card line, the bond definition in the briefing, and the
// reworded March 2009 gate question.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

const measure = async (label) => {
  const info = await p.evaluate(() => ({
    winH: innerHeight,
    docH: document.documentElement.scrollHeight,
    stage: !!document.querySelector("main canvas, main svg circle") || document.body.innerText.includes("Net worth"),
    lastBtnBottom: Math.max(0, ...[...document.querySelectorAll("main button")].map((x) => Math.round(x.getBoundingClientRect().bottom))),
  }));
  console.log(label, JSON.stringify(info));
  return info;
};

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
for (let i = 1; i <= 12; i++) {
  const c = p.locator(`button[aria-label="card ${i}"]`);
  if (await c.count()) { await c.click(); await wait(90); }
}
const startBtn = p.locator("button", { hasText: "Start in 2007" }).first();
console.log("START ENABLED", await startBtn.isEnabled());
await startBtn.click();
await wait(800);

const holdRe = /^(Keep holding everything|Hold everything|Hold and ride it out|Hold|Stay with the plan)$/;
let gates = 0;
for (let t = 0; t < 900; t++) {
  const txt = await p.evaluate(() => document.body.innerText);
  const g = txt.match(/(October 2007|March 2008|September 2008|March 2009|March 2013) · /);
  if (g) {
    await wait(700);
    if (g[1] === "March 2009") {
      const q = await p.evaluate(() => document.body.innerText.includes("What do you do?"));
      console.log("MAR09 DECISION QUESTION", q, "| believe-wording present:", txt.includes("Do you believe"));
    }
    await measure("GATE " + g[1]);
    gates++;
    await p.locator("main button").filter({ hasText: holdRe }).first().click();
    await wait(400);
    const fast = p.locator("button", { hasText: /^4×$/ }).first();
    if (await fast.count()) await fast.click();
    continue;
  }
  if (/You finished with/.test(txt)) break;
  if (t === 0) { const fast = p.locator("button", { hasText: /^4×$/ }).first(); if (await fast.count()) await fast.click(); }
  await wait(300);
}
console.log("GATES ANSWERED", gates);
await wait(900);

// end screen 1: score
await measure("END score");
await p.screenshot({ path: OUT + "gfc-fix-end-score.png" });
await p.getByRole("button", { name: "Continue" }).click();
await wait(600);

// end screen 2: rewind chart
await measure("END rewind");
await p.screenshot({ path: OUT + "gfc-fix-end-rewind.png" });
await p.getByRole("button", { name: "Continue" }).click();
await wait(600);

// end screen 3: lessons
await measure("END lessons");
await p.screenshot({ path: OUT + "gfc-fix-end-lessons.png" });
await p.getByRole("button", { name: "Quick check" }).click();
await wait(600);

// quiz: stage must be gone, and after every answer Next must sit above the fold
const q0 = await measure("QUIZ item 1 (before answer)");
console.log("STAGE GONE ON QUIZ", !q0.stage);
await p.screenshot({ path: OUT + "gfc-fix-quiz-1.png" });
for (let i = 0; i < 12; i++) {
  const txt = await p.evaluate(() => document.body.innerText);
  if (!/\d+ of \d+/.test(txt)) break;
  // answer: click the first option button inside the quiz option stack
  await p.locator("main .flex.flex-col.gap-1\\.5 > button").first().click();
  await wait(300);
  const m1 = await measure(`QUIZ item ${i + 1} (after answer)`);
  if (i === 0) await p.screenshot({ path: OUT + "gfc-fix-quiz-1-after.png" });
  const nxt = p.locator("main button").filter({ hasText: /^(Next|See results)$/ }).first();
  const nb = Math.round((await nxt.boundingBox())?.y ?? 9999) + 40;
  if (m1.docH > m1.winH) console.log("FOLD FAIL after item", i + 1);
  await nxt.click();
  await wait(350);
}
await measure("QUIZ results");
await p.screenshot({ path: OUT + "gfc-fix-quiz-results.png" });

// content checks: briefing bond definition, card age line
await p.goto(`${BASE}/#/orb/brief/gfc`);
await wait(900);
const brief = await p.evaluate(() => document.body.innerText);
console.log("BRIEF bond definition:", brief.includes("A bond is a loan cut into pieces that investors can buy"));
console.log("BRIEF 157 years:", brief.includes("157 years"), "| stray 158-year-old in briefing timeline (correct, Sept 2008):", brief.includes("158-year-old"));

await b.close();
console.log("DONE");
