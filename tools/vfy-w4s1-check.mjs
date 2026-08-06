import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4328";
const browser = await chromium.launch();
const errs = [];

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));

// --- select screen: briefing link present on dotcom card
await page.goto(`${BASE}/#/orb`);
await wait(1200);
await page.screenshot({ path: OUT + "chk-select.png" });
const briefLinks = await page.locator('a[href*="/orb/brief/"]').count();
console.log("select briefing links:", briefLinks);

// --- briefing route
await page.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(900);
await page.screenshot({ path: OUT + "chk-brief-top.png" });
const briefInfo = await page.evaluate(() => ({
  h1: document.querySelector("h1")?.textContent,
  bodyH: document.body.scrollHeight,
  docScrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  sections: document.querySelectorAll("section").length,
  links: [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).slice(0, 20),
}));
console.log("brief:", JSON.stringify(briefInfo));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(400);
await page.screenshot({ path: OUT + "chk-brief-bottom.png" });

// redirect behaviour
await page.goto(`${BASE}/#/orb/brief/payday`);
await wait(700);
console.log("payday brief ->", await page.evaluate(() => location.hash));
await page.goto(`${BASE}/#/orb/brief/nope`);
await wait(700);
console.log("bogus brief ->", await page.evaluate(() => location.hash));

// --- the scenario brief beat
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1500);
await page.screenshot({ path: OUT + "chk-brief-beat.png" });
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await page.screenshot({ path: OUT + "chk-scout-front.png" });

const startBtn = page.locator("button", { hasText: "Start in 2000" }).first();
console.log("start disabled at 0 flips:", await startBtn.isDisabled());
// try clicking it anyway
try { await startBtn.click({ timeout: 1500, force: true }); } catch (e) { console.log("forced click threw"); }
await wait(600);
console.log("hash after forced click:", await page.evaluate(() => location.hash));
const stillScouting = await page.locator("text=Scout the menu before you start").count();
console.log("still on scouting screen after forced click:", stillScouting);

// flip card 1
const cardBtn = page.locator("div[style*='perspective'] > button").first();
await cardBtn.click();
await wait(700);
await page.screenshot({ path: OUT + "chk-scout-back.png" });
const counter1 = await page.locator("text=/Scouted \\d+ of \\d+/").first().textContent().catch(() => null);
console.log("counter after 1 flip:", counter1);
console.log("start disabled after 1 flip:", await startBtn.isDisabled());

// tap through the rest by tapping the report
for (let i = 0; i < 12; i++) {
  await cardBtn.click();
  await wait(320);
  const done = await page.locator("text=Every card is scouted.").count();
  if (done) { console.log("all scouted after taps:", i + 2); break; }
}
await page.screenshot({ path: OUT + "chk-scout-done.png" });
console.log("start disabled when all scouted:", await startBtn.isDisabled());

// count visible white cards on the scouting screen + vertical fit
const layout = await page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 240 && r.height > 90 && s.visibility !== "hidden" && s.opacity !== "0" &&
      r.bottom > 0 && r.top < innerHeight;
  };
  const cards = [...document.querySelectorAll("div")].filter((d) => {
    const s = getComputedStyle(d);
    return /rgb\(255, 255, 255\)|rgba\(255, 255, 255/.test(s.backgroundColor) && parseFloat(s.borderRadius) >= 12 && vis(d);
  });
  const start = [...document.querySelectorAll("button")].find((b) => /Start in 2000/.test(b.textContent || ""));
  return {
    visibleWhiteCards: cards.length,
    cardBoxes: cards.map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }),
    startRect: start ? (() => { const r = start.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; })() : null,
    docScrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    docScrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
});
console.log("scout layout:", JSON.stringify(layout));

// --- start the era and reach the first gate
await startBtn.click();
await wait(1200);
await page.screenshot({ path: OUT + "chk-running.png" });
await wait(6000);
await page.screenshot({ path: OUT + "chk-gate.png" });
const gateInfo = await page.evaluate(() => ({
  hasBriefLink: [...document.querySelectorAll("a")].some((a) => /orb\/brief/.test(a.getAttribute("href") || "")),
  text: (document.body.innerText || "").slice(0, 900),
}));
console.log("gate briefing link:", gateInfo.hasBriefLink);
console.log("---- gate text ----\n" + gateInfo.text);

console.log("ERRORS:", JSON.stringify(errs.slice(0, 10)));
await browser.close();
console.log("DONE");
