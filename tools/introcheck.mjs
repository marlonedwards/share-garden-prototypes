import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
// deliberately NOT setting onboarded: this walk tests the first-visit flow
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// 1. first visit to /orb redirects into the intro
await page.goto("http://localhost:4318/#/orb");
await wait(1200);
console.log("redirected to intro:", page.url().includes("/orb/intro"));

// 2. arrival lines, then name
for (let i = 0; i < 12; i++) { await wait(400); if (await page.getByPlaceholder("Your name").count()) break; }
await page.getByPlaceholder("Your name").fill("Comet");
await page.screenshot({ path: OUT + "intro-name.png" });
await page.getByRole("button", { name: "That's me" }).click();
await wait(500);

// 3. pour
console.log("pour prompt:", await page.getByText("Pour your first color.").count());
await page.locator('button[aria-label="Pour this color"]').nth(1).click();
await wait(600);
console.log("buy line:", await page.getByText("That tap was a buy.").count());
await page.screenshot({ path: OUT + "intro-pour.png" });
await page.getByRole("button", { name: "Keep going" }).click();
await wait(400);

// 4. the conversation: answer knowledgeably on stocks, novice on the rest
console.log("q1:", await page.getByText("Someone hands you $100").count());
await page.getByRole("button", { name: "Spend some, save some" }).click();
await wait(350);
await page.getByRole("button", { name: "To whoever owned the share before me" }).click();
await wait(350);
await page.getByRole("button", { name: "Wait it out" }).click();
await wait(350);
await page.getByRole("button", { name: "I have heard the name" }).click();
await wait(500);

// 5. done screen recommends the stocks lesson (exactly one knows-answer)
console.log("done for Comet:", await page.getByText("Comet's orb is ready.").count());
await page.screenshot({ path: OUT + "intro-done.png" });
await page.getByRole("button", { name: "I'm ready" }).click();
await wait(800);
console.log("landed on course:", page.url().includes("/orb") && !page.url().includes("intro"));
console.log("reco chip:", await page.getByText("Start here", { exact: true }).count());
console.log("replay link:", await page.getByText("Replay the intro").count());

// 6. claimed marbles: share + market-price ringed on the guide
await page.goto("http://localhost:4318/#/orb/guide");
await wait(600);
await page.getByRole("button", { name: "Share", exact: true }).click();
await wait(300);
console.log("claimed line:", await page.getByText("Its first quick check makes it official.").count());
await page.screenshot({ path: OUT + "intro-claimed.png" });

// 7. revisit /orb: no redirect this time
await page.goto("http://localhost:4318/#/orb");
await wait(900);
console.log("no second redirect:", !page.url().includes("intro"));

await browser.close();
