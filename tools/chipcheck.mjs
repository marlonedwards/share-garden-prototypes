// Quick check: the Start-here chip advances through the course as stops are
// played. Seeds beta-checks progressively and reads where the chip sits.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const chipCard = async () => {
  const chip = page.getByText("Start here", { exact: true });
  if (!(await chip.count())) return "none";
  return chip.first().locator("xpath=ancestor::a[1]").getAttribute("href");
};
const seed = async (rows, tut) => {
  await page.addInitScript(({ rows, tut }) => {
    localStorage.setItem("onboarded", "1");
    localStorage.setItem("beta-checks", JSON.stringify(rows.map((s) => ({ scenario: s, score: 1, total: 1 }))));
    if (tut) localStorage.setItem("tutorial-done", "1");
  }, { rows, tut });
};
await seed([], false);
await page.goto("http://localhost:4318/#/orb"); await page.waitForTimeout(900);
console.log("fresh (no reco):", await chipCard());
const page2 = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page2.addInitScript(() => {
  localStorage.setItem("onboarded", "1");
  localStorage.setItem("orb-reco", "era-dotcom");
  localStorage.setItem("beta-checks", JSON.stringify([{ scenario: "learn-cash" }]));
});
await page2.goto("http://localhost:4318/#/orb"); await page2.waitForTimeout(900);
const chip2 = page2.getByText("Start here", { exact: true });
console.log("reco era-dotcom, cash played -> chip count:", await chip2.count(), "href:", await chip2.first().locator("xpath=ancestor::a[1]").getAttribute("href"));
const page3 = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page3.addInitScript(() => {
  localStorage.setItem("onboarded", "1");
  localStorage.setItem("orb-reco", "lesson-cash");
  localStorage.setItem("beta-checks", JSON.stringify(["learn-cash","learn-savings","learn-stocks","learn-funds","learn-coins"].map((s) => ({ scenario: s }))));
  localStorage.setItem("tutorial-done", "1");
});
await page3.goto("http://localhost:4318/#/orb"); await page3.waitForTimeout(900);
const chip3 = page3.getByText("Start here", { exact: true });
console.log("all basics + tutorial done, reco lesson-cash -> href:", await chip3.first().locator("xpath=ancestor::a[1]").getAttribute("href"));
await browser.close();
