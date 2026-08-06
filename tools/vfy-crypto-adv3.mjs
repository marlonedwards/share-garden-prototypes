// Adversarial pass 3: a real played run (buys at gate acts, a sell at the
// last gate), then the debrief + full quiz, to prove the era works when
// actually interacted with. Also samples gate fold height over time.
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
const fold = async () => await p.evaluate(() => {
  const bs = [...document.querySelectorAll("button")].filter((b) => /Buy |Sell |^Hold|Keep my cash|Change nothing|Take some|Watch from|Stay with/.test((b.textContent || "").trim()));
  return { docH: document.documentElement.scrollHeight, winH: window.innerHeight, low: Math.max(0, ...bs.map((b) => Math.round(b.getBoundingClientRect().bottom))) };
});

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
for (let i = 1; i <= 6; i++) { await p.getByRole("button", { name: `card ${i}`, exact: true }).click(); await wait(300); }
await p.locator("button", { hasText: "Start in 2018" }).first().click();
await wait(800);
await fast();

const buyColor = async (label, amt = "Buy $250") => {
  const row = p.locator("button", { hasText: new RegExp(`^${label}\\$|^${label}`) }).first();
  const alt = p.getByRole("button").filter({ hasText: label }).first();
  const target = (await row.count()) ? row : alt;
  if (await target.count()) {
    await target.click();
    await wait(400);
    const chip = p.locator("button", { hasText: /^Buy \$/ }).last();
    if (await chip.count()) { await chip.click(); await wait(500); return true; }
  }
  return false;
};

const answers = ["Buy other coins instead", "Buy the crash", "Watch from the side", "Take some profits", "Hold"];
const foldLog = [];
let n = 0;
for (let i = 0; i < 1600 && n < 5; i++) {
  await wait(200);
  const txt = await body();
  if (!/Read more:/.test(txt)) continue;
  const samples = [];
  for (const ms of [150, 300, 600, 1200, 2000]) { await wait(ms === 150 ? 150 : ms - samples.at(-1)?.ms || 150); samples.push({ ms, ...(await fold()) }); }
  foldLog.push({ gate: n + 1, samples });
  console.log(`GATE${n + 1} fold samples`, JSON.stringify(samples));
  await p.screenshot({ path: OUT + `adv3-gate${n + 1}.png` });
  await p.getByRole("button", { name: answers[n], exact: true }).click();
  n++;
  await wait(1200);
  if (n === 1) {
    const ok = await buyColor("Coin Alpha");
    const ok2 = await buyColor("Coin Beta");
    console.log("gate1 buys:", ok, ok2, "orb:", /Nothing is here yet/.test(await body()) ? "EMPTY" : "filled");
    await p.screenshot({ path: OUT + "adv3-after-buys.png" });
  }
  if (n === 2) { console.log("gate2 buy:", await buyColor("The Joke Coin")); }
  if (n === 4) {
    const s = p.locator("button", { hasText: /^Sell/ }).first();
    if (await s.count()) { await s.click(); await wait(400); }
    const t = await body();
    console.log("sell UI opened:", /Sell \$|Sell all/.test(t));
    const chip = p.locator("button", { hasText: /^Sell \$|^Sell all/ }).first();
    if (await chip.count()) { await chip.click(); await wait(400); }
  }
  const play = p.locator("button", { hasText: /^1×$/ }).first();
  if (await play.count()) await play.click().catch(() => {});
  await wait(400);
  await fast();
}
console.log("gates answered:", n);

for (let i = 0; i < 1600; i++) { await wait(200); if (/Two winters came/.test(await body())) break; }
const end = await body();
fs.writeFileSync("/tmp/crypto-end3.txt", end);
console.log("END:", /Two winters came/.test(end));
await p.screenshot({ path: OUT + "adv3-end.png", fullPage: true });

const qb = p.locator("button", { hasText: /Quick check|Prove what/ }).first();
if (await qb.count()) { await qb.click(); await wait(700); }
const items = [];
for (let i = 0; i < 10; i++) {
  const txt = await body();
  const mm = txt.match(/Quick check[\s\S]*$/); if (!mm) break;
  items.push(mm[0]);
  await p.screenshot({ path: OUT + `adv3-quiz${i + 1}.png` });
  const picked = await p.evaluate(() => {
    const bs = [...document.querySelectorAll("button")];
    const idx = bs.findIndex((b) => /Back to the debrief/.test(b.textContent || ""));
    const cand = idx > 0 ? bs.slice(Math.max(0, idx - 4), idx) : [];
    if (cand.length) { cand[1].click(); return true; }
    return false;
  });
  await wait(700);
  const after = await body();
  const nx = p.locator("button", { hasText: /^Next question|^Next|^See how you did|^Finish|^Done/ }).first();
  console.log(`item ${i + 1} picked=${picked} explained=${/because|Real investments|It did not|No bell|When frightened|Bet size/.test(after)} next=${await nx.count()}`);
  if (await nx.count()) { await nx.click(); await wait(600); } else break;
}
fs.writeFileSync("/tmp/crypto-quiz3.txt", items.join("\n\n===\n\n"));
console.log("quiz items:", items.length);
await p.screenshot({ path: OUT + "adv3-quiz-final.png", fullPage: true });
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await browser.close();
