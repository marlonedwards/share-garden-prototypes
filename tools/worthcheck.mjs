// Worth More walk: play the daily run with perfect knowledge, then throw it,
// once on a wide screen and once on a phone.
//
// The page publishes the live pair, streak, badge and split on window.__worth,
// so the walk can answer correctly five times running, check the ramp and the
// fairness floor as it goes, and then miss on purpose to see the death card.
// It also measures the two company names to prove the split really is side by
// side on wide screens and stacked on narrow ones, and that the halves cover
// the viewport with nothing showing behind them.
//
// Hash-only navigation does not remount React routes, so always reload after
// goto. Dev server on 4318. Shots land in tools/shots/worth/.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = new URL("./shots/worth/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (ok, label) => {
  console.log(ok ? `ok   ${label}` : `FAIL ${label}`);
  if (!ok) failures++;
};

// same shape as fmtMoney in src/data/takeoverCompanies.ts
function fmtMoney(v) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(v >= 1e13 ? 0 : 1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  return `$${Math.round(v / 1e3)}K`;
}

const browser = await chromium.launch();

async function play({ label, width, height, wantStacked }) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE.ERR:", m.text());
  });

  await page.goto("http://localhost:4318/#/worth", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.localStorage.removeItem("worth-best"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-worth-panel="anchor"]');
  await wait(400);

  const state = () => page.evaluate(() => window.__worth);
  const p = (seat) => `[data-worth-panel="${seat}"]`;

  // ---------------------------------------------------------- the split

  const s0 = await state();
  check(!!s0, "window.__worth is published");
  check(s0.stacked === wantStacked, `the split is ${wantStacked ? "stacked" : "side by side"}`);
  check(s0.streak === 0, "a fresh run starts at streak 0");

  const anchorName = await page.getAttribute(p("anchor"), "data-worth-name");
  const chalName = await page.getAttribute(p("challenger"), "data-worth-name");
  check(!!anchorName && anchorName.length > 1, `anchor half names a company (${anchorName})`);
  check(!!chalName && chalName.length > 1, `challenger half names a company (${chalName})`);
  check(anchorName !== chalName, "the two halves are different companies");
  check(s0.anchor.name === anchorName && s0.challenger.name === chalName, "state matches the halves");

  const ta = await page.locator(`${p("anchor")} [data-worth-title]`).boundingBox();
  const tc = await page.locator(`${p("challenger")} [data-worth-title]`).boundingBox();
  const ax = ta.x + ta.width / 2;
  const cx = tc.x + tc.width / 2;
  const ay = ta.y + ta.height / 2;
  const cy = tc.y + tc.height / 2;
  if (wantStacked) {
    check(Math.abs(ax - cx) < 8, `names share an x center (${ax.toFixed(0)} vs ${cx.toFixed(0)})`);
    check(cy - ay > height * 0.3, `names are stacked apart (${ay.toFixed(0)} then ${cy.toFixed(0)})`);
  } else {
    check(cx - ax > width * 0.3, `names sit side by side (${ax.toFixed(0)} then ${cx.toFixed(0)})`);
    check(Math.abs(ay - cy) < 8, `names share a y center (${ay.toFixed(0)} vs ${cy.toFixed(0)})`);
  }

  // the two halves must cover the viewport between them
  const cover = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const a = box('[data-worth-panel="anchor"]');
    const c = box('[data-worth-panel="challenger"]');
    return {
      a: { x: a.x, y: a.y, w: a.width, h: a.height },
      c: { x: c.x, y: c.y, w: c.width, h: c.height },
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  const covered = wantStacked
    ? cover.a.y <= 1 &&
      Math.abs(cover.a.h + cover.c.h - cover.vh) < 2 &&
      Math.abs(cover.c.y - cover.a.h) < 2 &&
      cover.a.w >= cover.vw - 1
    : cover.a.x <= 1 &&
      Math.abs(cover.a.w + cover.c.w - cover.vw) < 2 &&
      Math.abs(cover.c.x - cover.a.w) < 2 &&
      cover.a.h >= cover.vh - 1;
  check(covered, "the two halves fill the whole viewport, edge to edge");

  const chalText = await page.innerText(p("challenger"));
  check(!chalText.includes(fmtMoney(s0.challenger.cap)), "the challenger keeps its number hidden");
  check((await page.innerText(p("anchor"))).includes(fmtMoney(s0.anchor.cap)), `anchor shows its real worth (${fmtMoney(s0.anchor.cap)})`);
  check(await page.isVisible('[data-worth="more"]'), "worth more button is there");
  check(await page.isVisible('[data-worth="less"]'), "worth less button is there");
  check(
    (await page.innerText('[data-worth="more"]')).trim() === "Worth more" &&
      (await page.innerText('[data-worth="less"]')).trim() === "Worth less",
    "the two buttons read in sentence case",
  );
  check(
    chalText.includes(`Compared with ${anchorName}`),
    `the ask names what you are comparing against (${anchorName})`,
  );
  check(s0.badge === "vs", "the seam badge reads vs while you decide");

  await page.screenshot({ path: `${OUT}${label}-ask.png` });
  console.log(`shot ${label}-ask`);

  // -------------------------------------------------- five right calls

  let shot = false;
  const dealt = [s0.anchor.name];
  for (let round = 0; round < 5; round++) {
    const s = await state();
    dealt.push(s.challenger.name);
    const gap = Math.max(s.anchor.cap, s.challenger.cap) / Math.min(s.anchor.cap, s.challenger.cap);
    check(gap >= 1.2, `round ${round}: the pair is at least 20 percent apart (${gap.toFixed(2)}x)`);
    check(gap >= 5, `round ${round}: the early ramp serves a blowout (${gap.toFixed(2)}x)`);

    const right = s.challenger.cap > s.anchor.cap ? "more" : "less";
    await page.click(`[data-worth="${right}"]`);

    if (!shot) {
      await wait(760);
      const rv = await state();
      check(rv.phase === "reveal", "picking opens the reveal");
      check(rv.badge === "right", "the seam badge turns to a check on a right answer");
      const shown = await page.innerText(p("challenger"));
      check(shown.includes(fmtMoney(rv.challenger.cap)), "the challenger counts up to its real worth");
      const lineText = await page.innerText("[data-worth-line]");
      check(/\d/.test(lineText) && lineText.length > 12, `the reveal carries a scale line (${lineText})`);
      await page.screenshot({ path: `${OUT}${label}-reveal.png` });
      console.log(`shot ${label}-reveal`);
      shot = true;
    }

    await page.waitForFunction(
      (want) => window.__worth?.streak === want && window.__worth?.phase === "ask",
      round + 1,
      { timeout: 9000 },
    );
  }

  const s5 = await state();
  check(s5.streak === 5, `five right calls make a streak of 5 (streak ${s5.streak})`);
  check(new Set(dealt).size === dealt.length, `no company repeats while the deck lasts (${dealt.length} dealt)`);

  // ------------------------------------------------------ sudden death

  const sd = await state();
  const wrong = sd.challenger.cap > sd.anchor.cap ? "less" : "more";
  await page.click(`[data-worth="${wrong}"]`);
  await wait(300);
  check((await state()).badge === "wrong", "the seam badge turns to a cross on a wrong answer");
  await page.waitForSelector('[data-worth="death"]', { timeout: 9000 });
  await wait(500);

  const death = await page.innerText('[data-worth="death"]');
  check(death.includes(sd.anchor.name), `death card names the anchor (${sd.anchor.name})`);
  check(death.includes(sd.challenger.name), `death card names the challenger (${sd.challenger.name})`);
  check(death.includes(fmtMoney(sd.anchor.cap)), `death card shows ${fmtMoney(sd.anchor.cap)}`);
  check(death.includes(fmtMoney(sd.challenger.cap)), `death card shows ${fmtMoney(sd.challenger.cap)}`);
  check(/Streak\s+5/.test(death), "death card shows the run's streak");
  check(/Best\s+\d+/.test(death), "death card shows the best streak");
  check(/You said worth (more|less)/.test(death), "death card says what you picked");

  const share = await page.innerText("[data-worth-share]");
  check(
    /^Worth More streak \d+\. Ended on .+ vs .+\.$/.test(share.trim()),
    `share line reads plain (${share.trim()})`,
  );
  check(share.includes("streak 5"), "share line carries the streak");

  const fits = await page.evaluate(() => {
    const r = document.querySelector('[data-worth="death"]').getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  });
  check(fits, "the death card fits on the screen");

  await page.screenshot({ path: `${OUT}${label}-death.png` });
  console.log(`shot ${label}-death`);

  // ------------------------------------------------------- play again

  await page.click('[data-worth="again"]');
  await page.waitForFunction(
    () => window.__worth?.phase === "ask" && window.__worth?.streak === 0,
    null,
    { timeout: 5000 },
  );
  check(!(await page.isVisible('[data-worth="death"]')), "play again clears the death card");
  const s6 = await state();
  check(s6.best >= 5, `best streak is remembered (best ${s6.best})`);
  // Play again reshuffles into new matchups (only the day's FIRST run is the
  // shared daily deal). Comparing the whole opening pair keeps this stable:
  // one name matching by luck is possible, both is not worth worrying about.
  check(
    s6.anchor.name !== s0.anchor.name || s6.challenger.name !== s0.challenger.name,
    `play again deals new matchups (${s0.anchor.name} vs ${s0.challenger.name} then ${s6.anchor.name} vs ${s6.challenger.name})`,
  );

  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  check(overflow.x <= 1 && overflow.y <= 1, "the board stays on one screen");

  await page.close();
}

await play({ label: "wide", width: 1440, height: 950, wantStacked: false });
await play({ label: "phone", width: 390, height: 844, wantStacked: true });

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nALL CHECKS PASS");
process.exit(failures ? 1 : 0);
