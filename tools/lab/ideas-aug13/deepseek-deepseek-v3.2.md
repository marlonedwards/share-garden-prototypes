# Financial Literacy Game Suite Design

## A. Five Game Concepts

### 1. **Riverboat Merchant**
**Core loop (30 seconds):** Drag crates from your dock onto a continuously moving riverboat that appears every 5 seconds. Each crate shows $10, $100, or $1,000. You must load as many as possible before the boat leaves. The boat shows a destination flag—some pay 2x for specific crate types, some pay 0.5x. You can't see payment until the boat returns 20 seconds later. Meanwhile, you keep loading the next boat.

**Why fun:** Satisfying physical stacking/loading with time pressure. *Closest hit:* Overcooked's order fulfillment meets PlateUp's preparation rhythm.

**Lesson: Diversification.** Mechanics: Loading only one crate type risks boats paying poorly for that type. Loading mixed crates (even randomly) yields steadier returns as boats return. Players see variance smooth out over multiple boat cycles.

**Playing badly:** Loading only $1,000 crates onto every boat. Result: Some boats pay 2x ($2,000 per crate!), some pay 0.5x ($500). Erratic cash flow despite high effort. Mixed-load players earn less per big win but have consistent growth.

**Real-time element:** Continuous river flow, boats arrive/leave on timers, returns happen asynchronously.

**Competitive variant:** 2-3 CPU merchants loading same boats. Boat capacity limited—crates collide physically. CPUs follow clear patterns: one loads only high-value, one loads only matching flags, one loads random mix. Players see whose strategy pays over 5 minutes.

---

### 2. **Beeconomy**
**Core loop:** Tap flowers to assign bees from your hive. Each flower blooms over 30 seconds, paying $1 when complete. Bees stay assigned until recalled. Some flowers are "compounders"—when completed, they spawn 2 new flowers nearby. Others are "one-offs"—pay and vanish. Screen fills with 100+ flowers over time.

**Why fun:** Idle growth satisfaction with light strategy. *Closest hit:* Clicker Heroes meets flower-garden sims.

**Lesson: Compounding.** Mechanics: Early assignment to compounders creates exponential flower growth. Players who chase immediate $1 flowers soon run out of sources. The screen visually fills with flower descendants from early compounders.

**Playing badly:** Recalling bees constantly to chase highest immediate payout. Result: Screen remains sparse, income plateaus. Patient players see flower clusters explode, income accelerates even with same bee count.

**Real-time element:** Flowers bloom continuously, new flowers spawn in real-time.

**Competitive variant:** Shared meadow with CPU hives. Flowers have ownership colors. CPUs: one aggressively claims new flowers, one guards compounders, one steals others' near-complete flowers. Lesson: Defending compounders beats chasing quick cash.

---

### 3. **Bridge Loan**
**Core loop:** You operate a ferry between two islands. Each island has a physical cash pile ($1/$10/$100 bills). Drag cash from Island A to buy upgrade parts for your ferry. Drag cash from Island B to pay loan interest every 60 seconds. Your goal: build a permanent bridge to retire the ferry. Bridge pieces cost $1,000 each, paid from either island.

**Why fun:** Physics-based money transport with looming deadline. *Closest hit:* World of Goo's tower-building with money as physics objects.

**Lesson: Cash flow management.** Mechanics: Spending all cash from Island A leaves nothing for interest payments. Players must balance short-term upgrades (faster ferry) against debt servicing. Bridge progress halts if ferry repossessed for missed payments.

**Playing badly:** Ignoring interest to buy bridge pieces immediately. Result: Ferry speed decreases (no upgrades), eventually seized. Player stranded with unfinished bridge. Conservative players keep ferry running, compound upgrades, finish bridge faster.

**Real-time element:** Interest timer ticks continuously, ferry moves automatically.

**Competitive variant:** Two ferry operators sharing islands. Cash piles are common. First to build bridge wins. CPUs: one hoards island cash, one races bridge ignoring interest, one balances perfectly. Teaches that sustainable cash flow beats hoarding or recklessness.

---

### 4. **Panic Sell**
**Core loop:** You tend a garden of 16 slow-growing money trees. Each tree shows its value ($10-$1,000) and a "volatility" color (calm green to frantic red). News headlines scroll at top ("Frost Warning!", "Export Boom!"). Headlines affect random trees—some spike 5x, some drop to $1. You can sell any tree instantly by shaking it (mouse wiggle). Cash appears as physical bills.

**Why fun:** Tension between holding and cashing out. *Closest hit:* Reigns' binary choices meets tree-growing aesthetic.

**Lesson: "News is already priced in."** Mechanics: Headlines affect random trees, not correlated with color. Red trees jump/drop most dramatically but unpredictably. Players who sell on "bad news" often sell trees that would have spiked. Holding through volatility yields average gains.

**Playing badly:** Shaking every tree on negative headlines. Result: Constant transaction noise, missing big spikes, realizing losses. Calm players see net growth despite scary headlines.

**Real-time element:** Trees grow value continuously, headlines appear every 15 seconds.

**Competitive variant:** Shared garden with CPU tenders. Each player owns 4 trees, can buy/sell others' trees. CPUs: one panicsells on news, one holds forever, one buys others' panicked sales. Players see panickers lose money to calm buyers.

---

