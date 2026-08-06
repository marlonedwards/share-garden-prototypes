// Throwaway verifier for W2 lesson "cash". Drives /orb/learn/cash at both
// target viewports, screenshots every screen, and reports layout / state /
// marble violations. Safe to delete.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4322";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const VIEWPORTS = [
  { name: "mob", width: 390, height: 844 },
  { name: "desk", width: 1280, height: 720 },
];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

  console.log(`\n########## ${vp.name} ${vp.width}x${vp.height} ##########`);
  await page.goto(`${BASE}/#/orb/learn/cash`);
  await page.evaluate(() => localStorage.removeItem("field-guide"));
  await page.reload();
  await wait(800);

  const cardCount = () => page.locator("main .rounded-2xl.bg-white:visible, main .rounded-3xl.bg-white:visible").count();
  const stepInfo = () => page.locator("main span.tnum").first().innerText().catch(() => "?");

  for (let step = 0; step < 12; step++) {
    const info = await stepInfo();
    const cards = await cardCount();
    const def = await page.locator("main div:not(.hidden) > p.text-\\[19px\\]").first().innerText().catch(() => "");
    const cont = page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ });
    const nCont = await cont.count();
    if (nCont === 0) { console.log("  NO CONTINUE, stop at", info); break; }
    let disabled = await cont.first().isDisabled();

    const metrics = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      ih: window.innerHeight,
      bw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));
    const box = await cont.first().boundingBox();
    const contVisible = box && box.y + box.height <= metrics.ih + 1;
    console.log(`  ${info} | cards=${cards} | contDisabled=${disabled} | scrollH=${metrics.sh}/${metrics.ih} | contBottom=${box ? Math.round(box.y + box.height) : "?"} visible=${contVisible}`);
    if (cards > 1) console.log("  !! MORE THAN ONE VISIBLE CARD");
    if (metrics.sh > metrics.ih + 2) console.log(`  !! PAGE SCROLLS VERTICALLY (${metrics.sh} > ${metrics.ih})`);
    if (metrics.bw > metrics.iw + 2) console.log(`  !! PAGE SCROLLS HORIZONTALLY`);
    if (!contVisible) console.log("  !! CONTINUE BELOW THE FOLD");
    console.log(`     def="${def}"`);
    await page.screenshot({ path: `${OUT}w2cash-${vp.name}-${String(step).padStart(2, "0")}.png` });

    if (disabled) {
      // sliders first
      const ranges = page.locator("main div:not(.hidden) input[type=range]:visible");
      for (let i = 0; i < await ranges.count(); i++) {
        const max = await ranges.nth(i).getAttribute("max");
        await ranges.nth(i).fill(max ?? "8");
        await wait(150);
      }
      for (let round = 0; round < 5 && (await cont.first().isDisabled()); round++) {
        const btns = page.locator("main .rounded-2xl.bg-white:visible button:visible");
        const nb = await btns.count();
        for (let i = 0; i < nb; i++) {
          const b = btns.nth(i);
          if (await b.isEnabled().catch(() => false)) await b.click({ timeout: 2000 }).catch(() => {});
          await wait(140);
          if (!(await cont.first().isDisabled())) break;
        }
      }
      disabled = await cont.first().isDisabled();
      if (disabled) {
        console.log("  !! STUCK: continue still disabled after interacting");
        await page.screenshot({ path: `${OUT}w2cash-${vp.name}-STUCK.png` });
        break;
      }
      const m2 = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
      const b2 = await cont.first().boundingBox();
      console.log(`     after interaction: scrollH=${m2.sh}/${m2.ih} contBottom=${b2 ? Math.round(b2.y + b2.height) : "?"}`);
      if (m2.sh > m2.ih + 2) console.log(`  !! PAGE SCROLLS AFTER INTERACTION (${m2.sh} > ${m2.ih})`);
      if (b2 && b2.y + b2.height > m2.ih + 1) console.log("  !! CONTINUE BELOW THE FOLD AFTER INTERACTION");
      await page.screenshot({ path: `${OUT}w2cash-${vp.name}-${String(step).padStart(2, "0")}b.png` });
    }

    const isFinish = (await cont.first().innerText()) === "Finish";
    await cont.first().click();
    await wait(400);
    if (isFinish) {
      console.log("  finished ->", page.url());
      break;
    }
  }

  const guide = await page.evaluate(() => localStorage.getItem("field-guide"));
  const checks = await page.evaluate(() => localStorage.getItem("beta-checks"));
  console.log("  field-guide:", guide);
  console.log("  beta-checks:", checks);
  console.log("  ERRORS:", errors.length ? errors.join("\n") : "none");
  await page.close();
}

