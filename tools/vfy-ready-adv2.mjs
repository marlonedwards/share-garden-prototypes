// Second adversarial pass: viewport-accurate shots (sticky strip behavior) and
// mirror-branch coverage. Run: node tools/vfy-ready-adv2.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

const seed = async (path, lines) => {
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate(([p, ls]) => {
    localStorage.setItem("orb-ready-plan", JSON.stringify({ path: p, lines: ls, savedAt: "2026-08-06" }));
  }, [path, lines]);
  await page.goto(`${BASE}/#/orb/ready`);
  await wait(700);
};

// ---- sticky strip legibility, real viewport ----
await seed("first", [
  { key: "voo", assetId: "voo", dollars: 500 },
  { key: "nvda", assetId: "nvda", dollars: 300 },
]);
await page.getByLabel("Back one step").click(); // to pick
await wait(400);
await page.evaluate(() => window.scrollTo(0, 600));
await wait(400);
await page.screenshot({ path: OUT + "adv2-sticky-scrolled.png" });
await page.evaluate(() => window.scrollTo(0, 0));
await wait(300);
await page.screenshot({ path: OUT + "adv2-pick-top.png" });

const mirrorFor = async (label, path, lines) => {
  await seed(path, lines);
  await page.getByRole("button", { name: "Continue" }).click();
  await wait(500);
  const t = await page.locator("main").innerText();
  console.log(`\n===== ${label} =====\n` + t.split("The mirror\nEvery reading looks backward.")[1]?.trim());
};

await mirrorFor("single stock only", "first", [{ key: "tsla", assetId: "tsla", dollars: 500 }]);
await mirrorFor("single index only", "first", [{ key: "voo", assetId: "voo", dollars: 500 }]);
await mirrorFor("single coin only", "first", [{ key: "btc", assetId: "btc", dollars: 500 }]);
await mirrorFor("single bond only", "first", [{ key: "bnd", assetId: "bnd", dollars: 500 }]);
await mirrorFor("no fund, three stocks", "own", [
  { key: "aapl", assetId: "aapl", dollars: 300 },
  { key: "tsla", assetId: "tsla", dollars: 300 },
  { key: "ko", assetId: "ko", dollars: 300 },
]);
await mirrorFor("coin heavy + fund + bond", "first", [
  { key: "voo", assetId: "voo", dollars: 200 },
  { key: "btc", assetId: "btc", dollars: 600 },
  { key: "bnd", assetId: "bnd", dollars: 200 },
]);
await mirrorFor("small coin + fund", "first", [
  { key: "voo", assetId: "voo", dollars: 900 },
  { key: "btc", assetId: "btc", dollars: 100 },
]);
await mirrorFor("one custom line only", "own", [{ key: "custom-1", label: "Grandma's bank stock", dollars: 500 }]);
await mirrorFor("stock 40 pct + fund 35 + coin 25", "first", [
  { key: "nvda", assetId: "nvda", dollars: 400 },
  { key: "voo", assetId: "voo", dollars: 350 },
  { key: "eth", assetId: "eth", dollars: 250 },
]);
await page.screenshot({ path: OUT + "adv2-mirror-mixed.png", fullPage: true });

// ---- 12-line plan: does the print sheet still fit one page? ----
const ids = ["voo","vti","vxus","qqq","schd","aapl","msft","googl","amzn","nvda","tsla","brkb"];
await seed("first", ids.map((id, i) => ({ key: id, assetId: id, dollars: 100 + i * 37 })));
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
await page.emulateMedia({ media: "print" });
await wait(300);
const box = await page.locator(".rd-print").boundingBox();
console.log("\n12-line print sheet height px:", box?.height, "(letter at 96dpi minus 1in margins = 960px)");
await page.screenshot({ path: OUT + "adv2-print-12.png", fullPage: true });
await page.emulateMedia({ media: "screen" });
await page.screenshot({ path: OUT + "adv2-mirror-12.png", fullPage: true });
console.log("12-line mirror text:\n" + (await page.locator("main").innerText()));

// ---- 0-dollar plan reaching the mirror ----
await seed("first", [{ key: "voo", assetId: "voo", dollars: 0 }]);
const cont = page.getByRole("button", { name: "Continue" });
console.log("\nContinue disabled with total 0:", await cont.isDisabled());
await page.screenshot({ path: OUT + "adv2-zero.png", fullPage: true });

await browser.close();
