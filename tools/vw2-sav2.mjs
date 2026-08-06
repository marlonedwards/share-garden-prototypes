// Second pass on savings: settle-state geometry, keyboard-only run, reload
// behaviour, and a look at the stages that the first pass rushed through.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4323";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
await page.goto(`${BASE}/#/orb/learn/savings`);
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await wait(700);

const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
const vis = () => page.locator("main .rounded-2xl.bg-white:visible button:visible");

// step 1..5
await vis().first().click(); await wait(600);
await cont().click(); await wait(500);
const r2 = page.locator("main div:not(.hidden) input[type=range]:visible").first();
// partial drag first: does 19 leave it locked, as the copy implies?
await r2.fill("19"); await wait(300);
console.log("slider at 19 -> continue disabled:", await cont().isDisabled(), "(copy says drag PAST twenty)");
await r2.fill("20"); await wait(300);
console.log("slider at 20 -> continue disabled:", await cont().isDisabled());
await page.screenshot({ path: `${OUT}w2sav-curve-20.png` });
await r2.fill("0"); await wait(300);
console.log("slider back to 0 -> continue disabled:", await cont().isDisabled(), "(should stay unlocked)");
const zero = await page.locator("main div:not(.hidden) .tnum:visible").allInnerTexts();
console.log("  values at year 0:", JSON.stringify(zero));
await page.screenshot({ path: `${OUT}w2sav-curve-0.png` });
await cont().click(); await wait(500);

// step 3 reveal one at a time and look at the partial state
await vis().nth(1).click(); await wait(700);
await page.screenshot({ path: `${OUT}w2sav-stretch-partial.png` });
console.log("stretch: 1 of 3 revealed -> continue disabled:", await cont().isDisabled());
await vis().nth(0).click(); await wait(300);
await vis().nth(2).click(); await wait(700);
await cont().click(); await wait(500);

// step 4 partial
const r4 = page.locator("main div:not(.hidden) input[type=range]:visible").first();
await r4.fill("4"); await wait(400);
console.log("keepup at 4 -> continue disabled:", await cont().isDisabled(), "(copy says drag to year eight)");
const v4 = await page.locator("main div:not(.hidden) .tnum:visible").allInnerTexts();
console.log("  values at year 4:", JSON.stringify(v4));
await page.screenshot({ path: `${OUT}w2sav-keepup-4.png` });
await r4.fill("8"); await wait(400);
await cont().click(); await wait(500);

// step 5 one home at a time
await vis().nth(1).click(); await wait(700);
await page.screenshot({ path: `${OUT}w2sav-home-savings.png` });
console.log("homes: 1 of 3 tried -> continue disabled:", await cont().isDisabled());
await vis().nth(0).click(); await wait(700);
await page.screenshot({ path: `${OUT}w2sav-home-jar.png` });
await vis().nth(2).click(); await wait(500);
await cont().click(); await wait(500);

// step 6 correct answer, measure AFTER the pop-in settles
await vis().first().click(); await wait(1200);
const geo = await page.evaluate(() => {
  const card = [...document.querySelectorAll("main .rounded-2xl.bg-white")].find((e) => e.offsetParent !== null);
  const ps = [...card.querySelectorAll("p")];
  const cr = card.getBoundingClientRect();
  return {
    card: [Math.round(cr.left), Math.round(cr.right)],
    paras: ps.map((p) => { const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), p.textContent.slice(0, 30)]; }),
    scrollH: document.documentElement.scrollHeight, ih: window.innerHeight,
  };
});
console.log("settled check geometry:", JSON.stringify(geo, null, 1));
await page.screenshot({ path: `${OUT}w2sav-check-settled.png` });

// reload mid-lesson: where do we land?
await page.reload(); await wait(800);
console.log("after reload, step text:", await page.locator("main span.tnum").first().innerText());
console.log("guide after reload:", await page.evaluate(() => localStorage.getItem("field-guide")));
console.log("checks after reload:", await page.evaluate(() => localStorage.getItem("beta-checks")));
await page.screenshot({ path: `${OUT}w2sav-after-reload.png` });

console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
await browser.close();
