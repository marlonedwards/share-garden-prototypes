// The walk for Guess the Stock, per docs/guess-the-stock-spec.md section 8.
//
// The game opens in easy mode, so the walk does too: six real names under the
// chart, one of them right. It picks a wrong one and watches it grey out and
// take a pip, buys the widen hint and the sector hint and watches the sector
// hint rule a name out, picks the answer, and reads the reveal. Then it spends
// a whole budget on wrong names to prove the puzzle ends when there is nothing
// left to spend, switches to hard mode for the typeahead and the sector tags
// that are simply always on there, opens the collection to read how each card
// went, and reloads to prove none of it was only in memory.
//
// The shelf is seeded with an entry in the shape the collection used to be
// written in, and the settings with the flag they used to be written in, so the
// walk also proves a player who was here before the two modes existed comes
// back to a game rather than a blank page.
//
// It serves the site itself: port 4318 if something is already there, and its
// own vite preview on the next port up if not, which it stops on the way out.
//
// Run it with: node tools/guesscheck.mjs
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync } from "fs";

const MAIN = 4318;
const OUT = new URL("./shots/guess/", import.meta.url).pathname;
const ROOT = new URL("..", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function alive(port) {
  try {
    const r = await fetch(`http://localhost:${port}`, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

// somebody else's dev server is never touched, so when 4318 is quiet the walk
// builds and serves its own copy one port up and leaves 4318 alone
let server = null;
let port = MAIN;
if (!(await alive(MAIN))) {
  port = MAIN + 1;
  console.log(`nothing on ${MAIN}, serving the built site on ${port}`);
  await new Promise((resolve, reject) => {
    const build = spawn("npm", ["run", "build"], { cwd: ROOT, stdio: "ignore" });
    build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("build failed"))));
  });
  server = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
  });
  for (let i = 0; i < 60 && !(await alive(port)); i++) await wait(500);
  if (!(await alive(port))) {
    console.log("FAIL  the preview server never came up");
    server.kill();
    process.exit(1);
  }
}
const BASE = `http://localhost:${port}`;

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
// every walk starts from the same place, and the reloads later in the walk have
// to find that place still there, so the seeding happens once per tab
await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("walk-began")) return;
    sessionStorage.setItem("walk-began", "1");
    localStorage.removeItem("guess-stats");
    localStorage.removeItem("guess-cursor");
    // the shapes the game used to write: a bare mark on the shelf, and an easy
    // mode flag that was off by default
    localStorage.setItem("guess-shelf", JSON.stringify({ "ko-1985": "solved", "wmt-1999": "revealed" }));
    localStorage.setItem("guess-settings", JSON.stringify({ easy: true }));
  } catch (e) {}
});

const shot = async (name) => {
  await page.screenshot({ path: OUT + name });
  console.log("      shot", name);
};

const optionNames = async () => (await page.getByTestId("option").allInnerTexts()).map((t) => t.trim());
const optionState = async (ticker) =>
  await page.locator(`[data-testid="option"][data-ticker="${ticker}"]`).getAttribute("data-state");
const spentPips = async () => await page.locator('[data-testid="pips"] i[data-spent="yes"]').count();
const hintLines = async () =>
  (await page.getByTestId("revealed").locator("div").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());

// --------------------------------------------------------------- cold open

await page.goto(`${BASE}/#/guess?p=aapl-2007`);
await wait(700);
check("the panel is there", await page.getByText("Guess the Stock").isVisible());
check("the pinned puzzle keeps its place in the stream",
  (await page.getByTestId("puzzle-no").innerText()).trim() === "Puzzle 4",
  await page.getByTestId("puzzle-no").innerText());
check("par reads 2", (await page.getByTestId("ladder").innerText()).includes("par 2"),
  await page.getByTestId("ladder").innerText());
check("the pip row says how many hints are spent, in words",
  (await page.getByTestId("ladder").innerText()).replace(/\s+/g, " ").trim() === "No hints used, par 2",
  await page.getByTestId("ladder").innerText());
check("the chart drew a line", (await page.locator("svg path").count()) >= 2);
check("no pip is spent yet", (await spentPips()) === 0);
check("the ladder is four pips wide", (await page.getByTestId("pips").locator("i").count()) === 4);
check("no hint is spent yet", (await page.getByTestId("revealed").count()) === 0);
check("the scorecard opens empty", (await page.getByTestId("scorecard").innerText()).includes("No puzzles yet"));
check("the axis is in percent", (await page.locator("svg text").allTextContents()).some((t) => t.includes("%")));
check("no dollars before the hint", !(await page.locator("svg text").allTextContents()).some((t) => t.includes("$")));
check("the year is free from the first second",
  (await page.locator("svg text").allTextContents()).filter((t) => t.includes("2007")).length >= 4,
  (await page.locator("svg text").allTextContents()).join(" "));
