// The world of Takeover: real companies with real market caps, written from
// knowledge (no network), same policy as companyCatalog.ts. Caps are as of
// early 2026 and rounded hard: nearest $50B above a trillion, nearest $5B
// above $100B, nearest $1B above $10B, nearest half billion below. The game
// only ever compares and adds these numbers, so rounding never changes who
// can eat whom in any way a player could notice.
//
// Chosen for name recognition first, then spread through log-space from about
// half a billion to the top of the market so the food chain has no dead zones.
// Colors are brand-ish, tuned for a dark arena, never sampled logos.

export interface TakeoverCompany {
  name: string;   // display name, lowercase arcade voice
  short: string;  // fits the disc
  color: string;
  cap: number;    // dollars
  local?: boolean; // unnamed local business tier, not a real listed company
}

const B = 1e9;
const T = 1e12;

type Row = [name: string, short: string, color: string, cap: number];

const ROWS: Row[] = [
  // the giants
  ["nvidia", "nvidia", "#76B900", 4.5 * T],
  ["apple", "apple", "#A2AAAD", 4.0 * T],
  ["microsoft", "msft", "#00A4EF", 3.7 * T],
  ["alphabet", "google", "#4285F4", 3.5 * T],
  ["amazon", "amazon", "#FF9900", 2.4 * T],
  ["meta", "meta", "#0866FF", 1.6 * T],
  ["broadcom", "avgo", "#CC0000", 1.6 * T],
  ["tesla", "tesla", "#E82127", 1.4 * T],
  ["berkshire hathaway", "brk", "#6E4B3A", 1.1 * T],
  ["tsmc", "tsmc", "#D45B4B", 1.1 * T],
  ["eli lilly", "lilly", "#E11931", 900 * B],
  ["jpmorgan", "jpm", "#5A6E8C", 850 * B],
  ["walmart", "walmart", "#0071CE", 800 * B],
  ["visa", "visa", "#1A1F71", 700 * B],
  ["oracle", "oracle", "#F80000", 650 * B],
  ["netflix", "netflix", "#E50914", 500 * B],
  ["mastercard", "mc", "#EB001B", 500 * B],
  ["exxon", "exxon", "#ED1B2D", 480 * B],
  ["costco", "costco", "#005DAA", 420 * B],
  ["johnson & johnson", "j&j", "#CC0033", 400 * B],
  ["home depot", "depot", "#F96302", 400 * B],
  ["procter & gamble", "p&g", "#0057B8", 380 * B],
  ["bank of america", "bofa", "#E31837", 350 * B],
  ["abbvie", "abbvie", "#071D49", 350 * B],
  ["chevron", "chevron", "#0054A4", 300 * B],
  ["coca-cola", "coke", "#F40009", 300 * B],
  ["toyota", "toyota", "#EB0A1E", 290 * B],
  ["samsung", "samsung", "#1428A0", 280 * B],
  ["salesforce", "crm", "#00A1E0", 250 * B],
  ["amd", "amd", "#ED1C24", 250 * B],
  ["mcdonald's", "mcd", "#FFC72C", 220 * B],
  ["pepsico", "pepsi", "#004B93", 210 * B],
  ["disney", "disney", "#113CCF", 205 * B],
  ["cisco", "cisco", "#049FD9", 200 * B],
  ["adobe", "adobe", "#FA0F00", 190 * B],
  ["at&t", "at&t", "#00A8E0", 165 * B],
  ["verizon", "verizon", "#CD040B", 160 * B],
  ["intel", "intel", "#0068B5", 150 * B],
  ["ibm", "ibm", "#0530AD", 220 * B],
  ["nike", "nike", "#DFDFDF", 110 * B],
  ["goldman sachs", "goldman", "#6B96C3", 190 * B],
  ["boeing", "boeing", "#0039A6", 130 * B],
  ["starbucks", "sbux", "#00704A", 95 * B],
  ["airbnb", "airbnb", "#FF5A5F", 85 * B],
  ["uber", "uber", "#EDEDED", 150 * B],
  ["spotify", "spotify", "#1DB954", 130 * B],
  ["nintendo", "nintendo", "#E60012", 90 * B],
  ["doordash", "dash", "#FF3008", 90 * B],
  ["robinhood", "hood", "#00C805", 100 * B],
  ["roblox", "roblox", "#E2231A", 80 * B],
  ["coinbase", "coin", "#0052FF", 75 * B],
  ["ferrari", "ferrari", "#EF1A2D", 80 * B],
  ["lockheed martin", "lockheed", "#005DAA", 110 * B],
  ["ups", "ups", "#644117", 75 * B],
  ["fedex", "fedex", "#4D148C", 60 * B],
  ["colgate", "colgate", "#D2010D", 70 * B],
  ["target", "target", "#CC0000", 42 * B],
  ["general motors", "gm", "#0170CE", 55 * B],
  ["chipotle", "chipotle", "#A81612", 55 * B],
  ["marriott", "marriott", "#B0233A", 70 * B],
  ["hilton", "hilton", "#1E4380", 60 * B],
  ["delta", "delta", "#C8102E", 40 * B],
  ["ford", "ford", "#00274E", 45 * B],
  ["electronic arts", "ea", "#FF4747", 45 * B],
  ["take-two", "take2", "#5009B5", 40 * B],
  ["ebay", "ebay", "#E53238", 32 * B],
  ["united airlines", "united", "#005DAA", 32 * B],
  ["hershey", "hershey", "#8B6748", 35 * B],
  ["kraft heinz", "kraft", "#FF0018", 33 * B],
  ["hp", "hp", "#0096D6", 28 * B],
  ["pinterest", "pins", "#E60023", 25 * B],
  ["dell", "dell", "#007DB8", 28 * B],
  ["southwest", "swa", "#F9B612", 18 * B],
  ["lululemon", "lulu", "#D31334", 22 * B],
  ["domino's", "dominos", "#006491", 15 * B],
  ["snap", "snap", "#FFFC00", 15 * B],
  ["dropbox", "dropbox", "#0061FF", 9 * B],
  ["gamestop", "gme", "#EE3524", 12 * B],
  ["reddit", "reddit", "#FF4500", 25 * B],
  ["duolingo", "duo", "#58CC02", 15 * B],
  ["hasbro", "hasbro", "#0055A5", 10 * B],
  ["harley-davidson", "harley", "#F26522", 4 * B],
  ["planet fitness", "planet", "#7B2D82", 8 * B],
  ["etsy", "etsy", "#F1641E", 7 * B],
  ["crocs", "crocs", "#7ABA40", 6 * B],
  ["mattel", "mattel", "#E4002B", 6 * B],
  ["lyft", "lyft", "#FF00BF", 6 * B],
  ["american airlines", "aa", "#B1B3B5", 8 * B],
  ["levi's", "levis", "#C41230", 6 * B],
  ["wendy's", "wendys", "#E2203D", 2.5 * B],
  ["under armour", "ua", "#C9C9C9", 3 * B],
  ["peloton", "peloton", "#DF1C2F", 3 * B],
  ["six flags", "6flags", "#0053A0", 3 * B],
  ["shake shack", "shack", "#58A947", 4 * B],
  ["yeti", "yeti", "#9EA2A2", 3 * B],
  ["jetblue", "jetblue", "#003876", 2 * B],
  ["dave & buster's", "d&b", "#0072CE", 1 * B],
  ["cheesecake factory", "cheesecake", "#7A5C3E", 2.5 * B],
  ["amc theatres", "amc", "#D22630", 1.5 * B],
  ["build-a-bear", "bear", "#00AEEF", 1 * B],
  ["krispy kreme", "krispy", "#00653A", 0.6 * B],
];

