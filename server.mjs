import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { openStore } from './lib/store.mjs';
import { HttpError, validateLead, valuationReady, emailOK, phoneOK, normalizeContact, clean, csvCell } from './lib/domain.mjs';
import { render, routes, readiness } from './lib/render.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const equal=(a,b)=>typeof a==='string' && typeof b==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const responseHeaders={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'same-origin',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
async function bodyJSON(req) {
 if(!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Utilisez le format JSON.');
 let size=0,chunks=[];
 for await(const chunk of req) {size+=chunk.length;if(size>20000) throw new HttpError(413,'Demande trop volumineuse.');chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString());}catch {throw new HttpError(400,'JSON invalide.');}
}
function loadConfig(file) {
 const defaults=JSON.parse(readFileSync(resolve(root,'config.example.json'),'utf8'));
 if(!file || !existsSync(file)) return defaults;
 const local=JSON.parse(readFileSync(file,'utf8'));
 return {...defaults,...local,publisher:{...defaults.publisher,...local.publisher},criteria:{...defaults.criteria,...local.criteria},valuation:{...defaults.valuation,...local.valuation}};
}
export function createApp(options={}) {
 const config=options.config || loadConfig(resolve(process.env.CONFIG_FILE || resolve(root,'config.local.json')));
 const settings={origin:options.origin || process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:4321',investorsEnabled:options.investorsEnabled ?? process.env.INVESTORS_ENABLED==='true',publicReady:options.publicReady ?? process.env.PUBLIC_READY==='true'};
 settings.origin=new URL(settings.origin).origin;
 if(settings.publicReady && readiness(config).length) throw new Error('Configuration publique incomplète : '+readiness(config).join(', '));
 if(settings.publicReady && !settings.origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN doit utiliser HTTPS en production.');
 const adminToken=options.adminToken ?? process.env.ADMIN_TOKEN ?? '';
 const store=options.store || openStore(':memory:');
 const secret=randomBytes(32), buckets=new Map();
 const hmac=s=>createHmac('sha256',secret).update(s).digest('hex');
 const minAge=options.minFormAgeMs ?? 3000;
 const token=()=>{const p=Date.now()+'.'+randomBytes(12).toString('hex');return p+'.'+hmac(p);};
 function validToken(t) {
  if(typeof t!=='string') return false;
  const parts=t.split('.'), issued=Number(parts[0]), payload=parts.slice(0,2).join('.');
  return parts.length===3 && equal(parts[2],hmac(payload)) && Number.isFinite(issued) && Date.now()-issued>=minAge && Date.now()-issued<86400000;
 }
 function limit(req) {
  const now=Date.now();
  for(const [k,v] of buckets) if(v.until<now) buckets.delete(k);
  // No proxy header is trusted by default. Configure a trusted reverse proxy separately.
  const ip=req.socket.remoteAddress || 'unknown';
  const b=buckets.get(ip) || {count:0,until:now+3600000};b.count++;buckets.set(ip,b);
  if(b.count>5) throw new HttpError(429,'Trop de demandes. Réessayez dans une heure.');
 }
 function auth(req) {
  if(adminToken.length<32) throw new HttpError(503,'L’accès privé n’est pas configuré.');
  if(!equal(req.headers.authorization || '', 'Bearer '+adminToken)) throw new HttpError(401,'Accès privé requis.');
 }
 store.db.exec(`CREATE TABLE IF NOT EXISTS prospects(id TEXT PRIMARY KEY, audience TEXT NOT NULL, contact TEXT NOT NULL, payload TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'identified', created TEXT NOT NULL, updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS prospect_events(id INTEGER PRIMARY KEY, prospect_id TEXT NOT NULL REFERENCES prospects(id) ON DELETE CASCADE, at TEXT NOT NULL, payload TEXT NOT NULL);`);
 async function flushEmails() {
  if(store.paused) return {sent:0,configured:!!process.env.EMAIL_API_KEY,paused:true};
  const key=options.emailKey ?? process.env.EMAIL_API_KEY,from=options.emailFrom ?? process.env.EMAIL_FROM,to=options.notifyEmail ?? process.env.NOTIFY_EMAIL;
  if(!key || !from || !to) return {sent:0,configured:false};
  let sent=0;
  for(const row of store.db.prepare("SELECT * FROM outbox WHERE status IN ('pending','failed') AND attempts<3 ORDER BY id LIMIT 20").all()) {
   const lead=JSON.parse(row.payload);
   if(store.suppressed(lead.contact)) {store.db.prepare("UPDATE outbox SET status='cancelled' WHERE id=?").run(row.id);continue;}
   try {
    const result=await fetch(options.emailURL || process.env.EMAIL_API_URL || 'https://api.resend.com/emails',{
     method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'lead-'+row.lead_id+'-'+row.id},
     body:JSON.stringify(lead.delivery==='receipt'?{from,to:[lead.contact],...(config.email?{reply_to:config.email}:{}),subject:'Votre demande a été reçue — New Wave Acquisition',text:'Votre demande a été enregistrée. Nous vous recontacterons au sujet de votre projet. Aucun engagement ne résulte de cette demande. Pour corriger vos informations ou vous opposer au suivi, répondez à ce message.'}:{from,to:[to],...(lead.contact.includes('@')?{reply_to:lead.contact}:{}),subject:'[New Wave] Demande — '+lead.kind+' — '+lead.firstName,text:JSON.stringify(lead,null,2)})
    });
    if(!result.ok) throw new Error('provider-'+result.status);
    store.db.prepare("UPDATE outbox SET status='sent',attempts=attempts+1,error='' WHERE id=?").run(row.id);store.event(row.lead_id,'notification_sent');sent++;
   }catch(err) {store.db.prepare("UPDATE outbox SET status='failed',attempts=attempts+1,error=? WHERE id=?").run(String(err.message).slice(0,200),row.id);}
  }
  return {sent,configured:true};
 }
 const server=http.createServer(async(req,res)=>{
  const send=(status,data,type='application/json; charset=utf-8',extra={})=>{res.writeHead(status,{...responseHeaders,'Cache-Control':'no-store','Content-Type':type,...extra});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));};
  try {
   const url=new URL(req.url,'http://local'),path=url.pathname;
   if(req.method==='GET' && path==='/api/health') return send(200,{ok:true});
   if(req.method==='GET' && path==='/api/form-token') return send(200,{token:token()});
   if(req.method==='GET' && path==='/api/config') return send(200,{investorsEnabled:settings.investorsEnabled,valuation:valuationReady(config.valuation)?config.valuation:null});
   if(req.method==='POST' && path==='/api/leads') {
    if(req.headers.origin!==settings.origin) throw new HttpError(403,'Origine de la demande non autorisée.');
    if(store.paused) throw new HttpError(503,'Les demandes sont temporairement suspendues. Réessayez plus tard.');
    const body=await bodyJSON(req);limit(req);
    if(body.website || !validToken(body.formToken)) throw new HttpError(400,'La demande n’a pas été validée. Patientez quelques secondes puis réessayez.');
    const lead=validateLead(body,{investorsEnabled:settings.investorsEnabled,valuationEnabled:valuationReady(config.valuation)});
    const result=store.record(lead);
    return send(201,{ok:true,...result,notification:'queued'});
   }
   if(path.startsWith('/api/private/')) {
    auth(req);
    if(req.method==='GET' && path==='/api/private/status') return send(200,{paused:store.paused,missing:readiness(config),investorsEnabled:settings.investorsEnabled,valuationEnabled:valuationReady(config.valuation),pendingNotifications:store.db.prepare("SELECT count(*) AS n FROM outbox WHERE status IN ('pending','failed')").get().n});
    if(req.method==='POST' && path==='/api/private/pause') {const b=await bodyJSON(req);if(typeof b.paused!=='boolean') throw new HttpError(400,'paused doit être un booléen.');store.pause(b.paused);return send(200,{paused:store.paused});}
    if(req.method==='GET' && path==='/api/private/leads') {
     const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||50)),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
     return send(200,{items:store.list({limit,offset}),limit,offset});
    }
    if(req.method==='GET' && path==='/api/private/export.csv') {
     const rows=store.db.prepare('SELECT * FROM leads ORDER BY created').all();
     const keys=['id','kind','contact','created','updated','status','owner','next_action','next_at','payload'];
     return send(200,'\uFEFF'+[keys.join(';'),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(';'))].join('\r\n'),'text/csv; charset=utf-8',{'Content-Disposition':'attachment; filename="contacts-new-wave.csv"'});
    }
    if(req.method==='POST' && path==='/api/private/notifications/retry') return send(200,await flushEmails());
    if(req.method==='POST' && path==='/api/private/suppressions') {
     const b=await bodyJSON(req),c=clean(b.contact,254);if(!(emailOK(c)||phoneOK(c))) throw new HttpError(400,'Contact invalide.');
     const contact=normalizeContact(c);store.suppress(contact);store.db.prepare("UPDATE prospects SET stage='opposed',updated=? WHERE contact=?").run(new Date().toISOString(),contact);return send(200,{ok:true});
    }
    if(req.method==='GET' && path==='/api/private/prospects') {
     const items=store.db.prepare('SELECT * FROM prospects ORDER BY created DESC LIMIT 200').all().map(x=>({...x,payload:JSON.parse(x.payload)}));return send(200,{items});
    }
    if(req.method==='POST' && path==='/api/private/prospects') {
     if(store.paused) throw new HttpError(503,'Prospection suspendue.');
     const b=await bodyJSON(req),audience=clean(b.audience),contact=clean(b.contact,254);
     if(!['seller','investor','referrer'].includes(audience) || !clean(b.name) || !(emailOK(contact)||phoneOK(contact)) || !Array.isArray(b.sources) || !b.sources.length) throw new HttpError(400,'Précisez le public, le nom, un contact et les sources.');
     const normalized=normalizeContact(contact);
     if(store.suppressed(normalized)) throw new HttpError(409,'Contact opposé : aucune sollicitation.');
     const sources=b.sources.slice(0,10).map(s=>{try {const u=new URL(s.url);if(!['https:','http:'].includes(u.protocol)||!clean(s.evidence,1000))throw new Error();return {url:u.href,evidence:clean(s.evidence,1000),checkedAt:clean(s.checkedAt,40)};}catch{throw new HttpError(400,'Chaque source doit comporter une URL et un élément vérifiable.');}});
     const existing=store.db.prepare('SELECT id FROM prospects WHERE audience=? AND contact=?').get(audience,normalized);
     if(existing) return send(200,{id:existing.id,duplicate:true});
     const id=randomBytes(16).toString('hex'),now=new Date().toISOString(),payload={name:clean(b.name),company:clean(b.company),sources,notes:clean(b.notes,2000),interest:'unknown',ticket:clean(b.ticket),ticketEvidence:'unverified',contactBasis:clean(b.contactBasis,500)};
     store.db.prepare('INSERT INTO prospects VALUES(?,?,?,?,?,?,?)').run(id,audience,normalized,JSON.stringify(payload),'identified',now,now);return send(201,{id,stage:'identified'});
    }
    const prospectMatch=path.match(/^\/api\/private\/prospects\/([a-f0-9]{32})$/);
    if(prospectMatch && req.method==='DELETE') {store.db.prepare('DELETE FROM prospects WHERE id=?').run(prospectMatch[1]);return send(200,{ok:true});}
    if(prospectMatch && req.method==='PATCH') {
     const id=prospectMatch[1],row=store.db.prepare('SELECT * FROM prospects WHERE id=?').get(id);if(!row) throw new HttpError(404,'Prospect introuvable.');
     const b=await bodyJSON(req),stage=clean(b.stage),note=clean(b.note,2000);
     if(!['identified','reviewed','contacted','replied','interested','meeting','declined','opposed','closed'].includes(stage)||!note) throw new HttpError(400,'Précisez un statut et la preuve ou le motif de la transition.');
     if(store.suppressed(row.contact) && stage!=='opposed') throw new HttpError(409,'Contact opposé.');
     store.db.prepare('UPDATE prospects SET stage=?,updated=? WHERE id=?').run(stage,new Date().toISOString(),id);
     store.db.prepare('INSERT INTO prospect_events(prospect_id,at,payload) VALUES(?,?,?)').run(id,new Date().toISOString(),JSON.stringify({stage,note}));
     if(stage==='opposed')store.suppress(row.contact);
     return send(200,{id,stage});
    }
    const match=path.match(/^\/api\/private\/leads\/([a-f0-9-]{36})$/);
    if(match) {
     if(req.method==='GET') {const row=store.get(match[1]);if(!row)throw new HttpError(404,'Contact introuvable.');return send(200,row);}
     if(req.method==='PATCH') return send(200,store.update(match[1],await bodyJSON(req)));
     if(req.method==='DELETE') {store.remove(match[1]);return send(200,{ok:true});}
    }
    throw new HttpError(404,'Route privée inconnue.');
   }
   if(req.method!=='GET' && req.method!=='HEAD') throw new HttpError(405,'Méthode non autorisée.');
   const assets={'/favicon.svg':['favicon.svg','image/svg+xml'],'/favicon.ico':['favicon.svg','image/svg+xml'],'/site.css':['site.css','text/css'],'/app.js':['app.js','text/javascript'],'/visuals.js':['visuals.js','text/javascript'],'/fonts.css':['fonts.css','text/css'],'/suivi.js':['suivi.js','text/javascript']};
   if(assets[path]) {const [file,type]=assets[path];return send(200,readFileSync(resolve(root,'public',file)),type+'; charset=utf-8',{'Cache-Control':'public,max-age=3600'});}
   if(/^\/fonts\/[a-z0-9-]+\.(?:woff2|ttf)$/.test(path)) {
    const f=resolve(root,'public','.'+path);if(!existsSync(f))throw new HttpError(404,'Police introuvable.');return send(200,readFileSync(f),path.endsWith('.ttf')?'font/ttf':'font/woff2',{'Cache-Control':'public,max-age=31536000,immutable'});
   }
   if(path==='/suivi') return send(200,readFileSync(resolve(root,'public/suivi.html')),'text/html; charset=utf-8');
   if(path==='/robots.txt') return send(200,settings.publicReady?`User-agent: *\nDisallow: /api/\nDisallow: /merci\nDisallow: /investir\nSitemap: ${settings.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain');
   if(path==='/sitemap.xml') return send(200,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(settings.publicReady?Object.keys(routes).filter(p=>!['/merci','/investir'].includes(p)).map(p=>`<url><loc>${settings.origin}${p}</loc></url>`).join(''):'')+'</urlset>','application/xml');
   if(path==='/criteres.txt') return send(200,`New Wave Acquisition\nZone : ${config.criteria.region}\nMétiers : ${config.criteria.sectors.join(', ')}\nRentabilité et autonomie à examiner sur pièces.\nTaille : ${config.criteria.revenueMin ?? 'au cas par cas'} à ${config.criteria.revenueMax ?? 'au cas par cas'} euros de CA.\nPrésentation d’un dossier avec l’accord du dirigeant.\n`,'text/plain; charset=utf-8');
   const {html,status}=render(path,config,settings);return send(status,req.method==='HEAD'?'':html,'text/html; charset=utf-8');
  }catch(error) {send(error.status || 500,{error:error.status?error.message:'La demande n’a pas abouti. Votre saisie est conservée ; réessayez plus tard.'});}
 });
 const timer=setInterval(()=>{flushEmails().catch(()=>{});},60000);timer.unref();
 server.on('close',()=>clearInterval(timer));
 return {server,store,settings,flushEmails};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const data=resolve(process.env.DATA_DIR || resolve(root,'var'));mkdirSync(data,{recursive:true,mode:0o700});
 const app=createApp({store:openStore(resolve(data,'new-wave.sqlite'))});
 app.server.listen(Number(process.env.PORT)||4321,process.env.HOST||'127.0.0.1',()=>console.log('New Wave Acquisition — http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||4321)));
 for(const s of ['SIGINT','SIGTERM']) process.on(s,()=>app.server.close(()=>{app.store.close();process.exit(0);}));
}
