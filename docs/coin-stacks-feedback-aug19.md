# Jared's coin-stack direction (Aug 18-19, 2026)

Context: Guess the Stock, Takeover, and Worth More were all rejected. Jared then
sent three AI-generated interface images and, the next morning, three rules that
turn them into an actual specification.

Reference images live in `docs/reference/coin-stacks/`:

| File | What it shows |
| --- | --- |
| `jared-01-portfolio-8-stocks.png` | "StackMarket" desk scene, 8 branded coin stacks, price/percent tags floating above each, detail panel with Buy/Sell, daily news feed, bottom nav, level/XP/streak |
| `jared-02-portfolio-alt.png` | Same idea, invented tickers (SPCE, GMRZ, YUMM, ENRG...), category icons on medallions, cash balance and Buy/Sell/Market Events bar, market mood |
| `jared-03-portfolio-50-100.png` | Two panes: a ~12-stack sunset skyline view, and a 68-holding grid where stacks become a dense field |

## What he wrote

**First message (with the images):**
> I spent a few minutes with ChatGPT and asked it to create an interface for a
> fun and engaging stock trading game where stocks are represented as 3D stacks
> of coins. This is what it came up with. The first two are variations on the
> same UI, showing 5-10 stocks. For the third one, I asked it show a portfolio
> of 50-100 stocks.
>
> Obviously, these are just AI images, so don't take any aspect of them too
> literally. That said, I think they point to what a really fun stock-trading
> game that appeals to high school and college students might look and feel
> like.
>
> As we've discussed, once you have the core model and representation
> established, you can build all kinds of levels and lessons on top of that.
>
> I realize this is ambitious. Much easier for AI to make an image than to build
> the actual software. But I think it's good to have some destination in mind.
>
> I'd recommend you do this yourself. My prompt was nothing special. You can
> give it your own directions and notes. Also, if there are certain game
> aesthetics you prefer, you can feed it sample images for reference.

**Next morning, the three rules (this is the real spec):**

1. **A coin is one share, and its height is that share's price.** Not all coins
   the same height. "Each coin should represent one share of stock, and
   obviously share values are variable between stocks. Then when you buy and
   trade you are buying actual shares that are visualized as coins of a set
   size."
2. **Growth and decline are coin thickness, not coin count.** "Growth and
   decline would occur as growth and shrinkage of the individual coin heights.
   So the column will rise and fall just as a result of the coins growing and
   shrinking."
3. **Selling converts a share into dollar coins of constant unit size.** "One
   share that is 100px tall might convert into 10 dollar coins that are 10px
   tall."

**On Marlon's poker-chip counter-proposal** (partition one chip denomination per
stock, since a share-coin whose unit value changes may confuse players):
> Let's keep it simple. Focus on stocks for now. Implement the three bullet
> points above first. We can always add complexity later.
>
> With respect to your question, the only real coins should be dollar coins
> (perhaps with a dollar sign on top). Those have set height and value. Shares
> look similar to coins but have variable height based on share value. If this
> is designed correctly, it should be clear that they are distinct, and also
> clear how one converts to the other.

Marlon's open worry, deferred by Jared, not answered: this representation does
not yet say anything about dividends or index funds.

## What the three rules actually buy us

They collapse into one law, and it is the foolproof property Jared has been
asking for since the marble critique:

> **Height is dollars. One ruler, everything on screen, always.**

- Share coin height = that share's price.
- Dollar coin height = its fixed denomination.
- A stack's height = shares x price = what the position is worth.
- Growth raises a column with no new coins: you did not get more shares, your
  shares got bigger.
- A buy is an even swap of height: a pile of dollar coins fuses into one share
  coin of the same total height. Profit only shows up later, as thickness.
- A sell is the same swap run backwards, into countable unit coins.

It passes the test the orb failed: single asset, many assets, growth, decline,
and a crash all read at a glance, on one ruler, with no legend.

## Known problems with the images (do not copy literally)

- **Image 3 breaks rule 1.** At 68 holdings the coins are sub-pixel; nobody can
  count a share or read a thickness. Density needs a different zoom level, not
  the same view scaled down.
- **The renders are dashboards, not games.** Level 7, 1,230 XP, a mascot, a
  streak, a news feed, and a five-tab nav are chrome around a portfolio viewer.
  The last three rejections were partly about missing loops; a beautiful stack
  screen with no loop invites the same note.
- **The art is AI-render slop** (glossy bevels, sunset skyline, cartoon
  avatar). It conflicts with the site's clean-type contract in
  `docs/clean-type.md`. Jared explicitly said not to take the aesthetic
  literally and that we can feed our own references.
- **The tags are unreadable at phone width.** Eight floating price cards
  overlapping eight stacks only works at desk resolution.
