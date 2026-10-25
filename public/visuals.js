export function visuals(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---------- Échafaudage ---------- */
  const NS='http://www.w3.org/2000/svg';
  const svg=document.getElementById('scaf');
  const F=290, TOP=150, X0=78, X1=262, N=10;
  const y=k=>TOP+k*F;
  const xs=k=>k%2===0?X0:X1, xe=k=>k%2===0?X1:X0;
  const names=['Toit','P9 · Réflexion','P8 · Confidentialité','P7 · Évaluation','P6 · Rencontre','P5 · Offre','P4 · Audit','P3 · Financement','P2 · Signature','P1 · Relais','Sol'];
  function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e}
  const H=y(N)+200;
  svg.setAttribute('viewBox','0 0 380 '+H);
  const defs=el('defs',{});
  const pat=el('pattern',{id:'haz',width:16,height:16,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},defs);
  el('rect',{width:8,height:16,fill:'#FFC21A'},pat); el('rect',{x:8,width:8,height:16,fill:'#17191C'},pat);
  const rg=el('radialGradient',{id:'spot'},defs);
  el('stop',{offset:'0','stop-color':'#FFF8D9','stop-opacity':'.95'},rg); el('stop',{offset:'1','stop-color':'#FFF8D9','stop-opacity':'0'},rg);

  // Projecteur derrière les personnages
  const spot=el('ellipse',{rx:150,ry:170,fill:'url(#spot)'});
  // Contreventements en fond
  const back=el('g',{stroke:'#BDB9B0','stroke-width':3,opacity:.8});
  for(let k=0;k<N;k++){ el('line',{x1:34,y1:y(k),x2:340,y2:y(k+1)},back); el('line',{x1:340,y1:y(k),x2:34,y2:y(k+1)},back); }
  // Poteaux avec fausse ombre
  [30,186,342].forEach(x=>{ el('rect',{x:x+3,y:0,width:7,height:y(N),fill:'#8F949B'}); el('rect',{x:x,y:0,width:7,height:y(N),fill:'#C8CCD1'}); el('rect',{x:x,y:0,width:2,height:y(N),fill:'#EEF0F2'}); });
  // Planchers + plaques
  for(let k=0;k<=N;k++){
    if(k===N){ el('rect',{x:0,y:y(k),width:380,height:200,fill:'#B9B4AA'}); el('rect',{x:0,y:y(k),width:380,height:10,fill:'url(#haz)'}); continue; }
    el('rect',{x:24,y:y(k)+4,width:326,height:12,fill:'#7D838B'});
    el('rect',{x:24,y:y(k),width:326,height:10,fill:'#AEB3B9'});
    el('rect',{x:24,y:y(k)+10,width:326,height:6,fill:'url(#haz)'});
    const lab=k===0?'TOIT':'P'+(10-k);
    el('rect',{x:330,y:y(k)-46,width:44,height:30,fill:'#17191C',rx:2});
    const t=el('text',{x:352,y:y(k)-25,'text-anchor':'middle',fill:'#FFC21A','font-family':'Big Shoulders Display, Impact, sans-serif','font-weight':900,'font-size':20}); t.textContent=lab;
  }
  // Escaliers
  for(let k=0;k<N;k++){
    const ax=xs(k), ay=y(k), bx=xe(k), by=y(k+1);
    const g=el('g',{});
    el('line',{x1:ax,y1:ay+14,x2:bx,y2:by+14,stroke:'#6E747C','stroke-width':7},g);
    el('line',{x1:ax,y1:ay+8,x2:bx,y2:by+8,stroke:'#C8CCD1','stroke-width':5},g);
    el('line',{x1:ax,y1:ay-44,x2:bx,y2:by-44,stroke:'#9AA0A8','stroke-width':3},g); // main courante
    const steps=13;
    for(let i=1;i<steps;i++){
      const t=i/steps, px=ax+(bx-ax)*t, py=ay+(by-ay)*t;
      el('rect',{x:px-15,y:py+2,width:30,height:5,fill:'#4A4F56'},g);
      el('rect',{x:px-15,y:py-2,width:30,height:5,fill:'#FFC21A'},g);
      if(i%3===0) el('line',{x1:px,y1:py,x2:px,y2:py-44,stroke:'#9AA0A8','stroke-width':2},g);
    }
  }

  // Personnages
  function person(id,jacket,stripe,cap){
    const g=el('g',{id});
    const inner=el('g',{class:'flip'},g);
    el('ellipse',{cx:0,cy:0,rx:16,ry:4,fill:'#000',opacity:.18},inner);
    const la=el('g',{class:'leg-a'},inner); el('rect',{x:-6,y:-34,width:7,height:30,fill:'#2A2D31',rx:2},la); el('rect',{x:-8,y:-6,width:12,height:6,fill:'#111',rx:2},la);
    const lb=el('g',{class:'leg-b'},inner); el('rect',{x:0,y:-34,width:7,height:30,fill:'#33373C',rx:2},lb); el('rect',{x:-1,y:-6,width:12,height:6,fill:'#111',rx:2},lb);
    el('rect',{x:-11,y:-66,width:23,height:35,fill:jacket,rx:5},inner);
    if(stripe){ el('rect',{x:-11,y:-50,width:23,height:4,fill:stripe},inner); el('rect',{x:-11,y:-42,width:23,height:4,fill:stripe},inner); }
    const arm=el('g',{class:'arm-a'},inner); el('rect',{x:-4,y:-63,width:7,height:26,fill:jacket,rx:3},arm); el('circle',{cx:0,cy:-36,r:3.5,fill:'#C98E6A'},arm);
    el('circle',{cx:1,cy:-76,r:10,fill:'#C98E6A'},inner);
    el('rect',{x:-10,y:-88,width:21,height:8,fill:cap,rx:3},inner); el('rect',{x:6,y:-83,width:9,height:3,fill:cap},inner);
    return g;
  }
  const ced=person('ced','#2E5B8A',null,'#2E5B8A');
  const rep=person('rep','#24272B','#FFC21A','#FFC21A');
  const bubble=el('g',{opacity:0});
  el('rect',{x:-70,y:-140,width:140,height:34,rx:4,fill:'#17191C'},bubble);
  const bt=el('text',{x:0,y:-117,'text-anchor':'middle',fill:'#FFC21A','font-family':'IBM Plex Mono, monospace','font-size':13,'font-weight':600},bubble); bt.textContent='MARCHÉ CONCLU';

  function pos(f){
    f=Math.max(0,Math.min(N,f));
    if(f>=N) return {x:xs(N)+ (N%2===0?40:-40),y:y(N),dir:1};
    const k=Math.floor(f), t=f-k;
    return {x:xs(k)+(xe(k)-xs(k))*t, y:y(k)+(y(k+1)-y(k))*t, dir:xe(k)>xs(k)?1:-1};
  }
  function place(node,p,dir){ node.setAttribute('transform','translate('+p.x.toFixed(1)+','+p.y.toFixed(1)+')'); node.firstChild.setAttribute('transform','scale('+dir+',1)'); }

  const anchors=[...document.querySelectorAll('#v-accueil [data-floor]')];
  const col=document.querySelector('.scaf-col');
  const counter=document.getElementById('counter');
  let walkT=null;

  function floorFromScroll(){
    const c=window.scrollY+window.innerHeight*0.5;
    const pts=anchors.map(a=>({t:a.getBoundingClientRect().top+window.scrollY+Math.min(a.offsetHeight*0.25,200),f:+a.dataset.floor}));
    if(c<=pts[0].t) return pts[0].f;
    for(let i=0;i<pts.length-1;i++){ if(c<pts[i+1].t){ const r=(c-pts[i].t)/(pts[i+1].t-pts[i].t); return pts[i].f+(pts[i+1].f-pts[i].f)*r; } }
    return pts[pts.length-1].f;
  }
  function update(){
    if(!document.getElementById('v-accueil').classList.contains('active')) return;
    const f=floorFromScroll();
    const pc=pos(f);
    // Le repreneur attend au palier P8, puis suit le cédant
    let pr, dr;
    if(f<2){ pr={x:xs(2)+46,y:y(2)}; dr=-1; } else { const q=pos(Math.max(2,f-0.12)); pr={x:q.x,y:q.y}; dr=q.dir; }
    let dc=pc.dir;
    if(f>=N-0.02){ pc.x=150; pc.y=y(N); dc=1; pr={x:200,y:y(N)}; dr=-1; bubble.setAttribute('opacity',1); bubble.setAttribute('transform','translate(175,'+y(N)+')'); } else bubble.setAttribute('opacity',0);
    place(ced,pc,dc); place(rep,pr,dr);
    spot.setAttribute('cx',pc.x); spot.setAttribute('cy',pc.y-50);
    const vh=col.clientHeight||window.innerHeight;
    const sc=(col.clientWidth||380)/380; // l'échafaudage est mis à l'échelle de sa colonne
    const ty=Math.min(0,Math.max(-(H*sc-vh),vh*0.55-pc.y*sc));
    svg.style.transform='translateY('+ty.toFixed(1)+'px)';
    const k=Math.round(Math.min(N,f));
    const label=k===0?'Toit':(k===N?'Sol':'Palier <b>'+(10-k)+'</b> / 9 · '+names[k].split(' · ')[1]);
    counter.innerHTML=label;
  }
  window.addEventListener('scroll',()=>{
    update();
    svg.classList.add('walking');
    clearTimeout(walkT); walkT=setTimeout(()=>svg.classList.remove('walking'),160);
  },{passive:true});
  window.addEventListener('resize',update);

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
