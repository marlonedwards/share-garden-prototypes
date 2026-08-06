import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4325";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

await page.goto(`${BASE}/#/orb/learn/funds`);
await wait(700);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(700);

const screen = () => page.locator("main > div.pop-in");
const cont = () => screen().locator("button").filter({ hasText: /^(Continue|Finish)$/ }).first();

// correct answers by prompt fragment
const CORRECT = [
  { match: /What does the fund actually deliver/, opt: /average of everything inside it/ },
  { match: /loses a quarter of its value/, opt: /slips only a few points/ },
];

for (let step = 0; step < 10; step++) {
  const info = await page.locator("main span.tnum").first().innerText();
  const eyebrow = await screen().locator("> div").first().innerText();
  const def = await screen().locator("> p").first().innerText();
  const story = await screen().locator("> p").nth(1).innerText();
  const cards = await page.locator("main .rounded-2xl.bg-white:visible, main .rounded-3xl.bg-white:visible").count();
  console.log(`\n${info} [${eyebrow}] cards=${cards}`);
  console.log("  DEF:", def);
  console.log("  STORY:", story);

  if (await cont().isDisabled()) {
    const promptText = await screen().locator(".rounded-2xl.bg-white").innerText();
    const rule = CORRECT.find((c) => c.match.test(promptText));
    if (rule) {
      await screen().locator(".rounded-2xl.bg-white button").filter({ hasText: rule.opt }).first().click();
      console.log("  answered correctly");
    } else {
      const btns = screen().locator(".rounded-2xl.bg-white button");
      const n = await btns.count();
      for (let i = 0; i < n; i++) {
        try { await btns.nth(i).click({ timeout: 700 }); } catch { }
        await wait(150);
        if (!(await cont().isDisabled())) break;
      }
    }
    await wait(500);
  }
  const stageText = await screen().locator(".rounded-2xl.bg-white").innerText().catch(() => "");
  console.log("  STAGE AFTER USE:", stageText.replace(/\s+/g, " ").slice(0, 300));
  await page.screenshot({ path: `${OUT}fundsB-${String(step).padStart(2, "0")}.png` });

  if (await cont().isDisabled()) { console.log("  !! STUCK"); break; }
  const label = (await cont().innerText()).trim();
  await cont().click();
  await wait(600);
  if (label === "Finish") break;
}

const fg = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("\nFIELD GUIDE:", fg);

// second lesson pass with the tripler tap on every company, checking the claim
await page.goto(`${BASE}/#/orb/learn/funds?step=6`);
await wait(700);
console.log("step param jump lands on:", await page.locator("main span.tnum").first().innerText());

console.log(errors.length ? errors : "no console errors");
await browser.close();
