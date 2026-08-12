// The Tally, sprint one build order C: the piggy and the chapter 1 tutorial.
//
// It checks the five things this build order has to get right:
//   the menu idles a piggy, and it is the pixel sprite and not a picture
//   the Tutorial button plays chapter 1 with all nine bubbles, in order
//   a tap anywhere moves the script on once the sentence has been read, and so
//     does the action it points at
//   Skip the tour dismisses the whole thing and remembers that it did
//   a second run at chapter 1 has no piggy in it, and chapter 2 never does
//
// Round seven put three gates on the script, and this harness plays by them:
// an informational beat ignores a tap for the length of its own fade, payday
// stands until the blocks have landed, and the Play beat is finished by the
// Play key and by nothing else. tools/tallyR7.mjs is where those three are
// tested on their own terms; here they are simply how the tour is walked.
//
// Usage: node tools/tallyC.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) fails.push(label);
}

// The script, verbatim, in the order the game actually happens in.
const SCRIPT = [
  ["hello", "I am your piggy bank, and this chapter is just you and me."],
  ["payday", "Payday puts two blocks into your pocket every week."],
  ["counter", "There is nothing to buy yet, because first money has to exist."],
  ["money", "Every green block is five real dollars of yours."],
  ["wall", "The wall is the record of what your money is worth, one column for every week."],
  ["target", "That gold line is the target, and finishing above it clears the chapter."],
  ["play", "The Play key runs the next week, and the wall writes down what happened."],
  ["read", "A pile that does nothing does not grow, and a week has just passed."],
  ["week-two", "Payday comes again every week, so the only thing that changes here is what you were paid."],
  ["week-three", "Nothing in this chapter can go wrong, and nothing in it grows on its own."],
  ["week-four", "Every week you play is one more column the wall keeps for good."],
  ["week-five", "The gold line has not moved, because a target is a fact about the chapter and not about you."],
  ["week-last", "This is the last week of the chapter, and then we count it up."],
  ["cleared", "You cleared it, and chapter 2 opens the bank."],
];

// The dwell, from Tutorial.tsx, plus a margin: a tap sooner than this is a tap
// the script is supposed to ignore.
const DWELL = 600;

const browser = await chromium.launch();

async function bubble(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-tutorial]");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute("data-tutorial"),
      pose: el.getAttribute("data-tutorial-pose"),
      say: (el.querySelector("[data-tutorial-say]")?.textContent ?? "").trim(),
      box: { x: r.left, y: r.top, w: r.width, h: r.height },
    };
  });
}

// A tap on a part of the board that does nothing of its own, which is what the
// script says moves it on. It waits out the dwell first, because a tap sooner
// than that is a tap the script is built to ignore.
async function tap(page, { dwell = true } = {}) {
  if (dwell) await wait(DWELL + 160);
  const at = await page.evaluate(() => {
    const wall = document.querySelector('[data-view="table"] [data-wall="1"]');
    const shop = document.querySelector('[data-shop="open"]');
    const el = shop && shop.getAttribute("data-shop") === "open" ? shop : wall;
    const r = (el ?? document.querySelector('[data-body="1"]')).getBoundingClientRect();
    return { x: r.left + r.width * 0.72, y: r.top + r.height * 0.5 };
  });
  await page.mouse.click(at.x, at.y);
  await wait(240);
}

