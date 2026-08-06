// Where the "Start here" chip points. The intro questionnaire picks a
// recommended starting point; the chip sits there until that stop has been
// played, then walks the course order: the five basics lessons, the tutorial,
// the six eras, and finally Ready to invest. A stop counts as played when its
// check run landed in the beta-checks store (lessons and eras), when the
// tutorial wrote its done flag, or when a Ready plan is saved, so the chip
// always points at the first thing the player has not finished.
import { LESSON_LADDER } from "../lessons";
import { SCENARIOS } from "./scenarios";
import { loadReadyPlan } from "./readyAssets";

export const TUTORIAL_DONE_KEY = "tutorial-done";

function playedScenarios(): Set<string> {
  try {
    const all = JSON.parse(localStorage.getItem("beta-checks") ?? "[]") as { scenario?: string }[];
    return new Set(all.map((r) => r.scenario ?? ""));
  } catch {
    return new Set();
  }
}

function tutorialDone(): boolean {
  try { return localStorage.getItem(TUTORIAL_DONE_KEY) === "1"; } catch { return false; }
}

// Every stop in course order, as the route its card links to.
function courseOrder(): { route: string; played: boolean }[] {
  const played = playedScenarios();
  const hasPlan = (() => { try { return loadReadyPlan() !== null; } catch { return false; } })();
  return [
    ...LESSON_LADDER.map((l) => ({ route: `/orb/learn/${l.id}`, played: played.has(`learn-${l.id}`) })),
    { route: "/orb/tutorial", played: tutorialDone() },
    ...SCENARIOS.map((s) => ({ route: `/orb/s/${s.id}`, played: played.has(s.id) })),
    { route: "/orb/ready", played: hasPlan },
  ];
}

// The route the chip should sit on, or null when the whole course is played.
export function startHereRoute(reco: string | null): string | null {
  const order = courseOrder();
  if (reco) {
    const route = reco.startsWith("era-") ? `/orb/s/${reco.slice(4)}` : `/orb/learn/${reco.slice(7)}`;
    const stop = order.find((s) => s.route === route);
    if (stop && !stop.played) return stop.route;
  }
  return order.find((s) => !s.played)?.route ?? null;
}
