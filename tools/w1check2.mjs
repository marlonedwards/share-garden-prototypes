import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4321";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// ---------- 1. mobile layout ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/#/orb/learn/savings`);
  await wait(700);
  await page.getByRole("button", { name: /Wait one year/ }).click();
  await wait(200);
  await page.getByRole("button", { name: "Continue" }).click();
  await wait(400);
  await page.locator("input[type=range]").fill("30");
  await wait(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const sh = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log("mobile horizontal overflow:", overflow, "scrollHeight:", sh, "viewport 844");
  await page.screenshot({ path: OUT + "w1-mobile-savings.png", fullPage: true });
  await page.close();
}

// ---------- 2. answer correctly, marble clears; no duplicate writes on back/forward ----------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/#/orb/learn/cash`);
  await wait(700);
  // step 1
  for (let i = 0; i < 3; i++) { await page.locator("main .rounded-2xl button").first().click(); await wait(150); }
  await page.getByRole("button", { name: "Continue" }).click(); await wait(350);
  // step 2
  await page.locator("main input[type=range]").fill("8"); await wait(200);
  await page.getByRole("button", { name: "Continue" }).click(); await wait(350);
  // step 3
  await page.getByRole("button", { name: "The loud risk" }).click(); await wait(150);
  await page.getByRole("button", { name: "The quiet risk" }).click(); await wait(150);
  await page.getByRole("button", { name: "Continue" }).click(); await wait(350);
  // step 4 = check, answer correctly (index 1)
  const opts = page.locator("main .rounded-2xl button");
  console.log("check options on screen:", await opts.count());
  await opts.nth(1).click();
  await wait(400);
  await page.screenshot({ path: OUT + "w1-cash-correct.png" });
  let rows = await page.evaluate(() => JSON.parse(localStorage.getItem("beta-checks") ?? "[]"));
  console.log("results rows after answering:", rows.length, JSON.stringify(rows));
  // back then forward: must not re-open the question or write again
  await page.getByRole("button", { name: /back/i }).click(); await wait(300);
  await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
  const stillRevealed = await page.locator("text=Safe from crashes is not the same as safe").count();
  rows = await page.evaluate(() => JSON.parse(localStorage.getItem("beta-checks") ?? "[]"));
  console.log("after back+forward: explain still shown:", stillRevealed, "| rows:", rows.length);
  const optDisabled = await opts.first().isDisabled();
  console.log("options locked after return:", optDisabled);
  await page.getByRole("button", { name: "Finish" }).click(); await wait(600);
  console.log("finish url:", page.url());
  const strip = await page.locator("text=Start here: the basics").locator("xpath=../..").innerText();
  console.log("STRIP after correct cash answer:\n" + strip.split("\n").slice(0, 6).join(" | "));
  await page.screenshot({ path: OUT + "w1-strip-after-correct.png", fullPage: true });

  // retake the same lesson: does it write a second row?
  await page.goto(`${BASE}/#/orb/learn/cash`); await wait(500);
  rows = await page.evaluate(() => JSON.parse(localStorage.getItem("beta-checks") ?? "[]"));
  console.log("rows after re-entering lesson:", rows.length);

  // ---------- 3. keyboard gate ----------
  await page.goto(`${BASE}/#/orb/learn/stocks`); await wait(600);
  await page.keyboard.press("ArrowRight"); await wait(300);
  console.log("ArrowRight on ungated-but-unused screen 1 ->", await page.locator("main span.tnum").first().innerText());
  // slider focus must not steal arrow keys
  await page.goto(`${BASE}/#/orb/learn/cash`); await wait(500);
  for (let i = 0; i < 3; i++) { await page.locator("main .rounded-2xl button").first().click(); await wait(120); }
  await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
  await page.locator("main input[type=range]").focus();
  await page.keyboard.press("ArrowRight"); await wait(250);
  console.log("after ArrowRight with slider focused, step:", await page.locator("main span.tnum").first().innerText(),
    "| slider value:", await page.locator("main input[type=range]").inputValue());

  // ---------- 4. deep-link direct to each route, count screens ----------
  for (const id of ["cash", "savings", "stocks", "funds", "coins"]) {
    await page.goto(`${BASE}/#/orb/learn/${id}`); await wait(450);
    const t = await page.locator("main span.tnum").first().innerText();
    const eyebrow = await page.locator("main div.text-\\[12px\\].font-semibold").first().innerText();
    console.log(id, "->", t, "|", eyebrow);
  }
  await page.close();
}

await browser.close();
