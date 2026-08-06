// throwaway adversarial verification pass 2: play the covid era at 1x and
// record (month label -> visible headline) pairs, gate screens, ticker notes,
// pre-listing buy refusal, end debrief and quiz layout.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const B = "http://localhost:4333";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

await page.goto(`${B}/#/orb/s/covid`);
await wait(1000);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(300);
for (let i = 1; i <= 12; i++) {
  const c = page.locator(`button[aria-label="card ${i}"]`);
  if (await c.count()) { await c.click(); await wait(60); }
}
await page.getByText("Start in 2019").click();
await wait(700);

// ---- gate 1 ----
await page.screenshot({ path: OUT + "covid-x-gate-jan2019.png" });
const cards = await page.locator("div.rounded-2xl, div.rounded-3xl").count();
console.log("gate1 text:\n", (await page.locator("body").innerText()));
await page.getByRole("button", { name: "Put the money to work" }).click();
await wait(500);
await page.screenshot({ path: OUT + "covid-x-gate1-after.png" });

// try buying the not-yet-listed video call company
const zm = page.getByRole("button", { name: "The Video Call Company" }).first();
console.log("ZM row present in rail:", await zm.count());
if (await zm.count()) {
  await zm.click();
  await wait(300);
  await page.screenshot({ path: OUT + "covid-x-prelisting-row.png" });
  console.log("ZM row area text:\n", (await page.locator("body").innerText()).slice(-1800));
}

// buy something real
await page.getByRole("button", { name: "Fruit Computers" }).first().click();
await wait(250);
if (await page.getByRole("button", { name: "Buy $250" }).count()) {
  await page.getByRole("button", { name: "Buy $250" }).last().click();
  await wait(300);
}

// ---- ride the tape at 1x, sampling the month label and headline ----
if (await page.getByRole("button", { name: "Play" }).count()) await page.getByRole("button", { name: "Play" }).click();
await page.getByText("1×", { exact: true }).click();
const seen = new Map();
const gateAnswers = {
  "March 2020": "Hold and look away",
  "January 2021": "Watch from the side",
  "November 2021": "Change nothing",
  "October 2022": "Hold what I own",
};
const shots = { "Jan 2021": 1, "Feb 2021": 1, "Mar 2021": 1, "Nov 2020": 1, "Dec 2020": 1 };
for (let i = 0; i < 900; i++) {
  await wait(120);
  const body = await page.locator("body").innerText();
  const mm = body.match(/\n(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (20\d\d)\n/);
  const month = mm ? `${mm[1]} ${mm[2]}` : "?";
  // headline card: source line then date then headline
  const clip = await page.locator('div[style*="rgba(255,255,255,0.97)"]').first();
  let head = "";
  if (await clip.count()) head = (await clip.innerText()).replace(/\n/g, " | ");
  if (head && !seen.has(month + head)) {
    seen.set(month + head, true);
    console.log(`TAPE ${month}  ::  ${head}`);
    if (shots[month]) { await page.screenshot({ path: OUT + `covid-x-clip-${month.replace(" ", "")}.png` }); shots[month] = 0; }
  }
  for (const [title, ans] of Object.entries(gateAnswers)) {
    if (body.includes(title + " ·")) {
      await page.screenshot({ path: OUT + `covid-x-gate-${title.replace(" ", "")}.png` });
      console.log(`\n===== GATE ${title} =====\n${body}\n=====\n`);
      await page.getByRole("button", { name: ans }).click();
      await wait(400);
      if (await page.getByText("1×", { exact: true }).count()) await page.getByText("1×", { exact: true }).click();
      delete gateAnswers[title];
    }
  }
  if (body.includes("You finished with")) break;
}
console.log("reached end:", (await page.locator("body").innerText()).includes("You finished with"));
await page.screenshot({ path: OUT + "covid-x-end.png" });
console.log("END:\n", (await page.locator("body").innerText()));
await browser.close();
