import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const gates = ["Wait in cash for the recession", "Hold and look away", "Watch from the side", "Change nothing", "Hold what I own"];
await page.goto("http://localhost:4333/#/orb/s/covid");
await wait(900);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(300);
for (let i = 0; i < 8; i++) {
  const c = page.locator("button[aria-label^='Flip the card']");
  if (await c.count()) { await c.first().click(); await wait(200); }
  const n = page.locator("button[aria-label='next card']");
  if (await n.count()) { await n.click(); await wait(180); }
}
await page.getByText("Start in 2019").click();
await wait(500);
const heads = {
  mar2020: "Wall Street Suffers Worst Rout Since Black Monday",
  aug2020: "S&P 500 Closes At New Record High",
  nov2020: "Pfizer's covid vaccine",
  jan2021: "Dumb Money",
  jan2022: "Peloton to halt production",
  jan2024: "S&P 500 closes at record high for first time in two years",
};
const seen = {};
for (let i = 0; i < 1500; i++) {
  const t = await page.locator("body").innerText();
  for (const [k, h] of Object.entries(heads)) {
    if (!seen[k] && t.includes(h)) {
      seen[k] = (t.match(/\b[A-Z][a-z]{2} \d{4}\b/) || [""])[0];
      await page.screenshot({ path: OUT + `covid-clip-${k}.png` });
    }
  }
  let gated = false;
  for (const opt of gates) {
    const b = page.getByRole("button", { name: opt });
    if (await b.count()) { await b.click().catch(() => {}); gated = true; break; }
  }
  if (!gated) {
    const play = page.getByRole("button", { name: "Play" });
    if (await play.count()) await play.click().catch(() => {});
  }
  if (t.includes("You finished with")) break;
  await wait(120);
}
console.log("clippings seen:", JSON.stringify(seen, null, 1));
for (const k of Object.keys(heads)) if (!seen[k]) console.log("MISSING clipping:", k);
await browser.close();
