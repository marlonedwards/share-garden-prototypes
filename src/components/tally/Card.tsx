// The card, drawn exactly as variant A draws it: a white rounded rectangle
// 96 by 96, a 2.5px ring in the suit colour, a sector pip, a two line name, a
// row of blocks for what this one card is worth, and the real price at the
// bottom. That is the whole face and nothing else is allowed on it.
//
// There is no percent line on the face at all. A change percentage exists in
// exactly one moment in this game, the resolve, and as of the two act pass it
// belongs to the scoring chip over the stack rather than to the card under it,
// because one fact told in two places on the same beat is two things to look at.
// A card that carried its move forever would be a screen full of forecasts,
// which is the one framing the style contract bans outright.
//
// Everything the face gave up lives on the back, one tap away: what the card
// holds, what it did since the last turn, the one sentence that says what this
// type of card is, and the disclosure a reconstructed series or an authored
// rate owes the reader. The face keeps the dotted underline under the price as
// the cue that there is something to read.
//
// The basket ring is the one gradient in the game and the one card that shines
// on hover. It is not mechanically wild. It is just the only card whose ring is
// every colour at once, because it is the only card that is every colour at
// once.

import { useEffect, useState } from "react";
import {
  Suit, Sector, RING_COLOR, BASKET_RING_GRADIENT, SECTOR_COLOR, SECTOR_LABEL,
} from "../../lib/tally/deck";
import { Block, STONE_GREY } from "./Blocks";

const SANS = '"Helvetica Neue", Inter, -apple-system, system-ui, sans-serif';
const INK = "#1D1D1F";
const SUB = "#6E6E73";

export const CARD_W = 96;
export const CARD_H = 96;

export interface CardFaceProps {
  name: string;              // already resolved for the real names toggle
  suit: Suit;
  sector: Sector;
  worthBlocks: number;       // this one card's worth, or the two blocks it costs
  blockColor: string;
  priceLabel: string;        // "$113.66" or "2% a year", formatted by the caller
  stone?: boolean;
  dotted?: boolean;          // a disclosure is waiting on the back
  newFlash?: boolean;        // listed on this turn
  width?: number;
  height?: number;
  dimmed?: boolean;
  shake?: boolean;
  onTap?: () => void;
  title?: string;
}

const FLASH_ID = "tally-card-anims";

// The motions a card has, in one stylesheet, added once. The shop's till draws
// the refusal shake on a row that is not a card face, so this is exported
// rather than left as a private detail of this file.
//
// The punch is the scoring moment's whole physical argument. When a stack's turn
// arrives the card does not merely rise: it takes a hit. A gain springs up,
// overshoots, and settles back through a smaller counter-swing; a loss drops
// first, sags, and comes back up to rest. The keyframes carry the spring
// themselves and the timing function stays linear, because a spring bent by an
// ease is a wobble, and a wobble is not a punch.
export function ensureCardAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(FLASH_ID)) return;
  const el = document.createElement("style");
  el.id = FLASH_ID;
  el.textContent = `
@keyframes tally-refuse {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  45% { transform: translateX(4px); }
  70% { transform: translateX(-2px); }
}
@keyframes tally-punch-gain {
  0%   { transform: translateY(0) scale(1) rotate(0deg); }
  16%  { transform: translateY(-7px) scale(1.084) rotate(-2.7deg); }
  37%  { transform: translateY(2px) scale(0.974) rotate(1.4deg); }
  59%  { transform: translateY(-2.5px) scale(1.028) rotate(-0.75deg); }
  80%  { transform: translateY(0.5px) scale(0.993) rotate(0.3deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}
@keyframes tally-punch-loss {
  0%   { transform: translateY(0) scale(1) rotate(0deg); }
  18%  { transform: translateY(8px) scale(0.934) rotate(2.5deg); }
  43%  { transform: translateY(-3px) scale(1.034) rotate(-1.3deg); }
  67%  { transform: translateY(1.5px) scale(0.985) rotate(0.6deg); }
  86%  { transform: translateY(-0.5px) scale(1.006) rotate(-0.2deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}
@keyframes tally-punch-flat {
  0%   { transform: scale(1) rotate(0deg); }
  28%  { transform: scale(1.03) rotate(-0.9deg); }
  64%  { transform: scale(0.994) rotate(0.35deg); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes tally-peek-nudge {
  0%   { transform: translate(0, 0) rotate(0deg); }
  30%  { transform: translate(1.5px, -3px) rotate(-1.5deg); }
  64%  { transform: translate(-0.5px, 1px) rotate(0.5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes tally-peek-nudge-down {
  0%   { transform: translate(0, 0) rotate(0deg); }
  30%  { transform: translate(-1.5px, 3px) rotate(1.4deg); }
  64%  { transform: translate(0.5px, -1px) rotate(-0.5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes tally-edge-flash {
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  52%  { opacity: 0.5; }
  100% { opacity: 0; }
}
@keyframes tally-chip-punch {
  0%   { transform: translateY(9px) scale(0.55); opacity: 0; }
  30%  { transform: translateY(-3px) scale(1.15); opacity: 1; }
  55%  { transform: translateY(1px) scale(0.962); opacity: 1; }
  78%  { transform: translateY(-1px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .tally-refuse, .tally-punch, .tally-peek, .tally-chip-punch { animation: none !important; }
  .tally-edge-flash { animation: none !important; opacity: 0 !important; }
}`;
  document.head.appendChild(el);
}

