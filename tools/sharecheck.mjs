import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
await page.goto("http://localhost:4318/#/orb/era");
await wait(1200);
await page.getByText("Start in 2000").click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
for (const [name, amt] of [["The Everything Store", "Buy $250"], ["Router Works", "Buy $250"], ["Classic Cola", "Buy $100"]]) {
  await page.getByText(name).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(500);
}
await page.getByText("4×", { exact: true }).click();
await wait(24000);
await page.screenshot({ path: OUT + "era-end.png" });
const dl = page.waitForEvent("download");
await page.getByText("Save your orb").click();
const d = await dl;
await d.saveAs(OUT + "share-card.png");
console.log("saved share card");
await browser.close();
