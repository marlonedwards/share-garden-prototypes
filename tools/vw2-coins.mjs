// throwaway adversarial verification of W2 lesson "coins"
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4326";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const V = [];
const bad = (s) => { V.push(s); console.log("  VIOLATION: " + s); };

const browser = await chromium.launch();

async function runViewport(label, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => bad(`${label} PAGEERROR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") bad(`${label} CONSOLE ${m.text()}`); });

  await page.goto(`${BASE}/#/orb/learn/coins`);
  await page.evaluate(() => localStorage.removeItem("field-guide"));
  await page.reload();
  await wait(700);

  const defs = [];
  for (let s = 0; s < 12; s++) {
    const stepTxt = await page.locator("main span.tnum").first().innerText().catch(() => "?");
    const def = await page.locator("main > div:not(.hidden) p.text-\\[19px\\]").first().innerText().catch(() => "");
    const story = await page.locator("main > div:not(.hidden) p.text-\\[14px\\]").first().innerText().catch(() => "");
    const cards = await page.locator("main > div:not(.hidden) .bg-white").count();
    const cont = page.locator("main > div:not(.hidden)").locator("button", { hasText: /^(Continue|Finish)$/ }).first();
    if (await cont.count() === 0) { bad(`${label} step ${s}: no Continue/Finish`); break; }
    const disabledBefore = await cont.isDisabled();
    const m = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth, ih: window.innerHeight,
    }));
    const cbox = await cont.boundingBox();
    const contBottom = cbox ? cbox.y + cbox.height : 99999;
    console.log(`  ${label} ${stepTxt} cards=${cards} disabled=${disabledBefore} sh=${m.sh}/${m.ih} contBottom=${Math.round(contBottom)}`);
    defs.push(def.trim());

    if (cards > 1) bad(`${label} ${stepTxt}: ${cards} cards visible at once`);
    if (cards === 0) bad(`${label} ${stepTxt}: zero cards (reading-only screen)`);
    if (m.sw > m.iw + 1) bad(`${label} ${stepTxt}: horizontal overflow ${m.sw}>${m.iw}`);
    if (contBottom > m.ih) bad(`${label} ${stepTxt}: Continue below the fold (bottom ${Math.round(contBottom)} > ${m.ih})`);
    if (m.sh > m.ih + 2) bad(`${label} ${stepTxt}: page scrolls vertically (${m.sh} > ${m.ih})`);
    if (!def) bad(`${label} ${stepTxt}: no definition`);
    else if (!/[.!?]$/.test(def.trim())) bad(`${label} ${stepTxt}: definition not a full sentence: "${def}"`);
    if (!story) bad(`${label} ${stepTxt}: no story paragraph`);

    await page.screenshot({ path: `${OUT}vw2-coins-${label}-${String(s).padStart(2, "0")}.png` });

    if (disabledBefore) {
      // sliders first
      const ranges = page.locator("main > div:not(.hidden) input[type=range]");
      for (let i = 0; i < await ranges.count(); i++) {
        await ranges.nth(i).fill(await ranges.nth(i).getAttribute("max") ?? "10");
        await wait(150);
      }
      // check screens: click the correct option by its text
      const CORRECT = [
        "How big the bet was next to everything else you have",
        "Deposits from the newest customers",
      ];
      for (const t of CORRECT) {
        const b = page.locator("main > div:not(.hidden) .bg-white button", { hasText: t });
        if (await b.count() > 0 && await b.first().isEnabled()) { await b.first().click(); await wait(250); }
      }
      if (await cont.isDisabled()) {
        for (let round = 0; round < 6 && await cont.isDisabled(); round++) {
          const btns = page.locator("main > div:not(.hidden) .bg-white button");
          const n = await btns.count();
          for (let i = 0; i < n; i++) {
            const b = btns.nth(i);
            if (await b.isVisible() && await b.isEnabled()) { await b.click(); await wait(180); }
            if (!(await cont.isDisabled())) break;
          }
        }
      }
      if (await cont.isDisabled()) { bad(`${label} ${stepTxt}: could not unlock Continue via the stage`); break; }
      const c2 = await page.locator("main > div:not(.hidden) .bg-white").count();
      if (c2 > 1) bad(`${label} ${stepTxt}: ${c2} cards after interacting`);
      const m2 = await page.evaluate(() => ({
        sh: document.documentElement.scrollHeight, ih: window.innerHeight,
        sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      }));
      const cb2 = await cont.boundingBox();
      if (cb2 && cb2.y + cb2.height > m2.ih) bad(`${label} ${stepTxt}: Continue below fold after interacting (${Math.round(cb2.y + cb2.height)} > ${m2.ih})`);
      if (m2.sh > m2.ih + 2) bad(`${label} ${stepTxt}: scrolls after interacting (${m2.sh} > ${m2.ih})`);
      if (m2.sw > m2.iw + 1) bad(`${label} ${stepTxt}: horizontal overflow after interacting`);
      await page.screenshot({ path: `${OUT}vw2-coins-${label}-${String(s).padStart(2, "0")}b.png` });
    }

    const isFinish = (await cont.innerText()).trim() === "Finish";
    await cont.click();
    await wait(400);
    if (isFinish) {
      console.log(`  ${label} finished, url=${page.url()}`);
      break;
    }
  }

  // duplicate definitions?
  const seen = new Map();
  for (const d of defs) {
    if (!d) continue;
    seen.set(d, (seen.get(d) ?? 0) + 1);
  }
  for (const [d, n] of seen) if (n > 1) bad(`${label}: definition repeated verbatim ${n}x: "${d}"`);
  console.log(`  ${label} screens walked: ${defs.length}`);

  const guide = await page.evaluate(() => localStorage.getItem("field-guide"));
  console.log(`  ${label} field-guide after run: ${guide}`);
  const g = JSON.parse(guide ?? "{}");
  for (const c of ["position-size", "ponzi"]) {
    if (!(g.cleared ?? []).includes(c)) bad(`${label}: marble "${c}" not cleared after answering correctly`);
  }
  const runs = await page.evaluate(() => localStorage.getItem("beta-checks"));
  console.log(`  ${label} beta-checks: ${runs}`);

  await page.close();
  return defs;
}

