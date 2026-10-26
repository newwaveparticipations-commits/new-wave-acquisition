export const scenes={
 privacy:{floor:2,code:'P8',name:'Confidentialité',title:'La confiance a son cadre.',intro:'Avant de partager des informations sensibles, le cadre des échanges se définit. Vous gardez la main sur ce que vous communiquez.',points:['Un premier échange sans document.','Un engagement de confidentialité avant les chiffres.','Les informations utiles, au bon moment.'],caption:'Le dossier passe entre les personnages. La vitre se dépolit et le fil jaune reste visible.',link:'/contact',cta:'Poser une question'},
 audit:{floor:6,code:'P4',name:'Audit',title:'Éclairer les points essentiels.',intro:'Le projecteur révèle ce que l’on doit examiner derrière la présentation de l’entreprise. L’activité, elle, continue.',points:['Comptes et éléments de rentabilité.','Contrats et engagements.','Organisation et fonctionnement de l’entreprise.'],caption:'Le cédant présente l’atelier ; le repreneur l’examine à la loupe. Le projecteur révèle les points à vérifier.',link:'/diagnostic',cta:'Découvrir le diagnostic'},
 relay:{floor:9,code:'P1',name:'Relais',title:'Les clés passent. La lumière reste.',intro:'Le passage se prépare avec les personnes, les savoir-faire et les relations qui font vivre l’entreprise.',points:['Présenter les clients et les fournisseurs.','Transmettre les habitudes et les savoir-faire.','Définir ensemble l’accompagnement.'],caption:'La clé passe d’une main à l’autre. Les fenêtres de l’atelier restent éclairées.',link:'/contact',cta:'Parlons de la suite'}
};
export function mountScenes(svg,{el,TOP,STEP}){
 const layer=el('g',{'data-scene-layer':'','aria-hidden':'true'}),defs=svg.querySelector('defs');
 const frost=el('linearGradient',{id:'privacy-glass',x1:0,y1:0,x2:1,y2:1},defs);for(const[o,c]of[[0,'#d6dfda'],[.5,'#ecf0e9'],[1,'#bdcbc6']])el('stop',{offset:o,'stop-color':c},frost);
 const light=el('radialGradient',{id:'audit-light'},defs);el('stop',{offset:0,'stop-color':'#fff4be','stop-opacity':'.75'},light);el('stop',{offset:1,'stop-color':'#fff4be','stop-opacity':0},light);
 const auditClip=el('clipPath',{id:'audit-scan-mask',clipPathUnits:'userSpaceOnUse'},defs);el('circle',{cx:62,cy:75,r:58,class:'scan-move'},auditClip);
 const bound=el('clipPath',{id:'audit-bounds'},defs);el('rect',{x:8,y:8,width:228,height:138,rx:3},bound);
 const path=(d,attrs={},parent)=>el('path',{d,...attrs},parent),rect=(x,y,width,height,fill,attrs={},parent)=>el('rect',{x,y,width,height,fill,...attrs},parent);
 function text(x,y,content,attrs={},parent){const n=el('text',{x,y,...attrs},parent);n.textContent=content;return n;}
 const visuals={};
 for(const[id,s]of Object.entries(scenes)){
  const outer=el('g',{transform:`translate(211 ${TOP+s.floor*STEP-197})`,'data-scene-art':id},layer),g=el('g',{class:'vignette'},outer);visuals[id]=outer;
  rect(0,0,246,151,'#d8dbd1',{rx:3},g);rect(4,4,238,143,'#e8e9df',{rx:2},g);path('M7 145H239',{stroke:'#8e9b94','stroke-width':2},g);
  if(id==='privacy'){
   const content=el('g',{class:'private-content'},g);rect(30,24,183,106,'#d0d8d2',{},content);rect(48,38,147,83,'#53665d',{rx:2},content);
   const pages=el('g',{class:'folder-pages'},content);for(let j=0;j<3;j++){rect(59+j*2,43-j*4,123,66,'#faf4de',{},pages);for(let i=0;i<4;i++)path(`M${73+j*2} ${58+i*10-j*4}h${76-i*9}`,{stroke:'#a5afa0','stroke-width':1.5},pages);}
   rect(49,92,146,28,'#697c6b',{class:'folder-cover'},content);rect(168,83,10,37,'#ecc54e',{},content);
   const veil=el('g',{class:'privacy-veil'},g);rect(18,12,210,121,'url(#privacy-glass)',{opacity:'.94',rx:3},veil);for(let i=0;i<8;i++)path(`M${25+i*27} 14V130`,{stroke:'#f8faf3','stroke-width':1,opacity:'.3'},veil);
   path('M17 10H230V134H17Z',{fill:'none',stroke:'#93a59b','stroke-width':2},g);path('M24 116C60 116 56 65 92 65H153V99H205',{fill:'none',stroke:'#e2b634','stroke-width':3,class:'scene-thread'},g);
   rect(85,57,74,23,'#f6efd6',{rx:2},g);text(122,72,'ENTRE NOUS',{'text-anchor':'middle',fill:'#53645b','font-size':9,'font-weight':600},g);
  }
  if(id==='audit'){
   path('M20 127V38L70 20L120 38L169 20L222 38V127Z',{fill:'#d2d8d1',stroke:'#9da9a0','stroke-width':1},g);
   const inside=el('g',{'clip-path':'url(#audit-scan-mask)',class:'audit-inside'},g);rect(21,38,200,90,'#43564f',{},inside);
   for(let j=0;j<3;j++){const x=35+j*61;rect(x,54,44,51,'#f4efdc',{rx:2},inside);path(`M${x+8} 65h27M${x+8} 74h22M${x+8} 83h26`,{stroke:'#91a58d','stroke-width':2},inside);path(`M${x+9} 94l5 5 12-12`,{stroke:'#d6b742','stroke-width':2.5,fill:'none'},inside);}
   for(const x of[20,70,120,170,221])path(`M${x} 39V127`,{stroke:'#9ba99f','stroke-width':2},g);path('M20 127H221M20 44H221',{stroke:'#a4b0a4','stroke-width':2},g);
   const beam=el('g',{'clip-path':'url(#audit-bounds)'},g);el('circle',{cx:62,cy:75,r:65,fill:'url(#audit-light)',class:'scan-move'},beam);
   path('M28 132H52V109H94V126H139V101H179V132H216',{stroke:'#d9b844','stroke-width':2,fill:'none',class:'scene-thread'},g);
   const lamp=el('g',{transform:'translate(197 89)'},g);el('circle',{cx:0,cy:0,r:18,fill:'#eee4bd',stroke:'#b3903c','stroke-width':4},lamp);path('M12 13l23 25',{stroke:'#6f7d75','stroke-width':8,'stroke-linecap':'round'},lamp);el('circle',{cx:0,cy:0,r:12,fill:'#f8edc4',opacity:'.6'},lamp);
  }
  if(id==='relay'){
   path('M25 89V33L62 17L98 33L136 17L175 33L211 18L225 33V89Z',{fill:'#52675b',stroke:'#3c5046','stroke-width':1.5},g);
   for(let i=0;i<5;i++){rect(40+i*35,45,23,27,'#eed57c',{class:'workshop-light',rx:1},g);path(`M${51.5+i*35} 45V72`,{stroke:'#7f987b','stroke-width':1},g);}path('M27 90H224',{stroke:'#d4b24a','stroke-width':2.5},g);
   const left=el('g',{class:'handover-left'},g);path('M23 123H86',{stroke:'#ae7855','stroke-width':13,'stroke-linecap':'round'},left);path('M86 123h17',{stroke:'#bf8e70','stroke-width':10,'stroke-linecap':'round'},left);
   const right=el('g',{class:'handover-right'},g);path('M224 123H166',{stroke:'#52766b','stroke-width':13,'stroke-linecap':'round'},right);path('M166 123h-17',{stroke:'#d1a084','stroke-width':10,'stroke-linecap':'round'},right);
   const key=el('g',{class:'handover-key'},g);el('circle',{cx:103,cy:115,r:8,fill:'none',stroke:'#e5be45','stroke-width':4},key);path('M111 115h28m-5 0v7m-7-7v5',{stroke:'#e5be45','stroke-width':4,fill:'none'},key);
   path('M17 140H96Q112 140 112 123V116',{stroke:'#e0ba43','stroke-width':2,fill:'none',class:'scene-thread'},g);
  }
  const trigger=svg.querySelector(`[data-scene-trigger="${id}"]`);if(trigger)trigger.setAttribute('aria-controls','detail');
 }
 return{setActive(id){svg.dataset.activeScene=id||'';for(const[key,g]of Object.entries(visuals)){g.classList.toggle('is-active',id===key);const t=svg.querySelector(`[data-scene-trigger="${key}"]`);t?.setAttribute('aria-pressed',String(id===key));}}};
}
