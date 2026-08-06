import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4325";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { tag: "m", width: 390, height: 844 },
  { tag: "d", width: 1280, height: 720 },
];

const browser = await chromium.launch();

for (const v of VIEWS) {
  console.log(`\n########## VIEW ${v.tag} ${v.width}x${v.height} ##########`);
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

  await page.goto(`${BASE}/#/orb/learn/funds`);
  await wait(800);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(800);

  for (let step = 0; step < 12; step++) {
    const info = await page.locator("main span.tnum").first().innerText().catch(() => "?");
    const def = await page.locator("main:visible p.text-\\[19px\\]").first().innerText().catch(() => "");
    const eyebrow = await page.locator("main div.pop-in > div.text-\\[12px\\]").first().innerText().catch(() => "");
    const cards = await page.locator("main .pop-in .rounded-2xl.bg-white, main .pop-in .rounded-3xl.bg-white").count();
    const cont = page.locator("main div.pop-in button").filter({ hasText: /^(Continue|Finish)$/ }).first();
    if (await cont.count() === 0) { console.log("  NO CONTINUE at", info); break; }
    let disabled = await cont.isDisabled();
    console.log(`  ${info} | eyebrow="${eyebrow}" | cards=${cards} | contDisabled=${disabled}`);
    if (cards > 1) console.log("  !! MORE THAN ONE CARD VISIBLE");

    // interact if gated
    if (disabled) {
      const stageBtns = page.locator("main div.pop-in .rounded-2xl.bg-white button");
      const nb = await stageBtns.count();
      for (let i = 0; i < nb; i++) {
        try { await stageBtns.nth(i).click({ timeout: 800 }); } catch { }
        await wait(150);
        if (!(await cont.isDisabled())) break;
      }
      disabled = await cont.isDisabled();
      console.log(`     after interaction: contDisabled=${disabled}`);
    }
    await wait(400);

    // geometry check
    const geo = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      ch: document.documentElement.clientHeight,
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    const box = await cont.boundingBox();
    const contBottom = box ? box.y + box.height : -1;
    const fits = geo.sh <= geo.ch + 2 && contBottom <= geo.ch;
    console.log(`     scrollH=${geo.sh} clientH=${geo.ch} scrollW=${geo.sw} clientW=${geo.cw} contBottom=${Math.round(contBottom)} FITS=${fits}`);
    if (!fits) console.log("     !! DOES NOT FIT / CONTINUE BELOW FOLD");

    await page.screenshot({ path: `${OUT}funds-${v.tag}-${String(step).padStart(2, "0")}.png`, fullPage: geo.sh > geo.ch });

    if (disabled) { console.log("  !! STUCK: cannot satisfy gate"); break; }
    const label = (await cont.innerText()).trim();
    if (label === "Finish") {
      const fg = await page.evaluate(() => localStorage.getItem("sg-field-guide") || localStorage.getItem("sg-guide") || JSON.stringify(Object.keys(localStorage)));
      console.log("  FIELD GUIDE BEFORE FINISH:", fg);
      await cont.click();
      await wait(700);
      console.log("  after Finish url:", page.url());
      const keys = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
      console.log("  LOCALSTORAGE:", JSON.stringify(keys).slice(0, 900));
      break;
    }
    await cont.click();
    await wait(500);
  }

  // ---- state across back/forward on the funds lesson
  console.log("\n  --- back/forward state test ---");
  await page.goto(`${BASE}/#/orb/learn/funds`);
  await wait(600);
  // step1: reveal board
  await page.locator("main div.pop-in .rounded-2xl.bg-white button").first().click();
  await wait(300);
  const s1text = await page.locator("main div.pop-in .rounded-2xl.bg-white").innerText();
  console.log("  step1 after reveal contains percent:", /%/.test(s1text));
  await page.locator("main div.pop-in button").filter({ hasText: /^Continue$/ }).first().click();
  await wait(400);
  await page.goBack();
  await wait(600);
  const s1b = await page.locator("main div.pop-in .rounded-2xl.bg-white").innerText();
  console.log("  after browser Back, step1 still revealed:", /%/.test(s1b), "| step:", await page.locator("main span.tnum").first().innerText());
  await page.goForward();
  await wait(600);
  console.log("  after browser Forward step:", await page.locator("main span.tnum").first().innerText());
  const contAfter = page.locator("main div.pop-in button").filter({ hasText: /^(Continue|Finish)$/ }).first();
  console.log("  continue disabled after forward:", await contAfter.isDisabled());
  // in-lesson back arrow
  await page.locator("header button").first().click();
  await wait(500);
  console.log("  after in-app back arrow step:", await page.locator("main span.tnum").first().innerText());

  if (errors.length) console.log("  ERRORS:", errors.slice(0, 10));
  else console.log("  no console errors");
  await ctx.close();
}

await browser.close();
