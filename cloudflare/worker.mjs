import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import defaults from '../config.example.json' with { type: 'json' };
import { openD1 } from './store.mjs';
import { HttpError, validateLead, valuationReady, emailOK, phoneOK, normalizeContact, clean, csvCell } from '../lib/domain.mjs';
import { render, routes, readiness } from '../lib/render-core.mjs';
import { flushD1Emails } from './mail.mjs';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const responseHeaders={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'same-origin',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
async function bodyJSON(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Utilisez le format JSON.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Demande vide.');
 let size=0;const chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();throw new HttpError(413,'Demande trop volumineuse.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HttpError(400,'JSON invalide.');}
}
export function configuration(env){
 const local=JSON.parse(env.SITE_CONFIG||'{}');
 const config={...defaults,...local,publisher:{...defaults.publisher,...local.publisher},criteria:{...defaults.criteria,...local.criteria},valuation:{...defaults.valuation,...local.valuation}};
 const settings={origin:new URL(env.PUBLIC_ORIGIN||'https://newwaveacquisition.fr').origin,publicReady:env.PUBLIC_READY==='true',investorsEnabled:env.INVESTORS_ENABLED==='true'};
 if(settings.publicReady&&(readiness(config).length||!settings.origin.startsWith('https://')||!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!env.FORM_SECRET||env.FORM_SECRET.length<32))throw new Error('Configuration de production incomplète.');
 return {config,settings};
}
export async function handle(request,env,ctx){
 let head=request.method==='HEAD';
 const send=(status,data,type='application/json; charset=utf-8',extra={})=>new Response(head?null:typeof data==='string'||data instanceof Uint8Array?data:JSON.stringify(data),{status,headers:{...responseHeaders,'Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Type':type,...extra}});
 let config,settings;
 try{({config,settings}=configuration(env));}catch{return send(503,{error:'Le site est en cours de préparation.'});}
 const req={method:request.method,url:request.url,headers:Object.fromEntries(request.headers),socket:{remoteAddress:request.headers.get('CF-Connecting-IP')||'local'}};
 const store=openD1(env.DB),adminToken=env.ADMIN_TOKEN||'';
 const hmac=s=>createHmac('sha256',env.FORM_SECRET||'local-preview-only-secret-replace-in-production').update(s).digest('hex');
 const token=()=>{const p=Date.now()+'.'+randomBytes(12).toString('hex');return p+'.'+hmac(p);};
 function validToken(t){if(typeof t!=='string')return false;const parts=t.split('.'),issued=Number(parts[0]),payload=parts.slice(0,2).join('.');return parts.length===3&&equal(parts[2],hmac(payload))&&Number.isFinite(issued)&&Date.now()-issued>=3000&&Date.now()-issued<86400000;}
 function auth(req){if(adminToken.length<32)throw new HttpError(503,'L’accès privé n’est pas configuré.');if(!equal(req.headers.authorization||'','Bearer '+adminToken))throw new HttpError(401,'Accès privé requis.');}
 async function limit(req){
  const now=Date.now(),key=hmac(req.socket.remoteAddress+'.'+Math.floor(now/3600000));
  const row=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+3600000).first();
  if(row.count>5)throw new HttpError(429,'Trop de demandes. Réessayez dans une heure.');
 }
 const flushEmails=()=>flushD1Emails(env);
 const assetResponse=async path=>{
  const result=await env.ASSETS.fetch(new Request(new URL(path,request.url),{method:head?'HEAD':'GET'}));
  if(!result.ok)throw new HttpError(404,'Ressource introuvable.');
  const headers=new Headers(result.headers);for(const [k,v]of Object.entries(responseHeaders))headers.set(k,v);headers.set('X-Robots-Tag','noindex');return new Response(result.body,{status:result.status,headers});
 };
 const asset=async name=>{const result=await env.ASSETS.fetch(new Request(new URL('/'+name,request.url)));if(!result.ok)throw new HttpError(404,'Ressource introuvable.');return new Uint8Array(await result.arrayBuffer());};
 const assetText=async name=>new TextDecoder().decode(await asset(name));
 if(settings.publicReady&&new URL(request.url).origin!==settings.origin)return new Response(null,{status:308,headers:{Location:settings.origin+new URL(request.url).pathname+new URL(request.url).search}});
  try {
   const url=new URL(req.url),path=url.pathname;
   if(req.method==='GET' && path==='/api/health') return send(200,{ok:true});
   if(req.method==='GET' && path==='/api/form-token') return send(200,{token:token()});
   if(req.method==='GET' && path==='/api/config') return send(200,{investorsEnabled:settings.investorsEnabled,valuation:valuationReady(config.valuation)?config.valuation:null});
   if(req.method==='POST' && path==='/api/leads') {
    if(req.headers.origin!==settings.origin) throw new HttpError(403,'Origine de la demande non autorisée.');
    if((await store.paused())) throw new HttpError(503,'Les demandes sont temporairement suspendues. Réessayez plus tard.');
    const body=await bodyJSON(request);await limit(req);
    if(body.website || !validToken(body.formToken)) throw new HttpError(400,'La demande n’a pas été validée. Patientez quelques secondes puis réessayez.');
    const lead=validateLead(body,{investorsEnabled:settings.investorsEnabled,valuationEnabled:valuationReady(config.valuation)});
    const result=(await store.record(lead));
    if(ctx?.waitUntil)ctx.waitUntil(flushEmails());
    return send(201,{ok:true,...result,notification:'queued'});
   }
   if(path.startsWith('/api/private/')) {
    auth(req);
    if(req.method==='GET' && path==='/api/private/status') return send(200,{paused:(await store.paused()),missing:readiness(config),investorsEnabled:settings.investorsEnabled,valuationEnabled:valuationReady(config.valuation),pendingNotifications:(await store.db.prepare("SELECT count(*) AS n FROM outbox WHERE status IN ('pending','failed')").get()).n});
    if(req.method==='POST' && path==='/api/private/pause') {const b=await bodyJSON(request);if(typeof b.paused!=='boolean') throw new HttpError(400,'paused doit être un booléen.');(await store.pause(b.paused));return send(200,{paused:(await store.paused())});}
    if(req.method==='GET' && path==='/api/private/leads') {
     const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||50)),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
     return send(200,{items:(await store.list({limit,offset})),limit,offset});
    }
    if(req.method==='GET' && path==='/api/private/export.csv') {
     const rows=(await store.db.prepare('SELECT * FROM leads ORDER BY created').all());
     const keys=['id','kind','contact','created','updated','status','owner','next_action','next_at','payload'];
     return send(200,'\uFEFF'+[keys.join(';'),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(';'))].join('\r\n'),'text/csv; charset=utf-8',{'Content-Disposition':'attachment; filename="contacts-new-wave.csv"'});
    }
    if(req.method==='POST' && path==='/api/private/notifications/retry') return send(200,await flushEmails());
    if(req.method==='POST' && path==='/api/private/suppressions') {
     const b=await bodyJSON(request),c=clean(b.contact,254);if(!(emailOK(c)||phoneOK(c))) throw new HttpError(400,'Contact invalide.');
     const contact=normalizeContact(c);(await store.suppress(contact));(await store.db.prepare("UPDATE prospects SET stage='opposed',updated=? WHERE contact=?").run(new Date().toISOString(),contact));return send(200,{ok:true});
    }
    if(req.method==='GET' && path==='/api/private/prospects') {
     const items=(await store.db.prepare('SELECT * FROM prospects ORDER BY created DESC LIMIT 200').all()).map(x=>({...x,payload:JSON.parse(x.payload)}));return send(200,{items});
    }
    if(req.method==='POST' && path==='/api/private/prospects') {
     if((await store.paused())) throw new HttpError(503,'Prospection suspendue.');
     const b=await bodyJSON(request),audience=clean(b.audience),contact=clean(b.contact,254);
     if(!['seller','investor','referrer'].includes(audience) || !clean(b.name) || !(emailOK(contact)||phoneOK(contact)) || !Array.isArray(b.sources) || !b.sources.length) throw new HttpError(400,'Précisez le public, le nom, un contact et les sources.');
     const normalized=normalizeContact(contact);
     if((await store.suppressed(normalized))) throw new HttpError(409,'Contact opposé : aucune sollicitation.');
     const sources=b.sources.slice(0,10).map(s=>{try {const u=new URL(s.url);if(!['https:','http:'].includes(u.protocol)||!clean(s.evidence,1000))throw new Error();return {url:u.href,evidence:clean(s.evidence,1000),checkedAt:clean(s.checkedAt,40)};}catch{throw new HttpError(400,'Chaque source doit comporter une URL et un élément vérifiable.');}});
     const existing=(await store.db.prepare('SELECT id FROM prospects WHERE audience=? AND contact=?').get(audience,normalized));
     if(existing) return send(200,{id:existing.id,duplicate:true});
     const id=randomBytes(16).toString('hex'),now=new Date().toISOString(),payload={name:clean(b.name),company:clean(b.company),sources,notes:clean(b.notes,2000),interest:'unknown',ticket:clean(b.ticket),ticketEvidence:'unverified',contactBasis:clean(b.contactBasis,500)};
     (await store.db.prepare('INSERT INTO prospects VALUES(?,?,?,?,?,?,?)').run(id,audience,normalized,JSON.stringify(payload),'identified',now,now));return send(201,{id,stage:'identified'});
    }
    const prospectMatch=path.match(/^\/api\/private\/prospects\/([a-f0-9]{32})$/);
    if(prospectMatch && req.method==='DELETE') {(await store.db.prepare('DELETE FROM prospects WHERE id=?').run(prospectMatch[1]));return send(200,{ok:true});}
    if(prospectMatch && req.method==='PATCH') {
     const id=prospectMatch[1],row=(await store.db.prepare('SELECT * FROM prospects WHERE id=?').get(id));if(!row) throw new HttpError(404,'Prospect introuvable.');
     const b=await bodyJSON(request),stage=clean(b.stage),note=clean(b.note,2000);
     if(!['identified','reviewed','contacted','replied','interested','meeting','declined','opposed','closed'].includes(stage)||!note) throw new HttpError(400,'Précisez un statut et la preuve ou le motif de la transition.');
     if((await store.suppressed(row.contact)) && stage!=='opposed') throw new HttpError(409,'Contact opposé.');
     (await store.db.prepare('UPDATE prospects SET stage=?,updated=? WHERE id=?').run(stage,new Date().toISOString(),id));
     (await store.db.prepare('INSERT INTO prospect_events(prospect_id,at,payload) VALUES(?,?,?)').run(id,new Date().toISOString(),JSON.stringify({stage,note})));
     if(stage==='opposed')(await store.suppress(row.contact));
     return send(200,{id,stage});
    }
    const match=path.match(/^\/api\/private\/leads\/([a-f0-9-]{36})$/);
    if(match) {
     if(req.method==='GET') {const row=(await store.get(match[1]));if(!row)throw new HttpError(404,'Contact introuvable.');return send(200,row);}
     if(req.method==='PATCH') return send(200,(await store.update(match[1],await bodyJSON(request))));
     if(req.method==='DELETE') {(await store.remove(match[1]));return send(200,{ok:true});}
    }
    throw new HttpError(404,'Route privée inconnue.');
   }
   if(req.method!=='GET' && req.method!=='HEAD') throw new HttpError(405,'Méthode non autorisée.');
   const assets={'/scaffold.js':['scaffold.js','text/javascript'],'/scaffold-scenes.js':['scaffold-scenes.js','text/javascript'],'/scaffold-scroll.js':['scaffold-scroll.js','text/javascript'],'/scaffold.css':['scaffold.css','text/css'],'/favicon.svg':['favicon.svg','image/svg+xml'],'/favicon.ico':['favicon.svg','image/svg+xml'],'/site.css':['site.css','text/css'],'/app.js':['app.js','text/javascript'],'/visuals.js':['visuals.js','text/javascript'],'/fonts.css':['fonts.css','text/css'],'/suivi.js':['suivi.js','text/javascript']};
   if(assets[path]) {const [file,type]=assets[path];return send(200,await asset(file),type+'; charset=utf-8',{'Cache-Control':'public,max-age=3600'});}
   if(/^\/fonts\/[a-z0-9-]+\.(?:woff2|ttf)$/.test(path)) {
    return assetResponse(path);
   }
   if(path==='/suivi') return send(200,await asset('suivi.html'),'text/html; charset=utf-8');
   if(path==='/robots.txt') return send(200,settings.publicReady?`User-agent: *\nDisallow: /api/\nDisallow: /suivi\nDisallow: /merci\nDisallow: /investir\nSitemap: ${settings.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain');
   if(path==='/sitemap.xml') return send(200,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(settings.publicReady?Object.keys(routes).filter(p=>!['/merci','/investir'].includes(p)).map(p=>`<url><loc>${settings.origin}${p}</loc></url>`).join(''):'')+'</urlset>','application/xml');
   if(path==='/criteres.txt') return send(200,`New Wave Acquisition\nZone : ${config.criteria.region}\nMétiers : ${config.criteria.sectors.join(', ')}\nRentabilité et autonomie à examiner sur pièces.\nTaille : ${config.criteria.revenueMin ?? 'au cas par cas'} à ${config.criteria.revenueMax ?? 'au cas par cas'} euros de CA.\nPrésentation d’un dossier avec l’accord du dirigeant.\n`,'text/plain; charset=utf-8');
   const {html,status}=render(path,config,settings,await assetText('template.html'));return send(status,html,'text/html; charset=utf-8',{'X-Robots-Tag':settings.publicReady&&status===200&&!['/merci','/investir'].includes(path)?'index, follow':'noindex'});
  }catch(error) {return send(error.status || 500,{error:error.status?error.message:'La demande n’a pas abouti. Votre saisie est conservée ; réessayez plus tard.'});}
}
export default {fetch:handle,async scheduled(controller,env,ctx){ctx.waitUntil((async()=>{await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Date.now()).run();await flushD1Emails(env);})());}};
