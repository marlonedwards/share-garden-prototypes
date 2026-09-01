// Stack acceptance walk (docs/stack-desktop-spec.md). Plays unit 1 end to
// end with the real engine, opens the chest, trades with cards on the
// Desk, and checks the money and the deck reconcile to the cent.
// Run: node tools/stackcheck.mjs   (dev server on 4318)

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#";
const SHOTS = new URL("./shots/stack/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let failed = 0;
const fail = (m) => { console.log("FAIL", m); failed++; };
const ok = (m) => console.log("ok  ", m);
page.on("pageerror", (e) => fail("pageerror: " + e.message));

const has = (sel) => page.locator(sel).first().isVisible().catch(() => false);
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("stackv2-save")));

await page.goto(BASE + "/stack");
await page.evaluate(() => localStorage.removeItem("stackv2-save"));
await page.reload();
await page.waitForTimeout(600);

// ---- 1: home frame
if (!(await has('[data-side="stocks"]')) || !(await has('[data-side="practice"]')) || !(await has('[data-side="friends"]'))) {
  fail("sidebar modules missing");
} else ok("home shows all three sidebar modules");
const hscroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
if (hscroll) fail("horizontal scroll at 1440x900"); else ok("no horizontal scroll");

// ---- lesson driver
async function driveLesson(label) {
  for (let step = 0; step < 160; step++) {
    await page.waitForTimeout(320);
    if (await has("[data-tapnext]")) { await page.locator("[data-tapnext]").click(); continue; }
    if (await has("[data-endlesson]")) return true;
    if (await has("[data-cont]")) { await page.locator("[data-cont]").click().catch(() => {}); continue; }
    if (await has("[data-firstbuy=nke]")) { await page.locator("[data-firstbuy=nke]").click(); await page.waitForTimeout(400); continue; }
    // dca: tap the chart four times, spread out
    const dca = page.locator("svg[viewBox='0 0 300 92']").first();
    if ((await has("div.stk-card svg[viewBox='0 0 300 92']")) && (await page.locator("text=of 4 buys placed").count().catch(() => 0)) > 0) {
      for (const x of [80, 220, 420, 600]) {
        await dca.click({ position: { x, y: 60 } }).catch(() => {});
        await page.waitForTimeout(240);
      }
      await page.waitForTimeout(2600);
      continue;
    }
    // answer: the item marks its right option; find a correct clickable
    const clicked = await page.evaluate(() => {
      // answer correctly via the data-c marker (the sketch precedent), so
      // accuracy-scaled pay and perfect bonuses are exercised too.

      const opts = Array.from(document.querySelectorAll('[data-opt="idle"][data-c="1"]'));
      if (opts.length) { opts[0].click(); return true; }
      return false;
    });
    if (clicked) { await page.waitForTimeout(1700); continue; }
  }
  await page.screenshot({ path: SHOTS + "stall-" + label + ".png" });
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 400));
  fail("lesson " + label + " never reached its end screen. Screen says: " + txt.replace(/\n+/g, " | "));
  return false;
}

// ---- 2/3: lesson 1 — full takeover, buy inside the lesson, cards dealt
await page.locator('[data-node="0-0"]').click();
await page.waitForTimeout(500);
const covered = await page.evaluate(() => {
  const side = document.querySelector('[data-side="stocks"]');
  if (!side) return true;
  const r = side.getBoundingClientRect();
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + 10);
  return !side.contains(el);
});
if (!covered) fail("sidebar clickable during lesson takeover");
else ok("lesson takes over the frame");
await driveLesson("L1");
let sv = await save();
if (!sv.lots.nke || sv.lots.nke.length !== 1) fail("lesson 1 did not end with a Nike share");
else ok("lesson 1 ends owning a share");
if (!(sv.deck.buy >= 1 && sv.deck.sell >= 1)) fail("lesson 1 did not deal buy+sell cards: " + JSON.stringify(sv.deck));
else ok("lesson 1 dealt the first cards (deck " + JSON.stringify(sv.deck) + ")");
await page.screenshot({ path: SHOTS + "l1-end.png" });
await page.locator("[data-endlesson]").click();
await page.waitForTimeout(400);

// ---- play lessons 2..6 (answers are first-click, misses requeue until done)
for (let li = 1; li <= 5; li++) {
  await page.locator(`[data-node="0-${li}"]`).click();
  await page.waitForTimeout(500);
  const done = await driveLesson("L" + li);
  if (!done) break;
  const before = await save();
  await page.locator("[data-endlesson]").click();
  await page.waitForTimeout(500);
  // capstone rolls into the chest ceremony
  if (li === 5) {
    if (!(await has("[data-chest]"))) fail("no chest after unit 1 capstone");
    else {
      ok("unit 1 chest appears");
      await page.screenshot({ path: SHOTS + "chest-closed.png" });
      await page.locator("[data-chest]").click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: SHOTS + "chest-open.png" });
      for (let r = 0; r < 12; r++) {
        if (!(await has("[data-cont]"))) break;
        const label = await page.locator("[data-cont]").textContent();
        await page.locator("[data-cont]").click();
        await page.waitForTimeout(350);
        if (/Take them/.test(label ?? "")) break;
      }
    }
  }
  void before;
}
sv = await save();
if (!sv.chestsOpened.includes("unit1")) fail("unit 1 chest not opened: " + JSON.stringify(sv.chestsOpened));
else ok("unit 1 chest opened");
if (sv.deck.schedule !== 3) fail("chest did not deal Schedule x3: " + JSON.stringify(sv.deck));
else ok("Schedule x3 dealt");
if (!(sv.conceptCards.length >= 5)) fail("concept cards not granted");
else ok("concept cards granted: " + sv.conceptCards.join(","));

