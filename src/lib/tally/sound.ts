// The juice, synthesized. There are no audio assets in this repo and there is
// not going to be one: every sound here is a few dozen milliseconds of an
// oscillator through a gain envelope, which is small, instant, and impossible
// to get wrong on a slow connection.
//
// Six sounds, one for each moment that already has a motion:
//
//   tick    one block landing. The pitch climbs a little with the count, so a
//           tall column sounds like a tall column.
//   thud    blocks leaving. Lower, softer, and shorter, because a loss should
//           not be the loudest thing in the game.
//   toll    the still beat before a turn that carries a front page.
//   snap    the paper opening.
//   chime   payday.
//   pay     the bank's interest, landing on the table after the column
//           finishes. The payday chime's own two notes, a fourth lower and
//           quieter, because it is the same kind of event and a smaller one.
//
// Three rules hold the whole module. Nothing plays while muted, nothing plays
// under prefers-reduced-motion, and no AudioContext is ever constructed until
// the player has touched the page, because a context built before a gesture is
// a console warning on every browser worth supporting.
//
// The preference is persisted and it starts muted, because the mix has not
// been approved yet.

const KEY = "tally-muted-v1";

let ctx: AudioContext | null = null;
let gestured = false;
let muted = true;

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// Muted until told otherwise, in this session and in every one after it.
export function loadMuted(): boolean {
  const s = store();
  if (!s) return true;
  try {
    const raw = s.getItem(KEY);
    muted = raw === null ? true : raw === "1";
  } catch {
    muted = true;
  }
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  const s = store();
  try { s?.setItem(KEY, next ? "1" : "0"); } catch { /* private browsing */ }
}

export function isMuted(): boolean {
  return muted;
}

function reduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Called from the first pointer or key event the board sees. Until this has
// run, every play call returns without building anything.
export function armAudio(): void {
  gestured = true;
}

function audio(): AudioContext | null {
  if (!gestured || muted || reduced()) return null;
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  ms: number;
  peak: number;
  type?: OscillatorType;
  // a small downward or upward slide inside the note, in hertz
  glide?: number;
}

function play(t: Tone, delayMs = 0): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = t.type ?? "triangle";
  osc.frequency.setValueAtTime(t.freq, at);
  if (t.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, t.freq + t.glide), at + t.ms / 1000);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(t.peak, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + t.ms / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + t.ms / 1000 + 0.02);
}

// One block landing. `step` is how far up the column this block is, so the
// pitch climbs as the count climbs and a run of ten blocks is a little rising
// figure rather than ten identical clicks.
//
// `pitch` and `gain` are what the per holding tally uses. A stack scoring its
// own blocks gets the plain tick; the cash band that lands after every stack has
// scored gets the same figure a fifth lower and quieter, so the last beat of a
// resolve is clearly the wall settling rather than another card paying out.
export interface ToneShape {
  pitch?: number;
  gain?: number;
}

export function blockTick(step: number, of = 20, shape: ToneShape = {}): void {
  const climb = Math.min(1, Math.max(0, step / Math.max(1, of)));
  play({
    freq: (520 + climb * 320) * (shape.pitch ?? 1),
    ms: 55,
    peak: 0.045 * (shape.gain ?? 1),
    type: "triangle",
  });
}

// Blocks leaving. Lower and rounder than the tick, and it slides down.
//
// `weight` is what a heavy turn leans on: the same thud dropped in pitch,
// lengthened and pushed a little louder, so four names falling together in
// September 2008 do not sound like four names drifting down in a quiet month.
export interface ThudShape extends ToneShape {
  weight?: number;
}

export function blockThud(step: number, of = 20, shape: ThudShape = {}): void {
  const fall = Math.min(1, Math.max(0, step / Math.max(1, of)));
  const weight = Math.max(0.5, Math.min(2, shape.weight ?? 1));
  play({
    freq: ((210 - fall * 60) / weight) * (shape.pitch ?? 1),
    ms: 90 * weight,
    peak: 0.05 * Math.min(1.6, weight) * (shape.gain ?? 1),
    type: "sine",
    glide: -60 * weight,
  });
}

// The beat of stillness before a turn that carries a front page. One low note
// under everything, quiet enough to be felt rather than heard, so the field
// dimming has something to dim to.
export function eventToll(): void {
  play({ freq: 110, ms: 520, peak: 0.035, type: "sine", glide: -26 });
  play({ freq: 73.42, ms: 620, peak: 0.028, type: "sine" }, 40);
}

// The paper opening.
export function paperSnap(): void {
  play({ freq: 1400, ms: 40, peak: 0.035, type: "square", glide: -700 });
  play({ freq: 320, ms: 90, peak: 0.03, type: "sine" }, 30);
}

// Payday, once per turn, when the income blocks slide in.
export function paydayChime(): void {
  play({ freq: 659.25, ms: 220, peak: 0.05, type: "sine" });
  play({ freq: 987.77, ms: 260, peak: 0.04, type: "sine" }, 90);
}

// The bank paying its interest, once per turn, at the read beat. The payday
// figure a fourth lower and a good deal quieter, so it is heard as the same
// kind of thing arriving and never as the louder one.
export function interestChime(): void {
  play({ freq: 493.88, ms: 200, peak: 0.03, type: "sine" });
  play({ freq: 739.99, ms: 240, peak: 0.024, type: "sine" }, 85);
}
