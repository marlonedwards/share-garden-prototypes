# Takeover: build contract

Status: approved for build, August 16. Marlon's design, refined across the
wave-9 interview: "agario but you start as a small business and every circle
is a logo and you have to try to absorb companies that are smaller until you
get big enough to split and absorb the ones you want." Kid-judge verdict on
the family: passed 5 of 5 pitches; this is the champion, one build first.

## August 17 revision (Marlon's playtest notes, all shipped)

1. Real logos, baked: tools/bake_logos.mjs downloads one logo per company
   (Google favicon service, icon.horse fallback) into public/logos/<short>.png.
   Real companies render the logo clipped into the bubble with a soft sphere
   shade and a name-plus-value caption under the disc; misses and locals stay
   brand-color discs, treated as a first-class look.
2. Red hazards, stationary: audits ("irs audit -30%", a percentage cut),
   lawsuits ("lawsuit -$1.2B", fixed dollars sized to worth at spawn),
   and debt (latches on, drains about 3 percent a second for 6 seconds,
   drawn as a dashed red ring on the player). Hazards are consumed on touch,
   respawn elsewhere, carry a 1.5 second immunity after a hit, and go stale
   when irrelevant. Bankruptcy: any hit or drain that leaves the player
   below HALF the $2M start ends the run ("bankrupted by the irs"); the
   half-start mercy exists so one early audit is survivable.
3. Splitting is OFF for now (Marlon: "idk if we should allow splitting").
   The mechanic stays in the engine behind SPLIT_ENABLED = false.
4. Naming: a start card asks "name your company" (one input, remembered in
   localStorage "takeover-name"); the arena and HUD carry the typed name.

## August 18 revision (Marlon's playtest, all shipped)

1. No clock. The countdown is gone and with it the "you went public" ending.
   A run now ends three ways: acquired by a bigger company, bankrupt, or you
   outgrow the largest company on the board and own the market. The HUD's
   right side counts companies eaten instead of seconds left.
2. Payroll. Worth drains 0.8 percent a second, every second, after a three
   second grace. Standing still is now fatal on its own (about 40 seconds),
   which is where the pressure the clock used to supply comes from. The HUD
   states it in dollars: "Payroll $17K a second".
3. Leveraged acquisitions. A quarter of listed companies carry debt, drawn
   with a dashed red ring. Eating one adds its full value and attaches its
   debt, which drains 3 percent a second for five seconds. Big cheap meal,
   painful morning after.
4. The giants are always there. Four of the twelve largest companies are on
   the board at all times, spawned 430 to 900 units out and kept on a 1200
   unit leash so they cannot wander off and leave the market feeling small.
   Apple at $4T looms over a $2M player from the first second.
5. Nothing hunts what it would not notice. A company chases prey between 6
   and 75 percent of its own size, so a titan ignores a two million dollar
   player instead of beelining it. Being eaten by a giant is now a mistake
   you make, not something that happens to you.
6. Trouble no longer stacks. Hazards push each other apart every frame, and
   companies too close in size to eat each other do the same. Before this,
   every debt collector converged on the player and piled into one unreadable
   heap of rings and doubled labels.
7. Balance after all of the above: 8 hazards rather than 12, audits take 14
   to 30 percent, lawsuits 15 to 35 percent of worth at spawn, bankruptcy at
   a quarter of the starting worth, 26 deals on the board, and while you are
   under a billion 70 percent of listed spawns are edible.

## 1. The game in one paragraph

Agar.io, but every circle is a real company. You start as a small business
worth almost nothing and steer with the mouse. Eat any company smaller than
you and its real market value joins yours; touch one bigger and you are
acquired, run over. Click to split into two halves and lunge at prey you
could not catch whole, then re-merge. Milestones flash as you cross real
company sizes. Survive the round and you go public; the end card says what
you were worth, who you ate, and who you died beneath. Learning what
companies are actually worth is a side effect; it is never announced.

## 2. Laws (inherited, binding)

1. Fun first, no tutorial: the first round is learnable by steering.
2. No metaphors: companies are companies, dollars are dollars, real names.
3. Readable in one look; anything needing explanation is redesigned.
4. Honest data: market caps are real mid-2026 values, rounded. The data
   file states its as-of date. Generic food pellets are "deals", never
   fake companies.
