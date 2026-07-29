import { chromium } from "playwright";
const B="http://localhost:4318/#/garden";
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1360,height:820},deviceScaleFactor:2});
p.setDefaultTimeout(4000);
const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto(B);await p.waitForTimeout(1400);
await p.getByRole("button",{name:"Go to market"}).click();
await p.waitForTimeout(400);
await p.locator("button[title='About this crop']").first().click().catch(()=>{});
await p.waitForTimeout(300);
await p.screenshot({path:"tools/shots/g-market.png"});
// plant 5 crops (market stays open)
const plants = p.getByRole("button",{name:"Plant"});
for (let i=0;i<5;i++){ await plants.nth(i).click().catch(e=>errs.push("p"+i+":"+e.message)); await p.waitForTimeout(200); }
// close market
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.getByRole("button",{name:/buy into the co-op/}).click().catch(e=>errs.push("coop:"+e.message));
await p.waitForTimeout(200);
await p.getByLabel("play").first().click().catch(()=>{});
await p.waitForTimeout(6500);
await p.screenshot({path:"tools/shots/g-garden2.png"});
console.log("errors:",errs.length?errs.slice(0,4).join(" | "):"none");
await b.close();
