// The repo carries no @types/node and does not want them for one file read.
// The headless harnesses in tools/ only ever read a file as text, so that one
// call is declared here and nothing else is.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
