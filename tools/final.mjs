import { chromium } from "playwright";
const B="http://localhost:4318/#";
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1360,height:900},deviceScaleFactor:2});
p.setDefaultTimeout(4000);
const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto(B+"/");await p.waitForTimeout(1000);await p.screenshot({path:"tools/shots/f-landing.png"});
// garden: plant + play
await p.goto(B+"/garden");await p.waitForTimeout(1400);
await p.getByRole("button",{name:"Go to market"}).click();await p.waitForTimeout(400);
const plants=p.getByRole("button",{name:"Plant"});
for(let i=0;i<6;i++){await plants.nth(i).click().catch(()=>{});await p.waitForTimeout(150);}
await p.keyboard.press("Escape");await p.waitForTimeout(250);
await p.getByRole("button",{name:/buy into the co-op/}).click().catch(()=>{});
await p.getByLabel("play").first().click().catch(()=>{});await p.waitForTimeout(6500);
await p.screenshot({path:"tools/shots/f-garden.png"});
console.log("errors:",errs.length?errs.slice(0,4).join(" | "):"none");
await b.close();
