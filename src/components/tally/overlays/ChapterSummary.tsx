// The chapter summary. The run is the assessment, so this panel reads back
// what actually happened: where the money finished against the target it was
// given, the badges the chapter earned, the plain sentence about any market
// that closes tonight, and the front pages again, because the record is never
// lost by dismissing it.
//
// Badges are never announced mid turn. They land here, one at a time, with a
// single flip 300ms apart. Under prefers-reduced-motion they are simply
// already there.
//
// The run's seed is not on this panel and is not on any other one. What a
// player wants at the end of a chapter is how much ladder is left, so the
// panel says which chapter of eight this was and what the next one is called.
// The summary only ever fires after the chapter's last turn, so it never has a
// turn left in this chapter to report.

import { useEffect, useState } from "react";
import { ChapterSummary } from "../../../lib/tally/run";
import { FrontPage } from "../../../lib/tally/chapters";
import { LINE_HARD, R, btn } from "../ui";

const SANS = '"Helvetica Neue", Inter, -apple-system, system-ui, sans-serif';
const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";
const GOLD = "#B57A00";

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

export interface ChapterSummaryOverlayProps {
  summary: ChapterSummary;
  onContinue: () => void;
}

export default function ChapterSummaryOverlay({ summary, onContinue }: ChapterSummaryOverlayProps) {
  const reduced = useReducedMotion();
  const [flipped, setFlipped] = useState(reduced);
  const [openPage, setOpenPage] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setFlipped(true);
      return;
    }
    setFlipped(false);
    const t = window.setTimeout(() => setFlipped(true), 40);
    return () => window.clearTimeout(t);
  }, [reduced, summary.chapterId]);

  return (
    <div style={shell}>
      <div style={panel}>
        <div style={eyebrow}>{summary.chapterName}</div>
        <div style={heading}>
          Chapter {summary.chapterId} {summary.cleared ? "cleared" : "finished"}
        </div>
        <div style={scoreLine}>
          You finished at <b style={num}>{money(summary.finishedAt)}</b>. The target was{" "}
          <b style={{ ...num, color: GOLD }}>{money(summary.target)}</b>.
        </div>

        {summary.badges.length > 0 && (
          <div style={badgeRow}>
            {summary.badges.map((b, i) => (
              <div key={b.id} style={{ perspective: 600, flex: "1 1 150px", maxWidth: 210 }}>
                <div
                  style={{
                    ...badgeTile,
                    transition: reduced ? undefined : "transform 300ms ease, opacity 300ms ease",
                    transitionDelay: reduced ? undefined : `${i * 300}ms`,
                    transform: flipped ? "rotateX(0deg)" : "rotateX(-90deg)",
                    opacity: flipped ? 1 : 0,
                  }}
                >
                  <div style={badgeName}>{b.name}</div>
                  <div style={badgeCopy}>{b.copy}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {summary.settlementNotice && <p style={notice}>{summary.settlementNotice}</p>}

        {summary.frontPages.length > 0 && (
          <div style={pagesBox}>
            <div style={smallLabel}>The record from this chapter</div>
            {summary.frontPages.map((p, i) => (
              <PageRow
                key={`${p.month}-${p.turn}`}
                page={p}
                open={openPage === i}
                onToggle={() => setOpenPage(openPage === i ? null : i)}
              />
            ))}
          </div>
        )}

        <div style={ladder}>
          Chapter {summary.ladderPosition} of {summary.ladderCount}.
        </div>
        {summary.nextChapterName && summary.nextChapterTurns !== null && (
          <div style={ladder}>
            Next: chapter {summary.nextChapter}, {summary.nextChapterName} &middot;{" "}
            {summary.nextChapterTurns} turns.
          </div>
        )}

        <button type="button" className={btn("primary")} onClick={onContinue} style={button}>
          Continue
        </button>
      </div>
    </div>
  );
}

function PageRow({ page, open, onToggle }: { page: FrontPage; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
      <button type="button" onClick={onToggle} style={pageHead}>
        <span style={{ fontWeight: 700 }}>{page.month}</span>
        <span style={{ color: SUB, fontWeight: 600 }}>
          {page.headlines.length === 1 ? "1 headline" : `${page.headlines.length} headlines`}
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 2px 8px" }}>
          {page.headlines.map((h, i) => (
            <div key={`${h.source}-${h.date}-${i}`} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{h.face}</div>
              {h.behind && <p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.45, color: SUB }}>{h.behind}</p>}
              <div style={{ fontSize: 12, fontWeight: 650, color: SUB, marginTop: 3 }}>
                {h.source}, {h.date}
              </div>
            </div>
          ))}
        </div>
      )}
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
  padding: "14px 18px 12px",
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: SUB,
};

const heading: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 750,
  letterSpacing: "-0.02em",
  marginTop: 2,
};

const scoreLine: React.CSSProperties = {
  fontSize: 14,
  color: SUB,
  marginTop: 4,
};

const num: React.CSSProperties = {
  color: INK,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 750,
};

const badgeRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "center",
  marginTop: 8,
};

const badgeTile: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 10,
  background: "#FBFBFD",
  padding: "8px 10px",
  textAlign: "left",
  transformOrigin: "top center",
};

const badgeName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 750,
  letterSpacing: "-0.01em",
  color: GOLD,
};

const badgeCopy: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
  color: SUB,
  marginTop: 2,
};

const notice: React.CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 440,
  fontSize: 13,
  lineHeight: 1.5,
  color: SUB,
};

const pagesBox: React.CSSProperties = {
  marginTop: 10,
  textAlign: "left",
  maxHeight: 84,
  overflowY: "auto",
};

const smallLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 650,
  color: SUB,
  paddingBottom: 4,
};

const pageHead: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 10,
  padding: "7px 2px",
  background: "none",
  border: 0,
  cursor: "pointer",
  fontFamily: SANS,
  fontSize: 13,
  color: INK,
};

const button: React.CSSProperties = {
  marginTop: 10,
  fontSize: 14,
  padding: "8px 22px",
  borderRadius: 9,
};

// Where the run is on the ladder, which is what the panel says now that the
// run's seed has left every player-facing screen.
const ladder: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  fontWeight: 650,
  color: SUB,
  fontVariantNumeric: "tabular-nums",
};
