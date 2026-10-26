import{mountScenes}from'./scaffold-scenes.js?v=20261026';
export const STEP=430,TOP=150,LEFT=154,RIGHT=510,FLOORS=10;
export const names=['Toit','Réflexion','Confidentialité','Évaluation','Rencontre','Offre','Audit','Financement','Signature','Relais','Sol'];
export const ladderX=(floor,firstRight=true)=>(floor%2===0)===firstRight?RIGHT:LEFT;
export function position(progress,firstRight=true){
 if(progress<0)return{x:(firstRight?LEFT:RIGHT)+(firstRight?1:-1)*progress/0.14*42,y:TOP,phase:'attente',direction:firstRight?1:-1,cycle:0};
 if(progress>=FLOORS){const x=ladderX(FLOORS-1,firstRight),dir=x===RIGHT?-1:1;return{x:x+dir*Math.min(.14,progress-FLOORS)/.14*55,y:TOP+FLOORS*STEP,phase:'arrivée',direction:dir,cycle:progress*14};}
 const k=Math.floor(progress),t=progress-k,start=k===0?(firstRight?LEFT:RIGHT):ladderX(k-1,firstRight),end=ladderX(k,firstRight),direction=end>start?1:-1;
 if(t<.58)return{x:start+(end-start)*t/.58,y:TOP+k*STEP,phase:'marche',direction,cycle:t/.58*22};
 return{x:end,y:TOP+(k+(t-.58)/.42)*STEP,phase:'descente',direction:1,cycle:(t-.58)/.42*21};
}
export function createScaffold(svg,{firstRight=true}={}){
 const NS='http://www.w3.org/2000/svg',H=TOP+FLOORS*STEP+130;
 const el=(tag,attrs={},parent=svg)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 680 ${H}`);svg.setAttribute('role','group');svg.setAttribute('aria-label','Échafaudage : paliers horizontaux et échelles verticales alternées '+(firstRight?'à droite puis à gauche.':'à gauche puis à droite.'));
 const title=el('title');title.textContent='Les deux personnages marchent sur chaque palier puis descendent par une échelle verticale.';
 const defs=el('defs');const metal=el('linearGradient',{id:'metal',x1:'0',x2:'1',y1:'0',y2:'0'},defs);for(const[o,c]of[['0','#909b9f'],['.3','#d3dadb'],['.55','#e7eceb'],['1','#8b989d']])el('stop',{offset:o,'stop-color':c},metal);
 const pale=el('linearGradient',{id:'deck',x1:'0',y1:'0',x2:'0',y2:'1'},defs);el('stop',{offset:0,'stop-color':'#c8cecc'},pale);el('stop',{offset:1,'stop-color':'#8c989b'},pale);
 const back=el('g',{opacity:'.52'});for(let k=0;k<FLOORS;k++){const y=TOP+k*STEP;el('path',{d:`M80 ${y-12}L598 ${y+STEP-12}M598 ${y-12}L80 ${y+STEP-12}`,stroke:'#a9b1b0','stroke-width':3,fill:'none'},back);}
 for(const x of[76,338,600]){el('rect',{x:x+7,y:25,width:10,height:H-75,fill:'#b5bdbc'});el('rect',{x,y:25,width:10,height:H-75,fill:'url(#metal)'});}
 for(let k=0;k<=FLOORS;k++){
  const y=TOP+k*STEP,holes=[];if(k<FLOORS)holes.push(ladderX(k,firstRight));if(k>0)holes.push(ladderX(k-1,firstRight));const boundaries=[92,...holes.sort((a,b)=>a-b).flatMap(x=>[x-23,x+23]),590];
  for(let j=0;j<boundaries.length-1;j+=2){const l=boundaries[j],r=boundaries[j+1];el('path',{d:`M${l} ${y}l10 -12H${r+10}l-10 12Z`,fill:'#dce0dc'});el('rect',{x:l,y,width:r-l,height:10,fill:'url(#deck)'});el('path',{d:`M${l} ${y+10}H${r}`,stroke:'#77868b','stroke-width':2});}
  el('path',{d:`M93 ${y-76}H590`,stroke:'#a6b1b2','stroke-width':4,fill:'none'});
  for(const x of[98,280,446,585])el('path',{d:`M${x} ${y-76}V${y}`,stroke:'#adb8b9','stroke-width':3});
  const sceneId=({2:'privacy',6:'audit',9:'relay'})[k];const label=el('g',sceneId?{'data-scene-trigger':sceneId,role:'button',tabindex:0,'aria-label':'Explorer '+names[k],'aria-pressed':'false'}:{});if(sceneId){el('rect',{x:10,y:y-200,width:605,height:210,rx:4,fill:'transparent',class:'explore-halo'},label);const prompt=el('text',{x:46,y:y-8,'text-anchor':'middle',fill:'#687361','font-size':9,'font-family':'Barlow, sans-serif'},label);prompt.textContent='EXPLORER';}el('rect',{x:14,y:y-54,width:65,height:31,rx:2,fill:'#232a2d'},label);const n=el('text',{x:46.5,y:y-32,fill:'#ffd34f','text-anchor':'middle','font-size':27,'font-family':'Barlow, sans-serif','font-weight':600},label);n.textContent=k===FLOORS?'SOL':k===0?'TOIT':'P'+(10-k);
  if(k<FLOORS){const t=el('text',{x:220,y:y+35,fill:'#647174','font-size':15,'font-family':'Barlow, sans-serif'},label);t.textContent=names[k];}
 }
 const ladders=el('g',{'data-ladders':''});
 for(let k=0;k<FLOORS;k++){const x=ladderX(k,firstRight),y=TOP+k*STEP,g=el('g',{'data-floor':k,'data-side':x===RIGHT?'right':'left'},ladders);for(const dx of[-17,17]){el('path',{d:`M${x+dx+3} ${y-30}V${y+STEP+3}`,stroke:'#7a878b','stroke-width':6},g);el('path',{d:`M${x+dx} ${y-30}V${y+STEP}`,stroke:'#cbd4d4','stroke-width':4},g);}for(let rung=0;rung<9;rung++){const ry=y+7+rung*25;el('path',{d:`M${x-17} ${ry+2}H${x+17}`,stroke:'#67777c','stroke-width':5},g);el('path',{d:`M${x-17} ${ry}H${x+17}`,stroke:'#e7c35e','stroke-width':3},g);}}
 el('rect',{x:75,y:TOP+FLOORS*STEP+13,width:538,height:6,fill:'#b8b4a7'});
 function person(id,jacket,trousers,hair,skin){
  const g=el('g',{id}),body=el('g',{},g);el('ellipse',{cx:0,cy:0,rx:17,ry:3.5,fill:'#212b30',opacity:'.14'},body);
  const farLeg=el('path',{fill:'none',stroke:trousers,'stroke-width':8,'stroke-linecap':'round'},body),nearLeg=el('path',{fill:'none',stroke:trousers,'stroke-width':8,'stroke-linecap':'round'},body);
  const farShoe=el('path',{fill:'none',stroke:'#353735','stroke-width':5,'stroke-linecap':'round'},body),nearShoe=el('path',{fill:'none',stroke:'#353735','stroke-width':5,'stroke-linecap':'round'},body);
  const farArm=el('path',{fill:'none',stroke:jacket,'stroke-width':7,'stroke-linecap':'round'},body);
  el('path',{d:'M-11 -59Q0 -65 11 -58L10 -32Q0 -29 -10 -32Z',fill:jacket},body);el('path',{d:'M-2 -61L2 -61L1 -32',stroke:'#eee6cf','stroke-width':2,fill:'none'},body);
  const nearArm=el('path',{fill:'none',stroke:jacket,'stroke-width':7,'stroke-linecap':'round'},body),hands=[el('circle',{r:3.5,fill:skin},body),el('circle',{r:3.5,fill:skin},body)];
  el('rect',{x:-3,y:-69,width:7,height:9,fill:skin},body);el('circle',{cx:0,cy:-75,r:10,fill:skin},body);el('path',{d:'M-10 -76Q-12 -89 1 -87Q11 -87 10 -77L7 -80Q2 -77 -3 -82L-6 -74Z',fill:hair},body);el('circle',{cx:6,cy:-75,r:.8,fill:'#38342e'},body);
  const carry=el('g',{class:'person-prop'},body);el('path',{d:'M13 -49h21v25H13Z',fill:'#e4d8b3',stroke:'#746747','stroke-width':1},carry);el('path',{d:'M17 -42h13m-13 5h10',stroke:'#9e967c','stroke-width':1},carry);el('rect',{x:28,y:-49,width:3,height:25,fill:'#d5ab30'},carry);
  const loupe=el('g',{class:'person-prop'},body);el('circle',{cx:28,cy:-61,r:8,fill:'#d5e0cc',opacity:'.85',stroke:'#8b7138','stroke-width':3},loupe);el('path',{d:'M22 -55l-7 10',stroke:'#675c40','stroke-width':4},loupe);
  return{g,body,farLeg,nearLeg,farShoe,nearShoe,farArm,nearArm,hands,carry,loupe};
 }
 const sceneLayer=mountScenes(svg,{el,TOP,STEP});
 const people=[person('cedant','#52766b','#4d5a62','#50412f','#bf8e70'),person('repreneur','#ae7855','#636365','#302e29','#d1a084')];
 function pose(person,p,scene,index,progress){
  person.g.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(1.15)`);person.g.dataset.phase=p.phase;person.g.dataset.x=p.x.toFixed(2);person.g.dataset.y=p.y.toFixed(2);person.body.setAttribute('transform',`scale(${p.phase==='descente'?1:p.direction} 1)`);
  const phase=Math.sin(p.cycle),moving=p.phase==='marche'||p.phase==='descente';let feet,arms;
  if(p.phase==='descente'){feet=[[-10,-9-phase*7],[10,-9+phase*7]];arms=[[-16,-72+phase*9],[16,-72-phase*9]];}
  else{const d=moving?phase:0;feet=[[-4+d*13,-3+Math.max(0,-d)*5],[4-d*13,-3+Math.max(0,d)*5]];arms=[[-9-d*12,-40],[9+d*12,-42]];}
  const approach=progress%1;if(!scene&&p.phase==='marche'&&approach>.51){const reach=Math.min(1,(approach-.51)/.07);arms[1]=[13,-42-reach*31];}
  if(scene){feet=[[-7,-3],[8,-3]];arms=scene==='audit'?[[-8,-43],[28,-56]]:[[-8,-42],[34,-47]];}
  person.loupe.setAttribute('opacity',scene==='audit'&&index===1?'1':'0');
  person.carry.setAttribute('opacity',!scene&&((index===0&&progress<1.28)||(index===1&&progress>=1.28))&&p.phase!=='descente'?'1':'0');
  for(let i=0;i<2;i++){const[x,y]=feet[i],sign=i?1:-1;(i?person.nearLeg:person.farLeg).setAttribute('d',`M${sign*4} -33Q${sign*8} -17 ${x} ${y}`);(i?person.nearShoe:person.farShoe).setAttribute('d',`M${x-2} ${y+1}h10`);const[ax,ay]=arms[i];(i?person.nearArm:person.farArm).setAttribute('d',`M${sign*8} -57Q${sign*16} ${p.phase==='descente'?-58:-48} ${ax} ${ay}`);person.hands[i].setAttribute('cx',ax);person.hands[i].setAttribute('cy',ay);}
 }
 const exchange=el('g',{'aria-hidden':'true',class:'actor-exchange'}),paper=el('g',{class:'exchange-paper'},exchange);el('rect',{x:-12,y:-16,width:24,height:28,fill:'#ece1bc',stroke:'#8b7850','stroke-width':1},paper);el('path',{d:'M-7 -8H7M-7 -2H4M-7 4H6',stroke:'#938d74','stroke-width':1},paper);el('path',{d:'M8 -16V12',stroke:'#e0b534','stroke-width':3},paper);
 const key=el('g',{class:'exchange-key'},exchange);el('circle',{cx:-6,cy:0,r:6,fill:'none',stroke:'#bc8d22','stroke-width':3},key);el('path',{d:'M0 0h20m-5 0v6m-6-6v4',fill:'none',stroke:'#bc8d22','stroke-width':3},key);
 const trailPoints=[[LEFT,TOP+14]];for(let k=0;k<FLOORS;k++){const x=ladderX(k,firstRight);trailPoints.push([x,TOP+k*STEP+14],[x,TOP+(k+1)*STEP+14]);}if(!firstRight)trailPoints[0][0]=RIGHT;const trailLength=FLOORS*(RIGHT-LEFT+STEP);const trail=el('path',{d:trailPoints.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' '),stroke:'#d9ad36','stroke-width':2,fill:'none',opacity:'.65','stroke-dasharray':trailLength,'stroke-dashoffset':trailLength});
 const highlight=el('rect',{x:89,y:TOP+12,width:505,height:3,fill:'#d9ad36'});
 return{height:H,setScene:sceneLayer.setActive,paint(progress,scene=null){const lead=position(progress,firstRight),follow=position(progress-.14,firstRight);pose(people[0],lead,null,0,progress);pose(people[1],follow,null,1,progress);exchange.setAttribute('transform',`translate(340 ${lead.y-47})`);exchange.setAttribute('opacity','0');exchange.setAttribute('data-exchange',scene||'');const k=Math.min(FLOORS,Math.floor(progress)),t=progress-k,travel=k*(RIGHT-LEFT+STEP)+(k<FLOORS?(t<.58?(RIGHT-LEFT)*t/.58:(RIGHT-LEFT)+STEP*(t-.58)/.42):0);trail.setAttribute('stroke-dashoffset',Math.max(0,trailLength-travel));highlight.setAttribute('y',TOP+Math.min(FLOORS,Math.floor(progress))*STEP+12);svg.dataset.progress=progress.toFixed(3);return lead;}};
}
