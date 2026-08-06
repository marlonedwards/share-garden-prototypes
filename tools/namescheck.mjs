import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// dotcom scenario: start, buy, flip real names on
await page.goto("http://localhost:4318/#/orb/s/dotcom");
await wait(1200);
await scout(page);
await page.getByText("Start in 2000").click();
await wait(600);
// the era opens straight onto its first gate; answer it to reach the tape
await page.getByRole("button", { name: "Spread across everything" }).click();
await wait(500);
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);
// scope to buttons: the scrolling ticker repeats the same names in spans that
// never hold still, so getByText would wait on a moving target forever
await page.getByRole("button", { name: "The Everything Store" }).first().click();
await wait(250);
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(400);
await page.getByRole("button", { name: "Real names" }).click();
await wait(500);
await page.screenshot({ path: OUT + "names-era-on.png" });
console.log("shot names-era-on; Amazon visible:", await page.getByText("Amazon").count());

// freeplay 2008: toggle should appear only in real modes
await page.goto("http://localhost:4318/#/orb/free");
await wait(800);
console.log("toy mode toggle count (want 0):", await page.getByRole("button", { name: "Real names" }).count());
await page.getByRole("button", { name: "2008", exact: true }).click();
await wait(600);
await page.getByRole("button", { name: "Real names" }).click();
await wait(400);
await page.screenshot({ path: OUT + "names-free-on.png" });
console.log("shot names-free-on; Citigroup visible:", await page.getByText("Citigroup").count());

await browser.close();