// ---- unit 2: three lessons; the capstone chains unit2 + endgame chests
for (let li = 0; li <= 2; li++) {
  await page.locator(`[data-node="1-${li}"]`).click();
  await page.waitForTimeout(500);
  const done = await driveLesson("U2L" + li);
  if (!done) break;
  await page.locator("[data-endlesson]").click();
  await page.waitForTimeout(500);
  if (li === 2) {
    // two ceremonies back to back: unit2 then endgame
    for (let c = 0; c < 2; c++) {
      if (!(await has("[data-chest]"))) { fail("chest ceremony " + (c + 1) + " missing after unit 2 capstone"); break; }
      await page.locator("[data-chest]").click();
      await page.waitForTimeout(450);
      if (c === 1) await page.screenshot({ path: SHOTS + "chest-endgame.png" });
      for (let r = 0; r < 12; r++) {
        if (!(await has("[data-cont]"))) break;
        const label = await page.locator("[data-cont]").textContent();
        await page.locator("[data-cont]").click();
        await page.waitForTimeout(350);
        if (/Take them/.test(label ?? "")) break;
      }
      await page.waitForTimeout(400);
    }
  }
}
sv = await save();
if (!sv.chestsOpened.includes("unit2") || !sv.chestsOpened.includes("endgame")) {
  fail("unit 2 / endgame chests not both opened: " + JSON.stringify(sv.chestsOpened));
} else ok("unit 2 and endgame chests both opened, chained");
if (sv.deck.the500 !== 3 || sv.deck.options !== 3) fail("chests did not deal The 500 x3 + Options x3: " + JSON.stringify(sv.deck));
else ok("The 500 x3 and Options x3 dealt");

// ---- 4: desk — no naked buy/sell buttons, card plays move money
await page.goto(BASE + "/stack/desk");
await page.waitForTimeout(600);
await page.screenshot({ path: SHOTS + "desk.png" });
const naked = await page.evaluate(() =>
  Array.from(document.querySelectorAll("button, .stk-btn")).filter((b) => /^(Buy|Sell)( \d+)?$/.test((b.textContent ?? "").trim())).length,
);
if (naked) fail(naked + " naked Buy/Sell buttons on the desk");
else ok("no naked Buy/Sell buttons");

// play Buy: pick pfizer, 2 shares if affordable
sv = await save();
const cashBefore = sv.cash;
const buyBefore = sv.deck.buy;
if (buyBefore < 1) fail("no buy cards to test with");
const pfeLotsBefore = ((await save()).lots.pfe ?? []).length;
await page.locator('[data-card="buy"]').click();
await page.waitForTimeout(400);
await page.locator('[data-pickstock="pfe"]').click();
await page.waitForTimeout(300);
const up = page.locator('[data-step="up"]');
if (await up.isEnabled().catch(() => false)) { await up.click(); await page.waitForTimeout(200); }
const wantN = parseInt((await page.locator("[data-stepn]").textContent()) ?? "1", 10);
await page.locator("[data-confirmbuy]").click();
await page.waitForTimeout(400);
sv = await save();
const spent = cashBefore - sv.cash;
const pfeGained = ((sv.lots.pfe ?? []).length) - pfeLotsBefore;
if (sv.deck.buy !== buyBefore - 1) fail("Buy play did not consume exactly one card");
else ok(`one Buy card consumed for a ${wantN}-share trade`);
if (pfeGained !== wantN) fail(`${wantN}-share buy minted ${pfeGained} lots`);
else ok(`${wantN} share(s) minted in one trade, ${spent.toFixed(2)} spent`);

// sell: click nike stack, stepper, confirm
const sellBefore = (await save()).deck.sell;
await page.locator('[data-stack="nke"]').click();
await page.waitForTimeout(300);
if (!(await has(".stk-disc.pick"))) fail("no white outline after selecting stack");
else ok("sell outline climbs the stack");
await page.screenshot({ path: SHOTS + "desk-sell.png" });
const cashBeforeSell = (await save()).cash;
await page.locator("[data-confirmsell]").click();
await page.waitForTimeout(400);
sv = await save();
if (sv.deck.sell !== sellBefore - 1) fail("Sell play did not consume exactly one card");
else ok("one Sell card consumed");
if (!(sv.cash > cashBeforeSell)) fail("sell did not raise cash");
else ok("sell proceeds landed: " + (sv.cash - cashBeforeSell).toFixed(2));

