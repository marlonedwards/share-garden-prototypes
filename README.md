# Share Garden - metaphor prototypes

Three playable web prototypes exploring which world should carry Share Garden's
lesson (time in the market beats timing it; a diversified index quietly wins).
All three run the **same deterministic market engine** underneath. Same seed,
same season, three lenses.

- **Pulse** (`/#/pulse`) - no metaphor. A straight, well-made trading sim. The honest baseline.
- **Flows** (`/#/flows`) - the systems view. A capital field where you steer money between sectors and watch correlation and shocks play out.
- **Share Garden** (`/#/garden`) - the gardening bet. Plant to buy, harvest to sell, a co-op field that is the index.

Prototype study, not the product. Built to settle the metaphor before the real
(native) build commits to art and engine.

## Run locally

```
npm install
npm run dev      # http://localhost:4318
npm run build    # static build in dist/
npm run shots    # capture verification screenshots (needs the dev server running)
```

## Stack

Vite + React + TypeScript + Tailwind. Three.js for the Flows field, canvas/SVG
for the rest. Crop art generated with a cozy-pixel style guide. `src/engine/market.ts`
is the shared, seeded simulation; each prototype is just a different view of it.
