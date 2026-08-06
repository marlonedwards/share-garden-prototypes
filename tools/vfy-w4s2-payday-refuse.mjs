// Adversarial second run: refuse the plan at every gate (the "stop"/"sell"
// branches) and confirm the sim, the pay flags, and the debrief stay honest.
import { chromium } from "playwright";
import fs from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });
const text = () => page.evaluate(() => document.querySelector("main").innerText);

await page.goto("http://localhost:4329/#/orb/s/payday");
await wait(1000);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(300);
for (let i = 0; i < 6; i++) { await page.getByRole("button", { name: `card ${i + 1}` }).click(); await wait(150); }
await page.getByRole("button", { name: "Start earning" }).click();
await wait(700);
await page.getByRole("button", { name: "Pause", exact: true }).click().catch(() => {});
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.locator("main button", { hasText: "The Everything Store" }).last().click();
await wait(250);
await page.getByRole("button", { name: /^Buy \$100$/ }).first().click();
await wait(400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: "Play", exact: true }).click();
await page.getByRole("button", { name: "4×" }).click();

const REFUSE = /Pause until things calm down|Sell what I own and step away|Sell everything and stop the plan|Copy the friend and wait for a dip|Sell some\. Records make me nervous/;
let g = 0, payCards = 0;
for (let tick = 0; tick < 500; tick++) {
  const t = await text();
  if (t.includes("Read more:") && t.includes("?")) {
    g++;
    await page.locator("main button").filter({ hasText: REFUSE }).first().click();
    await wait(400);
    const t2 = await text();
    console.log(`gate ${g} refused; paused-for-move caption:`, t2.includes("The tape is paused for your move"));
    if (g === 2) { await page.screenshot({ path: OUT + "pd-r-after-sell-gate.png" }); }
    const play = page.getByRole("button", { name: "Play", exact: true });
    if (await play.isVisible().catch(() => false)) await play.click().catch(() => {});
    await page.getByRole("button", { name: "4×" }).click().catch(() => {});
    continue;
  }
  if (t.includes("Your payday of $50.00 just arrived.")) {
    payCards++;
    await page.getByRole("button", { name: "Keep as cash" }).click();
    await wait(250);
    await page.getByRole("button", { name: "4×" }).click().catch(() => {});
    continue;
  }
  if (t.includes("It is December 2007")) break;
  await wait(350);
}
await wait(1200);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: OUT + "pd-r-debrief.png" });
console.log("gates:", g, "payday cards:", payCards);
console.log("DEBRIEF:", JSON.stringify((await text()).slice(0, 2400)));
console.log("ERRORS:", errs.length ? errs.join(" | ") : "none");
await browser.close();
