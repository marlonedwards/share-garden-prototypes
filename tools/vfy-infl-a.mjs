// throwaway verifier: inflation era, stage A (select, brief, scouting, briefing page)
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const B = "http://localhost:4334";

await page.goto(`${B}/#/orb`);
await wait(1200);
await page.screenshot({ path: OUT + "a1-select.png", fullPage: true });
console.log("select has inflation card:", await page.getByText("The Inflation Years").count());
console.log("lesson 7 label:", await page.getByText("Lesson 7").count());

await page.goto(`${B}/#/orb/brief/inflation`);
await wait(900);
await page.screenshot({ path: OUT + "a2-briefing.png", fullPage: true });

await page.goto(`${B}/#/orb/s/inflation`);
await wait(1200);
await page.screenshot({ path: OUT + "a3-brief.png" });
const startBtn = page.getByText("Start in 2021");
console.log("start visible before scouting:", await startBtn.count(), "enabled:", await startBtn.count() ? await startBtn.first().isEnabled() : "n/a");
const sm = page.getByRole("button", { name: "Scout the menu" });
console.log("scout button:", await sm.count());
if (await sm.count()) {
  await sm.click();
  await wait(500);
  await page.screenshot({ path: OUT + "a4-scout-1.png" });
  for (let i = 1; i <= 8; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(220); if (i <= 2) await page.screenshot({ path: OUT + `a5-card${i}.png` }); }
  }
  await wait(400);
  await page.screenshot({ path: OUT + "a6-scout-done.png" });
}
console.log("start after scouting:", await page.getByText("Start in 2021").count());
await browser.close();
