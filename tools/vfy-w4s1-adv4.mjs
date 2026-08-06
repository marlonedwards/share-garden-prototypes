import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4328";
const browser = await chromium.launch();

for (const w of [390, 768, 1280, 1536]) {
  const p = await browser.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
  await p.goto(`${BASE}/#/orb/s/dotcom`);
  await wait(1500);
  await p.getByRole("button", { name: "Scout the menu" }).click();
  await wait(600);
  await p.locator("div[style*='perspective'] > button").first().click();
  await wait(600);
  const info = await p.evaluate(() => {
    const scroller = [...document.querySelectorAll("div")].find((d) => getComputedStyle(d).overflowY === "auto" && d.scrollHeight > 0);
    const start = [...document.querySelectorAll("button")].find((b) => /Start in 2000/.test(b.textContent || ""));
    const cards = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return s.backgroundColor === "rgb(255, 255, 255)" && parseFloat(s.borderRadius) >= 12 && r.width > 250 && r.height > 100;
    }).length;
    return {
      docScrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, clipped: scroller.scrollHeight - scroller.clientHeight } : null,
      startTop: start ? Math.round(start.getBoundingClientRect().top) : null,
      whiteCards: cards,
      bodyH: document.body.scrollHeight,
    };
  });
  console.log(w, JSON.stringify(info));
  await p.screenshot({ path: OUT + `adv4-${w}.png`, fullPage: false });
  await p.close();
}
await browser.close();
console.log("DONE");
