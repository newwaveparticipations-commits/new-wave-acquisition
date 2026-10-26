import {mountScrollScaffold} from './scaffold-scroll.js?v=20261026';
export function visuals(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const update=mountScrollScaffold();

  const DQ=[
    ['Si vous partez trois semaines, l\'entreprise tourne-t-elle ?',['Oui, sans moi','Oui, avec des appels','Non'],'Déléguer : nommer un bras droit et lui confier une partie des décisions.'],
    ['Qui chiffre les devis ?',['Plusieurs personnes','Surtout moi, un salarié aide','Moi seul'],'Former un salarié au chiffrage des devis.'],
    ['Votre plus gros client représente…',['Moins de 15 % du chiffre','15 à 30 %','Plus de 30 %'],'Réduire la dépendance à votre premier client.'],
    ['Vos qualifications (RGE, Qualibat) reposent sur…',['Plusieurs personnes','Un salarié','Moi seul'],'Faire porter vos qualifications par un salarié.'],
    ['Votre carnet de commandes couvre…',['Plus de 4 mois','2 à 4 mois','Moins de 2 mois'],'Regarnir le carnet : un repreneur achète aussi de la visibilité.'],
    ['Sur les trois derniers exercices, l\'entreprise a été rentable…',['3 années sur 3','2 sur 3','1 ou aucune'],'Faire le point avec votre comptable sur la rentabilité.'],
    ['Vos salariés clés ont-ils l\'intention de rester ?',['Oui, ils me l\'ont dit','Je pense','Je ne sais pas'],'Sécuriser vos salariés clés avant d\'annoncer la vente.'],
    ['Vos locaux…',['M\'appartiennent, prêts à être loués','Bail de plus de 3 ans restant','Bail court ou incertain'],'Sécuriser le bail ou préparer un bail pour le repreneur.'],
    ['Votre matériel et vos véhicules…',['Sont à jour','Quelques achats à prévoir','Sont à renouveler'],'Lister les investissements à prévoir : ils pèsent sur le prix.'],
    ['Vos documents (contrats, assurances, comptes)…',['Sont rangés et accessibles','Sont surtout chez le comptable','Sont dispersés'],'Rassembler vos documents dans un seul dossier.']
  ];
  const qs=document.getElementById('diag-qs');
  DQ.forEach((q,i)=>{
    const d=document.createElement('div'); d.className='q';
    d.innerHTML='<p class="qt"><span>'+String(i+1).padStart(2,'0')+'</span>'+q[0]+'</p><div class="opts">'+
      q[1].map((o,j)=>'<label class="opt"><input type="radio" name="dq'+i+'" id="dq'+i+'_'+j+'" value="'+(2-j)+'">'+o+'</label>').join('')+'</div>';
    qs.appendChild(d);
  });
  function diag(){
    let tot=0, n=0; const weak=[];
    DQ.forEach((q,i)=>{const c=document.querySelector('input[name="dq'+i+'"]:checked'); if(c){n++; const v=+c.value; tot+=v; if(v<2) weak.push([v,q[2]]);}});
    if(n===0){
      document.getElementById('d-score').innerHTML='—<small> / 20</small>';
      document.getElementById('d-bar').style.width='0';
      document.getElementById('d-level').textContent='Répondez aux questions';
      document.getElementById('d-desc').textContent='Le score se calcule au fil de vos réponses.';
      document.getElementById('d-actions').innerHTML='<li>Vos chantiers apparaîtront ici.</li><li>Selon vos réponses.</li><li>Trois au maximum.</li>';
      return;
    }
    document.getElementById('d-score').innerHTML=tot+'<small> / 20</small>';
    document.getElementById('d-bar').style.width=(tot/20*100)+'%';
    const lv=tot>=16?['Des bases à approfondir','Vos réponses indiquent plusieurs points favorables. Ils restent à confirmer lors d’un échange.']:tot>=10?['Transmissible avec préparation','Vos réponses font ressortir des points à préparer. Leur durée dépend de votre situation.']:['À préparer avant de vendre','L\'entreprise dépend encore beaucoup de vous. Commencez par les chantiers ci-dessous.'];
    // Le niveau n'est annoncé qu'une fois les dix réponses données : un score partiel le fausserait
    document.getElementById('d-level').textContent=n<10?'Encore '+(10-n)+' question'+(10-n>1?'s':''):lv[0];
    document.getElementById('d-desc').textContent=n<10?'Score provisoire ('+n+' réponse'+(n>1?'s':'')+' sur 10). Le niveau s\'affiche à la dernière réponse.':lv[1];
    weak.sort((a,b)=>a[0]-b[0]);
    const li=weak.slice(0,3).map(w=>'<li>'+w[1]+'</li>');
    document.getElementById('d-actions').innerHTML=li.length?li.join(''):'<li>Rien d\'urgent : parlons calendrier.</li>';
  }
  qs.addEventListener('change',diag); diag();


update();
}
