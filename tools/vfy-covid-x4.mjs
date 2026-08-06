// throwaway pass 4: gate layout measurement (fold at 800), quiz replaces the
// stage, debrief screens, quiz content.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const B = "http://localhost:4333";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

const measure = async (tag) => {
  const r = await page.evaluate(() => {
    const out = { docH: document.documentElement.scrollHeight, winH: window.innerHeight, bottoms: [] };
    for (const b of document.querySelectorAll("button")) {
      const t = (b.textContent || "").trim();
      if (!t || t.length > 60) continue;
      const bb = b.getBoundingClientRect();
      if (bb.height > 0) out.bottoms.push({ t, bottom: Math.round(bb.bottom), top: Math.round(bb.top) });
    }
    // white cards
    out.cards = [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      const bb = d.getBoundingClientRect();
      return bb.width > 400 && bb.height > 80 && /rgb\(255, 255, 255\)|rgba\(255, 255, 255, 0\.9/.test(s.backgroundColor) && s.borderTopWidth !== "0px";
    }).map((d) => { const b = d.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom) }; });
    return out;
  });
  console.log(`\n[${tag}] docH=${r.docH} winH=${r.winH} pageScrolls=${r.docH > r.winH + 2}`);
  console.log("  wide white cards:", JSON.stringify(r.cards));
  console.log("  buttons below fold:", JSON.stringify(r.bottoms.filter((b) => b.bottom > 800)));
  return r;
};

await page.goto(`${B}/#/orb/s/covid`);
await wait(900);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(250);
for (let i = 1; i <= 12; i++) {
  const c = page.locator(`button[aria-label="card ${i}"]`);
  if (await c.count()) { await c.click(); await wait(50); }
}
await wait(700);
await measure("scouting deck");
await page.getByText("Start in 2019").click();
await wait(1500);
await measure("gate Jan 2019");
await page.screenshot({ path: OUT + "covid-x-L-gate1.png" });
await page.getByRole("button", { name: "Wait in cash for the recession" }).click();
await wait(400);
await page.getByText("4×", { exact: true }).click();

const gates = [["March 2020 ·", "Hold and look away"], ["January 2021 ·", "Watch from the side"], ["November 2021 ·", "Change nothing"], ["October 2022 ·", "Hold what I own"]];
for (const [t, a] of gates) {
  for (let i = 0; i < 400; i++) { await wait(150); if ((await page.locator("body").innerText()).includes(t)) break; }
  await wait(1200);
  await measure("gate " + t);
  await page.screenshot({ path: OUT + `covid-x-L-${t.slice(0, 4).trim()}${t.slice(-7, -2).trim()}.png` });
  await page.getByRole("button", { name: a }).click();
  await wait(400);
  await page.getByText("4×", { exact: true }).click();
}
for (let i = 0; i < 600; i++) { await wait(150); if ((await page.locator("body").innerText()).includes("You finished with")) break; }
await wait(1200);
await measure("end score");
await page.screenshot({ path: OUT + "covid-x-L-end1.png" });
await page.getByRole("button", { name: "Continue" }).click();
await wait(900);
await measure("end rewind");
await page.screenshot({ path: OUT + "covid-x-L-end2.png" });
console.log((await page.locator("body").innerText()));
await page.getByRole("button", { name: "Continue" }).click();
await wait(900);
await measure("end lessons");
await page.screenshot({ path: OUT + "covid-x-L-end3.png" });
console.log((await page.locator("body").innerText()));
if (await page.getByRole("button", { name: "Quick check" }).count()) {
  await page.getByRole("button", { name: "Quick check" }).click();
  await wait(900);
}
for (let q = 0; q < 12; q++) {
  const body = await page.locator("body").innerText();
  if (!/\d of \d/.test(body)) break;
  await measure("quiz item " + (q + 1));
  await page.screenshot({ path: OUT + `covid-x-L-quiz${q + 1}.png` });
  console.log("QUIZ:\n" + body);
  const buttons = page.locator("button.text-left");
  const n = await buttons.count();
  if (!n) break;
  await buttons.nth(1).click();
  await wait(600);
  await page.screenshot({ path: OUT + `covid-x-L-quiz${q + 1}-ans.png` });
  console.log("AFTER ANSWER:\n" + (await page.locator("body").innerText()));
  const nx = page.getByRole("button", { name: /Next|See results|Done/ });
  if (await nx.count()) { await nx.first().click(); await wait(600); }
}
await page.screenshot({ path: OUT + "covid-x-L-quizresults.png", fullPage: true });
console.log("RESULTS:\n" + (await page.locator("body").innerText()));
await browser.close();
