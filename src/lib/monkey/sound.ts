// Monkey Trade's juice, synthesized. Tally's module (src/lib/tally/sound.ts)
// copied and retuned to the table in docs/monkey-spec.md section 10. There are
// no audio assets: every sound is a few dozen milliseconds of an oscillator
// through a gain envelope.
//
//   dartThock   a dart landing, pitch stepping up dart by dart
//   buyTick     one slab poured, Tally's tick
//   sellThud    slabs breaking back into ticks, Tally's thud, softer
//   passUp      passing a monkey on the strip, a small upward blip
//   passDown    being passed, a lower one
//   settleRun   the settle pour, a descending run over 1.2 seconds
//   rankReveal  a rising three-note figure when you beat five or more,
//               a low two-note when you do not
//   guidePop    the guide speaking, one soft pop
//
// Three rules hold the module, the same three Tally's holds. Nothing plays
// while muted, nothing plays under prefers-reduced-motion, and no AudioContext
// is constructed until the player has touched the page.
//
// One thing is different, and it is the spec's own instruction: sound is ON
// once armed. Tally started muted because its mix was unapproved; this game's
// feel is the point, so the mix is judged rather than hidden. The preference is
// persisted under `monkey-muted` and only a stored "1" mutes.

const KEY = "monkey-muted";

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let gestured = false;
let muted = false;

// Every note in this game is short and several of them overlap: thirty darts
// land inside two seconds on level 3, and a buy pours up to twelve ticks while
// the strip is blipping. Oscillators sum on the way to the speakers, so peaks
// tuned one at a time can stack into a clip. One master gain sits between every
// note and the destination and holds the whole mix under a ceiling, which is
// also the one place to reach for if the game ever needs to duck itself.
const MASTER = 0.8;

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// Unmuted until told otherwise, in this session and in every one after it.
export function loadMuted(): boolean {
  const s = store();
  if (!s) return false;
  try {
    const raw = s.getItem(KEY);
    muted = raw === "1";
  } catch {
    muted = false;
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

// Called from the first pointer or key event the page sees. Until this has run,
// every play call returns without building anything.
export function armAudio(): void {
  gestured = true;
}

export function isArmed(): boolean {
  return gestured;
}

// The walk's counter. `attempted` counts every call the game made, muted or
// not, so acceptance test L can assert that a moment fired exactly once; and
// `played` counts only the calls that reached an oscillator, so the same test
// can assert that mute and reduced motion really do silence it.
interface SoundCounts {
  played: Record<string, number>;
  attempted: Record<string, number>;
}

function counts(): SoundCounts | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __monkeySound?: SoundCounts };
  if (!w.__monkeySound) w.__monkeySound = { played: {}, attempted: {} };
  return w.__monkeySound;
}

function mark(name: string, played: boolean): void {
  const c = counts();
  if (!c) return;
  c.attempted[name] = (c.attempted[name] ?? 0) + 1;
  if (played) c.played[name] = (c.played[name] ?? 0) + 1;
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

// The master gain, built with the context and never rebuilt.
function out(ac: AudioContext): AudioNode {
  if (!bus || bus.context !== ac) {
    bus = ac.createGain();
    bus.gain.setValueAtTime(MASTER, ac.currentTime);
    bus.connect(ac.destination);
  }
  return bus;
}

// Whether a call would reach the speakers. Read once per public function so the
// counters and the notes agree about what happened.
function live(): boolean {
  return audio() !== null;
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
  osc.connect(gain).connect(out(ac));
  osc.start(at);
  osc.stop(at + t.ms / 1000 + 0.02);
}

// A dart landing. Short and woody, and the pitch steps up dart by dart, so ten
// darts across two seconds are one rising figure rather than ten identical
// knocks. The fast downward glide is what makes it a thock instead of a beep;
// the wave is a triangle rather than a square, because a square's odd harmonics
// turned thirty landings in two seconds into a buzz.
export function dartThock(step: number, of = 10): void {
  const on = live();
  mark("dartThock", on);
  if (!on) return;
  const climb = Math.min(1, Math.max(0, step / Math.max(1, of)));
  play({ freq: 300 + climb * 260, ms: 46, peak: 0.035, type: "triangle", glide: -150 });
  play({ freq: 132 + climb * 60, ms: 70, peak: 0.03, type: "sine", glide: -30 });
}

// One slab poured. Tally's tick, unchanged in shape: the pitch climbs with the
// count so a tall column sounds like a tall column.
export function buyTick(step: number, of = 20): void {
  const on = live();
  mark("buyTick", on);
  if (!on) return;
  const climb = Math.min(1, Math.max(0, step / Math.max(1, of)));
  play({ freq: 520 + climb * 320, ms: 55, peak: 0.042, type: "triangle" });
}

// Slabs breaking back into ticks. Tally's thud, softer, because a sale is not
// the loudest thing in the game.
export function sellThud(): void {
  const on = live();
  mark("sellThud", on);
  if (!on) return;
  play({ freq: 196, ms: 90, peak: 0.038, type: "sine", glide: -56 });
}

// Passing a monkey on the strip. A small upward blip, quiet enough to fire
// several times in a busy month without stacking into a chord.
export function passUp(): void {
  const on = live();
  mark("passUp", on);
  if (!on) return;
  play({ freq: 660, ms: 70, peak: 0.032, type: "triangle", glide: 220 });
}

// Being passed. The same blip turned over and dropped a fifth.
export function passDown(): void {
  const on = live();
  mark("passDown", on);
  if (!on) return;
  play({ freq: 440, ms: 80, peak: 0.028, type: "triangle", glide: -150 });
}

// The settle pour, a descending run over the 1.2 seconds the desk takes to
// count itself out. Eight notes down a scale, scheduled in one call so the run
// keeps its time whatever the frame rate does.
export function settleRun(): void {
  const on = live();
  mark("settleRun", on);
  if (!on) return;
  const steps = 8;
  for (let i = 0; i < steps; i += 1) {
    const fall = i / (steps - 1);
    play({ freq: 740 - fall * 400, ms: 110, peak: 0.03 - fall * 0.008, type: "sine" }, i * 150);
  }
}

// The rank reveal. A rising three-note figure when you beat five or more, a low
// two-note when you do not. This is the only sound that says whether the round
// went your way, so it is the loudest one here: both figures peak around 0.08,
// which is more than twice a dart and stands clear of the settle pour running
// under it.
export function rankReveal(win: boolean): void {
  const on = live();
  mark("rankReveal", on);
  if (!on) return;
  if (win) {
    play({ freq: 523.25, ms: 180, peak: 0.073, type: "triangle" });
    play({ freq: 659.25, ms: 180, peak: 0.073, type: "triangle" }, 130);
    play({ freq: 880, ms: 320, peak: 0.08, type: "triangle" }, 260);
  } else {
    play({ freq: 293.66, ms: 220, peak: 0.08, type: "sine" });
    play({ freq: 233.08, ms: 340, peak: 0.071, type: "sine", glide: -20 }, 180);
  }
}

// The guide speaking. One soft pop, under the bubble, never a chime: the guide
// is a monkey with a line and not a notification.
export function guidePop(): void {
  const on = live();
  mark("guidePop", on);
  if (!on) return;
  play({ freq: 420, ms: 46, peak: 0.03, type: "sine", glide: 130 });
}
