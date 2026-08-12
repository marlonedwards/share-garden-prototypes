// The resolve, as a schedule, in two acts.
//
// Before this file the resolve was one sweep: every holding the player owned was
// blended into a single number that climbed while the wall grew, so a player who
// had chosen five cards watched one animation and learned nothing about any of
// them. The resolve is the scoring moment, and a scoring moment has to be made
// of the player's own choices, one at a time.
//
// The first pass at that scored each card and built the wall at the same time,
// and the eye had to choose between the two. So the resolve is now two acts and
// they never overlap:
//
//   ACT ONE, THE CARDS   the wall dims a shade and holds perfectly still. No
//                        band lands and the count does not move. Each stack in
//                        turn lifts, takes its hit, and shows one chip carrying
//                        both of its numbers: what it did to the wall in blocks,
//                        and underneath, small, the move that did it.
//
//   ACT TWO, THE WALL    the cards are done and still. The wall comes back up,
//                        the months inside the span sweep past quickly, and then
//                        the closing column assembles band by band in the order
//                        the cards just scored, with the count ticking as the
//                        blocks land. The cash band lands last and the stakes
//                        line settles after it.
//
// Everything here is arithmetic on real consequences. Nothing is scored against
// an alternative, nothing pays for timing, and the drama is entirely a matter of
// how long the true numbers are given to land.
//
// This module is pure: it takes the turn's numbers and hands back a list of
// timed events. The page owns the timers and the state, and this owns the
// pacing, so the pacing can be read in one place and tuned without touching the
// board.

export interface TallyHolding {
  assetId: string;
  // the signed change this holding made to the wall, in blocks
  blocks: number;
  // how many blocks this holding's band lays on the turn's new column
  bandBlocks: number;
  // a stone moves nothing and is skipped with no chip at all
  skip: boolean;
}

export interface TallyInput {
  holdings: TallyHolding[];
  // the cash band on the new column, and what it changed by
  cashBandBlocks: number;
  cashBlocks: number;
  railFrom: number;
  railTo: number;
  // this turn's span carries a front page
  heavy: boolean;
  // how many month columns arrive before the closing column, as backdrop
  months: number;
  reduced: boolean;
}

export type TallyEvent =
  // act one opens: the wall goes down a shade and stops moving
  | { at: number; kind: "still" }
  // this stack lifts and takes its hit
  | { at: number; kind: "focus"; assetId: string; blocks: number }
  // its chip, whole, carrying both of its numbers at once
  | {
      at: number; kind: "chip"; assetId: string; blocks: number;
      count: number; of: number; sound: "tick" | "thud" | "none";
    }
  // act two opens: the wall comes back up and the backdrop months arrive
  | { at: number; kind: "sweep" }
  // the closing column stands this many blocks tall
  | { at: number; kind: "band"; specs: number }
  // the count, ticking with the blocks that are landing
  | {
      at: number; kind: "rail"; value: number;
      count: number; of: number; sound: "tick" | "thud" | "none";
    }
  // every band has landed; the cash band lands and the count lands with it
  | { at: number; kind: "cash"; specs: number; rail: number; sound: boolean; last: boolean }
  // the stakes line, last of all, once the column is finished
  | { at: number; kind: "settle" }
  | { at: number; kind: "rest" }
  | { at: number; kind: "end" };

export interface TallySchedule {
  events: TallyEvent[];
  endMs: number;
  // where act one ends and act two begins, which is also when the wall wakes up
  act1Ms: number;
  monthStep: number;
  heavy: boolean;
  // three or more holdings lost blocks together, which is a crash and is paced
  // and voiced as one
  crash: boolean;
}

// The pacing, in milliseconds, in one place.
//
// The whole resolve is held under CAP_MS, and inside that the two acts are held
// near their shares: the cards are the decision the player made and get the
// larger half, the wall is the consequence and gets the smaller one.
const CAP_MS = 4800;
const ACT1_SHARE = 0.6;
const ACT2_SHARE = 0.4;
// a resolve whose cards were quick still gives the wall long enough to be read
const ACT2_MIN = 900;

const STILL_MS = 300;      // the beat a heavy turn opens with, before the cards

