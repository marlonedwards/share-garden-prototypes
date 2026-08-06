// Adversarial verifier for W2 lesson "cash". Throwaway; delete after use.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4322";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mob", width: 390, height: 844 },
  { name: "desk", width: 1280, height: 720 },
];

const browser = await chromium.launch();
const problems = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

  console.log(`\n########## ${vp.name} ${vp.width}x${vp.height} ##########`);
  await page.goto(`${BASE}/#/orb/learn/cash`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(700);

  const cur = () => page.locator("main > div").filter({ hasNot: page.locator("xx") }).nth(0); // placeholder
  const visibleCards = () => page.locator("main .bg-white.border:visible").count();

  const snap = async (tag) => {
    const info = await page.locator("main span.tnum").first().innerText().catch(() => "?");
    const cards = await visibleCards();
    const def = await page.locator("main p.text-\\[19px\\]:visible").first().innerText().catch(() => "");
    const story = await page.locator("main p.text-\\[14px\\]:visible").first().innerText().catch(() => "");
    const eyebrow = await page.locator("main div.text-\\[12px\\].font-semibold:visible").first().innerText().catch(() => "");
    const cont = page.locator("main button:visible").filter({ hasText: /^(Continue|Finish)$/ });
    const nCont = await cont.count();
    const disabled = nCont ? await cont.first().isDisabled() : null;
    const box = nCont ? await cont.first().boundingBox() : null;
    const m = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight, ih: window.innerHeight,
      bw: document.documentElement.scrollWidth, iw: window.innerWidth,
    }));
    const contVisible = box ? box.y + box.height <= m.ih + 1 : false;
    console.log(`[${tag}] ${info} cards=${cards} contN=${nCont} disabled=${disabled} scrollH=${m.sh}/${m.ih} contBottom=${box ? Math.round(box.y + box.height) : "?"} visible=${contVisible}`);
    console.log(`   eyebrow="${eyebrow}"`);
    console.log(`   def="${def}"`);
    console.log(`   story="${story}"`);
    if (cards > 1) problems.push(`${vp.name} ${info}: ${cards} visible cards`);
    if (m.sh > m.ih + 2) problems.push(`${vp.name} ${info}: page scrolls vertically ${m.sh}>${m.ih}`);
    if (m.bw > m.iw + 2) problems.push(`${vp.name} ${info}: page scrolls horizontally`);
    if (!contVisible) problems.push(`${vp.name} ${info}: Continue below the fold`);
    if (nCont !== 1) problems.push(`${vp.name} ${info}: ${nCont} Continue buttons visible`);
    await page.screenshot({ path: `${OUT}cash-${vp.name}-${tag}.png` });
    return { info, disabled };
  };

  // Correct answers, taken from src/lessons/cash.tsx.
  const RIGHT = ["Fewer pairs than it could on day one", "Price tags drifting up a few percent every year"];

  // Interact with whatever the current screen offers, playing it CORRECTLY.
  const interact = async () => {
    const card = page.locator("main .bg-white.border:visible").first();
    // check screen: click the right answer
    for (const txt of RIGHT) {
      const opt = card.locator("button:visible", { hasText: txt });
      if (await opt.count()) { await opt.first().click(); await wait(300); return "check"; }
    }
    // slider
    const slider = page.locator("main input[type=range]:visible");
    if (await slider.count()) {
      await slider.first().focus();
      for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
      await wait(300);
      return "slider";
    }
    // sort stage: right home per row
    const rows = card.locator("div.flex.flex-wrap");
    if (await rows.count() === 3) {
      const homes = ["The jar", "The jar", "Somewhere it can earn"];
      for (let i = 0; i < 3; i++) {
        await rows.nth(i).locator("button", { hasText: homes[i] }).first().click();
        await wait(200);
      }
      return "sort";
    }
    // generic stage buttons
    for (let i = 0; i < 8; i++) {
      const btns = card.locator("button:visible:not([disabled])");
      const n = await btns.count();
      if (!n) break;
      await btns.nth(Math.min(i, n - 1)).click();
      await wait(250);
      const cont = page.locator("main button:visible").filter({ hasText: /^(Continue|Finish)$/ });
      if (await cont.count() && !(await cont.first().isDisabled())) return "buttons";
    }
    return "exhausted";
  };

  let step = 0;
  const seen = [];
  for (; step < 12; step++) {
    const s = await snap(`s${String(step).padStart(2, "0")}pre`);
    seen.push(s.info);
    if (s.disabled) {
      const how = await interact();
      const s2 = await snap(`s${String(step).padStart(2, "0")}post`);
      if (s2.disabled) { problems.push(`${vp.name} ${s.info}: could not unlock Continue (${how})`); break; }
    }
    const cont = page.locator("main button:visible").filter({ hasText: /^(Continue|Finish)$/ });
    const label = await cont.first().innerText();

    // On step 3 (first check screen) test browser back/forward state retention
    if (step === 3 && vp.name === "desk") {
      await page.goBack(); await wait(400);
      const backInfo = await page.locator("main span.tnum").first().innerText();
      const sliderVal = await page.locator("main input[type=range]:visible").first().inputValue().catch(() => "n/a");
      console.log(`   [backtest] back -> ${backInfo} sliderValue=${sliderVal}`);
      if (!backInfo.includes("3 of")) problems.push(`browser back from step 4 landed on "${backInfo}"`);
      if (sliderVal !== "8") problems.push(`slider state lost on back: value=${sliderVal}`);
      await page.goForward(); await wait(400);
      const fwdInfo = await page.locator("main span.tnum").first().innerText();
      const checkPicked = await page.locator("main .bg-white.border:visible button:visible[disabled]").count();
      console.log(`   [backtest] forward -> ${fwdInfo} disabledOptions=${checkPicked}`);
      if (!fwdInfo.includes("4 of")) problems.push(`browser forward landed on "${fwdInfo}"`);
      if (checkPicked === 0) problems.push(`check answer state lost on forward (options re-enabled = retryable)`);
    }

    if (label === "Finish") {
      await cont.first().click();
      await wait(700);
      console.log(`   finished -> ${page.url()}`);
      break;
    }
    await cont.first().click();
    await wait(400);
  }

  const guide = await page.evaluate(() => localStorage.getItem("field-guide"));
  const checks = await page.evaluate(() => localStorage.getItem("beta-checks"));
  console.log("  field-guide:", guide);
  console.log("  beta-checks:", checks);
  if (!guide || !JSON.parse(guide).cleared?.includes("inflation")) problems.push(`${vp.name}: inflation marble NOT cleared after lesson`);
  console.log("  steps seen:", seen.join(" | "));
  if (errors.length) { console.log("  ERRORS:", errors); problems.push(`${vp.name}: console errors ${errors.join("; ")}`); }
  await ctx.close();
}

// Legacy route + step clamp checks
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${BASE}/#/orb/mini/cash`); await wait(600);
  console.log("\nlegacy /orb/mini/cash ->", page.url());
  await page.goto(`${BASE}/#/orb/learn/cash?step=7`); await wait(600);
  const clamped = await page.locator("main span.tnum").first().innerText();
  console.log("hand-typed ?step=7 ->", clamped);
  if (!clamped.includes("1 of")) problems.push(`?step=7 on a fresh run did not clamp to step 1 (got ${clamped})`);
  await page.close();
}

await browser.close();
console.log("\n===== PROBLEMS =====");
console.log(problems.length ? problems.map((p) => " - " + p).join("\n") : " none");
