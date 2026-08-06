import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

// --- cash step 6 sorted correctly, then finish the lesson
await page.goto(`${BASE}/#/orb/learn/cash`);
await wait(700);
const contBtn = () => page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
// walk to the sort screen using the generic poker
for (let g = 0; g < 10; g++) {
  const body = await page.locator("body").innerText();
  if (body.includes("Tap a home for each note.")) break;
  if (!(await contBtn().isEnabled())) {
    const o = page.locator("button.text-left:visible");
    const no = await o.count();
    if (no) { for (let i = 0; i < no; i++) { try { await o.nth(i).click({ timeout: 1000 }); } catch { } await wait(250); if (await contBtn().isEnabled()) break; } }
    const sl = page.locator("input[type=range]:visible");
    if (!(await contBtn().isEnabled()) && await sl.count()) {
      const el = sl.first(); await el.focus();
      for (let i = 0; i < 40 && !(await contBtn().isEnabled()); i++) { await el.press("ArrowRight"); await wait(40); }
    }
    const bs = page.locator("main button:visible");
    const nb = await bs.count();
    for (let i = 0; i < nb && !(await contBtn().isEnabled()); i++) {
      const t = (await bs.nth(i).innerText()).trim();
      if (/^(Continue|Finish)$/.test(t)) continue;
      for (let k = 0; k < 6 && !(await contBtn().isEnabled()); k++) { try { await bs.nth(i).click({ timeout: 1000 }); } catch { break; } await wait(220); }
    }
  }
  if (!(await contBtn().isEnabled())) { console.log("stuck before sort"); break; }
  await contBtn().click();
  await wait(450);
}
console.log("reached sort screen:", (await page.locator("body").innerText()).includes("Tap a home for each note."));
const rows = page.locator("main .flex.flex-wrap.items-center");
for (const [i, label] of [[0, "The jar"], [1, "The jar"], [2, "Somewhere it can earn"]]) {
  await rows.nth(i).getByRole("button", { name: label, exact: true }).click();
  await wait(250);
}
await page.screenshot({ path: OUT + "cash-sort-solved.png" });
const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
console.log("continue enabled after correct sort:", await cont.isEnabled());
await cont.click();
await wait(500);
console.log("now:", (await page.locator("body").innerText()).match(/Step \d of \d/)?.[0]);
// final screen: answer the check
const opts = page.locator("button.text-left:visible");
if (await opts.count()) { await opts.first().click(); await wait(400); }
await page.screenshot({ path: OUT + "cash-final-check.png" });
const fin = page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
console.log("finish label/enabled:", await fin.innerText(), await fin.isEnabled());
await fin.click();
await wait(700);
console.log("after finish url:", page.url().split("#")[1]);

// --- the finale
await page.goto(`${BASE}/#/orb/ready`);
await wait(700);
await page.getByRole("button", { name: /Path one/ }).click();
await wait(700);
await page.screenshot({ path: OUT + "ready-path1.png", fullPage: true });
let body = await page.locator("body").innerText();
console.log("\nREADY path1 first 700 chars:\n", body.slice(0, 700));
// try adding assets
const addable = page.locator("main button:visible");
const n = await addable.count();
const names = [];
for (let i = 0; i < Math.min(n, 30); i++) names.push((await addable.nth(i).innerText()).replace(/\n/g, " | ").slice(0, 60));
console.log("\nbuttons:", JSON.stringify(names, null, 0));
await browser.close();
