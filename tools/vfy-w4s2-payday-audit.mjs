// Throwaway adversarial verification walk for W4 step 2, payday era.
// Drives the whole era end to end at port 4329 and shoots every beat.
import { chromium } from "playwright";
import fs from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });

const shot = async (n) => { await page.screenshot({ path: OUT + n + ".png" }); console.log("shot", n); };
const text = () => page.evaluate(() => document.querySelector("main").innerText);

// visible white cards in the copy column + does the document scroll
const layout = async (tag) => {
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("main div")]
      .filter((el) => {
        const s = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return /rounded-2xl|rounded-3xl/.test(el.className || "") &&
          /255, 255, 255/.test(s.backgroundColor) && b.width > 250 && b.height > 60;
      })
      .map((el) => {
        const b = el.getBoundingClientRect();
        return { h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom) };
      });
    return { cardCount: cards.length, cards, docH: document.documentElement.scrollHeight, winH: window.innerHeight };
  });
  console.log("LAYOUT", tag, JSON.stringify(r));
  return r;
};

await page.goto("http://localhost:4329/#/orb/s/payday");
await wait(1200);
await shot("pd-01-brief");
await layout("brief");

// ---- scouting deck ----
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
await shot("pd-02-deck-front");
const startBtn = page.getByRole("button", { name: "Start earning" });
console.log("start disabled before flips:", await startBtn.isDisabled());
for (let i = 0; i < 6; i++) {
  await page.getByRole("button", { name: `card ${i + 1}` }).click();
  await wait(280);
  if (i === 0) await shot("pd-03-deck-report");
  const t = await text();
  console.log(`card ${i + 1} report:`, JSON.stringify(t.split("Scout the menu before you start")[1] || "").slice(0, 460));
}
await wait(300);
await shot("pd-04-deck-all");
await layout("deck");
console.log("start disabled after flips:", await startBtn.isDisabled());
await startBtn.click();
await wait(800);

// ---- pause and buy one color so the schedule has weights ----
await page.getByRole("button", { name: "Pause", exact: true }).click().catch(() => {});
await wait(300);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(200);
await page.locator("main button", { hasText: "The Everything Store" }).last().click();
await wait(300);
await page.getByRole("button", { name: /^Buy \$100$/ }).first().click();
await wait(500);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("pd-05-bought");
console.log("after buy:", JSON.stringify((await text()).slice(0, 200)));
await page.getByRole("button", { name: "Play", exact: true }).click();
await page.getByRole("button", { name: "4×" }).click();

// ---- run the tape ----
const GATE_OPTS = /Keep investing every month|Invest it like any other month|Stick to the plan|The plan does not wait|No\. Invest it like every other month/;
const gatesSeen = [];
let payCards = 0;
for (let tick = 0; tick < 400; tick++) {
  const t = await text();
  if (t.includes("Read more:") && t.includes("?")) {
    const i = gatesSeen.length + 1;
    await wait(300);
    await shot(`pd-gate-${i}`);
    const L = await layout(`gate ${i}`);
    const body = t.split("Net worth")[1] || t;
    console.log(`GATE ${i} =====`, JSON.stringify(body.slice(body.indexOf("\n", body.indexOf("Cash")) )).slice(0, 1600));
    gatesSeen.push({ i, cards: L.cardCount, docH: L.docH });
    await page.locator("main button").filter({ hasText: GATE_OPTS }).first().click();
    await wait(400);
    const play = page.getByRole("button", { name: "Play", exact: true });
    if (await play.isVisible().catch(() => false)) await play.click().catch(() => {});
    await page.getByRole("button", { name: "4×" }).click().catch(() => {});
    continue;
  }
  if (t.includes("Your payday of $50.00 just arrived.")) {
    payCards++;
    if (payCards === 1) { await shot("pd-06-payday-card"); await layout("payday card"); }
    await page.getByRole("button", { name: "Invest, and do this automatically" }).click();
    await wait(300);
    await page.getByRole("button", { name: "4×" }).click().catch(() => {});
    continue;
  }
  if (t.includes("It is December 2007")) break;
  await wait(400);
}
await wait(1500);
console.log("gates seen:", gatesSeen.length, JSON.stringify(gatesSeen), "payday cards:", payCards);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("pd-07-debrief");
await layout("debrief");
console.log("DEBRIEF:", JSON.stringify((await text()).slice(0, 2600)));

// ---- quiz replaces the debrief ----
await page.getByRole("button", { name: "Quick check" }).click();
await wait(600);
await shot("pd-08-quiz-1");
await layout("quiz 1");
for (let i = 0; i < 14; i++) {
  const t = await text();
  const prog = t.match(/Question \d+ of \d+|\d+ of \d+/);
  console.log(`quiz screen ${i + 1}:`, prog ? prog[0] : "?", JSON.stringify(t.slice(t.indexOf("Prove what"), t.indexOf("Prove what") + 900)));
  const opts = page.locator("main button").filter({ hasText: /.{12,}/ });
  const next = page.getByRole("button", { name: /^(Next|Continue|Done|Finish|See results)/ }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click(); await wait(450);
  } else {
    // answer: click the second option button inside the check card
    const answered = await page.evaluate(() => {
      const btns = [...document.querySelectorAll("main button")].filter((b) => b.innerText.length > 12 && !/Back to the debrief|Play again|Quick check|Save your orb|Restart/.test(b.innerText));
      if (btns.length === 0) return null;
      btns[Math.min(1, btns.length - 1)].click();
      return btns.length;
    });
    console.log("  answered, options:", answered);
    await wait(500);
    if (i < 3) await shot(`pd-09-quiz-answered-${i + 1}`);
  }
  if ((await text()).includes("You got")) { await shot("pd-10-quiz-result"); break; }
}
await wait(400);
await shot("pd-11-quiz-end");
await layout("quiz end");
console.log("QUIZ END:", JSON.stringify((await text()).slice(0, 1800)));

// ---- briefing page ----
const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await p2.goto("http://localhost:4329/#/orb/brief/payday");
await wait(900);
await p2.screenshot({ path: OUT + "pd-12-briefing.png", fullPage: true });

// ---- scenario select card ----
const p3 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await p3.goto("http://localhost:4329/#/orb");
await wait(900);
await p3.screenshot({ path: OUT + "pd-13-select.png", fullPage: true });

console.log("ERRORS:", errs.length ? errs.join(" | ") : "none");
await browser.close();
