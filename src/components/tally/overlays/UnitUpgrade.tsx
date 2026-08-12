// The earned ceremony. The wall never goes over forty blocks, so when the
// money outgrows the unit the unit has to grow, and it grows on its own screen
// between chapters rather than quietly in the middle of one.
//
// Four blocks fuse into one and four cards of a name fuse into one card, so a
// card is always two blocks and the economy never shifts under the player.
// The fuse plays once on mount and takes about 1150ms. Under
// prefers-reduced-motion the same panel shows the end state and nothing moves.

import { useEffect, useState } from "react";
import { Ceremony } from "../../../lib/tally/run";
import { Block, BlockColumn } from "../Blocks";
import { LINE_HARD, R, btn } from "../ui";

const SANS = '"Helvetica Neue", Inter, -apple-system, system-ui, sans-serif';
const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";
const GOLD = "#B57A00";

// the colour the ceremony blocks take. It is the unit itself changing, not any
// one asset, so the blocks are drawn in the game's own accent rather than in
// an asset colour that would claim this is somebody's holding.
const UNIT_BLUE = "#0A84FF";

const NUMBER_WORD = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve",
];

function word(n: number): string {
  if (n === 16) return "sixteen";
  if (n === 64) return "sixty-four";
  return n >= 0 && n < NUMBER_WORD.length ? NUMBER_WORD[n] : String(n);
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export interface UnitUpgradeOverlayProps {
  ceremony: Ceremony;
  onContinue: () => void;
}

export default function UnitUpgradeOverlay({ ceremony, onContinue }: UnitUpgradeOverlayProps) {
  const reduced = useReducedMotion();
  const [fused, setFused] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setFused(true);
      return;
    }
    setFused(false);
    const t = window.setTimeout(() => setFused(true), 40);
    return () => window.clearTimeout(t);
  }, [reduced, ceremony.from, ceremony.to]);

  // One fuse is played, however many rungs the unit climbed, so the picture
  // stays a picture. Two rungs is sixteen old blocks for one new one, and a
  // column of sixteen is the most that still counts at a glance.
  const ratio = Math.max(2, Math.round(ceremony.to / ceremony.from));
  const newCount = ratio <= 4 ? 2 : 1;
  const oldCount = ratio * newCount;
  const size = oldCount > 10 ? 8 : 10;

  const sentence = ceremony.steps > 1
    ? `Your money grew enough for ${word(ceremony.steps)} steps at once, so from now on one block is ${money(ceremony.to)}, and one card is ${word(ratio)} of your old ones.`
    : `From now on, one block is ${money(ceremony.to)}, and one card is ${word(ratio)} of your old ones.`;

  // fusedNames arrives as display names, one entry per group of four that
  // fused, so the same name can appear more than once.
  const fusedRows: { name: string; groups: number }[] = [];
  for (const name of ceremony.fusedNames) {
    const row = fusedRows.find((r) => r.name === name);
    if (row) row.groups += 1;
    else fusedRows.push({ name, groups: 1 });
  }

  return (
    <div style={shell}>
      <div style={panel}>
        <div style={heading}>You outgrew this unit</div>

        <div style={stage}>
          <div style={side}>
            <div
              style={{
                transition: reduced ? undefined : "opacity 900ms ease, transform 900ms ease",
                opacity: fused && !reduced ? 0.18 : 1,
                transform: fused && !reduced ? "translateY(18px) scaleY(0.25)" : "none",
                transformOrigin: "bottom center",
              }}
            >
              <BlockColumn
                blocks={Array.from({ length: oldCount }, () => ({ color: UNIT_BLUE }))}
                size={size}
              />
            </div>
            <div style={caption}>
              {oldCount} blocks of {money(ceremony.from)}
            </div>
          </div>

          <div style={arrow} aria-hidden>
            &rarr;
          </div>

          <div style={side}>
            <span style={{ display: "inline-flex", flexDirection: "column-reverse", gap: Math.max(1, size * 0.15), alignItems: "center" }}>
              {Array.from({ length: newCount }, (_, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    transition: reduced ? undefined : "opacity 340ms ease, transform 340ms cubic-bezier(.2,.9,.3,1)",
                    transitionDelay: reduced ? undefined : `${560 + i * 180}ms`,
                    opacity: fused ? 1 : 0,
                    transform: fused ? "none" : "translateY(-14px) scale(0.5)",
                  }}
                >
                  <Block size={size * 1.5} color={UNIT_BLUE} />
                </span>
              ))}
            </span>
            <div style={{ ...caption, color: GOLD }}>
              {newCount} {newCount === 1 ? "block" : "blocks"} of {money(ceremony.to)}
            </div>
          </div>
        </div>

        <p style={line}>{sentence}</p>

        {fusedRows.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={fusedLabel}>Cards that fused</div>
            <div style={chipRow}>
              {fusedRows.map((r) => (
                <span key={r.name} style={chip}>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                  <span style={{ color: SUB }}>
                    {word(r.groups * 4)} became {word(r.groups)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="button" className={btn("primary")} onClick={onContinue} style={button}>
          Continue
        </button>
      </div>
    </div>
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
  overflowY: "auto",
  fontFamily: SANS,
  color: INK,
};

const panel: React.CSSProperties = {
  width: "min(380px, 100%)",
  background: "#FFFEFB",
  border: `2px solid ${LINE_HARD}`,
  borderRadius: R.board,
  boxShadow: "0 10px 30px rgba(20,25,40,0.10)",
  padding: "14px 20px 16px",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 750,
  letterSpacing: "-0.02em",
};

const stage: React.CSSProperties = {
  display: "flex",
  gap: 28,
  alignItems: "flex-end",
  justifyContent: "center",
  margin: "10px auto 0",
  padding: "10px 16px",
  width: "min(340px, 100%)",
  boxSizing: "border-box",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 12,
  background: "rgba(245,246,249,0.6)",
};

const side: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const caption: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 650,
  color: SUB,
  fontVariantNumeric: "tabular-nums",
};

const arrow: React.CSSProperties = {
  fontSize: 20,
  color: SUB,
  paddingBottom: 22,
};

const line: React.CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 400,
  fontSize: 14,
  lineHeight: 1.5,
  color: SUB,
};

const fusedLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 650,
  color: SUB,
};

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  justifyContent: "center",
  marginTop: 5,
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 6,
  fontSize: 13,
  padding: "4px 9px",
  borderRadius: 8,
  background: "#F2F3F6",
  border: "1px solid rgba(0,0,0,0.06)",
};

const button: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  padding: "8px 22px",
  borderRadius: 9,
};
