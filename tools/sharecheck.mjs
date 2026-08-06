import { chromium } from "playwright";
import { wait, scout, rideGates, waitForEnd, DOTCOM_GATES } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
await page.goto("http://localhost:4318/#/orb/era");
await wait(1200);
await scout(page);
await page.getByText("Start in 2000").click();
await wait(400);
// the era opens straight onto its first gate; answer it to reach the tape
await page.getByRole("button", { name: "Spread across everything" }).click();
await wait(500);
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
for (const [name, amt] of [["The Everything Store", "Buy $250"], ["Router Works", "Buy $250"], ["Classic Cola", "Buy $100"]]) {
  // scope to buttons: the scrolling ticker repeats the same names in spans
  await page.getByRole("button", { name }).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(500);
}
await page.getByText("4×", { exact: true }).click();
// the first gate is already answered above; ride the four that remain
await rideGates(page, DOTCOM_GATES.slice(1));
console.log("reached end card:", await waitForEnd(page));
await page.screenshot({ path: OUT + "era-end.png" });
// the end card is stepped: score, then rewind, then the lessons screen that
// carries "Save your orb"
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
const dl = page.waitForEvent("download");
await page.getByRole("button", { name: "Save your orb" }).click();
const d = await dl;
await d.saveAs(OUT + "share-card.png");
console.log("saved share card");
await browser.close();
