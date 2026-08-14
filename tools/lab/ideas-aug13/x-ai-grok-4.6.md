## A. Five game concepts

### 1. Wad
**Genre skeleton:** top-down sticky-ball physics (2D Katamari / Agar).

**Core loop (30 seconds):** A messy desk is littered with labeled chips: `$1`, `$10`, `$100`, `$1,000`. You steer a sticky wad whose face value is printed on it (`$7`). You roll through `$1`s and they slap on, the label ticking `$8`, `$9`. A `$10` only sticks if you are ≥ `$10`; a `$100` ignores you and you bounce. While you move, lint motes spawn on the felt at a rate equal to `floor(value / 10)` per second and only stick if they touch you — a `$40` wad vacuums lint four times as fast as a `$10` wad. A desk fan on the left periodically gusts.

**Why it is fun:** The itch is the size-gate pop of finally being big enough to eat the thing that has been shoving you around. Closest hit: *Katamari Damacy* (pickup thresholds) plus *Agar.io* (soft-body steering).

**ONE lesson — compounding.** It emerges because growth rate is a function of current size (lint spawn + what you are allowed to stick). A wad that stays a wad keeps accelerating; a wad that shatters restarts the curve. No text, no APR label, just a number that climbs faster when it is already high.

**Play badly:** Chase a `$100` at `$40`, bounce, slide into the fan. The wad splits into several `$1`–`$5` crumbs. Lint now barely appears. You spend the rest of the minute herding crumbs while a leftover `$1,000` brick sits there like furniture.

**Real-time:** Felt lint emits continuously. The fan cycles on a visible ribbon. A vacuum nose (session clock) crawls in from the right and eats anything it touches.

**Competitive variant:** Two scripted CPU wads on the same desk. Big chips are scarce. CPU **Hungry** always steers at the largest chip it can currently eat. CPU **Greedy** always steers at the largest chip on the desk, bouncing forever. You can steal lint off their surface by rolling along them if you are bigger.

---

### 2. Paddocks
**Genre skeleton:** real-time herding / spatial placement (Pikmin + Islanders).

**Core loop (30 seconds):** Six fenced paddocks, each a color, each with a grass height that slowly grows (payout per animal per second, paid as physical `$1`/`$10` chips that spit out at the gate). You lasso-drag sheep between gates. On the horizon a storm disk is always visible: it has a color and a shrinking ring (about eight seconds). When the ring hits zero the matching paddock’s grass goes to dirt and every sheep inside scatters as `$0` bones. Sheep in the other five paddocks keep chewing. You can shove sheep through gates the whole time.

**Why it is fun:** The itch is last-second gate traffic, the same “get the yellow Pikmin out of the fire” panic. Closest hit: *Pikmin* (squads you leave working, whistle them off a hazard you can already see).

**ONE lesson — diversification.** The tallest grass (highest yield) is always one color. A storm of that color is not a maybe; it is on a visible timer. The only way a full wipe happens is if you parked the whole herd on the juicy color. Split across four colors and a storm is a haircut you can watch and reroute.

**Play badly:** All twenty sheep in the green paddock because it is paying `$10` chips instead of `$1`s. Green ring hits zero. Twenty bones. The other paddocks stand there empty and still growing.

**Real-time:** Grass height and chip spit are continuous. Storm rings never pause. Sheep have inertia; a jammed gate is a real traffic jam.

**Competitive variant:** Two CPU shepherds. Unowned sheep in the middle lane are scarce. CPU **Landlord** sits on the current tallest grass until the storm color matches, then dumps late. CPU **Scatter** keeps roughly even counts and never contests you. You can block a gate with your body.

---

### 3. Bobber
**Genre skeleton:** single-line fishing as visible push-your-luck (not a market forecast).

**Core loop (30 seconds):** Click the water: a bobber lands, a fat dollar number appears over it at `$1`, and two meters fill in opposite directions — **weight** (the cash you will take if you reel) and **fray** (line wear). Weight doubles on a visible clock (`$1 → $2 → $4 → $8`…) while fray creeps. Reel whenever you want: the current number becomes physical bills in your tray and the line comes in. Recast costs a fixed two-second empty animation with `$0` on screen. If fray fills, the line pops, splash, `$0`, same two-second recast. Fray rate is drawn on the line as a thinning thread; there is no hidden roll.

**Why it is fun:** The itch is holding a doubling number with a thread you can see going translucent. Closest hit: *Stardew Valley* fishing tension plus *Incan Gold* / push-your-luck “leave now or bust,” with the bust meter honest and on-screen.

**ONE lesson — patience versus churn.** Session score is the bills in your tray at the buzzer. Recast animation is dead time with the number forced to `$0`. Players who take three `$128` fish beat players who bank twenty `$2` nibble-recasts, and both can watch each other’s bobbers. The mechanic is the lesson: resetting the curve is expensive.

**Play badly:** Tap-recast on every `$1` (a pile of singles, no time left). Or stare past a nearly invisible thread and pop a `$256` to zero. Both are allowed. The tray just looks sad next to a still bobber.

