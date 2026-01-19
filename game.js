// Simplified CR-like core (clean rebuild)
const DB=[
 {id:0,n:'Knight',hp:1450,d:160,s:.6,r:45,c:3,col:'#3b82f6'},
 {id:1,n:'Archer',hp:260,d:95,s:.5,r:260,c:3,col:'#f472b6'},
 {id:2,n:'Giant',hp:3500,d:210,s:.25,r:55,c:5,col:'#f59e0b',tOnly:true},
 {id:3,n:'Mini PEKKA',hp:1150,d:620,s:.8,r:45,c:4,col:'#6366f1'},
 {id:4,n:'Hog Rider',hp:1500,d:280,s:1.1,r:50,c:4,col:'#7c2d12',ab:['jump']},
 {id:5,n:'Wizard',hp:550,d:235,s:.5,r:220,c:5,col:'#ea580c',ab:['splash']},
 {id:6,n:'Bandit',hp:750,d:160,s:1.3,r:60,c:3,col:'#111827',ab:['dash']},
 {id:7,n:'Baby Dragon',hp:1000,d:120,s:.6,r:180,c:4,col:'#4ade80',ab:['fly','splash']}
];

// Deck
function renderDeck(){
 const d=JSON.parse(localStorage.getItem('deck')||'[]');
 const d8=document.getElementById('deck8'), all=document.getElementById('all');
 if(!d8||!all) return;
 d8.innerHTML=''; all.innerHTML='';
 for(let i=0;i<8;i++){
  const el=document.createElement('div'); el.className='card'+(d[i]!=null?' sel':'');
  el.textContent=d[i]!=null?DB[d[i]].n:'ПУСТО';
  el.onclick=()=>{ if(d[i]!=null){ d.splice(i,1); localStorage.setItem('deck',JSON.stringify(d)); renderDeck(); } };
  d8.appendChild(el);
 }
 DB.forEach(x=>{
  const el=document.createElement('div'); el.className='card'+(d.includes(x.id)?' sel':'');
  el.textContent=x.n;
  el.onclick=()=>{ if(!d.includes(x.id)&&d.length<8){ d.push(x.id); localStorage.setItem('deck',JSON.stringify(d)); renderDeck(); } };
  all.appendChild(el);
 });
}
function resetDeck(){ localStorage.setItem('deck','[]'); renderDeck(); }
window.addEventListener('load',renderDeck);

// Battle
let c,ctx,units=[],towers=[],eli=5,sel=null,time=180,ot=false;
const bridges=[{x:150,y:385},{x:450,y:385}];
class U{
 constructor(x,y,t,d){this.x=x;this.y=y;this.t=t;this.d=d;this.hp=d.hp;this.cd=0;this.dash=false}
 step(){
  const tg=[...units,...towers].filter(o=>o.t!==this.t&&o.hp>0).sort((a,b)=>Math.hypot(this.x-a.x,this.y-a.y)-Math.hypot(this.x-b.x,this.y-b.y))[0];
  if(!tg) return;
  const di=Math.hypot(this.x-tg.x,this.y-tg.y);
  if(this.d.ab?.includes('dash')&&!this.cd&&di>150&&di<300){this.dash=true;this.cd=120}
  if(di<=this.d.r||(this.dash&&di<80)){
    if(this.cd++%55===0){
      const dmg=this.dash?this.d.d*2:this.d.d; tg.hp-=dmg; this.dash=false;
      if(this.d.ab?.includes('splash')) units.forEach(u=>u.t!==this.t&&Math.hypot(u.x-tg.x,u.y-tg.y)<60&&(u.hp-=dmg*.45));
    }
  } else {
    let sp=this.dash?this.d.s*4:this.d.s;
    let need=!this.d.ab?.includes('fly')&&!this.d.ab?.includes('jump')&&((this.t==='p'&&this.y>410)||(this.t==='e'&&this.y<360));
    if(need&&Math.abs(this.y-385)>20){
      const b=bridges.sort((a,b)=>Math.hypot(this.x-a.x,this.y-a.y)-Math.hypot(this.x-b.x,this.y-b.y))[0];
      const bd=Math.hypot(this.x-b.x,this.y-b.y)||1; this.x+=(b.x-this.x)/bd*sp; this.y+=(b.y-this.y)/bd*sp;
    } else { this.x+=(tg.x-this.x)/di*sp; this.y+=(tg.y-this.y)/di*sp; }
  }
 }
 draw(){ ctx.fillStyle='#0004'; ctx.beginPath(); ctx.ellipse(this.x,this.y+12,18,6,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=this.d.col; ctx.beginPath(); ctx.arc(this.x,this.y,18,0,Math.PI*2); ctx.fill(); }
}
function arena(){ ctx.fillStyle=get('--grass'); ctx.fillRect(0,0,600,770); ctx.fillStyle=get('--water'); ctx.fillRect(0,345,600,90); bridges.forEach(b=>{ctx.fillStyle='#8b5a2b';ctx.fillRect(b.x-50,b.y-20,100,40);}); }
function ui(){ document.getElementById('eli').style.width=(eli/10*100)+'%'; document.getElementById('eliTxt').textContent=Math.floor(eli); document.getElementById('time').textContent=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`+(ot?' OT':''); }
function hand(){ const h=document.getElementById('hand'); if(!h) return; h.innerHTML=''; const d=JSON.parse(localStorage.getItem('deck')||'[]'); d.slice(0,4).forEach((id,i)=>{ const x=DB[id]; const el=document.createElement('div'); el.className='hcard'+(sel===i?' active':''); el.innerHTML=`<b>${x.n}</b><span>💧${x.c}</span>`; el.onclick=e=>{e.stopPropagation(); sel=i; hand();}; h.appendChild(el); }); }
function resize(){ const dpr=devicePixelRatio||1; const r=c.getBoundingClientRect(); c.width=r.width*dpr; c.height=r.height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
window.addEventListener('resize',()=>c&&resize());
function initBattle(){ c=document.getElementById('c'); ctx=c.getContext('2d'); resize(); towers=[{x:150,y:150,hp:3000,t:'e'},{x:450,y:150,hp:3000,t:'e'},{x:300,y:80,hp:4500,t:'e'},{x:150,y:620,hp:3000,t:'p'},{x:450,y:620,hp:3000,t:'p'},{x:300,y:700,hp:4500,t:'p'}]; hand(); loop(); c.onclick=e=>{ if(sel==null) return; const r=c.getBoundingClientRect(); const x=(e.clientX-r.left)*600/r.width; const y=(e.clientY-r.top)*770/r.height; const d=JSON.parse(localStorage.getItem('deck')||'[]'); const card=DB[d[sel]]; if(eli<card.c||(!card.ab?.includes('jump')&&!card.ab?.includes('fly')&&y<385)) return; eli-=card.c; units.push(new U(x,y,'p',card)); sel=null; hand(); }; }
let f=0; function loop(){ arena(); units=units.filter(u=>u.hp>0); units.forEach(u=>{u.step();u.draw();}); if(f++%60===0){ time--; if(time<=0){ if(!ot){ot=true; time=120;} } } eli=Math.min(10,eli+(ot?.016:.008)); ui(); requestAnimationFrame(loop); }
const get=v=>getComputedStyle(document.documentElement).getPropertyValue(v);
