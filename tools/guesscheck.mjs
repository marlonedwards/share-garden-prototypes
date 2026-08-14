// The walk for Guess the Stock, per docs/guess-the-stock-spec.md section 8.
//
// It opens the pinned first puzzle cold, gets one guess wrong, buys two hints
// and checks they came off the ladder in order, solves on an alias, reads the
// reveal, takes the next puzzle, gives up on it, and reloads to prove the
// scorecard is still there. Screenshots land in tools/shots/guess/.
//
// If nothing is serving port 4318 it starts the dev server itself and stops it
// again on the way out.
//
// Run it with: node tools/guesscheck.mjs
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync } from "fs";

const PORT = 4318;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL("./shots/guess/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function alive() {
  try {
    const r = await fetch(BASE, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

let server = null;
if (!(await alive())) {
  console.log("starting the dev server");
  server = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "ignore",
  });
  for (let i = 0; i < 60 && !(await alive()); i++) await wait(500);
  if (!(await alive())) {
    console.log("FAIL  the dev server never came up");
    server.kill();
    process.exit(1);
  }
}

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => {
  console.log("PAGEERROR:", e.message);
  failures++;
});
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE.ERR:", m.text());
});
// every walk starts with an empty scorecard, and the reload later in the walk
// has to find the scorecard still there, so the wipe happens once per tab
await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("walk-began")) return;
    sessionStorage.setItem("walk-began", "1");
    localStorage.removeItem("guess-stats");
    localStorage.removeItem("guess-cursor");
    localStorage.removeItem("guess-settings");
    localStorage.removeItem("guess-shelf");
  } catch (e) {}
});

const shot = async (name) => {
  await page.screenshot({ path: OUT + name });
  console.log("      shot", name);
};

// --------------------------------------------------------------- cold open

await page.goto(`${BASE}/#/guess?p=aapl-2007`);
await wait(700);
check("the panel is there", await page.getByText("guess the stock").isVisible());
check("the pinned puzzle keeps its place in the stream",
  (await page.getByTestId("puzzle-no").innerText()).trim() === "no. 4",
  await page.getByTestId("puzzle-no").innerText());
check("par reads 2", await page.getByText("par 2").isVisible());
check("the chart drew a line", (await page.locator("svg path").count()) >= 2);
check("no hint is spent yet", (await page.getByTestId("revealed").count()) === 0);
check("the scorecard opens empty", (await page.getByTestId("scorecard").innerText()).includes("no puzzles yet"));
check("the axis is in percent", (await page.locator("svg text").allTextContents()).some((t) => t.includes("%")));
check("no dollars before the hint", !(await page.locator("svg text").allTextContents()).some((t) => t.includes("$")));
check("the year is free from the first second",
  (await page.locator("svg text").allTextContents()).filter((t) => t.includes("2007")).length >= 4,
  (await page.locator("svg text").allTextContents()).join(" "));
check("the axis names the months with it",
  (await page.locator("svg text").allTextContents()).some((t) => t.startsWith("jan 2007")));
await shot("01-cold.png");

// ------------------------------------------------------- the typeahead

// one letter is enough to reach a household name through its alias
await page.getByTestId("guess-input").fill("g");
await wait(200);
check("one letter opens the suggestions", (await page.getByTestId("suggestions").count()) === 1);
const oneLetter = await page.getByTestId("suggestion").allInnerTexts();
check("the rows carry a name and a ticker",
  /[A-Za-z].*\b[A-Z]{1,5}\b/.test(oneLetter[0].replace(/\s+/g, " ")), oneLetter[0]);
check("one letter reaches Alphabet", oneLetter.some((t) => t.includes("GOOGL")), oneLetter.join(" | "));
await shot("02-typeahead.png");

await page.getByTestId("guess-input").fill("goo");
await wait(200);
const rows = await page.getByTestId("suggestion").allInnerTexts();
check("the top row is Alphabet", rows[0].includes("Alphabet"), rows[0]);
check("the top row shows the ticker", rows[0].includes("GOOGL"), rows[0]);
check("the top row shows the word typed", rows[0].includes("google"), rows[0]);
check("the list is capped at six", rows.length <= 6, `${rows.length}`);

// garbage can be typed but never submitted
await page.getByTestId("guess-input").fill("zzqqxx");
await wait(200);
check("garbage suggests nothing", (await page.getByTestId("suggestions").count()) === 0);
await page.getByTestId("guess-input").press("Enter");
await wait(200);
check("garbage never becomes a guess", (await page.getByTestId("guessed").count()) === 0);
check("garbage shakes the box",
  (await page.getByTestId("guess-input").getAttribute("class")).includes("guess-shake"));
check("garbage never ends the puzzle", (await page.getByTestId("reveal").count()) === 0);
await shot("03-no-match.png");