console.log("=== 1280x720");
const defsDesk = await runViewport("desk", 1280, 720);
console.log("=== 390x844");
await runViewport("phone", 390, 844);

// ---- state across back/forward on the phone viewport
console.log("=== back/forward state");
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => bad(`state PAGEERROR ${e.message}`));
  await page.goto(`${BASE}/#/orb/learn/coins`);
  await page.evaluate(() => localStorage.removeItem("field-guide"));
  await page.reload();
  await wait(700);
  const cur = () => page.locator("main > div:not(.hidden)");
  const cont = () => cur().locator("button", { hasText: /^(Continue|Finish)$/ }).first();

  // screen 1: open both tabs
  await cur().locator(".bg-white button").nth(0).click(); await wait(150);
  await cur().locator(".bg-white button").nth(1).click(); await wait(150);
  const s1text = await cur().locator(".bg-white p").first().innerText();
  await cont().click(); await wait(350);

  // screen 2: slider
  await cur().locator("input[type=range]").fill("11"); await wait(250);
  const s2month = await cur().locator(".bg-white span.tnum").first().innerText();
  await cont().click(); await wait(350);

  // screen 3: pick middle bet
  await cur().locator(".bg-white button").nth(1).click(); await wait(250);
  const s3text = await cur().locator(".bg-white p").nth(1).innerText();

  // go back twice then forward twice
  await page.keyboard.press("ArrowLeft"); await wait(300);
  await page.keyboard.press("ArrowLeft"); await wait(300);
  const s1back = await cur().locator(".bg-white p").first().innerText();
  if (s1back !== s1text) bad(`back/forward: screen 1 stage state lost ("${s1back.slice(0, 40)}" vs "${s1text.slice(0, 40)}")`);
  if (await cont().isDisabled()) bad("back/forward: screen 1 Continue re-locked after returning");
  await page.screenshot({ path: `${OUT}vw2-coins-back-s1.png` });
  await page.keyboard.press("ArrowRight"); await wait(300);
  const s2back = await cur().locator(".bg-white span.tnum").first().innerText();
  if (s2back !== s2month) bad(`back/forward: screen 2 slider reset (${s2back} vs ${s2month})`);
  if (await cont().isDisabled()) bad("back/forward: screen 2 Continue re-locked");
  await page.keyboard.press("ArrowRight"); await wait(300);
  const s3back = await cur().locator(".bg-white p").nth(1).innerText();
  if (!s3back.includes("$625")) bad(`back/forward: screen 3 bet result lost: "${s3back.slice(0, 60)}"`);
  if (await cont().isDisabled()) bad("back/forward: screen 3 Continue re-locked");
  await page.screenshot({ path: `${OUT}vw2-coins-back-s3.png` });

  // wrong answer on the first check, then back and forward: no clean retry
  await cont().click(); await wait(350);
  await cur().locator(".bg-white button").nth(0).click(); await wait(250); // wrong option
  await page.screenshot({ path: `${OUT}vw2-coins-check-wrong.png` });
  const gA = JSON.parse(await page.evaluate(() => localStorage.getItem("field-guide")) ?? "{}");
  if (!(gA.cloudy ?? []).includes("position-size")) bad("wrong answer did not leave the position-size marble cloudy");
  await page.keyboard.press("ArrowLeft"); await wait(300);
  await page.keyboard.press("ArrowRight"); await wait(300);
  const retryEnabled = await cur().locator(".bg-white button").nth(1).isEnabled();
  if (retryEnabled) bad("check screen offers a clean retry after stepping back and forward");
  await browserPageEnd(page);
}

async function browserPageEnd(p) { await p.close(); }

await browser.close();
console.log("\n==== VIOLATIONS: " + V.length);
for (const v of V) console.log(" - " + v);
