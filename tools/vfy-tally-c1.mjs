// The Tally, shop controls pass: the two buy tabs, the sell tabs, the lots a
// stack opens into, the flying blocks, and the card name that may not break mid
// word.
//
// As of round six the till no longer fans on a tap. Every stack carries its own
// sell tabs, and only a stack made of more than one purchase offers the quiet
// line that opens it lot by lot, so that is what this checks: the tabs first,
// and the lots where there is more than one.
//
// Usage: node tools/vfy-tally-c1.mjs

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

async function openShop(page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("tally-box-v1", JSON.stringify({
        clearedChapters: [1, 2, 3, 4, 5, 6],
        instruments: [], badges: [], eraBest: {},
      }));
    } catch (e) {}
  });
  await page.goto(BASE);
  await wait(600);
  await page.locator('[data-menu="chapters"]').click();
  await wait(300);
  await page.locator('[data-chapter-start="6"]').click();
  await wait(400);
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(900);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').click();
      await wait(240);
    } else break;
  }
}

const cashOf = (page) => page.evaluate(() => {
  const t = document.querySelector("[data-shop] [data-money]")?.parentElement?.innerText ?? "";
  const m = /\$([\d,]+)/.exec(t);
  return m ? Number(m[1].replace(/,/g, "")) : null;
});

// ------------------------------------------------------------ the main run

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror"); });
await openShop(page);

// -------------------------------------------------- 1. the two buy tabs

const tabs = await page.evaluate(() => {
  const out = [];
  for (const cell of document.querySelectorAll("[data-market]")) {
    const buy = cell.querySelector("[data-buy]");
    const max = cell.querySelector("[data-buy-max]");
    out.push({
      id: cell.getAttribute("data-market"),
      buy: buy?.textContent?.trim() ?? null,
      max: max?.textContent?.trim() ?? null,
      n: max ? Number(max.getAttribute("data-buy-max-n")) : 0,
      maxFace: max ? getComputedStyle(max).backgroundImage.includes("rgb(0, 113, 227)") : null,
    });
  }
  return out;
});
console.log(tabs.slice(0, 4).map((t) => `${t.id}: "${t.buy}" | "${t.max}"`).join("\n"));
check(tabs.every((t) => /^Buy 1 · \$[\d,]+$/.test(t.buy ?? "")), "every card carries the Buy 1 tab");
check(tabs.every((t) => t.max === null || /^Max ×\d+ · \$[\d,]+$/.test(t.max)),
  "the max tab reads Max ×n · $total");
check(tabs.every((t) => t.max === null || t.n > 1), "no max tab is ever offered for one card");
check(tabs.some((t) => t.max !== null), "the max tab is present when the money covers more than one");
check(tabs.every((t) => t.maxFace !== true), "the max tab is the quiet face and never the primary one");
// the count is arithmetic on the cash in hand
const cash0 = await cashOf(page);
const arith = await page.evaluate(() => {
  const out = [];
  for (const cell of document.querySelectorAll("[data-market]")) {
    const max = cell.querySelector("[data-buy-max]");
    if (!max) continue;
    const buy = cell.querySelector("[data-buy]").textContent;
    out.push({
      cost: Number(/\$([\d,]+)/.exec(buy)[1].replace(/,/g, "")),
      n: Number(max.getAttribute("data-buy-max-n")),
      total: Number(/· \$([\d,]+)/.exec(max.textContent)[1].replace(/,/g, "")),
    });
  }
  return out;
});
check(arith.every((a) => a.n === Math.floor(cash0 / a.cost) && a.total === a.n * a.cost),
  "the max count and total are floor(cash / cost) and n × cost", `cash=${cash0} ${JSON.stringify(arith[0])}`);

await page.screenshot({ path: OUT + "tally-c1-buytabs.png" });

// -------------------------------------------------- 2. no name breaks mid word

