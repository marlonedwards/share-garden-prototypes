// Throwaway adversarial verification of the W6 finale at /orb/ready.
// Run: node tools/vfy-ready-a.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

const cards = async () => page.locator("main .rounded-3xl.bg-white").count();
const scrolls = async () => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 4);

await page.goto(`${BASE}/#/orb/ready`);
await wait(900);
console.log("DOOR cards:", await cards(), "scroll:", await scrolls());
await page.screenshot({ path: OUT + "ready-1-door.png", fullPage: true });

// path one
await page.getByText("I'm planning my first orb").click();
await wait(500);
console.log("PICK cards:", await cards(), "scroll:", await scrolls());
await page.screenshot({ path: OUT + "ready-2-pick.png", fullPage: true });

// add three shelf lines + a custom
for (const n of ["Vanguard S&P 500", "Nvidia", "Bitcoin"]) {
  await page.locator(`button:has-text("${n}")`).first().click();
  await wait(120);
}
await page.locator('input[placeholder="What is it called?"]').fill("Grandma's bank stock");
await page.locator('button:has-text("Add")').last().click();
await wait(300);
console.log("PICK after adds cards:", await cards());
await page.screenshot({ path: OUT + "ready-3-picked.png", fullPage: true });

await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
console.log("SIZE cards:", await cards(), "scroll:", await scrolls());
const inputs = page.locator('input[type="number"]');
console.log("SIZE line count:", await inputs.count());
await inputs.nth(0).fill("1200");
await wait(150);
await inputs.nth(1).fill("400");
await wait(150);
await inputs.nth(2).fill("150");
await wait(150);
await inputs.nth(3).fill("250");
await wait(400);
await page.screenshot({ path: OUT + "ready-4-size.png", fullPage: true });

await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
console.log("MIRROR cards:", await cards(), "scroll:", await scrolls());
await page.screenshot({ path: OUT + "ready-5-mirror.png", fullPage: true });
const mirrorText = await page.locator("main").innerText();
console.log("--- MIRROR TEXT ---\n" + mirrorText + "\n--- END ---");

// print sheet: force the print media and screenshot
await page.emulateMedia({ media: "print" });
await wait(300);
await page.screenshot({ path: OUT + "ready-6-print.png", fullPage: true });
const printText = await page.locator(".rd-print").innerText();
console.log("--- PRINT TEXT ---\n" + printText + "\n--- END ---");
await page.emulateMedia({ media: "screen" });

// persistence: reload
await page.reload();
await wait(900);
console.log("AFTER RELOAD screen text starts:", (await page.locator("main").innerText()).slice(0, 120).replace(/\n/g, " | "));
await page.screenshot({ path: OUT + "ready-7-reload.png", fullPage: true });

// select screen shows the saved marble
await page.goto(`${BASE}/#/orb`);
await wait(900);
console.log("SELECT has saved marble:", await page.locator('[aria-label="The marble from your saved plan"]').count());
console.log("SELECT has Ready card:", await page.locator('text=Ready to invest?').count());
await page.screenshot({ path: OUT + "ready-8-select.png", fullPage: true });

await browser.close();