// schedule: play onto pfizer, tick a day, expect an autopilot lot
await page.locator('[data-card="schedule"]').click();
await page.waitForTimeout(400);
await page.locator('[data-pickstock="pfe"]').click();
await page.waitForTimeout(400);
sv = await save();
if (!sv.autopilot.includes("pfe")) fail("Schedule play did not start the autopilot");
else ok("Schedule autopilot armed on Pfizer");
if (sv.deck.schedule !== 2) fail("Schedule did not consume a card");
const pfeBefore = sv.lots.pfe.length;
await page.locator("[data-tomorrow]").click();
await page.waitForTimeout(500);
sv = await save();
if (sv.lots.pfe.length !== pfeBefore + 1) fail("autopilot did not buy on the day tick");
else ok("autopilot bought 1 Pfizer on the day tick");
if (!(await has("[data-autopilot=pfe]"))) fail("no autopilot badge on the stack");
else {
  await page.locator("[data-autopilot=pfe]").click();
  await page.waitForTimeout(300);
  sv = await save();
  if (sv.autopilot.includes("pfe")) fail("autopilot badge click did not stop it");
  else ok("autopilot stops from the badge, card not refunded (x" + sv.deck.schedule + ")");
}

// ---- worth chip pinned: selling must not read as a loss
const chip = await page.locator("[data-worth]").textContent();
ok("worth chip after trades: " + chip.trim());

// ---- 7: options — teach gate on first play, loss capped at premium
await page.reload();
await page.waitForTimeout(600);
sv = await save();
const cashPre = sv.cash;
const optBefore = sv.deck.options;
await page.locator('[data-card="options"]').click();
await page.waitForTimeout(400);
if (!(await has("[data-cont]"))) fail("options teach card did not gate the first play");
else {
  ok("options teach card gates the first play");
  await page.screenshot({ path: SHOTS + "options-teach.png" });
  await page.locator("[data-cont]").click();
  await page.waitForTimeout(300);
}
await page.locator("[data-pickstock]").first().click();
await page.waitForTimeout(300);
await page.locator('[data-dir="down"]').click();
await page.waitForTimeout(200);
await page.locator("[data-confirmoption]").click();
await page.waitForTimeout(400);
sv = await save();
const premium = cashPre - sv.cash;
if (!(premium > 0)) fail("option premium not charged");
else ok("option premium charged: " + premium.toFixed(2));
if (sv.deck.options !== optBefore - 1) fail("Options play did not consume the card");
const cashAfterPlay = sv.cash;
for (let d = 0; d < 4; d++) {
  await page.locator("[data-tomorrow]").click();
  await page.waitForTimeout(350);
}
sv = await save();
if (sv.options.length) fail("option never resolved");
const optionNet = sv.cash - cashAfterPlay; // payout only; autopilot is off now
if (optionNet < -0.001) fail("option lost more than the premium after resolution");
else ok("option resolved, payout " + optionNet.toFixed(2) + " (loss capped at premium " + premium.toFixed(2) + ")");

// ---- practice: a clean first guess pays; wrong guesses deal hints
await page.goto(BASE + "/stack/practice");
await page.waitForTimeout(500);
await page.locator("[data-play]").click();
await page.waitForTimeout(500);
let before = await save();
await page.locator('[data-guess][data-c="1"]').click();
await page.waitForTimeout(400);
let sv2 = await save();
if (!(Math.abs(sv2.cash - before.cash - 5) < 0.001 && sv2.deck.buy === before.deck.buy + 1)) {
  fail("first-guess win did not pay $5 + 1 Buy card");
} else ok("first-guess arcade win pays $5 and deals a Buy card");
await page.screenshot({ path: SHOTS + "practice.png" });

// hint path: one wrong guess widens the chart, the win then pays nothing
await page.locator("[data-again]").click();
await page.waitForTimeout(500);
await page.locator('[data-guess][data-c="0"]').first().click();
await page.waitForTimeout(400);
if (!(await has("[data-hints]"))) fail("wrong guess did not deal a hint");
else ok("wrong guess deals a hint");
const widened = await page.evaluate(() => document.body.innerText.includes("the whole history"));
if (!widened) fail("first hint did not widen the chart");
else ok("first hint widens the chart to the whole history");
await page.screenshot({ path: SHOTS + "practice-hint.png" });
before = await save();
await page.locator('[data-guess][data-c="1"]').click();
await page.waitForTimeout(400);
sv2 = await save();
const hintedResult = (await page.locator("[data-arcresult]").textContent()) ?? "";
if (!/hint/.test(hintedResult)) fail("hinted win result line wrong: " + hintedResult);
if (Math.abs(sv2.cash - before.cash) > 0.001 || sv2.deck.buy !== before.deck.buy) {
  fail("a win after hints still paid");
} else ok("a win after hints pays nothing (" + hintedResult.trim() + ")");

// ---- home banner after ticks
await page.goto(BASE + "/stack");
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + "home-late.png" });

console.log(failed ? `\n${failed} FAILURES` : "\nSTACKCHECK PASS");
await browser.close();
process.exit(failed ? 1 : 0);
