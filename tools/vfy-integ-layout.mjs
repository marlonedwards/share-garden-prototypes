// Layout-law audit: walk every intro lesson screen by screen, count visible
// cards, confirm the quiz replaces the stage, and confirm nothing stacks.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

async function probe() {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("div,section,article")].filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const bg = cs.backgroundColor;
      const white = bg.startsWith("rgb(255, 255, 255") || bg.startsWith("rgba(255, 255, 255");
      const rounded = parseFloat(cs.borderRadius) >= 10;
      const bordered = cs.borderTopWidth !== "0px" || cs.boxShadow !== "none";
      return white && rounded && bordered && r.width > 200 && r.height > 90;
    });
    const doc = document.documentElement;
    return {
      cards: cards.length,
      boxes: cards.map((c) => { const r = c.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}@y${Math.round(r.top)}`; }),
      scroll: doc.scrollHeight + "/" + doc.clientHeight,
      text: document.body.innerText.replace(/\n+/g, " | "),
    };
  });
}

const LESSONS = ["cash", "savings", "stocks", "funds", "coins"];
for (const id of LESSONS) {
  await page.goto(`${BASE}/#/orb/learn/${id}`);
  await wait(700);
  for (let step = 1; step <= 24; step++) {
    const info = await probe();
    const label = `${id}-s${String(step).padStart(2, "0")}`;
    console.log(`\n### ${label} cards=${info.cards} [${info.boxes.join(", ")}] scroll=${info.scroll}`);
    console.log("TEXT: " + info.text);
    await page.screenshot({ path: OUT + `lesson-${label}.png` });

    const cont = page.getByRole("button", { name: /^(Continue|Next|See results)/ }).first();
    const hasCont = await cont.count();
    const contEnabled = hasCont ? await cont.isEnabled() : false;
    if (hasCont && contEnabled) {
      await cont.click();
      await wait(550);
      continue;
    }
    // otherwise poke the stage / answer the check one control at a time,
    // re-checking Continue after every single touch. Deterministic LCG order
    // so a stage that needs a particular combination still gets found.
    let opened = false;
    let seed = 12345;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let poke = 0; poke < 90 && !opened; poke++) {
      const ranges = page.locator('input[type="range"]:visible');
      const rn = await ranges.count();
      const btns = page.locator("button:visible");
      const bn = await btns.count();
      if (rn && poke % 3 === 0) {
        await ranges.nth(rnd(rn)).evaluate((el, k) => {
          const min = Number(el.min || 0), max = Number(el.max || 100);
          const v = min + ((max - min) * ((k % 5) + 1)) / 5;
          const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          set.call(el, String(v));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, poke).catch(() => {});
        await wait(180);
      } else if (bn) {
        const b = btns.nth(rnd(bn));
        const t = (await b.innerText().catch(() => "")).trim();
        if (!/^(continue|next|see results|back|scenarios)/i.test(t) && (await b.isEnabled().catch(() => false))) {
          await b.click({ timeout: 1500 }).catch(() => {});
          await wait(170);
        }
      }
      const c2 = page.getByRole("button", { name: /^(Continue|Next|See results)/ }).first();
      if ((await c2.count()) && (await c2.isEnabled())) opened = true;
    }
    if (!opened) { console.log(`STUCK at ${label}`); break; }
    const c3 = page.getByRole("button", { name: /^(Continue|Next|See results)/ }).first();
    // re-probe after the interaction, before advancing, to see the post-touch card count
    const after = await probe();
    console.log(`   after-touch cards=${after.cards} [${after.boxes.join(", ")}] scroll=${after.scroll}`);
    await page.screenshot({ path: OUT + `lesson-${label}-touched.png` });
    await c3.click();
    await wait(550);
  }
}
await browser.close();
