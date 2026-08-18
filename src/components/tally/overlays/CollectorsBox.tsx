// The collector's box, modelled on the Orb's silhouetted achievement slots.
// You can see the shape of everything you have not earned yet, and that is
// most of the pull, so every slot in every shelf is drawn whether it is filled
// or not. A slot that is empty shows no name, because the name is part of the
// prize.
//
// Three shelves and nothing else: the instruments, which are every card class
// the game can deal; the badges, which are behaviour and sit deliberately
// outside the scoring loop; and the eras, which each hold the best run you
// have finished in them. Tapping something you own shows its one sentence.

import { useState } from "react";
import { BoxState, BADGES } from "../../../lib/tally/run";
import { ASSETS, CHAPTERS, ERAS } from "../../../lib/tally/chapters";
import {
  Suit, TallyAsset,
  BASKET_RING_GRADIENT, RING_COLOR, SUIT_DEFINITION, SUIT_LABEL,
} from "../../../lib/tally/deck";
import { LINE_HARD, R, SANS, btn } from "../ui";

const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";
const GOLD = "#B57A00";
const LOCKED = "#B6BBC5";

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// the shelf reads in teaching order, which is the order the rings arrive in
// during a run
const SUIT_ORDER: Suit[] = ["save", "lend", "own", "basket", "spec"];

function catalog(): TallyAsset[] {
  return Object.values(ASSETS).sort((a, b) => {
    const bySuit = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    return bySuit !== 0 ? bySuit : a.name.localeCompare(b.name);
  });
}

function eraShelf(box: BoxState): { id: string; title: string; best: number | null }[] {
  const ids: string[] = [];
  for (const ch of CHAPTERS) {
    if (ch.source.kind === "era" && !ids.includes(ch.source.eraId)) ids.push(ch.source.eraId);
  }
  for (const id of Object.keys(box.eraBest)) if (!ids.includes(id)) ids.push(id);
  return ids.map((id) => ({
    id,
    title: ERAS[id]?.title ?? id,
    best: box.eraBest[id] ?? null,
  }));
}

export interface CollectorsBoxOverlayProps {
  box: BoxState;
  onClose: () => void;
}

