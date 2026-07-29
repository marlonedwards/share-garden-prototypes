import { chromium } from "playwright";
const B = "http://localhost:4318/#";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1360, height: 820 }, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
for (const [route,name] of [["/pulse","q-pulse"],["/prism","q-prism"]]) {
  await p.goto(B+route); await p.waitForTimeout(1200);
  await p.getByLabel("play").first().click().catch(()=>{});
  await p.waitForTimeout(4500);
  await p.screenshot({ path: "tools/shots/"+name+".png" });
  console.log("shot", name);
}
console.log("errors:", errs.length?errs.slice(0,5).join(" | "):"none");
await b.close();