**Real-time:** Weight and fray tick continuously. The lake does not wait while you menu; there is no menu.

**Competitive variant:** Two CPU bobbers in adjacent chairs, same doubling table. CPU **Flick** recasts under `$4` every time. CPU **Hold** reels at 80% fray and never sooner. Their trays are physical stacks you can see without a scoreboard lecture.

---

### 4. Till
**Genre skeleton:** real-time cashier physics / incoming bricks (Papers Please + Diner Dash, no recipes).

**Core loop (30 seconds):** A drawer holds visible bills: `$1`, `$10`, `$100`, `$1,000`. Every few seconds a **paycheck** drops more mixed bills into the drawer. From the left, red bricks slide on a rail: `RENT $100`, `POWER $10`, `STOCK $10`. When a brick hits the register it slams; if it is unpaid, that much cash is ripped from the drawer as flying bills (shortfall becomes a stamped **TAB** brick that leaves and will come back larger). You drag bills onto a brick to pay it. Overpay stays as change in the drawer — but only in the denominations you actually dragged. Meanwhile a customer slaps a `$100` on the counter and waits for `$90` back; if you cannot make change they walk, and the next paycheck is visibly thinner.

**Why it is fun:** The itch is a speed-sorting puzzle with objects that have real sizes: you are always hunting a `$10` that you already spent. Closest hit: *Papers Please* (documents arriving on a clock you do not control) plus making change under pressure.

**ONE lesson — budgeting and cash flow.** Income and obligations are both physical objects on timers. Liquidity is not a word; it is “I have `$400` in `$100`s and a `$10` brick I cannot touch.” Survival is matching the rhythm of inflows to outflows, not a high score of cash at a random instant.

**Play badly:** Pay rent with a `$1,000` because it was on top; drawer is now all whales; customers leave; paychecks shrink; you stamp TAB on everything; the return bricks arrive as `$130`, `$170`, stacked, and the rail becomes a train. Or hoard and refuse to pay until slams empty the drawer in one rip. The game never blocks the TAB stamp.

**Real-time:** Rails never turn-take. Paychecks drop on a clock. TAB bricks have a visible return fuse.

**Competitive variant:** Two CPU clerks, one shared customer line and a limited float of small bills in a center tray you can both snatch (scarcity). CPU **Exact** always makes change correctly and never TABs. CPU **Tabby** stamps TAB on every brick and later drowns. You can steal the last `$10` they needed.

---

### 5. Ridge
**Genre skeleton:** auto-forward side-view ski on a heightmap (Alto’s Adventure).

**Core loop (30 seconds):** The ground’s Y position is a real historical index series (a random real 20–40 year slice, real numbers only, compressed so a session is ~8–12 minutes; the 30-second window is just skiing). Your altitude is printed as `$` on a fat y-axis (`$1`, `$10`, `$100`… painted on posts). You ski automatically. Up-slope rallies, cliffs are drawdowns. Hold a key to **LOCK**: you drop onto a dotted cash terrace at your current altitude and walk slowly while the mountain keeps scrolling. Unlocking is allowed only when the mountain is again ≥ your terrace (you throw a rope and climb back on). Billboard props spawn *behind* terrain events with real dated headlines after the cliff or ridge already happened.

**Why it is fun:** The itch is the rollercoaster line and the stomach drop of a cliff you can see the lip of. Closest hit: *Alto’s Adventure* / *Ski Safari*, with a y-axis that happens to be a real chart.

**ONE lesson — market history.** Different slices feel different in the body: a 1982–1999 ridge is a long climb; 1929 and 2008 are cliffs; 1966–1982 is a choppy mesa where walkers on terraces stay walkers. The player is not guessing the next tick (fog hides only a short nose, not enough to “call a top”). They are living the shape of a real path. Headlines arriving late are scenery, not a trading signal.

**Play badly:** LOCK on every red slope. You walk a flat dotted line while the recovery ridge rises three screen-heights above you; rope stays gray until price reprints your terrace. Or LOCK after a billboard that appeared at the *bottom* of a cliff — the terrace is already the bottom. Staying on skis through a cliff is allowed and not designer-punished; the y-axis just falls, then (in most long real slices) climbs.

**Real-time:** The series scrolls at a constant compressed rate. No turns, no candles to click.

**Competitive variant:** Three named-only-by-behavior ghosts on the same slice. **Nervous** LOCKs on any negative slope. **Tourist** LOCKs when a billboard spawns. **Ride** never LOCKs. Their terrace lines stay drawn so you watch Nervous hike the 1970s flats while Ride is a speck on the next ridge.

---

## B. Five rivalry mechanics

### 1. One fat chip (scarcity race)
**How it works:** On a shared board (Wad desk, Paddocks lane, Till center tray) there is exactly one `$1,000` chip at a time. Scripted CPUs path to it with different greed. Touching it claims it. Next `$1,000` spawns on a visible cooldown in a new spot.

