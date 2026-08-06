// Briefing pages and the new-era scouting decks: render, link back, and read.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

for (const id of ["covid", "inflation"]) {
  await page.goto(`${BASE}/#/orb/brief/${id}`);
  await wait(800);
  await page.screenshot({ path: OUT + `brief-${id}.png`, fullPage: true });
  console.log(`=== BRIEF ${id} ===\n` + (await page.locator("body").innerText()));
  // scouting deck on the scenario itself
  await page.goto(`${BASE}/#/orb/s/${id}`);
  await wait(800);
  await page.screenshot({ path: OUT + `scenario-${id}-brief.png` });
  const sm = page.getByRole("button", { name: "Scout the menu" });
  if (await sm.count()) {
    await sm.click();
    await wait(500);
    await page.screenshot({ path: OUT + `scout-${id}-1.png` });
    for (let i = 1; i <= 12; i++) {
      const c = page.locator(`button[aria-label="card ${i}"]`);
      if (await c.count()) { await c.click(); await wait(120); }
    }
    await page.screenshot({ path: OUT + `scout-${id}-all.png` });
    console.log(`SCOUT ${id} text:\n` + (await page.locator("body").innerText()).slice(0, 1800));
  } else {
    console.log(`SCOUT ${id}: NO SCOUT BUTTON`);
  }
}
await browser.close();
