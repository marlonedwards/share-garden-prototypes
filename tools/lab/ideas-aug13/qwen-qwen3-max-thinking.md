# Financial Literacy Browser Games Suite

## A. Five Game Concepts

### 1. **Coin Cascade**
- **Core Loop (30s)**: Player clicks to drop coins of $1, $10, or $100 into a vertical tower with branching paths. Each path has multipliers (1.05x, 1.10x) that compound as coins fall through successive levels. Player watches their coin stack grow or shrink in real-time as it tumbles down, then decides whether to cash out the total or reinvest it into another drop.
- **Why It’s Fun**: Satisfies the itch of watching exponential growth unfold visually—like *Cookie Clicker* meets *Plinko*. The hypnotic cascade and compounding visual feedback loop are intrinsically rewarding.
- **Financial Lesson**: **Compounding** emerges from the mechanic where each multiplier level applies multiplicatively to the current value (not additively). A $100 coin passing through four 1.10x gates becomes $146.41—not $140.
- **Playing Badly**: Player drops only $1 coins or cashes out too early after one multiplier. They see tiny stacks while others (CPU or past runs) grow tall with layered coins.
- **Real-Time Element**: Coins fall continuously at fixed speed; player can drop new coins anytime while previous ones are still cascading.
- **Competitive Variant**: Two towers side-by-side. CPU opponent auto-drops coins on a fixed schedule. Players race to hit a target stack height first—but rushing leads to shallow multipliers, while patience yields taller stacks.

---

### 2. **Market Garden**
- **Core Loop (30s)**: Player drags seed packets labeled “Tech,” “Energy,” “Food” onto a grid of soil plots. Each plot grows a plant whose height represents value. Weather events (drought = Energy up, rain = Food up) sweep across the garden every 20 seconds. Player harvests plots by clicking to collect cash, then replants.
- **Why It’s Fun**: Scratch the itch of spatial optimization and reactive adaptation—closest to *Stardew Valley*’s crop cycles but distilled to 90 seconds. Visual volatility is calming yet engaging.
- **Financial Lesson**: **Diversification** emerges because monocultures get wiped out by adverse weather (e.g., all Tech plots shrink during “regulation storm”), while mixed gardens always have some thriving plants.
- **Playing Badly**: Player plants only one crop type. When bad weather hits, their entire garden shrivels; they watch neighbors’ (CPU) mixed plots stay green.
- **Real-Time Element**: Weather moves continuously across the screen; plants grow/shrink in real-time based on current conditions.
- **Competitive Variant**: Shared weather system affects both player and CPU gardens. CPU auto-plants diversified crops. Player sees their barren plot next to CPU’s lush mix after a storm—and feels the sting without being told why.

---

### 3. **Debt Ladder**
- **Core Loop (30s)**: Player climbs a vertical ladder made of rungs labeled with interest rates (5%, 10%, 20%). At the bottom, they take a loan (e.g., $1,000 at 20%) to buy a “tool” that generates $1/sec. They can repay part of the loan anytime by clicking “pay,” which shortens the debt meter. If debt > cash, they slide down a rung (higher rate).
- **Why It’s Fun**: Taps into the tension of risk/reward escalation—like *QWOP* meets *Loan Ranger*. The physical climb/descent is viscerally satisfying.
- **Financial Lesson**: **Debt** emerges from the mechanic where high-interest loans accelerate repayment pressure: the debt meter grows faster than income unless you overpay early.
- **Playing Badly**: Player takes max loan at 20% to buy biggest tool. Debt outpaces income; meter fills rapidly, forcing them to slide down to 30% rate. They see their tool idle while drowning in red bars.
- **Real-Time Element**: Interest accrues continuously; income ticks every second; player acts asynchronously.
- **Competitive Variant**: Two ladders side-by-side. CPU takes modest 5% loan. Player sees CPU steadily climbing while they’re stuck repaying. No direct interaction—just silent comparison.

---

### 4. **Cash Flow River**
- **Core Loop (30s)**: Player places income rocks ($50/mo job, $200/mo side gig) and expense boulders (rent $800, coffee $50) into a flowing river. Water level = cash balance. If water dips below zero, the river dries up (game over). Player drags rocks/boulders in/out to keep flow steady.
- **Why It’s Fun**: Scratch the itch of dynamic balancing—closest to *Tetris*’ spatial pressure but with economic stakes. The river’s ebb/flow is meditative yet urgent.
- **Financial Lesson**: **Budgeting/cash flow** emerges because irregular income (freelance rock appears randomly) must cover fixed expenses. Players learn to buffer with “emergency fund” rocks.
- **Playing Badly**: Player adds luxury boulders (car payment $400) without extra income rocks. River level plummets during freelance droughts; screen fades to cracked earth.
- **Real-Time Element**: River flows continuously; income/expense events trigger at real-time intervals (e.g., rent due every 60s).
- **Competitive Variant**: Two rivers share a drought event (freelance dry spell). CPU has emergency fund rock; player doesn’t. Both rivers drop, but only player’s dries up—teaching buffer necessity through contrast.

---

