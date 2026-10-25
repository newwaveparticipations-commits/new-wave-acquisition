import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';
import { openStore } from '../lib/store.mjs';
const config=JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url)));
const adminToken='test-only-abcdefghijklmnopqrstuvwxyz123456789';
async function fixture(options={}) {
 const app=createApp({config,origin:'http://localhost',adminToken,minFormAgeMs:0,...options});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 const request=(path,{method='GET',data,auth=false,origin='http://localhost'}={})=>fetch(base+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+adminToken}:{}),Origin:origin},...(data?{body:JSON.stringify(data)}:{})});
 const token=(await(await request('/api/form-token')).json()).token;
 return {app,request,token,close:async()=>{await new Promise(r=>app.server.close(r));app.store.close();}};
}
const lead=token=>({kind:'seller',firstName:'Test',contact:'test@example.test',horizon:'this-year',formToken:token});
test('inbound lifecycle persists, deduplicates, exports privately and suppresses',async()=>{
 const f=await fixture();try{
  let r=await f.request('/api/leads',{method:'POST',data:lead(f.token)});assert.equal(r.status,201);const created=await r.json();
  assert.equal((await(await f.request('/api/leads',{method:'POST',data:lead(f.token)})).json()).duplicate,true);
  assert.equal((await f.request('/api/private/leads')).status,401);
  const listed=await(await f.request('/api/private/leads',{auth:true})).json();assert.equal(listed.items.length,1);
  r=await f.request('/api/private/leads/'+created.id,{method:'PATCH',auth:true,data:{status:'qualified',owner:'Operator',nextAction:'Organiser un échange'}});assert.equal(r.status,200);
  const detail=await(await f.request('/api/private/leads/'+created.id,{auth:true})).json();assert.equal(detail.events.length,3);assert.equal(detail.status,'qualified');
  assert.match(await(await f.request('/api/private/export.csv',{auth:true})).text(),/test@example.test/);
  assert.equal((await f.request('/api/private/suppressions',{method:'POST',auth:true,data:{contact:'TEST@example.test'}})).status,200);
  assert.equal((await f.request('/api/leads',{method:'POST',data:lead(f.token)})).status,409);
  assert.equal(f.app.store.db.prepare('SELECT status FROM outbox').get().status,'cancelled');
 }finally{await f.close();}
});
test('origin, honeypot, forged and fresh tokens are rejected',async()=>{
 const f=await fixture({minFormAgeMs:3000});try{
  assert.equal((await f.request('/api/leads',{method:'POST',data:lead(f.token),origin:'https://unrelated.test'})).status,403);
  for(const body of [lead(f.token),lead('forged'),{...lead(f.token),website:'bot.test'}])assert.equal((await f.request('/api/leads',{method:'POST',data:body})).status,400);
 }finally{await f.close();}
});
test('rate limit applies after five requests and pause is persistent',async()=>{
 const f=await fixture();try{
  await f.request('/api/private/pause',{method:'POST',auth:true,data:{paused:true}});
  assert.equal((await f.request('/api/leads',{method:'POST',data:lead(f.token)})).status,503);
  await f.request('/api/private/pause',{method:'POST',auth:true,data:{paused:false}});
  for(let i=0;i<5;i++)assert.equal((await f.request('/api/leads',{method:'POST',data:lead(f.token)})).status,201);
  assert.equal((await f.request('/api/leads',{method:'POST',data:lead(f.token)})).status,429);
 }finally{await f.close();}
});
test('no shared diagnostic answers reach storage or outbox without permission',async()=>{
 const f=await fixture();try{
  const r=await f.request('/api/leads',{method:'POST',data:{...lead(f.token),kind:'diagnostic',score:10,answers:Array(10).fill(1),figures:{revenue:987654321}}});assert.equal(r.status,201);
  const text=JSON.stringify(f.app.store.list());assert.doesNotMatch(text,/987654321|"answers"/);
  assert.doesNotMatch(f.app.store.db.prepare('SELECT payload FROM outbox').get().payload,/987654321|"answers"/);
 }finally{await f.close();}
});
test('investor endpoint and content stay closed by default',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/leads',{method:'POST',data:{...lead(f.token),kind:'investor'}})).status,403);
  const r=await f.request('/investir');assert.equal(r.status,404);assert.doesNotMatch(await r.text(),/id="club-form"/);
  const home=await(await f.request('/')).text();assert.doesNotMatch(home,/href="\/investir"|id="club-form"/);
 }finally{await f.close();}
});
test('investor path can be fully tested when deliberately enabled',async()=>{
 const f=await fixture({investorsEnabled:true});try{
  const r=await f.request('/api/leads',{method:'POST',data:{...lead(f.token),kind:'investor',ticket:'undecided',profile:'individual',interestAcknowledged:true,risksAccepted:true}});assert.equal(r.status,201);
  const page=await f.request('/investir');assert.equal(page.status,200);const html=await page.text();assert.match(html,/id="club-form"/);assert.match(html,/investor-mobile/);assert.doesNotMatch(html,/id="k-part"|id="k-propre"/);assert.equal(f.app.store.list()[0].payload.details.ticket,'undecided');assert.equal(f.app.store.db.prepare('SELECT count(*) n FROM outbox').get().n,2);
 }finally{await f.close();}
});
test('research creates an identified prospect with evidence, never inferred interest',async()=>{
 const f=await fixture();try{
  const body={audience:'investor',name:'Example',contact:'example@example.test',sources:[{url:'https://example.test/about',evidence:'Information de démonstration'}]};
  let r=await f.request('/api/private/prospects',{method:'POST',auth:true,data:body});assert.equal(r.status,201);const {id}=await r.json();
  const list=await(await f.request('/api/private/prospects',{auth:true})).json();assert.equal(list.items[0].payload.interest,'unknown');assert.equal(list.items[0].stage,'identified');
  assert.equal((await f.request('/api/private/prospects',{method:'POST',auth:true,data:body})).status,200);
  assert.equal((await f.request('/api/private/prospects/'+id,{method:'PATCH',auth:true,data:{stage:'interested'}})).status,400);
  assert.equal((await f.request('/api/private/prospects/'+id,{method:'PATCH',auth:true,data:{stage:'opposed',note:'Opposition reçue'}})).status,200);
  assert.equal((await f.request('/api/private/prospects/'+id,{method:'PATCH',auth:true,data:{stage:'contacted',note:'tentative'}})).status,409);
 }finally{await f.close();}
});
test('all routes render actual content, assets load, unknown path is 404 and config stays private',async()=>{
 const f=await fixture();try{
  for(const route of ['/','/diagnostic','/contact','/prescripteurs','/estimer','/confidentialite','/mentions-legales','/guides/preparer-transmission','/ceder/menuiserie/gironde']) {
   const r=await f.request(route);assert.equal(r.status,200,route);const html=await r.text();assert.match(html,/class="view active"/);assert.doesNotMatch(html,/\{\{|\[SIRENE\]|NOTE MAQUETTE|multiples factices/);
  }
  for(const asset of ['/app.js','/visuals.js','/site.css','/fonts.css','/fonts/barlow-400.ttf'])assert.equal((await f.request(asset)).status,200,asset);
  assert.equal((await f.request('/missing')).status,404);assert.equal((await f.request('/.env')).status,404);assert.equal((await f.request('/var/new-wave.sqlite')).status,404);
  assert.equal((await f.request('/api/private/status',{auth:true})).status,200);
  assert.match(await(await f.request('/robots.txt')).text(),/Disallow: \/\n/);
 }finally{await f.close();}
});
test('public launch refuses incomplete configuration',()=>assert.throws(()=>createApp({config,publicReady:true,origin:'https://example.test'}),/incomplète/));
test('SQLite survives reopening and retains suppression and pause',()=>{
 const directory=mkdtempSync(join(tmpdir(),'newwave-test-'));try{
  const file=join(directory,'db.sqlite');let s=openStore(file);s.record({kind:'seller',firstName:'Demo',contact:'demo@example.test'});s.pause(true);s.suppress('demo@example.test');s.close();
  s=openStore(file);assert.equal(s.list().length,1);assert.equal(s.paused,true);assert.equal(s.suppressed('demo@example.test'),true);s.close();
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('email delivery is queued, retried, idempotent and tested against a local provider only',async()=>{
 const {createServer}=await import('node:http');const calls=[];let fail=true;
 const provider=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push({key:req.headers['idempotency-key'],body:JSON.parse(body)});res.writeHead(fail?503:200,{'Content-Type':'application/json'});res.end('{}');});provider.listen(0,'127.0.0.1');await once(provider,'listening');
 const f=await fixture({emailURL:'http://127.0.0.1:'+provider.address().port,emailKey:'fake-local-test-key',emailFrom:'demo@example.test',notifyEmail:'operator@example.test'});
 try{
  await f.request('/api/leads',{method:'POST',data:lead(f.token)});
  await f.app.flushEmails();assert.equal(f.app.store.db.prepare("SELECT count(*) AS n FROM outbox WHERE status='failed'").get().n,2);
  fail=false;await f.app.flushEmails();assert.equal(f.app.store.db.prepare("SELECT count(*) AS n FROM outbox WHERE status='sent'").get().n,2);
  const count=calls.length;await f.app.flushEmails();assert.equal(calls.length,count);assert.equal(calls[0].key,calls[2].key);
  assert.deepEqual(calls.at(-1).body.to,['test@example.test']);assert.doesNotMatch(calls.at(-1).body.text,/figures|answers/);
 }finally{await f.close();await new Promise(r=>provider.close(r));}
});

test('a returning contact retains the latest message in its record and the previous one in history',async()=>{
 const f=await fixture();try{
  const first=await(await f.request('/api/leads',{method:'POST',data:{...lead(f.token),message:'Premier message'}})).json();
  const again=await(await f.request('/api/leads',{method:'POST',data:{...lead(f.token),message:'Nouveau calendrier'}})).json();
  assert.equal(first.id,again.id);assert.equal(f.app.store.get(first.id).events[0].payload.details.message,'Premier message');assert.equal(f.app.store.get(first.id).payload.details.message,'Nouveau calendrier');assert.equal(f.app.store.get(first.id).events.at(-1).payload.details.message,'Nouveau calendrier');
 }finally{await f.close();}
});
