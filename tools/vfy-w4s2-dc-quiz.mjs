// Walk the dotcom quiz end to end: verify each item's expected correct
// answer really grades green, and that the rewind chip lands on the month
// the item is about.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4332";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1200);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
for (let i = 1; i <= 10; i++) { await p.locator(`button[aria-label="card ${i}"]`).click(); await wait(80); }
await p.locator("button", { hasText: "Start in 2000" }).first().click();
await wait(600);
for (let t = 0; t < 900; t++) {
  const txt = await p.evaluate(() => document.body.innerText);
  if (/(February 2000|April 2000|September 2001|June 2002|October 2002) · /.test(txt)) {
    const hold = p.locator("main button").filter({ hasText: /^(Wait in cash|Hold what I have|Hold and stick to the plan|Hold and hope it survives)$/ }).first();
    await hold.click();
    await wait(400);
    const fast = p.locator("button", { hasText: /^4×$/ }).first();
    if (await fast.count()) await fast.click({ timeout: 2000 }).catch(() => {});
    continue;
  }
  if (/You finished with/.test(txt)) break;
  if (t === 0) { const fast = p.locator("button", { hasText: /^4×$/ }).first(); if (await fast.count()) await fast.click({ timeout: 2000 }).catch(() => {}); }
  await wait(300);
}
await p.getByRole("button", { name: "Quick check" }).click();
await wait(700);

// expected correct answers, in item order for a no-trade run
const expected = [
  { key: "recovery", right: "About six years", chip: "Oct 2006" },
  { key: "pricedin", right: "The prices already assumed a perfect future, and reality could not keep up", chip: "Feb 2000" },
  { key: "survivors", right: "They disappeared, and today's charts only show the survivors", chip: "Jul 2002" },
  { key: "reopen", right: "The market regained the lost ground within about two months", chip: "Sep 2001" },
  { key: "fraud", right: "Spreading money so widely that no single company can sink the plan", chip: "Jul 2002" },
  { key: "run-index", right: "Hold one of everything, sell nothing, reinvest what comes in", chip: null },
];
for (let q = 0; q < expected.length; q++) {
  const e = expected[q];
  const counter = await p.evaluate(() => (document.body.innerText.match(/(\d+) of (\d+)/) ?? []).slice(1).join("/"));
  const chip = await p.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) => / · rewind$/.test(s.innerText));
    return el ? el.innerText : null;
  });
  const btn = p.locator("main button").filter({ hasText: e.right }).first();
  if (!(await btn.count())) { console.log(`QUIZ ${q + 1} (${e.key}) MISSING option: ${e.right}`); break; }
  await btn.click();
  await wait(400);
  const graded = await p.evaluate((txt) => {
    const el = [...document.querySelectorAll("main button")].find((x) => x.innerText.trim() === txt);
    return el ? getComputedStyle(el).backgroundColor : null;
  }, e.right);
  const explain = await p.evaluate(() => {
    const el = [...document.querySelectorAll("main p")].find((x) => x.className.includes("text-[12.5px]") && x.innerText.length > 40);
    return el ? el.innerText.slice(0, 130) : null;
  });
  console.log(`QUIZ ${q + 1} (${e.key}) counter=${counter} chip=${chip} gradedGreen=${graded === "rgba(52, 199, 89, 0.14)"} chipOK=${e.chip === null ? chip === null : (chip ?? "").startsWith(e.chip)}`);
  console.log(`   explain: ${explain}`);
  if (q === 0) await p.screenshot({ path: OUT + "w4s2-dcfix-09-quiz1.png" });
  if (q === 3) await p.screenshot({ path: OUT + "w4s2-dcfix-10-quiz4.png" });
  await p.locator("main button").filter({ hasText: /^(Next|See results)$/ }).first().click();
  await wait(500);
}
const fin = await p.evaluate(() => document.body.innerText);
console.log("SCORE:", (fin.match(/(\d+) \/ (\d+)/) ?? ["(none)"])[0]);
await p.screenshot({ path: OUT + "w4s2-dcfix-11-quiz-score.png" });
await b.close();
console.log("DONE");
