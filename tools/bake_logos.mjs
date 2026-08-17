// One-time bake: download a logo per Takeover company into public/logos/,
// named <short>.png so the game can look them up directly. Source is Google's
// favicon service at 128px, which resolves brand marks by domain with no key.
// Rerun any time the catalog changes; existing files are skipped.
import { writeFileSync, mkdirSync, existsSync } from "fs";

const OUT = new URL("../public/logos/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// short label (the game's filename key) -> domain
const DOMAINS = {
  nvidia: "nvidia.com",
  apple: "apple.com",
  msft: "microsoft.com",
  google: "google.com",
  amazon: "amazon.com",
  meta: "meta.com",
  avgo: "broadcom.com",
  tesla: "tesla.com",
  brk: "berkshirehathaway.com",
  tsmc: "tsmc.com",
  lilly: "lilly.com",
  jpm: "jpmorganchase.com",
  walmart: "walmart.com",
  visa: "visa.com",
  oracle: "oracle.com",
  netflix: "netflix.com",
  mc: "mastercard.com",
  exxon: "exxonmobil.com",
  costco: "costco.com",
  "j&j": "jnj.com",
  depot: "homedepot.com",
  "p&g": "pg.com",
  bofa: "bankofamerica.com",
  abbvie: "abbvie.com",
  chevron: "chevron.com",
  coke: "coca-cola.com",
  toyota: "toyota.com",
  samsung: "samsung.com",
  crm: "salesforce.com",
  amd: "amd.com",
  mcd: "mcdonalds.com",
  pepsi: "pepsico.com",
  disney: "disney.com",
  cisco: "cisco.com",
  adobe: "adobe.com",
  "at&t": "att.com",
  verizon: "verizon.com",
  intel: "intel.com",
  ibm: "ibm.com",
  nike: "nike.com",
  goldman: "goldmansachs.com",
  boeing: "boeing.com",
  sbux: "starbucks.com",
  airbnb: "airbnb.com",
  uber: "uber.com",
  spotify: "spotify.com",
  nintendo: "nintendo.com",
  dash: "doordash.com",
  hood: "robinhood.com",
  roblox: "roblox.com",
  coin: "coinbase.com",
  ferrari: "ferrari.com",
  lockheed: "lockheedmartin.com",
  ups: "ups.com",
  fedex: "fedex.com",
  colgate: "colgatepalmolive.com",
  target: "target.com",
  gm: "gm.com",
  chipotle: "chipotle.com",
  marriott: "marriott.com",
  hilton: "hilton.com",
  delta: "delta.com",
  ford: "ford.com",
  ea: "ea.com",
  take2: "take2games.com",
  ebay: "ebay.com",
  united: "united.com",
  hershey: "thehersheycompany.com",
  kraft: "kraftheinzcompany.com",
  hp: "hp.com",
  pins: "pinterest.com",
  dell: "dell.com",
  swa: "southwest.com",
  lulu: "lululemon.com",
  dominos: "dominos.com",
  snap: "snap.com",
  dropbox: "dropbox.com",
  gme: "gamestop.com",
  reddit: "reddit.com",
  duo: "duolingo.com",
  hasbro: "hasbro.com",
  harley: "harley-davidson.com",
  planet: "planetfitness.com",
  etsy: "etsy.com",
  crocs: "crocs.com",
  mattel: "mattel.com",
  lyft: "lyft.com",
  aa: "aa.com",
  levis: "levi.com",
  wendys: "wendys.com",
  ua: "underarmour.com",
  peloton: "onepeloton.com",
  "6flags": "sixflags.com",
  shack: "shakeshack.com",
  yeti: "yeti.com",
  jetblue: "jetblue.com",
  "d&b": "daveandbusters.com",
  cheesecake: "thecheesecakefactory.com",
  amc: "amctheatres.com",
  bear: "buildabear.com",
  krispy: "krispykreme.com",
};

// Two sources: Google's favicon service first, icon.horse for whatever Google
// only has a placeholder for. Anything that fails both just plays as its
// brand-color disc, which the game treats as a first-class look.
const SOURCES = [
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
  (d) => `https://icon.horse/icon/${d}`,
];

let ok = 0, skipped = 0, failed = 0;
for (const [short, domain] of Object.entries(DOMAINS)) {
  const path = OUT + short + ".png";
  if (existsSync(path)) { skipped++; continue; }
  let done = false;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src(domain));
      if (!res.ok) throw new Error(`http ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 400) throw new Error(`tiny (${buf.length} bytes), likely a placeholder`);
      writeFileSync(path, buf);
      ok++;
      done = true;
      break;
    } catch {
      // try the next source
    }
  }
  if (!done) {
    console.log(`FAIL ${short} (${domain}) on all sources`);
    failed++;
  }
}
console.log(`baked ${ok}, skipped ${skipped}, failed ${failed}, total ${Object.keys(DOMAINS).length}`);
