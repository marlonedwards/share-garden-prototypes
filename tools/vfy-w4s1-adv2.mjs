import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4328";
const S = (n) => OUT + "adv2-" + n + ".png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1800);
await page.screenshot({ path: S("a-read-full"), fullPage: true });
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(800);
await page.screenshot({ path: S("b-scout-full"), fullPage: true });

// what is below the deck on the brief beat?
const below = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("main *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top > 760 && r.width > 200 && r.height > 40 && el.children.length < 12) {
      out.push({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 60), top: Math.round(r.top), h: Math.round(r.height), txt: (el.innerText || "").slice(0, 90).replace(/\n/g, " | ") });
    }
  });
  return out.slice(0, 12);
});
console.log("below the fold on scout screen:", JSON.stringify(below, null, 1));

// flip all then screenshot back face with a long report
let taps = 0;
for (let i = 0; i < 40; i++) {
  if (await page.getByText("Every card is scouted.").count()) break;
  await page.locator("div[style*='perspective'] > button").first().click();
  taps++;
  await wait(200);
}
console.log("taps needed to scout 10 cards:", taps);
await page.screenshot({ path: S("c-all-flipped-full"), fullPage: true });

// go to a card with the longest report and look at the back
await page.locator("button[aria-label='card 9']").click();
await wait(600);
await page.screenshot({ path: S("d-card9-back") });
await page.locator("button[aria-label='card 1']").click();
await wait(600);
await page.screenshot({ path: S("e-card1-back") });

// start and check the run beat
await page.getByRole("button", { name: "Start in 2000" }).click();
await wait(1500);
await page.screenshot({ path: S("f-after-start") });
console.log("beat text sample:", (await page.locator("main").innerText()).slice(0, 400).replace(/\n/g, " | "));

// mobile scout, all faces
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p2.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1600);
await p2.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await p2.screenshot({ path: S("g-mobile-scout-full"), fullPage: true });
await p2.locator("div[style*='perspective'] > button").first().click();
await wait(700);
await p2.screenshot({ path: S("h-mobile-back-full"), fullPage: true });

await browser.close();
console.log("DONE");