const LIFT_MS = 110;       // a stack lifts before its chip lands
const STEP_MS = 92;        // how much one block of movement is worth in reading time
// A chip is one object now rather than a counter, so the beat it is given is
// long enough to read and never long enough to wait through, however many
// blocks the holding moved.
const READ_MIN = 150;
const READ_CAP = 430;
// The chip stands still before the next stack takes over. The scoring is the
// point of the beat, so the chip is given long enough to be read rather than
// glimpsed.
const HOLD_MS = 196;
const QUIET_LIFT = 75;     // the same two for a stack that held its price
const QUIET_HOLD = 120;

const HEAVY_LIFT = 150;
const HEAVY_STEP = 124;
const HEAVY_HOLD = 266;
const CRASH_GAP = 110;     // the pause between two names falling on a crash turn

const SWEEP_CAP = 460;     // the whole backdrop sweep, however many months it holds
const MONTH_MS = 110;      // one backdrop month, where there is room for it
const LEAD_MS = 150;       // the beat between the sweep and the first band

const BAND_STEP = 34;      // one block landing on the closing column
const BAND_MIN = 70;       // the shortest a band takes to lay itself
const BAND_CAP = 300;      // and the longest
const BAND_GAP = 40;       // the beat between one holding's band and the next

const CASH_LEAD = 130;
const CASH_STEP = 70;
// A wall can carry twenty cash blocks, and twenty ticks after the last band has
// landed is a second and a half of nothing happening. The cash band always lands
// inside this, however many blocks it holds, and only a handful of them make a
// sound, because this beat is the wall settling and not a card paying out.
const CASH_SPAN = 380;
const CASH_VOICES = 5;
const TAIL_MS = 260;       // the wall stands finished before the paper or the shop

// Reduced motion gets the end state at once and then a moment to read it, which
// is the only honest translation of a sequence into no sequence: the chips are
// the information, so they are shown, they are just never animated.
const REST_MS = 900;

