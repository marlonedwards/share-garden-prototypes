// throwaway adversarial verification of W1 (stepped LessonShell + routing)
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4321";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });

const V = [];
const bad = (s) => { V.push(s); console.log("  VIOLATION: " + s); };

async function cards() {
  return page.locator("main .bg-white").count();
}
async function metrics() {
  return page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth, ih: window.innerHeight,
  }));
}

const IDS = ["cash", "savings", "stocks", "funds", "coins"];

for (const id of IDS) {
  console.log("\n===== " + id);
  await page.goto(`${BASE}/#/orb/learn/${id}`);
  await wait(600);
  for (let s = 0; s < 12; s++) {
    const stepTxt = await page.locator("main span.tnum").first().innerText().catch(() => "?");
    const def = await page.locator("main p.text-\\[19px\\]").innerText().catch(() => "");
    const nCards = await cards();
    const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ });
    if (await cont.count() === 0) { bad(`${id} step ${s}: no Continue/Finish button`); break; }
    const disabledBefore = await cont.isDisabled();
    const m = await metrics();
    console.log(`  ${stepTxt} | cards=${nCards} | contDisabled=${disabledBefore} | sh=${m.sh} | def="${def.slice(0,55)}"`);
    if (nCards > 1) bad(`${id} ${stepTxt}: ${nCards} cards visible at once`);
    if (nCards === 0) bad(`${id} ${stepTxt}: zero interactive cards (reading-only screen)`);
    if (m.sh > m.ih + 2) bad(`${id} ${stepTxt}: page scrolls vertically (${m.sh} > ${m.ih})`);
    if (m.sw > m.iw + 1) bad(`${id} ${stepTxt}: horizontal overflow`);
    if (!def.trim()) bad(`${id} ${stepTxt}: no definition sentence`);
    else if (!/[.!?]$/.test(def.trim())) bad(`${id} ${stepTxt}: definition is not a full sentence: "${def}"`);
    await page.screenshot({ path: `${OUT}vw1-${id}-${String(s).padStart(2,"0")}.png` });

    // try to satisfy the gate through the stage's own affordances
    if (disabledBefore) {
      const ranges = page.locator("main input[type=range]");
      for (let i = 0; i < await ranges.count(); i++) {
        await ranges.nth(i).fill(await ranges.nth(i).getAttribute("max") ?? "10");
        await wait(120);
      }
      if (await cont.isDisabled()) {
        const btns = page.locator("main .bg-white button");
        const n = await btns.count();
        for (let i = 0; i < n; i++) {
          const b = btns.nth(i);
          if (await b.isVisible() && await b.isEnabled()) { await b.click(); await wait(160); }
          if (!(await cont.isDisabled())) break;
        }
      }
      if (await cont.isDisabled()) { bad(`${id} ${stepTxt}: could not unlock Continue by using the stage`); break; }
      const nc2 = await cards();
      if (nc2 > 1) bad(`${id} ${stepTxt}: ${nc2} cards after interacting`);
      const m2 = await metrics();
      if (m2.sh > m2.ih + 2) bad(`${id} ${stepTxt}: page scrolls after interacting (${m2.sh})`);
      await page.screenshot({ path: `${OUT}vw1-${id}-${String(s).padStart(2,"0")}b.png` });
    }
    const isFinish = (await cont.innerText()).trim() === "Finish";
    await cont.click();
    await wait(450);
    if (isFinish) {
      const url = page.url();
      console.log("  finished ->", url);
      if (!url.endsWith("#/orb")) bad(`${id}: Finish did not return to /orb (got ${url})`);
      break;
    }
  }
}

// ---- legacy routes
console.log("\n===== legacy routing");
for (const [from, want] of [["/#/orb/mini/share","#/orb/learn/stocks"],["/#/orb/mini/fund","#/orb/learn/funds"],["/#/orb/mini/coin","#/orb/learn/coins"],["/#/orb/mini/cash","#/orb/learn/cash"],["/#/orb/learn/nonsense","#/orb/learn/cash"],["/#/orb/mini","#/orb/learn/cash"],["/#/orb/learn","#/orb/learn/cash"]]) {
  await page.goto(BASE + from);
  await wait(500);
  const u = page.url();
  console.log(`  ${from} -> ${u}`);
  if (!u.includes(want)) bad(`legacy route ${from} did not land on ${want} (got ${u})`);
}

// ---- keyboard
console.log("\n===== keyboard");
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(500);
await page.keyboard.press("ArrowRight");
await wait(300);
let t = await page.locator("main span.tnum").first().innerText();
console.log("  right arrow on gated step 1 ->", t);
if (!/Step 1 of/.test(t)) bad("right arrow advanced past a gated screen without interaction");
await page.getByRole("button", { name: /Buy 1 share/ }).click();
await wait(200);
await page.keyboard.press("ArrowRight");
await wait(350);
t = await page.locator("main span.tnum").first().innerText();
console.log("  right arrow after interaction ->", t);
if (!/Step 2 of/.test(t)) bad("right arrow did not advance after the stage was used");
await page.keyboard.press("ArrowLeft");
await wait(300);
t = await page.locator("main span.tnum").first().innerText();
console.log("  left arrow ->", t);
if (!/Step 1 of/.test(t)) bad("left arrow did not go back one step");
// back arrow button
await page.getByRole("button", { name: /Back to scenarios/ }).click();
await wait(400);
console.log("  header back at step 1 ->", page.url());
if (!page.url().endsWith("#/orb")) bad("header back at step 1 did not return to /orb");

// ---- ladder strip
console.log("\n===== ladder strip");
await page.goto(`${BASE}/#/orb`);
await wait(600);
const strip = await page.locator("a[href*='#/orb/learn/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
console.log("  strip order:", strip.join(", "));
const want = ["#/orb/learn/cash","#/orb/learn/savings","#/orb/learn/stocks","#/orb/learn/funds","#/orb/learn/coins"];
if (JSON.stringify(strip) !== JSON.stringify(want)) bad("Start-here strip is not in ladder order: " + strip.join(","));
await page.screenshot({ path: OUT + "vw1-select-before.png", fullPage: true });

// clear cash marble and re-check the indicator
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/cash`);
await wait(500);
for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /Count/ }).click(); await wait(150); }
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
await page.locator("main input[type=range]").fill("8"); await wait(200);
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
await page.getByRole("button", { name: "The loud risk" }).click(); await wait(150);
await page.getByRole("button", { name: "The quiet risk" }).click(); await wait(150);
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
const opts = page.locator("main .bg-white button");
console.log("  check options:", await opts.count());
await opts.nth(1).click(); await wait(300);
await page.screenshot({ path: OUT + "vw1-cash-check-answered.png" });
const cardsAfter = await cards();
if (cardsAfter > 1) bad("check screen shows more than one card after answering");
const fg = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("  field-guide:", fg);
if (!/cleared":\["inflation"\]|cleared":\[.*inflation/.test(fg ?? "")) bad("correct check answer did not clear the inflation marble");
await page.getByRole("button", { name: "Finish" }).click(); await wait(600);
console.log("  after finish url:", page.url());
const rows = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log("  beta-checks:", rows);
await page.screenshot({ path: OUT + "vw1-select-after.png", fullPage: true });

// re-entering a finished lesson restarts at step 1
await page.goto(`${BASE}/#/orb/learn/cash`); await wait(500);
t = await page.locator("main span.tnum").first().innerText();
console.log("  re-entry step:", t);

console.log("\nPAGE ERRORS:", errs.length ? errs.join("\n") : "none");
console.log("VIOLATIONS:", V.length);
V.forEach((v) => console.log(" - " + v));
await browser.close();
