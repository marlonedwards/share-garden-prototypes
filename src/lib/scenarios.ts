// The Orb's scenario registry. Every era runs real monthly prices with
// abstracted company names and honest descriptions; the rainbow orb is always
// the real S&P 500 total return. One scenario per lesson, copy kept short.
//
// Content lives in src/content/era-*.ts, one module per era so parallel
// writers never collide; this file only assembles the registry and re-exports
// the shared shapes so existing imports keep working.
import { dotcom } from "../content/era-dotcom";
import { payday } from "../content/era-payday";
import { gfc } from "../content/era-gfc";
import { crypto } from "../content/era-crypto";
import { covid } from "../content/era-covid";
import { inflation } from "../content/era-inflation";
import { ScenarioConfig } from "../content/types";

export type { Gate, ScenarioConfig, EraBriefingContent, BriefingSection } from "../content/types";
export { hasScouting } from "../content/types";

// Six real eras. The seeded tutorial at /orb/tutorial is Lesson 1 of the
// numbered ladder, so these six run as Lessons 2 through 7; the select screen
// and the OnePager both state that count the same way.
export const SCENARIOS: ScenarioConfig[] = [dotcom, payday, gfc, crypto, covid, inflation];

// The Stack variant sells the index itself as a row on the menu: buying it
// holds the era's real total-return index inside your own column as a striped
// band. Without this, "be the index" would be a goal the game never lets you
// choose.
export function withIndexFund(cfg: ScenarioConfig): ScenarioConfig {
  if (cfg.assets.some((a) => a.id === cfg.indexKey)) return cfg;
  return {
    ...cfg,
    assets: [
      ...cfg.assets,
      {
        id: cfg.indexKey,
        name: "The Index Fund",
        real: "an S&P 500 index fund",
        desc: "One purchase that buys a small piece of hundreds of companies at once.",
        color: "#64748b",
        glow: "#b3bdc9",
        founded: 1976,
        history: "The first index fund opened in 1976 and was mocked as settling for average. It holds a slice of every large company at once and never picks a winner.",
        believers: "Owning everything and holding on beats almost everyone who tries to do better.",
        doubters: "Settling for the market's average feels like giving up before you start.",
      },
    ],
  };
}

export function getScenario(id: string | undefined): ScenarioConfig {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
