// Third adversarial pass: corrupt storage, hostile input, keyboard, print
// wrapper. Run: node tools/vfy-ready-adv3.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

const put = async (v) => {
  await page.goto(`${BASE}/#/orb`);
  await page.evaluate((s) => localStorage.setItem("orb-ready-plan", s), v);
  await page.goto(`${BASE}/#/orb/ready`);
  await wait(700);
  return (await page.locator("main").innerText()).split("\n")[0];
};

console.log("garbage json ->", await put("not json at all"));
console.log("null path ->", await put(JSON.stringify({ path: "nope", lines: [] })));
console.log("lines not array ->", await put(JSON.stringify({ path: "first", lines: 5 })));
console.log("negative dollars ->", await put(JSON.stringify({ path: "first", lines: [{ key: "a", assetId: "voo", dollars: -400 }] })));
console.log("  main text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 260));
console.log("unknown assetId ->", await put(JSON.stringify({ path: "own", lines: [{ key: "a", assetId: "zzz", dollars: 100 }] })));
console.log("  main text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 260));
console.log("40 lines ->", await put(JSON.stringify({ path: "first", lines: Array.from({ length: 40 }, (_, i) => ({ key: "k" + i, assetId: "voo", dollars: 10 })) })));
console.log("  number inputs after cap:", await page.locator('input[type="number"]').count());
console.log("NaN dollars ->", await put(JSON.stringify({ path: "first", lines: [{ key: "a", assetId: "voo", dollars: "lots" }] })));

// hostile custom label (script-ish text)
await page.evaluate(() => localStorage.removeItem("orb-ready-plan"));
await page.goto(`${BASE}/#/orb/ready`);
await wait(600);
await page.getByText("I'm planning my first orb").click();
await wait(400);
await page.locator('input[placeholder="What is it called?"]').fill("<img src=x onerror=alert(1)>");
await page.locator('button:has-text("Add")').last().click();
await wait(300);
const chip = await page.locator("main").innerText();
console.log("hostile label rendered as text:", chip.includes("<img src=x onerror=alert(1)>"));

// enter key adds a custom
await page.locator('input[placeholder="What is it called?"]').fill("Enter key line");
await page.locator('input[placeholder="What is it called?"]').press("Enter");
await wait(300);
console.log("enter-key add worked:", (await page.locator("main").innerText()).includes("Enter key line"));
await page.screenshot({ path: OUT + "adv3-hostile.png", fullPage: true });

// huge dollars
await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
const n0 = page.locator('input[type="number"]').first();
await n0.fill("999999999999");
await wait(300);
console.log("huge dollars total line:", (await page.locator("main").innerText()).split("\n").filter((s) => s.startsWith("$"))[0]);
await page.screenshot({ path: OUT + "adv3-huge.png", fullPage: true });
await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
await page.screenshot({ path: OUT + "adv3-huge-mirror.png", fullPage: true });
console.log("huge mirror:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 700));

await browser.close();
