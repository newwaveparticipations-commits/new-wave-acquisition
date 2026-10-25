import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { HttpError } from './domain.mjs';
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, kind TEXT NOT NULL, contact TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', owner TEXT NOT NULL DEFAULT '', next_action TEXT NOT NULL DEFAULT '', next_at TEXT NOT NULL DEFAULT '', payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS leads_contact ON leads(contact);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE, at TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS suppressions(contact TEXT PRIMARY KEY, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY, lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO settings VALUES ('paused','false');`);
  const event = (id,type,payload={}) => db.prepare('INSERT INTO events(lead_id,at,type,payload) VALUES(?,?,?,?)').run(id,new Date().toISOString(),type,JSON.stringify(payload));
  return {
    db, close: () => db.close(),
    get paused() { return db.prepare("SELECT value FROM settings WHERE key='paused'").get().value === 'true'; },
    pause(value) { db.prepare("UPDATE settings SET value=? WHERE key='paused'").run(String(value)); },
    suppressed(contact) { return !!db.prepare('SELECT 1 FROM suppressions WHERE contact=?').get(contact); },
    record(lead) {
      if (this.suppressed(lead.contact)) throw new HttpError(409, 'Ce contact est opposé aux sollicitations. Contactez-nous pour modifier votre demande.');
      const now=new Date().toISOString();
      const previous=db.prepare('SELECT * FROM leads WHERE contact=? AND kind=? AND created>? ORDER BY created DESC LIMIT 1').get(lead.contact,lead.kind,new Date(Date.now()-30*86400000).toISOString());
      if (previous) {
        event(previous.id,'repeat',lead);
        db.prepare('UPDATE leads SET payload=?,updated=? WHERE id=?').run(JSON.stringify(lead),now,previous.id);
        return { id:previous.id, duplicate:true };
      }
      const id=randomUUID();
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO leads(id,kind,contact,created,updated,payload) VALUES(?,?,?,?,?,?)').run(id,lead.kind,lead.contact,now,now,JSON.stringify(lead));
        event(id,'created',lead);
        db.prepare('INSERT INTO outbox(lead_id,payload) VALUES(?,?)').run(id,JSON.stringify({...lead,delivery:'internal'}));
        if(lead.contact.includes('@')) db.prepare('INSERT INTO outbox(lead_id,payload) VALUES(?,?)').run(id,JSON.stringify({delivery:'receipt',contact:lead.contact,kind:lead.kind}));
        db.exec('COMMIT');
      } catch(e) { db.exec('ROLLBACK'); throw e; }
      return { id,duplicate:false };
    },
    list({limit=50,offset=0}={}) { return db.prepare('SELECT * FROM leads ORDER BY updated DESC LIMIT ? OFFSET ?').all(limit,offset).map(x=>({...x,payload:JSON.parse(x.payload)})); },
    get(id) { const row=db.prepare('SELECT * FROM leads WHERE id=?').get(id); return row ? {...row,payload:JSON.parse(row.payload),events:db.prepare('SELECT * FROM events WHERE lead_id=? ORDER BY id').all(id).map(x=>({...x,payload:JSON.parse(x.payload)}))} : null; },
    update(id,patch) {
      const row=this.get(id); if(!row) throw new HttpError(404,'Contact introuvable.');
      const status=patch.status ?? row.status;
      if(!['new','qualifying','qualified','meeting','waiting','replied','declined','opposed','closed'].includes(status)) throw new HttpError(400,'Statut inconnu.');
      db.prepare('UPDATE leads SET status=?,owner=?,next_action=?,next_at=?,updated=? WHERE id=?').run(status,String(patch.owner ?? row.owner).slice(0,100),String(patch.nextAction ?? row.next_action).slice(0,500),String(patch.nextAt ?? row.next_at).slice(0,40),new Date().toISOString(),id);
      if(status==='opposed') this.suppress(row.contact);
      event(id,'updated',patch); return this.get(id);
    },
    suppress(contact) {
      db.prepare('INSERT OR IGNORE INTO suppressions VALUES(?,?)').run(contact,new Date().toISOString());
      db.prepare("UPDATE leads SET status='opposed',next_action='',next_at='' WHERE contact=?").run(contact);
      db.prepare("UPDATE outbox SET status='cancelled' WHERE lead_id IN (SELECT id FROM leads WHERE contact=?) AND status IN ('pending','failed')").run(contact);
    },
    remove(id) { db.prepare('DELETE FROM leads WHERE id=?').run(id); },
    event
  };
}
