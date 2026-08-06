// Light smoke of the routes the finale sits beside (W5 eras + select + one
// pager), so the finale's neighbourhood is known good. Run: node tools/vfy-ready-smoke.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

for (const r of ["/orb", "/orb/s/covid", "/orb/s/inflation", "/orb/brief/covid", "/orb/brief/inflation", "/objectives", "/orb/ready"]) {
  errs.length = 0;
  await page.goto(`${BASE}/#${r}`);
  await wait(1200);
  const txt = (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 130);
  console.log(`${r.padEnd(22)} errs=${errs.length} :: ${txt}`);
  if (errs.length) console.log("   ", errs.slice(0, 3));
  await page.screenshot({ path: OUT + "smoke" + r.replace(/\//g, "-") + ".png" });
}
await browser.close();
