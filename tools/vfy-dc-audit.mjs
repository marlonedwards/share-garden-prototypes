// Throwaway verifier: play the dot-com era end to end at 1280x800.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const B = "http://localhost:4332";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text()); });

const shot = async (n) => { await page.screenshot({ path: OUT + n + ".png" }); console.log("shot", n); };
const overflow = async (label) => {
  const r = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
    cards: document.querySelectorAll("main .rounded-2xl.bg-white, main .rounded-3xl.bg-white").length,
  }));
  console.log(`LAYOUT ${label}: scrollH=${r.sh} innerH=${r.ih} overflow=${r.sh - r.ih}`);
};

// 1. briefing page
await page.goto(B + "/#/orb/brief/dotcom");
await wait(1200);
await shot("dc-brief-top");
await page.evaluate(() => window.scrollTo(0, 1400));
await wait(400);
await shot("dc-brief-mid");
await page.evaluate(() => window.scrollTo(0, 99999));
await wait(400);
await shot("dc-brief-end");

// 2. the era
await page.goto(B + "/#/orb/s/dotcom");
await wait(1400);
await shot("dc-01-brief");
await overflow("brief-read");
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
await shot("dc-02-scout-front");
await overflow("scout");

// flip through all cards; count from the "Scouted N of M" label
const total = 10;
for (let i = 0; i < total; i++) {
  const label = await page.locator("text=/Scouted \\d+ of \\d+|Every card is scouted/").first().innerText();
  console.log("deck:", label);
  if (i === 0) { await page.locator('button[aria-label^="Flip the card"]').click(); await wait(700); await shot("dc-03-scout-back"); }
  else { await page.locator('button[aria-label^="Scouting report"], button[aria-label^="Flip the card"]').first().click(); await wait(450); }
}
await wait(400);
const deckState = await page.locator("text=/Scouted \\d+ of \\d+|Every card is scouted/").first().innerText();
console.log("deck final:", deckState);
await shot("dc-04-scout-done");
await overflow("scout-done");

const startBtn = page.getByRole("button", { name: "Start in 2000" });
console.log("start enabled:", await startBtn.isEnabled());
await startBtn.click();
await wait(600);
await shot("dc-05-run");

// 3. drive to each gate
const gateTitles = ["February 2000", "April 2000", "September 2001", "June 2002", "October 2002"];
for (let g = 0; g < gateTitles.length; g++) {
  await page.locator(`text=${gateTitles[g]}`).first().waitFor({ timeout: 90000 });
  await wait(600);
  await shot(`dc-gate-${g + 1}`);
  await overflow(`gate-${g + 1}`);
  const card = page.locator("main").locator("div").filter({ hasText: gateTitles[g] }).last();
  const txt = await page.evaluate(() => {
    const el = [...document.querySelectorAll("main *")].find((e) => e.className && String(e.className).includes("pop-in"));
    return el ? el.innerText : "(no card)";
  });
  console.log(`--- GATE ${g + 1} TEXT ---\n${txt}\n`);
  const btns = await page.locator("main button").allInnerTexts();
  console.log("buttons:", JSON.stringify(btns.filter((b) => b && b.length < 60)));
  // choose the middle-ish non-act option where possible; just take last option
  const opts = ["Spread across everything", "Hold what I have", "Hold and stick to the plan", "Spread the rest across more companies", "Hold what I have"];
  await page.getByRole("button", { name: opts[g], exact: true }).click();
  await wait(400);
  // gates that pause for a move need Play pressed again
  const playBtn = page.getByRole("button", { name: "Play", exact: true });
  if (await playBtn.count()) { await playBtn.first().click(); }
  const x4 = page.getByRole("button", { name: "4×", exact: true });
  if (await x4.count()) await x4.first().click();
  await wait(300);
}

// 4. run to the end
await page.locator("text=December 2007").first().waitFor({ timeout: 180000 });
await wait(1500);
await shot("dc-06-debrief");
await overflow("debrief");

// 5. quiz
const quizBtn = page.getByRole("button", { name: /quick check|check|Take the/i });
const names = await page.locator("main button").allInnerTexts();
console.log("debrief buttons:", JSON.stringify(names.filter((b) => b && b.length < 70)));
await browser.close();
