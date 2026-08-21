// The rank strip: the troop's presence during play and the end card's whole
// first line. Ten monkey faces and you, ordered by live worth, sliding into new
// positions as prices move, each with its worth under it. Contract:
// docs/monkey-spec.md sections 6 and 7, docs/monkey-handoff.md.
//
// Two things make this component work and both are about not remounting. Every
// slot is keyed by who it is, so a monkey that climbs two places is the same
// element at a new transform rather than a new element in a new place, and the
// order the page hands in is the order the DOM carries, so the walk can read
// the rank straight off it. Positions are absolute and animated by transform
// alone, which is why a reorder is a slide and never a reflow.
//
// The slide is driven from a layout effect rather than from a CSS transition on
// the inline style, and the reason is worth writing down. Keeping DOM order
// equal to rank order means React moves nodes on every reshuffle, and a moved
// node is detached and reinserted, which cancels any transition running on it.
// A reshuffle therefore used to teleport the monkeys React chose to move and
// slide only the two or three it left alone, so for the length of a slide a
// sliding monkey sat exactly on a teleported one and its own place stood empty:
// eleven monkeys, nine visible, two worths doubled up. Setting the transform
// after the move and animating from where the monkey actually was makes every
// slot move on the same beat, so no two ever park on the same x.
//
// The monkeys also react. When one passes you it cheers for a beat, and when
// you pass one it slumps, both detected by comparing this render's order to the
// last one. That is the whole of the troop's personality during play and it
// costs one ref.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Pose, StripProps, StripSlot } from "./props";
import Guide from "./Guide";
import { UI_FONT } from "../../lib/type";
import {
  EASE, GOLD, GREEN, INK, MOVE_MS, MUTED, RED, SKY, SIZE, WEIGHT,
  reducedMotion, tint,
} from "../../lib/monkey/look";

const REACT_MS = 900;
export const STRIP_HEIGHT = 132;
export const SETTLED_HEIGHT = 210;

function keyOf(who: "you" | number): string {
  return who === "you" ? "you" : String(who);
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// Where a slot is right now, read off the element rather than off what we last
// asked for, so a monkey whose rank flips again mid slide carries on from where
// the eye last saw it instead of snapping back to the place it was leaving.
function currentX(el: HTMLElement): number | null {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return null;
  const flat = /^matrix\(([^)]+)\)$/.exec(t);
  if (flat) {
    const parts = flat[1].split(",");
    const x = Number(parts[4]);
    return Number.isFinite(x) ? x : null;
  }
  const deep = /^matrix3d\(([^)]+)\)$/.exec(t);
  if (deep) {
    const parts = deep[1].split(",");
    const x = Number(parts[12]);
    return Number.isFinite(x) ? x : null;
  }
  return null;
}

// ------------------------------------------------------------------ the tie

// The suit's own tie and the suit itself came back within a few values of each
// other, so a mask on the sprite keys the lapels along with the tie. The tie is
// drawn instead: one small glyph under the face, in the monkey's colour, which
// is legible at strip size and identical in every pose.
function Tie({ color, size }: { color: string; size: number }) {
  const w = size;
  const h = size * 1.45;
  return (
    <svg width={w} height={h} viewBox="0 0 10 14" style={{ display: "block", flex: "0 0 auto" }}>
      <path d="M 5 0 L 8 2.4 L 6.4 4.2 L 3.6 4.2 L 2 2.4 Z" fill={color} />
      <path d="M 3.7 5 L 6.3 5 L 7.4 11 L 5 14 L 2.6 11 Z" fill={color} />
    </svg>
  );
}

// -------------------------------------------------------------- the confetti

// The celebration has to be unmistakable, and the first cut was not: two dozen
// pieces fell straight through the strip and out of the bottom, so by two
// seconds after the end card painted there was nothing left to see and a
// playtester who reached four winning cards reported no confetti at all. So the
// paper now falls and then lands. Fifty-six pieces drop into the settled strip
// over the first two and a half seconds, each one coming to rest in a scatter
// across the lower half rather than leaving the frame, and the whole pile fades
// together at the end. That is roughly a two and a half to three second
// celebration whose middle second is a strip full of paper, which is what a
// screenshot at any moment in it will show.
//
// Every piece is placed by a hash of its own index, so the same win always
// celebrates the same way and no render path ever calls Math.random. Reduced
// motion gets no confetti at all rather than a still one, because a frozen
// scatter of paper reads as a bug.
const CONFETTI = ["#58CC02", "#FFC800", "#1CB0F6", "#FF4B4B"];
const CONFETTI_COUNT = 56;
const CONFETTI_REST_MS = 2450;   // every piece has landed by here
const CONFETTI_FADE_MS = 400;    // and the pile is gone 400ms later

