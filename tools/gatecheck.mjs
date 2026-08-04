// Walk the tutorial live through the new acknowledgment gates + capture fluid styles.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/orb/tutorial");
await wait(1000);
await page.getByRole("button", { name: "Next", exact: true }).click();
await wait(300);
await page.getByRole("button", { name: "Next", exact: true }).click();
await wait(300);
await page.getByText("Nova Systems").first().click();
await wait(250);
await page.getByText("$500", { exact: true }).click();
await page.getByText("Pour it in").click();
await wait(1200);
await page.getByText("Bitrix").first().click();
await wait(250);
await page.getByText("$250", { exact: true }).click();
await page.getByText("Pour it in").click();
await wait(1200);
await page.getByRole("button", { name: "Let the market run" }).click();
await wait(500);
await page.screenshot({ path: OUT + "gate-meet.png" });
console.log("shot gate-meet");
await page.getByRole("button", { name: "Start time" }).click();
// wait for the warn gate (day 44 at 2x ~ 14s)
await page.getByText("Prices are slipping.").waitFor({ timeout: 40000 });
await wait(400);
await page.screenshot({ path: OUT + "gate-warn.png" });
console.log("shot gate-warn");
await page.getByRole("button", { name: "Okay" }).click();
// crash card at day 55 at 1x ~ 7s
await page.getByText("What do you do?").waitFor({ timeout: 30000 });
await wait(500);
// open a trade row to see the sparkline during the crash
await page.getByText("Nova Systems").last().click();
await wait(400);
await page.screenshot({ path: OUT + "gate-crash-spark.png" });
console.log("shot gate-crash-spark");
await browser.close();
