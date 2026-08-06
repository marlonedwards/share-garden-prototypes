// Throwaway verifier for W2 lesson "savings". Drives /orb/learn/savings at both
// target viewports, screenshots every screen, and reports layout / state /
// marble violations. Safe to delete.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4323";
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
  await page.goto(`${BASE}/#/orb/learn/savings`);
  await page.evaluate(() => { localStorage.removeItem("field-guide"); localStorage.removeItem("beta-checks"); });
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
    await page.screenshot({ path: `${OUT}w2sav-${vp.name}-${String(step).padStart(2, "0")}.png` });

    if (disabled) {
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
        await page.screenshot({ path: `${OUT}w2sav-${vp.name}-STUCK.png` });
        break;
      }
      const m2 = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
      const b2 = await cont.first().boundingBox();
      console.log(`     after interaction: scrollH=${m2.sh}/${m2.ih} contBottom=${b2 ? Math.round(b2.y + b2.height) : "?"}`);
      if (m2.sh > m2.ih + 2) console.log(`  !! PAGE SCROLLS AFTER INTERACTION (${m2.sh} > ${m2.ih})`);
      if (b2 && b2.y + b2.height > m2.ih + 1) console.log("  !! CONTINUE BELOW THE FOLD AFTER INTERACTION");
      await page.screenshot({ path: `${OUT}w2sav-${vp.name}-${String(step).padStart(2, "0")}b.png` });
    }

    const isFinish = (await cont.first().innerText()) === "Finish";
    await cont.first().click();
    await wait(400);
    if (isFinish) {
      console.log("  finished ->", page.url());
      break;
    }
  }

  console.log("  field-guide:", await page.evaluate(() => localStorage.getItem("field-guide")));
  console.log("  beta-checks:", await page.evaluate(() => localStorage.getItem("beta-checks")));
  console.log("  ERRORS:", errors.length ? errors.join("\n") : "none");
  await page.close();
}

// ---- state across back/forward, at mobile size
console.log("\n########## back/forward state ##########");
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${BASE}/#/orb/learn/savings`);
await page.evaluate(() => { localStorage.removeItem("field-guide"); localStorage.removeItem("beta-checks"); });
await page.reload();
await wait(700);
const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
const stepInfo = () => page.locator("main span.tnum").first().innerText().catch(() => "?");
const back = () => page.locator("header button").first().click();
const vis = () => page.locator("main .rounded-2xl.bg-white:visible button:visible");

// s1 collect interest
await vis().first().click(); await wait(250);
console.log("s1 disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
// s2 curve slider
const r2 = page.locator("main div:not(.hidden) input[type=range]:visible").first();
await r2.fill("23"); await wait(250);
console.log("s2 slider:", await r2.inputValue(), "disabled:", await cont().isDisabled(),
  "guide:", await page.evaluate(() => localStorage.getItem("field-guide")));
await cont().click(); await wait(300);
// s3 three reveals
for (let i = 0; i < 3; i++) { await vis().nth(i).click().catch(() => {}); await wait(180); }
console.log("s3 disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
// s4 keepup slider
const r4 = page.locator("main div:not(.hidden) input[type=range]:visible").first();
await r4.fill("8"); await wait(250);
console.log("s4 slider:", await r4.inputValue(), "disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
// s5 three homes
for (let i = 0; i < 3; i++) { await vis().nth(i).click().catch(() => {}); await wait(180); }
console.log("s5 disabled:", await cont().isDisabled());
await cont().click(); await wait(300);
console.log("now:", await stepInfo(), "(expect step 6, first check)");
// answer WRONG on purpose
await vis().nth(1).click(); await wait(300);
console.log("after wrong answer disabled:", await cont().isDisabled());
console.log("guide after wrong:", await page.evaluate(() => localStorage.getItem("field-guide")));

// walk all the way back and confirm every stage kept its state
for (let i = 0; i < 5; i++) { await back(); await wait(250); }
console.log("walked back to:", await stepInfo());
console.log("  s1 button text:", await vis().first().innerText().catch(() => "?"));
await page.keyboard.press("ArrowRight"); await wait(250);
console.log("  s2 slider preserved:", await page.locator("main div:not(.hidden) input[type=range]:visible").first().inputValue());
await page.keyboard.press("ArrowRight"); await wait(250);
const s3text = await page.locator("main div:not(.hidden) p").last().innerText().catch(() => "?");
console.log("  s3 reveals preserved:", JSON.stringify(s3text.slice(0, 60)));
await page.keyboard.press("ArrowRight"); await wait(250);
console.log("  s4 slider preserved:", await page.locator("main div:not(.hidden) input[type=range]:visible").first().inputValue());
await page.keyboard.press("ArrowRight"); await wait(250);
await page.keyboard.press("ArrowRight"); await wait(250);
const opts = vis();
console.log("  back at:", await stepInfo(), "| answer kept (opt0 disabled):", await opts.first().isDisabled(),
  "| retry possible:", await opts.nth(2).isEnabled());
await page.screenshot({ path: `${OUT}w2sav-state-check.png` });

// finish the run with the wrong answer standing, then check the second item
await cont().click(); await wait(300);
console.log("last screen:", await stepInfo());
await vis().nth(1).click(); await wait(300);
console.log("final guide:", await page.evaluate(() => localStorage.getItem("field-guide")));
console.log("final checks:", await page.evaluate(() => localStorage.getItem("beta-checks")));
await cont().click(); await wait(500);
console.log("after finish ->", page.url());
await page.screenshot({ path: `${OUT}w2sav-after-finish.png` });
await page.close();

await browser.close();
