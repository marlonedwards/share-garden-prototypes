// How big a line can be and still fit the space it has. Measured rather than
// estimated: a guessed character width is what lets a long calculator line
// ("238 shares x $6.68 = $1,590") either overflow the phone or shrink below
// the button beside it, and the calculator is the hero of this screen.
//
// Three things make the measurement honest:
//
//   1. it is a real hidden span, not a canvas, because canvas cannot be told
//      about font-variant-numeric and every number on this screen is set in
//      tabular figures, which run wider than the proportional ones
//   2. it is taken at the size the line will actually render at. Glyph
//      rasterization is not linear in size: a probe at 100px scaled down
//      predicts about two and a half percent narrow at 18 to 32px, which is
//      exactly the band the phone lives in, so a big probe alone would sign
//      off on a line that then overflows its own box
//   3. every result is cached by shape and size, and tabular figures are what
//      makes that work: every digit is the same width, so a line's width
//      depends only on its shape. Digits are normalised to zero, which leaves
//      a couple of hundred measurements for the life of the tab rather than
//      one per frame
//
// The 100px probe survives as the opening guess, which puts the search within
// a step or two of the answer.

import { UI_FONT } from "../type";

const PROBE_PX = 100;
const FALLBACK = 0.58;          // a rough em width, only used with no document
const GUARD = 0.5;              // subpixel slack between the probe and the page

let probe: HTMLSpanElement | null | undefined;
const unit = new Map<string, number>();
const exact = new Map<string, number>();

function element(): HTMLSpanElement | null {
  if (probe === undefined) {
    if (typeof document === "undefined" || !document.body) {
      probe = null;
    } else {
      const el = document.createElement("span");
      el.setAttribute("aria-hidden", "true");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "0";
      el.style.visibility = "hidden";
      el.style.whiteSpace = "pre";
      el.style.fontFamily = UI_FONT;
      el.style.fontVariantNumeric = "tabular-nums";
      document.body.appendChild(el);
      probe = el;
    }
  }
  return probe ?? null;
}

function shapeOf(text: string): string {
  return text.replace(/\d/g, "0");
}

function measure(shape: string, size: number, weight: number): number {
  const el = element();
  if (!el) return FALLBACK * size * shape.length;
  el.style.fontWeight = String(weight);
  el.style.fontSize = `${size}px`;
  el.textContent = shape;
  return el.getBoundingClientRect().width;
}

// The width of a line at one pixel of font size. A guess, good to a few
// percent, and only ever used to open the search.
export function unitWidth(text: string, weight = 700): number {
  if (text.length === 0) return 0;
  const key = `${weight}|${shapeOf(text)}`;
  const hit = unit.get(key);
  if (hit !== undefined) return hit;
  const w = measure(shapeOf(text), PROBE_PX, weight) / PROBE_PX;
  const out = w > 0 ? w : FALLBACK * text.length;
  unit.set(key, out);
  return out;
}

// The rendered width of a line at one exact size, which is the only number
// that can be trusted about whether it fits.
export function widthAt(text: string, size: number, weight = 700): number {
  const shape = shapeOf(text);
  const key = `${weight}|${size}|${shape}`;
  const hit = exact.get(key);
  if (hit !== undefined) return hit;
  const w = measure(shape, size, weight);
  exact.set(key, w);
  return w;
}

// The largest whole pixel size at or below max whose real rendered width fits
// the room, never below min. The guess opens the search and the two walks
// close it, so the answer is measured at the size it is returned for.
export function fitFontSize(
  text: string, room: number, max: number, min: number, weight = 700,
): number {
  if (text.length === 0 || !(room > 0)) return max;
  const w1 = unitWidth(text, weight);
  const limit = room - GUARD;
  let size = w1 > 0
    ? Math.max(min, Math.min(max, Math.floor(limit / w1)))
    : max;
  while (size > min && widthAt(text, size, weight) > limit) size -= 1;
  while (size < max && widthAt(text, size + 1, weight) <= limit) size += 1;
  return size;
}
