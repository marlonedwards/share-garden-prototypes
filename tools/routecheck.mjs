// Final route sweep (docs/overnight-plan.md, W7): visit every route the
// router declares, plus every id each parameterised route accepts, and hold
// each one to the same bar: no page error, no console error, real rendered
// text on screen, and no blank page. Also checks that the catch-all sends an
// unknown URL home rather than rendering nothing.
//
// Run: ORB_BASE=http://localhost:4318 node tools/routecheck.mjs
// Exits 1 on any failure.
import { chromium } from "playwright";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";

const ERAS = ["dotcom", "payday", "gfc", "crypto", "covid", "inflation"];
const LESSONS = ["cash", "savings", "stocks", "funds", "coins"];
const ALIASES = ["share", "fund", "coin"];

const ROUTES = [
  "/",
  "/pulse",
  "/prism",
  "/garden",
  "/garden-old",
  "/orb",
  "/orb/tutorial",
  "/orb/era",
  "/orb/free",
  "/orb/guide",
  "/orb/ready",
  "/orb/learn",
  "/orb/mini",
  "/objectives",
  "/archive",
  ...ERAS.map((id) => `/orb/s/${id}`),
  ...ERAS.map((id) => `/orb/brief/${id}`),
  ...LESSONS.map((id) => `/orb/learn/${id}`),
  ...ALIASES.map((id) => `/orb/mini/${id}`),
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });

let failures = 0;
const fail = (msg) => { console.log("FAIL:", msg); failures++; };

let current = "(none)";
page.on("pageerror", (e) => fail(`${current}: pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") fail(`${current}: console.error: ${m.text().slice(0, 160)}`);
});

for (const route of ROUTES) {
  current = route;
  await page.goto(`${BASE}/#${route}`);
  await wait(700);
  const text = (await page.locator("body").innerText()).trim();
  const hash = await page.evaluate(() => location.hash);
  if (text.length < 40) fail(`${route}: rendered only ${text.length} chars of text`);
  else console.log(`ok   ${route} -> ${hash} (${text.length} chars)`);
}

// The catch-all must land on the landing page, never a blank screen.
current = "/does-not-exist";
await page.goto(`${BASE}/#/does-not-exist`);
await wait(700);
const hash = await page.evaluate(() => location.hash);
if (hash !== "#/") fail(`unknown route landed on ${hash}, expected #/`);
else console.log("ok   unknown route redirects home");

console.log(failures === 0 ? `\nAll ${ROUTES.length + 1} routes passed.` : `\n${failures} failure(s).`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
