// throwaway pass 3: record which headline clipping is visible in which month.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const B = "http://localhost:4333";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(`${B}/#/orb/s/covid`);
await wait(900);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(250);
for (let i = 1; i <= 12; i++) {
  const c = page.locator(`button[aria-label="card ${i}"]`);
  if (await c.count()) { await c.click(); await wait(50); }
}
await page.getByText("Start in 2019").click();
await wait(600);
await page.getByRole("button", { name: "Wait in cash for the recession" }).click();
await wait(400);

const gates = {
  "March 2020 ·": "Hold and look away",
  "January 2021 ·": "Watch from the side",
  "November 2021 ·": "Change nothing",
  "October 2022 ·": "Hold what I own",
};
const sample = async () => {
  return await page.evaluate(() => {
    const monthEl = [...document.querySelectorAll("header span")].map((e) => e.textContent).find((t) => /^[A-Z][a-z]{2} 20\d\d$/.test(t || ""));
    const serif = [...document.querySelectorAll("div")].find((d) => (d.getAttribute("style") || "").includes("Georgia"));
    let clip = null;
    if (serif) {
      const card = serif.closest("div.absolute");
      clip = card ? card.innerText.replace(/\n/g, " | ") : serif.innerText;
    }
    return { month: monthEl || "?", clip, body: document.body.innerText };
  });
};
const shot = { "Nov 2020": 1, "Jan 2021": 1, "Feb 2021": 1, "Jan 2022": 1, "Jan 2024": 1, "Mar 2020": 1, "Aug 2020": 1 };
let last = "";
for (let i = 0; i < 1200; i++) {
  await wait(100);
  const { month, clip, body } = await sample();
  const key = month + "|" + (clip || "");
  if (key !== last) {
    last = key;
    if (clip) console.log(`TAPE ${month} :: ${clip}`);
  }
  if (clip && shot[month]) { await page.screenshot({ path: OUT + `covid-x-clip-${month.replace(" ", "")}.png` }); shot[month] = 0; }
  for (const [t, a] of Object.entries(gates)) {
    if (body.includes(t)) {
      await page.getByRole("button", { name: a }).click();
      await wait(350);
      if (await page.getByText("4×", { exact: true }).count()) await page.getByText("4×", { exact: true }).click();
      delete gates[t];
    }
  }
  if (body.includes("You finished with")) break;
}
console.log("done");
await browser.close();
