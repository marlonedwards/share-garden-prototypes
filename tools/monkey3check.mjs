// Monkey Trade v3 walk: two live hands in a real browser, wide and phone.
// Run: node tools/monkey3check.mjs (dev server on 4318)
import { chromium } from "playwright";

const SHOTS = process.env.M3_SHOTS || "tools/shots/monkey3";
import { mkdirSync } from "node:fs";
mkdirSync(SHOTS, { recursive: true });

const errors = [];
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { console.error("FAIL " + msg); process.exitCode = 1; }
}

const browser = await chromium.launch();

async function playHand(page, { trade }) {
  // draw beat
  await page.getByText("draws from the barrel").waitFor({ timeout: 8000 });
  await page.getByText("draws from the barrel").waitFor({ state: "hidden", timeout: 8000 });
  if (trade) {
    const allIn = page.getByRole("button", { name: /^(All in|Buy A)$/ });
    await allIn.first().click({ timeout: 5000 });
  }
  // the moment
  const moment = page.getByText(/lands in your pocket|A bill lands/);
  await moment.waitFor({ timeout: 30000 });
  const isWindfall = (await page.getByText(/lands in your pocket/).count()) > 0;
  if (isWindfall) {
    await page.getByRole("button", { name: trade ? "Put it in" : "Keep it as cash" }).click();
  } else {
    const fromCash = page.getByRole("button", { name: "Pay from cash" });
    if (await fromCash.isEnabled()) await fromCash.click();
    else await page.getByRole("button", { name: "Sell to pay it" }).click();
  }
  // the settle
  await page.getByText(/than Random Monkey|A tie with Random Monkey/).waitFor({ timeout: 40000 });
}

// -------- wide
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto("http://localhost:4318/#/monkey3");
  await page.evaluate(() => localStorage.removeItem("monkey3-progress"));
  await page.reload();

  await playHand(page, { trade: true });
  ok(true, "hand one settles");
  const settleText = await page.textContent("body");
  ok(/was /.test(settleText), "reveal names the company");
  ok(/riding everything/i.test(settleText), "settle shows the riding line");
  await page.screenshot({ path: SHOTS + "/wide-settle.png" });
  await page.getByRole("button", { name: "Deal again" }).click();

  await playHand(page, { trade: false });
  ok(true, "hand two settles doing nothing");
  await page.screenshot({ path: SHOTS + "/wide-settle-2.png" });

  // tally advanced by two hands
  const tally = await page.textContent("body");
  ok(/Won \d+ of 2/.test(tally), "tally counts two hands");
  await page.close();
}

// -------- phone
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto("http://localhost:4318/#/monkey3");
  await page.evaluate(() => localStorage.removeItem("monkey3-progress"));
  await page.reload();
  await page.getByText("draws from the barrel").waitFor({ timeout: 8000 });
  await page.getByText("draws from the barrel").waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForTimeout(2500);
  const body = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  ok(body.scrollW <= body.clientW + 1, `no horizontal scroll on phone (${body.scrollW} vs ${body.clientW})`);
  await page.screenshot({ path: SHOTS + "/phone-run.png" });
  await page.close();
}

await browser.close();
ok(errors.length === 0, "no console errors: " + errors.join(" | "));
console.log(process.exitCode ? "monkey3check FAILED" : `monkey3check clean, ${checks} checks`);
