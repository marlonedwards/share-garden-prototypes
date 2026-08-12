// The piggy bank, drawn a pixel at a time.
//
// The pixel language in this game belongs to the blocks, and the piggy is the
// one character allowed to speak it. It is a hand built sprite on a twenty four
// by twenty four grid: every cell is a rect on a whole number coordinate,
// rendered with crispEdges, so it scales to any size without a blur and without
// an image file. Nothing here is generated and nothing here is fetched.
//
// The grid is written as text, one string per row, one character per cell,
// because a sprite you can read in the source is a sprite you can fix. A pose is
// the base grid with a short list of patches laid over it: an arm out to the
// left, an arm raised, both arms up with a coin over the slot, or the eyes
// squeezed shut. The body itself never moves between poses, so the piggy is
// recognisably the same animal in all five.
//
// It idles with a small bob and it hops when it celebrates, and both stop dead
// under prefers-reduced-motion, where the sprite is simply itself.

const PALETTE: Record<string, string> = {
  O: "#5E2B3D", // the outline, a deep warm plum
  P: "#F9A8C0", // the body
  D: "#E4859E", // the body in shade, and the hooves
  L: "#FFD4E3", // the light along the top of the body
  S: "#FDC6D6", // the snout
  E: "#472334", // the eye
  W: "#FFFFFF", // the glint in the eye
  B: "#F07C9E", // the blush
  K: "#4A2130", // the coin slot
  G: "#F7C14B", // a coin
  g: "#D2951A", // a coin in shade
};

// The piggy, at rest. Two ears, a coin slot cut into the top of its back, a
// snout with two nostrils, four legs, and a face that is mostly eyes.
const BASE: string[] = [
  "........................",
  "........................",
  ".....OO..........OO.....",
  "....OLLO........OLLO....",
  "...OLLLLO......OLLLLO...",
  "...OPPPPOOOOOOOOPPPPO...",
  "....OLLPPPPPPPPPPPPO....",
  "...OLLPPPPKKKKKPPPPPO...",
  "..OLLPPPPPPPPPPPPPPDDO..",
  "..OLPPPPPPPPPPPPPPPDDO..",
  "..OPPPPWEPPPPPPWEPPDDO..",
  "..OPPPPEEPPPPPPEEPPDDO..",
  "..OPPPPPPPPPPPPPPPPDDO..",
  "..OPBBPPPPOOOOPPPBBDDO..",
  "..OPPPPPPOSSSSOPPPPDDO..",
  "..OPPPPPOSOSSOSOPPPDDO..",
  "..OPPPPPOSSSSSSOPPPDDO..",
  "..OPPPPPPOOOOOOPPPPDDO..",
  "...OPPPPPPPPPPPPPPDDO...",
  "....OPPPPPPPPPPPPDDO....",
  ".....OPPPOOOOOOPPPO.....",
  ".....OPPPO....OPPPO.....",
  ".....ODDDO....ODDDO.....",
  ".....OOOOO....OOOOO.....",
];

// The five the tutorial was specified with, plus the one it turned out to need:
// a beat that points at the money row has to point downward, because the money
// row is at the bottom of the board and the piggy stands above it.
export type PiggyPose = "idle" | "left" | "up" | "down" | "celebrate" | "wince";

interface Patch {
  y: number;
  x: number;
  s: string;
}

// A trotter held out to the left, with the hoof at the end of it.
const ARM_LEFT: Patch[] = [
  { y: 12, x: 1, s: "OOO" },
  { y: 13, x: 0, s: "ODPP" },
  { y: 14, x: 0, s: "ODPP" },
  { y: 15, x: 1, s: "OOO" },
];

// The same trotter raised, running up the side of the head, open at the bottom
// where it joins the body so it reads as a limb and not as a handle.
const ARM_UP: Patch[] = [
  { y: 6, x: 1, s: "O" },
  { y: 7, x: 0, s: "ODO" },
  { y: 8, x: 0, s: "OPO" },
  { y: 9, x: 0, s: "OPO" },
  { y: 10, x: 0, s: "OPP" },
  { y: 11, x: 0, s: "OPP" },
  { y: 12, x: 0, s: "OOP" },
];

// And the same trotter held down and out, for the one thing on the board that
// sits under the piggy rather than over it.
const ARM_DOWN: Patch[] = [
  { y: 15, x: 0, s: "OPP" },
  { y: 16, x: 0, s: "OPP" },
  { y: 17, x: 0, s: "OPO" },
  { y: 18, x: 0, s: "OPO" },
  { y: 19, x: 0, s: "ODO" },
  { y: 20, x: 1, s: "O" },
];

