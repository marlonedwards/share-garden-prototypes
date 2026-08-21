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
// The monkeys also react. When one passes you it cheers for a beat, and when
// you pass one it slumps, both detected by comparing this render's order to the
// last one. That is the whole of the troop's personality during play and it
// costs one ref.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pose, StripProps } from "./props";
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

// Twenty-four pieces in the look's four colours, placed by a hash of their own
// index so the same rank always celebrates the same way and no render path ever
// calls Math.random. Reduced motion gets no confetti at all rather than a still
// one, because a frozen scatter of paper reads as a bug.
const CONFETTI = ["#58CC02", "#FFC800", "#1CB0F6", "#FF4B4B"];

function hash01(n: number): number {
  let h = (n + 7) * 374761393;
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

function Confetti({ width, height }: { width: number; height: number }) {
  const pieces = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    left: hash01(i * 3) * width,
    delay: hash01(i * 3 + 1) * 900,
    fall: 1500 + hash01(i * 3 + 2) * 900,
    tilt: hash01(i * 5) * 260 - 130,
    color: CONFETTI[i % CONFETTI.length],
    w: 7 + Math.round(hash01(i * 7) * 5),
  })), [width]);
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 16 }}
    >
      <style>{`
        @keyframes monkey-confetti {
          0%   { transform: translateY(-24px) rotate(0deg); opacity: 0 }
          12%  { opacity: 1 }
          100% { transform: translateY(${height + 30}px) rotate(var(--tilt)); opacity: 0 }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: p.left,
            width: p.w,
            height: p.w * 1.6,
            borderRadius: 2,
            background: p.color,
            ["--tilt" as string]: `${p.tilt}deg`,
            animation: `monkey-confetti ${p.fall}ms ${p.delay}ms ease-in forwards`,
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

// --------------------------------------------------------------- the strip

export default function Strip({
  slots, guideIndex, guideLine, settled, mood, playerInitial, ties, width, height,
  onGuideDone,
}: StripProps) {
  const still = reducedMotion();
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
    slots.forEach((s, i) => { map[keyOf(s.who)] = i; });
    return map;
  }, [slots]);

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

  const count = Math.max(1, slots.length);
  const pad = settled ? 8 : 4;
  const step = (width - pad * 2) / count;
  const slotW = Math.max(48, step - (settled ? 8 : 4));

  return (
    <div
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

      {slots.map((slot, i) => {
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
              transform: `translateX(${pad + i * step + (step - slotW) / 2}px)`,
              transition: still ? "none" : `transform ${MOVE_MS}ms ${EASE}`,
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