### 5. **Factory Floor**
**Core loop:** You run a widget factory. Drag $1 bills into machine slots to start production. Each machine takes 10-60 seconds, outputs $10 bill. You can reinvest output into more machines or take cash. Machines age—older ones break down, requiring $100 repairs. You start with 2 machines, can have up to 12.

**Why fun:** Engine-building with physical decay. *Closest hit:* Factorio Lite meets IKEA simulator assembly.

**Lesson: Depreciation and maintenance budgeting.** Mechanics: Neglecting repair fund causes cascade failures. Players who reinvest all profits hit capacity then collapse. Keeping a cash cushion for repairs ensures long-term growth.

**Playing badly:** Building maximum machines immediately. Result: Brief income spike, then simultaneous breakdowns, factory halts. Prudent players build slower, maintain repair fund, overtake reckless players by minute 5.

**Real-time element:** Machines run continuously, breakdowns happen in real-time.

**Competitive variant:** Two factories side-by-side. Shared resource market: buying machines increases price for both. CPUs: one expands aggressively, one maintains 50% cash buffer, one specializes in quick machines. Teaches that sustainable expansion beats max capacity.

---

## B. Five Rivalry Mechanics

### 1. **Monopoly's Property Scarcity Adaptation**
**Mechanics:** Players compete to buy "dividend tiles" on a shared board. Each tile pays $10/sec to owner. Limited tiles (16 total). When all tiles owned, any purchase must be from another player via blind bid: both players secretly bid percentage of their cash, higher bid buys tile at that price. Player can refuse sale by bidding 100%.

**Why fun:** Proven by Monopoly—scarcity creates negotiation tension without direct conflict.

**Lesson emerges:** Over-concentrating cash leaves nothing for bids, losing income streams. Diversified players can afford strategic purchases. Teaches liquidity value vs asset value.

### 2. **Mario Kart's Rubber Banding**
**Mechanics:** Players race to reach cash goal (e.g., $10,000). CPU opponents' income rate adjusts: last place gets small boost (found "$20 on sidewalk"), first place gets small drag ("tax audit"). Not enough to guarantee catch-up, just enough to keep race close.

**Why fun:** Proven by Mario Kart—close races are exciting, comebacks feel possible.

**Lesson emerges:** Frantic chasing (taking high-risk bets when behind) often backfires. Steady strategy beats panic moves. Teaches that frantic catch-up plays usually lose more.

### 3. **Poker's Pot Commitment**
**Mechanics:** Shared "market opportunity" pot appears every 60 seconds. Players commit cash secretly (0-100%). Pot pays 2x total to random player proportional to commitment. Example: $100 pot, Player A commits 30% ($30), Player B commits 70% ($70). Random pick: Player B wins $200.

**Why fun:** Proven by poker/all-in moments—shared pot brinkmanship creates drama.

**Lesson emerges:** Over-committing risks ruin. Under-committing misses growth. Teaches position sizing and risk management.

### 4. **Territory Control (Risk/Strategy games)**
**Mechanics:** Map with hexes. Each hex produces $1/sec for owner. Players expand by spending cash to claim adjacent hexes. CPU opponents expand following simple rules: one claims richest areas first, one claims defensively, one claims randomly.

**Why fun:** Proven by Risk, Carcassonne—territory control is intrinsically competitive.

**Lesson emerges:** Over-expansion leaves no cash for defense. Defensive players get surrounded. Teaches balance between growth and reserves.

### 5. **Asynchronous Leaderboards (Dark Souls messages)**
**Mechanics:** Players see ghost data from previous sessions (anonymous). "Player X bought this asset at $100, sold at $80." "Player Y held this for 5 minutes, gained $200." Not advice, just historical outcomes.

**Why fun:** Proven by Dark Souls bloodstains—learning from others' failures/successes feels collaborative yet competitive.

**Lesson emerges:** Players notice patterns: those who trade frequently lose to fees, those who panic sell lose money. Teaches market history through peer observation.

---

## C. Three Steals

### 1. **Steal from: Mini Metro**
**Mechanics:** Players draw lines between stations (in Mini Metro: passenger demand). Stations produce passengers needing specific lines.

**Transplant:** Stations are "income sources" ($1/$10/$100). Lines are "investment allocations." Players draw lines to connect sources to "growth nodes" that multiply value over time. Over-connecting one node causes congestion (value leaks). Under-connecting misses compounding.

**Teaching:** Asset allocation and over-concentration risks—emergent from topology constraints.

### 2. **Steal from: Keep Talking and Nobody Explodes**
**Mechanics:** One player sees bomb, another has manual. Must communicate to defuse.

**Transplant:** Two roles: "Investor" sees market data (charts, news). "Executor" sees order interface (buy/sell buttons). Neither sees both. Must collaborate to execute strategy. No manual—just constraints (e.g., "I see price dropping but don't know why").

**Teaching:** Information asymmetry in markets—acting on partial data requires acknowledging uncertainty.

### 3. **Steal from: Baba Is You**
**Mechanics:** Rules are physical blocks player can rearrange. "Wall Is Stop" becomes "Wall Is Push" by moving blocks.

**Transplant:** Financial rules as rearrangeable blocks: "Interest Compounds Monthly" block next to "Debt" block. Player can create "Debt Compounds Monthly" (disastrous) or "Interest Pays You" (beneficial). Experimentation reveals systemic consequences.

**Teaching:** Financial systems are rule-based—small changes create cascading effects.