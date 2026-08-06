// Throwaway: measure the JarStage svg and probe edge behaviours on cash.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4322";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();

for (const vp of [{ n: "mob", w: 390, h: 844 }, { n: "desk", w: 1280, h: 720 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  await page.goto(`${BASE}/#/orb/learn/cash`);
  await wait(700);
  const card = () => page.locator("main .rounded-2xl.bg-white:visible").first();
  const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
  for (let i = 0; i < 2; i++) { await card().getByRole("button").click(); await wait(150); }
  await cont().click(); await wait(300);
  const b = await page.evaluate(() => {
    const s = [...document.querySelectorAll("main svg")].find((e) => e.getBoundingClientRect().width > 0);
    const r = s.getBoundingClientRect();
    return { w: r.width, h: r.height, attr: s.getAttribute("width") };
  });
  console.log(`${vp.n} JarStage svg rendered ${Math.round(b.w)}x${Math.round(b.h)} (declared width attr ${b.attr}, viewBox 72x88)`);
  await page.close();
}

// edge: does the sort stage let you un-solve it after Continue unlocks?
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${BASE}/#/orb/learn/cash`); await wait(700);
const card = () => page.locator("main .rounded-2xl.bg-white:visible").first();
const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
const adv = async () => { await cont().click(); await wait(300); };
for (let i = 0; i < 2; i++) { await card().getByRole("button").click(); await wait(150); } await adv();
for (let i = 0; i < 3; i++) { await card().getByRole("button").click(); await wait(150); } await adv();
await page.locator("main div:not(.hidden) input[type=range]:visible").first().fill("8"); await wait(200); await adv();
await card().getByRole("button", { name: "Fewer pairs than it could on day one" }).click(); await wait(250); await adv();
await card().getByRole("button", { name: "The loud risk" }).click(); await wait(150);
await card().getByRole("button", { name: "The quiet risk" }).click(); await wait(200); await adv();
const rows = page.locator("main div:not(.hidden) .rounded-2xl.bg-white .flex-wrap");
await rows.nth(0).getByRole("button", { name: "The jar" }).click();
await rows.nth(1).getByRole("button", { name: "The jar" }).click();
await rows.nth(2).getByRole("button", { name: "Somewhere it can earn" }).click(); await wait(250);
console.log("sort solved, continue disabled:", await cont().isDisabled());
await rows.nth(0).getByRole("button", { name: "Somewhere it can earn" }).click(); await wait(250);
console.log("after breaking the sort again, continue disabled:", await cont().isDisabled(),
  "| feedback:", (await card().innerText()).split("\n").pop());
await page.screenshot({ path: OUT + "w2cash-sort-broken.png" });

// edge: revisit screen 3 after going forward, does the slider keep year 8 story?
await page.locator("header button").first().click(); await wait(250);
await page.locator("header button").first().click(); await wait(250);
await page.locator("header button").first().click(); await wait(250);
console.log("stepped back to:", await page.locator("main span.tnum").first().innerText());
console.log("slider still:", await page.locator("main div:not(.hidden) input[type=range]:visible").first().inputValue());

// edge: leaving mid-lesson then returning fresh
await page.goto(`${BASE}/#/orb/learn/cash`); await wait(600);
console.log("re-entered at:", await page.locator("main span.tnum").first().innerText());
await browser.close();
