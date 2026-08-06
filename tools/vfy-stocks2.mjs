import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(700);

const CUR = 'main > div[aria-hidden="false"]';
const cont = () => page.locator(`${CUR} button`, { hasText: /^(Continue|Finish)$/ }).first();
const btn = (re) => page.locator(`${CUR} button`, { hasText: re }).first();
const state = () => page.evaluate((CUR) => {
  const scr = document.querySelector(CUR);
  return {
    step: document.querySelector("main span.tnum").textContent,
    card: scr.querySelector(".rounded-2xl")?.innerText.replace(/\n/g, " | "),
    range: scr.querySelector("input[type=range]")?.value ?? null,
  };
}, CUR);

await btn(/Buy 1 share/).click(); await wait(150); await cont().click(); await wait(250);
await btn(/whoever sold the share/).click(); await wait(150); await cont().click(); await wait(250);
await page.locator(`${CUR} input[type=range]`).fill("15"); await wait(150);
console.log("S3:", JSON.stringify(await state()));
await cont().click(); await wait(250);
for (let i = 0; i < 3; i++) { await btn(/A buyer walks up/).click(); await wait(80); }
await btn(/An owner wants out/).click(); await wait(200);
console.log("S4:", JSON.stringify(await state()));
await cont().click(); await wait(250);
await btn(/A year passes/).click(); await wait(150);
console.log("S5:", JSON.stringify(await state()));
await cont().click(); await wait(250);
for (const t of [/Sell the piece/, /Vote when the stand/, /Pour a free lemonade/, /Order Maya/]) {
  await btn(t).click(); await wait(90);
}
await wait(250);
console.log("S6:", JSON.stringify(await state()));

// geometry of the owner card + inner paragraph alignment
const geo = await page.evaluate((CUR) => {
  const card = document.querySelector(CUR).querySelector(".rounded-2xl");
  const cb = card.getBoundingClientRect();
  const kids = [...card.children].map((el) => {
    const b = el.getBoundingClientRect();
    return { tag: el.tagName, t: el.textContent.slice(0, 34), x: Math.round(b.x), r: Math.round(b.right), fs: getComputedStyle(el).fontSize };
  });
  return { card: { x: Math.round(cb.x), r: Math.round(cb.right), b: Math.round(cb.bottom) }, pad: getComputedStyle(card).padding, kids };
}, CUR);
console.log("GEO:", JSON.stringify(geo, null, 1));

await cont().click(); await wait(250); // -> step 7
for (let i = 0; i < 6; i++) {
  await page.getByRole("button", { name: /Back one step/ }).click(); await wait(250);
  console.log("BACK ->", JSON.stringify(await state()));
}
for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowRight"); await wait(250); }
console.log("FWD(arrow x5) ->", JSON.stringify(await state()));
// browser history back x3 then forward x3
for (let i = 0; i < 3; i++) { await page.goBack(); await wait(250); }
console.log("HIST BACK x3 ->", JSON.stringify(await state()));
for (let i = 0; i < 3; i++) { await page.goForward(); await wait(250); }
console.log("HIST FWD x3 ->", JSON.stringify(await state()));
console.log("ERRORS:", errs.join("\n") || "(none)");
await browser.close();
