(() => {
  "use strict";

/* =========================================================
   HELPERS
========================================================= */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const randf = (a, b) => a + Math.random() * (b - a);
const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};

/* =========================================================
   DOM
========================================================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menuMain = document.getElementById("menu");
const menuDeck = document.getElementById("deckMenu");
const menuSettings = document.getElementById("settingsMenu");

const btnPlay = document.getElementById("btnPlay");
const btnDeck = document.getElementById("btnDeck");
const btnSettings = document.getElementById("btnSettings");

const btnBackFromDeck = document.getElementById("btnBackFromDeck");
const btnSaveDeck = document.getElementById("btnSaveDeck");
const btnBackFromSettings = document.getElementById("btnBackFromSettings");
const btnFullscreen = document.getElementById("btnFullscreen");

const deckEl = document.getElementById("deck");
const allCardsEl = document.getElementById("allCards");

const elixirFill = document.getElementById("elixirFill");
const elixirText = document.getElementById("elixirText");
const topMsg = document.getElementById("topMsg");
const gameUI = document.getElementById("gameUI");

/* =========================================================
   CONSTANTS
========================================================= */
const TEAM_BLUE = 0;
const TEAM_RED = 1;

const ELIXIR_MAX = 10;
const ELIXIR_REGEN = 2.8;

/* =========================================================
   UNIT DATABASE (CLASH ROYALE)
========================================================= */
const UNIT_DB = [
  { id:"knight", name:"Knight", cost:3, hp:900, damage:120, atk:0.9, range:22, speed:78, radius:18, type:"melee", projectile:"none", color:"#3b82f6" },
  { id:"minipekka", name:"Mini P.E.K.K.A", cost:4, hp:760, damage:260, atk:1.1, range:20, speed:84, radius:14, type:"melee", projectile:"none", color:"#60a5fa" },
  { id:"archers", name:"Archers", cost:3, hp:520, damage:85, atk:0.95, range:190, speed:74, radius:13, type:"ranged", projectile:"arrow", color:"#38bdf8" },
  { id:"skeletons", name:"Skeletons", cost:1, hp:220, damage:55, atk:0.85, range:18, speed:92, radius:9, type:"melee", projectile:"none", color:"#94a3b8" },

  { id:"giant", name:"Giant", cost:5, hp:3000, damage:180, atk:1.5, range:24, speed:48, radius:22, type:"melee", projectile:"none", color:"#fbbf24" },
  { id:"musketeer", name:"Musketeer", cost:4, hp:720, damage:160, atk:1.0, range:220, speed:70, radius:14, type:"ranged", projectile:"bullet", color:"#a855f7" },
  { id:"valkyrie", name:"Valkyrie", cost:4, hp:1400, damage:160, atk:1.1, range:28, speed:72, radius:18, type:"melee", projectile:"none", color:"#fb7185" },
  { id:"wizard", name:"Wizard", cost:5, hp:720, damage:220, atk:1.3, range:200, speed:68, radius:15, type:"ranged", projectile:"fire", color:"#f97316" },

  { id:"babydragon", name:"Baby Dragon", cost:4, hp:1150, damage:140, atk:1.6, range:180, speed:76, radius:17, type:"ranged", projectile:"fire", color:"#22c55e" },
  { id:"hogrider", name:"Hog Rider", cost:4, hp:1400, damage:220, atk:1.2, range:20, speed:110, radius:16, type:"melee", projectile:"none", color:"#92400e" },
  { id:"prince", name:"Prince", cost:5, hp:1200, damage:320, atk:1.3, range:25, speed:95, radius:17, type:"melee", projectile:"none", color:"#facc15" },

  { id:"bomber", name:"Bomber", cost:2, hp:400, damage:200, atk:1.8, range:180, speed:70, radius:12, type:"ranged", projectile:"bomb", color:"#9ca3af" },
  { id:"speargoblins", name:"Spear Goblins", cost:2, hp:300, damage:75, atk:1.2, range:200, speed:90, radius:11, type:"ranged", projectile:"spear", color:"#22c55e" },
  { id:"minions", name:"Minions", cost:3, hp:350, damage:90, atk:1.1, range:160, speed:95, radius:11, type:"ranged", projectile:"magic", color:"#6366f1" },
  { id:"megaminion", name:"Mega Minion", cost:3, hp:800, damage:180, atk:1.6, range:160, speed:80, radius:14, type:"ranged", projectile:"magic", color:"#4f46e5" }
];

/* =========================================================
   PLAYER & BOT DECKS
========================================================= */
let playerDeck = [];
let botDeck = [];

/* =========================================================
   GAME STATE
========================================================= */
let running = false;
let lastTime = 0;

const units = [];
const elixir = [5,5];
const elixirAcc = [0,0];

/* =========================================================
   MENU LOGIC
========================================================= */
function showMenu(menu) {
  menuMain.classList.add("hidden");
  menuDeck.classList.add("hidden");
  menuSettings.classList.add("hidden");
  gameUI.classList.add("hidden");

  menu.classList.remove("hidden");
}

btnPlay.onclick = () => {
  showMenu(gameUI);
  canvas.style.display = "block";
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
};

btnDeck.onclick = () => showMenu(menuDeck);
btnSettings.onclick = () => showMenu(menuSettings);
btnBackFromDeck.onclick = () => showMenu(menuMain);
btnBackFromSettings.onclick = () => showMenu(menuMain);

/* =========================================================
   DECK MENU BUILD
========================================================= */
function buildDeckMenu() {
  allCardsEl.innerHTML = "";
  UNIT_DB.forEach(unit => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="name">${unit.name}</div>
      <div class="cost">${unit.cost}</div>
    `;

    card.onclick = () => {
      const idx = playerDeck.indexOf(unit);
      if (idx !== -1) {
        playerDeck.splice(idx,1);
        card.classList.remove("selected");
      } else if (playerDeck.length < 8) {
        playerDeck.push(unit);
        card.classList.add("selected");
      }
    };

    allCardsEl.appendChild(card);
  });
}

btnSaveDeck.onclick = () => {
  if (playerDeck.length !== 8) {
    alert("Choose exactly 8 cards");
    return;
  }
  botDeck = [...playerDeck].sort(() => Math.random()-0.5);
  showMenu(menuMain);
};

buildDeckMenu();

/* =========================================================
   SPAWN UNIT
========================================================= */
function spawnUnit(def, team, x, y) {
  units.push({
    def,
    team,
    x, y,
    hp: def.hp,
    atkCd: def.atk,
    atkLeft: 0,
    r: def.radius
  });
}

/* =========================================================
   INPUT
========================================================= */
canvas.addEventListener("pointerdown", e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const card = playerDeck[0];
  if (!card || elixir[0] < card.cost) return;

  elixir[0] -= card.cost;
  spawnUnit(card, TEAM_BLUE, x, y);
});

/* =========================================================
   UPDATE & DRAW
========================================================= */
function update(dt) {
  for (let i=units.length-1;i>=0;i--) {
    const u = units[i];
    if (u.hp <= 0) units.splice(i,1);
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  units.forEach(u=>{
    ctx.fillStyle = u.def.color;
    ctx.beginPath();
    ctx.arc(u.x,u.y,u.r,0,Math.PI*2);
    ctx.fill();
  });
}

/* =========================================================
   MAIN LOOP
========================================================= */
function loop(t) {
  if (!running) return;
  const dt = Math.min(0.033, (t-lastTime)/1000);
  lastTime = t;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

/* =========================================================
   FULLSCREEN
========================================================= */
btnFullscreen.onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

/* =========================================================
   RESIZE
========================================================= */
function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
}
window.addEventListener("resize", resize);
resize();

})();
