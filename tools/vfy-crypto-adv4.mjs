// Adversarial pass 4: take the Ponzi bait at gate 1, buy The Promise Coin,
// and confirm the collapse actually lands in the sim one month later.
// Also checks the real-names toggle and the field-guide marble for "ponzi".
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

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
for (let i = 1; i <= 6; i++) { await p.getByRole("button", { name: `card ${i}`, exact: true }).click(); await wait(280); }
await p.locator("button", { hasText: "Start in 2018" }).first().click();
await wait(1200);

// gate 1 should be up
let t = await body();
console.log("gate1 up:", /A Ponzi scheme/.test(t));
await p.getByRole("button", { name: "Buy The Promise Coin", exact: true }).click();
await wait(1600);
console.log("paused for move:", /paused for your move/.test(await body()));

await p.getByRole("button", { name: /The Promise Coin/ }).first().click();
await wait(500);
await p.screenshot({ path: OUT + "adv4-buy-open.png" });
const chip = p.locator("button", { hasText: /^Buy \$250$/ }).first();
console.log("buy chip present:", await chip.count());
await chip.click();
await wait(800);
t = await body();
console.log("after buy:\n" + t.split("Inside your orb")[1]?.slice(0, 320));
await p.screenshot({ path: OUT + "adv4-bought.png" });

// real names toggle
await p.locator("button", { hasText: "Real names" }).first().click();
await wait(500);
t = await body();
console.log("real names on:", /BitConnect/.test(t), "| bitcoin:", /Bitcoin/.test(t));
await p.screenshot({ path: OUT + "adv4-realnames.png" });
await p.locator("button", { hasText: /Real names/ }).first().click();
await wait(400);

// step one month and see the collapse
const play = p.locator("button", { hasText: /^1×$/ }).first();
if (await play.count()) await play.click();
await wait(4000);
t = await body();
const nw = t.match(/Net worth\s*\n\$([\d,]+)/);
console.log("month:", (await body()).match(/[A-Z][a-z]{2} 20\d\d/)?.[0], "net worth:", nw?.[1]);
console.log("orb section:\n" + t.split("Inside your orb")[1]?.slice(0, 300));
await p.screenshot({ path: OUT + "adv4-collapse.png" });

// field guide
await p.goto(`${BASE}/#/orb/guide`);
await wait(900);
t = await body();
console.log("guide has ponzi entry:", /Ponzi|ponzi/.test(t));
await p.screenshot({ path: OUT + "adv4-guide.png", fullPage: true });
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await browser.close();
