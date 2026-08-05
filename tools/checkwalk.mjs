import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// crypto is the fastest era (84 steps): start, answer gates, buy the doomed
// Promise Coin era-start, panic-sell mid-winter, reach the end, take the check
await page.goto("http://localhost:4318/#/orb/s/crypto");
await wait(1000);
await page.getByText("Start in 2018").click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.getByText("Coin Alpha").first().click();
await wait(250);
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(400);
await page.getByText("4×", { exact: true }).click();

// ride to gate 1 (step 46, ~7s at 4x)
for (let i = 0; i < 20; i++) { await wait(1000); if (await page.getByText("November 2021.").count()) break; }
console.log("gate 1:", await page.getByText("November 2021.").count());
await page.getByRole("button", { name: "Change nothing" }).click();
await wait(300);
// sell half during winter two approach, then gate 2
await page.getByText("4×", { exact: true }).click();
for (let i = 0; i < 20; i++) { await wait(1000); if (await page.getByText("November 2022.").count()) break; }
console.log("gate 2:", await page.getByText("November 2022.").count());
await page.getByRole("button", { name: "Sell what's left" }).click();
await wait(300);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.getByText("Coin Alpha").first().click();
await wait(300);
await page.getByRole("button", { name: "Sell half" }).click();
await wait(400);
await page.getByText("4×", { exact: true }).click();

// run to end + quick check
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("Quick check").count()) break; }
console.log("quick check present:", await page.getByText("Quick check").count());
await page.screenshot({ path: OUT + "check-start.png", fullPage: true });

// answer all items (pick the second option every time, then Next)
for (let q = 0; q < 6; q++) {
  const counts = await page.getByText(/^\d of \d$/).count();
  if (!counts) break;
  const buttons = page.locator("button.text-left.text-\\[13px\\]");
  await buttons.nth(1).click();
  await wait(500);
  const next = page.getByRole("button", { name: /Next|See results/ });
  await next.click();
  await wait(500);
}
console.log("results score visible:", await page.getByText(/\d \/ \d/).count());
console.log("crossroads timing line:", await page.getByText("Crossroads answers took").count());
await page.screenshot({ path: OUT + "check-results.png", fullPage: true });
const stored = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log("localStorage beta-checks:", stored ? stored.slice(0, 300) : "EMPTY");

await browser.close();
