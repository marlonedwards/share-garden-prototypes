// The tally pass, watched. It drives the real board at 1280x800, plays turns,
// catches the resolve mid count, and checks the things the eye cannot: that a
// tap in the middle of a resolve lands on the model's own number, and that the
// till row is the same height with five cards of a name as it was with one.
import { chromium } from "playwright";

const B = "http://localhost:4318/#/tally";
const SHOTS = "tools/shots/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const log = (...a) => console.log(...a);

async function fresh(chapter) {
  await page.goto(B);
  await page.evaluate((c) => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: Array.from({ length: c }, (_, i) => i + 1),
      instruments: [], badges: [], eraBest: {},
    }));
  }, chapter);
  await page.reload();
  await page.waitForTimeout(700);
  // the game now opens on its main menu, so a run starts from there
  const newRun = page.locator('[data-menu="new"]');
  if (await newRun.count()) { await newRun.first().click(); await page.waitForTimeout(400); }
  const start = page.locator(`[aria-label="Start at chapter ${chapter}"]`);
  if (chapter > 1 && await start.count()) {
    await start.first().click();
    await page.waitForTimeout(400);
  }
  const begin = page.locator("button:visible").filter({ hasText: /^Begin$/ });
  if (await begin.count()) await begin.first().click();
  await page.waitForTimeout(500);
  await dismissGates();
}

async function dismissGates() {
  for (let i = 0; i < 14; i++) {
    const paper = page.locator('[data-paper-continue="1"]');
    if (await paper.count()) { await paper.first().click({ force: true }); await page.waitForTimeout(320); continue; }
    const d = page.locator('[data-debut-continue="1"]');
    if (await d.count()) { await d.first().click({ force: true }); await page.waitForTimeout(240); continue; }
    const b = page.locator("button:visible").filter({ hasText: /^(Got it|Understood|Play on|I see|Carry on)/ });
    if (await b.count()) { await b.first().click({ force: true }); await page.waitForTimeout(220); continue; }
    break;
  }
}

