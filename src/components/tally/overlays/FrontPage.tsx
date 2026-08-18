// The paper. On the turns where a dated moment fell, and on no others, the wall
// is covered by a printed page: up to three real headlines, each one line on its
// face, and one authored sentence underneath that reads the room.
//
// Tapping a headline opens at most two sentences and the publication and the
// date behind it, and tapping it again closes it. Nobody is ever made to read
// more than the faces plus the mood line to keep going, and the mood line is one
// sentence.
//
// Headlines are verbatim from named publications on named dates, so nothing here
// is ever shortened or paraphrased to make a line fit. The mood line never
// forecasts and never tells anybody what to do, because the decision lives in
// the shop where the money is.

import { useState } from "react";
import { FrontPage, monthLabel } from "../../../lib/tally/chapters";
import { LINE_HARD, R, SANS, btn } from "../ui";

const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";

const LONG_MONTH: Record<string, string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April",
  May: "May", Jun: "June", Jul: "July", Aug: "August",
  Sep: "September", Oct: "October", Nov: "November", Dec: "December",
};

// The model hands the month over as "Sep 2008", and an ISO month is handled too
// in case a caller passes one straight from a dataset. The masthead spells the
// month out, because a masthead is a printed thing and printed things do not
// abbreviate.
function mastheadMonth(month: string): string {
  const text = /^\d{4}-\d{2}$/.test(month) ? monthLabel(month) : month;
  const [head, ...rest] = text.split(" ");
  const long = LONG_MONTH[head];
  return long ? [long, ...rest].join(" ") : text;
}

export interface FrontPageOverlayProps {
  page: FrontPage;
  onContinue: () => void;
}

export default function FrontPageOverlay({ page, onContinue }: FrontPageOverlayProps) {
  const [open, setOpen] = useState<number | null>(null);
  const headlines = page.headlines.slice(0, 3);

  return (
    <div style={shell}>
      <div style={{ width: "100%", maxWidth: 372 }}>
        <div style={paper}>
          <div style={masthead}>
            The record,{" "}
            {page.monthEnd && page.monthEnd !== page.month
              ? `${mastheadMonth(page.month)} to ${mastheadMonth(page.monthEnd)}`
              : mastheadMonth(page.month)}
          </div>
          {headlines.map((h, i) => {
            const isOpen = open === i;
            return (
              <div
                key={`${h.source}-${h.date}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(isOpen ? null : i);
                  }
                }}
                style={{
                  padding: "8px 11px",
                  borderTop: i === 0 ? undefined : "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={face}>{h.face}</div>
                {isOpen ? (
                  <>
                    {h.behind && <p style={behind}>{h.behind}</p>}
                    <div style={credit}>
                      {h.source}, {h.date}
                    </div>
                  </>
                ) : (
                  <span style={more}>Tap for more</span>
                )}
              </div>
            );
          })}
          {page.mood && <p style={mood}>{page.mood}</p>}
        </div>

        <div style={{ textAlign: "center" }}>
          <button type="button" data-paper-continue="1" className={btn("primary")} onClick={onContinue} style={button}>
            Keep going
          </button>
        </div>
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
  padding: 8,
  boxSizing: "border-box",
  overflowY: "auto",
  fontFamily: SANS,
  color: INK,
};

const paper: React.CSSProperties = {
  background: "#FCFBF7",
  border: `2px solid ${LINE_HARD}`,
  borderRadius: R.panel,
  boxShadow: "0 10px 30px rgba(20,25,40,0.10)",
  overflow: "hidden",
  textAlign: "left",
};

const masthead: React.CSSProperties = {
  padding: "7px 11px",
  borderBottom: `2px solid ${INK}`,
  fontSize: 12.5,
  fontWeight: 700,
};

const face: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
};

const more: React.CSSProperties = {
  display: "inline-block",
  marginTop: 3,
  fontSize: 12,
  fontWeight: 600,
  color: ACCENT,
};

const behind: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  color: SUB,
};

const credit: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  fontWeight: 600,
  color: SUB,
};

const mood: React.CSSProperties = {
  margin: 0,
  padding: "9px 11px 10px",
  borderTop: `1px solid ${INK}`,
  background: "#F6F3EA",
  fontSize: 13.5,
  lineHeight: 1.45,
  color: INK,
};

const button: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  padding: "8px 22px",
  borderRadius: 9,
};
