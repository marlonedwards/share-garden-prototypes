// Takeover's whole simulation, UI-free so it can be driven headless. The page
// calls step() every frame with the cursor in world space; the engine moves
// everything, resolves meals, and reports flashes and the end of the round.
// Contract: docs/takeover-spec.md.
//
// Aug 17 difficulty pass (Marlon's playtest): the arena is smaller and alive.
// Companies run real agario AI: flee everything that can eat them, hunt what
// they can eat with an intercept lead, and eat each other, so the food chain
// runs without the player. Liabilities are no longer parked: they chase.

import {
  COMPANIES,
  MILESTONES,
  ROBLOX_CAP,
  type TakeoverCompany,
  fmtMoney,
} from "../../data/takeoverCompanies";

export interface Cell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
}

export interface CompanyBlob {
  id: number;
  c: TakeoverCompany;
  // A leveraged company is cheap to swallow and expensive to hold: eating it
  // hands you its debt, which drains you for a few seconds afterwards.
  levered: boolean;
  // Live value: starts at the real cap and grows when this company acquires
  // others mid-run. The catalog constant is never mutated.
  cap: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
}

export interface Deal {
  id: number;
  x: number;
  y: number;
  value: number;
}

export interface Flash {
  text: string;
  at: number;
}

export type HazardKind = "audit" | "lawsuit" | "debt";

export interface Hazard {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  r: number;
  label: string;
  // audit: fraction of worth taken. lawsuit: dollars taken. debt: unused.
  amount: number;
  speed: number; // chase speed, world units per second
}

export type RoundOver =
  | { kind: "won" }
  | { kind: "acquired"; by: TakeoverCompany }
  | { kind: "bankrupt"; by: string };

// The dozen biggest names in the catalog. A few of them are on the map at all
// times, however small the player is, because in agario you can always see the
// giants and they are the whole reason to climb. They are slow, so a small
// player outruns them easily; they are scenery, threat and goal at once.
const TITANS = [...COMPANIES].sort((a, b) => b.cap - a.cap).slice(0, 12);
const TITAN_COUNT = 4;
const TOP_CAP = TITANS[0].cap;

// Marlon's call, Aug 16: no splitting for now. The mechanic stays in the
// engine behind this flag so one line brings it back.
export const SPLIT_ENABLED = false;

// The tier below the smallest listed company: unnamed local businesses sized
// relative to the player, so the road from a lemonade stand to the first real
// logo is walkable inside one round. Generic categories only, never fake
// company names (spec law 4).
// The name reads inside a sentence ("Ate a food truck for $1.4M"); the disc
// label is the same words standing alone, so it gets a capital.
const LOCAL_LABELS = [
  "a lemonade stand",
  "a food truck",
  "a car wash",
  "a nail salon",
  "a pizza shop",
  "a diner",
  "a mini golf",
  "an arcade",
  "a gym",
  "a motel",
  "a car dealer",
  "a strip mall",
  "a local grocer",
  "a regional bank",
  "an office park",
];

const PLAYER_NAMES = [
  "Your lemonade stand",
  "Your dog walkers",
  "Your car wash",
  "Your pizza cart",
  "Your sticker shop",
  "Your mow crew",
  "Your bake stand",
];

export const START_VALUE = 2e6;
const SPLIT_MERGE_SECONDS = 6;
// Smaller world: trouble and giants are always close.
const VIEW = 1500;
const COMPANY_COUNT = 45;
const DEAL_COUNT = 26;
const HAZARD_COUNT = 8;
// Hazards only give chase inside this range; outside it they drift, so the
// pressure is local packs, never one converging death ball.
const HAZARD_WAKE = 900;
// Payroll: a company that stops selling shrinks. Worth drains at this rate a
// second, every second, so standing still is not a strategy and the pressure
// that the old countdown supplied now comes from the business itself.
export const BURN_PER_SEC = 0.008;
// A titan that wanders this far is recycled, so the giants stay in sight.
const TITAN_LEASH = 1200;

