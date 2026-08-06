// Adversarial verification of W4 step 2 for the gfc era: play it end to end,
// screenshot every beat, and measure the layout law on a 1280x800 laptop.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

// how many white "card" surfaces are visible, and does anything fall past the fold
const layout = () =>
  p.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 120 && r.height > 60 && s.visibility !== "hidden" && s.display !== "none";
    };
    const cards = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const bg = s.backgroundColor;
      const white = bg === "rgb(255, 255, 255)";
      const rounded = parseFloat(s.borderRadius) >= 12;
      const bordered = s.borderTopWidth !== "0px" || s.boxShadow !== "none";
      return white && rounded && bordered && vis(d) && !d.closest("[aria-hidden='true']");
    });
    // drop nested ones (keep outermost)
    const tops = cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
    const btns = [...document.querySelectorAll("button")].filter(vis);
    const lowest = btns.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom), 0);
    return {
      cards: tops.length,
      cardRects: tops.map((c) => {
        const r = c.getBoundingClientRect();
        return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) };
      }),
      lowestButtonBottom: Math.round(lowest),
      docH: document.documentElement.scrollHeight,
      viewH: window.innerHeight,
    };
  });

const shot = async (n) => { await p.screenshot({ path: OUT + `gfcv-${n}.png` }); };

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
console.log("== BRIEF ==", await body());
console.log("brief layout", JSON.stringify(await layout()));
await shot("01-brief");

await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(500);
const n = await p.locator('button[aria-label^="card "]').count();
console.log("scouting cards:", n);
await shot("02-scout-front");
// read every report through the tap path (the intended flow)
const deck = p.locator('button[aria-label^="Flip the card"], button[aria-label^="Scouting report"]').first();
for (let i = 0; i < n * 2 + 2; i++) {
  await deck.click();
  await wait(160);
  if (i === 0) { await shot("03-scout-report"); console.log("report 1:", (await body()).slice(0, 1400)); }
  const t = await body();
  if (/Every card is scouted/.test(t)) break;
}
await wait(300);
console.log("after deck:", (await body()).slice(0, 300));
console.log("scout layout", JSON.stringify(await layout()));
await shot("04-scout-done");

const start = p.locator("button").filter({ hasText: /^Start in 2007$/ }).first();
console.log("start disabled?", await start.isDisabled());
await start.click();
await wait(900);

const gates = [];
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();
for (let t = 0; t < 900; t++) {
  const txt = await body();
  const m = txt.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{4} · ([A-Za-z ]+?) \| /);
  // a gate is on screen when a Read more line plus option buttons appear
  const gateOn = /Read more:/.test(txt) && !/Take these lessons/.test(txt);
  if (gateOn) {
    const g = await p.evaluate(() => {
      const eyebrowEls = [...document.querySelectorAll("div,span")].filter((e) => /·/.test(e.textContent ?? "") && e.children.length === 0);
      return document.body.innerText;
    });
    const idx = gates.length + 1;
    await shot(`05-gate${idx}`);
    const lay = await layout();
    gates.push({ idx, text: g.replace(/\n+/g, " | "), layout: lay });
    console.log(`--- GATE ${idx} ---`, g.replace(/\n+/g, " | "));
    console.log(`gate ${idx} layout`, JSON.stringify(lay));
    // choose the middle (hold) option so the tape keeps rolling
    const opts = await p.locator("button").filter({ hasText: /^(Take profits, move to cash|Keep holding everything|Buy more while it climbs|Sell my bank stocks|Hold everything|Buy the fear|Sell everything|Hold and ride it out|Buy while everyone is scared|Buy|Hold|Stay out|Sell and wait for the next crash|Stay with the plan|Put spare cash in)$/ }).allInnerTexts();
    console.log("options:", JSON.stringify(opts));
    const hold = p.locator("button").filter({ hasText: /^(Keep holding everything|Hold everything|Hold and ride it out|Hold|Stay with the plan)$/ }).first();
    await hold.click();
    await wait(700);
    const f2 = p.locator("button", { hasText: /^4×$/ }).first();
    if (await f2.count()) await f2.click();
    continue;
  }
  if (/Take these lessons|December 2015\./.test(txt) || /You finished with/.test(txt)) break;
  await wait(250);
}
console.log("gates hit:", gates.length);
await wait(600);
console.log("== END SCORE ==", await body());
console.log("score layout", JSON.stringify(await layout()));
await shot("06-end-score");

await p.locator("button").filter({ hasText: /^Continue$/ }).first().click();
await wait(700);
console.log("rewind layout", JSON.stringify(await layout()));
await shot("07-end-rewind");
await p.locator("button").filter({ hasText: /^Continue$/ }).first().click();
await wait(600);
console.log("== LESSONS ==", await body());
console.log("lessons layout", JSON.stringify(await layout()));
await shot("08-end-lessons");

await p.locator("button").filter({ hasText: /^Quick check$/ }).first().click();
await wait(600);
console.log("quiz layout", JSON.stringify(await layout()));
for (let i = 0; i < 12; i++) {
  const txt = await body();
  if (!/Quick check/.test(txt)) break;
  const m = txt.match(/(\d+) of (\d+)/);
  console.log(`-- QUIZ ITEM ${i + 1} (${m ? m[0] : "?"}) --`, txt.slice(txt.indexOf("Quick check")));
  if (i === 0) { await shot("09-quiz1"); console.log("quiz1 layout", JSON.stringify(await layout())); }
  const opts = p.locator("button").filter({ hasNotText: /^(Back to the debrief|Play again|Restart|scenarios)$/ });
  // pick the first answer option inside the check
  const answered = await p.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const cand = btns.filter((b) => /rounded-xl/.test(b.className) && b.innerText.length > 8);
    if (cand.length === 0) return null;
    cand[0].click();
    return cand.length;
  });
  await wait(400);
  const nx = p.locator("button").filter({ hasText: /^(Next|See results)$/ }).first();
  if (await nx.count()) {
    if (i === 0) { await shot("10-quiz1-answered"); console.log("answered layout", JSON.stringify(await layout())); }
    await nx.click();
    await wait(400);
  } else {
    console.log("NO NEXT BUTTON after answering; options found:", answered);
    break;
  }
  if (/\d+ \/ \d+/.test(await body()) && /Beta testers/.test(await body())) break;
}
console.log("== QUIZ RESULTS ==", await body());
console.log("results layout", JSON.stringify(await layout()));
await shot("11-quiz-results");

// the briefing page
await p.goto(`${BASE}/#/orb/brief/gfc`);
await wait(900);
await shot("12-briefing-top");
console.log("== BRIEFING ==", await body());
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(400);
await shot("13-briefing-bottom");

await browser.close();
console.log("DONE");
