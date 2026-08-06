import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4328";
const S = (n) => OUT + "adv3-" + n + ".png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

// can the player trade while the start button is locked?
await page.goto(`${BASE}/#/orb/s/dotcom`); await page.reload();
await wait(1700);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await page.getByRole("button", { name: /The Everything Store \$/ }).click().catch(async () => {
  await page.locator("text=The Everything Store").last().click();
});
await wait(600);
await page.screenshot({ path: S("a-trade-open-while-locked"), fullPage: true });
const buy = page.getByRole("button", { name: /^Buy \$100$/ });
console.log("buy chip visible while start locked:", await buy.count());
if (await buy.count()) {
  await buy.first().click();
  await wait(900);
  console.log("net worth after buying while locked:", await page.locator("text=/\\$\\d/").first().innerText());
  await page.screenshot({ path: S("b-bought-while-locked"), fullPage: true });
  console.log("start still disabled after trading:", await page.getByRole("button", { name: "Start in 2000" }).isDisabled());
}

// keyboard-only path: can you scout with the keyboard?
await page.goto(`${BASE}/#/orb/s/dotcom`); await page.reload();
await wait(1600);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
await page.keyboard.press("Tab");
await page.keyboard.press("ArrowRight");
await wait(400);
console.log("counter after arrow key:", await page.locator("text=/Scouted \\d+ of \\d+/").innerText());

// does the deck header/counter text ever say something odd at 9 of 10?
await page.goto(`${BASE}/#/orb/s/dotcom`); await page.reload();
await wait(1600);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
for (let i = 0; i < 40; i++) {
  const t = await page.locator("text=/Scouted \\d+ of \\d+/").count();
  if (!t) break;
  await page.locator("div[style*='perspective'] > button").first().click();
  await wait(150);
}
// now flip through with arrows and check every back face renders
for (let i = 0; i < 10; i++) {
  await page.locator(`button[aria-label='card ${i + 1}']`).click();
  await wait(350);
  const txt = await page.locator("div[style*='perspective']").innerText();
  const ok = /Believers say/.test(txt) && /Doubters say/.test(txt);
  console.log(`card ${i + 1} back ok:`, ok, "|", txt.split("\n")[1]);
  if (i === 8) await page.screenshot({ path: S("c-card9-back") });
}
await page.screenshot({ path: S("d-card10-back") });

// scroll the back-face body: is any report clipped?
const clip = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find((d) => d.style.overflowY === "auto" || getComputedStyle(d).overflowY === "auto");
  return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
});
console.log("back-face body scroll:", JSON.stringify(clip));

// real names toggle while scouting
await page.getByRole("button", { name: "Real names" }).click();
await wait(500);
await page.screenshot({ path: S("e-real-names") });
console.log("real name shown:", (await page.locator("div[style*='perspective']").innerText()).split("\n")[1]);

await browser.close();
console.log("DONE");
