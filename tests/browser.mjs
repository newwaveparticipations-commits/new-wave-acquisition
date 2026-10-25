// Optional real-browser acceptance tests. All people, amounts and provider data are fictitious.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const config=JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url)));
config.valuation={approved:true,approvedAt:'2026-10-25',replacementCostLoaded:80000,cashPolicy:'excess-only',multiples:{'Démonstration uniquement':[2,3]}};
const adminToken='browser-test-only-key-abcdefghijklmnopqrstuvwxyz';
const app=createApp({config,adminToken,investorsEnabled:true,minFormAgeMs:0});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const origin='http://127.0.0.1:'+app.server.address().port;app.settings.origin=origin;
const out=resolve('var/qa');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const errors=[],results=[];
try{
 for(const width of [375,800,1440]){
  const context=await browser.newContext({viewport:{width,height:960}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+new URL(r.url()).pathname);});
  for(const route of ['/','/diagnostic','/contact','/prescripteurs','/estimer','/investir','/suivi']){
   await page.goto(origin+route);await page.waitForLoadState('networkidle');
   const size=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(size.body<=width+1,`Overflow ${width} ${route}`);results.push({width,route,...size});
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/contact');await page.locator('#next').click();assert.ok(await page.locator('#e-horizon').isVisible());
 await page.locator('#h3').check();await page.locator('#next').click();await page.locator('#next').click();await page.locator('#c-prenom').fill('Démo cédant');await page.locator('#c-contact').fill('seller@example.test');await page.locator('#next').click();await page.locator('#next').click();await page.waitForURL('**/merci');
 results.push({flow:'seller',ok:true});
 await page.goto(origin+'/diagnostic');for(let i=0;i<10;i++)await page.locator('#dq'+i+'_1').locator('..').click();await page.locator('#d-gate-prenom').fill('Démo diagnostic');await page.locator('#d-gate-contact').fill('diagnostic@example.test');await page.locator('#d-gate [type="submit"]').click();await page.locator('#d-next').waitFor({state:'visible'});
 assert.equal(app.store.list().find(x=>x.kind==='diagnostic').payload.details.answers,undefined);results.push({flow:'diagnostic-no-sharing',ok:true});
 await page.goto(origin+'/diagnostic');for(let i=0;i<10;i++)await page.locator('#dq'+i+'_1').locator('..').click();await page.locator('#d-gate-prenom').fill('Démo diagnostic partagé');await page.locator('#d-gate-contact').fill('shared@example.test');await page.locator('#d-share').check();await page.locator('#d-gate [type="submit"]').click();await page.locator('#d-next').waitFor({state:'visible'});
 assert.equal(app.store.list().find(x=>x.contact==='shared@example.test').payload.details.answers.length,10);results.push({flow:'diagnostic-with-sharing',ok:true});
 await page.goto(origin+'/investir');await page.locator('#k-prenom').fill('Démo investisseur');await page.locator('#k-mail').fill('investor@example.test');await page.locator('#k-ticket').selectOption({index:1});await page.locator('#k-profil').selectOption({index:1});await page.locator('#k-part').selectOption({index:1});await page.locator('#k-propre').check();await page.locator('#k-risque').check();await page.locator('#k-send').click();await page.locator('#k-ok').waitFor({state:'visible'});results.push({flow:'investor',ok:true});
 await page.goto(origin+'/estimer');
 for(const [key,value]of Object.entries({revenue:1000000,ebe:100000,remuneration:50000,excessCash:20000,debt:30000}))await page.locator('#v-'+key).fill(String(value));
 await page.locator('#v-firstName').fill('Démo estimation');await page.locator('#v-lead-contact').fill('valuation@example.test');await page.locator('#valuation [type="submit"]').click();await page.locator('#valuation-result .range-num').waitFor();assert.match(await page.locator('#valuation-result').innerText(),/130.*000.*200.*000/s);assert.equal(app.store.list().find(x=>x.kind==='valuation').payload.details.figures,undefined);results.push({flow:'valuation-no-sharing',ok:true});
 await page.goto(origin+'/suivi');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.locator('#workspace').waitFor({state:'visible'});assert.equal(await page.locator('#leads tbody tr').count(),5);results.push({flow:'private-dashboard',ok:true});
 // Verify internal links from the actual rendered home, including fragment targets.
 await page.goto(origin+'/');
 const links=await page.locator('a[href^="/"]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
 for(const path of links){const r=await page.request.get(origin+path);assert.ok(r.status()<400,path);}
 await context.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({results,errors},null,2));writeFileSync(out+'/browser-results.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.close();}
