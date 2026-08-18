import { useEffect, useState } from "react";
import { AnsweredItem, CheckItem, gradeCheckAnswer, saveAnsweredRun } from "../lib/checkpoints";

// The beta quick check: one item at a time, immediate explanation, and a
// results panel the tester can screenshot. Framed as testing the game, not
// the player. Nothing leaves the computer.

const SUB = "#6e6e73";

export default function QuickCheck({ scenario, items, gateMs, onFocus, onAnswered }: {
  scenario: string;
  items: CheckItem[];
  gateMs: number[];
  onFocus?: (step: number | null) => void;
  onAnswered?: (correct: boolean) => void;   // fires per item, on the tap
}) {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnsweredItem[]>([]);

  const done = idx >= items.length;
  const score = answers.filter((a) => a.correct).length;

  // rewind the scene to the moment this question is about
  useEffect(() => {
    if (!onFocus) return;
    onFocus(!done && items[idx]?.focus !== undefined ? items[idx].focus! : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  useEffect(() => {
    if (done && answers.length === items.length) {
      saveAnsweredRun(scenario, answers, gateMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (items.length === 0) return null;

  const pick = (i: number) => {
    if (choice !== null) return;
    const row = gradeCheckAnswer(items[idx], i);
    setChoice(i);
    setAnswers((a) => [...a, row]);
    onAnswered?.(row.correct);
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div className="flex items-baseline gap-2">
        <span className="text-[13.5px] font-semibold">Quick check</span>
        <span className="text-[12px] font-medium px-1.5 py-[1px] rounded-full" style={{ background: "#f0f0f2", color: SUB }}>Beta</span>
        {!done && <span className="ml-auto text-[12px] tnum" style={{ color: SUB }}>{idx + 1} of {items.length}</span>}
      </div>
      <p className="text-[12px] mt-0.5" style={{ color: SUB }}>
        This tests the game, not you.
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
              <div key={it.id} className="flex items-center gap-2 text-[12px]" style={{ color: SUB }}>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="flex-shrink-0"
                  stroke={answers[i]?.correct ? "#248a3d" : "#d70015"} strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" role="img"
                  aria-label={answers[i]?.correct ? "Answered correctly" : "Missed"}>
                  {answers[i]?.correct
                    ? <path d="M1.5 5.5 L4 8 L8.5 2" />
                    : <path d="M2 2 L8 8 M8 2 L2 8" />}
                </svg>
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
            Screenshot this panel for us.
          </div>
        </div>
      )}
    </div>
  );
}
