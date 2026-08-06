// Finale smoke: build a plan, save it, confirm the marble lands on /orb.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(`${BASE}/#/orb/ready`);
await wait(800);
await page.screenshot({ path: OUT + "ready-door.png", fullPage: true });
console.log("=== DOOR ===\n" + (await page.locator("body").innerText()));

const first = page.locator("button:visible").first();
await first.click();
await wait(700);
await page.screenshot({ path: OUT + "ready-path1.png", fullPage: true });
console.log("=== PATH ===\n" + (await page.locator("body").innerText()).slice(0, 2500));

// add three lines, size them, and walk the remaining steps
const adds = page.locator("button:visible", { hasText: /^Add$/ });
console.log("add buttons:", await adds.count());
for (const i of [0, 5, 16]) {
  const b = adds.nth(i);
  if (await b.count()) { await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click().catch((e) => console.log("add fail", i, e.message)); await wait(350); }
}
await page.screenshot({ path: OUT + "ready-added.png", fullPage: true });
const nums = page.locator('input[type="number"]:visible, input[inputmode="numeric"]:visible');
const nn = await nums.count();
console.log("dollar inputs:", nn);
for (let i = 0; i < nn; i++) { await nums.nth(i).fill(String(300 + i * 100)).catch(() => {}); await wait(200); }
await page.screenshot({ path: OUT + "ready-sized.png", fullPage: true });
for (let s = 0; s < 4; s++) {
  const nx = page.getByRole("button", { name: /Next|Continue|See|Read|Finish|Save/ }).first();
  if (!(await nx.count()) || !(await nx.isEnabled())) break;
  console.log("advance:", (await nx.innerText()).trim());
  await nx.click();
  await wait(700);
  await page.screenshot({ path: OUT + `ready-step${s + 2}.png`, fullPage: true });
}
console.log("=== FINAL ===\n" + (await page.locator("body").innerText()).slice(0, 3000));
console.log("ready-plan store:", await page.evaluate(() => localStorage.getItem("ready-plan") ?? Object.keys(localStorage).join(",")));
await page.goto(`${BASE}/#/orb`);
await wait(900);
await page.screenshot({ path: OUT + "select-with-plan.png" });
console.log("plan marble on select:", (await page.locator("body").innerText()).includes("Your plan") || (await page.locator("body").innerText()).includes("What you hold"));
await browser.close();
