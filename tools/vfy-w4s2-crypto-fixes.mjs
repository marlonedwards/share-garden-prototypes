// Throwaway verifier for the crypto-era fix pass: deck noun, gate 3 option,
// gate 4 multiplier, gate 5 hindsight, curly quotes, FTX abstraction, and the
// paused-for-move scroll. Port 4331.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4331";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
const body = async () => await p.evaluate(() => document.body.innerText);
const fast = async () => { const b = p.locator("button", { hasText: /^4×$/ }).first(); if (await b.count()) await b.click().catch(() => {}); };
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { console.log((ok ? "PASS" : "FAIL") + " " + label + (extra ? " :: " + extra : "")); ok ? pass++ : fail++; };

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1500);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(700);
let t = await body();
check("deck definition says coin", t.includes("A scouting report describes a coin as an investor could see it"));
check("deck story says one coin", t.includes("Each card shows one coin on this menu"));
check("deck never says company", !/company/i.test(t));
check("card front says Launched", /Launched\s+2009/.test(t.replace(/\n/g, " ")) || /Launched/.test(t));
check("card front does not say Founded", !/Founded/.test(t));
await p.screenshot({ path: OUT + "fix-01-deck.png" });

// flip all six, checking the Launched meta on the report side too
for (let i = 1; i <= 6; i++) {
  await p.getByRole("button", { name: `card ${i}`, exact: true }).click();
  await wait(500);
}
t = await body();
check("reports use Launched", /Launched/.test(t) && !/Founded/.test(t));
await p.screenshot({ path: OUT + "fix-02-deck-done.png" });
await p.locator("button", { hasText: "Start in 2018" }).first().click();
await wait(900);
await fast();

// walk the tape, gate by gate
const gates = [];
for (let i = 0; i < 500 && gates.length < 5; i++) {
  await wait(350);
  const txt = await body();
  if (/Read more:/.test(txt) && /What do you do\?|Do you want in\?|Do you chase it\?|Do you add more\?|lesson or a fluke\?/.test(txt)) {
    const n = gates.length + 1;
    gates.push(txt);
    await p.screenshot({ path: OUT + `fix-03-gate${n}.png` });
    if (n === 1) {
      // act option: verify the paused-for-move scroll brings the rail on screen
      await p.getByRole("button", { name: "Buy The Promise Coin", exact: true }).click();
      await wait(1400); // includes the 350ms scroll delay + smooth scroll
      const st = await p.evaluate(() => {
        const el = [...document.querySelectorAll("div")].find((d) => d.textContent?.trim().startsWith("Inside your orb") && d.className.includes("rounded-2xl"));
        const r = el ? el.getBoundingClientRect() : null;
        return { scrollY: window.scrollY, railTop: r ? Math.round(r.top) : null, railBottom: r ? Math.round(r.bottom) : null, winH: window.innerHeight, docH: document.documentElement.scrollHeight };
      });
      console.log("rail state after act:", JSON.stringify(st));
      check("paused caption shown", /paused for your move/.test(await body()));
      check("rail on screen after act", st.railTop !== null && st.railBottom !== null && st.railBottom <= st.winH + 2 && st.railTop >= 0, JSON.stringify(st));
      await p.screenshot({ path: OUT + "fix-04-gate1-act-scrolled.png" });
      const play = p.locator("button", { hasText: /^(Play|1×|▶)/ }).first();
      await fast();
      continue;
    }
    if (n === 2) {
      check("gate 2 uses curly quotes", /‘digital gold’/.test(txt), txt.match(/.{0,20}digital gold.{0,10}/)?.[0]);
      check("gate 2 no straight quotes", !/'digital gold'/.test(txt));
      await p.getByRole("button", { name: "Hold on", exact: true }).click();
      await wait(500); await fast();
      continue;
    }
    if (n === 3) {
      check("gate 3 has stay-with option", /Stay with the boring market instead/.test(txt));
      check("gate 3 no buy-the-index option", !/Buy the boring index/.test(txt));
      await p.getByRole("button", { name: "Stay with the boring market instead", exact: true }).click();
      await wait(900);
      const after = await body();
      check("gate 3 option does not pause the tape", !/paused for your move/.test(after));
      await p.screenshot({ path: OUT + "fix-05-gate3-resumed.png" });
      await fast();
      continue;
    }
    if (n === 4) {
      check("gate 4 says sixteen times", /about sixteen times over/.test(txt));
      check("gate 4 no fourteen", !/fourteen times/.test(txt));
      await p.getByRole("button", { name: "Change nothing", exact: true }).click();
      await wait(500); await fast();
      continue;
    }
    if (n === 5) {
      check("gate 5 no hindsight bottom-call", !/selling near a bottom/.test(txt));
      check("gate 5 says floor unknown", /found its floor or is only halfway down/.test(txt));
      await p.screenshot({ path: OUT + "fix-06-gate5.png" });
      await p.getByRole("button", { name: "Hold", exact: true }).click();
      await wait(500); await fast();
      continue;
    }
  }
}
check("all five gates seen", gates.length === 5, String(gates.length));

// run to the end
for (let i = 0; i < 500; i++) {
  await wait(350);
  const txt = await body();
  if (/Quick check/.test(txt) && /finished with/.test(txt)) break;
  await fast();
}
check("reached debrief", /finished with/.test(await body()));

// quiz: confirm the crypto-haven item shows curly quotes
await p.locator("button", { hasText: "Quick check" }).first().click();
await wait(700);
let haven = false, curly = false;
for (let i = 0; i < 14; i++) {
  const txt = await body();
  if (/digital gold/.test(txt)) { haven = true; curly = /‘digital gold’/.test(txt) && !/'digital gold'/.test(txt); await p.screenshot({ path: OUT + "fix-07-quiz-haven.png" }); }
  const nextBtn = p.locator("button", { hasText: /^(Next|See results)$/ }).first();
  if (await nextBtn.count()) { await nextBtn.click(); await wait(500); continue; }
  const opt = p.locator("button.text-left.rounded-xl").first();
  if (await opt.count()) { await opt.click(); await wait(600); continue; }
  break;
}
check("quiz crypto-haven item seen", haven);
check("quiz item uses curly quotes", curly);

// briefing timeline abstraction
await p.goto(`${BASE}/#/orb/brief/crypto`);
await wait(1200);
t = await body();
check("timeline abstracts FTX", /One of the biggest coin exchanges in the world files for bankruptcy/.test(t));
check("timeline body has no FTX", !/FTX exchange/.test(t));
check("ref label may keep FTX", /The FTX collapse/.test(t));
await p.screenshot({ path: OUT + "fix-08-briefing.png", fullPage: true });

console.log("\nERRORS:", JSON.stringify(errs.slice(0, 10)));
console.log(`RESULT: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
