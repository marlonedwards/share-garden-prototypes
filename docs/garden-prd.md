# Share Garden, restarted: product requirements

Drafted August 25, 2026, after the first target-audience playtest
(Marlon's sister, 14, logged in docs/testing-feedback.md) picked the
original Share Garden over every concept built since. This document
restarts the garden from first principles, keeping what she liked and
repairing the flaws that earned the original its C+ on the concept
report card. Status: draft for Marlon, then for Jared and Nick with the
playtest data, since Jared set the garden aside on August 6 and this
restart asks to reopen that call on evidence.

## 1. The core model, answered first

**How do you represent a bunch of stocks in a portfolio?**
Your plot. Each bed grows one crop, and a crop species is a company.
One plant is one share: countable, never resizing its meaning. A glance
at the plot shows what you own and how it is split, which is the
portfolio question answered without a chart.

**How do you show stocks changing over time?**
The weather does it, never you. Sun, rain, frost, and blight arrive
from the sky and land differently on each species; plants visibly
flourish, wilt, and sometimes die. Under the hood every species tracks
a real historical price series, so a crop's fortunes are a real
company's fortunes wearing leaves. THE PLAYER NEVER TENDS. No watering,
no fertilizer, no care mechanic of any kind: you own the crop, you do
not operate the company. This is the one-line fix for the original
garden's worst flaw, growth that read as a reward for your effort.

**How do you buy and sell?**
Seeds in, harvest out. The seed shop sells packets at the going rate
(buying shares), the market stall buys any crop at the posted price at
any time (the always-there buyer), and cash is fixed units in your
pocket. The stall's posted prices move with the same series driving the
weather, so selling into a storm visibly fetches storm prices.

Acceptance for this section: the design must pass Jared's foolproof
test at a glance: one stock (one bed), many stocks (a mixed plot),
growth (flourishing), decline (wilting), diversification (species
variety), crash (blight takes a species). And it must grade A on all
three report-card categories in design review before anything is built.

## 2. The concepts to be surfaced

Surfaced through play and the season summary, never through captions or
tutorials (Nick's rule). In disclosure order:

1. **Ownership.** A seed is a share: you own what happens to it, you do
   not make it happen.
2. **Diversification.** Blight strikes one species at a time. A
   monoculture plot dies whole; a mixed plot loses a bed and stands.
   The strongest image this project has found, and it lives here.
3. **Holding through weather.** Storms pass. Panic-selling mid-storm
   fetches the stall's worst prices; the season summary shows what the
   held bed recovered to.
4. **Chasing.** The crop that boomed last season costs the most to
   plant this season. Buying it late and high is priced honestly.
5. **Risk and reward.** Hardy species grow slowly and survive most
   weather; exotic species grow fast and die easily. The choice is
   visible in the seed shop before a coin is spent.
6. **Crashes are real.** Some years a species dies for good, because
   the company behind it did. The reveal names it.
7. **The reveal.** Each season's end names the real era and companies
   the weather was: "that blight was 2008, your oaks were Lehman."
   Realness arrives as a payoff, not a premise.

Parked for later, not in scope until Marlon reopens them: funds (a
co-op mixed bundle), income crops (dividends), bonds.

## 3. Requirements

**The loop (Jared's second critique, answered).**
- A round is a season with a beginning, decision beats, and a summary.
- Time advances on its own but PAUSES at decision moments: season
  open (planting), weather events landing, season close (harvest and
  summary). The sister's finding is binding: pauses are where strategy
  lives, raw speed reads as random clicking.
- Progression: seasons chain into years, harsher climates and new
  regions unlock, plot grows. Difficulty is weather severity and
  species mix, never speed.
- A run is finishable in one sitting; a session of several runs shows
  visible progression.

**Goals are emotional, not dollar targets.**
- Season goals are garden things: survive winter with the plot alive,
  fill the greenhouse, take a crop to the fair. Worth in dollars stays
  visible and honest, but the stated goal is never "reach $X". The
  sister's finding is binding: money targets carry no feeling.

**Social is visual.**
- The end-of-season garden is a picture worth showing: a shareable
  snapshot, and later, friends' gardens viewable side by side. Seeing
  how friends are doing means seeing their gardens, not a number
  leaderboard.

**Data and honesty.**
- Real baked era series drive every species (the tape engine as is).
- The unit law holds: a plant is one share, prices are posted at the
  stall, cash is fixed units. Plants may grow and wilt because real
  plants do; no abstract unit ever inflates.
- Weather is the visible cause of every price move; nothing moves
  without something on screen having happened.

**Look, feel, sound.**
- Cozy garden warmth on the site's one typeface (docs/clean-type.md
  binds; the old Fraunces display face does not return).
- Tally's craft bar for buttons, sound, and touch feel: it is the one
  design the audience praised without prompting.
- Mobile first-class from the first mock.

**Education stance.**
- Less informational than Tally: no lesson cards, no glossary. The
  summary says what happened in garden words with dollar figures, three
  lines at most, computed from the season's log (the bullets engine
  already built and tested this week carries over).

## 4. Deliberately different from the garden Jared saw

1. No tending. Growth was effort-shaped; now it is market-shaped.
2. A real loop: seasons, goals, difficulty, progression. The original
   had none, which was Jared's core critique of that era's work.
3. Decision beats instead of idle watching.
4. Emotional goals instead of dollar targets.
5. Real-era data underneath with a named reveal, so the garden is a
   costume over true history, not a toy economy.
6. The social axis exists from the start, as pictures of gardens.

## 5. Validation before build

1. Marlon approves this document.
2. Jared and Nick see it WITH the sister's playtest data and the
   concept report card; the garden reopens on evidence or not at all.
3. Moneythink Club (5 to 10 high schoolers, upcoming): garden mock
   versus the live games, the explicit question being which one they
   reach for twice. Their answer outranks internal taste, both ways.
4. Only then: mocks in the established order, sim before stage.

## 6. Non-goals

- No live tape speed anywhere in v1.
- No chart as the center of any screen.
- No monkey, no piggy: if a guide exists it is silent scenery until
  playtests ask for a voice.
- No real-time multiplayer; social is asynchronous pictures.
- No dividends, funds, or bonds in v1.
- No new engine: src/lib/tape/ as is.
