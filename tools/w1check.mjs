import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4321";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

async function cardCount() {
  return await page.locator("main .rounded-2xl.bg-white, main .rounded-3xl.bg-white").count();
}

async function stepInfo() {
  const t = await page.locator("main span.tnum").first().innerText().catch(() => "?");
  return t;
}

const LESSONS = ["cash", "savings", "stocks", "funds", "coins"];

for (const id of LESSONS) {
  console.log("\n===== LESSON", id, "=====");
  await page.goto(`${BASE}/#/orb/learn/${id}`);
  await wait(700);
  let step = 0;
  for (let guard = 0; guard < 14; guard++) {
    const info = await stepInfo();
    const cards = await cardCount();
    const heading = await page.locator("main p.text-\\[19px\\]").innerText().catch(() => "");
    const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ });
    const nCont = await cont.count();
    if (nCont === 0) { console.log("  no continue button, stopping at", info); break; }
    const disabled = await cont.isDisabled();
    console.log(`  ${info} | cards=${cards} | disabled=${disabled} | def="${heading.slice(0, 60)}"`);
    if (cards > 1) console.log("  !! MORE THAN ONE CARD");
    await page.screenshot({ path: `${OUT}w1-${id}-${String(step).padStart(2, "0")}.png` });
    // scroll check: page must not scroll vertically beyond viewport much
    const sh = await page.evaluate(() => document.documentElement.scrollHeight);
    if (sh > 1000) console.log("  !! page scrollHeight", sh);

    if (disabled) {
      // try to satisfy the gate: sliders to max, then every stage button
      const ranges = page.locator("main input[type=range]");
      const nr = await ranges.count();
      for (let i = 0; i < nr; i++) {
        const max = await ranges.nth(i).getAttribute("max");
        await ranges.nth(i).fill(max ?? "10");
        await wait(120);
      }
      let stillDisabled = await cont.isDisabled();
      if (stillDisabled) {
        const btns = page.locator("main .rounded-2xl.bg-white button");
        const nb = await btns.count();
        for (let i = 0; i < nb; i++) {
          const b = btns.nth(i);
          if (await b.isEnabled().catch(() => false)) {
            await b.click({ timeout: 2000 }).catch(() => {});
            await wait(180);
          }
          if (!(await cont.isDisabled())) break;
        }
      }
      // some stages need repeated clicks (count the jar)
      for (let k = 0; k < 4 && (await cont.isDisabled()); k++) {
        const btns = page.locator("main .rounded-2xl.bg-white button");
        const nb = await btns.count();
        for (let i = 0; i < nb; i++) {
          const b = btns.nth(i);
          if (await b.isEnabled().catch(() => false)) await b.click({ timeout: 2000 }).catch(() => {});
          await wait(150);
        }
      }
      if (await cont.isDisabled()) {
        console.log("  !! STUCK: continue still disabled after interacting");
        await page.screenshot({ path: `${OUT}w1-${id}-STUCK.png` });
        break;
      }
      await page.screenshot({ path: `${OUT}w1-${id}-${String(step).padStart(2, "0")}b-after.png` });
    }
    const isFinish = (await cont.innerText()) === "Finish";
    await cont.click();
    await wait(450);
    step++;
    if (isFinish) {
      console.log("  finished -> url", page.url());
      break;
    }
  }
}

// back arrow returns one step, and answers persist
console.log("\n===== back/forward state =====");
await page.goto(`${BASE}/#/orb/learn/coins`);
await wait(600);
await page.locator("main .rounded-2xl.bg-white button").first().click();
await page.locator("main .rounded-2xl.bg-white button").nth(1).click();
await wait(200);
await page.getByRole("button", { name: "Continue" }).click();
await wait(300);
console.log("step now:", await stepInfo());
await page.getByRole("button", { name: /back/i }).click();
await wait(300);
console.log("after back:", await stepInfo(), "continue disabled:", await page.getByRole("button", { name: "Continue" }).isDisabled());

// keyboard right arrow
await page.keyboard.press("ArrowRight");
await wait(300);
console.log("after ArrowRight:", await stepInfo());
await page.keyboard.press("ArrowLeft");
await wait(300);
console.log("after ArrowLeft:", await stepInfo());

// legacy routes
console.log("\n===== legacy routes =====");
for (const p of ["/#/orb/mini/share", "/#/orb/mini/fund", "/#/orb/mini/coin", "/#/orb/mini/cash", "/#/orb/learn/nonsense"]) {
  await page.goto(BASE + p);
  await wait(500);
  console.log(p, "->", page.url().split("#")[1], "| title:", await page.locator("header span.text-lg").innerText().catch(() => "NONE"));
}

// ladder strip on /orb
await page.goto(`${BASE}/#/orb`);
await wait(900);
const strip = await page.locator("text=Start here: the basics").count();
const links = await page.locator('a[href*="/orb/learn/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
console.log("\nstrip present:", strip, "order:", links.join(" > "));
await page.screenshot({ path: OUT + "w1-select-strip.png", fullPage: true });

// marble cleared indicator after finishing a check
const stripText = await page.locator("text=Start here: the basics").locator("xpath=../..").innerText();
console.log("STRIP TEXT:\n" + stripText);

console.log("\nERRORS:", errors.length ? errors.join("\n") : "none");
await browser.close();
