// A gate: the one thing in The Floor that stops the tape. A real archived
// headline in its printed clothes, one sentence of where you are, and two
// actions. Choosing runs a real trade through the ordinary engine at the live
// price and the tape starts again (docs/floor-spec.md section 3).
//
// The clipping keeps Georgia, the single serif exception in docs/clean-type.md,
// and carries data-newsclip so the site audit knows which one it is.

import { FloorGate } from "../../lib/floor/gates";
import { money, price as fmtPrice, readMonth } from "../../lib/floor/campaign";

export default function Gate({
  gate, month, cash, worth, priceNow, subject, onChoose,
}: {
  gate: FloorGate;
  month: string;
  cash: number;
  worth: number;
  priceNow: number | null;
  subject: string | null;
  onChoose: (index: number) => void;
}) {
  return (
    <div
      data-gate={gate.id}
      // Opaque, like the debrief. A gate is the one thing that stops the tape,
      // and a live trade button reading through the sentence you are being
      // asked to answer is the desk talking over itself.
      className="absolute inset-0 z-30 flex items-center justify-center px-4 py-6"
      style={{ background: "#0C0F14" }}
    >
      <div className="w-full max-w-[560px] flex flex-col gap-4">
        <div className="tnum" style={{ fontSize: 13, color: "#8794A6" }}>{readMonth(month)}</div>

        <div
          data-newsclip
          className="rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.97)", color: "#111", boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}
        >
          <div className="px-4 pt-2.5 pb-1 flex items-baseline justify-between border-b border-black/10">
            <span style={{ fontSize: 12, fontWeight: 600 }}>{gate.source}</span>
            <span className="tnum" style={{ fontSize: 12, color: "#6e6e73" }}>{gate.date}</span>
          </div>
          <div className="px-4 py-3">
            <div
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}
            >
              {gate.headline}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 15, color: "#E8EDF4", lineHeight: 1.45 }}>{gate.situation}</p>

        <div className="flex items-baseline gap-4 tnum" style={{ fontSize: 13, color: "#8794A6" }}>
          <span>worth {money(worth)}</span>
          <span>cash {money(cash)}</span>
          {subject && priceNow !== null && priceNow > 0 && (
            <span>{subject} {fmtPrice(priceNow)}</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {gate.choices.map((choice, i) => (
            <button
              key={choice.label}
              type="button"
              data-gate-choice={i}
              onClick={() => onChoose(i)}
              // Both choices are drawn the same. A primary and a secondary
              // button would be the desk recommending one of them, and the
              // whole point of a gate is that nobody knows which is right.
              className="flex-1 rounded-xl px-4 py-3 text-center"
              style={{
                background: "#1F2733",
                color: "#E8EDF4",
                border: "1px solid #39434F",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
