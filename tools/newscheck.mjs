import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// gfc: ride to the Lehman clipping at step 20
await page.goto("http://localhost:4318/#/orb/s/gfc");
await wait(1000);
await page.getByText("Start in 2007").click();
await wait(600);
console.log("ticker visible:", await page.locator("div[style*='sg-ticker'], div[class*='whitespace-nowrap']").count() > 0);
await page.getByText("2×", { exact: true }).click();
for (let i = 0; i < 30; i++) {
  await wait(500);
  if (await page.getByText("September 2008.").count()) break;
}
await page.getByRole("button", { name: "Hold and ride it out" }).click();
for (let i = 0; i < 10; i++) {
  await wait(400);
  if (await page.getByText("After Frantic Day").count()) break;
}
const lehman = await page.getByText("After Frantic Day, Wall St. Banks Falter").count();
console.log("Lehman clipping:", lehman);
await page.screenshot({ path: OUT + "news-lehman.png" });

await browser.close();
