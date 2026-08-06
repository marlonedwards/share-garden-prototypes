// End-to-end: finish the savings lesson, then confirm the field guide marble
// and the select-screen Start-here strip both register it.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

const cont = () => page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
const step = async (label) => {
  console.log(label, "continue enabled:", await cont().isEnabled());
  await cont().click();
  await wait(500);
};
const dragRange = async () => {
  const r = page.locator('input[type="range"]:visible').first();
  const max = await r.getAttribute("max");
  for (const v of [3, 8, Number(max)]) {
    await r.evaluate((el, val) => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(el, String(val));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
    await wait(200);
  }
};

await page.goto(`${BASE}/#/orb/learn/savings`);
await wait(700);
await page.getByRole("button", { name: /Wait one year/ }).click();
await wait(400); await step("s1");
await dragRange(); await step("s2");
for (const t of ["Years 1 to 10", "Years 11 to 20", "Years 21 to 30"]) {
  await page.getByText(t).last().click(); await wait(250);
}
await step("s3");
await dragRange(); await step("s4");
for (const t of ["The jar", "The savings account", "The market"]) {
  await page.locator("button:visible", { hasText: new RegExp("^" + t + "$") }).first().click(); await wait(300);
}
await step("s5");
await page.locator("button:visible", { hasText: /^Compounding$/ }).first().click();
await wait(400);
await page.screenshot({ path: OUT + "savings-check1.png" });
await step("s6");
await page.locator("button:visible", { hasText: /buying power shrank/ }).first().click();
await wait(400);
await page.screenshot({ path: OUT + "savings-check2.png" });
console.log("final button:", await page.getByRole("button", { name: /^(Continue|Finish)$/ }).innerText());
await cont().click();
await wait(800);
console.log("after finish, url:", page.url());
await page.screenshot({ path: OUT + "savings-after-finish.png", fullPage: true });
console.log("beta-checks:", await page.evaluate(() => localStorage.getItem("beta-checks")));
console.log("field guide store:", await page.evaluate(() => localStorage.getItem("field-guide")));

await page.goto(`${BASE}/#/orb`);
await wait(900);
const strip = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find((d) => d.innerText?.startsWith("Start here: the basics"));
  return el ? el.innerText : "STRIP NOT FOUND";
});
console.log("=== STRIP ===\n" + strip);
await page.screenshot({ path: OUT + "select-after-savings.png" });
await page.goto(`${BASE}/#/orb/guide`);
await wait(900);
await page.screenshot({ path: OUT + "guide-after-savings.png", fullPage: true });
console.log("=== GUIDE ===\n" + (await page.locator("body").innerText()).slice(0, 1500));
await browser.close();
