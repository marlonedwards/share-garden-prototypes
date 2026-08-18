// The savings pass, watched. It drives the real board at 1280x800 and checks
// the four things this round changed: the savings card costs one block and says
// so on its Buy tab, the bank's payment lands at the read beat and gets bigger
// when it is put back to work, the shop stays shut after a resolve and opens
// with its payday intact when it is asked to, and a run saved under the old two
// block savings economy still loads.
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
  // the game opens on its main menu, so a run starts from there
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
    break;
  }
}

async function openShop() {
  const b = page.locator('[data-shop-open="1"]');
  if (await b.count() && await b.first().isEnabled()) await b.first().click();
  await page.waitForTimeout(150);
}

// payday holds the counter for as long as the blocks are sliding in, which is
// the point of it, so a buy waits for the till to come back
async function waitForCounter() {
  for (let i = 0; i < 30; i++) {
    const c = page.locator('[data-shop-close="1"]');
    if (await c.count() && await c.first().isEnabled()) return;
    await page.waitForTimeout(100);
  }
}

async function closeShop() {
  const c = page.locator('[data-shop-close="1"]');
  for (let i = 0; i < 20; i++) {
    await dismissGates();
    if (await c.first().isEnabled()) { await c.first().click({ force: true }); break; }
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(340);
}

async function buy(assetId, n) {
  let bought = 0;
  for (let i = 0; i < n; i++) {
    const b = page.locator(`[data-buy="${assetId}"]`);
    if (!(await b.count()) || !(await b.first().isEnabled())) break;
    await b.first().click();
    bought++;
    await page.waitForTimeout(110);
    await dismissGates();
  }
  return bought;
}

const shopState = () => page.locator("[data-shop]").first().getAttribute("data-shop");
const railCount = () => page.locator("[data-rail-count]").first().getAttribute("data-rail-count");
const stakes = () => page.locator("[data-stakes]").first().getAttribute("data-stakes");

async function interestChip() {
  const el = page.locator("[data-interest]");
  return await el.count() ? el.first().getAttribute("data-interest") : null;
}

async function play() {
  const b = page.locator('[data-play="1"]');
  if (!(await b.count()) || !(await b.first().isEnabled())) return false;
  await b.first().click({ force: true });
  return true;
}

async function finishResolve() {
  for (let i = 0; i < 80; i++) {
    if (!(await page.locator('[data-skip="1"]').count())) return;
    await page.waitForTimeout(150);
  }
}

// ------------------------------------------------ chapter 2, played through

log("chapter 2: the deposit, the payment, and the payment put back");
await fresh(2);

// the shop opened itself once, on the chapter's own opening, and the savings
// card is on the counter at one block
const buyLabel = await page.locator('[data-buy="SAVINGS"]').first().textContent();
const faceRate = await page.locator('[data-market="SAVINGS"]').first().textContent();
log(`  buy tab says "${buyLabel.trim()}", card face says "${faceRate.replace(/\s+/g, " ").trim()}"`);

await waitForCounter();
const first = await buy("SAVINGS", 40);
log(`  bought ${first} savings cards at the one block tab`);
await closeShop();
await page.waitForTimeout(250);
await page.screenshot({ path: SHOTS + "tally-r4-savings-stack.png" });

const payments = [];
let shopStayedShut = true;
let paydayOnDemand = null;

for (let t = 0; t < 10; t++) {
  if (!(await play())) break;
  await finishResolve();
  await dismissGates();
  const state = await shopState();
  if (state !== "closed") shopStayedShut = false;
  const paid = await interestChip();
  if (paid) payments.push(paid);
  if (t === 0) {
    const box = await page.locator("[data-interest]").first().boundingBox();
    await page.screenshot({
      path: SHOTS + "tally-r4-interest.png",
      clip: { x: 164, y: Math.max(0, box.y - 152), width: 700, height: 220 },
    });
    await page.screenshot({ path: SHOTS + "tally-r4-readbeat.png" });
    log(`  after the resolve the shop is "${state}" and the table says "Savings paid ${paid}"`);
  }
  if (await page.locator("button:visible").filter({ hasText: /^Continue$/ }).count()) break;

  // the shop, when it is asked for, with its payday intact
  await openShop();
  if (paydayOnDemand === null) {
    const arrived = page.locator("text=/blocks? arrived/");
    paydayOnDemand = await arrived.count() > 0;
  }
  await waitForCounter();
  await dismissGates();
  await buy("SAVINGS", 3);
  await closeShop();
}

log(`  payments, turn by turn: ${payments.join(" ")}`);
log(`  the shop stayed shut after every resolve: ${shopStayedShut}`);
log(`  payday played on the first opening of a turn: ${paydayOnDemand}`);
log(`  rail ${await railCount()} blocks, stakes "${await stakes()}"`);

const summary = page.locator("text=/^Chapter 2 (cleared|finished)$/");
log(`  chapter ends: ${await summary.count() ? (await summary.first().textContent()).trim() : "still playing"}`);

// ------------------------------------------------------- the old save format

log("\na run saved under the old two block savings economy");
await fresh(2);
await buy("SAVINGS", 3);
await closeShop();
await play();
await finishResolve();
await page.waitForTimeout(400);

const before = await page.evaluate(() => {
  // Rewrite the save the way the old economy wrote it: savings cost two blocks
  // and its price crept up at 2% a year, so the card held fewer shares of a
  // dearer thing. Nothing else about the run changes.
  const r = JSON.parse(localStorage.getItem("tally-run-v1"));
  const per = Math.pow(1.02, 1 / 12);
  const old = r.prices.SAVINGS.map((_, i) => Math.round(10 * Math.pow(per, i) * 100) / 100);
  r.prices.SAVINGS = old;
  r.carryPrice.SAVINGS = old[old.length - 1];
  delete r.interest;
  const fix = (c) => {
    if (c.assetId !== "SAVINGS") return;
    c.buyDollars = 2 * r.denom;
    c.buyPrice = old[c.turn];
    c.shares = c.buyDollars / old[c.turn];
  };
  r.cards.forEach(fix);
  r.chapterOpenCards.forEach(fix);
  for (const e of r.log) {
    if (e.assetId !== "SAVINGS") continue;
    e.dollars = 2 * e.denom;
    e.blocks = 2;
    e.price = old[e.turn];
    e.shares = e.dollars / e.price;
  }
  r.cash -= r.cards.filter((c) => c.assetId === "SAVINGS").length * r.denom;
  localStorage.setItem("tally-run-v1", JSON.stringify(r));
  const worth = r.cards
    .filter((c) => c.assetId === "SAVINGS")
    .reduce((s, c) => s + c.shares * old[r.turn], 0);
  return { cards: r.cards.length, savingsWorth: Math.round(worth * 100) / 100, price: old[r.turn] };
});
log(`  saved an old run: ${before.cards} cards, savings priced at ${before.price}, worth $${before.savingsWorth}`);

await page.reload();
await page.waitForTimeout(900);
// the reload lands on the main menu, and Continue is what opens the saved run
const carryOn = page.locator('[data-menu="continue"]');
if (await carryOn.count()) { await carryOn.first().click(); await page.waitForTimeout(500); }
await dismissGates();
const after = await page.evaluate(() => {
  const r = JSON.parse(localStorage.getItem("tally-run-v1"));
  const worth = r.cards
    .filter((c) => c.assetId === "SAVINGS")
    .reduce((s, c) => s + c.shares * r.prices.SAVINGS[r.turn], 0);
  return {
    flat: new Set(r.prices.SAVINGS).size === 1,
    price: r.prices.SAVINGS[r.turn],
    savingsWorth: Math.round(worth * 100) / 100,
    interest: r.interest,
  };
});
log(`  after loading: price flat ${after.flat} at ${after.price}, savings worth $${after.savingsWorth}, interest field ${after.interest}`);
log(`  the dollars survived the load: ${Math.abs(after.savingsWorth - before.savingsWorth) < 0.02}`);
const newTab = await page.locator('[data-buy="SAVINGS"]').count()
  ? (await page.locator('[data-buy="SAVINGS"]').first().textContent()).trim()
  : "shop shut";
log(`  the board still plays: rail ${await railCount()}, next purchase "${newTab}"`);
const played = await play();
await finishResolve();
log(`  a turn played on the migrated run: ${played}, rail now ${await railCount()}`);

log(`\nerrors: ${errs.length ? errs.slice(0, 6).join(" | ") : "none"}`);
await browser.close();
