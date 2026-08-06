// throwaway verifier: inflation era, stage C (mobile width, real-names toggle, ready smoke)
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const B = "http://localhost:4334";

const p1 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p1.on("pageerror", (e) => console.log("PAGEERROR(mobile):", e.message));
await p1.goto(`${B}/#/orb/s/inflation`);
await wait(1200);
await p1.screenshot({ path: OUT + "c1-mobile-brief.png", fullPage: true });
await p1.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
await p1.screenshot({ path: OUT + "c2-mobile-scout.png", fullPage: true });
console.log("mobile hscroll:", await p1.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));

const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
p2.on("pageerror", (e) => console.log("PAGEERROR(names):", e.message));
await p2.goto(`${B}/#/orb/s/inflation`);
await wait(1000);
await p2.getByRole("button", { name: "Real names" }).click();
await wait(400);
await p2.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
await p2.screenshot({ path: OUT + "c3-realnames.png" });
console.log("real name Apple visible:", await p2.getByText("Apple").count(), "iShares:", await p2.getByText(/iShares/).count());

const p3 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
p3.on("pageerror", (e) => console.log("PAGEERROR(ready):", e.message));
await p3.goto(`${B}/#/orb/ready`);
await wait(1200);
await p3.screenshot({ path: OUT + "c4-ready.png" });
console.log("ready loaded:", await p3.locator("body").innerText().then((t) => t.slice(0, 120).replace(/\n/g, " | ")));
await browser.close();