async function closeShop() {
  const c = page.locator('[data-shop-close="1"]');
  for (let i = 0; i < 20; i++) {
    if (!(await c.count())) break;
    await dismissGates();
    if (await c.first().isEnabled()) { await c.first().click({ force: true }); break; }
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(320);
}

async function buy(assetId, n) {
  const openShop = page.locator('[data-shop-open="1"]');
  if (await openShop.count() && await openShop.first().isEnabled()) await openShop.first().click();
  await page.waitForTimeout(420);
  await dismissGates();
  for (let i = 0; i < n; i++) {
    const b = page.locator(`[data-buy="${assetId}"]`);
    if (!(await b.count()) || !(await b.first().isEnabled())) break;
    await b.first().click();
    await page.waitForTimeout(120);
    await dismissGates();
  }
  await closeShop();
}

async function buySpread(n) {
  const openShop = page.locator('[data-shop-open="1"]');
  if (await openShop.count() && await openShop.first().isEnabled()) await openShop.first().click();
  await page.waitForTimeout(420);
  await dismissGates();
  const ids = await page.locator("[data-buy]").evaluateAll((els) => els.map((e) => e.getAttribute("data-buy")));
  for (let i = 0; i < n; i++) {
    const id = ids[i % ids.length];
    const b = page.locator(`[data-buy="${id}"]`);
    if (!(await b.count()) || !(await b.first().isEnabled())) continue;
    await b.first().click();
    await page.waitForTimeout(120);
    await dismissGates();
  }
  await closeShop();
}

const railCount = () => page.locator("[data-rail-count]").first().getAttribute("data-rail-count");
const stakes = () => page.locator("[data-stakes]").first().getAttribute("data-stakes");
const chipTexts = () => page.locator("[data-chip]").allTextContents();

async function play() {
  for (let i = 0; i < 24; i++) {
    await dismissGates();
    const b = page.locator('[data-play="1"]');
    if (await b.count() && await b.first().isEnabled()) {
      await b.first().click({ force: true });
      return true;
    }
    const c = page.locator('[data-shop-close="1"]');
    if (await c.count() && await c.first().isEnabled()) {
      await c.first().click({ force: true });
      await page.waitForTimeout(320);
      continue;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

async function finishResolve() {
  for (let i = 0; i < 60; i++) {
    if (!(await page.locator('[data-skip="1"]').count())) return;
    await page.waitForTimeout(200);
  }
}

// ------------------------------------------------------------ chapter 2

log("chapter 2: the savings stack scores its chip");
await fresh(2);
await buySpread(4);
const seen2 = [];
let midShot = false;
for (let t = 0; t < 5; t++) {
  if (!(await play())) break;
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(90);
    const c = await chipTexts();
    if (c.length) {
      seen2.push(...c);
      if (!midShot && c.length >= 1) {
        await page.screenshot({ path: SHOTS + "tally-r3-tally-mid.png" });
        midShot = true;
      }
    }
    if (!(await page.locator('[data-skip="1"]').count())) break;
  }
  await finishResolve();
  await dismissGates();
  log(`  turn ${t + 1}: chips ${JSON.stringify([...new Set(seen2)].slice(-6))}  rail ${await railCount()}  stakes "${await stakes()}"`);
  await closeShop();
}
log(`  chips seen in chapter 2: ${[...new Set(seen2)].join(" | ") || "none"}`);

// ------------------------------------------------------- the stakes line

log("\nthe stakes line, in all three states");
const states = new Set();
{
  await fresh(1);
  await buySpread(6);
  for (let t = 0; t < 7; t++) {
    const s = await stakes();
    if (s) states.add(s.includes("past") ? "past the target" : s.startsWith("last turn") ? "last turn" : "turns left");
    if (!(await play())) break;
    await finishResolve();
    await dismissGates();
    await closeShop();
    const s2 = await stakes();
    if (s2) { states.add(s2.includes("past") ? "past the target" : s2.startsWith("last turn") ? "last turn" : "turns left"); log(`  "${s2}"`); }
    if (!(await page.locator('[data-play="1"]').count())) break;
  }
  await page.screenshot({ path: SHOTS + "tally-r3-rail.png" });
}
log(`  states reached: ${[...states].join(", ")}`);

// -------------------------------------------------------- chapter 6 crash

log("\nchapter 6: the 2008 crash turn");
await fresh(6);
await buySpread(8);
let crashShot = false;
let midShot6 = false;
for (let t = 0; t < 9; t++) {
  const label = await page.locator('[data-play="1"]').first().textContent();
  const t0 = Date.now();
  if (!(await play())) break;
  let last = [];
  for (let i = 0; i < 46; i++) {
    await page.waitForTimeout(100);
    const c = await chipTexts();
    if (c.length > last.length) last = c;
    const losses = c.filter((x) => x.startsWith("\u2212")).length;
    const gains = c.filter((x) => x.startsWith("+")).length;
    if (!crashShot && losses >= 3) {
      await page.screenshot({ path: SHOTS + "tally-r3-crash.png" });
      crashShot = true;
      log("    (crash shot: " + losses + " names falling together)");
    }
    if (!midShot6 && gains >= 2 && c.length >= 3) {
      await page.screenshot({ path: SHOTS + "tally-r3-tally-mid.png" });
      midShot6 = true;
      log("    (mid shot: " + JSON.stringify(c) + ")");
    }
    if (!(await page.locator('[data-skip="1"]').count())) break;
  }
  const ms = Date.now() - t0;
  await finishResolve();
  await dismissGates();
  const losers = last.filter((x) => x.startsWith("\u2212")).length;
  log(`  ${label}: ${ms}ms, ${losers} falling, chips ${JSON.stringify(last)}, rail ${await railCount()}, "${await stakes()}"`);
  await closeShop();
}

// -------------------------------------------- the last turn, still short

log("\nthe rail on a final turn that is still short of the target");
await fresh(3);
for (let t = 0; t < 8; t++) {
  const s = await stakes();
  if (s) log(`  "${s}"`);
  if (s && s.startsWith("last turn")) {
    states.add("last turn");
    await page.screenshot({ path: SHOTS + "tally-r3-rail.png" });
    break;
  }
  if (!(await play())) break;
  await finishResolve();
  await dismissGates();
  await closeShop();
}
log(`  states reached across the run: ${[...states].join(", ")}`);

// ------------------------------------------------------------- tap skip

log("\ntap to skip lands the exact end state");
await fresh(6);
await buySpread(6);
await play();
await page.waitForTimeout(500);
await page.locator('[data-skip="1"]').click();
await page.waitForTimeout(260);
const railAfterSkip = await railCount();
const model = await page.evaluate(() => {
  const r = JSON.parse(localStorage.getItem("tally-run-v1"));
  if (!r) return null;
  let worth = r.cash;
  for (const c of r.cards) {
    if (c.stone) continue;
    const s = r.prices[c.assetId];
    worth += c.shares * (s ? s[Math.min(r.turn, s.length - 1)] : 0);
  }
  return { blocks: Math.max(0, Math.round(worth / r.denom)), turn: r.turn };
});
log(`  rail after skip ${railAfterSkip}, model says ${model.blocks} at turn ${model.turn}: ${Number(railAfterSkip) === model.blocks ? "EXACT" : "DIFFERENT"}`);
log(`  skip layer gone: ${!(await page.locator('[data-skip="1"]').count())}`);

// ------------------------------------------------------- the till height

log("\nthe till row height, one card against five");
await fresh(6);
await buySpread(1);
const openShop = page.locator('[data-shop-open="1"]');
if (await openShop.count() && await openShop.first().isEnabled()) await openShop.first().click();
await page.waitForTimeout(420);
await dismissGates();
const h1 = await page.locator('[data-till-row="1"]').first().evaluate((e) => e.getBoundingClientRect().height);
const ids = await page.locator("[data-buy]").evaluateAll((els) => els.map((e) => e.getAttribute("data-buy")));
for (let i = 0; i < 5; i++) {
  const b = page.locator(`[data-buy="${ids[0]}"]`);
  if (!(await b.count()) || !(await b.first().isEnabled())) break;
  await b.first().click();
  await page.waitForTimeout(130);
  await dismissGates();
}
const h5 = await page.locator('[data-till-row="1"]').first().evaluate((e) => e.getBoundingClientRect().height);
const collar = await page.locator("[data-till-stack]").first().textContent();
log(`  till row ${h1}px with one card, ${h5}px after five more (${collar.slice(0, 24)}): ${h1 === h5 ? "IDENTICAL" : "CHANGED"}`);

log(`\nerrors: ${errs.length ? errs.slice(0, 6).join(" | ") : "none"}`);
await browser.close();
