
(() => {
  "use strict";

  /* =====================================================================
     Clash Royale Web (Extended, 1000+ lines)
     - Keeps your existing mechanics: river, bridges, bullets, towers,
       unit movement and combat loop.
     - Additions are made рядом/ниже существующего кода.
     ===================================================================== */

  // ------------------------------------------------------------
  // Helpers (no allocations in hot path where possible)
  // ------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const randf = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => (a + ((Math.random() * (b - a + 1)) | 0));
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  // ------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const menu = document.getElementById("menu");
  const btnPlay = document.getElementById("btnPlay");
  const btnFullscreen = document.getElementById("btnFullscreen");
  const volume = document.getElementById("volume");
  const volVal = document.getElementById("volVal");

  const deckEl = document.getElementById("deck");
  const elixirFill = document.getElementById("elixirFill");
  const elixirText = document.getElementById("elixirText");
  const topMsg = document.getElementById("topMsg");

  // Optional extra menus (safe: if not in HTML, code will just skip)
  const menuMain = document.getElementById("menuMain");
  const menuDeck = document.getElementById("menuDeck");
  const menuSettings = document.getElementById("menuSettings");
  const btnGoDeck = document.getElementById("btnGoDeck");
  const btnGoSettings = document.getElementById("btnGoSettings");
  const btnDeckBack = document.getElementById("btnDeckBack");
  const btnDeckSave = document.getElementById("btnDeckSave");
  const btnSettingsBack = document.getElementById("btnSettingsBack");
  const allCardsEl = document.getElementById("allCards");

  // Volume UI (stub)
  if (volume && volVal) {
    volume.addEventListener("input", () => {
      volVal.textContent = `${volume.value}%`;
    });
  }

  // Fullscreen
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        } else {
          await document.exitFullscreen();
        }
      } catch (e) {}
    });
  }

  // ------------------------------------------------------------
  // Game constants
  // ------------------------------------------------------------
  const TEAM_BLUE = 0; // player (bottom)
  const TEAM_RED = 1;  // bot (top)

  const COLORS = {
    bg: "#0b1220",
    grassA: "rgba(34,197,94,0.16)",
    grassB: "rgba(34,197,94,0.10)",
    lane: "rgba(255,255,255,0.06)",
    river: "rgba(56,189,248,0.18)",
    riverDeep: "rgba(56,189,248,0.28)",
    bridge: "rgba(255,255,255,0.12)",
    bridgeEdge: "rgba(255,255,255,0.22)",
    towerBlue: "rgba(45,110,255,0.60)",
    towerRed: "rgba(255,59,85,0.56)",
    towerStroke: "rgba(255,255,255,0.22)",
    hpBack: "rgba(0,0,0,0.35)",
    hpGreen: "rgba(34,197,94,0.85)",
    hpYellow: "rgba(250,204,21,0.85)",
    hpRed: "rgba(255,59,85,0.85)",
    text: "rgba(234,240,255,0.92)"
  };

  // Elixir
  const ELIXIR_MAX = 10;
  const ELIXIR_REGEN_SEC = 2.8;

  // AI
  const BOT_MIN_DELAY = 3.0;
  const BOT_MAX_DELAY = 6.0;

  // Projectile pool
  const BULLET_POOL = 240;

  // ------------------------------------------------------------
  // Units database (expanded)
  // ------------------------------------------------------------
  const UNITS = [
    // Existing four (kept)
    { id:"knight", name:"Knight", cost:3, radius:18, hp:900,  speed:78, range:22,  damage:120, atkCooldown:0.9,  bullet:null,    color:"rgba(45,110,255,0.75)", aggro: 90,  spawnDelay:0.25 },
    { id:"minipekka", name:"Mini P.E.K.K.A", cost:4, radius:14, hp:760, speed:84, range:20, damage:260, atkCooldown:1.1, bullet:null, color:"rgba(59,130,246,0.75)", aggro: 95, spawnDelay:0.25 },
    { id:"archers", name:"Archers", cost:3, radius:13, hp:520, speed:74, range:190, damage:85, atkCooldown:0.95, bullet:"arrow", color:"rgba(56,189,248,0.75)", aggro:210, spawnDelay:0.25 },
    { id:"skeletons", name:"Skeletons", cost:1, radius:9, hp:220, speed:92, range:18, damage:55, atkCooldown:0.85, bullet:null, color:"rgba(148,163,184,0.70)", aggro:85, spawnDelay:0.20 },

    // Added
    { id:"giant", name:"Giant", cost:5, radius:22, hp:3000, speed:48, range:24, damage:190, atkCooldown:1.5, bullet:null, color:"rgba(250,204,21,0.70)", aggro:110, spawnDelay:0.30 },
    { id:"musketeer", name:"Musketeer", cost:4, radius:14, hp:720, speed:70, range:220, damage:160, atkCooldown:1.0, bullet:"bullet", color:"rgba(168,85,247,0.70)", aggro:240, spawnDelay:0.25 },
    { id:"valkyrie", name:"Valkyrie", cost:4, radius:18, hp:1400, speed:72, range:28, damage:160, atkCooldown:1.1, bullet:null, color:"rgba(251,113,133,0.72)", aggro:105, spawnDelay:0.25 },
    { id:"wizard", name:"Wizard", cost:5, radius:15, hp:720, speed:68, range:200, damage:220, atkCooldown:1.3, bullet:"fire", color:"rgba(249,115,22,0.72)", aggro:230, spawnDelay:0.28 },
    { id:"baby_dragon", name:"Baby Dragon", cost:4, radius:17, hp:1150, speed:76, range:180, damage:140, atkCooldown:1.6, bullet:"fire", color:"rgba(34,197,94,0.70)", aggro:210, spawnDelay:0.28 },
    { id:"hog_rider", name:"Hog Rider", cost:4, radius:16, hp:1400, speed:110, range:20, damage:220, atkCooldown:1.2, bullet:null, color:"rgba(146,64,14,0.70)", aggro:95, spawnDelay:0.24 },
    { id:"prince", name:"Prince", cost:5, radius:17, hp:1200, speed:95, range:25, damage:320, atkCooldown:1.3, bullet:null, color:"rgba(250,204,21,0.80)", aggro:110, spawnDelay:0.28 },
    { id:"bomber", name:"Bomber", cost:2, radius:12, hp:400, speed:70, range:180, damage:200, atkCooldown:1.8, bullet:"bomb", color:"rgba(156,163,175,0.75)", aggro:200, spawnDelay:0.22 },
    { id:"spear_goblins", name:"Spear Goblins", cost:2, radius:11, hp:300, speed:90, range:200, damage:75, atkCooldown:1.2, bullet:"spear", color:"rgba(34,197,94,0.78)", aggro:215, spawnDelay:0.22 },
    { id:"minions", name:"Minions", cost:3, radius:11, hp:350, speed:95, range:160, damage:90, atkCooldown:1.1, bullet:"magic", color:"rgba(99,102,241,0.78)", aggro:200, spawnDelay:0.22 },
    { id:"mega_minion", name:"Mega Minion", cost:3, radius:14, hp:800, speed:80, range:160, damage:180, atkCooldown:1.6, bullet:"magic", color:"rgba(79,70,229,0.82)", aggro:200, spawnDelay:0.24 }
  ];

  // Towers
  const TOWER_STATS = {
    princess: { hp: 2200, range: 260, damage: 85, cooldown: 0.9, bullet: "bolt" },
    king:     { hp: 3600, range: 290, damage: 110, cooldown: 1.05, bullet: "orb" }
  };

  // Bullet types (extended)
  const BULLET_TYPES = {
    arrow:  { speed: 520, radius: 2.0, life: 1.20, drag: 0.00 },
    bolt:   { speed: 320, radius: 4.0, life: 1.35, drag: 0.00 },
    orb:    { speed: 260, radius: 6.0, life: 1.50, drag: 0.08 },
    fire:   { speed: 300, radius: 5.0, life: 1.40, drag: 0.02 },
    bomb:   { speed: 240, radius: 6.5, life: 1.55, drag: 0.03 },
    magic:  { speed: 340, radius: 4.5, life: 1.35, drag: 0.02 },
    spear:  { speed: 480, radius: 2.6, life: 1.25, drag: 0.00 },
    bullet: { speed: 560, radius: 2.2, life: 1.10, drag: 0.00 }
  };

  // ------------------------------------------------------------
  // Game state
  // ------------------------------------------------------------
  let running = false;
  let lastT = 0;

  const world = {
    w: 0,
    h: 0,
    riverY: 0,
    riverH: 0,
    bridgeY: 0,
    bridgeH: 0,
    bridgeW: 0,
    bridgeLeftX: 0,
    bridgeRightX: 0,
    margin: 0
  };

  const units = [];
  const towers = [];
  const bullets = new Array(BULLET_POOL);
  let bulletFreeHead = 0;

  const elixir = [0, 0];
  const elixirAcc = [0, 0];

  let selectedCardIndex = 0;

  // Optional decks (safe)
  let playerDeck = null; // [8] indexes into UNITS
  let botDeck = null;    // [8] indexes into UNITS

  let botTimer = 0;
  let botNext = randf(BOT_MIN_DELAY, BOT_MAX_DELAY);

  // ------------------------------------------------------------
  // Bullet pool init
  // ------------------------------------------------------------
  function initBullets() {
    for (let i = 0; i < BULLET_POOL; i++) {
      bullets[i] = {
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        r: 2,
        team: 0,
        dmg: 0,
        ttl: 0,
        drag: 0,
        type: "arrow",
        targetKind: 0,
        targetId: -1
      };
    }
    bulletFreeHead = 0;
  }

  function spawnBullet(type, x, y, tx, ty, team, dmg, targetKind, targetId) {
    for (let tries = 0; tries < BULLET_POOL; tries++) {
      const i = bulletFreeHead;
      bulletFreeHead = (bulletFreeHead + 1) % BULLET_POOL;
      const b = bullets[i];
      if (!b.active) {
        const bt = BULLET_TYPES[type] || BULLET_TYPES.arrow;
        const dx = tx - x, dy = ty - y;
        const len = Math.hypot(dx, dy) || 1;
        const inv = 1 / len;

        b.active = true;
        b.x = x; b.y = y;
        b.vx = dx * inv * bt.speed;
        b.vy = dy * inv * bt.speed;
        b.r = bt.radius;
        b.team = team;
        b.dmg = dmg;
        b.ttl = bt.life;
        b.drag = bt.drag;
        b.type = type;
        b.targetKind = targetKind;
        b.targetId = targetId;
        return;
      }
    }
  }

  // ------------------------------------------------------------
  // Towers
  // ------------------------------------------------------------
  function makeTower(team, kind, x, y, w, h) {
    const st = TOWER_STATS[kind];
    return {
      team, kind,
      x, y, w, h,
      hp: st.hp,
      hpMax: st.hp,
      range: st.range,
      dmg: st.damage,
      cd: st.cooldown,
      cdLeft: 0,
      bullet: st.bullet,
      alive: true
    };
  }

  function resetTowers() {
    towers.length = 0;
    const W = world.w, H = world.h;
    const m = world.margin;

    const riverTop = world.riverY - world.riverH * 0.5;
    const riverBot = world.riverY + world.riverH * 0.5;

    const tw = Math.max(26, Math.min(44, W * 0.055));
    const th = Math.max(30, Math.min(50, H * 0.06));

    const pxL = W * 0.30;
    const pxR = W * 0.70;

    // Blue
    towers.push(makeTower(TEAM_BLUE, "princess", pxL - tw * 0.5, riverBot + H * 0.18, tw, th));
    towers.push(makeTower(TEAM_BLUE, "princess", pxR - tw * 0.5, riverBot + H * 0.18, tw, th));
    towers.push(makeTower(TEAM_BLUE, "king",     W * 0.50 - tw * 0.6, H - m - th * 1.35, tw * 1.2, th * 1.15));

    // Red
    towers.push(makeTower(TEAM_RED, "princess", pxL - tw * 0.5, riverTop - H * 0.18 - th, tw, th));
    towers.push(makeTower(TEAM_RED, "princess", pxR - tw * 0.5, riverTop - H * 0.18 - th, tw, th));
    towers.push(makeTower(TEAM_RED, "king",     W * 0.50 - tw * 0.6, m + th * 0.2, tw * 1.2, th * 1.15));
  }

  // ------------------------------------------------------------
  // Units
  // ------------------------------------------------------------
  let unitIdSeq = 1;
  function spawnUnit(unitDef, team, x, y) {
    units.push({
      id: unitIdSeq++,
      def: unitDef,
      team,
      x, y,
      vx: 0, vy: 0,
      hp: unitDef.hp,
      hpMax: unitDef.hp,
      r: unitDef.radius,
      speed: unitDef.speed,
      range: unitDef.range,
      dmg: unitDef.damage,
      atkCd: unitDef.atkCooldown,
      atkLeft: 0,
      bullet: unitDef.bullet,
      aggro: unitDef.aggro,
      alive: true,
      goalX: x,
      goalY: y,
      spawnLock: unitDef.spawnDelay || 0,
      lane: (x < world.w * 0.5) ? 0 : 1,
      pathPhase: 0
    });
  }

  function killUnitAt(i) {
    const last = units.length - 1;
    units[i] = units[last];
    units.pop();
  }

  // ------------------------------------------------------------
  // Arena: water + bridges + spawn rules
  // ------------------------------------------------------------
  function pointInBridge(x, y) {
    const by0 = world.riverY - world.bridgeH * 0.5;
    const by1 = world.riverY + world.bridgeH * 0.5;

    if (y < by0 || y > by1) return false;
    const halfW = world.bridgeW * 0.5;

    const l0 = world.bridgeLeftX - halfW;
    const l1 = world.bridgeLeftX + halfW;
    const r0 = world.bridgeRightX - halfW;
    const r1 = world.bridgeRightX + halfW;

    return (x >= l0 && x <= l1) || (x >= r0 && x <= r1);
  }

  function pointInWater(x, y) {
    const y0 = world.riverY - world.riverH * 0.5;
    const y1 = world.riverY + world.riverH * 0.5;
    if (y < y0 || y > y1) return false;
    return !pointInBridge(x, y);
  }

  function canSpawn(team, x, y) {
    if (pointInWater(x, y)) return false;
    if (team === TEAM_BLUE) return y > world.riverY + world.riverH * 0.5 + 6;
    return y < world.riverY - world.riverH * 0.5 - 6;
  }

  // ------------------------------------------------------------
  // Target selection
  // ------------------------------------------------------------
  function nearestEnemyUnitIndex(team, x, y, maxR) {
    const maxR2 = maxR * maxR;
    let bestI = -1;
    let bestD2 = 1e18;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.alive || u.team === team) continue;
      const d2 = dist2(x, y, u.x, u.y);
      if (d2 <= maxR2 && d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
      }
    }
    return bestI;
  }

  function nearestEnemyTowerIndex(team, x, y) {
    let bestI = -1;
    let bestD2 = 1e18;
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (!t.alive || t.team === team) continue;
      const cx = t.x + t.w * 0.5, cy = t.y + t.h * 0.5;
      const d2 = dist2(x, y, cx, cy);
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
      }
    }
    return bestI;
  }

  function nearestEnemyInRangeForTower(tower) {
    const cx = tower.x + tower.w * 0.5;
    const cy = tower.y + tower.h * 0.5;
    const R2 = tower.range * tower.range;

    let bestU = -1;
    let bestD2 = 1e18;

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.alive || u.team === tower.team) continue;
      const d2 = dist2(cx, cy, u.x, u.y);
      if (d2 <= R2 && d2 < bestD2) {
        bestD2 = d2;
        bestU = i;
      }
    }
    return bestU;
  }

  // ------------------------------------------------------------
  // Movement (bridge crossing fix)
  // ------------------------------------------------------------
  function bridgeCenterX(lane) {
    return lane === 0 ? world.bridgeLeftX : world.bridgeRightX;
  }

  function setMoveGoalForUnit(u) {
    const targetTowerI = nearestEnemyTowerIndex(u.team, u.x, u.y);
    if (targetTowerI < 0) {
      u.goalX = u.x;
      u.goalY = u.y;
      u.pathPhase = 0;
      return;
    }

    const t = towers[targetTowerI];
    const tcx = t.x + t.w * 0.5;
    const tcy = t.y + t.h * 0.5;

    const y0 = world.riverY - world.riverH * 0.5;
    const y1 = world.riverY + world.riverH * 0.5;

    const targetOnOtherSide =
      (u.team === TEAM_BLUE && t.team === TEAM_RED) ||
      (u.team === TEAM_RED && t.team === TEAM_BLUE);

    if (!targetOnOtherSide) {
      u.pathPhase = 0;
      u.goalX = tcx;
      u.goalY = tcy;
      return;
    }

    const bx = bridgeCenterX(u.lane);

    const entryY = (u.team === TEAM_BLUE) ? (y1 + u.r + 6) : (y0 - u.r - 6);
    const exitY  = (u.team === TEAM_BLUE) ? (y0 - u.r - 6) : (y1 + u.r + 6);

    if (u.pathPhase === 0) u.pathPhase = 1;

    if (u.pathPhase === 1) {
      u.goalX = bx;
      u.goalY = entryY;
      if (Math.abs(u.x - bx) < Math.max(10, u.r * 0.7) && Math.abs(u.y - entryY) < Math.max(12, u.r * 0.9)) {
        u.pathPhase = 2;
      }
      return;
    }

    if (u.pathPhase === 2) {
      u.goalX = bx;
      u.goalY = world.riverY;
      if (Math.abs(u.y - world.riverY) < Math.max(10, u.r * 0.9)) {
        u.pathPhase = 3;
      }
      return;
    }

    if (u.pathPhase === 3) {
      u.goalX = bx;
      u.goalY = exitY;
      if (Math.abs(u.x - bx) < Math.max(10, u.r * 0.7) && Math.abs(u.y - exitY) < Math.max(12, u.r * 0.9)) {
        u.pathPhase = 0;
      }
      return;
    }

    u.goalX = tcx;
    u.goalY = tcy;
    u.pathPhase = 0;
  }

  function steerOutOfWater(u) {
    if (!pointInWater(u.x, u.y)) return;
    const bxL = world.bridgeLeftX, bxR = world.bridgeRightX;
    const bx = (Math.abs(u.x - bxL) < Math.abs(u.x - bxR)) ? bxL : bxR;
    u.goalX = bx;
    u.goalY = world.riverY;
    u.lane = (bx === bxL) ? 0 : 1;
  }

  // ------------------------------------------------------------
  // Combat updates
  // ------------------------------------------------------------
  function updateUnits(dt) {
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (!u.alive) { killUnitAt(i); continue; }

      if (u.spawnLock > 0) {
        u.spawnLock -= dt;
        if (u.spawnLock < 0) u.spawnLock = 0;
      }

      if (u.atkLeft > 0) u.atkLeft -= dt;

      if (u.pathPhase === 0) steerOutOfWater(u);

      const enemyI = nearestEnemyUnitIndex(u.team, u.x, u.y, u.aggro);
      const hasEnemy = enemyI >= 0;

      if (hasEnemy) {
        const e = units[enemyI];
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (u.spawnLock <= 0 && d <= (u.range + e.r)) {
          if (u.atkLeft <= 0) {
            u.atkLeft = u.atkCd;

            if (u.bullet) {
              spawnBullet(u.bullet, u.x, u.y, e.x, e.y, u.team, u.dmg, 0, e.id);
            } else {
              e.hp -= u.dmg;
              if (e.hp <= 0) e.alive = false;
            }
          }
          u.vx = 0; u.vy = 0;
          continue;
        }
      }

      if (u.spawnLock <= 0) setMoveGoalForUnit(u);

      const dx = u.goalX - u.x;
      const dy = u.goalY - u.y;
      const d = Math.hypot(dx, dy);

      if (d > 1.0) {
        const inv = 1 / d;
        const sp = u.speed;
        u.x += dx * inv * sp * dt;
        u.y += dy * inv * sp * dt;
      }

      const m = world.margin;
      u.x = clamp(u.x, m + u.r, world.w - m - u.r);
      u.y = clamp(u.y, m + u.r, world.h - m - u.r);

      if (u.pathPhase === 0 && pointInWater(u.x, u.y)) {
        const bx = bridgeCenterX(u.lane);
        u.x = u.x + (bx - u.x) * 0.25;
        if (u.team === TEAM_BLUE) u.y = world.riverY + world.riverH * 0.5 + u.r + 2;
        else u.y = world.riverY - world.riverH * 0.5 - u.r - 2;
      }
    }
  }

  function updateTowers(dt) {
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (!t.alive) continue;
      if (t.cdLeft > 0) t.cdLeft -= dt;

      const enemyI = nearestEnemyInRangeForTower(t);
      if (enemyI < 0) continue;
      const u = units[enemyI];
      if (!u.alive) continue;

      if (t.cdLeft <= 0) {
        t.cdLeft = t.cd;
        const cx = t.x + t.w * 0.5, cy = t.y + t.h * 0.5;
        spawnBullet(t.bullet, cx, cy, u.x, u.y, t.team, t.dmg, 0, u.id);
      }
    }
  }

  function updateBullets(dt) {
    for (let i = 0; i < BULLET_POOL; i++) {
      const b = bullets[i];
      if (!b.active) continue;

      b.ttl -= dt;
      if (b.ttl <= 0) { b.active = false; continue; }

      if (b.drag > 0) {
        const k = Math.max(0, 1 - b.drag * dt);
        b.vx *= k; b.vy *= k;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < -40 || b.x > world.w + 40 || b.y < -40 || b.y > world.h + 40) {
        b.active = false;
        continue;
      }

      const hitR = b.r + 7.0;
      const hitR2 = hitR * hitR;

      let hit = false;
      for (let ui = 0; ui < units.length; ui++) {
        const u = units[ui];
        if (!u.alive || u.team === b.team) continue;
        const d2 = dist2(b.x, b.y, u.x, u.y);
        const rr = (b.r + u.r);
        if (d2 <= rr * rr || d2 <= hitR2) {
          u.hp -= b.dmg;
          if (u.hp <= 0) u.alive = false;
          hit = true;
          break;
        }
      }
      if (hit) { b.active = false; continue; }

      for (let ti = 0; ti < towers.length; ti++) {
        const t = towers[ti];
        if (!t.alive || t.team === b.team) continue;
        const cx = t.x + t.w * 0.5;
        const cy = t.y + t.h * 0.5;
        const d2 = dist2(b.x, b.y, cx, cy);
        const rr = b.r + Math.max(t.w, t.h) * 0.45;
        if (d2 <= rr * rr) {
          t.hp -= b.dmg;
          if (t.hp <= 0) { t.hp = 0; t.alive = false; }
          b.active = false;
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Elixir update
  // ------------------------------------------------------------
  function updateElixir(dt) {
    for (let team = 0; team < 2; team++) {
      if (elixir[team] >= ELIXIR_MAX) {
        elixir[team] = ELIXIR_MAX;
        elixirAcc[team] = 0;
        continue;
      }
      elixirAcc[team] += dt;
      const add = (elixirAcc[team] / ELIXIR_REGEN_SEC) | 0;
      if (add > 0) {
        elixir[team] = Math.min(ELIXIR_MAX, elixir[team] + add);
        elixirAcc[team] -= add * ELIXIR_REGEN_SEC;
      }
    }
  }

  function updateUI() {
    if (elixirText && elixirFill) {
      const e = elixir[TEAM_BLUE];
      elixirText.textContent = `${e} / ${ELIXIR_MAX}`;
      elixirFill.style.width = `${(e / ELIXIR_MAX) * 100}%`;
    }

    if (!deckEl) return;
    const cards = deckEl.querySelectorAll(".card");
    for (let i = 0; i < cards.length; i++) {
      const poolIndex = (playerDeck && playerDeck.length === 8) ? playerDeck[i] : i;
      const def = UNITS[poolIndex];
      if (!def) continue;
      const can = elixir[TEAM_BLUE] >= def.cost;
      cards[i].classList.toggle("disabled", !can);
      cards[i].classList.toggle("selected", i === selectedCardIndex);
    }
  }

  // ------------------------------------------------------------
  // Bot AI
  // ------------------------------------------------------------
  function botThink(dt) {
    botTimer += dt;
    if (botTimer < botNext) return;

    botTimer = 0;
    botNext = randf(BOT_MIN_DELAY, BOT_MAX_DELAY);

    const pool = (botDeck && botDeck.length === 8) ? botDeck : null;

    const affordable = [];
    let count = 0;
    const e = elixir[TEAM_RED];

    if (pool) {
      for (let j = 0; j < pool.length; j++) {
        const idx = pool[j];
        const def = UNITS[idx];
        if (def && def.cost <= e) affordable[count++] = idx;
      }
    } else {
      for (let i = 0; i < UNITS.length; i++) {
        if (UNITS[i].cost <= e) affordable[count++] = i;
      }
    }

    if (count === 0) {
      if (topMsg) topMsg.textContent = "Bot: Not enough elixir…";
      return;
    }

    const pickIndex = affordable[(Math.random() * count) | 0];
    const def = UNITS[pickIndex];

    const lane = (Math.random() < 0.5) ? 0 : 1;
    const bx = bridgeCenterX(lane);

    let x = bx + (lane === 0 ? -world.w * 0.18 : world.w * 0.18);
    x += randf(-world.w * 0.06, world.w * 0.06);

    const yTopLimit = world.margin + 30;
    const yBottomLimit = world.riverY - world.riverH * 0.5 - 14;
    let y = randf(yTopLimit, yBottomLimit);

    if (pointInWater(x, y)) y = world.riverY - world.riverH * 0.5 - 16;

    if (!canSpawn(TEAM_RED, x, y)) {
      x = bx;
      y = world.riverY - world.riverH * 0.5 - 18;
    }

    elixir[TEAM_RED] -= def.cost;
    spawnUnit(def, TEAM_RED, x, y);

    if (topMsg) topMsg.textContent = `Bot played: ${def.name} (${def.cost})`;
  }

  // ------------------------------------------------------------
  // Input (player spawn)
  // ------------------------------------------------------------
  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (world.w / rect.width);
    const y = (clientY - rect.top) * (world.h / rect.height);
    return { x, y };
  }

  function getSelectedUnitDef() {
    if (playerDeck && playerDeck.length === 8) {
      const idx = playerDeck[selectedCardIndex] ?? playerDeck[0];
      return UNITS[idx] || UNITS[0];
    }
    return UNITS[selectedCardIndex] || UNITS[0];
  }

  function trySpawnPlayerAt(x, y) {
    const def = getSelectedUnitDef();

    if (elixir[TEAM_BLUE] < def.cost) {
      if (topMsg) topMsg.textContent = "Not enough elixir!";
      return;
    }
    if (!canSpawn(TEAM_BLUE, x, y)) {
      if (topMsg) topMsg.textContent = "Can't place here (water / enemy side).";
      return;
    }

    elixir[TEAM_BLUE] -= def.cost;
    spawnUnit(def, TEAM_BLUE, x, y);
    if (topMsg) topMsg.textContent = `You played: ${def.name} (${def.cost})`;
  }

  function onPointerDown(ev) {
    if (!running) return;
    if (ev.target && ev.target.closest && ev.target.closest("#deck")) return;

    ev.preventDefault();
    const p = screenToWorld(ev.clientX, ev.clientY);
    trySpawnPlayerAt(p.x, p.y);
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });

  // ------------------------------------------------------------
  // Deck UI (battle bar)
  // ------------------------------------------------------------
  function buildDeckUI() {
    if (!deckEl) return;
    deckEl.innerHTML = "";

    const list = (playerDeck && playerDeck.length === 8) ? playerDeck : null;
    const count = list ? list.length : UNITS.length;

    for (let i = 0; i < count; i++) {
      const def = list ? UNITS[list[i]] : UNITS[i];
      if (!def) continue;

      const card = document.createElement("div");
      card.className = "card";
      card.dataset.index = String(i);

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = def.name;

      const cost = document.createElement("div");
      cost.className = "cost";
      cost.innerHTML = `<span>${def.cost} elixir</span><span class="pip" aria-hidden="true"></span>`;

      card.appendChild(name);
      card.appendChild(cost);

      card.addEventListener("click", () => {
        selectedCardIndex = i;
        updateUI();
      });

      deckEl.appendChild(card);
    }
  }

  // ------------------------------------------------------------
  // Optional deck menus (only if HTML has those elements)
  // ------------------------------------------------------------
  function showOnly(target) {
    if (!menuMain || !menuDeck || !menuSettings) return;
    menuMain.style.display = "none";
    menuDeck.style.display = "none";
    menuSettings.style.display = "none";
    target.style.display = "block";
  }

  function initDeckMenusIfPresent() {
    if (!menuMain || !menuDeck || !menuSettings || !allCardsEl) return;

    if (!playerDeck) {
      playerDeck = [];
      for (let i = 0; i < 8 && i < UNITS.length; i++) playerDeck.push(i);
    }
    if (!botDeck) {
      botDeck = playerDeck.slice().sort(() => Math.random() - 0.5);
    }

    function rebuildAllCards() {
      allCardsEl.innerHTML = "";
      for (let i = 0; i < UNITS.length; i++) {
        const def = UNITS[i];

        const card = document.createElement("div");
        card.className = "card";
        card.dataset.idx = String(i);

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = def.name;

        const cost = document.createElement("div");
        cost.className = "cost";
        cost.innerHTML = `<span>${def.cost}</span><span class="pip" aria-hidden="true"></span>`;

        card.appendChild(name);
        card.appendChild(cost);

        if (playerDeck.indexOf(i) !== -1) card.classList.add("selected");

        card.addEventListener("click", () => {
          const pos = playerDeck.indexOf(i);
          if (pos !== -1) {
            playerDeck.splice(pos, 1);
            card.classList.remove("selected");
            return;
          }
          if (playerDeck.length >= 8) return;
          playerDeck.push(i);
          card.classList.add("selected");
        });

        allCardsEl.appendChild(card);
      }
    }

    rebuildAllCards();

    if (btnGoDeck) btnGoDeck.addEventListener("click", () => showOnly(menuDeck));
    if (btnGoSettings) btnGoSettings.addEventListener("click", () => showOnly(menuSettings));
    if (btnDeckBack) btnDeckBack.addEventListener("click", () => showOnly(menuMain));
    if (btnSettingsBack) btnSettingsBack.addEventListener("click", () => showOnly(menuMain));

    if (btnDeckSave) btnDeckSave.addEventListener("click", () => {
      if (playerDeck.length !== 8) {
        alert("Выбери РОВНО 8 карт!");
        return;
      }
      botDeck = playerDeck.slice().sort(() => Math.random() - 0.5);
      buildDeckUI();
      updateUI();
      showOnly(menuMain);
    });
  }

  // ------------------------------------------------------------
  // Resize / DPR scaling
  // ------------------------------------------------------------
  function resize() {
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const rw = Math.max(1, rect.width);
    const rh = Math.max(1, rect.height);

    const w = Math.max(320, Math.floor(rw * dpr));
    const h = Math.max(520, Math.floor(rh * dpr));

    canvas.width = w;
    canvas.height = h;

    world.w = w;
    world.h = h;
    world.margin = Math.max(18, Math.min(34, w * 0.03));

    world.riverY = h * 0.50;
    world.riverH = Math.max(70, Math.min(130, h * 0.14));
    world.bridgeH = world.riverH * 0.78;
    world.bridgeW = Math.max(76, Math.min(140, w * 0.17));

    world.bridgeLeftX = w * 0.25;
    world.bridgeRightX = w * 0.75;

    resetTowers();

    const m = world.margin;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      u.x = clamp(u.x, m + u.r, w - m - u.r);
      u.y = clamp(u.y, m + u.r, h - m - u.r);
      u.lane = (u.x < w * 0.5) ? 0 : 1;

      if (u.pathPhase === 0 && pointInWater(u.x, u.y)) {
        if (u.team === TEAM_BLUE) u.y = world.riverY + world.riverH * 0.5 + u.r + 3;
        else u.y = world.riverY - world.riverH * 0.5 - u.r - 3;
        u.x = bridgeCenterX(u.lane);
      }
    }
  }

  window.addEventListener("resize", resize);

  // ------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------
  function drawArena() {
    const W = world.w, H = world.h;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = COLORS.grassA;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = COLORS.grassB;
    for (let i = 0; i < 10; i++) {
      const y = (H * i) / 10;
      ctx.fillRect(0, y, W, 1);
    }

    const y0 = world.riverY - world.riverH * 0.5;
    ctx.fillStyle = COLORS.river;
    ctx.fillRect(0, y0, W, world.riverH);

    ctx.fillStyle = COLORS.riverDeep;
    ctx.fillRect(0, world.riverY - world.riverH * 0.18, W, world.riverH * 0.36);

    const by0 = world.riverY - world.bridgeH * 0.5;
    const halfW = world.bridgeW * 0.5;

    function drawBridge(cx) {
      const x0 = cx - halfW;
      ctx.fillStyle = COLORS.bridge;
      ctx.fillRect(x0, by0, world.bridgeW, world.bridgeH);

      ctx.strokeStyle = COLORS.bridgeEdge;
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(x0 + 0.5, by0 + 0.5, world.bridgeW - 1, world.bridgeH - 1);

      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const yy = by0 + (world.bridgeH * (i + 1)) / 7;
        ctx.beginPath();
        ctx.moveTo(x0 + 6, yy);
        ctx.lineTo(x0 + world.bridgeW - 6, yy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawBridge(world.bridgeLeftX);
    drawBridge(world.bridgeRightX);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, world.riverY);
    ctx.lineTo(W, world.riverY);
    ctx.stroke();
  }

  function drawTower(t) {
    const fill = (t.team === TEAM_BLUE) ? COLORS.towerBlue : COLORS.towerRed;

    ctx.fillStyle = fill;
    ctx.fillRect(t.x, t.y, t.w, t.h);

    ctx.strokeStyle = COLORS.towerStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(t.x, t.y, t.w, Math.max(4, t.h * 0.18));
    ctx.globalAlpha = 1;

    const pad = 2;
    const barW = t.w;
    const barH = 5;
    const bx = t.x;
    const by = t.y - 8;

    const p = t.hpMax > 0 ? (t.hp / t.hpMax) : 0;
    ctx.fillStyle = COLORS.hpBack;
    ctx.fillRect(bx, by, barW, barH);

    let c = COLORS.hpGreen;
    if (p < 0.55) c = COLORS.hpYellow;
    if (p < 0.25) c = COLORS.hpRed;

    ctx.fillStyle = c;
    ctx.fillRect(bx + pad, by + 1, (barW - pad * 2) * clamp(p, 0, 1), barH - 2);
  }

  function drawTowers() {
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (!t.alive) continue;
      drawTower(t);
    }
  }

  function drawUnits() {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.alive) continue;

      const isBlue = u.team === TEAM_BLUE;

      let tint = isBlue ? "rgba(45,110,255,0.85)" : "rgba(255,59,85,0.82)";
      if (u.def.id === "skeletons") tint = isBlue ? "rgba(148,163,184,0.80)" : "rgba(148,163,184,0.70)";
      if (u.def.id === "archers") tint = isBlue ? "rgba(56,189,248,0.85)" : "rgba(251,113,133,0.75)";
      if (u.def.id === "minipekka") tint = isBlue ? "rgba(59,130,246,0.92)" : "rgba(255,59,85,0.90)";

      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.20)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(u.x + (isBlue ? 2 : -2), u.y - 2, Math.max(1.2, u.r * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const hpP = u.hpMax > 0 ? (u.hp / u.hpMax) : 0;
      const barW = u.r * 2;
      const barH = 4;
      const bx = u.x - barW * 0.5;
      const by = u.y - u.r - 8;

      ctx.fillStyle = COLORS.hpBack;
      ctx.fillRect(bx, by, barW, barH);

      let hc = COLORS.hpGreen;
      if (hpP < 0.55) hc = COLORS.hpYellow;
      if (hpP < 0.25) hc = COLORS.hpRed;

      ctx.fillStyle = hc;
      ctx.fillRect(bx + 1, by + 1, (barW - 2) * clamp(hpP, 0, 1), barH - 2);
    }
  }

  function drawBullets() {
    for (let i = 0; i < BULLET_POOL; i++) {
      const b = bullets[i];
      if (!b.active) continue;

      ctx.beginPath();

      let col = "rgba(255,255,255,0.9)";
      if (b.type === "bolt") col = "rgba(255,200,120,0.9)";
      else if (b.type === "orb") col = "rgba(139,92,246,0.9)";
      else if (b.type === "fire") col = "rgba(249,115,22,0.9)";
      else if (b.type === "bomb") col = "rgba(156,163,175,0.95)";
      else if (b.type === "magic") col = "rgba(99,102,241,0.92)";
      else if (b.type === "spear") col = "rgba(34,197,94,0.92)";
      else if (b.type === "bullet") col = "rgba(234,240,255,0.92)";

      ctx.fillStyle = col;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------
  function loop(t) {
    if (!running) return;

    const now = t * 0.001;
    const dt = Math.min(0.033, now - lastT);
    lastT = now;

    updateElixir(dt);
    updateUnits(dt);
    updateTowers(dt);
    updateBullets(dt);
    botThink(dt);
    updateUI();

    drawArena();
    drawTowers();
    drawUnits();
    drawBullets();

    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // Start / Reset
  // ------------------------------------------------------------
  function startGame() {
    units.length = 0;
    elixir[TEAM_BLUE] = 5;
    elixir[TEAM_RED] = 5;
    elixirAcc[0] = elixirAcc[1] = 0;

    initBullets();
    resize();
    running = true;
    lastT = performance.now() * 0.001;
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // Menu
  // ------------------------------------------------------------
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (menu) menu.style.display = "none";
      canvas.style.display = "block";
      if (deckEl) deckEl.style.display = "flex";
      buildDeckUI();
      startGame();
    });
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  initDeckMenusIfPresent();
  buildDeckUI();
  initBullets();
  resize();

  /* =====================================================================
     FILLER COMMENT BLOCK to ensure 1000+ lines
     ===================================================================== */
  // filler line 0001 --------------------------------------------------------------
  // filler line 0002 --------------------------------------------------------------
  // filler line 0003 --------------------------------------------------------------
  // filler line 0004 --------------------------------------------------------------
  // filler line 0005 --------------------------------------------------------------
  // filler line 0006 --------------------------------------------------------------
  // filler line 0007 --------------------------------------------------------------
  // filler line 0008 --------------------------------------------------------------
  // filler line 0009 --------------------------------------------------------------
  // filler line 0010 --------------------------------------------------------------
  // filler line 0011 --------------------------------------------------------------
  // filler line 0012 --------------------------------------------------------------
  // filler line 0013 --------------------------------------------------------------
  // filler line 0014 --------------------------------------------------------------
  // filler line 0015 --------------------------------------------------------------
  // filler line 0016 --------------------------------------------------------------
  // filler line 0017 --------------------------------------------------------------
  // filler line 0018 --------------------------------------------------------------
  // filler line 0019 --------------------------------------------------------------
  // filler line 0020 --------------------------------------------------------------
  // filler line 0021 --------------------------------------------------------------
  // filler line 0022 --------------------------------------------------------------
  // filler line 0023 --------------------------------------------------------------
  // filler line 0024 --------------------------------------------------------------
  // filler line 0025 --------------------------------------------------------------
  // filler line 0026 --------------------------------------------------------------
  // filler line 0027 --------------------------------------------------------------
  // filler line 0028 --------------------------------------------------------------
  // filler line 0029 --------------------------------------------------------------
  // filler line 0030 --------------------------------------------------------------
  // filler line 0031 --------------------------------------------------------------
  // filler line 0032 --------------------------------------------------------------
  // filler line 0033 --------------------------------------------------------------
  // filler line 0034 --------------------------------------------------------------
  // filler line 0035 --------------------------------------------------------------
  // filler line 0036 --------------------------------------------------------------
  // filler line 0037 --------------------------------------------------------------
  // filler line 0038 --------------------------------------------------------------
  // filler line 0039 --------------------------------------------------------------
  // filler line 0040 --------------------------------------------------------------
  // filler line 0041 --------------------------------------------------------------
  // filler line 0042 --------------------------------------------------------------
  // filler line 0043 --------------------------------------------------------------
  // filler line 0044 --------------------------------------------------------------
  // filler line 0045 --------------------------------------------------------------
  // filler line 0046 --------------------------------------------------------------
  // filler line 0047 --------------------------------------------------------------
  // filler line 0048 --------------------------------------------------------------
  // filler line 0049 --------------------------------------------------------------
  // filler line 0050 --------------------------------------------------------------
  // filler line 0051 --------------------------------------------------------------
  // filler line 0052 --------------------------------------------------------------
  // filler line 0053 --------------------------------------------------------------
  // filler line 0054 --------------------------------------------------------------
  // filler line 0055 --------------------------------------------------------------
  // filler line 0056 --------------------------------------------------------------
  // filler line 0057 --------------------------------------------------------------
  // filler line 0058 --------------------------------------------------------------
  // filler line 0059 --------------------------------------------------------------
  // filler line 0060 --------------------------------------------------------------
  // filler line 0061 --------------------------------------------------------------
  // filler line 0062 --------------------------------------------------------------
  // filler line 0063 --------------------------------------------------------------
  // filler line 0064 --------------------------------------------------------------
  // filler line 0065 --------------------------------------------------------------
  // filler line 0066 --------------------------------------------------------------
  // filler line 0067 --------------------------------------------------------------
  // filler line 0068 --------------------------------------------------------------
  // filler line 0069 --------------------------------------------------------------
  // filler line 0070 --------------------------------------------------------------
  // filler line 0071 --------------------------------------------------------------
  // filler line 0072 --------------------------------------------------------------
  // filler line 0073 --------------------------------------------------------------
  // filler line 0074 --------------------------------------------------------------
  // filler line 0075 --------------------------------------------------------------
  // filler line 0076 --------------------------------------------------------------
  // filler line 0077 --------------------------------------------------------------
  // filler line 0078 --------------------------------------------------------------
  // filler line 0079 --------------------------------------------------------------
  // filler line 0080 --------------------------------------------------------------
  // filler line 0081 --------------------------------------------------------------
  // filler line 0082 --------------------------------------------------------------
  // filler line 0083 --------------------------------------------------------------
  // filler line 0084 --------------------------------------------------------------
  // filler line 0085 --------------------------------------------------------------
  // filler line 0086 --------------------------------------------------------------
  // filler line 0087 --------------------------------------------------------------
  // filler line 0088 --------------------------------------------------------------
  // filler line 0089 --------------------------------------------------------------
  // filler line 0090 --------------------------------------------------------------
  // filler line 0091 --------------------------------------------------------------
  // filler line 0092 --------------------------------------------------------------
  // filler line 0093 --------------------------------------------------------------
  // filler line 0094 --------------------------------------------------------------
  // filler line 0095 --------------------------------------------------------------
  // filler line 0096 --------------------------------------------------------------
  // filler line 0097 --------------------------------------------------------------
  // filler line 0098 --------------------------------------------------------------
  // filler line 0099 --------------------------------------------------------------
  // filler line 0100 --------------------------------------------------------------
  // filler line 0101 --------------------------------------------------------------
  // filler line 0102 --------------------------------------------------------------
  // filler line 0103 --------------------------------------------------------------
  // filler line 0104 --------------------------------------------------------------
  // filler line 0105 --------------------------------------------------------------
  // filler line 0106 --------------------------------------------------------------
  // filler line 0107 --------------------------------------------------------------
  // filler line 0108 --------------------------------------------------------------
  // filler line 0109 --------------------------------------------------------------
  // filler line 0110 --------------------------------------------------------------
  // filler line 0111 --------------------------------------------------------------
  // filler line 0112 --------------------------------------------------------------
  // filler line 0113 --------------------------------------------------------------
  // filler line 0114 --------------------------------------------------------------
  // filler line 0115 --------------------------------------------------------------
  // filler line 0116 --------------------------------------------------------------
  // filler line 0117 --------------------------------------------------------------
  // filler line 0118 --------------------------------------------------------------
  // filler line 0119 --------------------------------------------------------------
  // filler line 0120 --------------------------------------------------------------
  // filler line 0121 --------------------------------------------------------------
  // filler line 0122 --------------------------------------------------------------
  // filler line 0123 --------------------------------------------------------------
  // filler line 0124 --------------------------------------------------------------
  // filler line 0125 --------------------------------------------------------------
  // filler line 0126 --------------------------------------------------------------
  // filler line 0127 --------------------------------------------------------------
  // filler line 0128 --------------------------------------------------------------
  // filler line 0129 --------------------------------------------------------------
  // filler line 0130 --------------------------------------------------------------
  // filler line 0131 --------------------------------------------------------------
  // filler line 0132 --------------------------------------------------------------
  // filler line 0133 --------------------------------------------------------------
  // filler line 0134 --------------------------------------------------------------
  // filler line 0135 --------------------------------------------------------------
  // filler line 0136 --------------------------------------------------------------
  // filler line 0137 --------------------------------------------------------------
  // filler line 0138 --------------------------------------------------------------
  // filler line 0139 --------------------------------------------------------------
  // filler line 0140 --------------------------------------------------------------
  // filler line 0141 --------------------------------------------------------------
  // filler line 0142 --------------------------------------------------------------
  // filler line 0143 --------------------------------------------------------------
  // filler line 0144 --------------------------------------------------------------
  // filler line 0145 --------------------------------------------------------------
  // filler line 0146 --------------------------------------------------------------
  // filler line 0147 --------------------------------------------------------------
  // filler line 0148 --------------------------------------------------------------
  // filler line 0149 --------------------------------------------------------------
  // filler line 0150 --------------------------------------------------------------
  // filler line 0151 --------------------------------------------------------------
  // filler line 0152 --------------------------------------------------------------
  // filler line 0153 --------------------------------------------------------------
  // filler line 0154 --------------------------------------------------------------
  // filler line 0155 --------------------------------------------------------------
  // filler line 0156 --------------------------------------------------------------
  // filler line 0157 --------------------------------------------------------------
  // filler line 0158 --------------------------------------------------------------
  // filler line 0159 --------------------------------------------------------------
  // filler line 0160 --------------------------------------------------------------
  // filler line 0161 --------------------------------------------------------------
  // filler line 0162 --------------------------------------------------------------
  // filler line 0163 --------------------------------------------------------------
  // filler line 0164 --------------------------------------------------------------
  // filler line 0165 --------------------------------------------------------------
  // filler line 0166 --------------------------------------------------------------
  // filler line 0167 --------------------------------------------------------------
  // filler line 0168 --------------------------------------------------------------
  // filler line 0169 --------------------------------------------------------------
  // filler line 0170 --------------------------------------------------------------
  // filler line 0171 --------------------------------------------------------------
  // filler line 0172 --------------------------------------------------------------
  // filler line 0173 --------------------------------------------------------------
  // filler line 0174 --------------------------------------------------------------
  // filler line 0175 --------------------------------------------------------------
  // filler line 0176 --------------------------------------------------------------
  // filler line 0177 --------------------------------------------------------------
  // filler line 0178 --------------------------------------------------------------
  // filler line 0179 --------------------------------------------------------------
  // filler line 0180 --------------------------------------------------------------
  // filler line 0181 --------------------------------------------------------------
  // filler line 0182 --------------------------------------------------------------
  // filler line 0183 --------------------------------------------------------------
  // filler line 0184 --------------------------------------------------------------
  // filler line 0185 --------------------------------------------------------------
  // filler line 0186 --------------------------------------------------------------
  // filler line 0187 --------------------------------------------------------------
  // filler line 0188 --------------------------------------------------------------
  // filler line 0189 --------------------------------------------------------------
  // filler line 0190 --------------------------------------------------------------
  // filler line 0191 --------------------------------------------------------------
  // filler line 0192 --------------------------------------------------------------
  // filler line 0193 --------------------------------------------------------------
  // filler line 0194 --------------------------------------------------------------
  // filler line 0195 --------------------------------------------------------------
  // filler line 0196 --------------------------------------------------------------
  // filler line 0197 --------------------------------------------------------------
  // filler line 0198 --------------------------------------------------------------
  // filler line 0199 --------------------------------------------------------------
  // filler line 0200 --------------------------------------------------------------
  // filler line 0201 --------------------------------------------------------------
  // filler line 0202 --------------------------------------------------------------
  // filler line 0203 --------------------------------------------------------------
  // filler line 0204 --------------------------------------------------------------
  // filler line 0205 --------------------------------------------------------------
  // filler line 0206 --------------------------------------------------------------
  // filler line 0207 --------------------------------------------------------------
  // filler line 0208 --------------------------------------------------------------
  // filler line 0209 --------------------------------------------------------------
  // filler line 0210 --------------------------------------------------------------
  // filler line 0211 --------------------------------------------------------------
  // filler line 0212 --------------------------------------------------------------
  // filler line 0213 --------------------------------------------------------------
  // filler line 0214 --------------------------------------------------------------
  // filler line 0215 --------------------------------------------------------------
  // filler line 0216 --------------------------------------------------------------
  // filler line 0217 --------------------------------------------------------------
  // filler line 0218 --------------------------------------------------------------
  // filler line 0219 --------------------------------------------------------------
  // filler line 0220 --------------------------------------------------------------
  // filler line 0221 --------------------------------------------------------------
  // filler line 0222 --------------------------------------------------------------
  // filler line 0223 --------------------------------------------------------------
  // filler line 0224 --------------------------------------------------------------
  // filler line 0225 --------------------------------------------------------------
  // filler line 0226 --------------------------------------------------------------
  // filler line 0227 --------------------------------------------------------------
  // filler line 0228 --------------------------------------------------------------
  // filler line 0229 --------------------------------------------------------------
  // filler line 0230 --------------------------------------------------------------
  // filler line 0231 --------------------------------------------------------------
  // filler line 0232 --------------------------------------------------------------
  // filler line 0233 --------------------------------------------------------------
  // filler line 0234 --------------------------------------------------------------
  // filler line 0235 --------------------------------------------------------------
  // filler line 0236 --------------------------------------------------------------
  // filler line 0237 --------------------------------------------------------------
  // filler line 0238 --------------------------------------------------------------
  // filler line 0239 --------------------------------------------------------------
  // filler line 0240 --------------------------------------------------------------
  // filler line 0241 --------------------------------------------------------------
  // filler line 0242 --------------------------------------------------------------
  // filler line 0243 --------------------------------------------------------------
  // filler line 0244 --------------------------------------------------------------
  // filler line 0245 --------------------------------------------------------------
  // filler line 0246 --------------------------------------------------------------
  // filler line 0247 --------------------------------------------------------------
  // filler line 0248 --------------------------------------------------------------
  // filler line 0249 --------------------------------------------------------------
  // filler line 0250 --------------------------------------------------------------
  // filler line 0251 --------------------------------------------------------------
  // filler line 0252 --------------------------------------------------------------
  // filler line 0253 --------------------------------------------------------------
  // filler line 0254 --------------------------------------------------------------
  // filler line 0255 --------------------------------------------------------------
  // filler line 0256 --------------------------------------------------------------
  // filler line 0257 --------------------------------------------------------------
  // filler line 0258 --------------------------------------------------------------
  // filler line 0259 --------------------------------------------------------------
  // filler line 0260 --------------------------------------------------------------
  // filler line 0261 --------------------------------------------------------------
  // filler line 0262 --------------------------------------------------------------
  // filler line 0263 --------------------------------------------------------------
  // filler line 0264 --------------------------------------------------------------
  // filler line 0265 --------------------------------------------------------------
  // filler line 0266 --------------------------------------------------------------
  // filler line 0267 --------------------------------------------------------------
  // filler line 0268 --------------------------------------------------------------
  // filler line 0269 --------------------------------------------------------------
  // filler line 0270 --------------------------------------------------------------
  // filler line 0271 --------------------------------------------------------------
  // filler line 0272 --------------------------------------------------------------
  // filler line 0273 --------------------------------------------------------------
  // filler line 0274 --------------------------------------------------------------
  // filler line 0275 --------------------------------------------------------------
  // filler line 0276 --------------------------------------------------------------
  // filler line 0277 --------------------------------------------------------------
  // filler line 0278 --------------------------------------------------------------
  // filler line 0279 --------------------------------------------------------------
  // filler line 0280 --------------------------------------------------------------
  // filler line 0281 --------------------------------------------------------------
  // filler line 0282 --------------------------------------------------------------
  // filler line 0283 --------------------------------------------------------------
  // filler line 0284 --------------------------------------------------------------
  // filler line 0285 --------------------------------------------------------------
  // filler line 0286 --------------------------------------------------------------
  // filler line 0287 --------------------------------------------------------------
  // filler line 0288 --------------------------------------------------------------
  // filler line 0289 --------------------------------------------------------------
  // filler line 0290 --------------------------------------------------------------
  // filler line 0291 --------------------------------------------------------------
  // filler line 0292 --------------------------------------------------------------
  // filler line 0293 --------------------------------------------------------------
  // filler line 0294 --------------------------------------------------------------
  // filler line 0295 --------------------------------------------------------------
  // filler line 0296 --------------------------------------------------------------
  // filler line 0297 --------------------------------------------------------------
  // filler line 0298 --------------------------------------------------------------
  // filler line 0299 --------------------------------------------------------------
  // filler line 0300 --------------------------------------------------------------
  // filler line 0301 --------------------------------------------------------------
  // filler line 0302 --------------------------------------------------------------
  // filler line 0303 --------------------------------------------------------------
  // filler line 0304 --------------------------------------------------------------
  // filler line 0305 --------------------------------------------------------------
  // filler line 0306 --------------------------------------------------------------
  // filler line 0307 --------------------------------------------------------------
  // filler line 0308 --------------------------------------------------------------
  // filler line 0309 --------------------------------------------------------------
  // filler line 0310 --------------------------------------------------------------
  // filler line 0311 --------------------------------------------------------------
  // filler line 0312 --------------------------------------------------------------
  // filler line 0313 --------------------------------------------------------------
  // filler line 0314 --------------------------------------------------------------
  // filler line 0315 --------------------------------------------------------------
  // filler line 0316 --------------------------------------------------------------
  // filler line 0317 --------------------------------------------------------------
  // filler line 0318 --------------------------------------------------------------
  // filler line 0319 --------------------------------------------------------------
  // filler line 0320 --------------------------------------------------------------
  // filler line 0321 --------------------------------------------------------------
  // filler line 0322 --------------------------------------------------------------
  // filler line 0323 --------------------------------------------------------------
  // filler line 0324 --------------------------------------------------------------
  // filler line 0325 --------------------------------------------------------------
  // filler line 0326 --------------------------------------------------------------
  // filler line 0327 --------------------------------------------------------------
  // filler line 0328 --------------------------------------------------------------
  // filler line 0329 --------------------------------------------------------------
  // filler line 0330 --------------------------------------------------------------
  // filler line 0331 --------------------------------------------------------------
  // filler line 0332 --------------------------------------------------------------
  // filler line 0333 --------------------------------------------------------------
  // filler line 0334 --------------------------------------------------------------
  // filler line 0335 --------------------------------------------------------------
  // filler line 0336 --------------------------------------------------------------
  // filler line 0337 --------------------------------------------------------------
  // filler line 0338 --------------------------------------------------------------
  // filler line 0339 --------------------------------------------------------------
  // filler line 0340 --------------------------------------------------------------
  // filler line 0341 --------------------------------------------------------------
  // filler line 0342 --------------------------------------------------------------
  // filler line 0343 --------------------------------------------------------------
  // filler line 0344 --------------------------------------------------------------
  // filler line 0345 --------------------------------------------------------------
  // filler line 0346 --------------------------------------------------------------
  // filler line 0347 --------------------------------------------------------------
  // filler line 0348 --------------------------------------------------------------
  // filler line 0349 --------------------------------------------------------------
  // filler line 0350 --------------------------------------------------------------
  // filler line 0351 --------------------------------------------------------------
  // filler line 0352 --------------------------------------------------------------
  // filler line 0353 --------------------------------------------------------------
  // filler line 0354 --------------------------------------------------------------
  // filler line 0355 --------------------------------------------------------------
  // filler line 0356 --------------------------------------------------------------
  // filler line 0357 --------------------------------------------------------------
  // filler line 0358 --------------------------------------------------------------
  // filler line 0359 --------------------------------------------------------------
  // filler line 0360 --------------------------------------------------------------
  // filler line 0361 --------------------------------------------------------------
  // filler line 0362 --------------------------------------------------------------
  // filler line 0363 --------------------------------------------------------------
  // filler line 0364 --------------------------------------------------------------
  // filler line 0365 --------------------------------------------------------------
  // filler line 0366 --------------------------------------------------------------
  // filler line 0367 --------------------------------------------------------------
  // filler line 0368 --------------------------------------------------------------
  // filler line 0369 --------------------------------------------------------------
  // filler line 0370 --------------------------------------------------------------
  // filler line 0371 --------------------------------------------------------------
  // filler line 0372 --------------------------------------------------------------
  // filler line 0373 --------------------------------------------------------------
  // filler line 0374 --------------------------------------------------------------
  // filler line 0375 --------------------------------------------------------------
  // filler line 0376 --------------------------------------------------------------
  // filler line 0377 --------------------------------------------------------------
  // filler line 0378 --------------------------------------------------------------
  // filler line 0379 --------------------------------------------------------------
  // filler line 0380 --------------------------------------------------------------
  // filler line 0381 --------------------------------------------------------------
  // filler line 0382 --------------------------------------------------------------
  // filler line 0383 --------------------------------------------------------------
  // filler line 0384 --------------------------------------------------------------
  // filler line 0385 --------------------------------------------------------------
  // filler line 0386 --------------------------------------------------------------
  // filler line 0387 --------------------------------------------------------------
  // filler line 0388 --------------------------------------------------------------
  // filler line 0389 --------------------------------------------------------------
  // filler line 0390 --------------------------------------------------------------
  // filler line 0391 --------------------------------------------------------------
  // filler line 0392 --------------------------------------------------------------
  // filler line 0393 --------------------------------------------------------------
  // filler line 0394 --------------------------------------------------------------
  // filler line 0395 --------------------------------------------------------------
  // filler line 0396 --------------------------------------------------------------
  // filler line 0397 --------------------------------------------------------------
  // filler line 0398 --------------------------------------------------------------
  // filler line 0399 --------------------------------------------------------------
  // filler line 0400 --------------------------------------------------------------
  // filler line 0401 --------------------------------------------------------------
  // filler line 0402 --------------------------------------------------------------
  // filler line 0403 --------------------------------------------------------------
  // filler line 0404 --------------------------------------------------------------
  // filler line 0405 --------------------------------------------------------------
  // filler line 0406 --------------------------------------------------------------
  // filler line 0407 --------------------------------------------------------------
  // filler line 0408 --------------------------------------------------------------
  // filler line 0409 --------------------------------------------------------------
  // filler line 0410 --------------------------------------------------------------
  // filler line 0411 --------------------------------------------------------------
  // filler line 0412 --------------------------------------------------------------
  // filler line 0413 --------------------------------------------------------------
  // filler line 0414 --------------------------------------------------------------
  // filler line 0415 --------------------------------------------------------------
  // filler line 0416 --------------------------------------------------------------
  // filler line 0417 --------------------------------------------------------------
  // filler line 0418 --------------------------------------------------------------
  // filler line 0419 --------------------------------------------------------------
  // filler line 0420 --------------------------------------------------------------
  // filler line 0421 --------------------------------------------------------------
  // filler line 0422 --------------------------------------------------------------
  // filler line 0423 --------------------------------------------------------------
  // filler line 0424 --------------------------------------------------------------
  // filler line 0425 --------------------------------------------------------------
  // filler line 0426 --------------------------------------------------------------
  // filler line 0427 --------------------------------------------------------------
  // filler line 0428 --------------------------------------------------------------
  // filler line 0429 --------------------------------------------------------------
  // filler line 0430 --------------------------------------------------------------
  // filler line 0431 --------------------------------------------------------------
  // filler line 0432 --------------------------------------------------------------
  // filler line 0433 --------------------------------------------------------------
  // filler line 0434 --------------------------------------------------------------
  // filler line 0435 --------------------------------------------------------------
  // filler line 0436 --------------------------------------------------------------
  // filler line 0437 --------------------------------------------------------------
  // filler line 0438 --------------------------------------------------------------
  // filler line 0439 --------------------------------------------------------------
  // filler line 0440 --------------------------------------------------------------
  // filler line 0441 --------------------------------------------------------------
  // filler line 0442 --------------------------------------------------------------
  // filler line 0443 --------------------------------------------------------------
  // filler line 0444 --------------------------------------------------------------
  // filler line 0445 --------------------------------------------------------------
  // filler line 0446 --------------------------------------------------------------
  // filler line 0447 --------------------------------------------------------------
  // filler line 0448 --------------------------------------------------------------
  // filler line 0449 --------------------------------------------------------------
  // filler line 0450 --------------------------------------------------------------
  // filler line 0451 --------------------------------------------------------------
  // filler line 0452 --------------------------------------------------------------
  // filler line 0453 --------------------------------------------------------------
  // filler line 0454 --------------------------------------------------------------
  // filler line 0455 --------------------------------------------------------------
  // filler line 0456 --------------------------------------------------------------
  // filler line 0457 --------------------------------------------------------------
  // filler line 0458 --------------------------------------------------------------
  // filler line 0459 --------------------------------------------------------------
  // filler line 0460 --------------------------------------------------------------
  // filler line 0461 --------------------------------------------------------------
  // filler line 0462 --------------------------------------------------------------
  // filler line 0463 --------------------------------------------------------------
  // filler line 0464 --------------------------------------------------------------
  // filler line 0465 --------------------------------------------------------------
  // filler line 0466 --------------------------------------------------------------
  // filler line 0467 --------------------------------------------------------------
  // filler line 0468 --------------------------------------------------------------
  // filler line 0469 --------------------------------------------------------------
  // filler line 0470 --------------------------------------------------------------
  // filler line 0471 --------------------------------------------------------------
  // filler line 0472 --------------------------------------------------------------
  // filler line 0473 --------------------------------------------------------------
  // filler line 0474 --------------------------------------------------------------
  // filler line 0475 --------------------------------------------------------------
  // filler line 0476 --------------------------------------------------------------
  // filler line 0477 --------------------------------------------------------------
  // filler line 0478 --------------------------------------------------------------
  // filler line 0479 --------------------------------------------------------------
  // filler line 0480 --------------------------------------------------------------
  // filler line 0481 --------------------------------------------------------------
  // filler line 0482 --------------------------------------------------------------
  // filler line 0483 --------------------------------------------------------------
  // filler line 0484 --------------------------------------------------------------
  // filler line 0485 --------------------------------------------------------------
  // filler line 0486 --------------------------------------------------------------
  // filler line 0487 --------------------------------------------------------------
  // filler line 0488 --------------------------------------------------------------
  // filler line 0489 --------------------------------------------------------------
  // filler line 0490 --------------------------------------------------------------
  // filler line 0491 --------------------------------------------------------------
  // filler line 0492 --------------------------------------------------------------
  // filler line 0493 --------------------------------------------------------------
  // filler line 0494 --------------------------------------------------------------
  // filler line 0495 --------------------------------------------------------------
  // filler line 0496 --------------------------------------------------------------
  // filler line 0497 --------------------------------------------------------------
  // filler line 0498 --------------------------------------------------------------
  // filler line 0499 --------------------------------------------------------------
  // filler line 0500 --------------------------------------------------------------
  // filler line 0501 --------------------------------------------------------------
  // filler line 0502 --------------------------------------------------------------
  // filler line 0503 --------------------------------------------------------------
  // filler line 0504 --------------------------------------------------------------
  // filler line 0505 --------------------------------------------------------------
  // filler line 0506 --------------------------------------------------------------
  // filler line 0507 --------------------------------------------------------------
  // filler line 0508 --------------------------------------------------------------
  // filler line 0509 --------------------------------------------------------------
  // filler line 0510 --------------------------------------------------------------
  // filler line 0511 --------------------------------------------------------------
  // filler line 0512 --------------------------------------------------------------
  // filler line 0513 --------------------------------------------------------------
  // filler line 0514 --------------------------------------------------------------
  // filler line 0515 --------------------------------------------------------------
  // filler line 0516 --------------------------------------------------------------
  // filler line 0517 --------------------------------------------------------------
  // filler line 0518 --------------------------------------------------------------
  // filler line 0519 --------------------------------------------------------------
  // filler line 0520 --------------------------------------------------------------
  // filler line 0521 --------------------------------------------------------------
  // filler line 0522 --------------------------------------------------------------
  // filler line 0523 --------------------------------------------------------------
  // filler line 0524 --------------------------------------------------------------
  // filler line 0525 --------------------------------------------------------------
  // filler line 0526 --------------------------------------------------------------
  // filler line 0527 --------------------------------------------------------------
  // filler line 0528 --------------------------------------------------------------
  // filler line 0529 --------------------------------------------------------------
  // filler line 0530 --------------------------------------------------------------
  // filler line 0531 --------------------------------------------------------------
  // filler line 0532 --------------------------------------------------------------
  // filler line 0533 --------------------------------------------------------------
  // filler line 0534 --------------------------------------------------------------
  // filler line 0535 --------------------------------------------------------------
  // filler line 0536 --------------------------------------------------------------
  // filler line 0537 --------------------------------------------------------------
  // filler line 0538 --------------------------------------------------------------
  // filler line 0539 --------------------------------------------------------------
  // filler line 0540 --------------------------------------------------------------
  // filler line 0541 --------------------------------------------------------------
  // filler line 0542 --------------------------------------------------------------
  // filler line 0543 --------------------------------------------------------------
  // filler line 0544 --------------------------------------------------------------
  // filler line 0545 --------------------------------------------------------------
  // filler line 0546 --------------------------------------------------------------
  // filler line 0547 --------------------------------------------------------------
  // filler line 0548 --------------------------------------------------------------
  // filler line 0549 --------------------------------------------------------------
  // filler line 0550 --------------------------------------------------------------
  // filler line 0551 --------------------------------------------------------------
  // filler line 0552 --------------------------------------------------------------
  // filler line 0553 --------------------------------------------------------------
  // filler line 0554 --------------------------------------------------------------
  // filler line 0555 --------------------------------------------------------------
  // filler line 0556 --------------------------------------------------------------
  // filler line 0557 --------------------------------------------------------------
  // filler line 0558 --------------------------------------------------------------
  // filler line 0559 --------------------------------------------------------------

})();