// Every rendered line of every card name must begin at a word boundary, so a
// name is never cut as "Governmen / t Bond".
async function nameBreaks(page) {
  return page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("[data-shop] [data-card-name]")) {
      const text = el.textContent ?? "";
      const node = el.firstChild;
      if (!node || node.nodeType !== 3) continue;
      const r = document.createRange();
      let top = null;
      for (let i = 0; i < text.length; i++) {
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const rect = r.getClientRects()[0];
        if (!rect) continue;
        if (top === null) { top = rect.top; continue; }
        if (rect.top > top + 2) {
          // a new line started at character i: the character before it has to
          // be a space, or the word was cut in half
          if (!/\s/.test(text[i - 1]) && !/\s/.test(text[i])) bad.push(`${text}: "${text.slice(0, i)}|${text.slice(i)}"`);
          top = rect.top;
        }
      }
    }
    return bad;
  });
}
const styles = await page.evaluate(() => {
  const el = document.querySelector("[data-shop] [data-card-name]");
  const cs = getComputedStyle(el);
  return { wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap };
});
check(styles.wordBreak === "normal" && styles.overflowWrap === "normal",
  "card names wrap at word boundaries only", JSON.stringify(styles));
const breaks = await nameBreaks(page);
check(breaks.length === 0, "no card name in a full shop breaks mid word", breaks.slice(0, 3).join(" | "));

// -------------------------------------------------- 3. buy max mints exactly n

const pick = arith.length ? await page.evaluate(() => {
  // a company card, so the purchase is two blocks a card and the count is
  // worth looking at
  for (const cell of document.querySelectorAll("[data-market]")) {
    const max = cell.querySelector("[data-buy-max]");
    if (!max) continue;
    const cost = Number(/\$([\d,]+)/.exec(cell.querySelector("[data-buy]").textContent)[1].replace(/,/g, ""));
    if (cost < 100) continue;
    return { id: cell.getAttribute("data-market"), n: Number(max.getAttribute("data-buy-max-n")), cost };
  }
  return null;
}) : null;
check(!!pick && pick.n >= 3, "there is enough money for three or more of one card", JSON.stringify(pick));

// mid flight, with the flights capped
const maxTab = page.locator(`[data-buy-max="${pick.id}"]`);
await maxTab.click();
await wait(90);
const flying = await page.evaluate(() => document.querySelectorAll(".tally-fly").length);
check(flying > 0 && flying <= 10, "the payment flies, and never more than ten blocks do", `flying=${flying}`);
// far enough into the flight that the whole stream is in the air at once
await wait(210);
await page.screenshot({ path: OUT + "tally-c1-flight.png" });
await wait(700);

const after = await page.evaluate((id) => {
  const stack = document.querySelector(`[data-till-stack="${id}"]`);
  return {
    collar: stack?.innerText?.replace(/\s+/g, " ").trim() ?? null,
    tab: stack?.querySelector("[data-till]")?.textContent?.trim() ?? null,
  };
}, pick.id);
const cash1 = await cashOf(page);
check(new RegExp(`${pick.n} cards`).test(after.collar ?? ""),
  `buying max mints exactly ${pick.n} cards`, after.collar);
check(/^Sell 1 · \$[\d,]+$/.test(after.tab ?? ""),
  "the stack's first tab sells one card at that card's own dollars", after.tab);
check(Math.abs(cash1 - (cash0 - pick.n * pick.cost)) <= 1,
  "the cash falls by exactly the total the tab named", `${cash0} -> ${cash1}, cost ${pick.n * pick.cost}`);
const gone = await page.evaluate(() => document.querySelectorAll(".tally-fly").length);
check(gone === 0, "the flights clear themselves up", `left=${gone}`);

// -------------------------------------------------- 4. the sell tabs

// A stack bought in one press is one lot, so it offers no lots at all: what it
// offers is the three tabs, and each of them says exactly what it hands back.
const stackId = pick.id;
const tabsOf = (page, id) => page.evaluate((sid) => {
  const box = document.querySelector(`[data-till-stack="${sid}"]`);
  if (!box) return null;
  return {
    one: box.querySelector("[data-till]")?.textContent?.trim() ?? null,
    five: box.querySelector("[data-till-five]")?.textContent?.trim() ?? null,
    all: box.querySelector("[data-till-all]")?.textContent?.trim() ?? null,
    lots: box.querySelector("[data-lots]")?.textContent?.trim() ?? null,
    cards: Number(/(\d+) cards?/.exec(box.innerText.replace(/\s+/g, " "))?.[1] ?? 0),
  };
}, id);
const dollars = (s) => Number(/\$([\d,]+)/.exec(s)[1].replace(/,/g, ""));

