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
import { ScenarioConfig } from "../content/types";

export type { Gate, ScenarioConfig, EraBriefingContent, BriefingSection } from "../content/types";
export { hasScouting } from "../content/types";

export const SCENARIOS: ScenarioConfig[] = [dotcom, payday, gfc, crypto];

export function getScenario(id: string | undefined): ScenarioConfig {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
