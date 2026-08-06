import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

// build a plan, reach the mirror, then start over
await page.goto(`${BASE}/#/orb/ready`);
await wait(600);
await page.evaluate(() => localStorage.removeItem("orb-ready-plan"));
await page.reload();
await wait(600);
await page.getByText("I already own some").click();
await wait(300);
const shelf = page.locator('button[aria-pressed]');
for (const i of [0, 5, 17, 18]) { await shelf.nth(i).click(); await wait(60); }
await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
const ins = page.locator('input[type="number"]');
const vals = ["400", "900", "300", "600"];
for (let i = 0; i < 4; i++) await ins.nth(i).fill(vals[i]);
await wait(400);
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
console.log("mirror reached:", (await page.locator("main").innerText()).slice(0, 12).replace(/\n/g, " "));
await page.screenshot({ path: OUT + "ready-10-own-mirror.png", fullPage: true });
console.log("--- OWN MIRROR ---\n" + (await page.locator("main").innerText()));
await page.emulateMedia({ media: "print" });
await page.setViewportSize({ width: 816, height: 1056 });
await wait(300);
await page.screenshot({ path: OUT + "ready-11-own-print.png", fullPage: true });
const box = await page.locator(".rd-print").boundingBox();
console.log("print height at Letter width:", box && Math.round(box.height));
await page.emulateMedia({ media: "screen" });
await page.setViewportSize({ width: 1280, height: 1000 });
await wait(300);

// switch path in place
await page.getByRole("button", { name: /Switch to/ }).click();
await wait(400);
console.log("after switch, eyebrow:", (await page.locator("main").innerText()).slice(0, 34).replace(/\n/g, " "));

await page.getByRole("button", { name: "Start over" }).click();
await wait(250);
await page.getByRole("button", { name: "Yes, clear it" }).click();
await wait(500);
console.log("door back:", await page.locator("text=One door, two paths").count());
console.log("storage after start over:", await page.evaluate(() => localStorage.getItem("orb-ready-plan")));

await page.goto(`${BASE}/#/orb`);
await wait(700);
console.log("select marble gone:", await page.locator('[aria-label="The marble from your saved plan"]').count());

// narrow viewport
await page.setViewportSize({ width: 400, height: 900 });
await page.goto(`${BASE}/#/orb/ready`);
await wait(700);
await page.screenshot({ path: OUT + "ready-13-narrow-door.png", fullPage: true });
console.log("narrow door overflow:", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
await page.getByText("I'm planning my first orb").click();
await wait(500);
await page.locator('button[aria-pressed]').nth(0).click();
await wait(200);
await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
await page.screenshot({ path: OUT + "ready-13-narrow-mirror.png", fullPage: true });
console.log("narrow mirror overflow:", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
await browser.close();