**Why it is fun:** *Monopoly* property scarcity and *Agar.io* / *Pac-Man* pellet denial — the pleasure of taking the thing the other body wanted, and the slapstick of two people bouncing off a prize neither can yet lift.

**Lesson from the competition:** Fighting the field for a single outsized piece leaves the rest of the board to whoever did not come. Concentration is what a race for the whale looks like from above.

### 2. Ghost line
**How it works:** After run one, a translucent recording of a CPU policy (or your last run) plays in lockstep. Same spawn seed. No interaction, just a second wad / skier / bobber doing its rule. End stacks sit side by side.

**Why it is fun:** *Mario Kart* time-trial ghosts, *Race the Sun*, *Super Meat Boy* replays — beating a line you can see is a cleaner itch than beating a speech.

**Lesson from the competition:** A ghost that recast or LOCKed less is simply farther along the same curve. Patience is a placement, not a lecture.

### 3. Belt draft
**How it works:** A conveyor holds mixed labeled tiles: colors (asset types) and denominations. You and two CPUs may each grab one tile at a time. Hands have a short cooldown. Tiles fall off the end into a shredder. Scoring is whatever the host game already uses (set yield, merge size, etc.). CPU **Mirror** grabs whatever color you last grabbed. CPU **Rare** grabs the scarcest color still on the belt.

**Why it is fun:** *Sushi Go Round* (belt grabbing) plus *7 Wonders* drafting — twitch claim plus “they took my piece.”

**Lesson from the competition:** You will not get a mono-color set if anyone else wants it. What you actually hold is the leftover mix. The player who wrestles Mirror for green drops two greens while the uncontested colors sit in their tray printing `$1`s.

### 4. Shared pot, visible crack (brinkmanship)
**How it works:** A bowl in the middle accumulates `$1` chips every second (a shared yield). Any player may **YANK** their current equal split into their tray. Yanking starts a one-second window where others may yank too. A crack meter on the bowl fills with time and with each yank; at full the remaining chips shatter to `$0`. The meter is always visible. CPUs: **Chicken** yanks at 40% crack, **House** yanks at 85%, **Sleepy** never yanks first.

**Why it is fun:** *Incan Gold* / *Can't Stop* chicken, *Mario Party* happening spaces, *Sea of Thieves* stacked loot you might lose on the way out.

**Lesson from the competition:** Leaving money in a shared, rising, breakable pot is greed with an on-screen fuse. Yanking early is small-but-yours. The rivalry is the fuse; nobody needed a caption.

### 5. Fanfare tax (the sticker is already new)
**How it works:** Shop aisles have price stickers that flip on their own (real series or a random walk; the player cannot move them). A crier CPU occasionally starts a trumpet and runs toward an aisle. The sticker on that aisle flips the frame the trumpet *starts*, before he arrives. Shopper CPUs sprint after the trumpet and buy at the *new* sticker. Other stickers continue flipping with no trumpet. Buying is just walking to an aisle and picking up the object at whatever number is on it now.

**Why it is fun:** *Mario Party* everyone-runs-to-the-star, plus the slapstick of a pied piper. The trumpet is a toy even when you ignore it.

**Lesson from the competition:** The crowd is a late indicator. By the time the fun noise exists, the number has already changed; racing the crier is paying the printed price plus congestion. Quiet aisles were marked at the same honesty. “The news is already priced in” is the trumpet-versus-sticker timing, not a tooltip.

---

## C. Three steals

### 1. Katamari Damacy (PS2)
**Mechanic that teaches:** Object mass is a gate. You cannot pick up the cow until you are cow-sized; failed charges bounce you and often shed mass. Players internalize “bigger eats faster and reaches a new class of objects” without a lecture on exponential thresholds.

**Transplant:** Wad (above) is the direct steal: denominations are the cows. Extra concrete rule for a money game — shed crumbs are still legal tender other wads can steal, so a bounce is not cosmetic; it is a transfer of principal off your compounding base.

### 2. Mini Metro
**Mechanic that teaches:** Stations do not fail because you “played wrong”; they fail because a line’s capacity is below arrivals. Passengers are a flow. Players learn queueing and bottlenecking by watching a car skip a stuffed station.

**Transplant:** In Till, replace abstract “you’re broke” with Mini Metro’s queue art: paycheck stations spawn bill-people, expense stations spawn brick-people, and your drawer slots are the trains. A slot that only holds `$100`s cannot board a `$10` brick. Overflow is a visible platform crush, then a TAB car you already allowed onto the line.

### 3. Into the Breach
**Mechanic that teaches:** Enemy attack telegraphs are painted on the floor *before* damage. The skill is answering a board that has already committed, not predicting a hidden roll. Players stop arguing with RNG and start moving off the red square.

**Transplant:** Any price-bearing game (Ridge billboards, Fanfare tax, a shop): paint the *next already-decided* price change on the object the way Breach paints a claw — the sticker’s future number is visible a beat early, then it becomes the present number, *then* the headline prop spawns. The player who moves after the headline is moving after the red square has already fired. No points for guessing a hidden tick; the tick was on the floor.