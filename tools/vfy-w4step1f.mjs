import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4328";
const browser = await chromium.launch();

for (const vp of [{ width: 1440, height: 950 }, { width: 430, height: 900 }]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  await page.goto(`${BASE}/#/orb/s/dotcom`);
  await wait(1400);
  const worst = [];
  for (let i = 0; i < 10; i++) {
    await page.locator('div[style*="perspective"] button').first().click(); // flip
    await wait(300);
    const back = page.locator('div[style*="rotateY(180deg)"]').last();
    const r = await back.evaluate((el) => ({
      sh: el.scrollHeight, ch: el.clientHeight,
      name: el.querySelector("span.text-\\[14px\\]")?.textContent ?? "",
    }));
    worst.push(`${r.name}: content ${r.sh} vs box ${r.ch}${r.sh > r.ch + 1 ? "  CLIPPED" : ""}`);
    await page.locator('div[style*="perspective"] button').first().click(); // next
    await wait(280);
  }
  console.log(`--- ${vp.width}x${vp.height} ---`);
  worst.forEach((w) => console.log(" ", w));
  await page.screenshot({ path: OUT + `w4-scout-clip-${vp.width}.png` });
  await page.close();
}
await browser.close();