// ------------------------------------------------------------ a wrong guess

await page.getByTestId("guess-input").fill("goo");
await wait(200);
await page.getByTestId("guess-input").press("Enter");
await wait(150);
check("the box shakes", (await page.getByTestId("guess-input").getAttribute("class")).includes("guess-shake"));
let guessed = (await page.getByTestId("guessed").innerText()).toLowerCase();
check("the picked company joins the line", guessed.startsWith("guessed:") && guessed.includes("alphabet"), guessed);
check("a wrong guess never ends the puzzle", (await page.getByTestId("reveal").count()) === 0);

// arrow keys and enter pick a row further down
await page.getByTestId("guess-input").fill("ford");
await wait(200);
await page.getByTestId("guess-input").press("ArrowDown");
await wait(120);
await page.getByTestId("guess-input").press("Enter");
await wait(200);
guessed = (await page.getByTestId("guessed").innerText()).toLowerCase();
check("the arrow key pick joins the line", guessed.includes("ford"), guessed);
await wait(300);
await shot("04-wrong.png");

// ----------------------------------------------------------- easy mode

check("easy mode starts off",
  (await page.getByTestId("easy-toggle").innerText()).trim() === "easy mode: off",
  await page.getByTestId("easy-toggle").innerText());
check("no tags while it is off", (await page.getByTestId("sector-tag").count()) === 0);

await page.getByTestId("easy-toggle").click();
await wait(250);
check("easy mode reads on",
  (await page.getByTestId("easy-toggle").innerText()).trim() === "easy mode: on",
  await page.getByTestId("easy-toggle").innerText());
const tags = await page.getByTestId("sector-tag").allInnerTexts();
check("every wrong guess carries a tag", tags.length === 2, tags.join(" | "));
check("a technology guess on a technology year reads same", tags[0].includes("same sector"), tags[0]);
check("a carmaker on a technology year reads different", tags[1].includes("different sector"), tags[1]);
await shot("05-easy-mode.png");

await page.getByTestId("easy-toggle").click();
await wait(250);
check("turning it off takes the tags away", (await page.getByTestId("sector-tag").count()) === 0);
await page.getByTestId("easy-toggle").click();
await wait(250);
check("easy mode is back on for the reveal", (await page.getByTestId("sector-tag").count()) === 2);

// ------------------------------------------------------------- two hints

await page.getByTestId("hint").click();
await wait(250);
const hintLines = async () =>
  (await page.getByTestId("revealed").locator("div").allInnerTexts()).map((t) =>
    t.replace(/\s+/g, " ").trim(),
  );
let lines = await hintLines();
check("the first hint is widen", lines[0].startsWith("> widen"), lines.join(" | "));
check("widening added days either side", (await page.locator("svg rect").count()) >= 1);
await shot("06-hint-widen.png");

await page.getByTestId("hint").click();
await wait(250);
lines = await hintLines();
check("the second hint is sector", lines[1].startsWith("> sector"), lines.join(" | "));
check("the sector is technology", lines[1].includes("technology"), lines[1]);
check("the ladder is four pips wide", (await page.getByTestId("pips").locator("i").count()) === 4);
await shot("07-hint-sector.png");

// -------------------------------------------------------- solve on an alias

await page.getByTestId("guess-input").fill("apple computer");
await wait(200);
const solveRows = await page.getByTestId("suggestion").allInnerTexts();
check("the alias finds Apple", solveRows[0].includes("Apple") && solveRows[0].includes("AAPL"), solveRows[0]);
await page.getByTestId("guess-input").press("Enter");
await wait(500);
check("the reveal opened", (await page.getByTestId("reveal").count()) === 1);
const reveal = await page.getByTestId("reveal").innerText();
check("the reveal names the company", reveal.includes("Apple"), reveal.split("\n")[0]);
check("the reveal gives the year", reveal.includes("2007"));
check("the reveal tells the story", (await page.getByTestId("story").innerText()).includes("iPhone"));
check("the result line counts the hints",
  (await page.getByTestId("result").innerText()).trim() === "solved with 2 hints, at par",
  await page.getByTestId("result").innerText());
const axis = await page.locator("svg text").allTextContents();
check("the chart relabels to dollars", axis.some((t) => t.includes("$")), axis.join(" "));
check("the chart relabels to the real year", axis.some((t) => t.includes("2007")), axis.join(" "));
check("the scorecard counted the solve",
  (await page.getByTestId("scorecard").innerText()).includes("solved 1 of 1"),
  await page.getByTestId("scorecard").innerText());
await shot("08-reveal.png");

// ------------------------------------------------------------- next puzzle

