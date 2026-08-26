// The repo carries no @types/node and does not want them for a few file
// reads. The headless harnesses in tools/ only ever read files as text and
// list one directory, so those two calls are declared here and nothing else.
declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
  export function readdirSync(path: string | URL): string[];
}
