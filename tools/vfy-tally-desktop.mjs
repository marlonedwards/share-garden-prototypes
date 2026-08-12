// The Tally, desktop pass: explicit buy and sell, full desktop board, and the
// two just-landed fixes (no mirrored flip text, no visible scrollbars).
// Usage: node tools/vfy-tally-desktop.mjs [chromium|webkit]
//
// Chapter 1 has an empty market by design, so the buying and selling checks run
// in chapter 2, which is the first chapter with a card on the counter.

import { chromium, webkit } from "playwright";
import { mkdirSync } from "fs";

const ENGINE = process.argv[2] === "webkit" ? webkit : chromium;
const NAME = process.argv[2] === "webkit" ? "webkit" : "chromium";
const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) fails.push(label);
}

const browser = await ENGINE.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror"); });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

// cleared once, not on every reload, or the seeded collector's box would go
// with it when the wall checks reload the page
await page.addInitScript(() => {
  try {
    if (!sessionStorage.getItem("vfy-cleared")) {
      localStorage.clear();
      sessionStorage.setItem("vfy-cleared", "1");
    }
  } catch (e) {}
});
await page.goto(BASE);
await wait(700);

// the game now opens on its main menu, so a run starts from there
if (await page.locator('[data-menu="new"]').count()) {
  await page.locator('[data-menu="new"]').click();
  await wait(400);
}

let debuts = 0;
async function clearGates() {
  for (let i = 0; i < 14; i++) {
    if (await page.locator('[data-debut-continue="1"]').count()) {
      debuts++;
      await page.locator('[data-debut-continue="1"]').click();
      await wait(280);
      continue;
    }
    if (await page.locator('[data-paper-continue="1"]').count()) {
      await page.locator('[data-paper-continue="1"]').click();
      await wait(340);
      continue;
    }
    break;
  }
}

const chapterNow = () => page.evaluate(() => {
  const m = document.querySelector('[data-board="tally"]').textContent.match(/Chapter (\d)/);
  return m ? Number(m[1]) : 0;
});

async function closeShop() {
  if (await page.locator('[data-shop-close="1"]:visible').count()) {
    await page.locator('[data-shop-close="1"]').click();
    await wait(420);
  }
}

// ------------------------------------------------------------- chapter 1 to 2
await page.getByRole("button", { name: "Begin", exact: true }).click();
await wait(1300);
await clearGates();

const board = await page.evaluate(() => {
  const el = document.querySelector('[data-board="tally"]');
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), t: getComputedStyle(el).transform };
});
check(board.w >= 900 && board.h >= 700, "the board fills the desktop window", `${board.w}x${board.h}`);
check(board.t === "none" || board.t === "matrix(1, 0, 0, 1, 0, 0)", "no transform scale on desktop", board.t);

let reached = 0;
for (let i = 0; i < 24; i++) {
  await clearGates();
  if (await page.getByRole("button", { name: "Continue", exact: true }).count()) {
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await wait(700);
    continue;
  }
  if (await page.getByRole("button", { name: "Begin", exact: true }).count()) {
    reached = await chapterNow();
    if (reached >= 2) {
      await page.getByRole("button", { name: "Begin", exact: true }).click();
      await wait(1400);
      await clearGates();
      break;
    }
  }
  await closeShop();
  const play = page.locator('[data-play="1"]');
  if ((await play.count()) && (await play.isEnabled())) {
    await play.click();
    await wait(2100);
  } else {
    await wait(400);
  }
}
check(reached >= 2, "chapter 1 played through to chapter 2 by clicks", `chapter=${reached}`);
check(debuts >= 1, "the debut gate fired once", `debuts=${debuts}`);

// ------------------------------------------------------------------- buying
const cashOf = () => page.evaluate(() => {
  const m = document.querySelector('[data-shop="open"]').textContent.match(/\$[\d,]+/);
  return m ? Number(m[0].slice(1).replace(/,/g, "")) : null;
});

const buys = page.locator("[data-buy]");
check((await buys.count()) > 0, "every shop card carries a buy button", `${await buys.count()} buttons`);
const buyLabel = (await buys.first().innerText()).trim();
check(/^Buy \$[\d,]+$/.test(buyLabel), "the buy button states the price", JSON.stringify(buyLabel));
const tab = await buys.first().evaluate((el) => getComputedStyle(el).fontVariantNumeric);
check(tab.includes("tabular-nums"), "the price is set in tabular numerals", tab);

const cash0 = await cashOf();
const tills0 = await page.locator("[data-till]").count();
await buys.first().click();
await wait(420);
const cash1 = await cashOf();
const tills1 = await page.locator("[data-till]").count();
check(cash1 < cash0, "the buy button spends money", `${cash0} to ${cash1}`);
check(tills1 === tills0 + 1, "the buy button adds a card to the till", `${tills0} to ${tills1}`);

// tapping the card itself is free
await page.locator("[data-market]").first().click();
await wait(430);
check((await page.locator('[data-flip="open"]').count()) === 1, "tapping the card turns it over instead of buying");

// the front face hands its opacity off at the midpoint, so no mirrored text
const faceOpacity = await page.evaluate(() => {
  const root = document.querySelector('[data-flip="open"]');
  return [...root.querySelectorAll("div")]
    .filter((d) => getComputedStyle(d).backfaceVisibility === "hidden")
    .map((d) => getComputedStyle(d).opacity);
});
check(faceOpacity[0] === "0" && faceOpacity[1] === "1", "the turned card hides its front face", JSON.stringify(faceOpacity));
const cashAfterFlip = await cashOf();
check(cashAfterFlip === cash1, "turning a card over costs nothing", `${cashAfterFlip}`);
await page.locator('[data-flip="open"]').click();
await wait(380);

