// Adversarial pass 2: exercise every mirror branch through the real module,
// then drive path two and the twelve-line cap in the UI.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4335";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

await page.goto(`${BASE}/#/orb/ready`);
await wait(800);

const plans = {
  "one broad fund": [["voo", 500]],
  "one single stock": [["aapl", 500]],
  "one coin": [["btc", 500]],
  "one bond fund": [["bnd", 500]],
  "no fund, three stocks": [["aapl", 300], ["tsla", 300], ["ko", 300]],
  "coin heavy": [["voo", 300], ["btc", 500], ["eth", 200]],
  "bond mix": [["voo", 600], ["bnd", 400]],
  "one stock past half": [["tsla", 700], ["voo", 300]],
  "one stock 35pct": [["tsla", 350], ["voo", 330], ["bnd", 320]],
  "well spread": [["voo", 250], ["vti", 250], ["vxus", 250], ["schd", 250]],
  "zero dollars": [["voo", 0]],
  "custom only": [],
};
const res = await page.evaluate(async (plans) => {
  const m = await import("/src/lib/readyAssets.ts");
  const out = {};
  for (const [name, rows] of Object.entries(plans)) {
    const lines = rows.map(([id, d], i) => ({ key: id + i, assetId: id, dollars: d }));
    if (rows.length === 0) lines.push({ key: "custom-1", label: "My thing", dollars: 100 });
    out[name] = m.mirrorLines(lines).map((x) => `[${x.tone}] ${x.text}`);
  }
  out["__empty__"] = m.mirrorLines([]);
  return out;
}, plans);
for (const [k, v] of Object.entries(res)) {
  console.log("\n### " + k);
  for (const line of v) console.log("  " + line);
}

// ---- UI: path two, and the twelve line cap ----
await page.evaluate(() => localStorage.removeItem("orb-ready-plan"));
await page.reload();
await wait(800);
await page.getByText("I already own some").click();
await wait(400);
const shelfButtons = page.locator('button[aria-pressed]');
const n = await shelfButtons.count();
console.log("\nshelf buttons:", n);
for (let i = 0; i < Math.min(n, 12); i++) {
  await shelfButtons.nth(i).click();
  await wait(40);
}
await wait(400);
const pressed = await page.locator('button[aria-pressed="true"]').count();
const disabled = await page.locator('button[aria-pressed="false"][disabled]').count();
console.log("added after clicking all 20:", pressed, "disabled:", disabled);
console.log("cap notice:", await page.locator("text=The shelf closes at twelve lines").count());
await page.screenshot({ path: OUT + "ready-9-cap.png", fullPage: true });

await page.getByRole("button", { name: "Continue" }).click();
await wait(400);
console.log("SIZE lines:", await page.locator('input[type="number"]').count());
console.log("SIZE eyebrow:", await page.locator("text=What I already own").count());
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
console.log("MIRROR heading:", await page.locator("text=The orb you already hold").count());
await page.screenshot({ path: OUT + "ready-10-own-mirror.png", fullPage: true });
await page.emulateMedia({ media: "print" });
await wait(200);
await page.screenshot({ path: OUT + "ready-11-own-print.png", fullPage: true });
const box = await page.locator(".rd-print").boundingBox();
console.log("print sheet height px:", box && Math.round(box.height));
await page.emulateMedia({ media: "screen" });

// start over returns to the door and clears storage
await page.getByRole("button", { name: "Start over" }).click();
await wait(200);
await page.getByRole("button", { name: "Yes, clear it" }).click();
await wait(400);
console.log("after start over, door visible:", await page.locator("text=One door, two paths").count());
console.log("localStorage cleared:", await page.evaluate(() => localStorage.getItem("orb-ready-plan")));

await browser.close();
