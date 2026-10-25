import { HttpError } from '../lib/domain.mjs';
export function openD1(binding) {
 const statement=(sql,args)=>binding.prepare(sql).bind(...args);
 const db={prepare:sql=>({get:(...args)=>statement(sql,args).first(),all:async(...args)=>(await statement(sql,args).all()).results,run:(...args)=>statement(sql,args).run()})};
 const eventStatement=(id,type,payload={})=>statement('INSERT INTO events(lead_id,at,type,payload) VALUES(?,?,?,?)',[id,new Date().toISOString(),type,JSON.stringify(payload)]);
 const event=(id,type,payload={})=>eventStatement(id,type,payload).run();
 const store={db,event,
  async paused(){return (await db.prepare("SELECT value FROM settings WHERE key='paused'").get())?.value==='true';},
  pause:value=>db.prepare("INSERT INTO settings(key,value) VALUES('paused',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(value)),
  suppressed:async contact=>!!await db.prepare('SELECT 1 FROM suppressions WHERE contact=?').get(contact),
  async record(lead){
   if(await this.suppressed(lead.contact))throw new HttpError(409,'Ce contact est opposé aux sollicitations. Contactez-nous pour modifier votre demande.');
   const now=new Date().toISOString();
   const previous=await db.prepare('SELECT id FROM leads WHERE contact=? AND kind=? AND created>? ORDER BY created DESC LIMIT 1').get(lead.contact,lead.kind,new Date(Date.now()-30*86400000).toISOString());
   if(previous){await binding.batch([eventStatement(previous.id,'repeat',lead),statement('UPDATE leads SET payload=?,updated=? WHERE id=?',[JSON.stringify(lead),now,previous.id])]);return {id:previous.id,duplicate:true};}
   const id=crypto.randomUUID();
   const batch=[statement('INSERT INTO leads(id,kind,contact,created,updated,payload) VALUES(?,?,?,?,?,?)',[id,lead.kind,lead.contact,now,now,JSON.stringify(lead)]),eventStatement(id,'created',lead),statement('INSERT INTO outbox(lead_id,payload) VALUES(?,?)',[id,JSON.stringify({...lead,delivery:'internal'})])];
   if(lead.contact.includes('@'))batch.push(statement('INSERT INTO outbox(lead_id,payload) VALUES(?,?)',[id,JSON.stringify({delivery:'receipt',contact:lead.contact,kind:lead.kind})]));
   await binding.batch(batch);return {id,duplicate:false};
  },
  async list({limit=50,offset=0}={}){return (await db.prepare('SELECT * FROM leads ORDER BY updated DESC LIMIT ? OFFSET ?').all(limit,offset)).map(x=>({...x,payload:JSON.parse(x.payload)}));},
  async get(id){const row=await db.prepare('SELECT * FROM leads WHERE id=?').get(id);return row?{...row,payload:JSON.parse(row.payload),events:(await db.prepare('SELECT * FROM events WHERE lead_id=? ORDER BY id').all(id)).map(x=>({...x,payload:JSON.parse(x.payload)}))}:null;},
  async update(id,patch){
   const row=await this.get(id);if(!row)throw new HttpError(404,'Contact introuvable.');
   const status=patch.status??row.status;
   if(!['new','qualifying','qualified','meeting','waiting','replied','declined','opposed','closed'].includes(status))throw new HttpError(400,'Statut inconnu.');
   await binding.batch([statement('UPDATE leads SET status=?,owner=?,next_action=?,next_at=?,updated=? WHERE id=?',[status,String(patch.owner??row.owner).slice(0,100),String(patch.nextAction??row.next_action).slice(0,500),String(patch.nextAt??row.next_at).slice(0,40),new Date().toISOString(),id]),eventStatement(id,'updated',patch)]);
   if(status==='opposed')await this.suppress(row.contact);return this.get(id);
  },
  async suppress(contact){await binding.batch([statement('INSERT OR IGNORE INTO suppressions VALUES(?,?)',[contact,new Date().toISOString()]),statement("UPDATE leads SET status='opposed',next_action='',next_at='' WHERE contact=?",[contact]),statement("UPDATE outbox SET status='cancelled' WHERE lead_id IN (SELECT id FROM leads WHERE contact=?) AND status IN ('pending','failed')",[contact])]);},
  remove:id=>db.prepare('DELETE FROM leads WHERE id=?').run(id)
 };
 return store;
}