const sell = await tabsOf(page, stackId);
console.log(`${stackId}: "${sell.one}" | "${sell.five}" | "${sell.all}"`);
check(/^Sell 1 · \$[\d,]+$/.test(sell.one ?? ""), "the stack carries Sell 1", sell.one);
check(/^Sell all · \$[\d,]+$/.test(sell.all ?? ""), "and Sell all", sell.all);
check(sell.cards >= 5 ? /^Sell 5 · \$[\d,]+$/.test(sell.five ?? "") : sell.five === null,
  "Sell 5 is there when the stack holds five and never when it does not",
  `${sell.cards} cards, tab ${sell.five}`);
check(sell.lots === null, "a stack bought in one press offers no lots", String(sell.lots));
check(Math.abs(dollars(sell.all) - sell.cards * dollars(sell.one)) <= 2,
  "Sell all names every card in the stack", `${sell.cards} x ${sell.one} against ${sell.all}`);
await page.screenshot({ path: OUT + "tally-c1-fan.png" });

// a tap on a stack turns its card over, and a fanned card still does too
await page.locator(`[data-till-stack="${stackId}"] [role="button"]`).first().click();
await wait(420);
check((await page.locator('[data-flip="open"]').count()) === 1, "tapping a till stack turns the card over");
await page.locator('[data-flip="open"]').click({ position: { x: 5, y: 5 } });
await wait(320);

// -------------------------------------------------- 5. the lots

// The cards in a stack hold different money once they were bought on different
// turns, so play a turn, buy one more, and then sell one card out of the older
// lot by the dollars its own tab named.
await page.locator('[data-shop-close="1"]').click();
await wait(400);
await page.locator('[data-play="1"]').click();
await wait(400);
for (let i = 0; i < 60; i++) {
  if (await page.locator('[data-paper-continue="1"]').count()) {
    await page.locator('[data-paper-continue="1"]').click();
    await wait(300);
    continue;
  }
  if (await page.locator("[data-skip]").count()) {
    await page.locator("[data-skip]").click({ force: true }).catch(() => {});
    await wait(150);
    continue;
  }
  break;
}
await wait(400);
await page.locator('[data-shop-open="1"]').click({ timeout: 8000 });
await wait(600);
for (let i = 0; i < 4; i++) {
  if (await page.locator('[data-debut-continue="1"]').count()) {
    await page.locator('[data-debut-continue="1"]').click();
    await wait(240);
  } else break;
}
// one more card of the same name, at the new price
if (await page.locator(`[data-buy="${stackId}"]`).isEnabled()) {
  await page.locator(`[data-buy="${stackId}"]`).click();
  await wait(700);
}
const lotsTab = page.locator(`[data-lots="${stackId}"]`);
check((await lotsTab.count()) === 1, "a stack of two purchases offers its lots",
  (await page.locator(`[data-till-stack="${stackId}"]`).innerText()).replace(/\s+/g, " "));
await lotsTab.click();
await wait(360);
const fan = await page.evaluate((id) => {
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
}, stackId);
check(!!fan && fan.lots.length === 2, "the stack opens as one card for each purchase",
  String(fan?.lots?.length));
check(fan.lots.every((l) => /^Sell 1 · \$[\d,]+$/.test(l.tab ?? "")), "every lot carries its own sell tab",
  fan.lots[0]?.tab);
check(/^Sell all · \$[\d,]+$/.test(fan.all ?? ""), "the lots carry one sell all tab", fan.all);
check(/ · \d+ lots$/.test(fan.header ?? ""), "the header names the stack and counts its lots", fan.header);
check(fan.lots.every((l) => /×\d+ · (turn|ch) /.test(l.caption) && /(at|put in) \$/.test(l.caption)),
  "every lot says how many it holds, when it was bought and what it paid", fan.lots[0]?.caption);
// The honesty this used to check on a fanned card, checked on a lot: the money
// a lot hands back is that card's own shares at today's price, which is why the
// older lot and the newer one are worth different money with one price between
// them.
const values = fan.lots.map((l) => l.tab);
check(new Set(values).size > 1, "the lots are worth different money", values.join(", "));
const mid = fan.lots[0];
const cashBefore = await cashOf(page);
await page.locator(`[data-fan-sell="${mid.uid}"]`).click();
await wait(800);
const lotGone = await page.evaluate((uid) => !document.querySelector(`[data-fan-sell="${uid}"]`), mid.uid);
const cashAfter = await cashOf(page);
const paid = dollars(mid.tab);
check(lotGone, "the card that was sold is the card that left", `sold ${mid.uid}`);
check(Math.abs(cashAfter - cashBefore - paid) <= 1,
  "the money back is exactly what that lot's tab named, which is its shares at today's price",
  `${cashBefore} + ${paid} -> ${cashAfter}`);

