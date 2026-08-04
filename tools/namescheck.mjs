import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// dotcom scenario: start, buy, flip real names on
await page.goto("http://localhost:4318/#/orb/s/dotcom");
await wait(1200);
await page.getByText("Start in 2000").click();
await wait(600);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.getByText("The Everything Store").first().click();
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
