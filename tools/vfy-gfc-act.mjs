// Third pass: an act-flagged gate option must actually pause the tape for the
// move, the real-names toggle must swap the cast, and the trade menu descs.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");
const cards = async () =>
  p.evaluate(() => {
    const all = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return /rgba?\(255, 255, 255/.test(s.backgroundColor) && parseFloat(s.borderRadius) >= 10 &&
        r.width > 240 && r.height > 80 && r.top < window.innerHeight && r.bottom > 0;
    });
    const outer = all.filter((c) => !all.some((o) => o !== c && o.contains(c)));
    return { n: outer.length, docH: document.documentElement.scrollHeight, winH: window.innerHeight,
      txt: outer.map((c) => c.innerText.slice(0, 34).replace(/\n/g, " ")) };
  });

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(500);
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(80); }
// real names toggle on the scouting deck
await p.locator("button").filter({ hasText: /^Real names$/ }).first().click();
await wait(400);
await p.screenshot({ path: OUT + "gfc-act-realnames.png" });
console.log("REALNAMES", (await body()).slice(300, 900));
const toggles = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter((t) => /name/i.test(t)));
console.log("name toggle now:", JSON.stringify(toggles));
if (toggles[0]) await p.locator("button").filter({ hasText: new RegExp(`^${toggles[0]}$`) }).first().click();
await wait(300);

await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(700);
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();
for (let t = 0; t < 600; t++) { if ((await body()).includes("October 2007 ·")) break; await wait(250); }
await wait(400);
console.log("RUN-BEAT cards before gate n/a; gate cards", JSON.stringify(await cards()));
await p.locator("button").filter({ hasText: /^Buy more while it climbs$/ }).first().click();
await wait(1000);
console.log("AFTER ACT OPTION:", (await body()).slice(0, 900));
console.log("cards", JSON.stringify(await cards()));
await p.screenshot({ path: OUT + "gfc-act-pause.png" });

const add = p.locator("button", { hasText: /^Add a color$/ }).first();
console.log("add-a-color present?", await add.count());
if (await add.count()) { await add.click(); await wait(500); }
await p.screenshot({ path: OUT + "gfc-act-menu.png" });
console.log("MENU:", (await body()).slice(-1400));
const row = p.locator("button").filter({ hasText: /Everything Mart/ }).first();
if (await row.count()) {
  await row.click();
  await wait(600);
  await p.screenshot({ path: OUT + "gfc-act-tradepop.png" });
  const buy = p.locator("button").filter({ hasText: /^\$?\d|^Buy/ }).first();
  const labels = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim()));
  console.log("POP BTNS", JSON.stringify(labels.slice(-14)));
  if (await buy.count()) { await buy.click(); await wait(900); }
  console.log("AFTER BUY:", (await body()).slice(0, 700));
  await p.screenshot({ path: OUT + "gfc-act-afterbuy.png" });
}
// resume and confirm the tape moves again
const play = p.locator("button").filter({ hasText: /^(Play|Resume|1×|▶)/ }).first();
if (await play.count()) { console.log("resume:", (await play.innerText()).trim()); await play.click(); }
await wait(2500);
console.log("RESUMED:", (await body()).slice(0, 260));
await browser.close();
console.log("DONE");
