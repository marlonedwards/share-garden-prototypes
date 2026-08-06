import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/orb/free");
await wait(1000);
await page.screenshot({ path: OUT + "free-toy.png" });
console.log("shot free-toy");

// switch to the 2008 era
await page.getByRole("button", { name: "2008", exact: true }).click();
await wait(800);

// buy two real names, then run the tape fast
for (const [name, amt] of [["Mega Bank", "Buy $250"], ["Everything Mart", "Buy $250"]]) {
  await page.getByText(name).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(400);
}
await page.getByText("4×", { exact: true }).click();
await wait(6000);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.screenshot({ path: OUT + "free-gfc-run.png" });
console.log("shot free-gfc-run");

await page.getByText("Finish").click();
await wait(800);
await page.screenshot({ path: OUT + "free-gfc-finish.png" });
console.log("shot free-gfc-finish");

// crypto mode sanity: month label + prices render
await page.getByRole("button", { name: "Crypto", exact: true }).click();
await wait(800);
await page.screenshot({ path: OUT + "free-crypto.png" });
console.log("shot free-crypto");

await browser.close();
