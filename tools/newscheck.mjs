import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;


// gfc: ride to the Lehman clipping at step 20
await page.goto("http://localhost:4318/#/orb/s/gfc");
await wait(1000);
await scout(page);
await page.getByText("Start in 2007").click();
await wait(600);
console.log("ticker visible:", await page.locator("div[style*='sg-ticker'], div[class*='whitespace-nowrap']").count() > 0);
await page.getByText("2×", { exact: true }).click();

// the era now carries five gates (docs/overnight-plan W4); two of them come
// before Lehman, so answer those to let the tape reach September 2008
for (const [title, answer] of [
  ["October 2007 ·", "Keep holding everything"],
  ["March 2008 ·", "Hold everything"],
]) {
  for (let i = 0; i < 40; i++) { await wait(500); if (await page.getByText(title).count()) break; }
  console.log("gate", title, await page.getByText(title).count());
  await page.getByRole("button", { name: answer }).click();
  await wait(300);
  await page.getByText("2×", { exact: true }).click();
}

for (let i = 0; i < 40; i++) {
  await wait(500);
  if (await page.getByText("September 2008 ·").count()) break;
}
console.log("gate September 2008 ·:", await page.getByText("September 2008 ·").count());
await page.getByRole("button", { name: "Hold and ride it out" }).click();
for (let i = 0; i < 10; i++) {
  await wait(400);
  if (await page.getByText("After Frantic Day").count()) break;
}
const lehman = await page.getByText("After Frantic Day, Wall St. Banks Falter").count();
console.log("Lehman clipping:", lehman);
await page.screenshot({ path: OUT + "news-lehman.png" });

await browser.close();