// ------------------------------------------------------------------ selling
const sellLabel = (await page.locator("[data-till]").first().innerText()).replace(/\s+/g, " ").trim();
check(/·\s*Sell \$[\d,]+/.test(sellLabel), "the till chip names the card and its sell price", JSON.stringify(sellLabel));

// buy a second card so the till has more than one chip on it
if (await buys.first().isEnabled()) {
  await buys.first().click();
  await wait(300);
}

// ------------------------------------------------------------ no scrollbars
const bars = await page.evaluate(() =>
  [...document.querySelectorAll(".tally-scroll")].map((el) => ({
    x: el.offsetHeight - el.clientHeight,
    y: el.offsetWidth - el.clientWidth,
  })),
);
check(bars.length > 0 && bars.every((b) => b.x === 0 && b.y === 0), "no scroller shows a bar", JSON.stringify(bars));
const pageScroll = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - window.innerWidth,
  y: document.documentElement.scrollHeight - window.innerHeight,
}));
check(pageScroll.x <= 0 && pageScroll.y <= 0, "the page itself does not scroll", JSON.stringify(pageScroll));

const cash2 = await cashOf();
const tills2 = await page.locator("[data-till]").count();
await page.locator("[data-till]").first().click();
await wait(430);
const cash3 = await cashOf();
check(cash3 > cash2, "the sell button returns money", `${cash2} to ${cash3}`);
check((await page.locator("[data-till]").count()) === tills2 - 1, "selling removes the card from the till");

await closeShop();
await wait(400);

// --------------------------------------------------------- the wall at width
async function wallAt(ch) {
  await page.evaluate(() => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: [1, 2, 3, 4, 5, 6, 7], instruments: [], badges: [], eraBest: {},
    }));
  });
  await page.reload();
  await wait(800);
  // the menu is the first screen now, and the selector is where a chapter starts
  if (await page.locator('[data-menu="chapters"]').count()) {
    await page.locator('[data-menu="chapters"]').click();
    await wait(320);
    const tile = page.locator(`[data-chapter-start="${ch}"]`);
    if (await tile.count()) {
      await tile.click();
      await wait(800);
    } else {
      console.log(`note: chapter ${ch} is not open on this box`);
    }
  }
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(1300);
  await clearGates();
  await closeShop();
  for (let i = 0; i < 3; i++) {
    const play = page.locator('[data-play="1"]');
    if ((await play.count()) && (await play.isEnabled())) {
      await play.click();
      await wait(2000);
      await clearGates();
      await closeShop();
    }
  }
  const geom = await page.getAttribute("[data-wall-geom]", "data-wall-geom");
  console.log(`chapter ${ch} wall: ${geom}`);
  await page.screenshot({ path: OUT + `tally-desktop-wall-ch${ch}.png` });
  return geom ?? "";
}

for (const ch of [4, 6]) {
  const geom = await wallAt(ch);
  const num = (k) => Number((geom.match(new RegExp(`${k}=([\\d.]+)`)) || [])[1] || 0);
  const size = num("size");
  const buckets = num("buckets");
  const slots = num("slots");
  const pitch = num("pitch");
  const field = Number((geom.match(/field=(\d+)x/) || [])[1] || 0);
  // a block worth looking at, a column for every slot the chapter can afford
  // one for, and a record that spans the stage rather than hugging its middle
  check(
    size >= 5 && buckets >= Math.min(slots, 12) && buckets * pitch >= field * 0.6,
    `chapter ${ch} wall stays dense at this width`,
    geom,
  );
  const marks = await page.evaluate(() => {
    const t = document.querySelector('[data-wall-geom]').textContent;
    return { target: /target \$/.test(t), readout: /blocks?\b/.test(t) };
  });
  check(marks.target && marks.readout, `chapter ${ch} wall keeps its target line and readout`, JSON.stringify(marks));
}

// ------------------------------------------------- the shots, on a full board
// Chapter 6 is the widest counter in the game, so it is where the desktop shop
// has something to show: many columns of the same card, and a till with several
// chips on it.
await page.locator('[data-shop-open="1"]').click();
await wait(700);
const shopBuys = page.locator("[data-buy]");
const n = await shopBuys.count();
for (const i of [0, 2, 4, 6]) {
  if (i < n && (await shopBuys.nth(i).isEnabled())) {
    await shopBuys.nth(i).click();
    await wait(280);
  }
}
const shopGrid = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-market]")].map((el) => el.getBoundingClientRect());
  const top = Math.min(...cards.map((r) => Math.round(r.top)));
  return { cards: cards.length, perRow: cards.filter((r) => Math.round(r.top) === top).length, w: Math.round(cards[0].width) };
});
check(shopGrid.perRow >= 6, "the wide board buys more columns, not bigger cards", JSON.stringify(shopGrid));
check(shopGrid.w <= 92, "the card keeps its size at desktop width", `${shopGrid.w}px`);
const bars2 = await page.evaluate(() =>
  [...document.querySelectorAll(".tally-scroll")].map((el) => el.offsetHeight - el.clientHeight + (el.offsetWidth - el.clientWidth)),
);
check(bars2.every((b) => b === 0), "the full counter still shows no scrollbar", JSON.stringify(bars2));
await page.screenshot({ path: OUT + "tally-desktop-shop.png" });
console.log("shot tools/shots/tally-desktop-shop.png");

await closeShop();
await wait(500);
await page.screenshot({ path: OUT + "tally-desktop-table.png" });
console.log("shot tools/shots/tally-desktop-table.png");

console.log(`\n${NAME}: ${fails.length ? "FAILURES: " + fails.join(", ") : "all checks passed"}`);
await browser.close();
process.exit(fails.length ? 1 : 0);
