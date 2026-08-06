import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4328";
const browser = await chromium.launch();

// --- mobile scouting deck
for (const w of [390, 1536]) {
  const p = await browser.newPage({ viewport: { width: w, height: 800 } });
  await p.goto(`${BASE}/#/orb/s/dotcom`);
  await wait(1400);
  await p.getByRole("button", { name: "Scout the menu" }).click();
  await wait(600);
  const card = p.locator("div[style*='perspective'] > button").first();
  await card.click();
  await wait(600);
  await p.screenshot({ path: OUT + `chk2-scout-${w}.png` });
  const o = await p.evaluate(() => ({
    docScrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    docScrollH: document.documentElement.scrollHeight,
  }));
  console.log("width", w, JSON.stringify(o));
  await p.close();
}

// --- keyboard arrows unlock the deck
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
for (let i = 0; i < 10; i++) { await p.keyboard.press("ArrowRight"); await wait(150); }
const start = p.locator("button", { hasText: "Start in 2000" }).first();
console.log("after 10 ArrowRight, start disabled:", await start.isDisabled());
await p.screenshot({ path: OUT + "chk2-arrows.png" });

// --- pager dots path
const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p2.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1400);
await p2.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
for (let i = 1; i <= 10; i++) { await p2.getByRole("button", { name: `card ${i}` }).click(); await wait(120); }
const start2 = p2.locator("button", { hasText: "Start in 2000" }).first();
console.log("after all pager dots, start disabled:", await start2.isDisabled());

// --- restart resets the gate?
await start2.click();
await wait(1500);
await p2.getByRole("button", { name: "Restart" }).click().catch(() => console.log("no Restart button by role"));
await wait(1200);
const txt = await p2.evaluate(() => document.body.innerText.slice(0, 300));
console.log("after restart:\n" + txt);
await p2.screenshot({ path: OUT + "chk2-restart.png" });

// --- non-scouting era still starts normally
const p3 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p3.goto(`${BASE}/#/orb/s/gfc`);
await wait(1500);
await p3.screenshot({ path: OUT + "chk2-gfc-brief.png" });
console.log("gfc brief text:", (await p3.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, " | "));

await browser.close();
console.log("DONE");
