import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

// share lesson end-to-end
await page.goto("http://localhost:4318/#/orb/mini/share");
await wait(800);
await page.getByRole("button", { name: "Buy 1 share for $10" }).click();
await wait(400);
await page.getByRole("button", { name: "To whoever sold me the share" }).click();
await wait(400);
await page.getByRole("button", { name: /A year passes/ }).click();
await wait(400);
console.log("dividend beat:", await page.getByText("called a dividend").count());
await page.locator("input[type=range]").fill("4");
await wait(300);
console.log("still 1 of 100 at $4:", await page.getByText("still 1 of 100 pieces").count());
await page.getByRole("button", { name: "Got it" }).click();
await wait(400);
await page.locator("button.text-left.text-\\[13px\\]").nth(1).click();
await wait(400);
console.log("share check correct:", await page.getByText("Ownership is counted in pieces").count());
await page.getByRole("button", { name: "See results" }).click();
await wait(400);
await page.screenshot({ path: OUT + "mini-share.png", fullPage: true });

// fund lesson: pick, see tripler missed, fuse, seal refuses
await page.goto("http://localhost:4318/#/orb/mini/fund");
await wait(600);
await page.getByRole("button", { name: /Fruit Computers/ }).click();
await wait(400);
console.log("tripler lesson:", await page.getByText("tripled, and you did not").count());
await page.getByRole("button", { name: "Now buy all eight at once" }).click();
await wait(400);
await page.getByRole("button", { name: "The fused fund marble" }).click();
await wait(300);
console.log("seal refuses:", await page.getByText("It refuses").count());
await page.getByRole("button", { name: "Got it" }).click();
await wait(300);

// cash: drag to 8 years
await page.goto("http://localhost:4318/#/orb/mini/cash");
await wait(600);
await page.locator("input[type=range]").fill("8");
await wait(300);
console.log("pairs shrink:", await page.getByText("$71").count());

// coin: flip both, bet it all
await page.goto("http://localhost:4318/#/orb/mini/coin");
await wait(600);
await page.getByText("tap to flip").first().click();
await wait(200);
await page.getByText("tap to flip").first().click();
await wait(300);
await page.getByRole("button", { name: "$1,000", exact: true }).click();
await wait(400);
console.log("disaster line:", await page.getByText("A disaster you live.").count());

// marbles: guide should show cleared share marble
await page.goto("http://localhost:4318/#/orb/guide");
await wait(600);
console.log("guide proved count:", await page.getByText(/of 13 proved/).textContent());
console.log("start-here strip on select:", await page.goto("http://localhost:4318/#/orb").then(() => wait(600)).then(() => page.getByText("Start here: the basics").count()));
await browser.close();
