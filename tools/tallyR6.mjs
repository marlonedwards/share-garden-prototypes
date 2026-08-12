// The Tally, round six: the two act resolve, the simplified sells, the shop's
// own Play key, the chapter surfaces with no disclaimer on them, the foot bar's
// two keys at one height, and the collector's box swatches.
//
// Usage: node tools/tallyR6.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) fails.push(label);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror"); });

async function debuts(p) {
  for (let i = 0; i < 8; i++) {
    if (await p.locator('[data-debut-continue="1"]').count()) {
      await p.locator('[data-debut-continue="1"]').click();
      await wait(220);
    } else break;
  }
}

// The resolve is over when the board hands the table back, which is a beat or
// two after the last block lands: a front page may fall in between, and the
// keys stay dead until it is dismissed.
async function backToTable(p) {
  for (let i = 0; i < 120; i++) {
    if (await p.locator('[data-paper-continue="1"]').count()) {
      await p.locator('[data-paper-continue="1"]').click();
      await wait(320);
      continue;
    }
    if (await p.locator('[data-play="1"]').isEnabled().catch(() => false)) return true;
    await wait(120);
  }
  return false;
}

async function startChapter(p, id) {
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("tally-box-v1", JSON.stringify({
        clearedChapters: [1, 2, 3, 4, 5, 6, 7],
        instruments: ["SAVINGS", "BOND", "INDEX", "LEMON", "HARBOR", "HALCYON", "C", "AIG", "WMT", "AAPL"],
        badges: ["wide-open", "iron-hand"], eraBest: { gfc: 12345 },
      }));
      localStorage.setItem("tally-tour-v1", "1");
    } catch (e) {}
  });
  await p.goto(BASE);
  await wait(600);
  await p.locator('[data-menu="chapters"]').click();
  await wait(300);
  await p.locator(`[data-chapter-start="${id}"]`).click();
  await wait(400);
  await p.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(900);
  await debuts(p);
}

const cashOf = (p) => p.evaluate(() => {
  const t = document.querySelector("[data-shop] [data-money]")?.parentElement?.innerText ?? "";
  const m = /\$([\d,]+)/.exec(t);
  return m ? Number(m[1].replace(/,/g, "")) : null;
});

const sample = () => page.evaluate(() => {
  const cols = [...document.querySelectorAll("[data-col]")];
  const last = cols.length ? Number(cols[cols.length - 1].getAttribute("data-col-blocks")) : -1;
  // how many columns are actually on screen, so the backdrop sweep can be
  // watched rather than guessed at
  let lit = 0;
  for (const c of cols) if (Number(getComputedStyle(c).opacity) > 0.02) lit++;
  const chips = [...document.querySelectorAll("[data-chip]")].map((c) => ({
    label: c.getAttribute("data-chip"),
    note: c.getAttribute("data-chip-note"),
  }));
  return {
    t: performance.now(),
    chips: chips.length,
    notes: chips.filter((c) => c.note).length,
    labels: chips.map((c) => c.label).join(","),
    last,
    lit,
    rail: Number(document.querySelector("[data-rail-count]")?.getAttribute("data-rail-count") ?? -1),
    stakes: document.querySelector("[data-stakes]")?.getAttribute("data-stakes") ?? "",
    act: document.querySelector("[data-wall-act]")?.getAttribute("data-wall-act") ?? "none",
    noteText: chips.map((c) => c.note ?? "").join(","),
    resolving: !!document.querySelector("[data-skip]"),
  };
});

// ------------------------------------------------- 1. the two act resolve

await startChapter(page, 6);
// a spread of company cards, so several stacks score and the acts are worth
// telling apart. Savings is left alone, because it is the stack the sell tabs
// are tested on later and it has to start empty.
const spread = await page.evaluate(() => [...document.querySelectorAll("[data-market]")]
  .map((c) => c.getAttribute("data-market"))
  .filter((id) => id !== "SAVINGS")
  .slice(0, 3));
for (const id of spread) {
  const b = page.locator(`[data-buy="${id}"]`);
  if ((await b.count()) && (await b.isEnabled())) { await b.click(); await wait(260); await debuts(page); }
}
await page.locator('[data-shop-close="1"]').click();
await wait(450);

const before = await sample();
await page.locator('[data-play="1"]').click();

