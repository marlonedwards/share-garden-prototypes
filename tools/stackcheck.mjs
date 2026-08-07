import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

await page.goto("http://localhost:4318/#/stack");
await wait(900);
await page.getByRole("button", { name: "Start in 2007" }).click();
await wait(500);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);

// diversify across four names, answering gates as they come
for (const nm of ["Everything Mart", "The Everything Store", "Fruit Computers", "Giant Oil"]) {
  const row = page.locator("div.flex.items-center", { has: page.getByText(nm, { exact: true }) }).first();
  await row.getByRole("button", { name: "Buy" }).click();
  await wait(250);
}
console.log("paused for move:", await page.getByText("Paused for your move").count());
await page.screenshot({ path: OUT + "stack-bought.png" });
await page.getByRole("button", { name: "Play", exact: true }).click();

// ride the tape, answering each gate with the calm option
for (let i = 0; i < 90; i++) {
  await wait(1000);
  const hold = page.getByRole("button", { name: /Hold and ride it out|Hold everything|Keep holding everything|^Hold$|Stay with the plan/ }).first();
  if (await hold.count()) {
    await hold.click();
    await wait(300);
    const play = page.getByRole("button", { name: "Play", exact: true });
    if (await play.count()) await play.click();
  }
  if (await page.getByText("December 2015.").count()) break;
  if (i % 10 === 9) {
    console.log("tick", i, "month:", await page.locator("header span.tnum").first().textContent());
    await page.screenshot({ path: OUT + `stack-debug-${i}.png` });
  }
}
console.log("end card:", await page.getByText("December 2015.").count());
console.log("named stars:", await page.getByText("Spread out").count(), await page.getByText("Stayed in").count(), await page.getByText("On the path").count());
await page.screenshot({ path: OUT + "stack-end.png" });

await browser.close();
