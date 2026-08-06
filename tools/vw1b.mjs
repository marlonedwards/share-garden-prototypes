import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4321";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const V = [];
const bad = (s) => { V.push(s); console.log("  VIOLATION: " + s); };

// ---- mobile sweep, every screen of every lesson
for (const vp of [{ w: 390, h: 844, tag: "mob" }, { w: 1280, h: 720, tag: "short" }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  page.on("pageerror", (e) => bad("PAGEERROR " + e.message));
  console.log(`\n===== ${vp.tag} ${vp.w}x${vp.h}`);
  for (const id of ["cash", "savings", "stocks", "funds", "coins"]) {
    await page.goto(`${BASE}/#/orb/learn/${id}`); await wait(600);
    for (let s = 0; s < 12; s++) {
      const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ });
      if (await cont.count() === 0) break;
      // interact
      const ranges = page.locator("main input[type=range]");
      for (let i = 0; i < await ranges.count(); i++) { await ranges.nth(i).fill(await ranges.nth(i).getAttribute("max") ?? "10"); await wait(100); }
      let guard = 0;
      while (await cont.isDisabled() && guard++ < 10) {
        const btns = page.locator("main .bg-white button");
        const n = await btns.count();
        let clicked = false;
        for (let i = 0; i < n; i++) {
          const b = btns.nth(i);
          if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); clicked = true; await wait(140); }
          if (!(await cont.isDisabled())) break;
        }
        if (!clicked) break;
      }
      const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight }));
      const step = await page.locator("main span.tnum").first().innerText().catch(() => "?");
      const nCards = await page.locator("main .bg-white").count();
      const flag = [];
      if (m.sw > m.iw + 1) { flag.push("H-OVERFLOW"); bad(`${vp.tag} ${id} ${step}: horizontal overflow ${m.sw}>${m.iw}`); }
      if (m.sh > m.ih + 2) { flag.push("V-SCROLL"); bad(`${vp.tag} ${id} ${step}: vertical scroll ${m.sh}>${m.ih}`); }
      if (nCards > 1) bad(`${vp.tag} ${id} ${step}: ${nCards} cards`);
      console.log(`  ${id} ${step} cards=${nCards} sh=${m.sh}/${m.ih} sw=${m.sw}/${m.iw} ${flag.join(" ")}`);
      if (flag.length) await page.screenshot({ path: `${OUT}vw1-${vp.tag}-${id}-${s}.png`, fullPage: true });
      if (await cont.isDisabled()) { bad(`${vp.tag} ${id} ${step}: continue never unlocked`); break; }
      const fin = (await cont.innerText()).trim() === "Finish";
      await cont.click(); await wait(400);
      if (fin) break;
    }
  }
  await page.close();
}

// ---- state across back/forward and wrong-answer path
console.log("\n===== state");
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/coins`); await wait(600);
await page.getByRole("button", { name: "A share" }).click(); await wait(150);
await page.getByRole("button", { name: "A coin" }).click(); await wait(150);
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
await page.getByRole("button", { name: "$500" }).click(); await wait(200);
// go back, then forward: gate must stay open, no re-lock
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
let d = await page.getByRole("button", { name: "Continue" }).isDisabled();
console.log("  back to step1, continue disabled:", d);
if (d) bad("returning to a completed stage re-locks Continue");
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
d = await page.getByRole("button", { name: "Continue" }).isDisabled();
console.log("  forward to step2, continue disabled:", d);
if (d) bad("re-entering a completed stage re-locks Continue");
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
// wrong answer on the check
const opts = page.locator("main .bg-white button");
await opts.nth(0).click(); await wait(300);
await page.screenshot({ path: OUT + "vw1-coins-wrong.png" });
let fg = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("  after wrong answer:", fg);
if (!/cloudy":\[.*position-size/.test(fg ?? "")) bad("wrong answer did not leave the marble cloudy");
// retry protection
const stillEnabled = await opts.nth(1).isEnabled();
console.log("  other option still clickable:", stillEnabled);
if (stillEnabled) bad("a wrong answer can be retried for free");
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
await page.getByRole("button", { name: "Continue" }).click(); await wait(300);
const revealed = await page.locator("text=Position size is the one thing you fully control").count();
console.log("  explain still revealed after back+forward:", revealed);
if (revealed === 0) bad("stepping back and forward resets the answered check (free retry)");
await page.getByRole("button", { name: "Finish" }).click(); await wait(500);
const rows = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log("  beta-checks:", rows);
fg = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("  field-guide:", fg);
await page.goto(`${BASE}/#/orb`); await wait(500);
await page.screenshot({ path: OUT + "vw1-select-cloudy.png", fullPage: true });

console.log("\nVIOLATIONS:", V.length);
V.forEach((v) => console.log(" - " + v));
await browser.close();
