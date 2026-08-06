import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4328";
const browser = await chromium.launch();

const widest = () => {
  const dw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > dw + 1 || r.left < -1) {
      out.push({ tag: el.tagName, cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").toString().slice(0, 70), left: Math.round(r.left), right: Math.round(r.right), txt: (el.textContent || "").trim().slice(0, 40) });
    }
  });
  return { dw, scrollW: document.documentElement.scrollWidth, offenders: out.slice(0, 12) };
};

async function probe(label, url, steps) {
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto(url);
  await wait(1400);
  if (steps) await steps(p);
  const info = await p.evaluate(widest);
  console.log("==", label, JSON.stringify(info, null, 1));
  await p.screenshot({ path: OUT + `chk3-${label}.png` });
  await p.close();
}

await probe("dotcom-brief", `${BASE}/#/orb/s/dotcom`);
await probe("dotcom-scout", `${BASE}/#/orb/s/dotcom`, async (p) => {
  await p.getByRole("button", { name: "Scout the menu" }).click();
  await wait(600);
});
await probe("gfc-brief", `${BASE}/#/orb/s/gfc`);
await probe("brief-page", `${BASE}/#/orb/brief/dotcom`);

// pager dots path unlocks
const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p2.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1400);
await p2.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
for (let i = 1; i <= 10; i++) {
  await p2.getByRole("button", { name: `card ${i}`, exact: true }).click();
  await wait(120);
}
const start2 = p2.locator("button", { hasText: "Start in 2000" }).first();
console.log("after all pager dots, start disabled:", await start2.isDisabled());
await start2.click();
await wait(1200);
const restart = p2.locator("button", { hasText: "Restart" }).first();
if (await restart.count()) { await restart.click(); await wait(1400); }
console.log("after restart:", (await p2.evaluate(() => document.body.innerText)).slice(0, 260).replace(/\n/g, " | "));
await p2.screenshot({ path: OUT + "chk3-restart.png" });
await browser.close();
console.log("DONE");
