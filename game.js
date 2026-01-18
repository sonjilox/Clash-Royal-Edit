const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
function resize(){const dpr=devicePixelRatio||1,r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
let time=180;
class Unit{constructor(x,y,team){this.x=x;this.y=y;this.team=team}update(){this.y+=this.team==='enemy'?1:-1}draw(){ctx.fillStyle=this.team==='enemy'?'#dc2626':'#2563eb';ctx.beginPath();ctx.arc(this.x,this.y,14,0,Math.PI*2);ctx.fill()}}
let units=[new Unit(200,500,'player'),new Unit(200,200,'enemy')];
function drawArena(){ctx.fillStyle='#3fbf6f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1e90ff';ctx.fillRect(0,canvas.height/2-40,canvas.width,80)}
function loop(){drawArena();units.forEach(u=>{u.update();u.draw()});requestAnimationFrame(loop)}loop();
setInterval(()=>{time--;document.getElementById('timer').innerText=Math.floor(time/60)+":"+String(time%60).padStart(2,'0')},1000);
