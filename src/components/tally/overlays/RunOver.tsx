// The end of a run. When the target was missed this is a forensic report and
// never a scold: it names what happened, in blocks, out of the player's own
// trade log, and it shows the option that was on the table at the time and was
// let go, once. It never says you should have, and it never scores a choice
// against the option beside it, because nothing in this game is ever ranked
// against a counterfactual.
//
// When the ladder was cleared the same panel is celebratory and just as
// honest: there is nothing to reconstruct, so the forensics are left out and
// what was kept stays.
//
// Every start point the player has unlocked is a button. The deepest one is
// the loud one, and the earlier chapters stay available in quiet type, because
// starting deeper is an offer and never an instruction.

import { Forensics } from "../../../lib/tally/run";
import { assetOf } from "../../../lib/tally/chapters";
import { BlockRow } from "../Blocks";
import { LINE_HARD, R, btn } from "../ui";

const SANS = '"Helvetica Neue", Inter, -apple-system, system-ui, sans-serif';
const INK = "#1D1D1F";
const SUB = "#6E6E73";
const ACCENT = "#0071E3";
const GOLD = "#B57A00";

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function listNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export interface RunOverOverlayProps {
  report: Forensics;
  won: boolean;
  onNewRun: (startChapter: number) => void;
}

export default function RunOverOverlay({ report, won, onNewRun }: RunOverOverlayProps) {
  const starts = [...report.unlockedStarts].sort((a, b) => a - b);
  const deepest = starts.length > 0 ? starts[starts.length - 1] : 1;
  const earlier = starts.filter((n) => n !== deepest);
  const peakColor = report.peak ? assetOf(report.peak.assetId).color : ACCENT;

  const unlockedLine = deepest <= 1
    ? "Chapter 1 stays unlocked."
    : `Chapters 1 to ${deepest} stay unlocked.`;

  return (
    <div style={shell}>
      <div style={panel}>
        <div style={eyebrow}>
          Chapter {report.chapterId} &middot; target {money(report.target)}
        </div>

        {won ? (
          <>
            <div style={heading}>{report.chapterName} is cleared.</div>
            <div style={scoreLine}>
              You reached the end of the ladder, and you finished at{" "}
              <b style={num}>{money(report.finishedAt)}</b>.
            </div>
          </>
        ) : (
          <>
            <div style={heading}>
              You finished at <span style={num}>{money(report.finishedAt)}</span>.
            </div>
            <div style={scoreLine}>The run ends here, and here is what the wall says happened.</div>
          </>
        )}

        {!won && (report.peak || report.after || report.passedOn) && (
          <>
            <div style={rule} />
            <div style={grid}>
              {report.peak && (
                <>
                  <span style={mark}>{report.peak.label || `Turn ${report.peak.turn + 1}`}</span>
                  <span style={cell}>
                    You put {report.peak.blocks} of your {report.peak.totalBlocks} blocks on one card,{" "}
                    {report.peak.name}.
                  </span>
                </>
              )}
              {report.after && (
                <>
                  <span style={mark}>{report.after.endLabel || "The end"}</span>
                  <span style={{ ...cell, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {/* the peak is never the last column, but a card can still
                        end the chapter on the block count it peaked at, and the
                        honest line there is that it stood where it stood */}
                    {report.after.blocksBefore === report.after.blocksAfter ? (
                      <>
                        <span>
                          That card was still worth {plural(report.after.blocksAfter, "block", "blocks")} at the
                          end.
                        </span>
                        <BlockRow count={report.after.blocksAfter} size={8} color={peakColor} maxWidth={120} />
                      </>
                    ) : (
                      <>
                        <span>
                          That card went from {plural(report.after.blocksBefore, "block", "blocks")} to{" "}
                          {plural(report.after.blocksAfter, "block", "blocks")}.
                        </span>
                        <BlockRow count={report.after.blocksBefore} size={8} color={peakColor} maxWidth={120} />
                        <span style={{ color: SUB }}>to</span>
                        <BlockRow count={report.after.blocksAfter} size={8} color={peakColor} maxWidth={120} />
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
            {report.passedOn && (
              <p style={passed}>
                {report.passedOn.name} was on the table too, and you passed on it. It finished the chapter
                at {plural(report.passedOn.endBlocks, "block", "blocks")}.
              </p>
            )}
          </>
        )}

        <div style={rule} />

        <div style={keptRow}>
          <span style={keptLabel}>Kept</span>
          <span style={keptText}>
            {report.keptInstruments.length > 0
              ? listNames(report.keptInstruments.map((k) => k.name))
              : "no cards this time"}
          </span>
          <span style={keptText}>{plural(report.badges.length, "badge", "badges")}</span>
          <span style={keptText}>{unlockedLine}</span>
        </div>

        <div style={buttonRow}>
          <button type="button" className={btn("primary")} onClick={() => onNewRun(deepest)} style={primary}>
            New run &middot; start at chapter {deepest}
          </button>
        </div>

        {earlier.length > 0 && (
          <div style={secondaryRow}>
            <span style={keptLabel}>Or start earlier</span>
            {earlier.map((n) => (
              <button key={n} type="button" className={btn("plain")} onClick={() => onNewRun(n)} style={secondary}>
                Chapter {n}
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
  padding: "14px 20px 12px",
  textAlign: "left",
};

const eyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: GOLD,
  fontVariantNumeric: "tabular-nums",
};

const heading: React.CSSProperties = {
  fontSize: 18,
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
  fontVariantNumeric: "tabular-nums",
  color: INK,
  fontWeight: 750,
};

const rule: React.CSSProperties = {
  height: 1,
  background: "rgba(0,0,0,0.10)",
  margin: "10px 0",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "7px 14px",
  alignItems: "center",
  fontSize: 13.5,
};

const mark: React.CSSProperties = {
  color: SUB,
  fontWeight: 650,
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

const cell: React.CSSProperties = {
  lineHeight: 1.45,
  fontVariantNumeric: "tabular-nums",
};

const passed: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 13.5,
  lineHeight: 1.5,
  color: SUB,
  fontVariantNumeric: "tabular-nums",
};

const keptRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 14px",
  alignItems: "baseline",
  fontSize: 13.5,
};

const keptLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: SUB,
};

const keptText: React.CSSProperties = {
  color: SUB,
  fontVariantNumeric: "tabular-nums",
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginTop: 14,
};

const primary: React.CSSProperties = {
  fontSize: 14,
  fontVariantNumeric: "tabular-nums",
  padding: "8px 18px",
  borderRadius: 9,
};

const secondaryRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  marginTop: 8,
};

const secondary: React.CSSProperties = {
  fontSize: 11.5,
  fontVariantNumeric: "tabular-nums",
  padding: "5px 10px",
  borderRadius: 9,
};
