// Walks all five intro lessons and the finale end to end (docs/overnight-plan
// W7). This is the replacement for the old tools/minicheck.mjs, which walked
// the pre-W1 mini-lesson flow that the stepped LessonShell replaced.
//
// For every lesson in the ladder (cash, savings, stocks, funds, coins) it
// steps through every screen, actually using each screen's stage so Continue
// unlocks, answers every quick-check item, finishes back on /orb, and reports
// the aggregated run that landed in localStorage. Then it opens the finale at
// /orb/ready and walks both doors through shelf, sizing, and the mirror.
//
// The stage solver is deliberately generic: the layout law says every screen
// has exactly one thing to touch, and every stage in src/lessons completes by
// one of three moves (drag a slider to its end, click one button, or click
// every button until the set is revealed), so the walker tries those in turn
// and stops as soon as Continue is enabled. A screen it cannot unlock is
// reported as STUCK, which is the failure this walk exists to catch.
//
// Run: ORB_BASE=http://localhost:4318 node tools/walk-lessons.mjs
// Exits 1 on any stuck screen, page error, or missing finale beat.
import { chromium } from "playwright";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });

let failures = 0;
const fail = (msg) => { console.log("FAIL:", msg); failures++; };
const ok = (msg) => console.log("ok  ", msg);

