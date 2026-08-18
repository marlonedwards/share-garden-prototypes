// The chapter's opening card. A chapter states three things and never changes
// them: the target in money, the number of turns, and what one block is worth.
// Everything else on this panel is the tagline, which is one sentence long,
// because no screen in this game may ask for more than one sentence of reading
// before it can be dismissed.
//
// The card renders content only. The shell owns the scrim and the layer; this
// is the panel that sits in the middle of region B.

import { ChapterCard } from "../../../lib/tally/chapters";
import { LINE_HARD, R, SANS, btn } from "../ui";

const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// "20 blocks" reads better than "20 block", and the carried cards only get a
// mention when there are some, so a first chapter never talks about cards a
// player does not have yet.
function startLine(startBlocks: number, carriedCards: number): string {
  const blocks = `with ${startBlocks} ${startBlocks === 1 ? "block" : "blocks"}`;
  if (carriedCards <= 0) return blocks;
  const cards = carriedCards === 1 ? "the card you kept" : `the ${carriedCards} cards you kept`;
  return `${blocks} and ${cards}`;
}

export interface ChapterCardOverlayProps {
  card: ChapterCard;
  onBegin: () => void;
  // A returning player has chapters they cleared for good, and each one is a
  // place a run may begin. The offer is optional, it only ever appears on the
  // first card of a fresh run, and it is one quiet line under Begin, because
  // starting deeper is an offer and never an instruction.
  starts?: number[];
  onStart?: (chapter: number) => void;
}

export default function ChapterCardOverlay({ card, onBegin, starts, onStart }: ChapterCardOverlayProps) {
  const offers = onStart && starts ? starts.filter((n) => n !== card.id) : [];
  // The card has to fit the wall panel without scrolling, so when the offer is
  // there the rest of the card gives back the room the offer takes. The offer
  // is one line: a label and a chapter number for each start point.
  const dense = offers.length > 0;
  // Every fact the chapter states, each one a phrase rather than a caption
  // stacked beside a figure.
  const facts: React.ReactNode[] = [
    <>The target is <b style={strong}>{money(card.target)}</b>.</>,
    <><b style={strong}>{card.turns}</b> turns.</>,
    <>One turn is {card.turnUnit}.</>,
    <>One block is <b style={strong}>{money(card.denom)}</b>.</>,
    <>You start {startLine(card.startBlocks, card.carriedCards)}.</>,
  ];

  return (
    <div style={shell}>
      <div style={dense ? { ...panel, padding: "12px 20px 10px" } : panel}>
        <div style={title}>
          Chapter {card.id}, {card.name}
        </div>
        {/* an era chapter names the years it covers; an authored one says
            nothing, because the disclosure lives on the cards */}
        {card.subtitle && <div style={subtitle}>{card.subtitle}</div>}

        <div style={dense ? { ...table, margin: "7px auto 0" } : table}>
          {facts.map((fact, i) => (
            <div key={i} style={dense ? { ...row, padding: "1px 0" } : row}>
              {fact}
            </div>
          ))}
        </div>

        <p style={dense ? { ...tagline, margin: "7px auto 0" } : tagline}>{card.tagline}</p>

        <button type="button" className={btn("primary")} onClick={onBegin} style={dense ? { ...button, marginTop: 8 } : button}>
          Begin
        </button>

        {dense && onStart && (
          <div style={startsRow}>
            <span style={startsLabel}>Or start at chapter</span>
            {offers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onStart(n)}
                title={`Start at chapter ${n}`}
                aria-label={`Start at chapter ${n}`}
                className={btn("plain")}
                style={secondary}
              >
                {n}
              </button>
            ))}
          </div>
        )}
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

// The panel's heading, and the panel has only one.
const title: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: INK,
};

const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: SUB,
  marginTop: 3,
};

const table: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  margin: "10px auto 0",
  width: "min(360px, 100%)",
  textAlign: "left",
};

const row: React.CSSProperties = {
  padding: "2px 0",
  fontSize: 15,
  lineHeight: 1.4,
  letterSpacing: "-0.01em",
  fontVariantNumeric: "tabular-nums",
};

const strong: React.CSSProperties = {
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

const tagline: React.CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 400,
  fontSize: 13.5,
  lineHeight: 1.5,
  color: SUB,
};

const startsRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 8,
};

const startsLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: SUB,
  marginRight: 2,
};

const secondary: React.CSSProperties = {
  minWidth: 24,
  fontSize: 13,
  padding: "4px 7px",
  borderRadius: 8,
  fontVariantNumeric: "tabular-nums",
};

const button: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  padding: "8px 22px",
  borderRadius: 9,
};
