// Clean-type screenshot sweep for the Orb suite (docs/clean-type.md).
// Run: node tools/cleanorb.mjs
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";
const OUT = new URL("./shots/clean-orb/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["orb", "/orb"],
  ["orb-scenario-dotcom", "/orb/s/dotcom"],
  ["orb-brief-dotcom", "/orb/brief/dotcom"],
  ["orb-free", "/orb/free"],
  ["orb-guide", "/orb/guide"],
  ["orb-intro", "/orb/intro"],
  ["orb-learn-cash", "/orb/learn/cash"],
  ["orb-ready", "/orb/ready"],
  ["stack", "/stack"],
];

const browser = await chromium.launch();
let errs = 0;

for (const [w, h, tag, only] of [[1440, 950, "desktop", null], [390, 844, "mobile", ["/orb", "/orb/intro", "/orb/learn/cash"]]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); errs++; });
  page.on("console", (m) => { if (m.type() === "error") { console.log("CONSOLE.ERR:", m.text().slice(0, 160)); errs++; } });
  for (const [name, route] of ROUTES) {
    if (only && !only.includes(route)) continue;
    await page.goto(`${BASE}/#${route}`);
    await wait(1100);
    await page.screenshot({ path: `${OUT}${tag}-${name}.png`, fullPage: tag === "desktop" });
    console.log("shot", tag, route);
  }
  await page.close();
}

// A few interior states the plain route sweep never reaches.
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); errs++; });
page.on("console", (m) => { if (m.type() === "error") { console.log("CONSOLE.ERR:", m.text().slice(0, 160)); errs++; } });

// scouting deck screen of the dot-com brief
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(900);
if (await page.getByRole("button", { name: "Scout the menu" }).count()) {
  await page.getByRole("button", { name: "Scout the menu" }).click();
  await wait(500);
  await page.screenshot({ path: `${OUT}desktop-scouting-front.png` });
  await page.locator('button[aria-label="card 1"]').click();
  await wait(300);
  await page.locator("button.block.w-full.text-left").click();
  await wait(700);
  await page.screenshot({ path: `${OUT}desktop-scouting-report.png` });
}
// running tape with the trade rail
await page.getByText("Start in 2000").click().catch(() => {});
await wait(1500);
await page.screenshot({ path: `${OUT}desktop-scenario-running.png` });

// lesson step 3 of the cash lesson
await page.goto(`${BASE}/#/orb/learn/cash?step=3`);
await wait(900);
await page.screenshot({ path: `${OUT}desktop-learn-cash-step3.png`, fullPage: true });

// ready mode step 1 (the shelf)
await page.goto(`${BASE}/#/orb/ready`);
await wait(800);
await page.getByText("I'm planning my first orb").click().catch(() => {});
await wait(700);
await page.screenshot({ path: `${OUT}desktop-ready-shelf.png`, fullPage: true });

// the intro ritual past the arrival lines
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p2.goto(`${BASE}/#/orb/intro`);
for (let i = 0; i < 15; i++) { await wait(400); if (await p2.getByPlaceholder("Your name").count()) break; }
await p2.getByPlaceholder("Your name").fill("Comet");
await p2.getByRole("button", { name: "That's me" }).click();
await wait(700);
await p2.screenshot({ path: `${OUT}mobile-intro-pour.png` });
await p2.locator('button[aria-label="Pour this color"]').nth(1).click();
await wait(800);
await p2.screenshot({ path: `${OUT}mobile-intro-poured.png` });
await p2.getByRole("button", { name: "Keep going" }).click();
await wait(700);
await p2.screenshot({ path: `${OUT}mobile-intro-ask.png` });
await p2.getByRole("button", { name: "Save all of it" }).click();
await wait(400);
await p2.getByRole("button", { name: "To the company" }).click();
await wait(400);
await p2.getByRole("button", { name: "In a jar at home" }).click();
await wait(400);
await p2.getByRole("button", { name: "Never heard of it" }).click();
await wait(700);
await p2.screenshot({ path: `${OUT}mobile-intro-done.png` });
await p2.close();

console.log(errs === 0 ? "\nno console/page errors" : `\n${errs} error(s)`);
await browser.close();
