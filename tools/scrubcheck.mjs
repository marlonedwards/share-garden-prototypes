import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// crypto era: buy, gates, end, then scrub + quiz focus
await page.goto("http://localhost:4318/#/orb/s/crypto");
await wait(1000);
await page.getByText("Start in 2018").click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.getByText("Coin Alpha").first().click();
await wait(250);
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(300);
await page.getByText("4×", { exact: true }).click();
for (let i = 0; i < 20; i++) { await wait(1000); if (await page.getByText("November 2021.").count()) break; }
await page.getByRole("button", { name: "Change nothing" }).click();
await wait(300);
await page.getByText("4×", { exact: true }).click();
for (let i = 0; i < 20; i++) { await wait(1000); if (await page.getByText("November 2022.").count()) break; }
await page.getByRole("button", { name: "Hold" }).click();
await wait(300);
await page.getByText("4×", { exact: true }).click();
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("Quick check").count()) break; }
await wait(600);

// scrub: hover the big end chart at ~25% width, expect a rewind pill
const chart = page.locator("svg[style*='col-resize']").first();
const box = await chart.boundingBox();
console.log("scrub chart found:", !!box);
await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
await wait(500);
console.log("rewind pill:", await page.getByText("· rewind").count());
await page.screenshot({ path: OUT + "scrub-hover.png" });

// move off: back to final state
await page.mouse.move(box.x + box.width / 2, box.y - 200);
await wait(400);
console.log("pill gone after leave:", await page.getByText("· rewind").count() === 0);

// quiz focus: first crypto item focuses step 58 (Nov 2022)
const buttons = page.locator("button.text-left.text-\\[13px\\]");
await wait(300);
console.log("quiz focus pill (Nov 2022):", await page.getByText("Nov 2022 · rewind").count());
await page.screenshot({ path: OUT + "scrub-quizfocus.png", fullPage: true });

await browser.close();
