// Throwaway verifier: every route renders, select screen shows the full
// ladder, OnePager lists everything. Run: node tools/vfy-integration.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE.ERR " + m.text()); });

const routes = [
  "/", "/pulse", "/prism", "/garden", "/garden-old",
  "/orb", "/orb/tutorial", "/orb/era", "/orb/free", "/orb/guide", "/orb/ready",
  "/orb/s/dotcom", "/orb/s/payday", "/orb/s/gfc", "/orb/s/crypto", "/orb/s/covid", "/orb/s/inflation",
  "/orb/brief/dotcom", "/orb/brief/payday", "/orb/brief/gfc", "/orb/brief/crypto", "/orb/brief/covid", "/orb/brief/inflation",
  "/orb/learn/cash", "/orb/learn/savings", "/orb/learn/stocks", "/orb/learn/funds", "/orb/learn/coins",
  "/orb/mini/share", "/orb/mini/fund", "/orb/mini/coin", "/orb/mini/cash", "/orb/learn", "/orb/mini",
  "/objectives", "/archive", "/nope/nothing/here",
];
for (const r of routes) {
  errs.length = 0;
  await page.goto(`${BASE}/#${r}`);
  await wait(700);
  const text = (await page.locator("body").innerText()).trim();
  const url = page.url().split("#")[1];
  console.log(`ROUTE ${r} -> ${url} chars=${text.length} ${errs.length ? "ERRS:" + errs.join(" | ") : ""}`);
  if (text.length < 40) console.log("  !! NEARLY BLANK:", JSON.stringify(text));
}

// select screen detail
await page.goto(`${BASE}/#/orb`);
await wait(900);
const sel = await page.locator("body").innerText();
console.log("\n--- SELECT: lesson labels ---");
console.log([...sel.matchAll(/Lesson \d|Basics \d of \d|The last lesson|Freeplay/g)].map((m) => m[0]).join(" | "));
console.log("--- SELECT: briefing links:", await page.getByText("The era briefing").count());
await page.screenshot({ path: OUT + "select-full.png", fullPage: true });

await page.goto(`${BASE}/#/objectives`);
await wait(900);
const op = await page.locator("body").innerText();
console.log("\n--- ONEPAGER unit names ---");
console.log([...op.matchAll(/(Basics \d\. [^\n]+|Lesson \d\. [^\n]+|The last lesson\. [^\n]+|Tutorial slice)/g)].map((m) => m[0]).join("\n"));
console.log("standards blocks:", (op.match(/CEE |Jump\$tart /g) || []).length);
await page.screenshot({ path: OUT + "onepager-full.png", fullPage: true });

// em dash / emoji sweep on rendered text of a few pages
const banned = [];
for (const r of ["/orb", "/objectives", "/orb/ready", "/orb/learn/savings", "/orb/brief/covid", "/orb/brief/inflation"]) {
  await page.goto(`${BASE}/#${r}`);
  await wait(700);
  const t = await page.locator("body").innerText();
  if (t.includes("—")) banned.push(`${r}: em dash`);
  const emo = t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  if (emo) banned.push(`${r}: emoji ${[...new Set(emo)].join("")}`);
}
console.log("\nBANNED SWEEP:", banned.length ? banned.join(" | ") : "clean");

await browser.close();
