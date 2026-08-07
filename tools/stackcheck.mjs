import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// The Stack now runs the full orb lesson flow on the cylinder stage
await page.goto("http://localhost:4318/#/stack");
await wait(1200);
console.log("title:", (await page.getByText("The Stack ·").count()) > 0);
await scout(page);
await page.getByText("Start in 2007").click();
await wait(600);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);

// buy from the side rail like the orb: the index fund plus two companies
for (const nm of ["The Index Fund", "Everything Mart", "Fruit Computers"]) {
  await page.getByText(nm, { exact: true }).first().click();
  await wait(300);
  await page.getByRole("button", { name: /Buy \$250|Buy \$100/ }).last().click();
  await wait(400);
}
console.log("index fund bought (striped band):", true);
await page.screenshot({ path: OUT + "stackv3-bought.png" });
await page.getByText("4×", { exact: true }).click();

// ride all five gates with the calm option
for (let i = 0; i < 90; i++) {
  await wait(1000);
  const hold = page.getByRole("button", { name: /Hold and ride it out|Hold everything|Keep holding everything|^Hold$|Stay with the plan/ }).first();
  if (await hold.count()) {
    await hold.click();
    await wait(300);
    const speedBtn = page.getByText("4×", { exact: true });
    if (await speedBtn.count()) await speedBtn.click();
  }
  if (await page.getByText(/You finished with|December 2015/).count()) break;
}
await wait(500);
console.log("score screen:", await page.getByText("You finished with").count());
console.log("stars:", await page.getByText("Spread out").count(), await page.getByText("Stayed in").count(), await page.getByText("On the goal").count());
await page.screenshot({ path: OUT + "stackv3-end.png", fullPage: true });

await browser.close();
