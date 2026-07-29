import { groupedTreemap } from "../src/lib/treemap.ts";
import { MARKET } from "../src/engine/market.ts";
const items = MARKET.map(a => ({ key: a.id, group: a.sector, value: a.marketCap }));
const rects = groupedTreemap(items, 860, 400, 1);
console.log("tiles:", rects.length, "of", items.length);
const bad = rects.filter(r => !isFinite(r.x)||!isFinite(r.y)||!isFinite(r.w)||!isFinite(r.h)||r.w<0||r.h<0);
console.log("bad rects:", bad.length);
const area = rects.reduce((s,r)=>s+r.w*r.h,0);
console.log("coverage:", (area/(860*400)*100).toFixed(1)+"%");
let maxAR=0; for(const r of rects){ const ar=Math.max(r.w/r.h,r.h/r.w); if(ar>maxAR)maxAR=ar; }
console.log("worst aspect ratio:", maxAR.toFixed(1));