await page.getByTestId("next").click();
await wait(600);
check("next deals a different puzzle", (await page.getByTestId("puzzle-no").innerText()).trim() !== "no. 4",
  await page.getByTestId("puzzle-no").innerText());
check("the new puzzle is unsolved", (await page.getByTestId("guess-input").count()) === 1);
check("the new puzzle spent no hints", (await page.getByTestId("revealed").count()) === 0);
check("the new puzzle has no guesses", (await page.getByTestId("guessed").count()) === 0);
check("the new puzzle hides the price again",
  !(await page.locator("svg text").allTextContents()).some((t) => t.includes("$")));
check("the new puzzle still gives its year away",
  (await page.locator("svg text").allTextContents()).some((t) => /\b(19|20)\d{2}\b/.test(t)));
await shot("09-next.png");

// --------------------------------------------------------------- giving up

await page.getByTestId("give-up").click();
await wait(500);
check("giving up reveals the answer", (await page.getByTestId("result").innerText()).trim() === "revealed",
  await page.getByTestId("result").innerText());
const after = await page.getByTestId("scorecard").innerText();
check("the fail counted", after.includes("solved 1 of 2"), after);
check("the fail broke the streak", after.includes("streak 0"), after);
await shot("10-give-up.png");

// ---------------------------------------------------------- the collection

await page.getByTestId("collection-open").click();
await wait(400);
check("the collection opens", (await page.getByTestId("collection").count()) === 1);
const cards = page.getByTestId("shelf-card");
check("the shelf holds the whole pool", (await cards.count()) === 30, `${await cards.count()}`);
check("the solved puzzle filled in",
  (await page.locator('[data-testid="shelf-card"][data-mark="solved"]').count()) === 1);
check("the revealed puzzle is marked as revealed",
  (await page.locator('[data-testid="shelf-card"][data-mark="revealed"]').count()) === 1);
check("everything else is still a silhouette",
  (await page.locator('[data-testid="shelf-card"][data-mark="locked"]').count()) === 28,
  `${await page.locator('[data-testid="shelf-card"][data-mark="locked"]').count()}`);

const solvedCard = await page.locator('[data-testid="shelf-card"][data-mark="solved"]').innerText();
check("the solved card names the company", solvedCard.includes("Apple") && solvedCard.includes("AAPL"),
  solvedCard.replace(/\n/g, " "));
check("the solved card carries the story", solvedCard.includes("iPhone"), solvedCard.replace(/\n/g, " "));
const revealedCard = await page.locator('[data-testid="shelf-card"][data-mark="revealed"]').innerText();
check("the revealed card says revealed", revealedCard.includes("revealed"), revealedCard.replace(/\n/g, " "));

const locked = await page.locator('[data-testid="shelf-card"][data-mark="locked"]').first().innerText();
check("a silhouette gives away nothing but its year", /^no\. \d+ (19|20)\d{2}$/.test(locked.replace(/\s+/g, " ").trim()),
  locked.replace(/\n/g, " "));
check("the shelf line counts the pool",
  (await page.getByTestId("shelf-line").innerText()).includes("1 solved . 1 revealed . 30 in the pool"),
  await page.getByTestId("shelf-line").innerText());
await shot("11-collection.png");

await page.keyboard.press("Escape");
await wait(300);
check("escape returns to the puzzle", (await page.getByTestId("collection").count()) === 0);
check("the puzzle is where it was left", (await page.getByTestId("reveal").count()) === 1);

// ------------------------------------------------------------- the reload

await page.reload();
await wait(700);
const reloaded = await page.getByTestId("scorecard").innerText();
check("the scorecard survived the reload", reloaded === after, `${after} then ${reloaded}`);
await page.getByTestId("collection-open").click();
await wait(350);
check("the shelf survived the reload",
  (await page.getByTestId("shelf-line").innerText()).includes("1 solved . 1 revealed"),
  await page.getByTestId("shelf-line").innerText());
await page.getByTestId("collection-close").click();
await wait(250);
check("the back control closes the collection", (await page.getByTestId("collection").count()) === 0);
check("easy mode survived the reload",
  (await page.getByTestId("easy-toggle").innerText()).trim() === "easy mode: on",
  await page.getByTestId("easy-toggle").innerText());
await shot("12-reload.png");

// ------------------------------------------------------------ the landing

await page.goto(`${BASE}/#/`);
await wait(600);
const firstCard = await page.locator("a[href='#/guess']").first();
check("the landing leads with the game", await firstCard.isVisible());
check("the landing card names it", (await firstCard.innerText()).includes("Guess the Stock"));
await shot("13-landing.png");

await browser.close();
if (server) server.kill();
console.log(failures === 0 ? "\nwalk passes" : `\n${failures} checks failed`);
process.exit(failures === 0 ? 0 : 1);
