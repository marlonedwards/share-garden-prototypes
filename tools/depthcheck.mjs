import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// 1. select screen: name the orb
await page.goto("http://localhost:4318/#/orb");
await wait(800);
await page.getByPlaceholder("Give it a name").fill("Stardust");
await page.screenshot({ path: OUT + "depth-select.png" });
console.log("named orb on select");

// 2. dotcom: first gate should interrupt almost immediately
await page.goto("http://localhost:4318/#/orb/s/dotcom");
await wait(1000);
await page.getByText("Start in 2000").click();
await wait(2500);
const gate1 = await page.getByText("February 2000.").count();
console.log("gate 1 visible:", gate1);
await page.screenshot({ path: OUT + "depth-gate1.png" });
await page.getByRole("button", { name: "Spread across everything" }).click();
await wait(400);

// 3. buy a survivor and the doomed Phone Giant while paused
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
for (const nm of ["The Everything Store", "The Phone Giant"]) {
  await page.getByText(nm).first().click();
  await wait(250);
  await page.getByRole("button", { name: "Buy $250" }).last().click();
  await wait(400);
}
await page.getByText("4×", { exact: true }).click();

// 4. second gate at Oct 2002
await wait(9000);
const gate2 = await page.getByText("October 2002.").count();
console.log("gate 2 visible:", gate2);
await page.screenshot({ path: OUT + "depth-gate2.png" });
await page.getByRole("button", { name: "Hold what I have" }).click();
await wait(300);
await page.getByText("4×", { exact: true }).click();

// 5. run to the end card
for (let i = 0; i < 30; i++) {
  await wait(1000);
  if (await page.getByText("At the crossroads").count()) break;
}
await wait(800);
console.log("crossroads block:", await page.getByText("At the crossroads").count());
console.log("dead bullet mentions zero:", await page.getByText("went to zero and took").count());
console.log("gone label:", await page.getByText("gone", { exact: true }).count());
console.log("stardust label:", await page.getByText("Stardust").count());
await page.screenshot({ path: OUT + "depth-end.png", fullPage: true });
console.log("shot depth-end");

await browser.close();