// Size is a log scale, and it has to be: the board spans six orders of
// magnitude, from a $2M lemonade stand to a $4T Apple. True area-proportional
// scaling would make Apple a thousand times the player's radius, which is a
// pixel next to a wall. So every 10x in worth adds the same ring of size, the
// step is wide enough that the gap between a billion and a trillion is
// obvious, and the exact multiples are told in words instead: the milestone
// flashes and the end card carry the real numbers.
export function radiusOf(value: number): number {
  return 26 + 25 * Math.log10(Math.max(value, 1e6) / 1e6);
}

function speedOf(value: number): number {
  return 230 * Math.pow(32 / radiusOf(value), 0.45);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TakeoverRun {
  rng: () => number;
  playerName: string;
  cells: Cell[];
  companies: CompanyBlob[] = [];
  deals: Deal[] = [];
  hazards: Hazard[] = [];
  debtUntil = 0; // elapsed seconds until an attached debt stops draining
  private immuneUntil = 0;
  eaten: Array<{ c: TakeoverCompany; value: number }> = [];
  ateLocals = 0;
  // A ledger, so the end card can show where the money actually came from and
  // where it went. START_VALUE + every gain - every cost === finalWorth.
  gainedCompanies = 0;
  gainedLocals = 0;
  gainedDeals = 0;
  lostToCosts = 0;
  flashes: Flash[] = [];
  over: RoundOver | null = null;
  finalWorth = START_VALUE;
  elapsed = 0;
  splitUntil = 0; // elapsed seconds when halves may re-merge; 0 = not split
  private nextId = 1;
  private lastFlashAt = -9;
  private milestoneIdx = 0;
  private robloxStep = 0; // 0 -> 1x, 1 -> 3x, 2 -> 10x

  constructor(seed?: number, playerName?: string) {
    const day = new Date();
    const daySeed =
      seed ?? day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate();
    this.rng = mulberry32(daySeed ^ 0x9e3779b9);
    this.playerName =
      playerName?.trim() || PLAYER_NAMES[Math.floor(this.rng() * PLAYER_NAMES.length)];
    this.cells = [{ x: 0, y: 0, vx: 0, vy: 0, value: START_VALUE }];
    this.milestoneIdx = 0;
    for (let i = 0; i < TITAN_COUNT; i++) this.spawnCompany(true, true);
    for (let i = this.companies.length; i < COMPANY_COUNT; i++) this.spawnCompany(true);
    for (let i = 0; i < DEAL_COUNT; i++) this.spawnDeal(true);
    for (let i = 0; i < HAZARD_COUNT; i++) this.spawnHazard(true);
  }

  get worth(): number {
    return this.cells.reduce((s, c) => s + c.value, 0);
  }

  private centroid(): { x: number; y: number } {
    const n = this.cells.length;
    return {
      x: this.cells.reduce((s, c) => s + c.x, 0) / n,
      y: this.cells.reduce((s, c) => s + c.y, 0) / n,
    };
  }

  // Companies spawn tiered around the player's worth so a few meals and a few
  // predators are always in reach. everywhere=true scatters across the whole
  // arena for round start; otherwise spawns land on the outer ring. titan=true
  // forces one of the giants, which spawn nearer so they are actually on
  // screen rather than looming somewhere off the edge of the world.
  private spawnCompany(everywhere = false, titan = false) {
    const w = this.worth;
    const taken = (c: TakeoverCompany) => this.companies.some((b) => b.c.name === c.name);

    if (titan) {
      const free = TITANS.filter((c) => !taken(c));
      if (free.length) {
        const pick = free[Math.floor(this.rng() * free.length)];
        const p = this.centroid();
        const ang = this.rng() * Math.PI * 2;
        const dist = 430 + this.rng() * 470;
        this.companies.push({
          id: this.nextId++,
          c: pick,
          cap: pick.cap,
          levered: false,
          x: p.x + Math.cos(ang) * dist,
          y: p.y + Math.sin(ang) * dist,
          vx: 0,
          vy: 0,
          heading: this.rng() * Math.PI * 2,
        });
        return;
      }
    }

    const pool = COMPANIES.filter((c) => c.cap > w / 30 && c.cap < w * 60 && !taken(c));
    // Below the listed market, and as filler while the player is small, the
    // arena runs on unnamed local businesses sized relative to the player.
    const wantLocal = !pool.length || (w < 2e9 && this.rng() < 0.6);
    let pick: TakeoverCompany;
    if (wantLocal) {
      const label = LOCAL_LABELS[Math.floor(this.rng() * LOCAL_LABELS.length)];
      // Locals are always prey, never predators: they top out well under the
      // player's worth so the only thing that can ever acquire you is real.
      const value = Math.max(1e5, Math.min(5e8, w * (0.18 + this.rng() * 0.72)));
      const tones = ["#2B3648", "#33404F", "#3A3347", "#2C4038", "#403A2E", "#31414E"];
      const bare = label.replace(/^an? /, "");
      pick = {
        name: label,
        short: bare[0].toUpperCase() + bare.slice(1),
        color: tones[Math.floor(this.rng() * tones.length)],
        cap: value,
        local: true,
      };
    } else {
      // A small company lives in a market that is mostly bigger than it, so
      // early on the board leans edible on purpose. Otherwise the opening is
      // nothing but running away, and payroll eats you while you run.
      const edible = pool.filter((c) => c.cap < w);
      const scary = pool.filter((c) => c.cap >= w);
      const edibleShare = w < 1e9 ? 0.7 : 0.5;
      pick =
        edible.length && (this.rng() < edibleShare || !scary.length)
          ? edible[Math.floor(this.rng() * edible.length)]
          : scary[Math.floor(this.rng() * scary.length)];
    }
    const p = this.centroid();
    const ang = this.rng() * Math.PI * 2;
    const dist = everywhere ? 250 + this.rng() * (VIEW - 400) : 800 + this.rng() * (VIEW - 800);
    this.companies.push({
      id: this.nextId++,
      c: pick,
      cap: pick.cap,
      // a quarter of the listed market is carrying debt
      levered: !pick.local && this.rng() < 0.25,
      x: p.x + Math.cos(ang) * dist,
      y: p.y + Math.sin(ang) * dist,
      vx: 0,
      vy: 0,
      heading: this.rng() * Math.PI * 2,
    });
  }

  private spawnDeal(everywhere = false) {
    const p = this.centroid();
    const ang = this.rng() * Math.PI * 2;
    const dist = everywhere ? 120 + this.rng() * 700 : 600 + this.rng() * 500;
    this.deals.push({
      id: this.nextId++,
      x: p.x + Math.cos(ang) * dist,
      y: p.y + Math.sin(ang) * dist,
      value: this.worth * (0.04 + this.rng() * 0.05),
    });
  }

  // Red trouble: audits, lawsuits, debt collectors. They chase when awake.
  private spawnHazard(everywhere = false) {
    const w = this.worth;
    const kinds: HazardKind[] = ["audit", "audit", "lawsuit", "lawsuit", "debt", "debt"];
    const kind = kinds[Math.floor(this.rng() * kinds.length)];
    const p = this.centroid();
    const ang = this.rng() * Math.PI * 2;
    const dist = everywhere ? 650 + this.rng() * (VIEW - 650) : 700 + this.rng() * (VIEW - 700);
    let label = "";
    let amount = 0;
    let speed = 0;
    if (kind === "audit") {
      amount = 0.14 + this.rng() * 0.16;
      label = `IRS audit -${Math.round(amount * 100)}%`;
      speed = 55;
    } else if (kind === "lawsuit") {
      amount = w * (0.15 + this.rng() * 0.2);
      label = `Lawsuit -${fmtMoney(amount)}`;
      speed = 85;
    } else {
      label = "Debt collector";
      speed = 115;
    }
    this.hazards.push({
      id: this.nextId++,
      kind,
      x: p.x + Math.cos(ang) * dist,
      y: p.y + Math.sin(ang) * dist,
      r: 42 + this.rng() * 12,
      label,
      amount,
      speed,
    });
  }

  private flash(text: string) {
    if (this.elapsed - this.lastFlashAt < 2) return;
    this.lastFlashAt = this.elapsed;
    this.flashes.push({ text, at: this.elapsed });
    if (this.flashes.length > 4) this.flashes.shift();
  }

  private checkMilestones() {
    const w = this.worth;
    while (this.milestoneIdx < MILESTONES.length && w > MILESTONES[this.milestoneIdx].cap) {
      this.flash(`Bigger than ${MILESTONES[this.milestoneIdx].name}`);
      this.milestoneIdx++;
    }
    const robloxAt = [1, 3, 10];
    if (this.robloxStep < robloxAt.length && w >= ROBLOX_CAP * robloxAt[this.robloxStep]) {
      const n = robloxAt[this.robloxStep];
      this.flash(n === 1 ? "As big as Roblox" : `${n} times the size of Roblox`);
      this.robloxStep++;
    }
  }

  split(towardX: number, towardY: number) {
    if (!SPLIT_ENABLED) return;
    if (this.over || this.cells.length !== 1) return;
    const c = this.cells[0];
    if (c.value < START_VALUE * 2) return;
    const ang = Math.atan2(towardY - c.y, towardX - c.x);
    const half = c.value / 2;
    const launch = speedOf(half) * 3.4;
    this.cells = [
      { x: c.x, y: c.y, vx: c.vx, vy: c.vy, value: half },
      {
        x: c.x + Math.cos(ang) * radiusOf(half) * 0.8,
        y: c.y + Math.sin(ang) * radiusOf(half) * 0.8,
        vx: Math.cos(ang) * launch,
        vy: Math.sin(ang) * launch,
        value: half,
      },
    ];
    this.splitUntil = this.elapsed + SPLIT_MERGE_SECONDS;
  }

  step(dt: number, cursorX: number, cursorY: number) {
    if (this.over) return;
    this.elapsed += dt;
    // No clock. A run ends when the market takes you or when you outgrow the
    // largest company on the board and own the whole thing.
    if (this.worth > TOP_CAP) {
      this.finalWorth = this.worth;
      this.over = { kind: "won" };
      return;
    }

    // Player cells chase the cursor; the launched half also carries impulse.
    for (const cell of this.cells) {
      const dx = cursorX - cell.x;
      const dy = cursorY - cell.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = speedOf(cell.value) * 1.25 * Math.min(1, d / 60);
      cell.vx = cell.vx * Math.pow(0.02, dt) + (dx / d) * sp * (1 - Math.pow(0.02, dt));
      cell.vy = cell.vy * Math.pow(0.02, dt) + (dy / d) * sp * (1 - Math.pow(0.02, dt));
      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt;
    }

    // Merge halves: after the timer they drift together and fuse on touch.
    if (this.cells.length === 2) {
      const [a, b] = this.cells;
      if (this.elapsed >= this.splitUntil) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = 140 * dt;
        b.x += (dx / d) * pull;
        b.y += (dy / d) * pull;
        if (d < radiusOf(a.value) + radiusOf(b.value) - 8) {
          this.cells = [
            { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: a.vx, vy: a.vy, value: a.value + b.value },
          ];
          this.splitUntil = 0;
        }
      } else {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const min = radiusOf(a.value) + radiusOf(b.value) - 6;
        if (d < min) {
          const push = ((min - d) / 2) * 0.9;
          a.x += (dx / d) * push;
          a.y += (dy / d) * push;
          b.x -= (dx / d) * push;
          b.y -= (dy / d) * push;
        }
      }
    }

    const w = this.worth;
    const p = this.centroid();
    const playerCell = this.cells[0];

    // Company AI, the agario way. Each blob weighs three drives:
    //   1. flee everything nearby that can eat it (vector sum of threats),
    //   2. else hunt the nearest thing it can eat, leading the target,
    //   3. else wander.
    for (const blob of this.companies) {
      const mySpeed = speedOf(blob.cap);
      let ax = 0;
      let ay = 0;
      let fleeing = false;

      // Threats: the player, and bigger companies.
      const consider = (tx: number, ty: number, tcap: number) => {
        const dx = blob.x - tx;
        const dy = blob.y - ty;
        const d = Math.hypot(dx, dy);
        const range = 340 + radiusOf(tcap);
        if (tcap > blob.cap * 1.25 && d < range && d > 0.001) {
          const push = (range - d) / range;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          fleeing = true;
        }
      };
      for (const cell of this.cells) consider(cell.x, cell.y, cell.value);
      for (const other of this.companies) {
        if (other !== blob) consider(other.x, other.y, other.cap);
      }

      let sp: number;
      let ang: number;
      if (fleeing) {
        ang = Math.atan2(ay, ax);
        sp = mySpeed * 0.62;
      } else {
        // Hunt: nearest edible company, or the player if the player is food.
        // A company only chases what is worth chasing: prey it can swallow,
        // but not prey so far beneath it that the chase means nothing. Without
        // the floor, a titan beelines a two million dollar player from across
        // the map and the run is over before it starts.
        let prey: { x: number; y: number; vx: number; vy: number } | null = null;
        let preyDist = 480 + radiusOf(blob.cap);
        const worthChasing = (cap: number) => cap <= blob.cap * 0.75 && cap > blob.cap * 0.06;
        for (const other of this.companies) {
          if (other === blob || !worthChasing(other.cap)) continue;
          const d = Math.hypot(other.x - blob.x, other.y - blob.y);
          if (d < preyDist) {
            preyDist = d;
            prey = other;
          }
        }
        if (playerCell && !blob.c.local && worthChasing(w)) {
          const d = Math.hypot(playerCell.x - blob.x, playerCell.y - blob.y);
          if (d < preyDist + 140) {
            preyDist = d;
            prey = playerCell;
          }
        }
        if (prey) {
          // Lead the shot: aim where the prey will be, not where it is.
          const t = Math.min(preyDist / Math.max(mySpeed, 1), 1.2);
          const aimX = prey.x + prey.vx * t;
          const aimY = prey.y + prey.vy * t;
          ang = Math.atan2(aimY - blob.y, aimX - blob.x);
          sp = mySpeed * 0.9;
        } else {
          blob.heading += (this.rng() - 0.5) * 1.6 * dt;
          ang = blob.heading;
          sp = mySpeed * 0.5;
        }
      }
      blob.vx = Math.cos(ang) * sp;
      blob.vy = Math.sin(ang) * sp;
      blob.x += blob.vx * dt;
      blob.y += blob.vy * dt;
    }

    // Companies eat each other: the food chain runs without the player.
    // Locals never eat; they are scenery and prey, or a local that swallowed
    // its neighbors would outgrow the player and "a mini golf" could acquire
    // you, which is both unfair and terrible fiction.
    for (const eater of this.companies) {
      if (eater.c.local) continue;
      for (const meal of [...this.companies]) {
        if (eater === meal || eater.cap <= meal.cap) continue;
        const d = Math.hypot(eater.x - meal.x, eater.y - meal.y);
        if (d < radiusOf(eater.cap) - radiusOf(meal.cap) * 0.35) {
          eater.cap += meal.cap;
          this.companies.splice(this.companies.indexOf(meal), 1);
          if (!eater.c.local && !meal.c.local) {
            this.flash(`${eater.c.name} acquired ${meal.c.name}`);
          }
        }
      }
    }

    // Meals and deaths for the player.
    for (const blob of [...this.companies]) {
      for (const cell of [...this.cells]) {
        const d = Math.hypot(cell.x - blob.x, cell.y - blob.y);
        const cellR = radiusOf(cell.value);
        const blobR = radiusOf(blob.cap);
        if (cell.value > blob.cap && d < cellR - blobR * 0.35) {
          cell.value += blob.cap;
          if (blob.c.local) {
            this.ateLocals++;
            this.gainedLocals += blob.cap;
          } else {
            this.eaten.push({ c: blob.c, value: blob.cap });
            this.gainedCompanies += blob.cap;
          }
          this.companies.splice(this.companies.indexOf(blob), 1);
          if (blob.levered) {
            this.debtUntil = this.elapsed + 5;
            this.flash(`${blob.c.name} came with debt`);
          } else {
            this.flash(`Ate ${blob.c.name} for ${fmtMoney(blob.cap)}`);
          }
          break;
        }
        if (blob.cap > cell.value && !blob.c.local && d < blobR - cellR * 0.35) {
          const idx = this.cells.indexOf(cell);
          if (idx >= 0) this.cells.splice(idx, 1);
          if (this.cells.length === 0) {
            this.finalWorth = w;
            this.over = { kind: "acquired", by: blob.c };
            return;
          }
          this.splitUntil = 0;
        }
      }
    }

    for (const deal of [...this.deals]) {
      for (const cell of this.cells) {
        const d = Math.hypot(cell.x - deal.x, cell.y - deal.y);
        if (d < radiusOf(cell.value)) {
          cell.value += deal.value;
          this.gainedDeals += deal.value;
          this.deals.splice(this.deals.indexOf(deal), 1);
          break;
        }
      }
    }

    // Payroll comes out first, every second, whatever else is happening.
    if (this.elapsed > 3) {
      const before = this.worth;
      const k = Math.pow(1 - BURN_PER_SEC, dt);
      for (const cell of this.cells) cell.value *= k;
      this.lostToCosts += before - this.worth;
      if (this.worth < START_VALUE * 0.25) {
        this.finalWorth = this.worth;
        this.over = { kind: "bankrupt", by: "payroll" };
        return;
      }
    }

    // Attached debt drains about 3 percent a second while it lasts.
    if (this.elapsed < this.debtUntil) {
      const beforeDebt = this.worth;
      const k = Math.pow(0.97, dt);
      for (const cell of this.cells) cell.value *= k;
      this.lostToCosts += beforeDebt - this.worth;
      if (this.worth < START_VALUE * 0.25) {
        this.finalWorth = this.worth;
        this.over = { kind: "bankrupt", by: "debt" };
        return;
      }
    }

    // Red trouble moves: awake hazards chase the nearest player cell, asleep
    // ones drift. Consumed on touch, short immunity, bankruptcy below half
    // the starting worth.
    for (const hz of [...this.hazards]) {
      const target = this.cells.reduce(
        (best, cell) => {
          const d = Math.hypot(cell.x - hz.x, cell.y - hz.y);
          return d < best.d ? { d, cell } : best;
        },
        { d: Infinity, cell: null as Cell | null },
      );
      // Three seconds of grace at round start: the red drifts but does not
      // hunt yet, so spawning is never a death sentence.
      if (target.cell && target.d < HAZARD_WAKE && this.elapsed > 3) {
        const dx = target.cell.x - hz.x;
        const dy = target.cell.y - hz.y;
        const d = target.d || 1;
        hz.x += (dx / d) * hz.speed * dt;
        hz.y += (dy / d) * hz.speed * dt;
      } else {
        hz.x += Math.cos(hz.id) * 18 * dt;
        hz.y += Math.sin(hz.id) * 18 * dt;
      }

      const stale =
        Math.hypot(hz.x - p.x, hz.y - p.y) > VIEW * 1.6 ||
        (hz.kind === "lawsuit" && hz.amount < w * 0.02);
      if (stale) {
        this.hazards.splice(this.hazards.indexOf(hz), 1);
        continue;
      }
      if (this.elapsed < this.immuneUntil) continue;
      const hit = this.cells.some(
        (cell) => Math.hypot(cell.x - hz.x, cell.y - hz.y) < radiusOf(cell.value) + hz.r * 0.5,
      );
      if (!hit) continue;
      this.hazards.splice(this.hazards.indexOf(hz), 1);
      this.immuneUntil = this.elapsed + 1.5;
      const beforeHit = this.worth;
      if (hz.kind === "audit") {
        const k = 1 - hz.amount;
        for (const cell of this.cells) cell.value *= k;
        this.lostToCosts += beforeHit - this.worth;
        this.flash(`IRS audit took ${fmtMoney(beforeHit - this.worth)}`);
      } else if (hz.kind === "lawsuit") {
        const share = Math.min(hz.amount, w) / this.cells.length;
        for (const cell of this.cells) cell.value = Math.max(cell.value - share, 1e4);
        this.lostToCosts += beforeHit - this.worth;
        this.flash(`Lawsuit cost you ${fmtMoney(beforeHit - this.worth)}`);
      } else {
        this.debtUntil = this.elapsed + 6;
        this.flash("Debt collector latched on");
      }
      if (this.worth < START_VALUE * 0.25) {
        this.finalWorth = this.worth;
        this.over = {
          kind: "bankrupt",
          by: hz.kind === "audit" ? "the IRS" : hz.kind === "lawsuit" ? "a lawsuit" : "debt",
        };
        return;
      }
    }

    // Trouble keeps its distance from trouble. Every hazard chases the player
    // at its own fixed speed, so without this they converge on the same point
    // and stack into one unreadable pile of rings and doubled labels.
    for (let i = 0; i < this.hazards.length; i++) {
      for (let j = i + 1; j < this.hazards.length; j++) {
        const a = this.hazards[i];
        const b = this.hazards[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + 26;
        if (d < min) {
          const push = (min - d) / 2;
          a.x += (dx / d) * push;
          a.y += (dy / d) * push;
          b.x -= (dx / d) * push;
          b.y -= (dy / d) * push;
        }
      }
    }

    while (this.hazards.length < HAZARD_COUNT) this.spawnHazard();

    // Companies that cannot eat each other still cannot occupy the same spot.
    for (let i = 0; i < this.companies.length; i++) {
      for (let j = i + 1; j < this.companies.length; j++) {
        const a = this.companies[i];
        const b = this.companies[j];
        const ra = radiusOf(a.cap);
        const rb = radiusOf(b.cap);
        // a real mismatch resolves by one eating the other, so only separate
        // the pairs that are close enough in size to be stuck together
        if (a.cap > b.cap * 1.15 || b.cap > a.cap * 1.15) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = ra + rb;
        if (d < min) {
          const push = (min - d) / 2;
          a.x += (dx / d) * push;
          a.y += (dy / d) * push;
          b.x -= (dx / d) * push;
          b.y -= (dy / d) * push;
        }
      }
    }

    // Population upkeep: cull the far and the irrelevant, refill the ring, and
    // keep a few giants on the board at all times.
    this.companies = this.companies.filter((b) => {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      const isTitan = TITANS.some((t) => t.name === b.c.name);
      if (isTitan) return d < TITAN_LEASH;
      return d < VIEW * 1.6 && b.cap > w / 45;
    });
    let titansOn = this.companies.filter((b) => TITANS.some((t) => t.name === b.c.name)).length;
    while (titansOn < TITAN_COUNT && this.companies.length < COMPANY_COUNT + TITAN_COUNT) {
      const before = this.companies.length;
      this.spawnCompany(false, true);
      if (this.companies.length === before) break; // every titan is eaten
      titansOn++;
    }
    while (this.companies.length < COMPANY_COUNT) this.spawnCompany();
    this.deals = this.deals.filter(
      (dl) => Math.hypot(dl.x - p.x, dl.y - p.y) < VIEW * 1.2 && dl.value > w * 0.004,
    );
    while (this.deals.length < DEAL_COUNT) this.spawnDeal();

    this.checkMilestones();
  }
}
