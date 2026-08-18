# Type and copy: the clean pass

Status: binding contract, August 18. Marlon's instruction: "Remove the ai slop
across the site, the mini caps, the monospace font, any grotesque font or
gothic font is ai slop. This site should be as clean and simple as nyt games
when you're done. Language simple, just keep it one phrase without the
additives."

The target is New York Times Games: one typeface, plain words, generous space,
nothing decorative anywhere.

DONE, August 18, on localhost only, not deployed. Six areas were cleaned in
parallel against this contract: Guess the Stock, Takeover, Worth More, the
Tally, the Orb suite, and Share Garden with the side pages. tools/cleancheck.mjs
audits all nineteen routes at 1440x950 and 390x844 and reports CLEAN; the count
went from 457 violations to zero. The production build now requests no webfont
at all.

## 1. One typeface, everywhere

The only font stack on the site is the system UI stack, exported once as
`UI_FONT` from `src/lib/type.ts` and set as `--font-sans` in `src/index.css`:

    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

Canvas and SVG code imports `UI_FONT` rather than writing its own string.

DELETED, with no replacement and no exceptions:

- monospace of any kind: "SF Mono", ui-monospace, Menlo, Consolas, monospace
- Space Grotesk and the `font-grotesk` class and `--font-grotesk` token
- Pixelify Sans and the `font-game` class and `--font-game` token
- Fraunces and the `font-display` class and `--font-display` token
- the Google Fonts @import in src/index.css (the site loads no webfonts)
- Inter as a named family (the system stack replaces it)

One deliberate exception, because it is content and not chrome: the newspaper
clipping card in `src/components/NewsBits.tsx` keeps Georgia, since it is a
reproduction of a printed front page. Nothing else on the site uses a serif.

## 2. No mini caps

A mini cap is the tiny label stacked above a heading or beside a value:
"New game", "Game one", "What it is", "the buzzer", "hostile takeover",
"run over", "hints", "par". They are decoration pretending to be information.

Rules:

- Delete the label if the heading under it already says the same thing.
- Keep the fact, not the label, when it carries real information: fold it into
  the sentence ("Sold in 3 guesses" rather than a "guesses" caption over a 3).
- Nothing on the site is set in all capitals, ever. No `textTransform`, no
  capitalized acronym styling, no letter-spaced small text.
- Positive letter-spacing is gone. Tracking may be 0 or slightly negative
  (to -0.02em) on large headings only.
- Minimum type size for anything a player reads is 12px. Captions live at
  13px, body at 15px, and 11px labels are deleted rather than shrunk.

## 3. Sentence case, plain words

- Sentence case everywhere. The all-lowercase "terminal voice" in Guess the
  Stock and Takeover is retired along with the monospace it was built on.
  Proper nouns keep their capitals: Apple, Netflix, Marlon's company.
- One phrase per line. A description is one clause that says what you do.
  No lists of three, no trailing explainer, no second sentence tacked on.
  Cut "and every answer comes with the one line of history that made the year
  look like that" down to nothing; the first phrase already did the work.
- Banned punctuation in copy: em dashes, ellipses used as connectors, colons
  that chain a second clause onto the first, exclamation marks.
- No emoji anywhere.
- No jargon a ten year old would not know.

Examples of the whole rule working at once:

    before   Two companies, one question: which is worth more? Every answer
             reveals the real numbers, the winner stays on as your next
             opponent, and one wrong tap ends the streak.
    after    Pick the company worth more.

    before   Start as a lemonade stand and eat every company smaller than you.
             Real names, real market values. Click to split and lunge, dodge
             anything bigger, and see how much of the market you can swallow
             in ninety seconds.
    after    Eat every company smaller than you.

## 4. Numbers

Numbers used to line up because the font was monospace. They line up now with
`font-variant-numeric: tabular-nums` (the existing `.tnum` class, or the
Tailwind `tabular-nums` utility). Every changing number, score, price, or
countdown carries it.

## 5. Weight and color

- Weights: 400 body, 500 or 600 for emphasis, 700 for headings. Nothing above
  700. The 800 to 850 weights in the Tally come down to 700.
- Palettes stay as they are. This pass changes type, labels, and words, never
  the colors a game was designed around.

## 6. How a page is checked

A page passes when:

1. `grep -riE "mono|grotesk|pixelify|fraunces|letterSpacing: \"0\.|uppercase|textTransform"` finds nothing in it.
2. Nothing is set below 12px.
3. Every label above a heading is gone.
4. Every description is one phrase.
5. It screenshots cleanly at 1440x950 and 390x844 with no clipped or
   overlapping text.
