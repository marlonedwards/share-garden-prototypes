// Fix-verification walk for the funds lesson: interact with every stage,
// screenshot each step at phone (390x844) and desktop (1280x720), and check
// that the Continue/Finish button is inside the viewport on every screen.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4325";
const browser = await chromium.launch();

async function walk(tag, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

  const screen = () => page.locator("main > div.pop-in");
  const cont = () => screen().locator("button").filter({ hasText: /^(Continue|Finish)$/ }).first();

  await page.goto(`${BASE}/#/orb/learn/funds`);
  await wait(700);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(700);

  async function satisfy(stepIdx) {
    if (!(await cont().isDisabled())) return;
    const btns = screen().locator(".rounded-2xl.bg-white button");
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      // On the flop screen tap the right marble first so the miss path does
      // not hide the callout; on checks the first correct-ish option is fine.
      const idx = stepIdx === 4 ? (i + 2) % n : i;
      try { await btns.nth(idx).click({ timeout: 700 }); } catch { }
      await wait(200);
      if (!(await cont().isDisabled())) return;
    }
  }

  for (let s = 0; s < 7; s++) {
    await satisfy(s);
    await wait(350);
    const c = cont();
    const box = await c.boundingBox();
    const inView = box && box.y + box.height <= viewport.height && box.y >= 0;
    const label = await c.innerText();
    console.log(`${tag} step ${s + 1}: ${label} visible-in-viewport=${inView}` + (box && !inView ? ` (y=${Math.round(box.y)} h=${Math.round(box.height)})` : ""));
    await page.screenshot({ path: `tools/shots/overnight/fundsFix-${tag}-0${s}.png` });
    if (s < 6) { await c.click(); await wait(450); }
  }
  console.log(tag, errors.length ? errors : "no console errors");
  await ctx.close();
}

await walk("phone", { width: 390, height: 844 });
await walk("desk", { width: 1280, height: 720 });
await browser.close();