const frames = [];
let act1Shot = false;
let act2Shot = false;
const t0 = Date.now();
for (let i = 0; i < 260; i++) {
  const s = await sample();
  frames.push(s);
  if (!act1Shot && s.act === "cards" && s.chips >= 2 && Date.now() - t0 > 700) {
    await page.screenshot({ path: OUT + "tally-r6-act1.png" });
    act1Shot = true;
  }
  if (!act2Shot && s.act === "wall" && s.last > 0) {
    await page.screenshot({ path: OUT + "tally-r6-act2.png" });
    act2Shot = true;
  }
  if (!s.resolving && i > 4) break;
  await wait(25);
}
const took = Date.now() - t0;

// the closing column only exists on act two, where it starts empty and grows;
// act one is drawing the wall as it stood, so its last column is the old one
const firstWall = frames.findIndex((f) => f.act === "wall" && f.last > 0);
const mostChips = frames.reduce((m, f) => Math.max(m, f.chips), 0);
// the last frame at which a new chip arrived
let lastChip = -1;
for (let i = 1; i < frames.length; i++) if (frames[i].chips > frames[i - 1].chips) lastChip = i;
const act1 = frames.filter((f) => f.act === "cards");
const firstAct2 = frames.findIndex((f) => f.act === "wall");

check(mostChips >= 2, "several cards score on a chapter 6 year", `chips=${mostChips}`);
check(act1Shot && act2Shot, "both acts were photographed");
check(firstWall > 0 && lastChip >= 0 && firstWall > lastChip,
  "the wall lands nothing until the last chip is on the table",
  `last chip at frame ${lastChip}, first block at frame ${firstWall}`);
check(act1.every((f) => f.last === before.last), "no band lands during act one",
  `${before.last} -> ${[...new Set(act1.map((f) => f.last))].join(",")}`);
check(act1.every((f) => f.rail === before.rail), "the count does not tick during act one",
  `rail ${before.rail} -> ${act1[act1.length - 1]?.rail}`);
check(act1.length > 3 && firstAct2 > 0 && firstAct2 > lastChip,
  "act one runs on the cards alone and act two starts after them",
  `act one frames ${act1.length}, act two at frame ${firstAct2}`);
check(act1.every((f) => f.lit === act1[0].lit),
  "the wall the player pressed Play on stands still through act one",
  `lit ${act1[0]?.lit} -> ${Math.max(...act1.map((f) => f.lit))}`);
check(frames.some((f) => f.lit > act1[0].lit), "and the months sweep in on act two",
  `lit up to ${Math.max(...frames.map((f) => f.lit))}`);
const notes = frames.flatMap((f) => f.noteText.split(",")).filter(Boolean);
check(notes.length > 0, "a chip carries its own move underneath the figure", notes[0] ?? "");
check(notes.every((n) => /^[+−]\d+(\.\d)?%$/.test(n)), "and every one of them is a percent",
  [...new Set(notes)].slice(0, 4).join(" "));
const stakesHeld = firstWall > 0 && frames[firstWall].stakes === before.stakes
  && frames[frames.length - 1].stakes !== before.stakes;
check(stakesHeld, "the stakes line holds until the column is finished and then settles",
  `${before.stakes} | ${frames[firstWall]?.stakes} | ${frames[frames.length - 1].stakes}`);
check(took < 5400, "the whole resolve stays inside its budget", `${took}ms`);
// the two acts, as shipped
const act1Ms = firstAct2 > 0 ? Math.round(frames[firstAct2].t - frames[0].t) : 0;
console.log(`      act one about ${act1Ms}ms, the whole resolve about ${took}ms`);

// the card face carries no percent of its own any more
const faceFlash = await page.evaluate(() => document.querySelectorAll(".tally-flash").length);
check(faceFlash === 0, "no percent flashes on a card face");

await wait(500);
await backToTable(page);

// ------------------------------------------------- 2. the tap that skips

await page.locator('[data-play="1"]').click();
await wait(500);
const midAct1 = await sample();
check(midAct1.act === "cards", "the tap under test lands in the middle of act one", midAct1.act);
await page.locator("[data-skip]").click({ force: true });
await wait(320);
const skipped = await page.evaluate(() => {
  const cols = [...document.querySelectorAll("[data-col]")];
  return {
    resolving: !!document.querySelector("[data-skip]"),
    chips: document.querySelectorAll("[data-chip]").length,
    rail: Number(document.querySelector("[data-rail-count]")?.getAttribute("data-rail-count") ?? -1),
    last: cols.length ? Number(cols[cols.length - 1].getAttribute("data-col-blocks")) : -1,
    act: document.querySelector("[data-wall-act]")?.getAttribute("data-wall-act") ?? "none",
  };
});
check(!skipped.resolving && skipped.chips === 0 && skipped.act === "none",
  "one tap ends both acts at once", JSON.stringify(skipped));