function hash01(n: number): number {
  let h = (n + 7) * 374761393;
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

function Confetti({ width, height }: { width: number; height: number }) {
  const pieces = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const w = 7 + Math.round(hash01(i * 7) * 5);
    const delay = hash01(i * 3 + 1) * 480;
    return {
      left: hash01(i * 3) * Math.max(1, width - w),
      delay,
      // the last piece to start still lands before the pile fades
      fall: (CONFETTI_REST_MS - delay) * (0.72 + hash01(i * 3 + 2) * 0.28),
      drift: hash01(i * 11) * 64 - 32,
      // the pile rests over the troop and stops short of the worths, because
      // the rank line is the end card's first sentence and paper on top of a
      // number is a number nobody can read
      rest: Math.min(height * 0.70 - w * 1.6, height * (0.26 + hash01(i * 13) * 0.44)),
      tilt: hash01(i * 5) * 260 - 130,
      color: CONFETTI[i % CONFETTI.length],
      w,
    };
  }), [width, height]);
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 16 }}
    >
      <style>{`
        @keyframes monkey-confetti-fall {
          from { transform: translate(0, -30px) rotate(0deg) }
          to   { transform: translate(var(--drift), var(--rest)) rotate(var(--tilt)) }
        }
        @keyframes monkey-confetti-rest {
          from { opacity: 1 }
          to   { opacity: 0 }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          data-confetti
          style={{
            position: "absolute",
            top: 0,
            left: p.left,
            width: p.w,
            height: p.w * 1.6,
            borderRadius: 2,
            background: p.color,
            ["--drift" as string]: `${p.drift.toFixed(1)}px`,
            ["--rest" as string]: `${p.rest.toFixed(1)}px`,
            ["--tilt" as string]: `${p.tilt.toFixed(0)}deg`,
            // the fall owns the transform, the rest owns the opacity, and the
            // rest is declared second so its fade wins at the end
            animation: [
              `monkey-confetti-fall ${p.fall.toFixed(0)}ms ${p.delay.toFixed(0)}ms cubic-bezier(0.36, 0, 0.24, 1) both`,
              `monkey-confetti-rest ${CONFETTI_FADE_MS}ms ${CONFETTI_REST_MS}ms linear both`,
            ].join(", "),
          }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ a slot

function Face({ pose, size }: { pose: Pose; size: number }) {
  return (
    <img
      src={`/monkey/monkey-${pose}.png`}
      alt=""
      draggable={false}
      style={{ width: size, height: size, display: "block", objectFit: "contain" }}
    />
  );
}

// ----------------------------------------------------------------- the order

// A monkey holding three stocks adds three products together, so a troop that
// is all square at the open comes out of the arithmetic as $1,000 nine times
// and $999.9999999999999 once, and a strict sort reads that dust as a place. It
// is a tie to every eye and to every reading of the money, so the strip settles
// the order on worths rounded to the cent: monkeys ahead of you when you draw
// level, and monkeys among themselves by index, which is the same rule
// round.ts sorts by and leaves the order the page hands in untouched whenever
// the worths really do differ.
function cents(n: number): number {
  return Math.round(n * 100);
}

function ordered(slots: StripSlot[]): StripSlot[] {
  const out = slots.map((slot, i) => ({ slot, i }));
  out.sort((a, b) => {
    const gap = cents(b.slot.worth) - cents(a.slot.worth);
    if (gap !== 0) return gap;
    if (a.slot.who === "you") return 1;      // ties go to the monkey
    if (b.slot.who === "you") return -1;
    if (typeof a.slot.who === "number" && typeof b.slot.who === "number") {
      return a.slot.who - b.slot.who;
    }
    return a.i - b.i;
  });
  return out.map((e) => e.slot);
}

// --------------------------------------------------------------- the strip

export default function Strip({
  slots, guideIndex, guideLine, settled, mood, playerInitial, ties, width, height,
  onGuideDone,
}: StripProps) {
  const still = reducedMotion();
  const rank = useMemo(() => ordered(slots), [slots]);
  const h = height ?? (settled ? SETTLED_HEIGHT : STRIP_HEIGHT);
  const faceSize = settled ? 88 : 58;
  const worthSize = settled ? 15 : 13;

  // The reactions. Only the live strip reacts; the end card's mood is the
  // page's to set and a slot that is already cheering does not need to be
  // told twice.
  const [reaction, setReaction] = useState<Record<string, Pose>>({});
  const prevOrder = useRef<Record<string, number> | null>(null);
  const timers = useRef<Record<string, number>>({});

  const order = useMemo(() => {
    const map: Record<string, number> = {};
    rank.forEach((s, i) => { map[keyOf(s.who)] = i; });
    return map;
  }, [rank]);

  useEffect(() => {
    const prev = prevOrder.current;
    prevOrder.current = order;
    if (!prev || settled || still) return;
    const youNow = order.you;
    const youWas = prev.you;
    if (youNow === undefined || youWas === undefined) return;
    const next: Record<string, Pose> = {};
    Object.keys(order).forEach((k) => {
      if (k === "you") return;
      const was = prev[k];
      if (was === undefined) return;
      const wasBelow = was > youWas;
      const isBelow = order[k] > youNow;
      if (wasBelow && !isBelow) next[k] = "cheer";      // it passed you
      else if (!wasBelow && isBelow) next[k] = "slump"; // you passed it
    });
    const names = Object.keys(next);
    if (names.length === 0) return;
    setReaction((r) => ({ ...r, ...next }));
    names.forEach((k) => {
      window.clearTimeout(timers.current[k]);
      timers.current[k] = window.setTimeout(() => {
        setReaction((r) => {
          const copy = { ...r };
          delete copy[k];
          return copy;
        });
      }, REACT_MS);
    });
  }, [order, settled, still]);

  useEffect(() => () => {
    Object.values(timers.current).forEach((t) => window.clearTimeout(t));
  }, []);

  const count = Math.max(1, rank.length);
  const pad = settled ? 8 : 4;
  const step = (width - pad * 2) / count;
  const slotW = Math.max(48, step - (settled ? 8 : 4));

  // The placement. Every slot's x comes from its own position in the DOM, which
  // is the rank order React just committed, so a place can never be claimed
  // twice and can never stand empty. Runs after every render, before paint.
  const root = useRef<HTMLDivElement | null>(null);
  const placed = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    const els = Array.from(box.querySelectorAll<HTMLElement>("[data-slot-who]"));
    const here = new Set<string>();
    els.forEach((el, i) => {
      const k = el.getAttribute("data-slot-who") ?? String(i);
      here.add(k);
      const target = pad + i * step + (step - slotW) / 2;
      if (placed.current.get(k) === target) return;
      const first = !placed.current.has(k);
      const from = first ? target : currentX(el) ?? placed.current.get(k) ?? target;
      placed.current.set(k, target);
      if (typeof el.animate === "function") el.getAnimations().forEach((a) => a.cancel());
      el.style.transform = `translateX(${target}px)`;
      if (still || first || Math.abs(from - target) < 0.5) return;
      if (typeof el.animate !== "function") return;
      el.animate(
        [{ transform: `translateX(${from}px)` }, { transform: `translateX(${target}px)` }],
        { duration: MOVE_MS, easing: EASE },
      );
    });
    placed.current.forEach((_, k) => { if (!here.has(k)) placed.current.delete(k); });
  });

  return (
    <div
      ref={root}
      data-strip
      data-strip-settled={settled ? "1" : "0"}
      data-strip-mood={mood ?? ""}
      style={{
        position: "relative",
        width,
        height: h,
        fontFamily: UI_FONT,
        color: INK,
      }}
    >
      {settled && mood === "cheer" && !still && <Confetti width={width} height={h} />}

      {rank.map((slot, i) => {
        const k = keyOf(slot.who);
        const you = slot.who === "you";
        const lit = settled && you;
        const pose: Pose = slot.pose
          ?? (settled && mood === "cheer" ? "cheer"
            : settled && mood === "slump" ? "slump"
              : reaction[k]
                ?? (!settled && guideLine && slot.who === guideIndex ? "talk" : "idle"));
        const tie = typeof slot.who === "number" ? (ties[slot.who] ?? MUTED) : MUTED;
        const isGuide = slot.who === guideIndex;

        return (
          <div
            key={k}
            data-slot-who={k}
            data-slot-worth={slot.worth}
            data-slot-rank={i}
            title={you ? "You" : `Monkey ${slot.who}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: slotW,
              height: h,
              willChange: "transform",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 2,
              borderRadius: 16,
              background: lit ? tint(GOLD, 0.28) : "transparent",
              paddingBottom: 6,
            }}
          >
            {/* the guide's bubble hangs over its own slot and fades on its own */}
            {isGuide && !settled && (
              <div style={{ position: "absolute", bottom: h - 6, left: -24, zIndex: 3 }}>
                <Guide line={guideLine} onDone={onGuideDone} width={272} />
              </div>
            )}

            {you ? (
              <div
                style={{
                  width: faceSize * 0.68,
                  height: faceSize * 0.68,
                  borderRadius: "50%",
                  background: lit ? GOLD : SKY,
                  color: lit ? INK : "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: settled ? 26 : 20,
                  fontWeight: WEIGHT.heading,
                  transform: settled && mood === "slump" ? "translateY(6px) scale(0.92)" : "none",
                  opacity: settled && mood === "slump" ? 0.75 : 1,
                  transition: still ? "none" : `transform ${MOVE_MS}ms ${EASE}, opacity ${MOVE_MS}ms ease-out`,
                }}
              >
                {playerInitial}
              </div>
            ) : (
              <Face pose={pose} size={faceSize} />
            )}

            {!you && <Tie color={tie} size={settled ? 11 : 9} />}

            <div
              className="tnum"
              style={{
                fontSize: worthSize,
                fontWeight: lit ? WEIGHT.heading : WEIGHT.emphasis,
                fontVariantNumeric: "tabular-nums",
                color: lit ? INK : you ? SKY : INK,
                lineHeight: "18px",
              }}
            >
              {money(slot.worth)}
            </div>

            {settled && (
              <div
                style={{
                  fontSize: 12,
                  color: MUTED,
                  lineHeight: "16px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {you ? "You" : `Monkey ${slot.who}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The two colours the page uses to write a worth beside the strip, exported so
// the header and the strip never disagree about what up and down look like.
export const STRIP_UP = GREEN;
export const STRIP_DOWN = RED;