// -------------------------------------------------- 6. sell all

if (!(await page.locator(`[data-till-fan="${stackId}"]`).count())) {
  const back = page.locator(`[data-lots="${stackId}"]`);
  if (await back.count()) { await back.click(); await wait(320); }
}
const allTab = (await page.locator(`[data-fan-all="${stackId}"]`).count())
  ? page.locator(`[data-fan-all="${stackId}"]`)
  : page.locator(`[data-till-all="${stackId}"]`);
if (await allTab.count()) {
  const total = dollars(await allTab.textContent());
  const cashPre = await cashOf(page);
  await allTab.click();
  await wait(900);
  const cashPost = await cashOf(page);
  check((await page.locator(`[data-till-stack="${stackId}"]`).count()) === 0
     && (await page.locator(`[data-till-fan="${stackId}"]`).count()) === 0,
    "sell all empties the stack out of the till");
  check(Math.abs(cashPost - cashPre - total) <= 1, "sell all hands back exactly what it named",
    `${cashPre} + ${total} -> ${cashPost}`);
} else {
  check(false, "the stack still offers sell all");
}

await ctx.close();

// ------------------------------------------------------------ reduced motion

const rctx = await browser.newContext({
  viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce",
});
const rp = await rctx.newPage();
rp.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror reduced"); });
await openShop(rp);

const rCash0 = await cashOf(rp);
const rPick = await rp.evaluate(() => {
  for (const cell of document.querySelectorAll("[data-market]")) {
    const max = cell.querySelector("[data-buy-max]");
    if (!max) continue;
    const cost = Number(/\$([\d,]+)/.exec(cell.querySelector("[data-buy]").textContent)[1].replace(/,/g, ""));
    if (cost < 100) continue;
    return { id: cell.getAttribute("data-market"), n: Number(max.getAttribute("data-buy-max-n")), cost };
  }
  return null;
});
await rp.locator(`[data-buy-max="${rPick.id}"]`).click();
let sawFlight = false;
for (let i = 0; i < 14; i++) {
  const n = await rp.evaluate(() => {
    let seen = 0;
    for (const el of document.querySelectorAll(".tally-fly")) {
      if (getComputedStyle(el).display !== "none") seen++;
    }
    return seen;
  });
  if (n > 0) sawFlight = true;
  await wait(40);
}
check(!sawFlight, "reduced motion never flies a block");
const rCash1 = await cashOf(rp);
const rCollar = await rp.locator(`[data-till-stack="${rPick.id}"]`).innerText();
check(new RegExp(`${rPick.n} cards`).test(rCollar.replace(/\s+/g, " ")),
  "reduced motion still mints the exact count", rCollar.replace(/\s+/g, " "));
check(Math.abs(rCash1 - (rCash0 - rPick.n * rPick.cost)) <= 1,
  "reduced motion cash is the exact end state", `${rCash0} -> ${rCash1}`);

// a sell, reduced
const rTabs = await rp.evaluate((id) => {
  const box = document.querySelector(`[data-till-stack="${id}"]`);
  return {
    one: box.querySelector("[data-till]")?.textContent?.trim() ?? null,
    all: box.querySelector("[data-till-all]")?.textContent?.trim() ?? null,
    lots: box.querySelector("[data-lots]")?.textContent?.trim() ?? null,
  };
}, rPick.id);
check(/^Sell 1 · \$[\d,]+$/.test(rTabs.one ?? ""), "reduced motion carries the same sell tabs", rTabs.one);
check(rTabs.lots === null, "and one press is still one lot", String(rTabs.lots));
const rPaid = Number(/\$([\d,]+)/.exec(rTabs.one)[1].replace(/,/g, ""));
const rPre = await cashOf(rp);
await rp.locator(`[data-till="${await rp.evaluate((id) => document.querySelector(`[data-till-stack="${id}"] [data-till]`).getAttribute("data-till"), rPick.id)}"]`).click();
await wait(240);
const rPost = await cashOf(rp);
check(Math.abs(rPost - rPre - rPaid) <= 1, "reduced motion sells for exactly the tab's dollars",
  `${rPre} + ${rPaid} -> ${rPost}`);

await rctx.close();
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
