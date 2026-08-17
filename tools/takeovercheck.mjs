// Takeover walk (spec section 7, Aug 17 revision): name gate, arena paints,
// eating raises worth, red hazards cost money, both end cards reachable
// (?fast=1 shortens the round; hash-only navigation does not remount, so
// reload after goto). Dev server on 4318. Shots in tools/shots/takeover/.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/takeover/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

let failures = 0;
const check = (ok, label) => {
  console.log(ok ? `ok   ${label}` : `FAIL ${label}`);
  if (!ok) failures++;
};

const cx = 720, cy = 475;

async function openGame(url) {
  await page.goto(url);
  await page.reload();
  await wait(900);
  if (await page.locator("[data-startcard]").count()) {
    await page.locator("[data-name-input]").fill("walkbot inc");
    await page.locator("[data-start]").click();
    await wait(600);
  }
}

// Steer like a survivor: flee predators and hazards first, otherwise chase
// the nearest safe food, until worth passes the target or ticks run out.
// (Since the Aug 17 difficulty pass the arena hunts back.)
async function chaseFood(worthTarget, maxTicks) {
  for (let t = 0; t < maxTicks; t++) {
    const info = await page.evaluate(() => {
      const run = window.__takeover?.run;
      if (!run || run.over || !run.cells.length) return null;
      const me = run.cells[0];
      let fx = 0, fy = 0;
      for (const b of run.companies) {
        if (b.c.local || b.cap <= me.value) continue;
        const d = Math.hypot(b.x - me.x, b.y - me.y);
        if (d < 480) { fx += (me.x - b.x) / d; fy += (me.y - b.y) / d; }
      }
      for (const h of run.hazards) {
        const d = Math.hypot(h.x - me.x, h.y - me.y);
        if (d < 300) { fx += (me.x - h.x) / d; fy += (me.y - h.y) / d; }
      }
      if (fx || fy) return { worth: run.worth, dx: fx, dy: fy };
      const safe = (x, y) =>
        !run.hazards.some((h) => Math.hypot(h.x - x, h.y - y) < h.r + 80);
      const targets = [
        ...run.companies.filter((b) => b.cap < me.value).map((b) => ({ x: b.x, y: b.y })),
        ...run.deals.map((d) => ({ x: d.x, y: d.y })),
      ].filter((p) => safe(p.x, p.y));
      if (!targets.length) return { worth: run.worth, dx: 1, dy: 0 };
      targets.sort(
        (a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y),
      );
      const n = targets[0];
      return { worth: run.worth, dx: n.x - me.x, dy: n.y - me.y };
    });
    if (!info) return;
    if (info.worth >= worthTarget) return;
    const d = Math.hypot(info.dx, info.dy) || 1;
    await page.mouse.move(cx + (info.dx / d) * 400, cy + (info.dy / d) * 400);
    await wait(140);
  }
}

// 1. Name gate, then the arena.
await page.goto("http://localhost:4318/#/takeover");
await page.reload();
await wait(900);
check((await page.locator("[data-startcard]").count()) === 1, "name gate shows");
await page.locator("[data-name-input]").fill("walkbot inc");
await page.screenshot({ path: OUT + "namegate.png" });
console.log("shot namegate");
await page.locator("[data-start]").click();
await wait(800);
const named = await page.evaluate(() => window.__takeover?.run?.playerName);
check(named === "walkbot inc", `player name applied (${named})`);
const painted = await page.evaluate(() => {
  const c = document.querySelector("canvas[data-takeover-arena]");
  if (!c) return false;
  const g = c.getContext("2d");
  const px = g.getImageData(0, 0, 200, 200).data;
  for (let i = 0; i < px.length; i += 4) if (px[i] || px[i + 1] || px[i + 2]) return true;
  return false;
});
check(painted, "arena canvas paints");
check(
  (await page.evaluate(() => window.__takeover.run.hazards.length)) >= 6,
  "hazards populate",
);
await page.screenshot({ path: OUT + "arena.png" });
console.log("shot arena");

// 2. Eat: chase until worth clears 4.5M.
const before = await page.evaluate(() => window.__takeover.run.worth);
await chaseFood(4.5e6, 220);
const after = await page.evaluate(() => window.__takeover.run.worth);
check(after > before, `eating raises worth (${before} -> ${after})`);

// 3. Hazard: drive into the nearest red circle, worth must drop (or the run
// ends in bankruptcy, which also proves the hit landed).
const preHit = await page.evaluate(() => window.__takeover.run.worth);
for (let t = 0; t < 80; t++) {
  const target = await page.evaluate(() => {
    const run = window.__takeover.run;
    if (run.over || !run.cells.length) return null;
    const me = run.cells[0];
    if (!run.hazards.length) return { dx: 1, dy: 0 };
    const hs = [...run.hazards].sort(
      (a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y),
    );
    return { dx: hs[0].x - me.x, dy: hs[0].y - me.y, worth: run.worth };
  });
  if (!target) break;
  if (target.worth !== undefined && target.worth < preHit * 0.98) break;
  const d = Math.hypot(target.dx, target.dy) || 1;
  await page.mouse.move(cx + (target.dx / d) * 420, cy + (target.dy / d) * 420);
  await wait(120);
}
const postHit = await page.evaluate(() => ({
  worth: window.__takeover.run.worth,
  over: window.__takeover.run.over,
}));
check(
  postHit.worth < preHit * 0.99 || postHit.over?.kind === "bankrupt",
  `hazard hit costs money (${Math.round(preHit)} -> ${Math.round(postHit.worth)}${postHit.over ? ", " + postHit.over.kind : ""})`,
);

// 4. IPO card via the fast round. The arena hunts back now, so dying before
// the 8 second buzzer is possible; allow three attempts to survive one round.
let ipoText = "";
for (let attempt = 0; attempt < 3; attempt++) {
  await openGame("http://localhost:4318/#/takeover?fast=1");
  await chaseFood(Infinity, 60);
  await wait(1500);
  ipoText = (await page.locator("[data-endcard]").count())
    ? await page.locator("[data-endcard]").innerText()
    : "";
  if (ipoText.includes("went public")) break;
}
check(ipoText.includes("went public"), "ipo card shows");
await page.screenshot({ path: OUT + "ipo.png" });
console.log("shot ipo");

// 5. ACQUIRED card: fresh full round, grow until real predators exist, then
// drive into the nearest one.
await openGame("http://localhost:4318/#/takeover");
await chaseFood(4e7, 420);
for (let t = 0; t < 200; t++) {
  const target = await page.evaluate(() => {
    const run = window.__takeover.run;
    if (run.over || !run.cells.length) return null;
    const me = run.cells[0];
    const big = run.companies.filter((b) => b.cap > run.worth && !b.c.local);
    if (!big.length) return { dx: 1, dy: 0 };
    big.sort(
      (a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y),
    );
    return { dx: big[0].x - me.x, dy: big[0].y - me.y };
  });
  if (!target) break;
  const d = Math.hypot(target.dx, target.dy) || 1;
  await page.mouse.move(cx + (target.dx / d) * 430, cy + (target.dy / d) * 430);
  await wait(120);
}
await wait(500);
const endText = (await page.locator("[data-endcard]").count())
  ? await page.locator("[data-endcard]").innerText()
  : "";
check(/acquired by|went public|bankrupted by/.test(endText), "second round ends with a card");
if (endText.includes("acquired by")) {
  await page.screenshot({ path: OUT + "acquired.png" });
  console.log("shot acquired");
}

await browser.close();
console.log(failures ? `${failures} FAILURES` : "ALL CHECKS PASS");
process.exit(failures ? 1 : 0);