export default function CardFace(p: CardFaceProps) {
  const [hover, setHover] = useState(false);
  const w = p.width ?? CARD_W;
  const h = p.height ?? CARD_H;
  const basket = p.suit === "basket" && !p.stone;
  const blockSize = w >= 84 ? 10 : 8.5;
  ensureCardAnims();

  const ring: React.CSSProperties = basket
    ? {
        border: "2.5px solid transparent",
        background: `linear-gradient(#fff, #fff) padding-box, ${BASKET_RING_GRADIENT} border-box`,
        filter: hover ? "saturate(1.55) brightness(1.14)" : undefined,
        transition: "filter .18s ease",
      }
    : { border: `2.5px solid ${p.stone ? STONE_GREY : RING_COLOR[p.suit]}` };

  // The price line is one line, always, and it is the widest thing on the face
  // when it is a rate rather than a price. Rather than clip it or wrap it, it is
  // set at the largest size that fits the card it is on, so "pays 12% a year"
  // and "$113.66" both sit inside the same padding.
  const priceSize = Math.max(
    9.5,
    Math.min(13.5, (w - 16) / Math.max(1, p.priceLabel.length * 0.54)),
  );

  const blocks: JSX.Element[] = [];
  const count = p.stone ? 1 : Math.max(0, Math.min(12, Math.round(p.worthBlocks)));
  for (let i = 0; i < count; i++) {
    blocks.push(<Block key={i} size={blockSize} color={p.blockColor} stone={p.stone} />);
  }

  return (
    <div
      className={p.shake ? "tally-refuse" : undefined}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={p.onTap}
      role={p.onTap ? "button" : undefined}
      title={p.title}
      style={{
        width: w,
        height: h,
        borderRadius: 9,
        background: p.stone ? "#EDEFF3" : "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.10)",
        boxShadow: "0 1px 2px rgba(20,25,40,0.06)",
        position: "relative",
        padding: "7px 8px",
        display: "flex",
        flexDirection: "column",
        flex: "none",
        boxSizing: "border-box",
        fontFamily: SANS,
        color: p.stone ? "#8A909C" : INK,
        opacity: p.dimmed ? 0.5 : 1,
        cursor: p.onTap ? "pointer" : undefined,
        transform: basket && hover ? "translateY(-3px)" : undefined,
        transition: "transform .18s ease, opacity .18s ease",
        userSelect: "none",
        animation: p.shake ? "tally-refuse 340ms ease" : undefined,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 9, pointerEvents: "none", zIndex: 1, ...ring }} />
      {basket && (
        <div
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: 7,
            pointerEvents: "none",
            zIndex: 3,
            background: "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.9), rgba(255,255,255,0) 62%)",
            opacity: hover ? 1 : 0,
            transition: "opacity .18s ease",
          }}
        />
      )}
      {p.stone && (
        <svg aria-hidden style={{ position: "absolute", inset: 3, width: w - 6, height: h - 6, borderRadius: 7, opacity: 0.4, pointerEvents: "none" }}>
          <defs>
            <pattern id="tally-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={STONE_GREY} strokeWidth="1.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tally-hatch)" />
        </svg>
      )}
      {p.newFlash && !p.stone && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: 6,
            zIndex: 4,
            fontSize: 10,
            fontWeight: 750,
            color: "#fff",
            background: "#0071E3",
            borderRadius: 5,
            padding: "1.5px 5px",
          }}
        >
          New
        </span>
      )}

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-start", gap: 5 }}>
        <span
          title={SECTOR_LABEL[p.sector]}
          style={{ width: 6, height: 6, borderRadius: "50%", background: SECTOR_COLOR[p.sector], marginTop: 3, flex: "none" }}
        />
        {/* The name area is a fixed two lines on every card, so the price and
            the worth sit at the same height whatever the name is. A third line
            is clipped rather than allowed to push the rest of the card down.
            A name breaks between words and never inside one: "Government Bond"
            split as "Governmen / t Bond" is a card that has stopped saying what
            it is, so a word too long for the card is cut off with an ellipsis
            instead, which at least leaves the beginning of it readable. */}
        <span
          data-card-name="1"
          style={{
            fontSize: w >= 88 ? 12 : 10.5,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.16,
            minHeight: w >= 88 ? 28 : 25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            wordBreak: "normal",
            overflowWrap: "normal",
          }}
        >
          {p.name}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          margin: "3px 0 auto",
          maxWidth: w - 20,
        }}
      >
        {blocks}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: priceSize,
          fontWeight: 750,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
          alignSelf: "flex-start",
          borderBottom: p.dotted ? `1px dotted ${SUB}` : undefined,
        }}
      >
        {p.priceLabel}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ a stack