// Nothing the tutorial draws may hang off the board, which is the same rule
// build order B put on every other panel.
async function inside(page, label) {
  const bad = await page.evaluate(() => {
    const b = document.querySelector('[data-board="tally"]').getBoundingClientRect();
    const out = [];
    for (const el of document.querySelectorAll("[data-tutorial], [data-tutorial] *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const over =
        Math.max(0, b.left - r.left) + Math.max(0, r.right - b.right) +
        Math.max(0, b.top - r.top) + Math.max(0, r.bottom - b.bottom);
      if (over > 2) out.push(`${el.tagName} over ${over.toFixed(0)}`);
    }
    return out;
  });
  check(bad.length === 0, `${label}: the bubble stays on the board`, bad.join(" | "));
}

async function open(reduced = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror"); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);
  await wait(600);
  return { ctx, page };
}

// Plays chapter 1 to its summary, letting the script speak wherever it speaks.
// Returns the ids it saw, in the order it saw them.
async function playChapterOne(page, { shots = false, tapEvery = true } = {}) {
  const seen = [];
  const note = async () => {
    const b = await bubble(page);
    if (b && seen[seen.length - 1] !== b.id) seen.push(b.id);
    return b;
  };

  // the chapter card
  let b = await note();
  check(b?.id === "hello", "the chapter card opens with the piggy", JSON.stringify(b?.say ?? null));
  check(b?.say === SCRIPT[0][1], "the first sentence is the script's own", b?.say ?? "");
  check(await page.locator('[data-tutorial-skip="1"]').count() === 1,
    "the first bubble carries the way out");
  await inside(page, "the chapter card");

  // the action it points at is the press that moves it on
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(1100);
  b = await note();
  check(b?.id === "payday", "Begin moves the script to the shop", b?.id ?? "none");
  check(b?.say === SCRIPT[1][1], "payday says what payday is", b?.say ?? "");
  check(b?.pose === "up", "the piggy points up at the money it just named", b?.pose ?? "");
  check(await page.locator('[data-tutorial-skip="1"]').count() === 0,
    "the way out is on the first bubble only");
  await inside(page, "the shop");

  if (tapEvery) await tap(page);
  b = await note();
  check(b?.id === "counter", "a tap moves the script on inside the shop", b?.id ?? "none");
  check(b?.say === SCRIPT[2][1], "the empty counter is named, not excused", b?.say ?? "");

  // back to the table
  await page.locator('[data-shop-close="1"]').click();
  await wait(700);
  b = await note();
  check(b?.id === "money", "the table opens on the money row", b?.id ?? "none");
  check(b?.say === SCRIPT[3][1], "a block is named in dollars", b?.say ?? "");
  check(b?.pose === "down", "the piggy points down at the row under it", b?.pose ?? "");
  await inside(page, "the money row");

  await tap(page);
  b = await note();
  check(b?.id === "wall", "the wall comes next", b?.id ?? "none");
  check(b?.say === SCRIPT[4][1], "the wall is named as a record", b?.say ?? "");
  if (shots) await page.screenshot({ path: OUT + "tally-c2-bubble-wall.png" });
  await inside(page, "the wall");

  await tap(page);
  b = await note();
  check(b?.id === "target", "the gold line comes next", b?.id ?? "none");
  check(b?.say === SCRIPT[5][1], "the target is named as the target", b?.say ?? "");
  await inside(page, "the gold line");

  await tap(page);
  b = await note();
  check(b?.id === "play", "the Play key is named before it is needed", b?.id ?? "none");
  check(b?.say === SCRIPT[6][1], "the key is named rather than pressed for", b?.say ?? "");
  check(await page.locator('[data-play="1"][data-invite="1"]').count() === 1,
    "and the key it names is the one wearing the invitation");
  await inside(page, "the Play key");

  // the one beat a tap anywhere cannot spend: only its own press finishes it,
  // and that press plays the week as well
  await tap(page);
  check((await bubble(page))?.id === "play", "a tap anywhere leaves the Play beat standing");
  await page.locator('[data-play="1"]').click();
  await wait(2600);

  // the first scoring, then the read beat
  b = await note();
  check(b?.id === "read", "the read beat is where the piggy speaks next", b?.id ?? "none");
  check(b?.say === SCRIPT[7][1], "a pile that does nothing is named", b?.say ?? "");
  await inside(page, "the read line");

  // and then the piggy stays for the rest of the chapter, one week at a time
  await tap(page);
  b = await note();
  check(b?.id === "week-two", "the piggy stays for the second week", b?.id ?? "none");
  check(b?.say === SCRIPT[8][1], "and says what a week here changes", b?.say ?? "");
  check(await page.locator('[data-play="1"][data-invite="1"]').count() === 1,
    "the key wears the invitation again");
  check((await page.locator("[data-spotlight]").count()) === 0,
    "and the board keeps its own light from the second week on");

  // the rest of chapter 1
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: "Continue", exact: true }).count()) break;
    const play = page.locator('[data-play="1"]');
    if ((await play.count()) && (await play.isEnabled())) {
      await play.click();
      await wait(2200);
      const mid = await bubble(page);
      if (mid && seen[seen.length - 1] !== mid.id) seen.push(mid.id);
      continue;
    }
    const close = page.locator('[data-shop-close="1"]');
    if (await page.evaluate(() => document.querySelector("[data-shop]")?.getAttribute("data-shop") === "open")) {
      await close.click();
      await wait(500);
      continue;
    }
    await wait(300);
  }

  b = await note();
  check(b?.id === "cleared", "the summary is the piggy's last word", b?.id ?? "none");
  check(b?.say === SCRIPT[13][1], "the last sentence names what opens next", b?.say ?? "");
  check(b?.pose === "celebrate", "and it celebrates", b?.pose ?? "");

  // the lesson, which is the thing the chapter was for and is therefore the
  // loudest thing on the screen the chapter ends on
  const lesson = await page.evaluate(() => {
    const box = document.querySelector('[data-overlay="1"]');
    const el = [...(box?.querySelectorAll("div") ?? [])]
      .find((d) => d.textContent?.trim().startsWith("A pile of money is a countable"));
    if (!el) return null;
    const heading = [...(box?.querySelectorAll("div") ?? [])]
      .find((d) => /^Chapter \d+ (cleared|finished)$/.test(d.textContent?.trim() ?? ""));
    return {
      say: el.textContent.trim(),
      size: parseFloat(getComputedStyle(el).fontSize),
      headingSize: heading ? parseFloat(getComputedStyle(heading).fontSize) : 0,
    };
  });
  check(!!lesson, "the chapter's own lesson is on the screen it ends on", lesson?.say ?? "missing");
  check((lesson?.size ?? 0) >= 18, "and it is set at a size a person reads rather than skims",
    `${lesson?.size}px`);
  check((lesson?.headingSize ?? 0) >= 22, "under a heading that is a heading", `${lesson?.headingSize}px`);
  if (shots) await page.screenshot({ path: OUT + "tally-c2-celebrate.png" });
  await inside(page, "the summary");

  await tap(page);
  check((await bubble(page)) === null, "the last tap puts the piggy away");
  const done = await page.evaluate(() => localStorage.getItem("tally-tour-v1"));
  check(done === "1", "finishing the script is remembered", String(done));

  return seen;
}

