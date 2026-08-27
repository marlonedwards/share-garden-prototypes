// Wall Street walk: two live hands wide, a phone pass, zero console errors.
// Run: node tools/streetcheck.mjs (dev server on 4318)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SHOTS = process.env.ST_SHOTS || "tools/shots/street";
mkdirSync(SHOTS, { recursive: true });

const errors = [];
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { console.error("FAIL " + msg); process.exitCode = 1; }
}

const browser = await chromium.launch();

async function waitDraw(page) {
  await page.getByText("draws from the barrel").waitFor({ timeout: 9000 });
  await page.getByText("draws from the barrel").waitFor({ state: "hidden", timeout: 9000 });
}

async function waitSettle(page) {
  await page.getByText(/Target cleared|Under the target/).waitFor({ timeout: 50000 });
}

{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto("http://localhost:4318/#/street");
  await page.evaluate(() => localStorage.removeItem("street-progress"));
  await page.reload();

  // hand one: buy the stock, ride it out
  await waitDraw(page);
  await page.getByRole("button", { name: "Buy", exact: true }).first().click();
  await page.getByRole("button", { name: "Buy", exact: true }).first().click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: SHOTS + "/wide-run.png" });
  await waitSettle(page);
  const settle = await page.textContent("body");
  ok(/than the monkey|A tie with the monkey/.test(settle), "settle compares to the monkey");
  ok(/Riding/.test(settle), "settle shows riding");
  ok(/was /.test(settle), "reveal names the company");
  await page.screenshot({ path: SHOTS + "/wide-settle.png" });
  await page.getByRole("button", { name: "Deal again" }).click();

  // hand two: do nothing at all
  await waitDraw(page);
  await waitSettle(page);
  ok(true, "an idle hand settles");
  const tally = await page.textContent("body");
  ok(/Won \d+ of 2/.test(tally), "tally counts two hands");
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto("http://localhost:4318/#/street");
  await page.evaluate(() => localStorage.removeItem("street-progress"));
  await page.reload();
  await waitDraw(page);
  await page.waitForTimeout(4000);
  const body = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  ok(body.scrollW <= body.clientW + 1, `no horizontal page scroll on phone (${body.scrollW} vs ${body.clientW})`);
  await page.screenshot({ path: SHOTS + "/phone-run.png" });
  await page.close();
}

await browser.close();
ok(errors.length === 0, "no console errors: " + errors.join(" | "));
console.log(process.exitCode ? "streetcheck FAILED" : `streetcheck clean, ${checks} checks`);
