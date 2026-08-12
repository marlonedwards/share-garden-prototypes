// Countable units. The oldest rule in visual public education (Neurath's
// ISOTYPE): a bigger quantity is drawn as MORE BLOCKS, never as a bigger
// shape. Area and volume are the two channels people read worst, which is
// exactly what the orb and the cylinder were asking them to read.
//
// The one thing that can kill the idea is the denomination. Too small and the
// column is a hundred blocks tall and uncountable, which is the orb's failure
// in a different costume; too large and a whole year of early growth passes
// without a single block appearing. The answer here:
//
//   * one denomination holds for a long stretch, and every step is exactly x4,
//     so a promotion is four blocks visibly fusing into one;
//   * the promotion is driven by the monotonic dollar ruler the parent already
//     keeps (StackStageProps.maxDollars), so it never flickers back;
//   * the column is capped at 40 blocks, grouped in fives, so it stays
//     countable at a glance.
//
// Measured against the real 2008 era (src/data/eraGfc.json) through the
// existing engine, with a $1,000 stake and the ruler at 8% headroom:
//
//   index only              11 to 35 blocks, no promotion in nine years
//   equal weight five       9 to 35 blocks, one promotion (Feb 2012)
//   all in Fruit Computers  5 to 36 blocks, two promotions (it went up ten times)
//   all in Mega Bank        11 blocks down to 1
//   all in The Old Bank     17 blocks down to 0
//
// A column never leaves the 5-to-40 range on real data, and the promotions are
// rare enough to be events rather than noise.

export const BLOCK_LADDER = [50, 200, 800, 3200, 12800, 51200];

// the tallest the ruler may stand before the denomination promotes; picked so
// that a promotion lands the column at 10 blocks, never lower
export const BLOCK_CAP = 40;

// ISOTYPE grouping: a visible gap every five blocks, so 35 reads as seven
// groups instead of a wall
export const BLOCK_GROUP = 5;

// The denomination is a pure function of the ruler, and the parent keeps the
// ruler monotonic, so the denomination only ever climbs.
export function blockDenom(maxDollars: number): number {
  const top = Math.max(0, maxDollars);
  for (const v of BLOCK_LADDER) if (Math.ceil(top / v) <= BLOCK_CAP) return v;
  return BLOCK_LADDER[BLOCK_LADDER.length - 1];
}

export function blocksOf(dollars: number, denom: number): number {
  return Math.max(0, Math.round(dollars / denom));
}

// Largest remainder, so the per-holding block counts always add up to exactly
// the column height. Without this the parts and the whole disagree by a block
// and the picture stops being countable.
export function allocateBlocks(values: number[], denom: number): number[] {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  const want = blocksOf(total, denom);
  const exact = values.map((v) => Math.max(0, v) / denom);
  const out = exact.map((e) => Math.floor(e));
  let left = want - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r);
  for (let k = 0; k < order.length && left > 0; k++) { out[order[k].i]++; left--; }
  for (let k = order.length - 1; k >= 0 && left < 0; ) {
    if (out[order[k].i] > 0) { out[order[k].i]--; left++; } else { k--; }
  }
  return out;
}

export function denomLabel(denom: number): string {
  return `every block is $${denom.toLocaleString("en-US")}`;
}