export default function CollectorsBoxOverlay({ box, onClose }: CollectorsBoxOverlayProps) {
  const [detail, setDetail] = useState<string>("");
  const assets = catalog();
  const eras = eraShelf(box);
  const ownedCount = assets.filter((a) => box.instruments.includes(a.id)).length;
  const badgeCount = BADGES.filter((b) => box.badges.includes(b.id)).length;

  return (
    <div style={shell}>
      <div style={panel}>
        {/* the board is portrait, so the count sits under the title rather
            than wrapping beside it */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={title}>The collector&rsquo;s box</div>
          <div style={{ ...smallLabel, paddingBottom: 0 }}>
            {ownedCount} of {assets.length} instruments, {badgeCount} of {BADGES.length} badges
          </div>
        </div>

        <div style={scroller}>
          <div style={smallLabel}>Instruments</div>
          <div style={grid}>
            {assets.map((a) => {
              const owned = box.instruments.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!owned}
                  onClick={() => setDetail(a.desc || SUIT_DEFINITION[a.suit])}
                  style={owned ? slot : lockedSlot}
                  title={owned ? SUIT_LABEL[a.suit] : "Not collected yet"}
                >
                  <Ring suit={a.suit} owned={owned} />
                  <span style={owned ? slotName : lockedName}>{owned ? a.name : "• • •"}</span>
                </button>
              );
            })}
          </div>

          <div style={{ ...smallLabel, marginTop: 12 }}>Badges</div>
          <div style={grid}>
            {BADGES.map((b) => {
              const earned = box.badges.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={!earned}
                  onClick={() => setDetail(b.copy)}
                  style={earned ? slot : lockedSlot}
                  title={earned ? b.name : "Not earned yet"}
                >
                  <Star earned={earned} />
                  <span style={earned ? { ...slotName, color: GOLD } : lockedName}>
                    {earned ? b.name : "• • •"}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ ...smallLabel, marginTop: 12 }}>Eras</div>
          <div style={grid}>
            {eras.map((e) => (
              <button
                key={e.id}
                type="button"
                disabled={e.best === null}
                onClick={() =>
                  setDetail(`Your best run in ${e.title} finished at ${money(e.best ?? 0)}.`)
                }
                style={e.best === null ? lockedSlot : slot}
                title={e.best === null ? "Not played yet" : e.title}
              >
                <span style={{ ...figure, color: e.best === null ? LOCKED : INK }}>
                  {e.best === null ? "• • •" : money(e.best)}
                </span>
                <span style={e.best === null ? lockedName : slotName}>
                  {e.best === null ? "• • •" : e.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p style={detailLine}>{detail || "Tap anything you have collected to read what it is."}</p>

        <button type="button" className={btn("primary")} onClick={onClose} style={button}>
          Close
        </button>
      </div>
    </div>
  );
}

// The ring is the asset class, and the basket ring is the one gradient in the
// game, so the box draws the same ring the card face does. It is a circle at a
// fixed size and it never gives an inch: a tile whose name runs to two lines
// used to squash the swatch into an ellipse, and a ring that is not round is a
// ring that has stopped saying which class it is.
const SWATCH = 16;

const swatch: React.CSSProperties = {
  width: SWATCH,
  height: SWATCH,
  minWidth: SWATCH,
  minHeight: SWATCH,
  flex: "none",
  borderRadius: "50%",
  boxSizing: "border-box",
};

function Ring({ suit, owned }: { suit: Suit; owned: boolean }) {
  if (!owned) {
    return <span aria-hidden style={{ ...swatch, border: `2px dashed ${LOCKED}` }} />;
  }
  if (suit === "basket") {
    return (
      <span
        aria-hidden
        style={{
          ...swatch,
          border: "3px solid transparent",
          background: `linear-gradient(#fff, #fff) padding-box, ${BASKET_RING_GRADIENT} border-box`,
        }}
      />
    );
  }
  return <span aria-hidden style={{ ...swatch, border: `3px solid ${RING_COLOR[suit]}` }} />;
}

function Star({ earned }: { earned: boolean }) {
  return (
    <svg
      width={SWATCH}
      height={SWATCH}
      viewBox="0 0 16 16"
      aria-hidden
      style={{ flex: "none", minWidth: SWATCH, minHeight: SWATCH }}
    >
      <path
        d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.3L8 11.6l-3.9 2 .8-4.3L1.7 6.2l4.4-.6z"
        fill={earned ? GOLD : "none"}
        stroke={earned ? GOLD : LOCKED}
        strokeWidth={earned ? 0 : 1.2}
        strokeDasharray={earned ? undefined : "2 2"}
      />
    </svg>
  );
}

const shell: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  boxSizing: "border-box",
  fontFamily: SANS,
  color: INK,
};

const panel: React.CSSProperties = {
  width: "min(380px, 100%)",
  maxHeight: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#FFFEFB",
  border: `2px solid ${LINE_HARD}`,
  borderRadius: R.board,
  boxShadow: "0 10px 30px rgba(20,25,40,0.10)",
  padding: "14px 18px 12px",
  boxSizing: "border-box",
};

const title: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const smallLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: SUB,
  paddingBottom: 5,
  fontVariantNumeric: "tabular-nums",
};

const scroller: React.CSSProperties = {
  flex: 1,
  minHeight: 90,
  overflowY: "auto",
  marginTop: 8,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
  gap: 5,
};

// Every slot is the same height whatever it holds, so a shelf is a grid rather
// than a set of tiles of assorted sizes, and a name too long for two lines is
// cut off with an ellipsis rather than allowed to push its own tile around.
const slot: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  padding: "5px 4px",
  height: 58,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#FBFBFD",
  cursor: "pointer",
  fontFamily: SANS,
  textAlign: "center",
  boxSizing: "border-box",
  overflow: "hidden",
};

const lockedSlot: React.CSSProperties = {
  ...slot,
  background: "#F2F3F6",
  border: `1px dashed ${LOCKED}`,
  cursor: "default",
};

const slotName: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: INK,
  lineHeight: 1.2,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
  wordBreak: "normal",
  overflowWrap: "normal",
};

const lockedName: React.CSSProperties = {
  ...slotName,
  color: LOCKED,
};

const figure: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  flex: "none",
};

const detailLine: React.CSSProperties = {
  margin: "8px 0 0",
  minHeight: 30,
  fontSize: 13,
  lineHeight: 1.45,
  color: SUB,
};

const button: React.CSSProperties = {
  alignSelf: "flex-start",
  marginTop: 6,
  fontSize: 14,
  padding: "8px 20px",
  borderRadius: 9,
};
