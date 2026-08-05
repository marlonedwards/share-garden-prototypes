import { useEffect, useState } from "react";
import { CheckItem, saveCheckResult } from "../lib/checkpoints";

// The beta quick check: one item at a time, immediate explanation, and a
// results panel the tester can screenshot. Framed as testing the game, not
// the player. Nothing leaves the computer.

const SUB = "#6e6e73";

export default function QuickCheck({ scenario, items, gateMs }: {
  scenario: string;
  items: CheckItem[];
  gateMs: number[];
}) {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ id: string; choice: number; correct: boolean }[]>([]);

  const done = idx >= items.length;
  const score = answers.filter((a) => a.correct).length;

  useEffect(() => {
    if (done && answers.length === items.length && items.length > 0) {
      saveCheckResult({
        scenario,
        when: new Date().toISOString(),
        score,
        total: items.length,
        items: answers,
        gateMs,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (items.length === 0) return null;

  const pick = (i: number) => {
    if (choice !== null) return;
    const item = items[idx];
    setChoice(i);
    setAnswers((a) => [...a, { id: item.id, choice: i, correct: i === item.answer }]);
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div className="flex items-baseline gap-2">
        <span className="text-[13.5px] font-semibold">Quick check</span>
        <span className="text-[11px] font-medium px-1.5 py-[1px] rounded-full" style={{ background: "#f0f0f2", color: SUB }}>beta</span>
        {!done && <span className="ml-auto text-[12px] tnum" style={{ color: SUB }}>{idx + 1} of {items.length}</span>}
      </div>
      <p className="text-[12px] mt-0.5" style={{ color: SUB }}>
        This tests the game, not you. Your answers stay on this computer.
      </p>

      {!done && (
        <div className="mt-3">
          <div className="text-[13.5px] font-medium">{items[idx].prompt}</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {items[idx].options.map((o, i) => {
              const isAnswer = i === items[idx].answer;
              const isChoice = i === choice;
              const revealed = choice !== null;
              const bg = !revealed ? "#fafafc" : isAnswer ? "rgba(52,199,89,0.14)" : isChoice ? "rgba(255,59,48,0.10)" : "#fafafc";
              const border = !revealed ? "rgba(0,0,0,0.08)" : isAnswer ? "rgba(36,138,61,0.45)" : isChoice ? "rgba(215,0,21,0.35)" : "rgba(0,0,0,0.08)";
              return (
                <button key={i} onClick={() => pick(i)}
                  className="text-left text-[13px] rounded-xl px-3.5 py-2 border transition"
                  style={{ background: bg, borderColor: border, cursor: revealed ? "default" : "pointer" }}>
                  {o}
                </button>
              );
            })}
          </div>
          {choice !== null && (
            <div className="mt-2.5 pop-in">
              <p className="text-[12.5px]" style={{ color: "#3a3a3c" }}>{items[idx].explain}</p>
              <button onClick={() => { setIdx(idx + 1); setChoice(null); }}
                className="mt-2 text-[13px] font-medium px-4 py-1.5 rounded-full text-white"
                style={{ background: "#0071e3" }}>
                {idx + 1 < items.length ? "Next" : "See results"}
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-3 rounded-xl px-4 py-3 pop-in" style={{ background: "#f5f5f7" }}>
          <div className="text-[20px] font-semibold tracking-tight tnum">{score} / {items.length}</div>
          <div className="mt-1.5 flex flex-col gap-1">
            {items.map((it, i) => (
              <div key={it.id} className="flex gap-2 text-[12px]" style={{ color: SUB }}>
                <span style={{ color: answers[i]?.correct ? "#248a3d" : "#d70015" }}>{answers[i]?.correct ? "✓" : "✗"}</span>
                <span className="truncate">{it.prompt}</span>
              </div>
            ))}
          </div>
          {gateMs.length > 0 && (
            <div className="mt-2 text-[12px] tnum" style={{ color: SUB }}>
              Crossroads answers took {gateMs.map((ms) => `${Math.round(ms / 1000)}s`).join(" and ")}.
            </div>
          )}
          <div className="mt-2 text-[12px]" style={{ color: SUB }}>
            Beta testers: screenshot this panel for us.
          </div>
        </div>
      )}
    </div>
  );
}
