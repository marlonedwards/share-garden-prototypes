import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";


// 1. select screen: name the orb
await page.goto(`${BASE}/#/orb`);
await wait(800);
await page.getByPlaceholder("Give it a name").fill("Stardust");
await page.screenshot({ path: OUT + "depth-select.png" });
console.log("named orb on select");

// 2. dotcom: first gate should interrupt almost immediately
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1000);
await scout(page);
await page.getByText("Start in 2000").click();
await wait(2500);
const gate1 = await page.getByText("February 2000 ·").count();
console.log("gate 1 visible:", gate1);
await page.screenshot({ path: OUT + "depth-gate1.png" });
await page.getByRole("button", { name: "Spread across everything" }).click();
await wait(400);

// 3. buy a survivor and the doomed Phone Giant while paused
// (an act gate answer already pauses the tape for the move, so only click
// Pause if the tape is actually running)
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);
for (const nm of ["The Everything Store", "The Phone Giant"]) {
  // scope to buttons: the scrolling ticker repeats the same names in spans
  await page.getByRole("button", { name: nm }).first().click();
  await wait(250);
  await page.getByRole("button", { name: "Buy $250" }).last().click();
  await wait(400);
}
await page.getByText("4×", { exact: true }).click();

// 4. the era now carries five gates (docs/overnight-plan W4), so ride the
// tape through the three middle ones with hold answers before the last gate
for (const [title, answer] of [
  ["April 2000 ·", "Hold what I have"],
  ["September 2001 ·", "Hold and stick to the plan"],
  ["June 2002 ·", "Hold and hope it survives"],
]) {
  for (let i = 0; i < 30; i++) { await wait(1000); if (await page.getByText(title).count()) break; }
  console.log("gate", title, await page.getByText(title).count());
  await page.getByRole("button", { name: answer }).click();
  await wait(300);
  await page.getByText("4×", { exact: true }).click();
}

// 5. last gate at Oct 2002; the sidebar still shows dead names as "gone"
// here (the sidebar leaves the screen at the end beat, so check it now)
for (let i = 0; i < 30; i++) { await wait(1000); if (await page.getByText("October 2002 ·").count()) break; }
const gate2 = await page.getByText("October 2002 ·").count();
console.log("gate 2 visible:", gate2);
await page.screenshot({ path: OUT + "depth-gate2.png" });
await page.getByRole("button", { name: "Hold what I have" }).click();
await wait(600);
// The side rail is deliberately hidden during gate beats, so the dead-name
// label is checked back on the run beat. The Online Toy Store is never bought
// here, so it stays on the "Add a color" list, where dead names read "gone".
console.log("gone label:", await page.getByText("gone", { exact: true }).count());
await page.getByText("4×", { exact: true }).click();

// 5. run to the end card
for (let i = 0; i < 30; i++) {
  await wait(1000);
  if (await page.getByText("At the crossroads").count()) break;
}
await wait(800);
console.log("crossroads block:", await page.getByText("At the crossroads").count());
console.log("stardust label:", await page.getByText("Stardust").count());
// The end card is stepped: score, then rewind, then the debrief bullets.
// The dead-company bullet lives on the third screen, so walk to it.
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);
console.log("dead bullet mentions zero:", await page.getByText("went to zero and took").count());
await page.screenshot({ path: OUT + "depth-end.png", fullPage: true });
console.log("shot depth-end");

await browser.close();