// ---- state across back/forward, at mobile size
console.log("\n########## back/forward state ##########");
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${BASE}/#/orb/learn/cash`);
await wait(700);
const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
const stepInfo = () => page.locator("main span.tnum").first().innerText().catch(() => "?");
const back = () => page.locator("header button").first().click();

// screen 1: two taps
for (let i = 0; i < 2; i++) { await page.locator("main .rounded-2xl.bg-white:visible button:visible").first().click(); await wait(200); }
console.log("s1 continue disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
// screen 2: three counts
for (let i = 0; i < 3; i++) { await page.locator("main .rounded-2xl.bg-white:visible button:visible").first().click(); await wait(180); }
await cont().click(); await wait(300);
// screen 3: slider
const r = page.locator("main div:not(.hidden) input[type=range]:visible").first();
await r.fill("8"); await wait(250);
console.log("s3 slider value:", await r.inputValue(), "| continue disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
console.log("now:", await stepInfo(), "(expect step 4, the check)");
// answer the check WRONG on purpose to test cloudy, then go back and forward
await page.locator("main .rounded-2xl.bg-white:visible button:visible").first().click();
await wait(250);
console.log("after wrong answer, continue disabled:", await cont().isDisabled());
console.log("guide after wrong:", await page.evaluate(() => localStorage.getItem("field-guide")));
await back(); await wait(300);
console.log("back ->", await stepInfo(), "| slider value preserved:", await page.locator("main div:not(.hidden) input[type=range]:visible").first().inputValue(), "| continue disabled:", await cont().isDisabled());
await page.keyboard.press("ArrowRight"); await wait(300);
const opts = page.locator("main .rounded-2xl.bg-white:visible button:visible");
console.log("forward ->", await stepInfo(), "| first option disabled (answer kept):", await opts.first().isDisabled(), "| retry possible:", await opts.nth(2).isEnabled());
await page.screenshot({ path: `${OUT}w2cash-state-check.png` });
// finish the rest correctly to see the second check clear the marble
for (let guard = 0; guard < 10; guard++) {
  const c = cont();
  if (await c.isDisabled()) {
    const ranges = page.locator("main div:not(.hidden) input[type=range]:visible");
    for (let i = 0; i < await ranges.count(); i++) await ranges.nth(i).fill((await ranges.nth(i).getAttribute("max")) ?? "8");
    for (let round = 0; round < 5 && (await c.isDisabled()); round++) {
      const btns = page.locator("main .rounded-2xl.bg-white:visible button:visible");
      for (let i = 0; i < await btns.count(); i++) {
        const b = btns.nth(i);
        // pick the CORRECT option on check screens
        if (await b.isEnabled().catch(() => false)) await b.click({ timeout: 1500 }).catch(() => {});
        await wait(130);
        if (!(await c.isDisabled())) break;
      }
    }
  }
  if (await c.isDisabled()) { console.log("stuck at", await stepInfo()); break; }
  const fin = (await c.innerText()) === "Finish";
  await c.click(); await wait(350);
  if (fin) break;
}
console.log("guide at end:", await page.evaluate(() => localStorage.getItem("field-guide")));
console.log("url at end:", page.url());
await browser.close();
