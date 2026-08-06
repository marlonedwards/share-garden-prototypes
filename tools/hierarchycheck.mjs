import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// select: name input outside the card, one orb inside
await page.goto("http://localhost:4318/#/orb");
await wait(800);
await page.locator("#orb-name").fill("Stardust");
await wait(300);
console.log("name in card title:", await page.getByText("Stardust", { exact: true }).count());
await page.screenshot({ path: OUT + "select-hierarchy.png" });

// scouting deck: navigation lands front-up
await page.goto("http://localhost:4318/#/orb/s/covid");
await wait(1000);
const sm = page.getByRole("button", { name: "Scout the menu" });
if (await sm.count()) { await sm.click(); await wait(400); }
const flip = page.locator('button[aria-label^="Flip the card"]');
console.log("card 1 lands front-up:", await flip.count());
await flip.click();
await wait(400);
console.log("report open (Believers visible):", await page.getByText("Believers say").count());
// tap report -> next card should be front-up again
await page.locator('button[aria-label^="Scouting report"]').click();
await wait(400);
console.log("card 2 lands front-up:", await page.locator('button[aria-label^="Flip the card"]').count());

// ready mode: sanitized input + share buttons
await page.goto("http://localhost:4318/#/orb/ready");
await wait(800);
await page.getByText("planning my first orb", { exact: false }).first().click();
await wait(500);
const firstAsset = page.locator("button", { hasText: "Add" }).first();
await firstAsset.click();
await wait(300);
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
const money = page.locator("input[inputmode=decimal]").first();
await money.fill("");
await money.type("12.34567");
const v = await money.inputValue();
console.log("decimal clamp (want 12.34):", v);
await money.fill("");
await money.type("99999999999");
console.log("cap (want 9999999):", await money.inputValue());
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
console.log("Save as image:", await page.getByRole("button", { name: "Save as image" }).count());
console.log("Share:", await page.getByRole("button", { name: "Share", exact: true }).count());
console.log("Print secondary:", await page.getByText("Print this plan instead").count());
await page.screenshot({ path: OUT + "ready-sharerow.png", fullPage: true });

await browser.close();
