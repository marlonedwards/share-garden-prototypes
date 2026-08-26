// The build side of the shelf: Vite inlines every bot file as raw text at
// build time, the assembler joins them, and the app ships one scaffold
// string. Dropping a new bot file in this directory is the whole job of
// adding a bot; nothing here needs touching.

import { PLAYER, assembleScaffold, shelfNames } from "./assemble";

const raw = import.meta.glob("./*.js", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const files: Record<string, string> = {};
for (const [path, source] of Object.entries(raw)) {
  files[path.replace(/^\.\//, "").replace(/\.js$/, "")] = source;
}

export const BOT_SCAFFOLD = assembleScaffold(files);
export const SHELF = shelfNames(files);
// each bot's own source by name, for the level cards that show one bot alone
export const BOT_FILES: Record<string, string> = files;
export { PLAYER };