page.on("pageerror", (e) => fail(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") fail(`console.error: ${m.text().slice(0, 200)}`); });

// The visible lesson screen, its stage slot, and its Continue button. Only the
// current screen carries pop-in; the rest are display:none but still mounted.
const screenSel = "main > div.pop-in";
const stageOf = () => page.locator(`${screenSel} > div.mt-4:not(.flex)`);
const contOf = () => page.locator(`${screenSel} > div.mt-4.flex button`).first();

// Use the one stage on this screen until Continue unlocks.
async function solveScreen(label) {
  const stage = stageOf();
  const cont = contOf();
  const unlocked = async () => await cont.isEnabled().catch(() => false);
  if (await unlocked()) return "open";

  // A check screen renders the slim check card instead of a stage.
  const card = stage.locator("> div.max-w-lg");
  if (await card.count()) {
    const opts = card.locator("button.text-left");
    const n = await opts.count();
    if (n > 0) {
      await opts.first().click();
      await wait(250);
      if (await unlocked()) return "check";
    }
  }

  // Sliders complete at the end of their track.
  const ranges = stage.locator("input[type=range]");
  const rn = await ranges.count();
  for (let i = 0; i < rn; i++) {
    const r = ranges.nth(i);
    const max = (await r.getAttribute("max")) ?? "10";
    await r.fill(max);
    await wait(200);
  }
  if (rn && (await unlocked())) return "slider";

  // Reveal-style stages finish once every piece has been tapped. Buttons
  // disable as they are used, so several passes cover multi-tap stages too.
  for (let round = 0; round < 10; round++) {
    const btns = stage.locator("button");
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      const b = btns.nth(i);
      if (!(await b.isVisible().catch(() => false))) continue;
      if (!(await b.isEnabled().catch(() => false))) continue;
      await b.click({ timeout: 3000 }).catch(() => {});
      await wait(120);
      if (await unlocked()) return `buttons(round ${round + 1})`;
    }
    if (await unlocked()) return `buttons(round ${round + 1})`;
  }

  // Sort-style stages give each row an exclusive set of homes and only finish
  // on the one correct combination, which tapping every button in order never
  // lands. Enumerate the combinations instead; a later pick simply replaces
  // that row's earlier one.
  const rows = stage.locator("div.flex.flex-wrap");
  const rowCount = await rows.count();
  if (rowCount >= 2 && rowCount <= 6) {
    const counts = [];
    for (let i = 0; i < rowCount; i++) counts.push(await rows.nth(i).locator("button").count());
    const combos = counts.reduce((a, b) => a * b, 1);
    if (combos > 1 && combos <= 64) {
      for (let c = 0; c < combos; c++) {
        let n = c;
        for (let i = 0; i < rowCount; i++) {
          const k = n % counts[i];
          n = Math.floor(n / counts[i]);
          const b = rows.nth(i).locator("button").nth(k);
          if (await b.isEnabled().catch(() => false)) await b.click({ timeout: 3000 }).catch(() => {});
          await wait(60);
        }
        if (await unlocked()) return `sort(combo ${c + 1} of ${combos})`;
      }
    }
  }
  return null;
}

async function walkLesson(id) {
  console.log(`\n--- lesson: ${id} ---`);
  await page.evaluate(() => localStorage.removeItem("beta-checks")).catch(() => {});
  await page.goto(`${BASE}/#/orb/learn/${id}`);
  await wait(900);

  const stepLine = await page.getByText(/^Step \d+ of \d+$/).first().innerText();
  const total = parseInt(stepLine.split(" of ")[1], 10);
  if (!Number.isFinite(total) || total < 6) fail(`${id}: expected at least 6 screens, read "${stepLine}"`);
  else ok(`${id}: ${total} screens`);

  for (let s = 1; s <= total; s++) {
    const line = await page.getByText(/^Step \d+ of \d+$/).first().innerText();
    if (line !== `Step ${s} of ${total}`) fail(`${id}: expected "Step ${s} of ${total}", got "${line}"`);
    const how = await solveScreen(`${id} step ${s}`);
    if (!how) { fail(`${id}: STUCK on step ${s} of ${total}; Continue never unlocked`); break; }
    const cont = contOf();
    const label = (await cont.innerText()).trim();
    if (s === total && label !== "Finish") fail(`${id}: last screen button reads "${label}", expected "Finish"`);
    await cont.click();
    await wait(s === total ? 900 : 400);
    if (s < total) console.log(`     step ${s}/${total} via ${how}`);
    else console.log(`     step ${s}/${total} via ${how} (Finish)`);
  }

  // Finish returns to the scenario select screen.
  const url = page.url();
  if (!url.endsWith("#/orb")) fail(`${id}: Finish landed on ${url}, expected #/orb`);
  else ok(`${id}: finished back on /orb`);

  const stored = await page.evaluate(() => localStorage.getItem("beta-checks"));
  const rows = stored ? JSON.parse(stored) : [];
  const row = rows.find((r) => r.scenario === `learn-${id}`);
  if (!row) fail(`${id}: no learn-${id} row written to beta-checks`);
  else ok(`${id}: saved ${row.score}/${row.total} (${row.items.length} items)`);
  await page.screenshot({ path: `${OUT}lesson-${id}.png`, fullPage: true });
}

for (const id of ["cash", "savings", "stocks", "funds", "coins"]) {
  await walkLesson(id);
}

// ------------------------------ the finale ------------------------------
async function walkReady(doorName, tag) {
  console.log(`\n--- finale: ${doorName} ---`);
  // A saved plan deliberately resumes on the sizing screen, so each path
  // starts from a cleared store and a real reload to land on the door.
  await page.goto(`${BASE}/#/orb/ready`);
  await wait(300);
  await page.evaluate(() => localStorage.removeItem("orb-ready-plan"));
  await page.reload();
  await wait(800);

  const door = page.getByRole("button", { name: doorName }).first();
  if (!(await door.count())) { fail(`finale: door "${doorName}" not found`); return; }
  await door.click();
  await wait(500);

  if (!(await page.getByText("Step 1 of 3").count())) fail(`${tag}: shelf screen (step 1 of 3) not reached`);
  else ok(`${tag}: shelf screen`);

  // Tap three lines off the shelf, then continue to sizing.
  const shelf = page.locator("main button[title]");
  const sn = await shelf.count();
  if (sn < 3) fail(`${tag}: shelf shows ${sn} tappable assets, expected the full shelf`);
  for (let i = 0; i < Math.min(3, sn); i++) { await shelf.nth(i).click(); await wait(150); }

  const cont1 = page.getByRole("button", { name: "Continue" }).first();
  if (!(await cont1.isEnabled())) { fail(`${tag}: Continue still locked after picking three lines`); return; }
  await cont1.click();
  await wait(500);

  if (!(await page.getByText("Step 2 of 3").count())) fail(`${tag}: sizing screen (step 2 of 3) not reached`);
  else ok(`${tag}: sizing screen`);

  const dollars = page.locator("main input[aria-label^='Dollars for']");
  const dn = await dollars.count();
  if (dn === 0) { fail(`${tag}: no dollar inputs on the sizing screen`); return; }
  for (let i = 0; i < dn; i++) { await dollars.nth(i).fill(String(100 * (i + 1))); await wait(120); }

  const cont2 = page.getByRole("button", { name: "Continue" }).first();
  if (!(await cont2.isEnabled())) { fail(`${tag}: Continue still locked after sizing`); return; }
  await cont2.click();
  await wait(600);

  if (!(await page.getByText("Step 3 of 3").count())) fail(`${tag}: mirror screen (step 3 of 3) not reached`);
  else ok(`${tag}: mirror screen`);

  const printBtn = page.getByRole("button", { name: "Print this plan" });
  if (!(await printBtn.count()) || !(await printBtn.isEnabled())) fail(`${tag}: print button missing or disabled`);
  else ok(`${tag}: printable plan ready`);

  // The mirror is a mirror, not advice: the disclaimer rides every path.
  const mirrorLine = await page.getByText(/mirror, not advice/i).count();
  if (!mirrorLine) fail(`${tag}: not-advice line missing`);
  else ok(`${tag}: not-advice line present`);

  const saved = await page.evaluate(() => localStorage.getItem("orb-ready-plan"));
  if (!saved) fail(`${tag}: plan not persisted to localStorage`);
  else {
    const plan = JSON.parse(saved);
    if (plan.path !== tag) fail(`${tag}: saved plan records path "${plan.path}"`);
    else ok(`${tag}: plan persisted with ${plan.lines.length} lines`);
  }

  await page.screenshot({ path: `${OUT}ready-${tag}.png`, fullPage: true });

  // A returning player picks up where the plan left off, not at the door.
  await page.reload();
  await wait(800);
  if (!(await page.getByText("Step 2 of 3").count())) fail(`${tag}: saved plan did not resume on the sizing screen`);
  else ok(`${tag}: saved plan resumes on the sizing screen`);
}

await walkReady("I'm planning my first orb", "first");
await walkReady("I already own some", "own");

console.log(failures === 0 ? "\nAll lesson and finale walks passed." : `\n${failures} failure(s).`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
