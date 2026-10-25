import { visuals } from './visuals.js';
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
visuals();
const active=document.querySelector('.view.active');
if(location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
const tokenPromise=fetch('/api/form-token').then(r=>{if(!r.ok)throw Error();return r.json();});
// A catch is installed immediately so a network failure never causes an unhandled rejection.
tokenPromise.catch(()=>{});
const configPromise=fetch('/api/config').then(r=>{if(!r.ok)throw Error();return r.json();});configPromise.catch(()=>{});
const mail=v=>/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v);
const tel=v=>/^(?:\+33|0033|0)[1-9]\d{8}$/.test(v.replace(/[\s.()\-]/g,''));
function fieldError(input,message) {
 input.setAttribute('aria-invalid',message?'true':'false');
 let node=$(input.id+'-err');
 if(!node) {node=document.createElement('p');node.id=input.id+'-err';node.className='err';input.after(node);input.setAttribute('aria-describedby',node.id);}
 node.textContent=message;node.hidden=!message;
 return !message;
}
function checkName(input) {return fieldError(input,input.value.trim()?'':'Indiquez votre prénom.');}
function checkContact(input) {return fieldError(input,mail(input.value.trim())||tel(input.value.trim())?'':'Indiquez un e-mail complet ou un téléphone français à 10 chiffres.');}
function status(form,text,error=false) {
 let node=form.querySelector('.form-status');
 if(!node){node=document.createElement('p');node.className='form-status';node.setAttribute('aria-live','polite');form.append(node);}
 node.textContent=text;node.classList.toggle('err',error);return node;
}
for(const form of document.querySelectorAll('form')) {
 const trap=document.createElement('label');trap.className='trap';trap.setAttribute('aria-hidden','true');trap.innerHTML='Votre site web<input name="website" tabindex="-1" autocomplete="off">';form.append(trap);
 form.querySelectorAll('input,textarea').forEach(i=>{i.maxLength=i.tagName==='TEXTAREA'?3000:i.maxLength>0?i.maxLength:254;});
 form.addEventListener('submit',e=>e.preventDefault());
}
async function submit(form,payload,button) {
 if(form.dataset.pending==='true')return null;
 form.dataset.pending='true';if(button)button.disabled=true;status(form,'Enregistrement en cours…');
 try {
  const {token}=await tokenPromise;
  const result=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({...payload,formToken:token,website:form.querySelector('[name="website"]')?.value || '',page:location.pathname,source:new URLSearchParams(location.search).get('source') || 'site'})});
  const body=await result.json();
  if(!result.ok)throw Error(body.error || 'Votre demande n’a pas pu être enregistrée.');
  status(form,'Votre demande a été enregistrée.');return body;
 }catch(error) {status(form,error.name==='TimeoutError'?'Le serveur tarde à répondre. Votre saisie est conservée ; réessayez.':error.message==='Failed to fetch'?'La connexion a été interrompue. Votre saisie est conservée ; réessayez.':error.message || 'Impossible de joindre le service. Réessayez.',true);return null;}
 finally {form.dataset.pending='false';if(button)button.disabled=false;}
}
document.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{if(i.getAttribute('aria-invalid')==='true')fieldError(i,'');}));
// Contact in four steps, with persistence before confirmation.
const lead=$('lead'),steps=[...lead.querySelectorAll('.fstep')],bars=[...lead.querySelectorAll('.steps div')];let step=0;
const referrer=new URLSearchParams(location.search).get('public')==='prescripteur';
function renderStep(focus=false) {
 steps.forEach((x,i)=>{x.classList.toggle('on',i===step);x.hidden=i!==step;});
 bars.forEach((x,i)=>x.className=i<step?'on':i===step?'cur':'');
 $('step-l').textContent=`Étape ${step+1} / 4`;$('prev').style.visibility=step===0?'hidden':'visible';$('next').textContent=step===3?'Envoyer ma demande':'Continuer';
 if(focus){steps[step].querySelector('h2').focus();lead.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}
}
$('prev').addEventListener('click',()=>{if(step>0){step--;renderStep(true);}});
$('next').addEventListener('click',async()=>{
 if(step===0){const ok=!!lead.querySelector('[name="horizon"]:checked');$('e-horizon').hidden=ok;if(!ok)return;}
 if(step===2){const a=checkName($('c-prenom')),b=checkContact($('c-contact'));if(!a||!b){(!a?$('c-prenom'):$('c-contact')).focus();return;}}
 if(step<3){step++;renderStep(true);return;}
 const horizons={h1:'discovery',h2:'1-3-years',h3:'this-year'};
 const result=await submit(lead,{kind:referrer?'referrer':'seller',firstName:$('c-prenom').value,contact:$('c-contact').value,horizon:horizons[lead.querySelector('[name="horizon"]:checked')?.id],trade:$('c-metier').value,department:$('c-dep').value,employees:$('c-eff').value,revenue:$('c-ca').value,slot:$('c-creneau').value,company:$('c-anon').checked?$('c-nom').value:'',message:$('c-msg').value,newsletter:$('c-news').checked},$('next'));
 if(result)location.assign('/merci');
});
lead.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&!['checkbox','radio'].includes(e.target.type)){e.preventDefault();$('next').click();}});
lead.querySelectorAll('[name="horizon"]').forEach(i=>i.addEventListener('change',()=>$('e-horizon').hidden=true));
$('c-anon').addEventListener('change',()=>$('c-nom-wrap').hidden=!$('c-anon').checked);
$('c-contact').addEventListener('input',()=>$('c-creneau-wrap').hidden=!tel($('c-contact').value));
renderStep();
// The diagnostic never submits its ten answers without the separate checkbox.
$('d-gate').addEventListener('submit',async e=>{
 e.preventDefault();
 const answers=Array.from({length:10},(_,i)=>document.querySelector(`[name="dq${i}"]:checked`)).filter(Boolean).map(x=>Number(x.value));
 if(answers.length!==10){status($('d-gate'),'Répondez aux dix questions avant de demander vos chantiers.',true);return;}
 const a=checkName($('d-gate-prenom')),b=checkContact($('d-gate-contact'));if(!a||!b){(!a?$('d-gate-prenom'):$('d-gate-contact')).focus();return;}
 const share=$('d-share').checked;
 const result=await submit($('d-gate'),{kind:'diagnostic',firstName:$('d-gate-prenom').value,contact:$('d-gate-contact').value,score:answers.reduce((a,b)=>a+b,0),shareDetails:share,...(share?{answers}:{})},$('d-gate').querySelector('[type="submit"]'));
 if(result){$('d-blur').classList.remove('blur');$('d-blur').removeAttribute('aria-hidden');$('d-gate').hidden=true;$('d-next').hidden=false;$('d-actions').tabIndex=-1;$('d-actions').focus();}
});
$('d-blur').setAttribute('aria-hidden','true');
if($('club-form')) $('club-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=$('club-form');
 const a=checkName($('k-prenom')),em=$('k-mail').value.trim(),ph=$('k-tel').value.trim();
 const b=fieldError($('k-mail'),em&&!mail(em)?'Vérifiez l’adresse e-mail.':''),c=fieldError($('k-tel'),ph&&!tel(ph)?'Vérifiez le téléphone.':'');
 const missing=[];if(!mail(em)&&!tel(ph))missing.push('un e-mail ou un téléphone');
 for(const [id,label]of [['k-ticket','le ticket'],['k-profil','le profil'],['k-part','la part du patrimoine']])if(!$(id).value)missing.push(label);
 if(!$('k-propre').checked)missing.push('la case « pour mon propre compte »');if(!$('k-risque').checked)missing.push('la lecture des risques');
 $('k-err').textContent=missing.length?'Précisez '+missing.join(', ')+'.':'';$('k-err').hidden=!missing.length;
 if(!a||!b||!c||missing.length)return;
 const result=await submit(form,{kind:'investor',firstName:$('k-prenom').value,lastName:$('k-nom').value,contact:em||ph,...(em&&ph?{alternateContact:ph}:{}),ticket:$('k-ticket').value,profile:$('k-profil').value,wealthShare:$('k-part').value,ownAccount:$('k-propre').checked,risksAccepted:$('k-risque').checked,newsletter:$('k-lettre').checked},$('k-send'));
 if(result){$('k-ok').hidden=false;$('k-send').hidden=true;$('k-ok').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});}
});
if($('valuation')) $('valuation').addEventListener('submit',async e=>{
 e.preventDefault();const form=$('valuation');let valid=true;const figures={};
 for(const key of ['revenue','ebe','remuneration','excessCash','debt']){
  const i=$('v-'+key),raw=i.value.trim().replace(/[\s\u00a0\u202f]/g,'').replace('−','-');
  const ok=/^-?\d{1,11}$/.test(raw)&&(key==='ebe'||Number(raw)>=0);valid=fieldError(i,ok?'':'Indiquez un montant en euros entiers, sans lettres ni décimales.')&&valid;figures[key]=Number(raw);
 }
 valid=checkName($('v-firstName'))&&valid;valid=checkContact($('v-lead-contact'))&&valid;if(!valid)return;
 let config;try{config=await configPromise;}catch {status(form,'Impossible de charger les règles de calcul. Réessayez.',true);return;}
 const rules=config.valuation,m=rules?.multiples?.[$('v-trade').value];if(!m){status(form,'L’estimation n’est pas disponible pour ce métier.',true);return;}
 const share=$('v-share').checked,result=await submit(form,{kind:'valuation',firstName:$('v-firstName').value,contact:$('v-lead-contact').value,trade:$('v-trade').value,shareDetails:share,...(share?{figures}:{})},form.querySelector('[type="submit"]'));
 if(!result)return;
 const adjusted=figures.ebe+figures.remuneration-rules.replacementCostLoaded;
 const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Math.round(n/10000)*10000);
 const low=Math.max(0,adjusted*m[0]+figures.excessCash-figures.debt),high=Math.max(0,adjusted*m[1]+figures.excessCash-figures.debt);
 const box=$('valuation-result');box.replaceChildren();
 const range=document.createElement('p');range.className='range-num';range.textContent=figures.ebe<=0||adjusted<=0||high<=0?'À discuter':money(low)+' – '+money(high);box.append(range);
 for(const text of [`EBE déclaré : ${figures.ebe.toLocaleString('fr-FR')} €`,`Rémunération réintégrée : ${figures.remuneration.toLocaleString('fr-FR')} €`,`Coût chargé de remplacement : ${rules.replacementCostLoaded.toLocaleString('fr-FR')} €`,`EBE retraité : ${adjusted.toLocaleString('fr-FR')} €`,`Trésorerie excédentaire moins dettes : ${(figures.excessCash-figures.debt).toLocaleString('fr-FR')} €`]){const p=document.createElement('p');p.textContent=text;box.append(p);}
 box.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
});
