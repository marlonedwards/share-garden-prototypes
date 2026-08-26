// The shelf on disk: one bot per file in this directory, the filename is the
// function name, and `_header.js` is the contract comment the editor opens
// with. The shipped scaffold is assembled from those files plus exactly one
// more fact, PLAYER, the bot the generated last line points at.
//
// Assembly is pure string work with no Vite and no fs in the room, so the
// build (index.ts, raw imports) and the fuzz harness (tools/botSim.ts, file
// reads) assemble the identical scaffold from their own copies of the files.

export const PLAYER = "randomBot";

// Shelf order, simplest first. A bot missing from this list still ships,
// appended alphabetically after the ranked ones, so adding a bot is adding
// one file: this list is presentation, not registration.
export const SHELF_ORDER = [
  "randomBot",
  "buyAndHoldBot",
  "dollarCostAverageBot",
  "swingTradeBot",
  "momentumBot",
  "crossoverBot",
  "bracketBot",
  "trendSizerBot",
];

// The bots on the shelf, in shelf order, underscore files excluded.
export function shelfNames(files: Record<string, string>): string[] {
  const rank = (n: string) => {
    const i = SHELF_ORDER.indexOf(n);
    return i === -1 ? SHELF_ORDER.length : i;
  };
  return Object.keys(files)
    .filter((n) => !n.startsWith("_"))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function assembleScaffold(files: Record<string, string>): string {
  const names = shelfNames(files);
  if (names.length === 0) throw new Error("the shelf is empty");
  if (!names.includes(PLAYER)) throw new Error(`the shelf has no ${PLAYER} to point bot at`);
  const parts = [
    ...(files._header ? [files._header.trimEnd()] : []),
    ...names.map((n) => files[n].trimEnd()),
    `bot = ${PLAYER};`,
  ];
  return `${parts.join("\n\n")}\n`;
}