// ------------------------------------------------------------- the sessions

console.log("\n--------------------------------------------- the menu piggy");
{
  const { ctx, page } = await open();
  const piggy = await page.evaluate(() => {
    const el = document.querySelector('[data-screen="menu"] [data-piggy]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      pose: el.getAttribute("data-piggy"),
      tag: el.tagName.toLowerCase(),
      rects: el.querySelectorAll("rect").length,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
  check(!!piggy && piggy.pose === "idle", "the menu idles a piggy", JSON.stringify(piggy));
  check(!!piggy && piggy.tag === "svg" && piggy.rects > 60,
    "and it is hand built pixels rather than a picture", `${piggy?.rects} rects`);
  check(!!piggy && piggy.w >= 60 && piggy.w === piggy.h, "it is square and readable at menu size",
    `${piggy?.w}x${piggy?.h}`);
  const external = await page.evaluate(() =>
    [...document.querySelectorAll("img, image")].filter((el) => /piggy/i.test(el.getAttribute("src") ?? el.getAttribute("href") ?? "")).length);
  check(external === 0, "no image file was added to the game", String(external));
  await page.screenshot({ path: OUT + "tally-c2-piggy-menu.png" });
  await ctx.close();
}

console.log("\n------------------------------------------- the whole script");
{
  const { ctx, page } = await open();
  await page.locator('[data-menu="tutorial"]').click();
  await wait(700);
  const seen = await playChapterOne(page, { shots: true });
  check(
    seen.join(",") === SCRIPT.map(([id]) => id).join(","),
    "every beat played, in order, and none twice",
    seen.join(","),
  );

  // and now it is over: a second run at chapter 1 has no piggy in it
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await wait(800);
  await page.locator('[data-strip-menu="1"]').click();
  await wait(400);
  await page.locator('[data-menu="new"]').click();
  await wait(800);
  check((await bubble(page)) === null, "a second run at chapter 1 shows no piggy");
  await ctx.close();
}

console.log("\n------------------------------------------------ the way out");
{
  const { ctx, page } = await open();
  await page.locator('[data-menu="new"]').click();
  await wait(800);
  let b = await bubble(page);
  check(b?.id === "hello", "a new run at chapter 1 starts the tour", b?.id ?? "none");
  await page.locator('[data-tutorial-skip="1"]').click();
  await wait(300);
  check((await bubble(page)) === null, "Skip the tour dismisses the whole thing");
  const done = await page.evaluate(() => localStorage.getItem("tally-tour-v1"));
  check(done === "1", "skipping is remembered", String(done));

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(1000);
  check((await bubble(page)) === null, "and it stays gone for the rest of the run");

  // a fresh page with nothing but the flag on it: still gone, so the memory is
  // the flag itself and not anything the live run was carrying
  await page.addInitScript(() => { try { localStorage.setItem("tally-tour-v1", "1"); } catch (e) {} });
  await page.reload();
  await wait(700);
  await page.locator('[data-menu="new"]').click();
  await wait(800);
  check((await bubble(page)) === null, "the flag outlives the run it was set in");
  await ctx.close();
}

console.log("\n-------------------------------------------- chapters two up");
{
  const { ctx, page } = await open();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tally-box-v1", JSON.stringify({
        clearedChapters: [1, 2, 3], instruments: [], badges: [], eraBest: {},
      }));
    } catch (e) {}
  });
  await page.reload();
  await wait(700);
  await page.locator('[data-menu="chapters"]').click();
  await wait(400);
  await page.locator('[data-chapter-start="2"]').click();
  await wait(900);
  check((await bubble(page)) === null, "chapter 2 has no piggy in it");
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(1200);
  check((await bubble(page)) === null, "and none in its shop either");
  const anyPiggy = await page.locator("[data-piggy]").count();
  check(anyPiggy === 0, "the piggy is nowhere on the board outside chapter 1", String(anyPiggy));
  await ctx.close();
}

console.log("\n--------------------------------------------- reduced motion");
{
  const { ctx, page } = await open(true);
  await page.locator('[data-menu="tutorial"]').click();
  await wait(700);
  const still = await page.evaluate(() => {
    const el = document.querySelector("[data-piggy]");
    return el ? getComputedStyle(el).animationName : "missing";
  });
  check(still === "none", "the piggy holds still under reduced motion", still);
  const seen = await playChapterOne(page, { shots: false });
  check(
    seen.join(",") === SCRIPT.map(([id]) => id).join(","),
    "the whole tutorial still plays under reduced motion",
    seen.join(","),
  );
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