export function tallySchedule(input: TallyInput): TallySchedule {
  const scoring = input.holdings.filter((h) => !h.skip);
  const losers = scoring.filter((h) => h.blocks < 0).length;
  const crash = losers >= 3;
  const heavy = input.heavy;

  if (input.reduced) {
    const events: TallyEvent[] = [
      { at: 0, kind: "rest" },
      { at: 0, kind: "settle" },
      { at: REST_MS, kind: "end" },
    ];
    return { events, endMs: REST_MS, act1Ms: 0, monthStep: 0, heavy, crash };
  }

  const lift = heavy ? HEAVY_LIFT : LIFT_MS;
  const step = heavy ? HEAVY_STEP : STEP_MS;
  const hold = heavy ? HEAVY_HOLD : HOLD_MS;

  // ------------------------------------------------------------- act one

  // What each card's beat costs, before any capping. A stack that moved blocks
  // is given reading time in proportion to how far it moved; a stack that held
  // is over quickly, because "held" is one word.
  const beats = scoring.map((h) => {
    const n = Math.abs(h.blocks);
    if (n === 0) {
      return { h, n, lift: QUIET_LIFT, read: 0, hold: QUIET_HOLD, ms: QUIET_LIFT + QUIET_HOLD };
    }
    const read = Math.min(READ_CAP, Math.max(READ_MIN, n * step));
    const gap = crash && h.blocks < 0 ? CRASH_GAP : 0;
    return { h, n, lift, read, hold: hold + gap, ms: lift + read + hold + gap };
  });

  const stillMs = heavy ? STILL_MS : 0;
  const raw1 = stillMs + beats.reduce((s, b) => s + b.ms, 0);
  const cap1 = CAP_MS * ACT1_SHARE;
  const k1 = raw1 > cap1 ? cap1 / raw1 : 1;
  const ms1 = (v: number) => Math.round(v * k1);

  const events: TallyEvent[] = [];
  events.push({ at: 0, kind: "still" });
  let t = ms1(stillMs);

  for (const b of beats) {
    const h = b.h;
    events.push({ at: t, kind: "focus", assetId: h.assetId, blocks: h.blocks });
    events.push({
      at: t + ms1(b.lift),
      kind: "chip",
      assetId: h.assetId,
      blocks: h.blocks,
      count: b.n,
      of: b.n,
      sound: b.n === 0 ? "none" : h.blocks > 0 ? "tick" : "thud",
    });
    t += ms1(b.ms);
  }
  const act1Ms = t;

  // ------------------------------------------------------------- act two

  // Every holding lays its band in the order it just scored in, which is the
  // order the wall stacks its bands, so the chip and the blocks are the same
  // fact told twice. A holding that neither moved the count nor stands on the
  // column has nothing to lay and takes no time.
  const lane = input.holdings
    .filter((h) => h.bandBlocks > 0 || h.blocks !== 0)
    .map((h) => {
      const work = Math.max(h.bandBlocks, Math.abs(h.blocks));
      const win = Math.min(BAND_CAP, Math.max(BAND_MIN, work * BAND_STEP));
      return { h, win, ms: win + BAND_GAP };
    });

  const months = Math.max(0, input.months);
  const sweepRaw = months > 0 ? Math.min(SWEEP_CAP, months * MONTH_MS) : 0;
  const cashBand = Math.max(0, input.cashBandBlocks);
  const cashSpanRaw = Math.min(cashBand * CASH_STEP, CASH_SPAN);

  const raw2 = sweepRaw + LEAD_MS + lane.reduce((s, l) => s + l.ms, 0)
    + CASH_LEAD + cashSpanRaw + TAIL_MS;
  // The wall's share of the whole, floored so a one card turn still gets a wall
  // worth watching and ceilinged so the pair together stay under the cap.
  const room2 = Math.max(
    ACT2_MIN,
    Math.min(Math.max(600, CAP_MS - act1Ms), (act1Ms * ACT2_SHARE) / ACT1_SHARE),
  );
  const k2 = raw2 > room2 ? room2 / raw2 : 1;
  const ms2 = (v: number) => Math.round(v * k2);

  events.push({ at: act1Ms, kind: "sweep" });
  const sweepMs = ms2(sweepRaw);
  const monthStep = months > 0 ? Math.max(1, Math.round(sweepMs / months)) : MONTH_MS;

  t = act1Ms + sweepMs + ms2(LEAD_MS);

  // The closing column starts empty and is built band by band, so `specs` is the
  // running height of the column in blocks and every holding's band is a
  // contiguous run of it. This is the same prefix the wall itself stacks in.
  let specs = 0;
  let rail = input.railFrom;

  for (const l of lane) {
    const h = l.h;
    const from = t;
    const win = Math.max(1, ms2(l.win));
    for (let i = 1; i <= h.bandBlocks; i++) {
      events.push({
        at: from + Math.round((win * i) / Math.max(1, h.bandBlocks)),
        kind: "band",
        specs: specs + i,
      });
    }
    specs += h.bandBlocks;

    // the count, ticking with the blocks that are landing
    const n = Math.abs(h.blocks);
    const dir = h.blocks >= 0 ? 1 : -1;
    for (let i = 1; i <= n; i++) {
      rail += dir;
      events.push({
        at: from + Math.round((win * i) / n),
        kind: "rail",
        value: rail,
        count: i,
        of: n,
        sound: dir > 0 ? "tick" : "thud",
      });
    }
    t = from + ms2(l.ms);
  }

  // The cash band, last and quiet. It is where the turn's income shows up on the
  // wall and where the rounding between the bands and the cash on top of them
  // settles, and it is nobody's card, so it gets no chip.
  t += ms2(CASH_LEAD);
  const span = ms2(cashSpanRaw);
  const stride = Math.max(1, Math.ceil(cashBand / CASH_VOICES));
  for (let i = 1; i <= cashBand; i++) {
    events.push({
      at: t + Math.round((span * (i - 1)) / Math.max(1, cashBand)),
      kind: "cash",
      specs: specs + i,
      rail: i === cashBand ? input.railTo : rail,
      sound: i % stride === 0 || i === cashBand,
      last: i === cashBand,
    });
  }
  t += span;
  if (cashBand === 0) {
    events.push({ at: t, kind: "cash", specs, rail: input.railTo, sound: false, last: true });
  }

  // the stakes line, last of all: the arithmetic about the goal moves once the
  // column it is about has finished standing up
  events.push({ at: t, kind: "settle" });

  const endMs = t + ms2(TAIL_MS);
  events.push({ at: endMs, kind: "end" });
  events.sort((a, b) => a.at - b.at);
  return { events, endMs, act1Ms, monthStep, heavy, crash };
}
