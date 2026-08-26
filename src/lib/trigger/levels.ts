// The level ladder: real algorithms over real data, in rising order of
// complexity, and nothing else. No story and no verdicts: each level names
// its player, shows its code when the player is a bot, and lets the end
// card's numbers do all the talking. Contract: docs/trigger-spec.md
// section 11.
//
// Pure data, no DOM and no Vite, so tools/botSim.ts can check every player
// against the shelf on disk.

export interface Level {
  id: number;
  title: string;
  // "you" is the space bar, "editor" is the writable bot editor, anything
  // else is a shelf bot name whose source the level card shows read only.
  player: "you" | "editor" | string;
  // one mechanical sentence: what the player does, never how to feel about it
  line: string;
}

export const LEVELS: Level[] = [
  { id: 1, title: "You trade", player: "you", line: "The space bar, one stock, one minute." },
  { id: 2, title: "Random", player: "randomBot", line: "Acts at your reflex speed, entirely at random." },
  { id: 3, title: "Buy and hold", player: "buyAndHoldBot", line: "All in on the first tick, then nothing." },
  { id: 4, title: "Dollar cost averaging", player: "dollarCostAverageBot", line: "Spends $100 at the start of every month." },
  { id: 5, title: "Swing", player: "swingTradeBot", line: "Buys 8% under the six month average, sells 8% over." },
  { id: 6, title: "Momentum", player: "momentumBot", line: "All in after two rising months, out after two falling." },
  { id: 7, title: "Crossover", player: "crossoverBot", line: "Three month average against the twelve month average." },
  { id: 8, title: "Brackets", player: "bracketBot", line: "Takes profit 20% above entry, cuts the loss 10% below." },
  { id: 9, title: "Trend sizing", player: "trendSizerBot", line: "Position sized to where the price sits in its year range." },
  { id: 10, title: "Your own bot", player: "editor", line: "Write the function; the tape judges it." },
];

export function levelById(id: number): Level | null {
  return LEVELS.find((l) => l.id === id) ?? null;
}
