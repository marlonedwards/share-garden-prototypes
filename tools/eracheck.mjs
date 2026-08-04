import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/orb");
await wait(1000);
await page.screenshot({ path: OUT + "select.png" });
console.log("shot select");

await page.goto("http://localhost:4318/#/orb/era");
await wait(1200);
await page.screenshot({ path: OUT + "era-brief.png" });
await page.getByText("Start in 2000").click();
await wait(600);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
// buy three colors
for (const [name, amt] of [["The Everything Store", "Buy $250"], ["Router Works", "Buy $250"], ["Classic Cola", "Buy $100"]]) {
  await page.getByText(name).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(700);
}
await page.screenshot({ path: OUT + "era-1998.png" });
console.log("shot era-1998");
await page.getByText("4×", { exact: true }).click();
await wait(24000);
await page.screenshot({ path: OUT + "era-end.png" });
console.log("shot era-end");
await browser.close();
