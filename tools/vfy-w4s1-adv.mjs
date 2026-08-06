import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4328";
const S = (n) => OUT + "adv-" + n + ".png";

const browser = await chromium.launch();
// laptop viewport, the claimed above-the-fold target
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text().slice(0, 200)); });

const log = (...a) => console.log(...a);

// ---------- 1. select screen ----------
await page.goto(`${BASE}/#/orb`);
await wait(1500);
await page.screenshot({ path: S("01-select-fold"), });
await page.screenshot({ path: S("02-select-full"), fullPage: true });
log("select: briefing links =", await page.locator("a[href*='#/orb/brief/']").count());

// ---------- 2. briefing route ----------
await page.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(1000);
await page.screenshot({ path: S("03-brief-fold") });
await page.screenshot({ path: S("04-brief-full"), fullPage: true });
log("brief h1:", await page.locator("h1").innerText());
log("brief sections:", await page.locator("main section").count());
// horizontal overflow?
log("brief scrollW/clientW:", await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));

// unwritten eras redirect
for (const id of ["payday", "gfc", "crypto"]) {
  await page.goto(`${BASE}/#/orb/brief/${id}`);
  await wait(700);
  log(`brief/${id} ->`, page.url().split("#")[1]);
}
// bogus id
await page.goto(`${BASE}/#/orb/brief/zzz`);
await wait(700);
log("brief/zzz ->", page.url().split("#")[1]);

// ---------- 3. scouting deck ----------
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1800);
await page.screenshot({ path: S("05-brief-beat-read") });
// count visible cards on the written-brief screen
const cardCount = async () => page.evaluate(() => {
  const els = [...document.querySelectorAll("div")].filter((d) => {
    const s = getComputedStyle(d);
    return s.backgroundColor === "rgb(255, 255, 255)" && parseFloat(s.borderRadius) >= 12 && d.getBoundingClientRect().width > 300 && d.getBoundingClientRect().height > 60;
  });
  return els.length;
});
log("read screen white cards:", await cardCount());

const scoutBtn = page.getByRole("button", { name: "Scout the menu" });
log("has 'Scout the menu' button:", await scoutBtn.count());
await scoutBtn.click();
await wait(900);
await page.screenshot({ path: S("06-scout-front") });

const start = page.getByRole("button", { name: "Start in 2000" });
log("start present:", await start.count(), "disabled:", await start.isDisabled());
log("counter:", await page.locator("text=/Scouted \\d+ of \\d+/").innerText());
log("hint present:", await page.getByText("Flip every scouting card to open the era.").count());

// does the start button sit above the fold at 800px tall?
const box = await start.boundingBox();
log("start button box:", JSON.stringify(box));
log("page scrollHeight/inner:", await page.evaluate(() => [document.body.scrollHeight, window.innerHeight]));

// try clicking start while locked
await start.click({ force: true }).catch((e) => log("start click err:", e.message.slice(0, 80)));
await wait(500);
log("after forced click, still on brief beat (scout btn deck visible):", await page.locator("text=/Scouted \\d+ of \\d+/").count());

// flip one card
const flip = page.getByRole("button", { name: /Flip the card for/ });
await flip.click();
await wait(700);
await page.screenshot({ path: S("07-scout-back") });
log("after 1 flip counter:", await page.locator("text=/Scouted \\d+ of \\d+/").innerText());

// flip all: tap repeatedly
for (let i = 0; i < 30; i++) {
  const c = await page.locator("text=/Scouted \\d+ of \\d+/").count();
  if (c === 0) break;
  await page.locator("div[style*='perspective'] > button").first().click();
  await wait(220);
}
await wait(600);
await page.screenshot({ path: S("08-scout-all-flipped") });
log("all-flipped label:", await page.getByText("Every card is scouted.").count());
log("start disabled after all flips:", await start.isDisabled());
log("hint gone:", await page.getByText("Flip every scouting card to open the era.").count());
const box2 = await start.boundingBox();
log("start box after:", JSON.stringify(box2), "innerHeight 800");

// arrow-key paging
await page.keyboard.press("ArrowRight");
await wait(300);
await page.screenshot({ path: S("09-after-arrow") });

// ---------- 4. start the run ----------
await start.click();
await wait(2500);
await page.screenshot({ path: S("10-run-started") });
log("running (speed controls present):", await page.getByRole("button", { name: "2×" }).count());

// ---------- 5. restart resets the gate ----------
await page.getByRole("button", { name: "Restart" }).click();
await wait(1200);
await page.screenshot({ path: S("11-after-restart") });
log("restart -> back to written brief:", await page.getByRole("button", { name: "Scout the menu" }).count());
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
log("restart -> start relocked:", await page.getByRole("button", { name: "Start in 2000" }).isDisabled());
log("restart -> counter:", await page.locator("text=/Scouted \\d+ of \\d+/").innerText());

// ---------- 6. non-scouting era still starts ----------
await page.goto(`${BASE}/#/orb/s/gfc`);
await wait(1600);
await page.screenshot({ path: S("12-gfc-brief") });
log("gfc has scout button:", await page.getByRole("button", { name: "Scout the menu" }).count());
const gfcStart = page.locator("button").filter({ hasText: /^Start/ });
log("gfc start count:", await gfcStart.count(), "text:", await gfcStart.first().innerText().catch(() => "-"));
log("gfc start disabled:", await gfcStart.first().isDisabled());

// ---------- 7. gate shows the briefing ref ----------
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1600);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
for (let i = 0; i < 30; i++) {
  const c = await page.locator("text=/Scouted \\d+ of \\d+/").count();
  if (c === 0) break;
  await page.locator("div[style*='perspective'] > button").first().click();
  await wait(180);
}
await page.getByRole("button", { name: "Start in 2000" }).click();
await wait(1200);
// gate at step 1 fires quickly
for (let i = 0; i < 40; i++) {
  if (await page.getByText("February 2000.").count()) break;
  await wait(400);
}
await page.screenshot({ path: S("13-gate") });
log("gate visible:", await page.getByText(/February 2000/).count());
log("gate briefing link:", await page.getByRole("link", { name: "The era briefing" }).count());

// ---------- 8. mobile width ----------
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p2.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1600);
await p2.getByRole("button", { name: "Scout the menu" }).click().catch(() => {});
await wait(700);
await p2.screenshot({ path: S("14-mobile-scout") });
await p2.locator("div[style*='perspective'] > button").first().click();
await wait(600);
await p2.screenshot({ path: S("15-mobile-scout-back") });
await p2.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(900);
await p2.screenshot({ path: S("16-mobile-brief"), fullPage: true });
log("mobile brief overflow:", await p2.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));

await browser.close();
console.log("DONE");
