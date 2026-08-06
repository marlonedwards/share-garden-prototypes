// Does a gate choice that implies "do not invest this month" actually change
// anything once the payday mode is automatic?
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("http://localhost:4329/#/orb/s/payday");
await wait(1000);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
for (let i = 0; i < 6; i++) {
  await page.locator("button[aria-label^='Flip the card'], button[aria-label^='Scouting report']").first().click();
  await wait(420);
}
await page.getByRole("button", { name: "Start earning" }).click();
await wait(300);
await page.getByRole("button", { name: "Pause", exact: true }).click({ force: true }).catch(() => {});
await wait(500);
const rail = page.locator("div.max-w-xs");
await rail.getByText("The Everything Store", { exact: true }).first().click({ force: true });
await wait(300);
await rail.getByRole("button", { name: /^Buy \$\d+$/ }).first().click({ force: true });
await wait(400);
await page.getByRole("button", { name: "Play", exact: true }).click({ force: true }).catch(() => {});
// payday prompt: choose automatic
await page.getByText("Invest it into your colors in their current mix, or keep it as cash.").waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "Invest, and do this automatically" }).click({ force: true });
await wait(400);
// gate 1: choose the option that means "stop investing for now"
await page.getByText("Read more:").waitFor({ timeout: 30000 });
await wait(400);
const before = await page.evaluate(() => document.body.innerText.match(/Cash\n\$[\d,.]+/)?.[0]);
console.log("at gate, cash line:", before);
await page.getByRole("button", { name: "Pause until things calm down" }).click({ force: true });
await wait(300);
await page.getByRole("button", { name: "1×", exact: true }).click({ force: true }).catch(() => {});
await wait(4000);
await page.getByRole("button", { name: "Pause", exact: true }).click({ force: true }).catch(() => {});
await wait(600);
const after = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    month: t.match(/[A-Z][a-z]{2} \d{4}/)?.[0],
    cash: t.match(/Cash\s+\$[\d,.]+/)?.[0],
    shares: t.match(/([\d.]+) shares/)?.[0],
    paydayCardVisible: /Your payday of/.test(t),
  };
});
console.log("after choosing 'Pause until things calm down':", JSON.stringify(after));
await page.screenshot({ path: OUT + "payday-gatefx-after-pause.png" });
await browser.close();