check(skipped.rail === skipped.last, "and the end state is the model's own number, not where the counting was",
  `rail ${skipped.rail}, column ${skipped.last}`);
await backToTable(page);
await wait(300);

// ------------------------------------------------- 3. the foot bar's keys

const footKeys = await page.evaluate(() => {
  const a = document.querySelector('[data-shop-open="1"]').getBoundingClientRect();
  const b = document.querySelector('[data-play="1"]').getBoundingClientRect();
  return { shop: { h: Math.round(a.height), top: Math.round(a.top) }, play: { h: Math.round(b.height), top: Math.round(b.top) } };
});
check(footKeys.shop.h === footKeys.play.h && Math.abs(footKeys.shop.top - footKeys.play.top) <= 1,
  "the shop key and the play key are one height on one row", JSON.stringify(footKeys));

// ------------------------------------------------- 4. the sells

await page.locator('[data-shop-open="1"]').click();
await wait(600);
await debuts(page);

// a stack of five or more of one name the player does not hold yet, bought in
// one press, which is therefore exactly one lot
const pick = await page.evaluate(() => {
  for (const cell of document.querySelectorAll("[data-market]")) {
    const id = cell.getAttribute("data-market");
    if (document.querySelector(`[data-till-stack="${id}"]`)) continue;
    const max = cell.querySelector("[data-buy-max]");
    if (!max) continue;
    const n = Number(max.getAttribute("data-buy-max-n"));
    if (n < 5) continue;
    return { id, n };
  }
  return null;
});
check(!!pick, "there is an unheld card the money covers five or more of", JSON.stringify(pick));
await page.locator(`[data-buy-max="${pick.id}"]`).click();
await wait(900);

const tabs = await page.evaluate((id) => {
  const box = document.querySelector(`[data-till-stack="${id}"]`);
  return {
    one: box.querySelector("[data-till]")?.textContent?.trim() ?? null,
    five: box.querySelector("[data-till-five]")?.textContent?.trim() ?? null,
    all: box.querySelector("[data-till-all]")?.textContent?.trim() ?? null,
    lots: box.querySelector("[data-lots]")?.textContent?.trim() ?? null,
    cards: Number(/(\d+) cards?/.exec(box.innerText.replace(/\s+/g, " "))?.[1] ?? 0),
  };
}, pick.id);
console.log(`      ${pick.id}: "${tabs.one}" | "${tabs.five}" | "${tabs.all}"`);
check(/^Sell 1 · \$[\d,]+$/.test(tabs.one ?? ""), "every stack carries Sell 1", tabs.one);
check(/^Sell 5 · \$[\d,]+$/.test(tabs.five ?? ""), "a stack of five or more carries Sell 5", tabs.five);
check(/^Sell all · \$[\d,]+$/.test(tabs.all ?? ""), "and it carries Sell all", tabs.all);
check(tabs.lots === null, "a stack bought in one press offers no lots, because it is one lot",
  String(tabs.lots));
const dollars = (s) => Number(/\$([\d,]+)/.exec(s)[1].replace(/,/g, ""));
check(tabs.cards === pick.n, "the press minted the whole stack", `${tabs.cards} of ${pick.n}`);
check(Math.abs(dollars(tabs.five) - 5 * dollars(tabs.one)) <= 2,
  "Sell 5 names five of that same card", `${tabs.one} x5 against ${tabs.five}`);
check(Math.abs(dollars(tabs.all) - tabs.cards * dollars(tabs.one)) <= 2,
  "Sell all names the whole stack", `${tabs.cards} x ${tabs.one} against ${tabs.all}`);
await page.screenshot({ path: OUT + "tally-r6-sells.png" });

// a stack tapped turns its card over now, rather than fanning
await page.locator(`[data-till-stack="${pick.id}"] [role="button"]`).first().click();
await wait(400);
check((await page.locator('[data-flip="open"]').count()) === 1, "tapping a till stack turns the card over");
await page.locator('[data-flip="open"]').click({ position: { x: 5, y: 5 } });
await wait(320);

// Sell 5, at exactly the dollars it named
let cashPre = await cashOf(page);
await page.locator(`[data-till-five="${pick.id}"]`).click();
await wait(900);
let cashPost = await cashOf(page);
check(Math.abs(cashPost - cashPre - dollars(tabs.five)) <= 1,
  "Sell 5 hands back exactly what it named", `${cashPre} + ${dollars(tabs.five)} -> ${cashPost}`);
