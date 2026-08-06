// Throwaway: complete /orb/learn/cash the way a human would (correct sort,
// correct check answers) and confirm marbles clear + result row is written.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4322";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const vp of [{ n: "mob", w: 390, h: 844 }, { n: "desk", w: 1280, h: 720 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });
  console.log(`\n===== human run ${vp.n} =====`);
  await page.goto(`${BASE}/#/orb/learn/cash`);
  await page.evaluate(() => { localStorage.removeItem("field-guide"); localStorage.removeItem("beta-checks"); });
  await page.reload(); await wait(700);

  const card = () => page.locator("main .rounded-2xl.bg-white:visible").first();
  const cont = () => page.locator("main div:not(.hidden) > div > button").filter({ hasText: /^(Continue|Finish)$/ }).first();
  const step = () => page.locator("main span.tnum").first().innerText();
  const shot = (n) => page.screenshot({ path: `${OUT}w2h-${vp.n}-${n}.png` });
  const fold = async (n) => {
    const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    const b = await cont().boundingBox();
    const ok = b && b.y + b.height <= m.ih + 1 && m.sh <= m.ih + 2 && m.sw <= m.iw + 2;
    console.log(`  [${n}] ${await step()} fits=${ok} scrollH=${m.sh}/${m.ih} contBottom=${b ? Math.round(b.y + b.height) : "?"}`);
    if (!ok) console.log("  !! DOES NOT FIT");
  };

  // 1 trade
  await card().getByRole("button").click(); await wait(200);
  await card().getByRole("button").click(); await wait(250);
  await fold("1-trade"); await shot("1"); await cont().click(); await wait(350);
  // 2 jar
  for (let i = 0; i < 3; i++) { await card().getByRole("button").click(); await wait(180); }
  await fold("2-jar"); await shot("2"); await cont().click(); await wait(350);
  // 3 leak slider, sweep it like a finger
  const r = page.locator("main div:not(.hidden) input[type=range]:visible").first();
  for (const v of ["2", "4", "6", "8"]) { await r.fill(v); await wait(200); }
  await fold("3-leak"); await shot("3");
  console.log("  leak readouts:", (await card().innerText()).replace(/\n+/g, " | "));
  await cont().click(); await wait(350);
  // 4 check 1: correct = "Fewer pairs than it could on day one"
  await card().getByRole("button", { name: "Fewer pairs than it could on day one" }).click(); await wait(300);
  await fold("4-check1"); await shot("4"); await cont().click(); await wait(350);
  // 5 two risks
  await card().getByRole("button", { name: "The loud risk" }).click(); await wait(200);
  await card().getByRole("button", { name: "The quiet risk" }).click(); await wait(250);
  await fold("5-risks"); await shot("5"); await cont().click(); await wait(350);
  // 6 sort: jar, jar, earn
  const rows = page.locator("main div:not(.hidden) .rounded-2xl.bg-white .flex-wrap");
  console.log("  sort rows:", await rows.count());
  await rows.nth(0).getByRole("button", { name: "The jar" }).click(); await wait(160);
  await rows.nth(1).getByRole("button", { name: "The jar" }).click(); await wait(160);
  await rows.nth(2).getByRole("button", { name: "Somewhere it can earn" }).click(); await wait(250);
  console.log("  sort feedback:", (await card().innerText()).split("\n").pop());
  console.log("  sort continue disabled:", await cont().isDisabled());
  await fold("6-sort"); await shot("6"); await cont().click(); await wait(350);
  // 7 check 2: correct = "Price tags drifting up a few percent every year"
  await card().getByRole("button", { name: "Price tags drifting up a few percent every year" }).click(); await wait(300);
  await fold("7-check2"); await shot("7");
  console.log("  guide before finish:", await page.evaluate(() => localStorage.getItem("field-guide")));
  const label = await cont().innerText();
  await cont().click(); await wait(600);
  console.log("  final button was:", label, "-> url", page.url());
  console.log("  guide:", await page.evaluate(() => localStorage.getItem("field-guide")));
  console.log("  beta-checks:", await page.evaluate(() => localStorage.getItem("beta-checks")));
  console.log("  errors:", errors.length ? errors.join("\n") : "none");
  await page.close();
}
await browser.close();
