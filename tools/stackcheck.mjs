import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/stack");
await wait(900);
await page.getByRole("button", { name: "Start in 2007" }).click();
await wait(500);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);

// buy the doomed Old Bank plus two survivors: 3 tokens spent
for (const nm of ["The Old Bank", "Everything Mart", "The Everything Store"]) {
  const row = page.locator("div", { hasText: nm }).locator("button", { hasText: "Buy" }).last();
  await row.click();
  await wait(250);
}
const tokensLeft = await page.locator("span[style*='rgb(0, 113, 227)'][class*='w-3.5']").count();
console.log("tokens spent (want 2 left):", tokensLeft);
await page.screenshot({ path: OUT + "stack-bought.png" });
await page.getByRole("button", { name: "Play", exact: true }).click();

// ride the whole tape (108 months at ~310ms/step)
for (let i = 0; i < 50; i++) {
  await wait(1000);
  if (await page.getByText("December 2015.").count()) break;
}
console.log("end card:", await page.getByText("December 2015.").count());
console.log("stars shown:", await page.locator("div", { hasText: /★/ }).count() > 0);
await page.screenshot({ path: OUT + "stack-end.png" });

await browser.close();
