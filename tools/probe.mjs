import { Market } from "../src/engine/market.ts";
const m = new Market(71, 1000, 0);
for (let i=0;i<6;i++){ m.tick(); }
console.log("net:", m.net);
console.log("bench:", m.bench);
console.log("prices:", m.prices);
console.log("hasNaN net:", m.net.some(Number.isNaN), "bench:", m.bench.some(Number.isNaN));