const leftAfter5 = await page.evaluate((id) => {
  const box = document.querySelector(`[data-till-stack="${id}"]`);
  return box ? Number(/(\d+) cards?/.exec(box.innerText.replace(/\s+/g, " "))?.[1] ?? 0) : 0;
}, pick.id);
check(leftAfter5 === tabs.cards - 5, "and it took exactly five cards",
  `${tabs.cards} -> ${leftAfter5}`);

// Sell all empties the stack out of the till
const allTab = page.locator(`[data-till-all="${pick.id}"]`);
if (await allTab.count()) {
  const total = dollars(await allTab.textContent());
  cashPre = await cashOf(page);
  await allTab.click();
  await wait(900);
  cashPost = await cashOf(page);
  check((await page.locator(`[data-till-stack="${pick.id}"]`).count()) === 0,
    "Sell all empties the stack out of the till");
  check(Math.abs(cashPost - cashPre - total) <= 1, "and hands back exactly what it named",
    `${cashPre} + ${total} -> ${cashPost}`);
} else {
  check(false, "the stack still offers Sell all");
}

// ------------------------------------------------- 5. the lots

// a second purchase of a name already held, on a later turn, is a second lot
const lotsId = spread[0];
await page.locator('[data-shop-play="1"]').click();
await wait(600);
const playedFromShop = await page.evaluate(() =>
  document.querySelector("[data-shop]")?.getAttribute("data-shop") === "closed"
  && !!document.querySelector("[data-skip]"));
check(playedFromShop, "the shop's own key closes the counter and plays the turn");
check(await backToTable(page), "the board comes back to the table after the resolve");
await wait(300);
await page.locator('[data-shop-open="1"]').click();
await wait(600);
await debuts(page);
check((await page.locator(`[data-lots="${lotsId}"]`).count()) === 0,
  "a stack of one purchase still offers no lots");
if (await page.locator(`[data-buy="${lotsId}"]`).isEnabled()) {
  await page.locator(`[data-buy="${lotsId}"]`).click();
  await wait(800);
}

const lotsTab = page.locator(`[data-lots="${lotsId}"]`);
check((await lotsTab.count()) === 1, "a stack made of two purchases offers its lots",
  (await page.locator(`[data-till-stack="${lotsId}"]`).innerText()).replace(/\s+/g, " "));
await lotsTab.click();
await wait(400);
const lots = await page.evaluate((id) => {
  const box = document.querySelector(`[data-till-fan="${id}"]`);
  if (!box) return null;
  return {
    header: box.querySelector("[data-fan-close]")?.textContent?.trim(),
    all: box.querySelector("[data-fan-all]")?.textContent?.trim(),
    lots: [...box.querySelectorAll("[data-fan-lot]")].map((l) => ({
      uid: Number(l.getAttribute("data-fan-card")),
      n: Number(l.getAttribute("data-lot-n")),
      caption: l.innerText.replace(/\s+/g, " ").trim(),
      tab: l.querySelector("[data-fan-sell]")?.textContent?.trim(),
    })),
  };
}, lotsId);
check(!!lots && lots.lots.length === 2, "the stack opens as two lots", String(lots?.lots?.length));
check(/ · \d+ lots$/.test(lots.header ?? ""), "the header counts the lots", lots.header);
check(lots.lots.every((l) => /^Sell 1 · \$[\d,]+$/.test(l.tab ?? "")), "every lot carries its own sell tab",
  lots.lots[0]?.tab);
check(lots.lots.every((l) => /×\d+ · (turn|ch) /.test(l.caption) && /(at|put in) \$/.test(l.caption)),
  "every lot says how many it holds, when it was bought and what it paid", lots.lots[0]?.caption);
check(new Set(lots.lots.map((l) => l.tab)).size === 2,
  "the two lots are worth different money, because they were bought at different prices",
  lots.lots.map((l) => l.tab).join(" | "));
await page.screenshot({ path: OUT + "tally-r6-lots.png" });

// the per lot sell takes the card it named and pays what it named
const lot = lots.lots[0];
cashPre = await cashOf(page);
await page.locator(`[data-fan-sell="${lot.uid}"]`).click();
await wait(900);
cashPost = await cashOf(page);
const stillThere = await page.evaluate((uid) => !!document.querySelector(`[data-fan-sell="${uid}"]`), lot.uid);
check(Math.abs(cashPost - cashPre - dollars(lot.tab)) <= 1,
  "a lot's sell hands back exactly the dollars it named, which is that card's own shares at today's price",
  `${cashPre} + ${dollars(lot.tab)} -> ${cashPost}`);
