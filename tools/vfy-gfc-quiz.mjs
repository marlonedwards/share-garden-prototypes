// Second pass: the gfc quiz. Play to the end using the proven wait-for-gate
// pattern, then walk all quiz items, screenshot each, count visible cards.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
p.on("framenavigated", (f) => { if (f === p.mainFrame()) console.log("NAV", f.url()); });
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

const layout = async () =>
  p.evaluate(() => {
    const all = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return (
        /rgba?\(255, 255, 255/.test(s.backgroundColor) &&
        parseFloat(s.borderRadius) >= 10 &&
        r.width > 240 && r.height > 80 &&
        r.top < window.innerHeight && r.bottom > 0
      );
    });
    const outer = all.filter((c) => !all.some((o) => o !== c && o.contains(c)));
    return {
      cards: outer.length,
      boxes: outer.map((c) => {
        const r = c.getBoundingClientRect();
        return { t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), txt: c.innerText.slice(0, 36).replace(/\n/g, " ") };
      }),
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
    };
  });

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(500);
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(90); }
await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(800);
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();

const gateMarks = ["October 2007 ·", "March 2008 ·", "September 2008 ·", "March 2009 ·", "March 2013 ·"];
for (const mark of gateMarks) {
  let ok = false;
  for (let t = 0; t < 600; t++) {
    if ((await body()).includes(mark)) { ok = true; break; }
    await wait(250);
  }
  if (!ok) { console.log("NEVER SAW", mark); break; }
  await wait(400);
  const labels = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()));
  const hold = labels.find((l) => /^(Keep holding everything|Hold everything|Hold and ride it out|Hold|Stay with the plan)$/.test(l));
  console.log("gate", mark, "-> clicking", JSON.stringify(hold));
  await p.locator("button").filter({ hasText: new RegExp(`^${hold.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first().click();
  await wait(800);
}

for (let t = 0; t < 600; t++) {
  if (/Quick check/.test(await body())) break;
  await wait(250);
}
await wait(700);
console.log("DEBRIEF layout", JSON.stringify(await layout()));
await p.locator("button").filter({ hasText: /^Quick check$/ }).first().click();
await wait(800);

for (let i = 1; i <= 8; i++) {
  const txt = await body();
  const lay = await layout();
  const at = txt.indexOf("Prove what");
  console.log(`\n=== QUIZ ${i} === cards=${lay.cards} docH=${lay.docH}/${lay.winH}`);
  console.log(JSON.stringify(lay.boxes));
  console.log(txt.slice(at >= 0 ? at : 0).slice(0, 1100));
  await p.screenshot({ path: OUT + `gfc-quiz-${i}.png` });
  const labels = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()));
  console.log("BTNS", JSON.stringify(labels.filter((l) => l.length > 6)));
  const opt = p.locator("button").filter({ hasText: /^[A-Z].{18,}/ }).first();
  if (!(await opt.count())) { console.log("no option found; stop"); break; }
  await opt.click();
  await wait(700);
  await p.screenshot({ path: OUT + `gfc-quiz-${i}-after.png` });
  const after = await body();
  console.log("AFTER TAIL:", after.slice(after.indexOf("Prove what") >= 0 ? after.indexOf("Prove what") : 0).slice(0, 900));
  console.log("AFTER layout", JSON.stringify(await layout()));
  const next = p.locator("button").filter({ hasText: /^(Next|Continue|Done|Finish|See how you did|Show me)/ }).first();
  if (await next.count()) { console.log("next:", (await next.innerText()).trim()); await next.click(); await wait(600); }
  else { console.log("no next button at item", i); break; }
}
await p.screenshot({ path: OUT + "gfc-quiz-final.png", fullPage: true });
console.log("\nFINAL", (await body()).slice(-900));
await browser.close();
console.log("DONE");
