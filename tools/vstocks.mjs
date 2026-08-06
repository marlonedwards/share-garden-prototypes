import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function metrics(page, tag) {
  const m = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("main > div:not(.hidden) button")];
    const cont = btns.find((b) => /Continue|Finish/.test(b.textContent));
    const r = cont ? cont.getBoundingClientRect() : null;
    const cards = [...document.querySelectorAll("main > div:not(.hidden) .rounded-2xl.bg-white")];
    return {
      hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollH: document.documentElement.scrollHeight,
      vh: window.innerHeight,
      contBottom: r ? Math.round(r.bottom) : null,
      contDisabled: cont ? cont.disabled : null,
      cards: cards.length,
      step: (document.querySelector("main span.tnum")?.textContent || "").trim(),
    };
  });
  console.log(tag, JSON.stringify(m));
  return m;
}

async function drive(page, label, shot) {
  const steps = [
    async () => { await page.getByRole("button", { name: /Buy 1 share/ }).click(); },
    async () => { await page.getByRole("button", { name: /whoever sold the share/ }).click(); },
    async () => { await page.locator("main > div:not(.hidden) input[type=range]").fill("14"); },
    async () => { await page.getByRole("button", { name: /A buyer walks up/ }).click(); await wait(120);
                  await page.getByRole("button", { name: /A buyer walks up/ }).click(); },
    async () => { await page.getByRole("button", { name: /A year passes/ }).click(); },
    async () => { for (const t of ["Sell the piece", "Vote when the stand", "Pour a free lemonade", "Order Maya"]) {
                    await page.getByRole("button", { name: new RegExp(t) }).click(); await wait(100); } },
    async () => { await page.getByRole("button", { name: /The same 1 of 100 pieces/ }).click(); },
    async () => { await page.getByRole("button", { name: /The last buyer and seller agreed/ }).click(); },
    async () => { await page.getByRole("button", { name: /^\$2\.00 in cash$/ }).click(); },
  ];
  for (let i = 0; i < steps.length; i++) {
    await metrics(page, `${label} s${i + 1} pre `);
    await steps[i]();
    await wait(250);
    const m = await metrics(page, `${label} s${i + 1} post`);
    if (m.contDisabled) console.log(`!! ${label} step ${i + 1}: Continue still disabled after interaction`);
    if (shot) await page.screenshot({ path: `${OUT}${label}-s${i + 1}.png` });
    if (i < steps.length - 1) {
      await page.getByRole("button", { name: /^Continue$/ }).click();
      await wait(300);
    }
  }
}

// ---- mobile 390x844
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/#/orb/learn/stocks`);
  await wait(800);
  await drive(page, "m390", true);
  await page.close();
}

// ---- desktop 1280x720 + back/forward state + marble clear
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/#/orb/learn/stocks`);
  await wait(800);
  await drive(page, "d1280", true);

  // finish
  await page.getByRole("button", { name: /^Finish$/ }).click();
  await wait(600);
  console.log("after finish url:", page.url());
  const store = await page.evaluate(() => ({
    guide: localStorage.getItem("orb-field-guide") || localStorage.getItem("orb-guide"),
    keys: Object.keys(localStorage),
    checks: localStorage.getItem("beta-checks"),
  }));
  console.log("STORE", JSON.stringify(store).slice(0, 1200));
  await page.screenshot({ path: OUT + "d1280-after-finish.png" });
  await page.close();
}

// ---- back/forward retention
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/#/orb/learn/stocks`);
  await wait(800);
  await page.getByRole("button", { name: /Buy 1 share/ }).click(); await wait(200);
  await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(300);
  await page.getByRole("button", { name: /whoever sold the share/ }).click(); await wait(200);
  await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(300);
  await page.locator("main > div:not(.hidden) input[type=range]").fill("14"); await wait(200);
  // go back twice
  await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
  await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
  const s1 = await page.evaluate(() => document.querySelector("main > div:not(.hidden)")?.innerText);
  console.log("BACK-TO-S1:", JSON.stringify(s1));
  await page.screenshot({ path: OUT + "back-s1.png" });
  // forward via keyboard
  await page.keyboard.press("ArrowRight"); await wait(300);
  const s2 = await page.evaluate(() => document.querySelector("main > div:not(.hidden)")?.innerText);
  console.log("FWD-TO-S2:", JSON.stringify(s2));
  await page.keyboard.press("ArrowRight"); await wait(300);
  const s3 = await page.evaluate(() => document.querySelector("main > div:not(.hidden)")?.innerText);
  console.log("FWD-TO-S3:", JSON.stringify(s3));
  await page.screenshot({ path: OUT + "fwd-s3.png" });
  await page.close();
}

await browser.close();
