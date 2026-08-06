// End-to-end verification of the dotcom era after the fix pass: gate
// typography (eyebrow + bold definition), briefing crossroads count, scouting
// card reconstruction wording, quiz item accuracy, and the debrief.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4332";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

// 1) briefing page: crossroads count
await p.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(1200);
const briefTxt = await p.evaluate(() => document.body.innerText);
console.log("BRIEFING five crossroads:", /at five crossroads/.test(briefTxt));
console.log("BRIEFING no 'two crossroads':", !/two crossroads/.test(briefTxt));
await p.screenshot({ path: OUT + "w4s2-dcfix-01-briefing.png", fullPage: true });

// 2) scouting deck: flip to the Phone Giant card (index 9) and read its note
await p.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1200);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
await p.locator('button[aria-label="card 9"]').click();
await wait(600);
const cardTxt = await p.evaluate(() => document.body.innerText);
console.log("CARD no 'delisted':", !/delisted/i.test(cardTxt));
console.log("CARD says reconstructed:", /reconstructed from the dated record/.test(cardTxt));
await p.screenshot({ path: OUT + "w4s2-dcfix-02-card-wcom.png" });
for (let i = 1; i <= 10; i++) { await p.locator(`button[aria-label="card ${i}"]`).click(); await wait(90); }
await p.locator("button", { hasText: "Start in 2000" }).first().click();
await wait(800);

// 3) play through all five gates, screenshotting each
let shot = 3;
const seen = [];
for (let t = 0; t < 900; t++) {
  const txt = await p.evaluate(() => document.body.innerText);
  const g = txt.match(/(February 2000|April 2000|September 2001|June 2002|October 2002) · /);
  if (g) {
    await wait(700);
    seen.push(g[1]);
    const probe = await p.evaluate(() => {
      const eyebrow = [...document.querySelectorAll("main div")].find((d) =>
        /^(February 2000|April 2000|September 2001|June 2002|October 2002) · (A bubble|A dip|Panic selling|A fraud|A bear market)$/.test(d.innerText.trim()));
      const def = eyebrow ? eyebrow.nextElementSibling : null;
      const defStyle = def ? getComputedStyle(def) : null;
      const cards = [...document.querySelectorAll("main .rounded-2xl.bg-white, main div[class*='rounded-2xl'][class*='bg-white']")];
      return {
        eyebrow: eyebrow ? eyebrow.innerText.trim() : null,
        eyebrowColor: eyebrow ? getComputedStyle(eyebrow).color : null,
        defText: def ? def.innerText.slice(0, 60) : null,
        defWeight: defStyle ? defStyle.fontWeight : null,
        defSize: defStyle ? defStyle.fontSize : null,
        whiteCards: cards.length,
        scrollH: document.documentElement.scrollHeight,
      };
    });
    console.log("GATE", g[1], JSON.stringify(probe));
    await p.screenshot({ path: OUT + `w4s2-dcfix-0${shot++}-gate-${g[1].replace(" ", "")}.png` });
    const hold = p.locator("main button").filter({ hasText: /^(Wait in cash|Hold what I have|Hold and stick to the plan|Hold and hope it survives)$/ }).first();
    await hold.click();
    await wait(500);
    const fast = p.locator("button", { hasText: /^4×$/ }).first();
    if (await fast.count()) await fast.click();
    continue;
  }
  if (/Quick check/.test(txt) && /You finished with/.test(txt)) break;
  if (t === 0) { const fast = p.locator("button", { hasText: /^4×$/ }).first(); if (await fast.count()) await fast.click(); }
  await wait(350);
}
console.log("GATES SEEN:", seen.join(" | "));
const debrief = await p.evaluate(() => document.body.innerText);
console.log("DEBRIEF lists 5 crossroads answers:", (debrief.match(/: “/g) ?? []).length >= 5);
await p.screenshot({ path: OUT + `w4s2-dcfix-08-debrief.png`, fullPage: true });

// 4) quiz: walk all items, printing prompt and marked answer text
await p.getByRole("button", { name: "Quick check" }).click();
await wait(600);
for (let q = 0; q < 9; q++) {
  const txt = await p.evaluate(() => document.body.innerText);
  const m = txt.match(/Question \d+ of (\d+)/);
  if (!m) break;
  const prompt = await p.evaluate(() => {
    const el = [...document.querySelectorAll("main p, main div")].find((d) => /\?$/.test(d.innerText.trim()) && d.innerText.length < 300);
    return el ? el.innerText.trim() : "?";
  });
  // answer the first option, then read the explain + which option is right
  await p.locator("main button").filter({ hasText: /^(About|The |They |It |Nothing|Only |Reading|Following|Spreading|Everyone|Perfect|Inside|Borrowed|A |Guaranteed|Also|Grew|Went|Beat|Held|Rose|Fell|Stopped|None|All |Hold|Fast|Getting|Computers|Prices|Records|The internet|The government|The prices)/ }).first().click();
  await wait(450);
  const after = await p.evaluate(() => document.body.innerText);
  const explain = (after.match(/[^\n]+/g) ?? []).filter((l) => /took about|Dow's worst|regained|came back|survivorship|expectations|bundle of|Diversification/i.test(l));
  console.log(`QUIZ ${q + 1}: ${prompt.slice(0, 90)}`);
  if (explain.length) console.log("   explain:", explain[0].slice(0, 140));
  if (q === 0) await p.screenshot({ path: OUT + "w4s2-dcfix-09-quiz1.png" });
  if (q === 3) await p.screenshot({ path: OUT + "w4s2-dcfix-10-quiz4.png" });
  const next = p.locator("main button").filter({ hasText: /^(Next question|See your score)$/ }).first();
  if (await next.count()) await next.click(); else break;
  await wait(450);
}
const fin = await p.evaluate(() => document.body.innerText);
console.log("QUIZ finished, score line:", (fin.match(/You got \d+ of \d+[^\n]*/) ?? ["(none)"])[0]);
await b.close();
console.log("DONE");
