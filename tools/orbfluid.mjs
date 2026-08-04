// Capture mid + crash in both fluid styles for comparison.
import { chromium } from "playwright";
const BASE = "http://localhost:4318/#";
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
for (const style of ["waves", "blobs"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
  await page.addInitScript((s) => localStorage.setItem("orbFluid", s), style);
  for (const beat of ["mid", "crash"]) {
    await page.goto("about:blank");
    await page.goto(`${BASE}/orb/tutorial?beat=${beat}`);
    await wait(2000);
    await page.screenshot({ path: `${OUT}${beat}-${style}.png` });
    console.log("shot", beat, style);
  }
  await page.close();
}
await browser.close();
