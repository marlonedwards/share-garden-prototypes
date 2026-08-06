// throwaway verifier: inflation era, stage B (play the tape end to end)
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const B = "http://localhost:4334";

const cardCount = async () => page.evaluate(() => {
  const seen = [];
  document.querySelectorAll("div,section,article").forEach((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 80) return;
    const bg = cs.backgroundColor;
    const white = bg === "rgb(255, 255, 255)" || bg === "rgba(255, 255, 255, 0.9)";
    if (white && parseFloat(cs.borderRadius) >= 10) seen.push(`${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.top)}`);
  });
  return seen;
});
const docScroll = async () => page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight,
}));

await page.goto(`${B}/#/orb/s/inflation`);
await wait(1200);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
for (let i = 1; i <= 8; i++) {
  const c = page.locator(`button[aria-label="card ${i}"]`);
  if (await c.count()) { await c.click(); await wait(150); }
}
await page.getByText("Start in 2021").click();
await wait(900);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.screenshot({ path: OUT + "b0-start.png" });
console.log("start cards:", await cardCount(), await docScroll());

// buy the bond fund + a stock
for (const [assetName, amt] of [["The Steady Lender", "Buy $250"], ["Fruit Computers", "Buy $250"]]) {
  await page.getByRole("button", { name: assetName }).first().click();
  await wait(300);
  await page.screenshot({ path: OUT + `b1-trade-${assetName.split(" ").pop()}.png` });
  await page.getByRole("button", { name: amt }).last().click();
  await wait(400);
}
await page.screenshot({ path: OUT + "b2-bought.png" });
console.log("after buys:", await page.getByText("$1,000").count(), await docScroll());
await page.getByText("4×", { exact: true }).click();

const gates = [
  ["May 2021 ·", "Keep waiting in cash", "g1-may2021"],
  ["March 2022 ·", "Hold everything as planned", "g2-mar2022"],
  ["July 2022 ·", "Hold and keep going", "g3-jul2022"],
];
for (const [eyebrow, answer, tag] of gates) {
  let found = 0;
  for (let i = 0; i < 30; i++) { await wait(900); found = await page.getByText(eyebrow).count(); if (found) break; }
  console.log("gate", eyebrow, "found:", found);
  if (!found) { await page.screenshot({ path: OUT + `${tag}-MISSING.png` }); continue; }
  await page.screenshot({ path: OUT + `${tag}.png` });
  console.log("  cards:", (await cardCount()).length, "scroll:", await docScroll());
  await page.getByRole("button", { name: answer }).click();
  await wait(400);
  await page.getByText("4×", { exact: true }).click();
}

// October 2022 act gate
let f = 0;
for (let i = 0; i < 30; i++) { await wait(900); f = await page.getByText("October 2022 ·").count(); if (f) break; }
console.log("gate October 2022 found:", f);
await page.screenshot({ path: OUT + "g4-oct2022.png" });
await page.getByRole("button", { name: "Buy", exact: true }).click();
await wait(500);
await page.screenshot({ path: OUT + "g4b-oct2022-after-act.png" });
console.log("paused after act gate:", await page.getByRole("button", { name: "Play" }).count() || await page.getByRole("button", { name: "Pause" }).count());
if (await page.getByRole("button", { name: "Pause" }).count()) await page.getByRole("button", { name: "Pause" }).click();
await wait(200);
await page.getByRole("button", { name: "Everything Mart" }).first().click();
await wait(300);
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(400);
await page.screenshot({ path: OUT + "g4c-oct2022-bought.png" });
await page.getByText("4×", { exact: true }).click();

f = 0;
for (let i = 0; i < 30; i++) { await wait(900); f = await page.getByText("January 2024 ·").count(); if (f) break; }
console.log("gate January 2024 found:", f);
await page.screenshot({ path: OUT + "g5-jan2024.png" });
await page.getByRole("button", { name: "Stay with the plan" }).click();
await wait(400);
await page.getByText("4×", { exact: true }).click();

for (let i = 0; i < 40; i++) { await wait(900); if (await page.getByText("You finished with").count()) break; }
console.log("end reached:", await page.getByText("You finished with").count());
await page.screenshot({ path: OUT + "e1-end.png" });
console.log("end scroll:", await docScroll());
for (let i = 0; i < 4; i++) {
  const c = page.getByRole("button", { name: "Continue" });
  if (!(await c.count())) break;
  await c.click(); await wait(600);
  await page.screenshot({ path: OUT + `e2-end-step${i}.png` });
  console.log(`end step ${i} scroll:`, await docScroll());
}
const qc = page.getByRole("button", { name: "Quick check" });
console.log("quick check button:", await qc.count());
if (await qc.count()) { await qc.click(); await wait(600); }
await page.screenshot({ path: OUT + "q0-quiz.png" });
console.log("quiz scroll:", await docScroll());
for (let q = 0; q < 12; q++) {
  const counts = await page.getByText(/^\d of \d$/).count();
  if (!counts) break;
  const buttons = page.locator("button.text-left.text-\\[13px\\]");
  const n = await buttons.count();
  console.log(`item ${q}: option buttons ${n}`);
  await buttons.nth(1).click();
  await wait(400);
  if (q < 3) await page.screenshot({ path: OUT + `q${q + 1}-item.png` });
  console.log(`  item ${q} scroll:`, await docScroll());
  const next = page.getByRole("button", { name: /Next|See results/ });
  await next.click();
  await wait(500);
}
await page.screenshot({ path: OUT + "q9-results.png", fullPage: true });
console.log("results:", await page.getByText(/\d \/ \d/).count());
await browser.close();
