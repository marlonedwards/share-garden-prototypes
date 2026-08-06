// Adversarial integration verify: routes, select ladder, one-pager, briefings.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });

const ROUTES = [
  "/", "/orb", "/orb/tutorial", "/orb/free", "/orb/guide", "/orb/ready", "/objectives", "/archive",
  "/orb/learn/cash", "/orb/learn/savings", "/orb/learn/stocks", "/orb/learn/funds", "/orb/learn/coins",
  "/orb/mini/share", "/orb/mini/fund", "/orb/mini/coin", "/orb/learn", "/orb/mini",
  "/orb/s/dotcom", "/orb/s/payday", "/orb/s/gfc", "/orb/s/crypto", "/orb/s/covid", "/orb/s/inflation",
  "/orb/brief/dotcom", "/orb/brief/payday", "/orb/brief/gfc", "/orb/brief/crypto", "/orb/brief/covid", "/orb/brief/inflation",
  "/orb/era", "/pulse", "/prism", "/garden", "/nonsense-route",
];
for (const r of ROUTES) {
  errs.length = 0;
  await page.goto(`${BASE}/#${r}`);
  await wait(700);
  const url = page.url().split("#")[1];
  const txt = (await page.locator("body").innerText()).trim();
  console.log(`${r} -> ${url} | chars=${txt.length} | errs=${errs.length ? errs.join(" ;; ") : "none"}`);
}

// select screen ladder detail
await page.goto(`${BASE}/#/orb`);
await wait(900);
await page.screenshot({ path: OUT + "select-full.png", fullPage: true });
const sel = await page.locator("body").innerText();
console.log("=== SELECT TEXT ===\n" + sel);

await page.goto(`${BASE}/#/objectives`);
await wait(900);
await page.screenshot({ path: OUT + "onepager-full.png", fullPage: true });
const names = await page.locator(".sg-card .t-sm.font-semibold").allInnerTexts();
console.log("=== ONEPAGER UNIT NAMES ===\n" + names.join("\n"));

await browser.close();
