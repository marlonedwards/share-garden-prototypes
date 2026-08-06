import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
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
await wait(600);
await page.getByRole("button", { name: "Wait in cash for the recession" }).click();
await wait(400);
await page.getByText("4×", { exact: true }).click();
const want = [
  ["Mar 2020", "Wall Street Suffers Worst Rout Since Black Monday", "news-mar2020"],
  ["Aug 2020", "S&P 500 Closes At New Record High", "news-aug2020"],
  ["Nov 2020", "Pfizer's covid vaccine is more than 90 percent effective", "news-nov2020"],
  ["Jan 2021", "'Dumb Money' Is on GameStop", "news-jan2021"],
  ["Jan 2022", "Peloton to halt production", "news-jan2022"],
  ["Jan 2024", "S&P 500 closes at record high for first time in two years", "news-jan2024"],
];
for (const [month, head, tag] of want) {
  for (let i = 0; i < 200; i++) {
    await wait(200);
    const hdr = await page.locator("header, body").first().innerText();
    if (hdr.includes(month)) break;
  }
  const body = await page.locator("body").innerText();
  console.log(month, "| headline present:", body.includes(head.slice(0, 30)));
  await page.screenshot({ path: OUT + `covid-${tag}.png` });
  // clear any gate that is blocking the tape
  for (const opt of ["Hold and look away", "Watch from the side", "Change nothing", "Hold what I own"]) {
    const b = page.getByRole("button", { name: opt });
    if (await b.count()) { await b.click(); await wait(300); await page.getByText("4×", { exact: true }).click(); }
  }
}
await browser.close();