check("the axis names the months with it",
  (await page.locator("svg text").allTextContents()).some((t) => t.startsWith("Jan 2007")));

// the old settings shape is on the key, and nobody lands in hard mode over it
check("the old stored setting reads as easy",
  (await page.getByTestId("mode-toggle").innerText()).replace(/\s+/g, " ").trim() === "Easy mode",
  await page.getByTestId("mode-toggle").innerText());
check("easy opens with no box to type in", (await page.getByTestId("guess-input").count()) === 0);

const opened = await optionNames();
check("six names are offered", opened.length === 6, `${opened.length}`);
check("the answer is among them", opened.includes("Apple"), opened.join(" | "));
check("the buttons carry the name and nothing else",
  opened.every((t) => /^[A-Za-z0-9.'&\- ]+$/.test(t)) && !opened.some((t) => /\bAAPL\b/.test(t)),
  opened.join(" | "));
check("they are real companies from that year",
  ["Alphabet", "Microsoft", "Intel", "Amazon", "BlackBerry"].every((n) => opened.includes(n)),
  opened.join(" | "));
check("every name starts pickable",
  (await page.locator('[data-testid="option"][data-state="open"]').count()) === 6);
await shot("01-cold-easy.png");

// the six are shuffled by the puzzle, so the board is the same one every time
await page.reload();
await wait(700);
check("the option order is the puzzle's own", (await optionNames()).join(",") === opened.join(","),
  `${opened.join(",")} then ${(await optionNames()).join(",")}`);

// ------------------------------------------------------------- a wrong pick

await page.locator('[data-testid="option"][data-ticker="BB"]').click();
await wait(300);
check("the wrong name greys out", (await optionState("BB")) === "picked", await optionState("BB"));
check("the wrong pick burns a pip", (await spentPips()) === 1, `${await spentPips()}`);
check("a wrong pick never ends the puzzle", (await page.getByTestId("reveal").count()) === 0);
check("the rest are still pickable",
  (await page.locator('[data-testid="option"][data-state="open"]').count()) === 5);
check("a spent name cannot be picked again",
  await page.locator('[data-testid="option"][data-ticker="BB"]').isDisabled());
await shot("02-wrong-pick.png");

// ------------------------------------------------- two hints off the ladder

await page.getByTestId("hint").click();
await wait(250);
let lines = await hintLines();
check("the first hint is widen", lines[0].includes("year either side"), lines.join(" | "));
check("widening added days either side", (await page.locator("svg rect").count()) >= 1);
check("the hint burns a pip too", (await spentPips()) === 2, `${await spentPips()}`);

await page.getByTestId("hint").click();
await wait(250);
lines = await hintLines();
check("the second hint is sector", lines[1].startsWith("This company is in"), lines.join(" | "));
check("the sector is technology", lines[1].includes("technology"), lines[1]);
check("three pips are spent", (await spentPips()) === 3, `${await spentPips()}`);
check("the sector hint rules the wrong trade out", (await optionState("AMZN")) === "sector",
  await optionState("AMZN"));
check("a ruled out name cannot be picked",
  await page.locator('[data-testid="option"][data-ticker="AMZN"]').isDisabled());
check("it never rules out the answer", (await optionState("AAPL")) === "open");
check("the technology names are all still there",
  (await page.locator('[data-testid="option"][data-state="open"]').count()) === 4,
  `${await page.locator('[data-testid="option"][data-state="open"]').count()}`);
await shot("03-hint-sector.png");

// ------------------------------------------------------- picking the answer

await page.locator('[data-testid="option"][data-ticker="AAPL"]').click();
await wait(500);
check("the reveal opened", (await page.getByTestId("reveal").count()) === 1);
const reveal = await page.getByTestId("reveal").innerText();
check("the reveal names the company", reveal.includes("Apple"), reveal.split("\n")[0]);
check("the reveal gives the year", reveal.includes("2007"));
check("the reveal tells the story", (await page.getByTestId("story").innerText()).includes("iPhone"));
check("the result line counts every pip as a hint",
  (await page.getByTestId("result").innerText()).trim() === "Solved with 3 hints, one over par",
  await page.getByTestId("result").innerText());
check("the reveal remembers the wrong pick",
  (await page.getByTestId("picked").innerText()) === "You picked BlackBerry",
  await page.getByTestId("picked").innerText());
const axis = await page.locator("svg text").allTextContents();
check("the chart relabels to dollars", axis.some((t) => t.includes("$")), axis.join(" "));
check("the chart relabels to the real year", axis.some((t) => t.includes("2007")), axis.join(" "));
check("the scorecard counted the solve",
  (await page.getByTestId("scorecard").innerText()).includes("Solved 1 of 1"),
  await page.getByTestId("scorecard").innerText());
await shot("04-reveal-easy.png");

// ------------------------------------------------------------- next puzzle

await page.getByTestId("next").click();
await wait(600);
check("next deals a different puzzle", (await page.getByTestId("puzzle-no").innerText()).trim() !== "Puzzle 4",
  await page.getByTestId("puzzle-no").innerText());
check("the new puzzle offers six fresh names",
  (await page.locator('[data-testid="option"][data-state="open"]').count()) === 6);
check("the new puzzle spent no pips", (await spentPips()) === 0);
check("the new puzzle spent no hints", (await page.getByTestId("revealed").count()) === 0);
check("the new puzzle hides the price again",
  !(await page.locator("svg text").allTextContents()).some((t) => t.includes("$")));
check("the new puzzle still gives its year away",
  (await page.locator("svg text").allTextContents()).some((t) => /\b(19|20)\d{2}\b/.test(t)));
await shot("05-next.png");

// -------------------------------------------------- spending the whole budget

await page.goto(`${BASE}/#/guess?p=gme-2021`);
await wait(600);
check("the squeeze puzzle offers its own six",
  (await optionNames()).includes("GameStop") && (await optionNames()).includes("AMC Entertainment"),
  (await optionNames()).join(" | "));
for (const ticker of ["BBBY", "BB", "AMC", "NOK"]) {
  await page.locator(`[data-testid="option"][data-ticker="${ticker}"]`).click();
  await wait(200);
}
check("four wrong names fill the pips", (await spentPips()) === 4, `${await spentPips()}`);
check("four wrong names never ended it", (await page.getByTestId("reveal").count()) === 0);
check("there is nothing left to buy a hint with", await page.getByTestId("hint").isDisabled());
check("one name besides the answer is still on the board",
  (await page.locator('[data-testid="option"][data-state="open"]').count()) === 2);
await shot("06-budget-spent.png");

await page.locator('[data-testid="option"][data-ticker="KOSS"]').click();
await wait(500);
check("a wrong name with nothing left to spend ends the puzzle",
  (await page.getByTestId("reveal").count()) === 1);
check("it ends as revealed", (await page.getByTestId("result").innerText()).trim() === "Revealed",
  await page.getByTestId("result").innerText());
check("the reveal names the answer anyway",
  (await page.getByTestId("reveal").innerText()).includes("GameStop"));
const afterFail = await page.getByTestId("scorecard").innerText();
check("the fail counted", afterFail.includes("Solved 1 of 2"), afterFail);
check("the fail broke the streak", afterFail.includes("streak 0"), afterFail);
await shot("07-auto-reveal.png");

// ------------------------------------------------------------- hard mode

await page.getByTestId("mode-toggle").click();
await wait(250);
check("the toggle reads hard",
  (await page.getByTestId("mode-toggle").innerText()).replace(/\s+/g, " ").trim() === "Hard mode",
  await page.getByTestId("mode-toggle").innerText());

await page.goto(`${BASE}/#/guess?p=c-2008`);
await wait(600);
check("hard mode takes the names away", (await page.getByTestId("option").count()) === 0);
check("hard mode hands over the box", (await page.getByTestId("guess-input").count()) === 1);

await page.getByTestId("guess-input").fill("goo");
await wait(250);
const rows = await page.getByTestId("suggestion").allInnerTexts();
check("the top row is Alphabet", rows[0].includes("Alphabet"), rows[0]);
check("the top row shows the ticker", rows[0].includes("GOOGL"), rows[0]);
check("the top row shows the word typed", rows[0].includes("google"), rows[0]);
check("the list is capped at six", rows.length <= 6, `${rows.length}`);
await shot("08-hard-typeahead.png");

await page.getByTestId("guess-input").press("Enter");
await wait(300);
check("the box shakes", (await page.getByTestId("guess-input").getAttribute("class")).includes("guess-shake"));
let guessed = (await page.getByTestId("guessed").innerText()).replace(/\s+/g, " ").trim();
check("the picked company joins the line", guessed === "Alphabet, different sector", guessed);
check("a wrong guess never ends the puzzle", (await page.getByTestId("reveal").count()) === 0);
check("a wrong guess costs no pip", (await spentPips()) === 0, `${await spentPips()}`);

await page.getByTestId("guess-input").fill("jpmorgan");
await wait(250);
await page.getByTestId("guess-input").press("Enter");
await wait(300);
const tags = await page.getByTestId("sector-tag").allInnerTexts();
check("hard mode tags every wrong guess with no setting to find", tags.length === 2, tags.join(" | "));
check("a technology name on a bank year reads different", tags[0].includes("different sector"), tags[0]);
check("another bank on a bank year reads same", tags[1].includes("same sector"), tags[1]);
await shot("09-hard-tags.png");

await page.getByTestId("guess-input").fill("citi");
await wait(250);
await page.getByTestId("guess-input").press("Enter");
await wait(500);
check("the alias solved it", (await page.getByTestId("reveal").count()) === 1);
check("the result line reads clean",
  (await page.getByTestId("result").innerText()).trim() === "Solved with no hints, two under par",
  await page.getByTestId("result").innerText());
check("free guesses stayed free in the reveal",
  (await page.getByTestId("guessed").innerText()).toLowerCase().includes("jpmorgan"));
const afterHard = await page.getByTestId("scorecard").innerText();
check("the scorecard counted the hard solve", afterHard.includes("Solved 2 of 3"), afterHard);
await shot("10-reveal-hard.png");

// ---------------------------------------------------------- the collection

await page.getByTestId("collection-open").click();
await wait(400);
check("the collection opens", (await page.getByTestId("collection").count()) === 1);
const cards = page.getByTestId("shelf-card");
check("the shelf holds the whole pool", (await cards.count()) === 30, `${await cards.count()}`);
check("the solved puzzles filled in",
  (await page.locator('[data-testid="shelf-card"][data-mark="solved"]').count()) === 3,
  `${await page.locator('[data-testid="shelf-card"][data-mark="solved"]').count()}`);
check("the revealed puzzles are marked as revealed",
  (await page.locator('[data-testid="shelf-card"][data-mark="revealed"]').count()) === 2,
  `${await page.locator('[data-testid="shelf-card"][data-mark="revealed"]').count()}`);
check("everything else is still a silhouette",
  (await page.locator('[data-testid="shelf-card"][data-mark="locked"]').count()) === 25,
  `${await page.locator('[data-testid="shelf-card"][data-mark="locked"]').count()}`);

const cardText = async (n) => (await cards.nth(n).innerText()).replace(/\n/g, " ");
const apple = await cardText(3);
check("the solved card names the company", apple.includes("Apple") && apple.includes("AAPL"), apple);
check("the solved card carries the story", apple.includes("iPhone"), apple);
check("the solved card says how it went", apple.includes("Solved in easy, 1 wrong pick, 2 hints"), apple);
const gme = await cardText(0);
check("the auto revealed card says how it went", gme.includes("Revealed in easy, 5 wrong picks"), gme);
const citi = await cardText(5);
check("the hard card names its mode", citi.includes("Solved in hard, 2 wrong guesses"), citi);
const legacy = await cardText(29);
check("a card shelved before any of this still reads",
  legacy.includes("Coca-Cola") && legacy.includes("New Coke"), legacy);
check("a legacy card invents no detail line", !/solved in|revealed in/i.test(legacy), legacy);
const legacyFail = await cardText(27);
check("a legacy reveal still says so", legacyFail.includes("Walmart") && legacyFail.includes("Revealed"),
  legacyFail);
check("and says it once", (legacyFail.match(/revealed/gi) ?? []).length === 1, legacyFail);

const locked = await page.locator('[data-testid="shelf-card"][data-mark="locked"]').first().innerText();
check("a silhouette gives away nothing but its year", /^(19|20)\d{2}$/.test(locked.replace(/\s+/g, " ").trim()),
  locked.replace(/\n/g, " "));
check("the shelf line counts the pool",
  (await page.getByTestId("shelf-line").innerText()).includes("3 solved · 2 revealed · 30 in the pool"),
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
check("the scorecard survived the reload", reloaded === afterHard, `${afterHard} then ${reloaded}`);
check("the mode survived the reload",
  (await page.getByTestId("mode-toggle").innerText()).replace(/\s+/g, " ").trim() === "Hard mode",
  await page.getByTestId("mode-toggle").innerText());
await page.getByTestId("collection-open").click();
await wait(350);
check("the shelf survived the reload",
  (await page.getByTestId("shelf-line").innerText()).includes("3 solved · 2 revealed"),
  await page.getByTestId("shelf-line").innerText());
check("the detail lines survived the reload",
  (await cardText(3)).includes("Solved in easy, 1 wrong pick, 2 hints"), await cardText(3));
await page.getByTestId("collection-close").click();
await wait(250);
check("the back control closes the collection", (await page.getByTestId("collection").count()) === 0);
await shot("12-reload.png");

await page.getByTestId("mode-toggle").click();
await wait(300);
check("switching back brings the names out again", (await page.getByTestId("option").count()) === 6);
check("and takes the box away", (await page.getByTestId("guess-input").count()) === 0);

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
