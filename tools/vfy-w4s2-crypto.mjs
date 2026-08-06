// Throwaway verifier: play the crypto era end to end on port 4331.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4331";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

const cards = () =>
  p.evaluate(() => {
    const sel = document.querySelectorAll(".rounded-2xl.bg-white, .rounded-3xl.bg-white");
    return [...sel].filter((el) => el.getBoundingClientRect().height > 40).map((el) => (el.textContent || "").trim().slice(0, 60));
  });
const fast = async () => { const b = p.locator("button", { hasText: /^4×$/ }).first(); if (await b.count()) await b.click().catch(() => {}); };
const shot = async (n) => { await p.screenshot({ path: OUT + `crypto-${n}.png`, fullPage: false }); };
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");
const scrollState = () =>
  p.evaluate(() => ({
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1500);
console.log("BRIEF:", (await body()).slice(0, 400));
console.log("brief scroll:", JSON.stringify(await scrollState()));
await shot("01-brief");

await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await shot("02-scout-front");
console.log("scout scroll:", JSON.stringify(await scrollState()));
console.log("SCOUT screen:", (await body()).slice(0, 500));

// flip through all six cards, screenshotting each report
for (let i = 1; i <= 6; i++) {
  await p.getByRole("button", { name: `card ${i}`, exact: true }).click();
  await wait(650);
  await shot(`03-card${i}`);
  const t = await p.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => (x.getAttribute("aria-label") || "").startsWith("Scouting report"));
    return b ? b.innerText.replace(/\n+/g, " | ") : "NO REPORT VISIBLE";
  });
  console.log(`CARD ${i}:`, t);
}
const startBtn = p.locator("button", { hasText: "Start in 2018" }).first();
console.log("start disabled after all six:", await startBtn.isDisabled());
await shot("04-scouted");

await startBtn.click();
await wait(900);
await fast();

// run to the end, answering every gate
const seen = [];
for (let i = 0; i < 400; i++) {
  await wait(400);
  const txt = await p.evaluate(() => document.body.innerText);
  if (/Read more:/.test(txt) && /Crossroads|January 2018|March 2020|April 2021|November 2021|November 2022/.test(txt)) {
    const title = await p.evaluate(() => {
      const h = [...document.querySelectorAll("h2, h3, .text-\\[19px\\], div")].map((e) => e.innerText || "");
      return "";
    });
    const card = await p.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) => /Read more:/.test(d.innerText || "") && d.innerText.length < 1600);
      return el ? el.innerText.replace(/\n+/g, " | ") : "";
    });
    seen.push(card);
    console.log("\n=== GATE", seen.length, "===\n", card);
    console.log("gate cards visible:", JSON.stringify(await cards()));
    console.log("gate scroll:", JSON.stringify(await scrollState()));
    await shot(`05-gate${seen.length}`);
    // pick the last option (no act) so the tape resumes
    const opts = await p.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) => /Read more:/.test(d.innerText || "") && d.innerText.length < 1600);
      return el ? [...el.querySelectorAll("button")].map((b) => b.innerText) : [];
    });
    console.log("options:", JSON.stringify(opts));
    const GATE_OPTS = ["Buy The Promise Coin","Buy other coins instead","Keep my cash","Sell the coins","Hold on","Buy the crash","Buy The Joke Coin","Stay with the boring market instead","Watch from the side","Buy more coins","Take some profits","Change nothing","Sell what's left","Hold","Buy the winter"];
    const present = opts.filter((o) => GATE_OPTS.includes(o.trim()));
    const pick = seen.length === 1 ? present[0] : present[present.length - 1];
    console.log("picking:", pick);
    await p.getByRole("button", { name: pick, exact: true }).first().click();
    await wait(600);
    if (/paused for your move/.test(await p.evaluate(() => document.body.innerText))) {
      await shot(`05-gate${seen.length}-act`);
      // make the move the gate implied: buy the first coin on the menu
      const add = p.locator("button", { hasText: /^Coin Alpha/ }).first();
      if (await add.count()) { await add.click(); await wait(500); await shot(`05-gate${seen.length}-trade`); }
      const buy = p.locator("button", { hasText: /^Buy/ }).last();
      if (await buy.count()) { await buy.click().catch(() => {}); await wait(400); }
      await shot(`05-gate${seen.length}-after`);
      await fast();
    }
    await fast();
    continue;
  }
  if (/Quick check/.test(txt) && /finished with/.test(txt)) break;
}

console.log("\nGATES SEEN:", seen.length);
await wait(800);
await shot("06-debrief");
console.log("DEBRIEF:", (await body()).slice(0, 900));
console.log("debrief cards:", JSON.stringify(await cards()));
console.log("debrief scroll:", JSON.stringify(await scrollState()));

await p.locator("button", { hasText: "Quick check" }).first().click();
await wait(700);
await shot("07-quiz1");
console.log("quiz cards:", JSON.stringify(await cards()));
console.log("quiz scroll:", JSON.stringify(await scrollState()));

for (let i = 0; i < 12; i++) {
  const txt = await p.evaluate(() => document.body.innerText);
  console.log(`\n--- QUIZ SCREEN ${i + 1} ---\n`, txt.split("Prove what this era taught you.")[1] ? txt.split("Prove what this era taught you.")[1].replace(/\n+/g, " | ").slice(0, 900) : txt.slice(0, 300));
  console.log("cards:", JSON.stringify(await cards()), "scroll:", JSON.stringify(await scrollState()));
  await shot(`08-quiz-${i + 1}`);
  const nextBtn = p.locator("button", { hasText: /^(Next|See results)$/ }).first();
  if (await nextBtn.count()) {
    console.log("clicking:", await nextBtn.innerText());
    await nextBtn.click();
    await wait(600);
    continue;
  }
  const opt = p.locator("button.text-left.rounded-xl").first();
  if (await opt.count()) {
    console.log("answering:", (await opt.innerText()).slice(0, 60));
    await opt.click();
    await wait(700);
    const exp = await p.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^(Next|See results)$/.test((x.innerText || "").trim()));
      return b && b.parentElement ? b.parentElement.innerText.replace(/\n+/g, " | ") : "NO EXPLAIN";
    });
    console.log("explain:", exp);
    continue;
  }
  console.log("no quiz controls left");
  break;
}
await shot("09-quiz-end");
console.log("QUIZ END:", (await body()).slice(0, 900));

// briefing page
await p.goto(`${BASE}/#/orb/brief/crypto`);
await wait(1200);
await p.screenshot({ path: OUT + "crypto-10-briefing.png", fullPage: true });
console.log("BRIEFING:", (await body()).slice(0, 2500));
console.log("briefing scroll:", JSON.stringify(await scrollState()));

console.log("\nERRORS:", JSON.stringify(errs.slice(0, 10)));
await browser.close();
console.log("DONE");
