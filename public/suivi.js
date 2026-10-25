const $=id=>document.getElementById(id);let key='',paused=false;
const names={seller:'Cédant',investor:'Investisseur',diagnostic:'Diagnostic',valuation:'Estimation',referrer:'Prescripteur'};
const stages={new:'Nouvelle demande',qualifying:'À qualifier',qualified:'Qualifié',meeting:'Rendez-vous',waiting:'En attente',replied:'Réponse reçue',declined:'Refus',opposed:'Opposition',closed:'Clos'};
const prospectStages={identified:'Identifié',reviewed:'Vérifié',contacted:'Contacté',replied:'Réponse reçue',interested:'Intérêt déclaré',meeting:'Rendez-vous',declined:'Refus',opposed:'Opposition',closed:'Clos'};
function el(tag,text,parent){const node=document.createElement(tag);if(text!=null)node.textContent=text;parent?.append(node);return node;}
async function api(path,options={}) {
 const r=await fetch('/api/private/'+path,{...options,headers:{Authorization:'Bearer '+key,...(options.body?{'Content-Type':'application/json'}:{})}});
 if(!r.ok){const b=await r.json();throw Error(b.error);}
 return r;
}
function status(text){$('status').textContent=text;}
async function guarded(fn){try{await fn();}catch(e){status(e.message || 'La connexion a échoué. Réessayez.');}}
function table(parent,headers){parent.replaceChildren();const t=el('table',null,parent),head=el('thead',null,t),row=el('tr',null,head);headers.forEach(h=>{const th=el('th',h,row);th.scope='col';});return el('tbody',null,t);}
async function reload(){
 const [s,l,p]=await Promise.all([api('status').then(r=>r.json()),api('leads?limit=200').then(r=>r.json()),api('prospects').then(r=>r.json())]);
 paused=s.paused;$('pause').textContent=paused?'Reprendre les demandes':'Suspendre les demandes';
 $('configuration').textContent=`${paused?'Demandes suspendues. ':'Demandes actives. '}Notifications en attente : ${s.pendingNotifications}. ${s.missing.length?'Configuration publique à compléter : '+s.missing.join(', ')+'.':'Configuration publique renseignée.'}`;
 const rows=table($('leads'),['Contact','Origine et informations','Suivi','Prochaine action']);
 if(!l.items.length){const row=el('tr',null,rows);el('td','Aucune demande reçue.',row).colSpan=4;}
 for(const item of l.items){
  const row=el('tr',null,rows),who=el('td',null,row);el('b',item.payload.firstName,who);el('p',item.contact,who);el('small',new Date(item.created).toLocaleString('fr-FR'),who);
  const info=el('td',null,row);el('b',names[item.kind] || item.kind,info);for(const [k,v] of Object.entries(item.payload.details||{}))if(!['answers','figures'].includes(k))el('p',`${k} : ${v}`,info);
  const control=el('td',null,row),select=el('select',null,control);select.setAttribute('aria-label','Statut de '+item.payload.firstName);
  for(const [value,label]of Object.entries(stages)){const opt=el('option',label,select);opt.value=value;opt.selected=item.status===value;}
  select.addEventListener('change',()=>guarded(async()=>{await api('leads/'+item.id,{method:'PATCH',body:JSON.stringify({status:select.value})});status('Statut enregistré.');await reload();}));
  const next=el('td',null,row),owner=el('input',null,next),action=el('input',null,next),date=el('input',null,next);owner.value=item.owner;owner.placeholder='Responsable';owner.setAttribute('aria-label','Responsable');action.value=item.next_action;action.placeholder='Prochaine action';action.setAttribute('aria-label','Prochaine action');date.type='date';date.value=item.next_at;date.setAttribute('aria-label','Échéance');
  const save=el('button','Enregistrer',next);save.className='cta ghost small';save.addEventListener('click',()=>guarded(async()=>{await api('leads/'+item.id,{method:'PATCH',body:JSON.stringify({owner:owner.value,nextAction:action.value,nextAt:date.value})});status('Suivi enregistré.');}));
 }
 const pr=table($('prospects'),['Contact','Sources','État de la relation']);
 if(!p.items.length){const row=el('tr',null,pr);el('td','Aucun prospect identifié.',row).colSpan=3;}
 for(const item of p.items){
  const row=el('tr',null,pr),who=el('td',null,row);el('b',item.payload.name,who);el('p',item.contact,who);el('small',names[item.audience]||item.audience,who);
  const source=el('td',null,row);for(const s of item.payload.sources){const link=el('a',new URL(s.url).hostname,source);link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';el('p',s.evidence,source);}
  el('td',prospectStages[item.stage]||item.stage,row);
 }
 $('workspace').hidden=false;status(`${l.items.length} demande(s), ${p.items.length} prospect(s) affichés.`);
}
$('login').addEventListener('submit',e=>{e.preventDefault();key=$('token').value;$('token').value='';guarded(reload);});
$('reload').addEventListener('click',()=>guarded(reload));
$('pause').addEventListener('click',()=>guarded(async()=>{await api('pause',{method:'POST',body:JSON.stringify({paused:!paused})});await reload();}));
$('export').addEventListener('click',()=>guarded(async()=>{const data=await(await api('export.csv')).blob(),url=URL.createObjectURL(data),a=el('a');a.href=url;a.download='contacts-new-wave.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Export préparé.');}));
$('logout').addEventListener('click',()=>{key='';$('workspace').hidden=true;$('leads').replaceChildren();$('prospects').replaceChildren();status('Suivi fermé.');});
