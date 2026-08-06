// Layout probe: gate beat at a 1280x800 laptop and at a 2xl desktop.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();

for (const vp of [{ width: 1280, height: 800, tag: "1280" }, { width: 1600, height: 1000, tag: "1600" }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://localhost:4329/#/orb/s/payday");
  await wait(1000);
  await page.screenshot({ path: `${OUT}layout-${vp.tag}-brief.png` });
  console.log(vp.tag, "brief scrollH", await page.evaluate(() => document.documentElement.scrollHeight), "vs", vp.height);
  await page.getByRole("button", { name: "Scout the menu" }).click();
  await wait(500);
  console.log(vp.tag, "scout scrollH", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.screenshot({ path: `${OUT}layout-${vp.tag}-scout.png` });
  for (let i = 0; i < 6; i++) {
    await page.locator("button[aria-label^='Flip the card'], button[aria-label^='Scouting report']").first().click();
    await wait(450);
  }
  await page.screenshot({ path: `${OUT}layout-${vp.tag}-scout-done.png` });
  console.log(vp.tag, "scout-done scrollH", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.getByRole("button", { name: "Start earning" }).click();
  await wait(300);
  // ride to gate 1 (April 2000)
  await page.getByRole("button", { name: "4×", exact: true }).click({ force: true }).catch(() => {});
  await page.getByText("Read more:").waitFor({ timeout: 20000 });
  await wait(600);
  await page.screenshot({ path: `${OUT}layout-${vp.tag}-gate1.png` });
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) => /Keep investing every month/.test(b.textContent));
    const b = btns[0]?.getBoundingClientRect();
    const rail = [...document.querySelectorAll("div")].find((d) => d.textContent.trim().startsWith("Inside your orb"));
    const rr = rail?.getBoundingClientRect();
    return {
      scrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight,
      optionBottom: b ? Math.round(b.bottom) : null,
      railTop: rr ? Math.round(rr.top) : null,
      railVisible: rr ? rr.top < window.innerHeight : null,
    };
  });
  console.log(vp.tag, "gate1", JSON.stringify(info));
  await page.close();
}
await browser.close();