// Every card of one name, bottom aligned, so the faces and the collars line up
// across the row. Only the front card carries its content; the cards behind it
// show their top edge and their ring, which is all a stack of paper ever shows
// of the cards underneath.
//
// A stack draws at most three peek edges however many cards it holds, and its
// box is a fixed height whatever it draws, so the row it sits in cannot grow
// upward as cards are added. The collar underneath already carries the true
// count, which is the number a player actually needs; a fourth peeking edge only
// ever moved the furniture.

// one peek edge, the most edges ever drawn, and the two strips a stack box
// reserves under and over the card
export const STACK_PEEK = 6;
export const STACK_MAX_PEEK = 3;
export const STACK_COLLAR = 17;
// The strip over the card a chip is drawn in. The chip itself hangs at the
// bottom of it, tight to the top edge of the card, and the strip is deep enough
// that a stack at full lift still keeps the whole chip inside the row, with the
// two line chip the two act resolve prints inside it.
export const STACK_CHIP = 36;
const STACK_LIFT = 10;
// what a losing stack does instead of standing up
const STACK_SLUMP = 4;
// the chip's own box, so the stack can hang it off the card rather than float
// it somewhere above, at its two heights: the figure alone, and the figure with
// the move that caused it underneath
const CHIP_H = 25;
const CHIP_TALL = 34;
const CHIP_GAP = 3;

// The height of a stack box, which depends on the card and on nothing else. A
// row of stacks is given this height once and keeps it forever.
export function stackBoxHeight(cardH: number, withChip = false): number {
  return (withChip ? STACK_CHIP : 0) + cardH + STACK_MAX_PEEK * STACK_PEEK + STACK_COLLAR;
}

// What a holding did to the wall on the turn that just resolved, said above the
// stack that did it while that stack is the one scoring. The note is the price
// move that caused the figure, printed small underneath it, so the cause and the
// effect are one object to look at rather than two.
export interface StackChip {
  label: string;
  note?: string | null;
  tone: "gain" | "loss" | "flat";
}

// The hit a stack takes when its turn to score arrives. The tone is the
// direction the turn went for this holding, which is what decides whether the
// card springs up or drops first; the key is the identity of the moment, so a
// stack that scores again on the next turn plays the punch again and a chip
// counting up from one to five does not.
export interface StackPunch {
  tone: "gain" | "loss" | "flat";
  key: number;
}

export interface StackProps extends CardFaceProps {
  cards: number;
  collar: string;
  offset?: number;
  // reserve the strip above the card that a chip is drawn in, so a chip never
  // has to overflow a row that scrolls
  chipZone?: boolean;
  chip?: StackChip | null;
  // this stack is the one scoring right now
  active?: boolean;
  // another stack is scoring, and this one is waiting its turn
  waiting?: boolean;
  // the moment this stack's own scoring lands
  punch?: StackPunch | null;
}

const CHIP_INK: Record<StackChip["tone"], string> = {
  gain: "#1A8A52",
  loss: "#C0392B",
  flat: "#6E6E73",
};

// the chip's own frame, in the same ink, so a scoring pill is a piece of the
// game's furniture rather than a tooltip
const CHIP_RING: Record<StackChip["tone"], string> = {
  gain: "rgba(26,138,82,0.55)",
  loss: "rgba(192,57,43,0.55)",
  flat: "rgba(46,38,24,0.24)",
};

// The punch, per tone. Gains spring up off the table; losses drop into it
// first and come back. A holding that held its price still gets a beat, because
// a stack whose turn it is has to look like a stack whose turn it is, but it is
// a nod rather than a hit.
const PUNCH_ANIM: Record<StackPunch["tone"], string> = {
  gain: "tally-punch-gain 260ms linear both",
  loss: "tally-punch-loss 300ms linear both",
  flat: "tally-punch-flat 200ms linear both",
};
// how far apart the cards inside one stack tick, so a pile of four is a pile
// taking a hit rather than a slab moving as one piece
const PEEK_STEP = 46;
const PEEK_LEAD = 42;

