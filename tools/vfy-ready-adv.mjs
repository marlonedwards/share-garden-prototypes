// Throwaway adversarial verification of the W6 finale at /orb/ready.
// Run: node tools/vfy-ready-adv.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

const cards = async () => page.locator("main .rounded-3xl.bg-white").count();
const metrics = async () => page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  winH: window.innerHeight,
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
}));
const shot = async (n) => page.screenshot({ path: OUT + n, fullPage: true });

// ---------- door ----------
await page.goto(`${BASE}/#/orb/ready`);
await wait(1000);
console.log("DOOR cards:", await cards(), await metrics());
await shot("adv-1-door.png");
console.log("DOOR TEXT:\n" + (await page.locator("main").innerText()));

// ---------- path two first (own) ----------
await page.getByText("I already own some").click();
await wait(400);
console.log("PICK(own) cards:", await cards(), await metrics());
await shot("adv-2-pick-own.png");

// continue disabled with zero lines?
const contDisabled = await page.getByRole("button", { name: "Continue" }).isDisabled();
console.log("Continue disabled with 0 lines:", contDisabled);

// ---------- add 12+ lines to test the cap ----------
const shelfBtns = page.locator('button[aria-pressed]');
const shelfCount = await shelfBtns.count();
console.log("shelf buttons:", shelfCount);
for (let i = 0; i < 13 && i < shelfCount; i++) {
  const b = shelfBtns.nth(i);
  if (await b.isDisabled()) { console.log("shelf button", i, "disabled (cap reached)"); continue; }
  await b.click();
  await wait(60);
}
const capText = await page.locator("main").innerText();
console.log("CAP note present:", capText.includes("closes at twelve"));
await shot("adv-3-cap.png");
// try adding a custom while at cap
await page.locator('input[placeholder="What is it called?"]').fill("Overflow line");
const addDisabled = await page.locator('button:has-text("Add")').last().isDisabled();
console.log("custom Add disabled at cap:", addDisabled);

// remove down to 3
for (let i = 3; i < 12; i++) { await shelfBtns.nth(i).click(); await wait(50); }
await page.locator('input[placeholder="What is it called?"]').fill("Grandma's bank stock");
await page.locator('button:has-text("Add")').last().click();
await wait(300);
console.log("PICK after trim cards:", await cards(), await metrics());
await shot("adv-4-picked.png");

await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
console.log("SIZE cards:", await cards(), await metrics());
const nums = page.locator('input[type="number"]');
console.log("SIZE line count:", await nums.count());
await shot("adv-5-size.png");

// adversarial input: negative, junk, huge
await nums.nth(0).fill("-500"); await wait(150);
console.log("after -500 marble total text:", (await page.locator("main").innerText()).split("\n").slice(0, 12).join(" | "));
await nums.nth(0).fill("1200"); await wait(120);
await nums.nth(1).fill("0"); await wait(120);
await nums.nth(2).fill("300"); await wait(120);
await nums.nth(3).fill("250"); await wait(300);
await shot("adv-6-sized.png");
console.log("SIZE TEXT:\n" + (await page.locator("main").innerText()));

await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
console.log("MIRROR cards:", await cards(), await metrics());
await shot("adv-7-mirror.png");
console.log("MIRROR TEXT:\n" + (await page.locator("main").innerText()));

// ---------- print ----------
await page.emulateMedia({ media: "print" });
await wait(300);
await shot("adv-8-print.png");
console.log("PRINT TEXT:\n" + (await page.locator(".rd-print").innerText()));
console.log("print noprint hidden:", await page.locator(".rd-noprint").isHidden());
await page.emulateMedia({ media: "screen" });

// ---------- back navigation ----------
await page.getByLabel("Back one step").click(); await wait(300);
console.log("back from mirror ->", (await page.locator("main").innerText()).split("\n")[0]);
await page.getByLabel("Back one step").click(); await wait(300);
console.log("back from size ->", (await page.locator("main").innerText()).split("\n")[0]);
await page.getByLabel("Back one step").click(); await wait(300);
console.log("back from pick ->", (await page.locator("main").innerText()).split("\n")[0]);
await shot("adv-9-backdoor.png");

// ---------- persistence ----------
await page.reload();
await wait(900);
console.log("AFTER RELOAD first lines:", (await page.locator("main").innerText()).split("\n").slice(0, 6).join(" | "));
await shot("adv-10-reload.png");

// ---------- select screen ----------
await page.goto(`${BASE}/#/orb`);
await wait(1000);
console.log("SELECT saved marble count:", await page.locator('[aria-label="The marble from your saved plan"]').count());
console.log("SELECT ready card count:", await page.locator('text=Ready to invest?').count());
await shot("adv-11-select.png");

// ---------- switch path + start over ----------
await page.goto(`${BASE}/#/orb/ready`);
await wait(700);
await page.getByRole("button", { name: "Continue" }).click(); await wait(400);
const sw = page.locator('button:has-text("Switch to")');
console.log("switch button text:", await sw.first().innerText());
await sw.first().click(); await wait(400);
console.log("after switch first line:", (await page.locator("main").innerText()).split("\n").slice(0, 3).join(" | "));
await shot("adv-12-switched.png");
await page.locator('button:has-text("Start over")').click(); await wait(200);
await page.locator('button:has-text("Yes, clear it")').click(); await wait(400);
console.log("after start over first line:", (await page.locator("main").innerText()).split("\n")[0]);
console.log("localStorage plan after clear:", await page.evaluate(() => localStorage.getItem("orb-ready-plan")));
await shot("adv-13-cleared.png");

// ---------- narrow viewport ----------
const p2 = await ctx.newPage();
await p2.setViewportSize({ width: 390, height: 844 });
await p2.goto(`${BASE}/#/orb/ready`);
await wait(800);
await p2.getByText("I'm planning my first orb").click();
await wait(400);
await p2.screenshot({ path: OUT + "adv-14-mobile-pick.png", fullPage: true });
console.log("MOBILE overflowX:", await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2));

await browser.close();
