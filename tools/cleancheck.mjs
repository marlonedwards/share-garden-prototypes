// Site-wide type audit. Walks every route at desktop and phone size and reads
// the live DOM for the things docs/clean-type.md bans:
//
//   1. a font family that is monospace, a grotesque, a pixel face or a serif
//      (Georgia inside the newspaper clipping is the one allowed exception)
//   2. visible text under 12px
//   3. text set in capitals via textTransform
//   4. positive letter spacing
//
// Canvas text cannot be audited from the DOM, so the games that draw to canvas
// are also screenshotted here for a human read.
//
// Usage: node tools/cleancheck.mjs          (audit, screenshots, exit 1 on any violation)
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/clean/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["landing", "/"],
  ["guess", "/#/guess"],
  ["takeover", "/#/takeover"],
  ["worth", "/#/worth"],
  ["trigger", "/#/trigger"],
  ["floor", "/#/floor"],
  ["monkey", "/#/monkey"],
  ["tally", "/#/tally"],
  ["orb-select", "/#/orb"],
  ["orb-scenario", "/#/orb/s/dotcom"],
  ["orb-brief", "/#/orb/brief/dotcom"],
  ["orb-free", "/#/orb/free"],
  ["orb-guide", "/#/orb/guide"],
  ["orb-intro", "/#/orb/intro"],
  ["orb-lesson", "/#/orb/learn/cash"],
  ["orb-ready", "/#/orb/ready"],
  ["garden", "/#/garden"],
  ["pulse", "/#/pulse"],
  ["prism", "/#/prism"],
  ["archive", "/#/archive"],
  ["objectives", "/#/objectives"],
  ["stack", "/#/stack"],
];

const AUDIT = () => {
  const bad = [];
  const seen = new Set();
  const banned = /mono|grotesk|pixelify|fraunces|courier|consolas|menlo/i;
  const els = document.querySelectorAll("body *");
  for (const el of els) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    // only leaf-ish nodes that actually render their own text
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    const tag = el.tagName.toLowerCase();
    const isTexty = own.length > 0 || tag === "text";
    const label = (own || el.getAttribute("aria-label") || tag).slice(0, 42);
    const key = (k) => `${k}|${label}`;

    const fam = style.fontFamily || "";
    if (banned.test(fam) && !seen.has(key("font"))) {
      seen.add(key("font"));
      bad.push({ kind: "font", detail: fam.slice(0, 60), label });
    }
    if (/georgia|times/i.test(fam) && !el.closest("[data-newsclip]") && !seen.has(key("serif"))) {
      seen.add(key("serif"));
      bad.push({ kind: "serif", detail: fam.slice(0, 60), label });
    }
    if (isTexty) {
      const size = parseFloat(style.fontSize);
      if (size && size < 12 && !seen.has(key("size"))) {
        seen.add(key("size"));
        bad.push({ kind: "size", detail: `${size}px`, label });
      }
    }
    if (style.textTransform === "uppercase" && !seen.has(key("caps"))) {
      seen.add(key("caps"));
      bad.push({ kind: "caps", detail: "textTransform uppercase", label });
    }
    const ls = style.letterSpacing;
    if (ls && ls !== "normal" && parseFloat(ls) > 0.15 && !seen.has(key("track"))) {
      seen.add(key("track"));
      bad.push({ kind: "tracking", detail: ls, label });
    }
  }
  return bad;
};

const browser = await chromium.launch();
let violations = 0;
const report = [];

for (const [size, w, h] of [["wide", 1440, 950], ["phone", 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log(`PAGEERROR ${size}:`, e.message));
  for (const [name, route] of ROUTES) {
    try {
      await page.goto(`http://localhost:4318${route}`);
      await page.reload();
      await wait(1100);
      const bad = await page.evaluate(AUDIT);
      if (bad.length) {
        violations += bad.length;
        report.push(`${size} ${name}: ${bad.length}`);
        for (const b of bad.slice(0, 6)) console.log(`  FAIL ${size} ${name} [${b.kind}] ${b.detail} on "${b.label}"`);
        if (bad.length > 6) console.log(`  ... and ${bad.length - 6} more on ${name}`);
      } else {
        console.log(`ok   ${size} ${name}`);
      }
      await page.screenshot({ path: `${OUT}${name}-${size}.png` });
    } catch (e) {
      console.log(`ERROR ${size} ${name}: ${e.message}`);
      violations++;
    }
  }
  await page.close();
}

await browser.close();
console.log(violations ? `\n${violations} VIOLATIONS\n${report.join("\n")}` : "\nCLEAN: no banned type anywhere in the DOM");
process.exit(violations ? 1 : 0);
