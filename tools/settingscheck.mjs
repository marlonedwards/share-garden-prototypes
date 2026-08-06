import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;


await page.goto("http://localhost:4318/#/orb/s/gfc");
await wait(1000);
await scout(page);
await page.getByText("Start in 2007").click();
await wait(800);
console.log("ticker on by default:", await page.getByText(/▲|▼/).count() > 0);

// open settings, toggle both off
await page.getByRole("button", { name: "Settings" }).click();
await wait(400);
await page.screenshot({ path: OUT + "settings-open.png" });
await page.getByText("Live ticker").click();
await wait(300);
await page.getByText("Headline clippings").click();
await wait(300);
console.log("ticker gone after toggle:", (await page.getByText(/▲|▼/).count()) === 0);
const stored = await page.evaluate(() => localStorage.getItem("orb-settings"));
console.log("persisted:", stored);

// reload: settings should hold
await page.reload();
await wait(1000);
await scout(page);
await page.getByText("Start in 2007").click();
await wait(800);
console.log("ticker still off after reload:", (await page.getByText(/▲|▼/).count()) === 0);

await browser.close();
