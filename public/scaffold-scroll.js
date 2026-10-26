import{createScaffold,FLOORS,names}from'./scaffold.js?v=20261026';
import{scenes}from'./scaffold-scenes.js?v=20261026';
export function mountScrollScaffold(){
 const svg=document.getElementById('scaf'),col=document.querySelector('.scaf-col'),home=document.getElementById('v-accueil');
 if(!svg||!col||!home)return()=>{};
 const view=createScaffold(svg),anchors=[...home.querySelectorAll('section[data-floor]')],counter=document.getElementById('counter'),reduce=matchMedia('(prefers-reduced-motion:reduce)');
 col.tabIndex=-1;const detail=document.createElement('section');detail.className='scaf-detail';detail.id='scaf-detail';detail.hidden=true;detail.setAttribute('aria-label','Détail de l’étape');detail.innerHTML='<div class="scaf-detail-head"><strong></strong><button type="button" aria-label="Fermer le détail de l’étape">Fermer ×</button></div><h3></h3><p></p><ul></ul>';
 col.append(detail);const live=document.createElement('p');live.className='scaf-live';live.setAttribute('aria-live','polite');col.append(live);
 let active=null,pinned=false,raf=0,leave=0,focusScrollUntil=0;
 const stage=()=>{
  const cursor=scrollY+innerHeight*.5,pts=anchors.map(a=>({t:a.getBoundingClientRect().top+scrollY+Math.min(a.offsetHeight*.25,200),f:Number(a.dataset.floor)}));
  if(cursor<=pts[0].t)return pts[0].f;
  for(let i=0;i<pts.length-1;i++)if(cursor<pts[i+1].t){const p=(cursor-pts[i].t)/(pts[i+1].t-pts[i].t);return pts[i].f+(pts[i+1].f-pts[i].f)*p;}
  return pts.at(-1).f;
 };
 function close(){clearTimeout(leave);active=null;pinned=false;detail.hidden=true;view.setScene(null);}
 function open(id,pin=false){const s=scenes[id];if(!s)return;clearTimeout(leave);active=id;pinned=pin||pinned;view.setScene(id);detail.hidden=false;detail.querySelector('strong').textContent=s.code+' · '+s.name;detail.querySelector('h3').textContent=s.title;detail.querySelector('p').textContent=s.intro;detail.querySelector('ul').replaceChildren(...s.points.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));if(pin)live.textContent=s.name+' : détail ouvert. Échap pour fermer.';}
 function delayedClose(){clearTimeout(leave);leave=setTimeout(()=>{if(!pinned&&!detail.matches(':hover')&&!detail.contains(document.activeElement))close();},160);}
 function update(){raf=0;if(!home.classList.contains('active')||document.hidden)return;
  const raw=stage(),f=reduce.matches?Math.round(raw):raw,p=view.paint(f+Math.max(0,f-9.9)*1.4),scale=col.clientWidth/680,vh=col.clientHeight;
  const y=Math.min(0,Math.max(-(view.height*scale-vh),vh*.55-p.y*scale));svg.style.transform=`translateY(${y.toFixed(2)}px)`;
  const k=Math.min(FLOORS,Math.round(raw));counter.innerHTML=k===0?'Toit':k===FLOORS?'Sol':'Palier <b>'+(10-k)+'</b> / 9 · '+names[k];
  col.dataset.progress=raw.toFixed(4);col.dataset.floor=String(k);col.dataset.phase=p.phase;col.classList.toggle('scaf-reduced',reduce.matches);
  for(const t of svg.querySelectorAll('[data-scene-trigger]')){const s=scenes[t.dataset.sceneTrigger],cy=(150+s.floor*430-80)*scale+y;t.tabIndex=cy>0&&cy<vh?0:-1;}

 }
 function request(){if(!raf)raf=requestAnimationFrame(update);}
 for(const trigger of svg.querySelectorAll('[data-scene-trigger]')){
  const id=trigger.dataset.sceneTrigger;trigger.setAttribute('aria-controls','scaf-detail');trigger.setAttribute('aria-label','Explorer '+scenes[id].name+' ; cliquer pour garder le détail');
  trigger.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover)').matches&&!pinned)open(id);});trigger.addEventListener('pointerleave',delayedClose);
  trigger.addEventListener('focus',()=>{focusScrollUntil=performance.now()+700;if(!pinned)open(id);});trigger.addEventListener('blur',delayedClose);
  trigger.addEventListener('click',()=>requestAnimationFrame(()=>open(id,true)));trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();requestAnimationFrame(()=>open(id,true));}});
 }
 detail.querySelector('button').addEventListener('click',()=>{close();col.focus({preventScroll:true});});detail.addEventListener('pointerenter',()=>clearTimeout(leave));detail.addEventListener('pointerleave',delayedClose);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){close();col.focus({preventScroll:true});}});
 // A scroll always takes priority; hover never freezes or redirects the trajectory.
 window.addEventListener('wheel',close,{passive:true});window.addEventListener('touchmove',close,{passive:true});document.addEventListener('pointerdown',e=>{if(!col.contains(e.target))close();});document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))close();});
 window.addEventListener('scroll',()=>{if(active&&performance.now()>focusScrollUntil)close();request();},{passive:true});window.addEventListener('resize',request);reduce.addEventListener('change',()=>{close();request();});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;close();}else request();});new ResizeObserver(request).observe(col);
 update();return update;
}
