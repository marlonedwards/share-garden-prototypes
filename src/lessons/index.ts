import { LessonConfig } from "./types";
import cash from "./cash";
import savings from "./savings";
import stocks from "./stocks";
import funds from "./funds";
import coins from "./coins";

// The intro ladder, in teaching order. Every list of these lessons anywhere
// in the app renders from this array so the order stays: cash, savings,
// stocks, funds, coins.

export const LESSON_LADDER: LessonConfig[] = [cash, savings, stocks, funds, coins];

// Old mini-lesson ids stay routable forever. /orb/mini/share redirects to
// /orb/learn/stocks, and so on.
const ALIASES: Record<string, string> = {
  share: "stocks",
  fund: "funds",
  coin: "coins",
};

export function canonicalLessonId(id: string | undefined): string | null {
  if (!id) return null;
  const canon = ALIASES[id] ?? id;
  return LESSON_LADDER.some((l) => l.id === canon) ? canon : null;
}

export function getLesson(id: string | undefined): LessonConfig | null {
  const canon = canonicalLessonId(id);
  return LESSON_LADDER.find((l) => l.id === canon) ?? null;
}
