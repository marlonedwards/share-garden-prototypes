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
  name: string;   // display name, written the way the company writes it
  short: string;  // the logo file key in public/logos, never shown as a title
  color: string;
  cap: number;    // dollars
  local?: boolean; // unnamed local business tier, not a real listed company
}

const B = 1e9;
const T = 1e12;

type Row = [name: string, short: string, color: string, cap: number];

const ROWS: Row[] = [
  // the giants
  ["Nvidia", "nvidia", "#76B900", 4.5 * T],
  ["Apple", "apple", "#A2AAAD", 4.0 * T],
  ["Microsoft", "msft", "#00A4EF", 3.7 * T],
  ["Alphabet", "google", "#4285F4", 3.5 * T],
  ["Amazon", "amazon", "#FF9900", 2.4 * T],
  ["Meta", "meta", "#0866FF", 1.6 * T],
  ["Broadcom", "avgo", "#CC0000", 1.6 * T],
  ["Tesla", "tesla", "#E82127", 1.4 * T],
  ["Berkshire Hathaway", "brk", "#6E4B3A", 1.1 * T],
  ["TSMC", "tsmc", "#D45B4B", 1.1 * T],
  ["Eli Lilly", "lilly", "#E11931", 900 * B],
  ["JPMorgan", "jpm", "#5A6E8C", 850 * B],
  ["Walmart", "walmart", "#0071CE", 800 * B],
  ["Visa", "visa", "#1A1F71", 700 * B],
  ["Oracle", "oracle", "#F80000", 650 * B],
  ["Netflix", "netflix", "#E50914", 500 * B],
  ["Mastercard", "mc", "#EB001B", 500 * B],
  ["Exxon", "exxon", "#ED1B2D", 480 * B],
  ["Costco", "costco", "#005DAA", 420 * B],
  ["Johnson & Johnson", "j&j", "#CC0033", 400 * B],
  ["Home Depot", "depot", "#F96302", 400 * B],
  ["Procter & Gamble", "p&g", "#0057B8", 380 * B],
  ["Bank of America", "bofa", "#E31837", 350 * B],
  ["AbbVie", "abbvie", "#071D49", 350 * B],
  ["Chevron", "chevron", "#0054A4", 300 * B],
  ["Coca-Cola", "coke", "#F40009", 300 * B],
  ["Toyota", "toyota", "#EB0A1E", 290 * B],
  ["Samsung", "samsung", "#1428A0", 280 * B],
  ["Salesforce", "crm", "#00A1E0", 250 * B],
  ["AMD", "amd", "#ED1C24", 250 * B],
  ["McDonald's", "mcd", "#FFC72C", 220 * B],
  ["PepsiCo", "pepsi", "#004B93", 210 * B],
  ["Disney", "disney", "#113CCF", 205 * B],
  ["Cisco", "cisco", "#049FD9", 200 * B],
  ["Adobe", "adobe", "#FA0F00", 190 * B],
  ["AT&T", "at&t", "#00A8E0", 165 * B],
  ["Verizon", "verizon", "#CD040B", 160 * B],
  ["Intel", "intel", "#0068B5", 150 * B],
  ["IBM", "ibm", "#0530AD", 220 * B],
  ["Nike", "nike", "#DFDFDF", 110 * B],
  ["Goldman Sachs", "goldman", "#6B96C3", 190 * B],
  ["Boeing", "boeing", "#0039A6", 130 * B],
  ["Starbucks", "sbux", "#00704A", 95 * B],
  ["Airbnb", "airbnb", "#FF5A5F", 85 * B],
  ["Uber", "uber", "#EDEDED", 150 * B],
  ["Spotify", "spotify", "#1DB954", 130 * B],
  ["Nintendo", "nintendo", "#E60012", 90 * B],
  ["DoorDash", "dash", "#FF3008", 90 * B],
  ["Robinhood", "hood", "#00C805", 100 * B],
  ["Roblox", "roblox", "#E2231A", 80 * B],
  ["Coinbase", "coin", "#0052FF", 75 * B],
  ["Ferrari", "ferrari", "#EF1A2D", 80 * B],
  ["Lockheed Martin", "lockheed", "#005DAA", 110 * B],
  ["UPS", "ups", "#644117", 75 * B],
  ["FedEx", "fedex", "#4D148C", 60 * B],
  ["Colgate", "colgate", "#D2010D", 70 * B],
  ["Target", "target", "#CC0000", 42 * B],
  ["General Motors", "gm", "#0170CE", 55 * B],
  ["Chipotle", "chipotle", "#A81612", 55 * B],
  ["Marriott", "marriott", "#B0233A", 70 * B],
  ["Hilton", "hilton", "#1E4380", 60 * B],
  ["Delta", "delta", "#C8102E", 40 * B],
  ["Ford", "ford", "#00274E", 45 * B],
  ["Electronic Arts", "ea", "#FF4747", 45 * B],
  ["Take-Two", "take2", "#5009B5", 40 * B],
  ["eBay", "ebay", "#E53238", 32 * B],
  ["United Airlines", "united", "#005DAA", 32 * B],
  ["Hershey", "hershey", "#8B6748", 35 * B],
  ["Kraft Heinz", "kraft", "#FF0018", 33 * B],
  ["HP", "hp", "#0096D6", 28 * B],
  ["Pinterest", "pins", "#E60023", 25 * B],
  ["Dell", "dell", "#007DB8", 28 * B],
  ["Southwest", "swa", "#F9B612", 18 * B],
  ["Lululemon", "lulu", "#D31334", 22 * B],
  ["Domino's", "dominos", "#006491", 15 * B],
  ["Snap", "snap", "#FFFC00", 15 * B],
  ["Dropbox", "dropbox", "#0061FF", 9 * B],
  ["GameStop", "gme", "#EE3524", 12 * B],
  ["Reddit", "reddit", "#FF4500", 25 * B],
  ["Duolingo", "duo", "#58CC02", 15 * B],
  ["Hasbro", "hasbro", "#0055A5", 10 * B],
  ["Harley-Davidson", "harley", "#F26522", 4 * B],
  ["Planet Fitness", "planet", "#7B2D82", 8 * B],
  ["Etsy", "etsy", "#F1641E", 7 * B],
  ["Crocs", "crocs", "#7ABA40", 6 * B],
  ["Mattel", "mattel", "#E4002B", 6 * B],
  ["Lyft", "lyft", "#FF00BF", 6 * B],
  ["American Airlines", "aa", "#B1B3B5", 8 * B],
  ["Levi's", "levis", "#C41230", 6 * B],
  ["Wendy's", "wendys", "#E2203D", 2.5 * B],
  ["Under Armour", "ua", "#C9C9C9", 3 * B],
  ["Peloton", "peloton", "#DF1C2F", 3 * B],
  ["Six Flags", "6flags", "#0053A0", 3 * B],
  ["Shake Shack", "shack", "#58A947", 4 * B],
  ["YETI", "yeti", "#9EA2A2", 3 * B],
  ["JetBlue", "jetblue", "#003876", 2 * B],
  ["Dave & Buster's", "d&b", "#0072CE", 1 * B],
  ["Cheesecake Factory", "cheesecake", "#7A5C3E", 2.5 * B],
  ["AMC Theatres", "amc", "#D22630", 1.5 * B],
  ["Build-A-Bear", "bear", "#00AEEF", 1 * B],
  ["Krispy Kreme", "krispy", "#00653A", 0.6 * B],
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
    "Crocs",
    "GameStop",
    "Domino's",
    "Snap",
    "Target",
    "Ford",
    "Delta",
    "Roblox",
    "Starbucks",
    "Nintendo",
    "Nike",
    "Intel",
    "Disney",
    "McDonald's",
    "Coca-Cola",
    "Netflix",
    "Walmart",
    "Tesla",
    "Meta",
    "Amazon",
    "Alphabet",
    "Apple",
    "Nvidia",
].includes(c.name),
).sort((a, b) => a.cap - b.cap);

export const ROBLOX_CAP = COMPANIES.find((c) => c.name === "Roblox")!.cap;

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