### 5. **Ticker Tape Race**
- **Core Loop (30s)**: Player watches a horizontal ticker tape scroll left with real historical S&P 500 daily closes (1928–present, compressed to 1 min/day). They click “invest” to place a token on the tape. Token value updates in real-time as tape scrolls. They can “sell” anytime to lock gains/losses.
- **Why It’s Fun**: Captures the itch of pattern recognition under uncertainty—like *Flappy Bird*’s timing pressure but with market data. The tape’s relentless scroll creates urgency.
- **Financial Lesson**: **“The news is already priced in”** emerges because reacting to big headlines (e.g., 1929 crash) *after* they appear on tape guarantees buying high/selling low. Only holding through noise yields long-term growth.
- **Playing Badly**: Player buys during bull runs (tape steep up), sells in panics (steep down). Their token value oscillates wildly while buy-and-hold tokens (CPU) climb steadily.
- **Real-Time Element**: Tape scrolls continuously at fixed speed; player acts asynchronously.
- **Competitive Variant**: CPU holds one token from start to finish. Player’s active trading vs. CPU’s passive hold is displayed side-by-side. After 10 years of tape, CPU’s token is taller—no words needed.

---

## B. Five Rivalry Mechanics

### 1. **Shared Resource Auction**
- **How It Works**: Players bid real cash (from their game balance) on limited assets (e.g., one “dividend stock” per round). Highest bidder gets it; all bids are deducted. CPU opponents use simple scripts (e.g., bid 10% of balance).
- **Why It’s Fun**: Proven by *Power Grid*—auction tension forces strategic valuation under scarcity.
- **Financial Lesson**: **Risk vs. reward** emerges because overbidding depletes cash needed for emergencies, while underbidding misses yield. Players learn asset value ≠ sticker price.

### 2. **Rubber-Band Debt Relief**
- **How It Works**: If a player falls behind CPU in net worth, they get access to lower-rate loans. If ahead, loan rates spike. Rates adjust continuously based on real-time gap.
- **Why It’s Fun**: Like *Mario Kart*’s blue shell—keeps races close without artificial handicaps.
- **Financial Lesson**: **Debt as a trap** emerges because chasing the leader via cheap loans often backfires when rates reset upward post-borrowing.

### 3. **Ghost Portfolio Racing**
- **How It Works**: Player’s past best run is saved as a “ghost” portfolio that replays alongside current attempts. CPU ghosts use optimal strategies (e.g., diversified, patient).
- **Why It’s Fun**: Proven by *Mario Kart* time trials—silent competition against idealized self.
- **Financial Lesson**: **Patience vs. churn** emerges as ghost’s steady line outperforms player’s jagged, overtraded path.

### 4. **Brinkmanship Insurance Pool**
- **How It Works**: Players contribute to a shared “disaster fund.” If market crashes, those who contributed get bailed out. CPU contributes 5% automatically. Player chooses contribution %.
- **Why It’s Fun**: Like *Diplomacy*’s trust mechanics—creates tension between freeloading and collective safety.
- **Financial Lesson**: **Systemic risk** emerges when player skips contributions, survives one crash (feeling clever), then gets wiped in the next when pool is empty.

### 5. **Territory-Based Yield Zones**
- **How It Works**: Map divided into zones (Tech, Bonds, etc.). Owning >50% of a zone gives +2% yield. CPU opponents claim zones aggressively. Player must choose: diversify (low yield) or concentrate (high yield but vulnerable).
- **Why It’s Fun**: Proven by *Risk*—territory control creates meaningful trade-offs.
- **Financial Lesson**: **Concentration risk** emerges when player dominates Tech zone, then a “regulation event” nukes that zone’s value—wiping their lead.

---

## C. Three Steals

### 1. **Steal From: *Mini Metro* (Path Optimization)**
- **Teaching Mechanic**: Players draw subway lines to connect stations; efficiency emerges from minimizing track length while maximizing throughput.
- **Transplant**: **Cash Flow Conduits**—player draws pipes between income sources (jobs) and expense sinks (bills). Leaks occur if pipe capacity < flow rate. Teaches budgeting via hydraulic intuition: too narrow = overflow (debt), too wide = wasted resources.

### 2. **Steal From: *Into the Breach* (Predictive Spatial Puzzle)**
- **Teaching Mechanic**: Enemies’ next moves are shown before player acts; success requires planning around known futures.
- **Transplant**: **Debt Forecast Grid**—player sees next 3 expense due dates (rent, loan, tax) as colored tiles advancing toward “now” column. They allocate cash reserves to intercept them. Teaches liquidity planning: if two red tiles collide, bankruptcy unless buffered.

### 3. **Steal From: *Slay the Spire* (Deck-Building Trade-Offs)**
- **Teaching Mechanic**: Choosing cards involves sacrificing short-term power for long-term synergy (e.g., taking “strike” now vs. “energy” for future combos).
- **Transplant**: **Portfolio Draft**—player picks one of three random assets each “round” (e.g., $100 cash, 5% bond, volatile stock). Assets interact: bonds stabilize stock swings. Teaches diversification via combinatorial payoff—monoculture decks crash during event cards.