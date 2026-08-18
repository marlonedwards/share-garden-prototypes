// The one typeface on the site. Canvas and SVG code cannot read a CSS
// variable, so the stack lives here as a string and every drawing surface
// imports it. Contract: docs/clean-type.md.

export const UI_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Canvas font shorthand, so no file has to remember the order of the parts.
export function uiFont(px: number, weight: number = 400): string {
  return `${weight} ${px}px ${UI_FONT}`;
}
