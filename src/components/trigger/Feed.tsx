// One headline at a time, above the calculator. A real archived headline gets
// the house clipping treatment (the serif is allowed there because it is a
// reproduction of print, not chrome: docs/clean-type.md section 1, and the
// card carries data-newsclip so the type audit can see that). An authored
// headline is plain text in the one typeface.
//
// No label ever reaches this component. Truth is revealed on the end card and
// nowhere else, which is the whole point of Elijah's rule: you cannot win by
// reading the news.

import { UI_FONT } from "../../lib/type";

export interface FeedItem {
  id: string;
  text: string;
  real: boolean;
  source?: string;
  date?: string;
}

export default function Feed(
  { item, height, maxSize = 16 }: { item: FeedItem | null; height: number; maxSize?: number },
) {
  // the calculator is the biggest thing on the run screen, so the feed is
  // handed a ceiling rather than choosing its own size
  const head = Math.max(12, Math.min(19, maxSize));
  const plain = Math.max(12, Math.min(18, maxSize));
  return (
    <div style={{ height, position: "relative", fontFamily: UI_FONT, overflow: "hidden" }}>
      <style>{`
        @keyframes trigger-feed-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {item && (
        <div
          key={item.id}
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            animation: "trigger-feed-in 220ms ease-out both",
          }}
        >
          {item.real ? (
            <div
              data-newsclip=""
              style={{
                width: "100%", background: "#F5F2EA", borderRadius: 10,
                padding: "8px 12px", overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3a3c", fontFamily: UI_FONT }}>
                  {item.source ?? "The wire"}
                </span>
                <span style={{ fontSize: 12, color: "#6e6e73", fontFamily: UI_FONT, fontVariantNumeric: "tabular-nums" }}>
                  {item.date ?? ""}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: head, fontWeight: 700, lineHeight: 1.25, color: "#16181d", marginTop: 2,
                }}
              >
                {item.text}
              </div>
            </div>
          ) : (
            <div
              style={{
                width: "100%", background: "#1F2733", borderRadius: 10,
                padding: "10px 12px", fontSize: plain, lineHeight: 1.3, color: "#E8EDF4",
                fontFamily: UI_FONT,
              }}
            >
              {item.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
