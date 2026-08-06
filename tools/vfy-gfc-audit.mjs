// Adversarial end-to-end audit of the gfc era: scouting deck, all five gates,
// debrief, five quiz items, briefing page. Screens go to tools/shots/overnight/.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

// how many card-like surfaces are visible, and does the page scroll vertically
const layout = async () =>
  p.evaluate(() => {
    const cards = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return (
        s.backgroundColor === "rgb(255, 255, 255)" &&
        parseFloat(s.borderRadius) >= 10 &&
        r.width > 260 && r.height > 90 &&
        r.top < window.innerHeight && r.bottom > 0
      );
    });
    // keep only outermost (drop nested white cards inside a card)
    const outer = cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
    return {
      cards: outer.length,
      cardBoxes: outer.map((c) => {
        const r = c.getBoundingClientRect();
        return [Math.round(r.top), Math.round(r.bottom), Math.round(r.width)];
      }),
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      scrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
    };
  });

// ---- briefing page ----
await p.goto(`${BASE}/#/orb/brief/gfc`);
await wait(900);
await p.screenshot({ path: OUT + "gfc-audit-brief.png", fullPage: true });
console.log("BRIEFING len", (await body()).length);

// ---- scenario ----
await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await p.screenshot({ path: OUT + "gfc-audit-01-brief.png" });
console.log("BRIEF BEAT layout", JSON.stringify(await layout()));

const scout = p.getByRole("button", { name: /Scout the menu/ }).first();
console.log("scout button?", await scout.count());
await scout.click();
await wait(600);
const n = await p.locator('button[aria-label^="card "]').count();
console.log("scouting cards", n);
await p.screenshot({ path: OUT + "gfc-audit-02-card1.png" });
for (let i = 0; i < n; i++) {
  await p.locator(`button[aria-label="card ${i + 1}"]`).click();
  await wait(120);
  if (i === 0) {
    console.log("CARD1 TEXT", (await body()).slice(0, 700));
    await p.screenshot({ path: OUT + "gfc-audit-03-cardflip.png" });
  }
  if (i === n - 1) await p.screenshot({ path: OUT + "gfc-audit-04-lastcard.png" });
}
await wait(400);
const startGeo = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /^Start in /.test(x.innerText.trim()));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { label: b.innerText.trim(), bottom: Math.round(r.bottom), vh: window.innerHeight, clipped: r.bottom > window.innerHeight, disabled: b.disabled };
});
console.log("START BTN", JSON.stringify(startGeo));

await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(900);
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();

const expected = ["October 2007", "March 2008", "September 2008", "March 2009", "March 2013"];
const seen = [];
for (let gi = 0; gi < 5; gi++) {
  let found = false;
  for (let t = 0; t < 500; t++) {
    const txt = await body();
    if (/Crossroads|What do you do|Warning shot|Do you believe/.test(txt) &&
        expected.some((e) => txt.includes(e) && !seen.includes(e))) { found = true; break; }
    await wait(250);
  }
  if (!found) { console.log("GATE", gi + 1, "NEVER APPEARED"); break; }
  await wait(500);
  const txt = await body();
  const which = expected.find((e) => txt.includes(e) && !seen.includes(e));
  seen.push(which);
  console.log(`\n=== GATE ${gi + 1} (${which}) ===`);
  console.log(txt.slice(0, 1400));
  console.log("layout", JSON.stringify(await layout()));
  await p.screenshot({ path: OUT + `gfc-audit-gate${gi + 1}.png` });
  // pick the non-act "hold" style option so the tape resumes without a trade pause
  const opts = await p.evaluate(() => {
    const card = document.body.innerText;
    return card;
  });
  void opts;
  const holdLabels = [/^Keep holding everything$/, /^Hold everything$/, /^Hold and ride it out$/, /^Hold$/, /^Stay with the plan$/];
  let clicked = false;
  for (const re of holdLabels) {
    const b = p.locator("button").filter({ hasText: re }).first();
    if (await b.count()) { await b.click(); clicked = true; break; }
  }
  console.log("answered:", clicked);
  await wait(700);
}
console.log("\nGATES SEEN", seen.length, seen.join(" / "));

// run to the end
for (let t = 0; t < 900; t++) {
  const txt = await body();
  if (/December 2015/.test(txt)) break;
  await wait(250);
}
await wait(1200);
console.log("\n=== END BEAT ===");
console.log((await body()).slice(0, 1600));
console.log("layout", JSON.stringify(await layout()));
await p.screenshot({ path: OUT + "gfc-audit-end.png", fullPage: true });

// quiz
const q = p.locator("button").filter({ hasText: /^(Take the check|Check what stuck|Start the check)/ }).first();
if (await q.count()) { await q.click(); await wait(700); }
else {
  const any = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean));
  console.log("BUTTONS AT END", JSON.stringify(any));
}
for (let i = 0; i < 6; i++) {
  await wait(500);
  const txt = await body();
  if (!/\b\d of \d\b|Question|check/i.test(txt) && i > 0) break;
  console.log(`\n=== QUIZ SCREEN ${i + 1} ===`);
  console.log(txt.slice(0, 900));
  console.log("layout", JSON.stringify(await layout()));
  await p.screenshot({ path: OUT + `gfc-audit-quiz${i + 1}.png` });
  const choices = p.locator('[role="button"], button');
  const labels = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()));
  void choices;
  console.log("btns", JSON.stringify(labels));
  // click the first plausible option button
  const opt = p.locator("button").filter({ hasText: /.{12,}/ }).first();
  if (await opt.count()) await opt.click();
  await wait(600);
  const next = p.locator("button").filter({ hasText: /^(Next|Continue|Done|Finish|See results)/ }).first();
  if (await next.count()) { await next.click(); await wait(400); }
}
await p.screenshot({ path: OUT + "gfc-audit-quizend.png", fullPage: true });
await browser.close();
console.log("DONE");
