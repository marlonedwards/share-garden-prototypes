import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const VP = process.argv[2] === "m"
  ? { width: 390, height: 844 }
  : { width: 1280, height: 720 };
const TAG = process.argv[2] === "m" ? "m" : "d";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VP, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

const problems = [];

async function audit(label) {
  const r = await page.evaluate((vph) => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const cont = [...document.querySelectorAll("main button")]
      .filter((b) => /^(Continue|Finish)$/.test(b.textContent.trim()) && vis(b));
    const cb = cont[0]?.getBoundingClientRect();
    // white cards inside the currently displayed screen
    const cards = [...document.querySelectorAll("main .rounded-2xl")].filter(vis);
    return {
      step: document.querySelector("main span.tnum")?.textContent ?? "?",
      contCount: cont.length,
      contLabel: cont[0]?.textContent.trim(),
      contDisabled: cont[0]?.disabled ?? null,
      contBottom: cb ? Math.round(cb.bottom) : null,
      contInView: cb ? cb.bottom <= vph + 0.5 && cb.top >= 0 : false,
      cards: cards.length,
      pageScrollY: document.documentElement.scrollHeight - window.innerHeight,
      docH: document.documentElement.scrollHeight,
      defs: [...document.querySelectorAll("main p")].filter(vis).length,
    };
  }, VP.height);
  if (r.contCount !== 1) problems.push(`${TAG} ${label}: ${r.contCount} visible Continue buttons`);
  if (!r.contInView) problems.push(`${TAG} ${label} (${r.step}): Continue NOT in viewport (bottom=${r.contBottom}, vh=${VP.height}, docH=${r.docH})`);
  if (r.cards > 1) problems.push(`${TAG} ${label} (${r.step}): ${r.cards} visible cards`);
  if (r.docH > VP.height + 1) problems.push(`${TAG} ${label} (${r.step}): page scrolls, docH=${r.docH} vs vh=${VP.height}`);
  console.log(TAG, label, JSON.stringify(r));
  await page.screenshot({ path: `${OUT}vfy-stocks-${TAG}-${label}.png` });
  return r;
}

const cont = () => page.locator("main div:not(.hidden) > div > button", { hasText: /^(Continue|Finish)$/ }).first();
const btn = (re) => page.locator("main div:not(.hidden) button", { hasText: re }).first();

await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(800);

// screen 1
await audit("s1-pre");
if (await cont().isEnabled()) problems.push(`${TAG} s1: Continue enabled before interaction`);
await btn(/Buy 1 share/).click(); await wait(200);
await audit("s1-post");
await cont().click(); await wait(300);

// screen 2
await audit("s2-pre");
await btn(/whoever sold the share/).click(); await wait(200);
await audit("s2-post");
await cont().click(); await wait(300);

// screen 3
await audit("s3-pre");
await page.locator("main div:not(.hidden) input[type=range]").first().fill("15"); await wait(200);
await audit("s3-post");
await cont().click(); await wait(300);

// screen 4
await audit("s4-pre");
for (let i = 0; i < 3; i++) { await btn(/A buyer walks up/).click(); await wait(100); }
await btn(/An owner wants out/).click(); await wait(200);
const crowd = await page.locator("main div:not(.hidden)").first().innerText();
if (!/\$12/.test(crowd)) problems.push(`${TAG} s4: expected $12 after 3 buyers 1 seller, got: ${crowd.replace(/\n/g, " | ")}`);
await audit("s4-post");
await cont().click(); await wait(300);

// screen 5
await audit("s5-pre");
await btn(/A year passes/).click(); await wait(200);
await audit("s5-post");
await cont().click(); await wait(300);

// screen 6
await audit("s6-pre");
for (const t of [/Sell the piece/, /Vote when the stand/, /Pour a free lemonade/, /Order Maya/]) {
  await btn(t).click(); await wait(120);
}
await audit("s6-post");
await cont().click(); await wait(300);

// ---- state persistence: in-lesson back to s3 and s4, then forward
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(250);
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(250);
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(250);
const s3txt = await page.locator("main div:not(.hidden)").first().innerText();
if (!/\$15/.test(s3txt)) problems.push(`${TAG} back-to-s3: slider state lost, text: ${s3txt.replace(/\n/g, " | ")}`);
await audit("back-s3");
// browser back/forward
await page.goBack(); await wait(300);
await page.goForward(); await wait(300);
const afterFwd = await page.locator("main span.tnum").first().innerText();
console.log(TAG, "after browser back/forward step:", afterFwd);
await audit("browser-fwd");

// jump straight back to the last screen via URL
await page.goto(`${BASE}/#/orb/learn/stocks?step=7`); await wait(500);
const s7 = await page.locator("main span.tnum").first().innerText();
if (!/Step 7/.test(s7)) problems.push(`${TAG} url-jump: ?step=7 landed on "${s7}"`);
await audit("s7-check-pre");
// answer check 1 correctly
await btn(/The same 1 of 100 pieces/).click(); await wait(250);
await audit("s7-check-post");
await cont().click(); await wait(300);
await audit("s8-pre");
// answer check 2 WRONG
await btn(/The bank posts a fresh number/).click(); await wait(250);
await audit("s8-wrong");
await cont().click(); await wait(300);
await audit("s9-pre");
await btn(/\$2\.00 in cash/).click(); await wait(250);
await audit("s9-post");

// marbles
const guide = await page.evaluate(() => JSON.parse(localStorage.getItem("field-guide") ?? "{}"));
console.log(TAG, "field-guide:", JSON.stringify(guide));
if (!(guide.cleared ?? []).includes("share")) problems.push(`${TAG} marble "share" not cleared after correct answer`);
if (!(guide.cloudy ?? []).includes("market-price")) problems.push(`${TAG} marble "market-price" not cloudy after wrong answer`);
if (!(guide.cleared ?? []).includes("dividend")) problems.push(`${TAG} marble "dividend" not cleared`);

// retry protection: step back to the wrong check, is it re-answerable?
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
const retry = await page.evaluate(() => {
  const scr = [...document.querySelectorAll("main > div")].find((d) => !d.classList.contains("hidden") && d.querySelector(".rounded-2xl"));
  return [...(scr?.querySelectorAll(".rounded-2xl button") ?? [])].map((b) => b.disabled);
});
console.log(TAG, "back-to-wrong-check disabled flags:", JSON.stringify(retry));
if (retry.some((d) => d === false)) problems.push(`${TAG} answered check is re-answerable after stepping back`);
await audit("back-wrong-check");

// finish
await page.goto(`${BASE}/#/orb/learn/stocks?step=9`); await wait(400);
const beta = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log(TAG, "beta-checks:", beta);

console.log("\n=== ERRORS ===\n" + (errs.join("\n") || "(none)"));
console.log("\n=== PROBLEMS ===\n" + (problems.join("\n") || "(none)"));
await browser.close();
