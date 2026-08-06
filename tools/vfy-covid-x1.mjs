// throwaway adversarial verification pass 1: select screen, briefing page,
// scouting deck, gate 1 layout. Run: node tools/vfy-covid-x1.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const B = "http://localhost:4333";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

await page.goto(`${B}/#/orb`);
await wait(1200);
await page.screenshot({ path: OUT + "covid-x-select.png", fullPage: true });
console.log("SELECT body text:\n", (await page.locator("body").innerText()).slice(0, 2500));

await page.goto(`${B}/#/orb/brief/covid`);
await wait(900);
await page.screenshot({ path: OUT + "covid-x-brief-top.png" });
await page.screenshot({ path: OUT + "covid-x-brief-full.png", fullPage: true });
console.log("\n\nBRIEFING text:\n", (await page.locator("body").innerText()));

await page.goto(`${B}/#/orb/s/covid`);
await wait(1200);
await page.screenshot({ path: OUT + "covid-x-brief-beat.png" });
const sm = page.getByRole("button", { name: "Scout the menu" });
console.log("\nscout button:", await sm.count());
if (await sm.count()) {
  await sm.click();
  await wait(500);
  await page.screenshot({ path: OUT + "covid-x-scout-1.png" });
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) {
      await c.click();
      await wait(200);
      if (i === 5 || i === 6) await page.screenshot({ path: OUT + `covid-x-scout-card${i}.png` });
    }
  }
  await wait(300);
  await page.screenshot({ path: OUT + "covid-x-scout-done.png" });
  console.log("scout screen text:\n", (await page.locator("body").innerText()).slice(0, 1600));
}
await browser.close();