5. Freedom to fail: dying is fast, funny, and instantly retryable.
6. Copy: no em dashes, no emoji, no jargon a kid would not know. Voice is
   lowercase arcade calm, sibling of the guess-the-stock terminal.

## 3. Screen and skin

- Route /takeover, page src/pages/Takeover.tsx. Desktop-first, dark page,
  same palette family as Guess the Stock: page #0C0F14, arena #090C10,
  grid dots #1B2330, body text #D7DEE8, bright #E8EDF4, amber accent
  #E8B84B, monospace stack "SF Mono", ui-monospace, Menlo, Consolas.
- Full-viewport canvas arena with a soft dot grid. Camera follows the
  player, zooms out slowly as the player grows.
- Company circles: flat brand-ish fill color, company short name centered
  in white or dark (contrast-picked), value beneath in small type
  ("$48B"). No logo images; the colored disc plus the name is the logo.
- Player circle: white ring, your business name inside ("your lemonade co"
  seeded daily), current worth beneath.
- HUD, top of screen: worth counter left (animates on every meal), round
  timer right (90). Milestone flashes centered, one line, one second.
- Death and IPO end cards are a centered panel over a dimmed arena.

## 4. Rules

- Round: 90 seconds. Survive to the buzzer and you IPO (win screen).
  Touching a company worth more than you ends the round: ACQUIRED.
- Start: $2M, "your lemonade co" (daily seeded name from a small list).
- Eating: overlap a company worth less than you and it dissolves in; its
  full cap adds to your worth. Its name chip stamps into the run log.
- Deals (food): small dotted circles worth 2 to 5 percent of your current
  worth, framed as "deal +$120K". They respawn; they are the early game.
- Movement: circle follows the cursor. Speed falls slowly with size; the
  biggest companies barely move. Prey under half your size drifts away
  from you when close; predators over twice your size drift toward you.
- Split: click (or space) splits you into two halves, the lead half
  launched toward the cursor. Either half eats normally. Halves auto
  re-merge after 6 seconds or on touch. While split, anything bigger than
  a single half can eat that half; losing a half halves your worth and
  the survivor plays on. This is the skill move and the risk.
- Milestones: crossing a famous company's cap flashes "bigger than crocs".
  Occasional scale flashes use the suite's favorite unit: "that is 3
  robloxes". Never more than one flash per two seconds.
- Arena population: about 60 companies live at once, drawn from the
  catalog tiered around the player's current worth (always a few edible,
  a few dangerous on screen). Eaten companies respawn far away after a
  while; the catalog is the world, not a level list.
- Daily seed: date-seeded RNG for arena layout, player name, and spawn
  order, so runs are comparable day to day. Every retry within a day
  reshuffles freely (this is an arcade, not a once-a-day puzzle).

## 5. End cards

- ACQUIRED: "acquired by walmart" headline, your final worth, seconds
  survived, companies eaten as a chip row, biggest meal called out, and
  the ladder line: "you died bigger than netflix". Retry button.
- IPO (buzzer): "you went public" headline, final worth, eaten chip row,
  biggest meal, and the ranking line: "bigger than 412 of the S&P 500".
- Both cards carry one quiet share line of plain text the player can
  copy: "takeover: $48B in 90s. ate 23 companies. died under Disney."

## 6. Data

- src/data/takeoverCompanies.ts: roughly 120 real companies chosen for
  name recognition, spread evenly in log-space from about $1B to $3.5T.
  Row: name, short label (fits the disc), brand color, market cap in
  dollars, rounded. Header comment states the as-of date and the
  rounding rule. Written from knowledge, no network, same policy as
  companyCatalog.ts.
- Radius is a function of the log of value, tuned so a 10x value gap
  reads clearly but Apple still fits on screen zoomed out.

## 7. Verify

- tools/takeovercheck.mjs Playwright walk: load /takeover, assert the
  arena canvas paints, steer via synthetic mouse moves, force one eat and
  assert the worth counter rose, force a split and assert two player
  circles exist, end a round both ways via a debug hook (?fast=1 shortens
  the round to 8s), screenshot the arena and both end cards to
  tools/shots/.
- npm run typecheck and vite build must pass. No em dashes in any string.