export const COMPANIES: TakeoverCompany[] = ROWS.map(([name, short, color, cap]) => ({
  name,
  short,
  color,
  cap,
}));

// Milestone ladder: famous names a growing player crosses, sparse enough that
// flashes stay rare. Sorted ascending.
export const MILESTONES: TakeoverCompany[] = COMPANIES.filter((c) =>
  [
    "crocs",
    "gamestop",
    "domino's",
    "snap",
    "target",
    "ford",
    "delta",
    "roblox",
    "starbucks",
    "nintendo",
    "nike",
    "intel",
    "disney",
    "mcdonald's",
    "coca-cola",
    "netflix",
    "walmart",
    "tesla",
    "meta",
    "amazon",
    "alphabet",
    "apple",
    "nvidia",
  ].includes(c.name),
).sort((a, b) => a.cap - b.cap);

export const ROBLOX_CAP = COMPANIES.find((c) => c.name === "roblox")!.cap;

// The S&P 500 rank line on the IPO card: approximate cap thresholds, rounded,
// early 2026. rankBeaten(v) returns how many of the 500 you finished bigger
// than, from a coarse honest curve (smallest members ~$5B, median ~$35B).
const RANK_CURVE: Array<[cap: number, beaten: number]> = [
  [5 * B, 0],
  [10 * B, 60],
  [20 * B, 160],
  [35 * B, 250],
  [80 * B, 350],
  [200 * B, 430],
  [500 * B, 470],
  [1 * T, 490],
  [2 * T, 496],
  [3.5 * T, 499],
];

export function rankBeaten(value: number): number {
  let beaten = 0;
  for (const [cap, b] of RANK_CURVE) if (value >= cap) beaten = b;
  return beaten;
}

export function fmtMoney(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(v >= 1e13 ? 0 : 1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  return `$${Math.round(v / 1e3)}K`;
}
