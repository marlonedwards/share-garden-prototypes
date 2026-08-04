// Screenshots of every Orb tutorial beat for the visual review gate.
// Usage: node tools/orbshots.mjs  (dev server on :4318)
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#";
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

async function beat(name, settle = 1800) {
  await page.goto("about:blank");
  await page.goto(`${BASE}/orb/tutorial?beat=${name}`);
  await wait(settle);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", name);
}

await beat("intro");
await beat("shop");

// live infuse: pick a company, pour, capture the pour mid-flight
await page.goto("about:blank");
await page.goto(`${BASE}/orb/tutorial?beat=shop`);
await wait(800);
await page.getByText("Nova Systems").click();
await wait(300);
await page.getByText("$500", { exact: true }).click();
await wait(200);
await page.getByText("Pour it in").click();
await wait(420);
await page.screenshot({ path: `${OUT}pour.png` });
console.log("shot pour");
await wait(1600);
await page.screenshot({ path: `${OUT}infused.png` });
console.log("shot infused");

await beat("mid");
await beat("crash", 2600);
await beat("end", 2200);
await beat("endsold", 2200);

await browser.close();