check(!stillThere, "and the card it sold is the card that left", `uid ${lot.uid}`);

// tapping away closes the lots
if (await page.locator(`[data-till-fan="${lotsId}"]`).count()) {
  await page.locator('[data-till-row="1"]').click({ position: { x: 3, y: 3 } });
  await wait(300);
  check((await page.locator(`[data-till-fan="${lotsId}"]`).count()) === 0,
    "a press outside the lots closes them");
}

// ------------------------------------------------- 6. no disclaimer

const shopText = await page.evaluate(() => document.body.innerText);
check(!/illustrative/i.test(shopText), "the shop says nothing about illustrative numbers");
await page.locator('[data-shop-close="1"]').click();
await wait(400);
await page.locator('[data-strip-chapters="1"]').click();
await wait(500);
const tiles = await page.evaluate(() => document.body.innerText);
check(!/illustrative/i.test(tiles), "no chapter tile carries the disclaimer");
check(/real prices/.test(tiles), "an era tile still carries its years", (tiles.match(/[^\n]*real prices[^\n]*/) ?? [""])[0]);

// the chapter card of an authored chapter
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror card"); });
await p2.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("tally-tour-v1", "1"); } catch (e) {} });
await p2.goto(BASE);
await wait(600);
await p2.locator('[data-menu="new"]').click();
await wait(700);
const cardText = await p2.evaluate(() => document.querySelector('[data-overlay="1"]')?.innerText ?? "");
check(cardText.length > 0 && !/illustrative/i.test(cardText),
  "an authored chapter card carries no disclaimer", cardText.split("\n").slice(0, 2).join(" | "));
await ctx2.close();

// ------------------------------------------------- 7. the collector's box

await page.locator('[data-chapters-back="1"]').click();
await wait(500);
await page.locator('[data-collection="1"]').click();
await wait(600);
const box = await page.evaluate(() => {
  const slots = [...document.querySelectorAll("button")].filter((b) => b.querySelector('span[aria-hidden], svg[aria-hidden]'));
  const swatches = [];
  const heights = new Set();
  for (const b of slots) {
    const r = b.getBoundingClientRect();
    if (r.width < 20) continue;
    heights.add(Math.round(r.height));
    const s = b.querySelector('span[aria-hidden], svg[aria-hidden]');
    if (!s) continue;
    const sr = s.getBoundingClientRect();
    swatches.push({ w: Math.round(sr.width * 10) / 10, h: Math.round(sr.height * 10) / 10 });
  }
  return { swatches, heights: [...heights] };
});
check(box.swatches.length > 5, "the box draws its swatches", `${box.swatches.length}`);
check(box.swatches.every((s) => Math.abs(s.w - s.h) < 0.6), "every swatch is a circle and none is squashed",
  JSON.stringify(box.swatches.filter((s) => Math.abs(s.w - s.h) >= 0.6).slice(0, 3)));
check(box.heights.length === 1, "every tile is the same height", JSON.stringify(box.heights));
await page.screenshot({ path: OUT + "tally-r6-box.png" });

// ------------------------------------------------- 8. reduced motion

await ctx.close();
const rctx = await browser.newContext({
  viewport: { width: 1280, height: 800 }, reducedMotion: "reduce",
});
const rp = await rctx.newPage();
rp.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror reduced"); });
await startChapter(rp, 6);
const rbuys = rp.locator("[data-buy]");
for (let i = 0; i < 3; i++) {
  const b = rbuys.nth(i);
  if ((await b.count()) && (await b.isEnabled())) { await b.click(); await wait(200); await debuts(rp); }
}
await rp.locator('[data-shop-play="1"]').click();
await wait(240);
const rState = await rp.evaluate(() => {
  const chips = [...document.querySelectorAll("[data-chip]")];
  return {
    chips: chips.length,
    animating: chips.some((c) => {
      const n = getComputedStyle(c).animationName;
      return n && n !== "none";
    }),
    cols: [...document.querySelectorAll("[data-col]")].length,
  };
});
check(rState.chips > 1, "reduced motion shows every chip at once", `chips=${rState.chips}`);
check(!rState.animating, "reduced motion leaves the chips at rest");
await wait(1400);
check((await rp.locator('[data-play="1"]').count()) === 1 || (await rp.locator('[data-paper-continue="1"]').count()) === 1,
  "reduced motion lands the end state and gives the board back");
await rctx.close();

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
