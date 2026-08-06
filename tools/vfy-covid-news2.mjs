import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const gates = ["Wait in cash for the recession", "Hold and look away", "Watch from the side", "Change nothing", "Hold what I own"];
const clearGate = async () => {
  for (const opt of gates) {
    const b = page.getByRole("button", { name: opt });
    if (await b.count()) { await b.click(); await wait(250); return true; }
  }
  return false;
};
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
const month = () => page.locator("body").innerText().then((t) => (t.match(/\b[A-Z][a-z]{2} \d{4}\b/) || [""])[0]);
const targets = [
  ["Mar 2020", "Wall Street Suffers Worst Rout Since Black Monday", "mar2020"],
  ["Aug 2020", "S&P 500 Closes At New Record High", "aug2020"],
  ["Nov 2020", "Pfizer's covid vaccine", "nov2020"],
  ["Jan 2021", "Dumb Money", "jan2021"],
  ["Jan 2022", "Peloton to halt production", "jan2022"],
  ["Jan 2024", "S&P 500 closes at record high for first time in two years", "jan2024"],
];
for (const [m, head, tag] of targets) {
  for (let i = 0; i < 400; i++) {
    const cur = await month();
    if (cur === m) break;
    if (await clearGate()) continue;
    // step forward one month at 1x by toggling play briefly
    const play = page.getByRole("button", { name: "Play" });
    if (await play.count()) await play.click();
    const one = page.getByText("1×", { exact: true });
    if (await one.count()) await one.click();
    await wait(120);
  }
  // pause on arrival, then clear the gate so the news area is visible
  const p = page.getByRole("button", { name: "Pause" });
  if (await p.count()) await p.click();
  await clearGate();
  await wait(300);
  const body = await page.locator("body").innerText();
  console.log((await month()).padEnd(9), "| want", m, "| headline:", body.includes(head));
  await page.screenshot({ path: OUT + `covid-news2-${tag}.png` });
}
await browser.close();
