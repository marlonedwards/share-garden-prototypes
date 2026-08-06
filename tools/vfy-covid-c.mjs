// Throwaway adversarial verification pass 3 for the covid era: ride the tape
// without trading, then walk the debrief into the quick check and screenshot
// every item. Screenshots to tools/shots/overnight/.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4333";

await page.goto(`${BASE}/#/orb/s/covid`);
await wait(1200);
const sm = page.getByRole("button", { name: "Scout the menu" });
if (await sm.count()) {
  await sm.click();
  await wait(400);
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(80); }
  }
}
await page.getByText("Start in 2019").click();
await wait(700);
await page.getByRole("button", { name: "Wait in cash for the recession" }).click();
await wait(400);
const speed = page.getByText("4×", { exact: true });
if (await speed.count()) await speed.click();

const answers = ["Hold and look away", "Watch from the side", "Change nothing", "Hold what I own"];
let shots = 0;
for (const a of answers) {
  for (let i = 0; i < 60; i++) {
    await wait(600);
    const btn = page.getByRole("button", { name: a });
    if (await btn.count()) break;
    const txt = await page.evaluate(() => document.body.innerText);
    const m = txt.match(/(The New York Times|Forbes|The Washington Post|CNBC|CNN Business)\n([^\n]+)\n?/);
    if (m && shots < 6) { shots++; await page.screenshot({ path: OUT + `covid-clip-${shots}.png` }); console.log("clip:", m[0].replace(/\n/g, " / ")); }
  }
  await page.getByRole("button", { name: a }).click();
  await wait(400);
  const s = page.getByText("4×", { exact: true });
  if (await s.count()) await s.click();
}
for (let i = 0; i < 80; i++) { await wait(600); if (await page.getByText("You finished with").count()) break; }
console.log("end:", await page.getByText("You finished with").count());
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
await page.screenshot({ path: OUT + "covid-debrief-2.png", fullPage: true });
console.log("--- DEBRIEF 2 ---\n" + (await page.evaluate(() => document.body.innerText)).split("Net worth")[1]);
const cont = page.getByRole("button", { name: "Continue" });
if (await cont.count()) { await cont.click(); await wait(600); }
await page.screenshot({ path: OUT + "covid-debrief-3.png", fullPage: true });
console.log("--- DEBRIEF 3 ---\n" + (await page.evaluate(() => document.body.innerText)).split("Net worth")[1]);
const qc = page.getByRole("button", { name: "Quick check" });
console.log("quick check button:", await qc.count());
if (await qc.count()) { await qc.click(); await wait(600); }

for (let q = 0; q < 12; q++) {
  const counter = await page.getByText(/^\d+ of \d+$/).count();
  if (!counter) break;
  await page.screenshot({ path: OUT + `covid-quiz-${q + 1}.png` });
  const txt = (await page.evaluate(() => document.body.innerText)).split("Net worth")[1] ?? "";
  console.log(`--- QUIZ ${q + 1} ---\n` + txt.slice(0, 800).replace(/\n+/g, " | "));
  const buttons = page.locator("button.text-left.text-\\[13px\\]");
  const n = await buttons.count();
  if (!n) { console.log("no option buttons found"); break; }
  await buttons.nth(1).click();
  await wait(400);
  const expl = (await page.evaluate(() => document.body.innerText)).split("Net worth")[1] ?? "";
  console.log("after answer:", expl.slice(0, 700).replace(/\n+/g, " | "));
  const next = page.getByRole("button", { name: /Next|See results/ });
  if (await next.count()) { await next.click(); await wait(500); }
}
await page.screenshot({ path: OUT + "covid-quiz-results.png", fullPage: true });
console.log("--- RESULTS ---\n" + ((await page.evaluate(() => document.body.innerText)).split("Net worth")[1] ?? "").slice(0, 800));
console.log("stored:", (await page.evaluate(() => localStorage.getItem("beta-checks")))?.slice(0, 200));
await browser.close();
