// Throwaway verifier walk: play the payday era end to end on port 4329.
import { chromium } from "playwright";
import fs from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text()); });

const shot = async (n) => { await page.screenshot({ path: OUT + n + ".png" }); console.log("shot", n); };
const cardCount = async () => page.locator("div.rounded-2xl.border.shadow-xl, div.rounded-2xl.bg-white.shadow-sm").count();

await page.goto("http://localhost:4329/#/orb/s/payday");
await wait(1200);
await shot("payday-01-brief");
console.log("brief card count:", await cardCount());
console.log("page scrollable:", await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));

await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
await shot("payday-02-scout-front");
console.log("scout card count:", await cardCount(),
  "scrollable:", await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));
for (let i = 0; i < 6; i++) {
  await page.locator("button[aria-label^='Flip the card'], button[aria-label^='Scouting report']").first().click();
  await wait(520);
  if (i === 0) await shot("payday-03-scout-report");
  if (i === 5) await shot("payday-03b-scout-last");
}
await wait(400);
console.log("scouted label:", await page.locator("text=/Every card is scouted|Scouted \\d of \\d/").first().innerText());
await shot("payday-04-scout-done");
const startBtn = page.getByRole("button", { name: "Start earning" });
console.log("start enabled:", await startBtn.isEnabled());
await startBtn.click();
await wait(300);

// pause immediately and buy a first color so the payday beat engages
await page.getByRole("button", { name: "Pause", exact: true }).click({ force: true }).catch((e) => console.log("pause fail", e.message));
await wait(600);
const rail = page.locator("div.max-w-xs");
await rail.getByText("The Everything Store", { exact: true }).first().click({ force: true });
await wait(400);
await shot("payday-04b-rail-open");
console.log("rail buttons:", JSON.stringify(await rail.locator("button").allInnerTexts()));
await rail.getByRole("button", { name: /^Buy \$\d+$/ }).first().click({ force: true });
await wait(600);
console.log("run card count (paused, rail visible):", await cardCount());
await shot("payday-05-after-buy");

// run the tape, answering every gate and payday prompt
const seenGates = [];
let paydays = 0;
let guard = 0;
while (guard++ < 500) {
  if (await page.getByText("December 2007. You never guessed once.").count()) break;
  if (await page.getByText("Read more:").count()) {
    const title = await page.locator("div.text-\\[15px\\].font-semibold").first().innerText().catch(() => "?");
    seenGates.push(title);
    console.log("GATE", seenGates.length, JSON.stringify(title));
    console.log("   cards on screen:", await cardCount(),
      "scrollable:", await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));
    const ctx = await page.locator("div.text-sm.leading-relaxed p").allInnerTexts();
    console.log("   context:", JSON.stringify(ctx));
    const opts = await page.locator("div.text-sm.leading-relaxed button").allInnerTexts();
    console.log("   options:", JSON.stringify(opts));
    await shot("payday-gate-" + seenGates.length);
    await page.locator("div.text-sm.leading-relaxed button").first().click({ force: true });
    await wait(500);
    await page.getByRole("button", { name: "Play", exact: true }).click({ force: true, timeout: 1500 }).catch(() => {});
    await page.getByRole("button", { name: "4×", exact: true }).click({ force: true, timeout: 1500 }).catch(() => {});
    await wait(300);
    continue;
  }
  if (await page.getByText("Invest it into your colors in their current mix, or keep it as cash.").count()) {
    paydays++;
    if (paydays === 1) {
      console.log("PAYDAY prompt cards:", await cardCount());
      await shot("payday-06-payday-prompt");
    }
    await page.getByRole("button", { name: "Invest, and do this automatically" }).click({ force: true });
    await wait(400);
    await page.getByRole("button", { name: "4×", exact: true }).click({ force: true, timeout: 1500 }).catch(() => {});
    continue;
  }
  await page.getByRole("button", { name: "4×", exact: true }).click({ force: true, timeout: 1200 }).catch(() => {});
  await wait(500);
}
console.log("gates seen:", seenGates.length, seenGates, "payday prompts:", paydays);
await wait(1400);
console.log("end card count:", await cardCount());
await shot("payday-07-debrief");
await page.getByRole("button", { name: "Quick check" }).click({ force: true });
await wait(700);
console.log("quiz card count:", await cardCount());
for (let q = 0; q < 9; q++) {
  const counter = await page.locator("text=/^\\d+ of \\d+$/").first().innerText().catch(() => "");
  const prompt = await page.locator("div.text-\\[13\\.5px\\].font-medium").first().innerText().catch(() => "");
  console.log("quiz", counter, "|", prompt.slice(0, 130));
  const opts = page.locator("button.text-left.text-\\[13px\\]");
  const n = await opts.count();
  if (!n) break;
  console.log("   options:", JSON.stringify(await opts.allInnerTexts()));
  await opts.nth(q % n).click({ force: true });
  await wait(400);
  const explain = await page.locator("p.text-\\[12\\.5px\\]").last().innerText().catch(() => "");
  console.log("   explain:", explain.slice(0, 160));
  await shot("payday-quiz-" + (q + 1));
  const next = page.getByRole("button", { name: /^(Next|See results)$/ });
  if (!(await next.count())) break;
  const label = await next.first().innerText();
  await next.first().click({ force: true });
  await wait(500);
  if (label === "See results") break;
}
await wait(400);
await shot("payday-09-quiz-results");
// the briefing page
await page.goto("http://localhost:4329/#/orb/brief/payday");
await wait(900);
await shot("payday-10-briefing-top");
await page.evaluate(() => window.scrollTo(0, 1400));
await wait(500);
await shot("payday-11-briefing-mid");
await page.evaluate(() => window.scrollTo(0, 99999));
await wait(500);
await shot("payday-12-briefing-end");
await browser.close();