export function CardStack(p: StackProps) {
  const w = p.width ?? CARD_W;
  const h = p.height ?? CARD_H;
  const off = p.offset ?? STACK_PEEK;
  const behind = Math.min(STACK_MAX_PEEK, Math.max(0, p.cards - 1));
  const top = (p.chipZone ? STACK_CHIP : 0) + STACK_MAX_PEEK * off;
  const edgeColor = p.stone ? STONE_GREY : p.suit === "basket" ? "#B9A7E8" : RING_COLOR[p.suit];
  ensureCardAnims();

  const punch = p.punch ?? null;
  const peekAnim = punch?.tone === "loss" ? "tally-peek-nudge-down" : "tally-peek-nudge";

  return (
    <div
      data-stack={p.chipZone ? "table" : "till"}
      data-punch={punch ? punch.tone : undefined}
      style={{
        position: "relative",
        width: w,
        height: (p.chipZone ? STACK_CHIP : 0) + h + STACK_MAX_PEEK * off + STACK_COLLAR,
        flex: "none",
        // Whose turn it is, held for the whole beat. A gain stands up off the
        // table and a loss slumps into it, so the punch that plays on top of
        // this reads as a hit in the direction the turn went rather than as two
        // motions cancelling each other out.
        transform: p.active
          ? `translateY(${punch?.tone === "loss" ? STACK_SLUMP : -STACK_LIFT}px)`
          : undefined,
        opacity: p.waiting ? 0.62 : 1,
        // the beat's own lift is quick, so it is part of the hit rather than a
        // slow rise the punch has to happen on top of
        transition: "transform .09s cubic-bezier(.2,.9,.3,1), opacity .18s ease",
      }}
    >
      {/* The chip is the scoring, so it sits over the scene rather than beside
          it: a pill on its own shadow, hung on the top edge of the card that is
          scoring, at a size that can be read from across a desk. It punches out
          on the same spring the card takes, because it is the same event. */}
      {p.chip && (
        <div
          data-chip={p.chip.label}
          data-chip-note={p.chip.note ?? undefined}
          key={punch ? `c${punch.key}` : "c"}
          className={punch ? "tally-chip-punch" : undefined}
          style={{
            position: "absolute",
            left: -10,
            top: Math.max(0, top - CHIP_GAP - (p.chip.note ? CHIP_TALL : CHIP_H)),
            width: w + 20,
            height: p.chip.note ? CHIP_TALL : CHIP_H,
            textAlign: "center",
            zIndex: 8,
            pointerEvents: "none",
            animation: punch ? "tally-chip-punch 270ms linear both" : undefined,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: p.chip.note ? CHIP_TALL : CHIP_H,
              padding: "0 11px",
              borderRadius: 999,
              background: "#FFFFFF",
              border: `2px solid ${CHIP_RING[p.chip.tone]}`,
              boxShadow: "0 3px 0 rgba(46,38,24,0.12), 0 5px 13px rgba(20,25,40,0.20)",
              color: CHIP_INK[p.chip.tone],
              fontVariantNumeric: "tabular-nums",
              fontFamily: SANS,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: p.chip.note ? "17px" : `${CHIP_H - 4}px`,
              }}
            >
              {p.chip.label}
            </span>
            {p.chip.note && (
              <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: "11px", opacity: 0.82 }}>
                {p.chip.note}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Everything the punch moves, on one wrapper, so the card and the edges
          under it take the hit together and the collar underneath stays where
          it was. The key is the moment: it is what replays the spring on the
          next stack's turn and never on the next block of this one's count. */}
      <div
        key={punch ? `p${punch.key}` : "p"}
        className={punch ? "tally-punch" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `50% ${top + h * 0.72}px`,
          animation: punch ? PUNCH_ANIM[punch.tone] : undefined,
        }}
      >
        {Array.from({ length: behind }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className={punch ? "tally-peek" : undefined}
            style={{
              position: "absolute",
              left: 0,
              top: top - (behind - i) * off,
              width: w,
              height: h,
              borderRadius: 9,
              background: "#FFFFFF",
              border: `2.5px solid ${edgeColor}`,
              boxShadow: "0 1px 2px rgba(20,25,40,0.06)",
              boxSizing: "border-box",
              animation: punch ? `${peekAnim} 230ms linear both` : undefined,
              animationDelay: punch ? `${PEEK_LEAD + (behind - 1 - i) * PEEK_STEP}ms` : undefined,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            top,
            zIndex: 5,
            filter: p.active ? "brightness(1.06) drop-shadow(0 9px 18px rgba(20,25,40,0.30))" : undefined,
            transition: "filter .16s ease",
          }}
        >
          <CardFace {...p} />
        </div>
        {/* the edge flash: the card's own ring, brightened for a moment, so the
            hit has a light as well as a movement */}
        {punch && (
          <div
            aria-hidden
            className="tally-edge-flash"
            style={{
              position: "absolute",
              left: 0,
              top,
              width: w,
              height: h,
              borderRadius: 9,
              border: `2.5px solid ${edgeColor}`,
              boxShadow: `0 0 12px 2px ${edgeColor}`,
              filter: "brightness(1.5) saturate(1.3)",
              boxSizing: "border-box",
              zIndex: 6,
              pointerEvents: "none",
              animation: "tally-edge-flash 300ms linear both",
            }}
          />
        )}
      </div>
      {/* the collar is allowed the gutter beside the card, because a stack of
          seven cards has a longer thing to say than a stack of one */}
      <div
        style={{
          position: "absolute",
          left: -8,
          bottom: 0,
          width: w + 16,
          textAlign: "center",
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: SUB,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          fontFamily: SANS,
        }}
      >
        {p.collar}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ the back

// What the face gave up. It is drawn at a size a person can actually read,
// because a definition set in seven pixel type is a definition nobody reads,
// and the card turns over into the middle of the board to get there.
export interface CardBackProps {
  face: CardFaceProps;
  lines: string[];        // holding, move, definition, and any disclosure
  // the room the board can spare, so the turned card is as big as it can be
  // without ever hanging off the cabinet
  maxW?: number;
  maxH?: number;
  onClose: () => void;
}

// The turned card is drawn at this size, and the face it turns from is drawn at
// its own natural size and scaled to match, so every rule on the front keeps
// its proportion instead of a ten pixel name floating on a big white card.
const FLIP_W = 280;
const FLIP_H = 370;
const FACE_W = 176;
const FACE_H = 232;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function CardFlip({ face, lines, maxW, maxH, onClose }: CardBackProps) {
  const reduced = useReducedMotion();
  const [turned, setTurned] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setTurned(true);
      return;
    }
    setTurned(false);
    const t = window.setTimeout(() => setTurned(true), 20);
    return () => window.clearTimeout(t);
  }, [reduced, face.name]);

  const k = Math.min(1, (maxW ?? FLIP_W) / FLIP_W, (maxH ?? FLIP_H) / FLIP_H);
  const w = Math.round(FLIP_W * k);
  const h = Math.round(FLIP_H * k);
  const type = w / FLIP_W;

  return (
    <div
      data-flip="open"
      onPointerDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "rgba(250,249,247,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        fontFamily: SANS,
      }}
    >
      <div style={{ perspective: 900, width: w, height: h }}>
        <div
          style={{
            position: "relative",
            width: w,
            height: h,
            transformStyle: "preserve-3d",
            transform: `rotateY(${turned ? 180 : 0}deg)`,
            transition: reduced ? undefined : "transform 320ms cubic-bezier(.3,.7,.3,1)",
          }}
        >
          {/* Safari does not hide the backface of a transformed element's
              children, so each face also hands off its opacity at the flip's
              midpoint; no engine ever shows the front mirrored through. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              display: "grid",
              placeItems: "center",
              opacity: turned ? 0 : 1,
              transition: reduced ? undefined : "opacity 40ms linear 140ms",
              pointerEvents: "none",
            }}
          >
            <div style={{ transform: `scale(${w / FACE_W})`, transformOrigin: "center" }}>
              <CardFace {...face} width={FACE_W} height={FACE_H} onTap={undefined} />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              opacity: turned ? 1 : 0,
              transition: reduced ? undefined : "opacity 40ms linear 140ms",
              borderRadius: 14 * type,
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.12)",
              boxShadow: "0 12px 34px rgba(20,25,40,0.16)",
              padding: `${18 * type}px ${20 * type}px`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 10 * type,
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 17 * type, fontWeight: 750, letterSpacing: "-0.015em", color: INK }}>{face.name}</div>
            {lines.map((line, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: 15 * type,
                  lineHeight: 1.44,
                  color: i === lines.length - 1 ? SUB : INK,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {line}
              </p>
            ))}
            <div style={{ marginTop: "auto", fontSize: 13 * type, fontWeight: 650, color: SUB }}>Tap to turn it back.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
