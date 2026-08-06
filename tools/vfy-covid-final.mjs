// Throwaway adversarial verification of the covid era. Port 4333.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4333";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const shot = async (n, full = false) => page.screenshot({ path: OUT + `covid-${n}.png`, fullPage: full });

// scroll height check: the page body must not scroll horizontally
const overflow = async () => page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  clientH: document.documentElement.clientHeight,
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));

// ---------- select screen ----------
await page.goto(`${BASE}/#/orb`);
await wait(900);
await shot("00-select", true);
const cards = await page.locator("a[href*='#/orb/']").allInnerTexts();
console.log("SELECT ORDER:", cards.map((t) => t.split("\n").slice(0, 2).join(" | ")).join("  //  "));

// ---------- briefing ----------
await page.goto(`${BASE}/#/orb/brief/covid`);
await wait(700);
await shot("01-brief", true);
console.log("BRIEF overflow:", JSON.stringify(await overflow()));

// ---------- scenario brief + scouting ----------
await page.goto(`${BASE}/#/orb/s/covid`);
await wait(900);
await shot("02-scenario-brief");
console.log("scout button:", await page.getByRole("button", { name: "Scout the menu" }).count());
console.log("start btn before scouting:", await page.getByText("Start in 2019").count());
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
await shot("03-scout-front");
// flip via the card itself, walking with the next arrow
for (let i = 0; i < 8; i++) {
  const card = page.locator("button[aria-label^='Flip the card']");
  if (await card.count()) { await card.first().click(); await wait(250); }
  if (i === 0) await shot("04-scout-back");
  const nxt = page.locator("button[aria-label='next card']");
  if (await nxt.count()) { await nxt.click(); await wait(220); }
}
await wait(300);
await shot("05-scout-done");
console.log("all scouted text:", await page.getByText("Every card is scouted.").count());
console.log("start btn after scouting:", await page.getByText("Start in 2019").count());
await page.getByText("Start in 2019").click();
await wait(800);

// ---------- gate 1 ----------
await shot("06-gate-jan2019");
console.log("gate1 present:", await page.getByText("January 2019 ·").count());
console.log("gate1 overflow:", JSON.stringify(await overflow()));
// count visible white cards on the gate screen
const cardCount = async () => page.evaluate(() => {
  const els = [...document.querySelectorAll("div")].filter((d) => {
    const c = d.className;
    if (typeof c !== "string") return false;
    if (!/bg-white/.test(c) || !/rounded/.test(c)) return false;
    const r = d.getBoundingClientRect();
    return r.width > 200 && r.height > 80;
  });
  return els.map((d) => d.getBoundingClientRect().width + "x" + Math.round(d.getBoundingClientRect().height));
});
console.log("gate1 big white cards:", JSON.stringify(await cardCount()));
await page.getByRole("button", { name: "Put the money to work" }).click();
await wait(600);
await shot("07-after-gate1");
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);

// ---------- unlisted assets ----------
const rail = await page.locator("body").innerText();
console.log("has 'lists Apr 2019':", rail.includes("lists Apr 2019"), "| has 'lists Sep 2019':", rail.includes("lists Sep 2019"));
await shot("08-rail");
// try to open the video call company and buy
const vc = page.getByRole("button", { name: "The Video Call Company" });
console.log("video call btn count:", await vc.count());
if (await vc.count()) {
  await vc.first().click();
  await wait(300);
  await shot("09-unlisted-open");
  const body = await page.locator("body").innerText();
  console.log("buy buttons while unlisted:", await page.getByRole("button", { name: /^Buy \$/ }).count());
  console.log("unlisted panel says:", body.split("\n").filter((l) => /list/i.test(l)).join(" ~ "));
}
// buy two listed names
for (const nm of ["Fruit Computers", "The Everything Store"]) {
  await page.getByRole("button", { name: nm }).first().click();
  await wait(250);
  const b = page.getByRole("button", { name: "Buy $250" });
  if (await b.count()) { await b.last().click(); await wait(400); }
  else console.log("NO Buy $250 for", nm);
}
await shot("10-bought");
await page.getByText("4×", { exact: true }).click();

// ---------- remaining gates ----------
for (const [title, answer, tag] of [
  ["March 2020 ·", "Hold and look away", "mar2020"],
  ["January 2021 ·", "Watch from the side", "jan2021"],
  ["November 2021 ·", "Change nothing", "nov2021"],
  ["October 2022 ·", "Hold what I own", "oct2022"],
]) {
  let found = 0;
  for (let i = 0; i < 40; i++) { await wait(700); found = await page.getByText(title).count(); if (found) break; }
  console.log("gate", title, "present:", found);
  await shot(`11-gate-${tag}`);
  console.log(`  ${tag} big white cards:`, JSON.stringify(await cardCount()));
  await page.getByRole("button", { name: answer }).click();
  await wait(400);
  await page.getByText("4×", { exact: true }).click();
}

// ---------- end ----------
let end = 0;
for (let i = 0; i < 60; i++) { await wait(700); end = await page.getByText("You finished with").count(); if (end) break; }
console.log("end screen:", end);
await shot("12-end", true);
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await shot("13-debrief2", true);
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await shot("14-debrief3", true);
const qc = page.getByRole("button", { name: "Quick check" });
console.log("quick check button:", await qc.count());
if (await qc.count()) { await qc.click(); await wait(600); }
await shot("15-check-1");
console.log("check1 overflow:", JSON.stringify(await overflow()));
for (let q = 0; q < 12; q++) {
  const n = await page.getByText(/^\d of \d$/).count();
  if (!n) break;
  const label = await page.getByText(/^\d of \d$/).first().innerText();
  const buttons = page.locator("button.text-left");
  const cnt = await buttons.count();
  console.log("  item", label, "options:", cnt);
  await buttons.nth(0).click();
  await wait(400);
  if (q === 0) await shot("16-check-answered");
  const nx = page.getByRole("button", { name: /Next|See results/ });
  if (!(await nx.count())) { console.log("  NO next button"); break; }
  await nx.click();
  await wait(400);
}
await shot("17-check-results", true);
console.log("results:", (await page.locator("body").innerText()).slice(0, 600).replace(/\n+/g, " / "));
await browser.close();
