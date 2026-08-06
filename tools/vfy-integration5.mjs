import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
for (const [w, h, tag] of [[390, 844, "mobile"], [1440, 1000, "desktop"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  for (const [route, name] of [["/orb", "select"], ["/objectives", "onepager"], ["/orb/learn/stocks", "stocks"], ["/orb/s/inflation", "inflation"]]) {
    await page.goto(BASE + "/#" + route);
    await wait(900);
    const over = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    console.log(`${tag} ${route}`, JSON.stringify(over));
    await page.screenshot({ path: `${OUT}${tag}-${name}.png`, fullPage: tag === "mobile" ? false : true });
  }
  await page.close();
}
await browser.close();
