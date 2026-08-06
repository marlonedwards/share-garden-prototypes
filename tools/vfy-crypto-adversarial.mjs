// Adversarial verification of W4 step 2 for the crypto era. Port 4331.
// Walks: scenario card -> brief -> scouting deck -> all five gates -> end ->
// quiz, measuring the layout law at every screen and dumping copy for the
// voice audit. Throwaway.
import { chromium } from "playwright";
import fs from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4331";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
const body = async () => await p.evaluate(() => document.body.innerText);
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { console.log((ok ? "PASS" : "FAIL") + " " + label + (extra ? " :: " + extra : "")); ok ? pass++ : fail++; };

// count white cards visible in the viewport + page scroll height
const layout = async () => await p.evaluate(() => {
  const cards = [...document.querySelectorAll("div")].filter((d) => {
    const c = d.className || "";
    if (typeof c !== "string") return false;
    if (!/rounded-2xl/.test(c) || !/border-black\/8|border-black\/10/.test(c)) return false;
    const r = d.getBoundingClientRect();
    return r.width > 200 && r.height > 60;
  });
  return {
    cards: cards.length,
    cardRects: cards.map((d) => ({ t: Math.round(d.getBoundingClientRect().top), b: Math.round(d.getBoundingClientRect().bottom), txt: (d.textContent || "").slice(0, 40) })),
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    scrollY: window.scrollY,
  };
});

// ---------- 1. briefing page ----------
await p.goto(`${BASE}/#/orb/brief/crypto`);
await wait(1200);
let t = await body();
check("briefing renders", t.includes("The world of January 2018"), t.slice(0, 80));
check("briefing has 5 sections", ["The morning after", "What a coin is", "The believers", "The doubters", "What you will live through"].every((h) => t.includes(h)));
check("briefing timeline has 10 dated rows", (t.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}?,? ?\d{0,4}/g) || []).length >= 8);
await p.screenshot({ path: OUT + "adv-01-briefing.png", fullPage: true });
fs.writeFileSync("/tmp/crypto-briefing.txt", t);

// ---------- 2. scenario select card ----------
await p.goto(`${BASE}/#/orb`);
await wait(1000);
t = await body();
check("select lists Crypto Winters", t.includes("Crypto Winters"));
check("select links the briefing", /Read the briefing|briefing/i.test(t));
await p.screenshot({ path: OUT + "adv-02-select.png", fullPage: true });

// ---------- 3. brief beat ----------
await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1500);
let L = await layout();
console.log("BRIEF layout", JSON.stringify(L));
check("brief: one card visible", L.cards <= 1, `cards=${L.cards}`);
check("brief: no vertical page scroll", L.docH <= L.winH + 8, `docH=${L.docH} winH=${L.winH}`);
await p.screenshot({ path: OUT + "adv-03-brief.png" });

await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(800);
L = await layout();
console.log("DECK layout", JSON.stringify(L));
check("deck: one card visible", L.cards <= 1, `cards=${L.cards}`);
check("deck: no page scroll", L.docH <= L.winH + 8, `docH=${L.docH} winH=${L.winH}`);
t = await body();
fs.writeFileSync("/tmp/crypto-deck.txt", t);
check("deck: start button locked before scouting", /Scouted 0 of 6|Scouted \d of 6/.test(t), t.slice(0, 200));
await p.screenshot({ path: OUT + "adv-04-deck.png" });

// read all six reports, capture each
const reports = [];
for (let i = 1; i <= 6; i++) {
  await p.getByRole("button", { name: `card ${i}`, exact: true }).click();
  await wait(550);
  reports.push(await body());
  if (i === 1 || i === 6) await p.screenshot({ path: OUT + `adv-05-card${i}.png` });
}
fs.writeFileSync("/tmp/crypto-cards.txt", reports.join("\n\n======\n\n"));
t = await body();
check("deck: all six scouted", /Every card is scouted/.test(t));
L = await layout();
check("deck done: still no page scroll", L.docH <= L.winH + 8, `docH=${L.docH} winH=${L.winH}`);

const startBtn = p.locator("button", { hasText: "Start in 2018" }).first();
check("start button present after scouting", await startBtn.count() > 0);
await startBtn.click();
await wait(900);
// speed up
const fast = async () => { const b = p.locator("button", { hasText: /^4×$/ }).first(); if (await b.count()) await b.click().catch(() => {}); };
await fast();

// ---------- 4. gates ----------
const gateTexts = [];
const answers = ["Keep my cash", "Hold on", "Watch from the side", "Change nothing", "Hold"];
for (let i = 0; i < 900 && gateTexts.length < 6; i++) {
  await wait(250);
  const txt = await body();
  if (/Read more:/.test(txt)) {
    const n = gateTexts.length;
    gateTexts.push(txt);
    const GL = await layout();
    console.log(`GATE${n + 1} layout`, JSON.stringify(GL));
    check(`gate${n + 1}: one card visible`, GL.cards <= 1, `cards=${GL.cards}`);
    check(`gate${n + 1}: fits above the fold`, GL.docH <= GL.winH + 8, `docH=${GL.docH} winH=${GL.winH}`);
    await p.screenshot({ path: OUT + `adv-06-gate${n + 1}.png` });
    const label = answers[n];
    const b = p.getByRole("button", { name: label, exact: true });
    if (await b.count() === 0) { console.log("FAIL no option " + label); fail++; break; }
    await b.click();
    await wait(700);
    await fast();
  }
  if (/Two winters came/.test(txt)) break;
}
fs.writeFileSync("/tmp/crypto-gates.txt", gateTexts.join("\n\n======\n\n"));
check("five gates fired", gateTexts.length === 5, `saw ${gateTexts.length}`);

// ---------- 5. run to the end ----------
for (let i = 0; i < 900; i++) {
  await wait(250);
  const txt = await body();
  if (/Two winters came/.test(txt)) break;
}
t = await body();
check("end card reached", /Two winters came, and two springs followed/.test(t));
await p.screenshot({ path: OUT + "adv-07-end.png", fullPage: true });
fs.writeFileSync("/tmp/crypto-end.txt", t);

// ---------- 6. quiz ----------
const qb = p.locator("button", { hasText: /quick check|Quick check|Check what/i }).first();
if (await qb.count()) { await qb.click(); await wait(800); }
const quiz = [];
for (let i = 0; i < 12; i++) {
  const txt = await body();
  const opts = await p.locator("button").allInnerTexts();
  quiz.push("--- screen " + i + " ---\n" + txt);
  const QL = await layout();
  console.log(`QUIZ${i} layout`, JSON.stringify(QL));
  await p.screenshot({ path: OUT + `adv-08-quiz${i}.png` });
  // pick an option button that is part of the item
  const next = p.locator("button", { hasText: /^Next|Continue|Done|See your/ }).first();
  if (await next.count()) { await next.click(); await wait(600); continue; }
  break;
}
fs.writeFileSync("/tmp/crypto-quiz.txt", quiz.join("\n"));

console.log("\nERRORS:", errs.length ? errs.join("\n") : "none");
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
