import { configuration } from './worker.mjs';
export async function flushD1Emails(env,provider=fetch){
 const db=env.DB;
 if(!env.EMAIL_API_KEY||!env.EMAIL_FROM||!env.NOTIFY_EMAIL)return {sent:0,configured:false};
 if((await db.prepare("SELECT value FROM settings WHERE key='paused'").first())?.value==='true')return {sent:0,configured:true,paused:true};
 await db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES ('mail_lock','0')").run();
 const now=Date.now(),lease=String(now+600000);
 const lock=await db.prepare("UPDATE settings SET value=? WHERE key='mail_lock' AND CAST(value AS INTEGER)<?").bind(lease,now).run();
 if(!lock.meta.changes)return {sent:0,configured:true,busy:true};
 let sent=0;
 try{
  const {config}=configuration(env);
  const rows=(await db.prepare("SELECT id,lead_id,payload FROM outbox WHERE status IN ('pending','failed') AND attempts<3 ORDER BY id LIMIT 5").all()).results;
  for(const row of rows){
   const lead=JSON.parse(row.payload);
   if(await db.prepare('SELECT 1 FROM suppressions WHERE contact=?').bind(lead.contact).first()){
    await db.prepare("UPDATE outbox SET status='cancelled' WHERE id=?").bind(row.id).run();continue;
   }
   const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
   const usage=await db.prepare('SELECT COALESCE(SUM(count),0) AS total, COALESCE(SUM(CASE WHEN day=? THEN count ELSE 0 END),0) AS today FROM mail_budget WHERE day LIKE ?').bind(day,month+'%').first();
   // Count attempts conservatively, including errors, to stay below Free quotas.
   if(usage.today>=90||usage.total>=2900)return {sent,configured:true,quotaPaused:true};
   await db.prepare('INSERT INTO mail_budget(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').bind(day).run();
   try{
    const body=lead.delivery==='receipt'?{from:env.EMAIL_FROM,to:[lead.contact],...(config.email?{reply_to:config.email}:{}),subject:'Votre demande a été reçue — New Wave Acquisition',text:'Votre demande a été enregistrée. Nous vous recontacterons au sujet de votre projet. Aucun engagement ne résulte de cette demande. Pour corriger vos informations ou vous opposer au suivi, répondez à ce message.'}:{from:env.EMAIL_FROM,to:[env.NOTIFY_EMAIL],...(lead.contact.includes('@')?{reply_to:lead.contact}:{}),subject:'[New Wave] Demande — '+lead.kind+' — '+lead.firstName,text:JSON.stringify(lead,null,2)};
    const result=await provider(env.EMAIL_API_URL||'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+env.EMAIL_API_KEY,'Content-Type':'application/json','Idempotency-Key':'lead-'+row.lead_id+'-'+row.id},body:JSON.stringify(body)});
    if(result.status===429)return {sent,configured:true,quotaPaused:true};
    if(!result.ok)throw new Error('provider-'+result.status);
    await db.batch([db.prepare("UPDATE outbox SET status='sent',attempts=attempts+1,error='' WHERE id=?").bind(row.id),db.prepare('INSERT INTO events(lead_id,at,type,payload) VALUES(?,?,?,?)').bind(row.lead_id,new Date().toISOString(),'notification_sent',JSON.stringify({delivery:lead.delivery}))]);sent++;
   }catch(error){await db.prepare("UPDATE outbox SET status='failed',attempts=attempts+1,error=? WHERE id=?").bind(String(error.message).slice(0,200),row.id).run();}
  }
  return {sent,configured:true};
 }finally{await db.prepare("UPDATE settings SET value='0' WHERE key='mail_lock' AND value=?").bind(lease).run();}
}
