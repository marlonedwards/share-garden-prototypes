// A card type, meeting the player for the first time. The shop stops, the card
// is drawn large, and one sentence says what this kind of card is. One button
// dismisses it, and the run remembers, so it never happens twice for the same
// type.
//
// The sentence is the same one that lives on the back of every card of that
// type from now on, so a player who wants it again knows exactly where it is
// and never has to sit through this panel to get it. Three of the six sentences
// are the opening sentence of the field guide entry the concept already has, so
// the game and the codex agree word for word.

import { Debut } from "../../../lib/tally/run";
import { TallyAsset } from "../../../lib/tally/deck";
import { displayName, priceLine } from "../../../lib/tally/text";
import CardFace from "../Card";
import { LINE_HARD, R, SANS, btn } from "../ui";

const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";

export interface DebutOverlayProps {
  debut: Debut;
  asset: TallyAsset;
  price: number;
  realNames: boolean;
  costBlocks: number;
  // the rate a savings card pays here, so the card drawn large says the same
  // thing the card on the counter says
  ratePerYear?: number | null;
  onContinue: () => void;
}

export default function DebutOverlay({
  debut, asset, price, realNames, costBlocks, ratePerYear, onContinue,
}: DebutOverlayProps) {
  const stone = debut.key === "stone";
  return (
    <div style={shell} data-debut={debut.key}>
      <div style={panel}>
        <div style={title}>{debut.title}</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 14px" }}>
          <CardFace
            name={displayName(asset, realNames)}
            suit={asset.suit}
            sector={asset.sector}
            worthBlocks={stone ? 0 : costBlocks}
            blockColor={asset.color}
            priceLabel={stone ? "No price" : priceLine(asset, price, ratePerYear)}
            stone={stone}
            width={132}
            height={150}
          />
        </div>
        <p style={definition}>{debut.definition}</p>
        <button type="button" data-debut-continue="1" className={btn("primary")} onClick={onContinue} style={button}>
          Got it
        </button>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  boxSizing: "border-box",
  background: "rgba(250,249,247,0.94)",
  borderRadius: 12,
  fontFamily: SANS,
  color: INK,
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  background: "#FFFEFB",
  border: `2px solid ${LINE_HARD}`,
  borderRadius: R.board,
  boxShadow: "0 10px 30px rgba(20,25,40,0.12)",
  padding: "16px 18px 16px",
  textAlign: "center",
};

// The panel's own heading, set as a heading rather than as a grey label above
// the card.
const title: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: INK,
};

const definition: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: 270,
  fontSize: 14.5,
  lineHeight: 1.5,
  fontWeight: 500,
};

const button: React.CSSProperties = {
  marginTop: 14,
  fontSize: 14,
  padding: "8px 24px",
  borderRadius: 9,
};