// The other one, on the other side, for the two armed cheer.
const ARM_UP_RIGHT: Patch[] = [
  { y: 6, x: 22, s: "O" },
  { y: 7, x: 21, s: "ODO" },
  { y: 8, x: 21, s: "OPO" },
  { y: 9, x: 21, s: "OPO" },
  { y: 10, x: 21, s: "PPO" },
  { y: 11, x: 21, s: "PPO" },
  { y: 12, x: 21, s: "POO" },
];

// Eyes that have turned up at the corners, and eyes squeezed shut.
const EYES_HAPPY: Patch[] = [
  { y: 10, x: 6, s: "PEP" },
  { y: 11, x: 6, s: "EPE" },
  { y: 10, x: 14, s: "PEP" },
  { y: 11, x: 14, s: "EPE" },
];

const EYES_SHUT: Patch[] = [
  { y: 10, x: 6, s: "EPE" },
  { y: 11, x: 6, s: "PEP" },
  { y: 10, x: 14, s: "EPE" },
  { y: 11, x: 14, s: "PEP" },
];

// A coin, over the slot it is about to go into.
const COIN: Patch[] = [
  { y: 0, x: 11, s: "OOO" },
  { y: 1, x: 10, s: "OGGGO" },
  { y: 2, x: 10, s: "OGgGO" },
  { y: 3, x: 10, s: "OGGGO" },
  { y: 4, x: 11, s: "OOO" },
  // the slot, opened a shade wider under a coin that is on its way in
  { y: 7, x: 9, s: "KKKKKKK" },
];

const POSES: Record<PiggyPose, Patch[]> = {
  idle: [],
  left: ARM_LEFT,
  up: ARM_UP,
  down: ARM_DOWN,
  celebrate: [...ARM_UP, ...ARM_UP_RIGHT, ...EYES_HAPPY, ...COIN],
  wince: EYES_SHUT,
};

const SIZE = 24;

function gridFor(pose: PiggyPose): string[][] {
  const cells = BASE.map((row) => row.split(""));
  for (const patch of POSES[pose]) {
    const row = cells[patch.y];
    if (!row) continue;
    for (let i = 0; i < patch.s.length; i++) {
      const x = patch.x + i;
      if (x < 0 || x >= SIZE) continue;
      row[x] = patch.s[i];
    }
  }
  return cells;
}

// One rect per run of identical cells along a row, which is what keeps a
// twenty four by twenty four sprite at a couple of hundred nodes rather than
// five hundred and seventy six.
function rectsFor(cells: string[][]): JSX.Element[] {
  const out: JSX.Element[] = [];
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !PALETTE[ch]) { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      out.push(
        <rect key={`${y}.${x}`} x={x} y={y} width={run} height={1} fill={PALETTE[ch]} />,
      );
      x += run;
    }
  }
  return out;
}

const ANIM_ID = "tally-piggy-anims";

export function ensurePiggyAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(ANIM_ID)) return;
  const el = document.createElement("style");
  el.id = ANIM_ID;
  // The bob is stated as a percentage of the sprite's own height, so one
  // keyframe serves the piggy at every size it is ever drawn at.
  el.textContent = `
@keyframes tally-piggy-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3.5%); }
}
@keyframes tally-piggy-hop {
  0%   { transform: translateY(0) scaleY(1); }
  18%  { transform: translateY(4%) scaleY(0.94); }
  46%  { transform: translateY(-14%) scaleY(1.04); }
  74%  { transform: translateY(0) scaleY(0.97); }
  100% { transform: translateY(0) scaleY(1); }
}
.tally-piggy { display: block; }
@media (prefers-reduced-motion: reduce) {
  .tally-piggy { animation: none !important; }
}`;
  document.head.appendChild(el);
}

export interface PiggyProps {
  pose?: PiggyPose;
  // the drawn size in pixels, square, and always a whole number of cells is
  // preferable but never required
  size?: number;
  // a still piggy, for anywhere the motion would be noise
  still?: boolean;
  title?: string;
}

export default function Piggy({ pose = "idle", size = 96, still = false, title }: PiggyProps) {
  ensurePiggyAnims();
  const cells = gridFor(pose);
  const anim = still
    ? undefined
    : pose === "celebrate"
      ? "tally-piggy-hop 900ms cubic-bezier(.2,.8,.3,1) infinite"
      : "tally-piggy-bob 2600ms ease-in-out infinite";
  return (
    <svg
      className="tally-piggy"
      data-piggy={pose}
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      shapeRendering="crispEdges"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flex: "none", animation: anim, transformOrigin: "50% 100%", overflow: "visible" }}
    >
      {rectsFor(cells)}
    </svg>
  );
}
