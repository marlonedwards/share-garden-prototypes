// Walk Garden 3.0: tutorial cards, stall first buy, co-op strip, week loop
// through events, frost fork, extinction, season end.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const OUT = new URL("./shots/garden/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/garden");
await wait(1000);
await page.screenshot({ path: OUT + "intro.png" });
for (const label of ["Next", "Next", "Next", "Visit the market"]) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await wait(300);
}
// stall is open: buy pumpkin + berry
await page.screenshot({ path: OUT + "stall.png" });
await page.getByRole("button", { name: /Plant one/ }).nth(1).click();
await wait(300);
await page.getByRole("button", { name: /Plant one/ }).nth(3).click();
await wait(300);
await page.getByRole("button", { name: "Close" }).click();
await wait(300);
await page.getByRole("button", { name: "Meet the co-op field" }).click();
await wait(300);
await page.getByRole("button", { name: /Buy one strip/ }).click();
await wait(300);
await page.screenshot({ path: OUT + "coop-buyin.png" });
await page.getByRole("button", { name: "Done" }).click();
await wait(300);

// week loop: keep pressing whatever primary button shows up
let forkShot = false, extinctShot = false;
for (let i = 0; i < 400; i++) {
  const btns = [
    ["Start week", /Start week \d+/],
    ["Okay", /^Okay$/],
    ["Keep tending", /^Keep tending$/],
  ];
  let clicked = false;
  for (const [, re] of btns) {
    const b = page.getByRole("button", { name: re });
    if (await b.count()) {
      const label = await b.first().textContent();
      if (label === "Keep tending" && !forkShot) {
        forkShot = true;
        await page.screenshot({ path: OUT + "fork.png" });
      }
      if (label === "Okay" && !extinctShot) {
        const extinct = await page.getByText("The tomato blight won.").count();
        if (extinct) {
          extinctShot = true;
          await page.screenshot({ path: OUT + "extinct.png" });
        }
      }
      await b.first().click();
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    const end = await page.getByText("Play again").count();
    if (end) break;
    await wait(800);
  } else {
    await wait(600);
  }
}
const ended = await page.getByText("Play again").count();
if (!ended) { await page.screenshot({ path: OUT + "stuck.png" }); console.log("STUCK, see stuck.png"); }
await wait(600);
await page.screenshot({ path: OUT + "end.png" });
console.log("garden 3.0 walk complete; fork:", forkShot, "extinct:", extinctShot);
await browser.close();
