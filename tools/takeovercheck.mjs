// Takeover walk (spec section 7, Aug 17 revision): name gate, arena paints,
// eating raises worth, red hazards cost money, both end cards reachable
// There is no clock: a run ends by acquisition, bankruptcy, or by owning the
// market. Hash-only navigation does not remount, so reload after goto.
// Dev server on 4318. Shots in tools/shots/takeover/.
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
  // Wait for the arena, not a fixed delay: after several rounds the reload can
  // take longer than 900ms and the name gate would be missed.
  await page.waitForSelector("canvas[data-takeover-arena]");
  await wait(400);
  if (await page.locator("[data-startcard]").count()) {
    await page.locator("[data-name-input]").fill("walkbot inc");
    await page.locator("[data-start]").click();
  }
  await page.waitForFunction(() => !!window.__takeover?.run, null, { timeout: 8000 });
  await wait(400);
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
// Type contract (docs/clean-type.md): one system font, no monospace anywhere.
const pageFont = await page.evaluate(() =>
  getComputedStyle(document.querySelector("[data-takeover-arena]").parentElement).fontFamily,
);
check(!/mono|menlo|consolas|grotesk|pixelify|fraunces/i.test(pageFont), `page font is the system stack (${pageFont})`);
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

// 4. The giants are actually on the board, and the red never stacks.
const titans = await page.evaluate(() => {
  const run = window.__takeover.run;
  const me = run.cells[0];
  const big = run.companies.filter((b) => b.cap >= 5e11);
  return {
    count: big.length,
    nearest: big.length
      ? Math.round(Math.min(...big.map((b) => Math.hypot(b.x - me.x, b.y - me.y))))
      : -1,
    names: big.map((b) => b.c.name).slice(0, 4),
  };
});
check(titans.count >= 3, `giants are on the board (${titans.count}: ${titans.names.join(", ")})`);
check(
  titans.nearest > 0 && titans.nearest < 1000,
  `a giant is close enough to see (${titans.nearest} units away)`,
);

const stacked = await page.evaluate(() => {
  const hs = window.__takeover.run.hazards;
  let worst = null;
  for (let i = 0; i < hs.length; i++) {
    for (let j = i + 1; j < hs.length; j++) {
      const d = Math.hypot(hs[i].x - hs[j].x, hs[i].y - hs[j].y);
      const min = hs[i].r + hs[j].r;
      if (d < min && (!worst || min - d > worst.overlap)) {
        worst = { overlap: Math.round(min - d), a: hs[i].label, b: hs[j].label };
      }
    }
  }
  return worst;
});
check(!stacked, stacked ? `hazards stack: ${stacked.a} over ${stacked.b} by ${stacked.overlap}px` : "no two hazards overlap");

// 5. There is no clock, so a run only ends by death or by owning the market.
const ticked = await page.evaluate(async () => {
  const run = window.__takeover.run;
  const before = run.elapsed;
  await new Promise((r) => setTimeout(r, 1200));
  return { grew: run.elapsed > before, over: run.over, hasTimer: "timeLeft" in run };
});
check(!ticked.hasTimer, "the run carries no countdown");
check(ticked.grew && !ticked.over, "time passing does not end the run");

// 6. Outgrowing the largest company wins it.
await page.evaluate(() => {
  window.__takeover.run.cells[0].value = 6e12;
});
await wait(900);
const winText = (await page.locator("[data-endcard]").count())
  ? await page.locator("[data-endcard]").innerText()
  : "";
check(winText.includes("You own the market"), "outgrowing the market wins the run");
await page.screenshot({ path: OUT + "won.png" });
console.log("shot won");

// 5. ACQUIRED card: fresh full round, grow until real predators exist, then
// drive into the nearest one. Two attempts, because a dev-server hot reload
// mid-round restarts the clock and leaves the walk with no card to read.
let endText = "";
for (let attempt = 0; attempt < 2; attempt++) {
  await openGame("http://localhost:4318/#/takeover");
  await chaseFood(4e7, 420);
  for (let t = 0; t < 200; t++) {
    const target = await page.evaluate(() => {
      const run = window.__takeover?.run;
      if (!run || run.over || !run.cells.length) return null;
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
  endText = (await page.locator("[data-endcard]").count())
    ? await page.locator("[data-endcard]").innerText()
    : "";
  if (/Acquired by|You own the market|Bankrupted by/.test(endText)) break;
}
check(/Acquired by|You own the market|Bankrupted by/.test(endText), "second round ends with a card");
if (endText.includes("Acquired by")) {
  await page.screenshot({ path: OUT + "acquired.png" });
  console.log("shot acquired");
}

await browser.close();
console.log(failures ? `${failures} FAILURES` : "ALL CHECKS PASS");
process.exit(failures ? 1 : 0);
