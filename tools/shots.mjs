import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

async function shot(name) {
  await page.screenshot({ path: OUT + name + ".png", fullPage: true });
  console.log("shot", name);
}

// Landing
await page.goto(BASE + "/");
await wait(800);
await shot("landing");

// Pulse main (running, with holdings)
await page.goto(BASE + "/pulse");
await wait(600);
async function buyIn(sym) {
  await page.getByText(sym, { exact: false }).first().click();
  await wait(300);
  try { await page.getByText("+$250").click(); } catch {}
  await wait(150);
  await page.keyboard.press("Escape");
  await wait(250);
}
for (const s of ["NOVA", "VOLT", "CANE"]) await buyIn(s);
await page.getByLabel("play").first().click();
await wait(5000);
await shot("pulse");

// Pulse trade sheet
await page.goto(BASE + "/pulse");
await wait(500);
await page.getByText("NOVA", { exact: false }).first().click();
await wait(400);
try { await page.getByText("+$250").click(); await page.getByText("+$250").click(); } catch {}
await wait(300);
await shot("pulse-trade");

// Flows
await page.goto(BASE + "/flows");
await wait(700);
const routes = page.getByText("route in");
try { await routes.nth(0).click(); await routes.nth(2).click(); await routes.nth(6).click(); } catch (e) { console.log("flows click:", e.message); }
await page.getByLabel("play").first().click();
await wait(5000);
await shot("flows");

// Garden
await page.goto(BASE + "/garden");
await wait(700);
for (const crop of ["Tomatoes", "Corn", "Carrots", "Pumpkins", "Berries", "Garlic", "co-op"]) {
  try { await page.getByText(crop, { exact: false }).first().click({ timeout: 1500 }); await wait(200); } catch (e) { console.log("garden click", crop, e.message); }
}
await page.getByLabel("play").first().click();
await wait(6500);
await shot("garden");

await browser.close();
console.log("DONE -> " + OUT);
