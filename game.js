(() => {
  "use strict";

  /* =========================================================
     CLASH ROYALE WEB ARENA (Canvas 2D)
     - Vertical arena, river center, two bridges (left/right)
     - 2 Princess + 1 King tower per side
     - Elixir 0..10, regen ~ 1 per 2.8 sec
     - Deck (8 cards), 4-card hand + next
     - Bot places cards every 3-6 seconds
     - Units can NOT walk on water; cross river ONLY via bridges
     - Different projectile types, HP bars, tower destruction
     - No images / no SVG / no libraries
  ========================================================= */

  const $ = (id) => document.getElementById(id);

  // Screens
  const menuMain = $("menuMain");
  const menuDeck = $("menuDeck");
  const menuSettings = $("menuSettings");
  const hud = $("hud");
  const gameOver = $("gameOver");

  // Buttons
  const btnPlay = $("btnPlay");
  const btnDeck = $("btnDeck");
  const btnSettings = $("btnSettings");
  const deckBack = $("deckBack");
  const deckBack2 = $("deckBack2");
  const settingsBack = $("settingsBack");
  const settingsBack2 = $("settingsBack2");
  const btnFullscreen = $("btnFullscreen");
  const btnExit = $("btnExit");
  const btnReplay = $("btnReplay");
  const btnBackMenu = $("btnBackMenu");

  // Deck UI
  const deckSelectedEl = $("deckSelected");
  const allCardsGrid = $("allCardsGrid");

  // Settings UI
  const volume = $("volume");
  const volValue = $("volValue");

  // HUD UI
  const handRow = $("handRow");
  const nextCardEl = $("nextCard");
  const elixirFill = $("elixirFill");
  const elixirNum = $("elixirNum");
  const placementHint = $("placementHint");
  const enemyMini = $("enemyMini");
  const youMini = $("youMini");

  // Game Over UI
  const gameOverTitle = $("gameOverTitle");
  const gameOverSub = $("gameOverSub");

  // Canvas
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  const COLORS = {
    uiText: "#eaf0ff",
    uiMuted: "rgba(234,240,255,0.72)",
    purple: "#a855f7",
    purple2: "#7c3aed",
    blue: "#3b82f6",
    red: "#ef4444",
    outlineDark: "rgba(0,0,0,0.45)",
    outlineLight: "rgba(255,255,255,0.18)",
  };

  /* =========================================================
     CARD DATABASE (12 troops required)
     Each includes:
     - HP, Damage, Attack speed, Range, Speed, Radius, Cost
     - Attack type (melee / ranged)
  ========================================================= */
  const CARDS = [
    {
      id: "knight",
      name: "Knight",
      cost: 3,
      hp: 1000,
      dmg: 140,
      atkSpd: 1.2,
      range: 24,
      speed: 78,
      radius: 16,
      atkType: "melee",
      tags: ["ground"],
    },
    {
      id: "minipekka",
      name: "Mini P.E.K.K.A",
      cost: 4,
      hp: 900,
      dmg: 290,
      atkSpd: 1.6,
      range: 22,
      speed: 82,
      radius: 14,
      atkType: "melee",
      tags: ["ground"],
    },
    {
      id: "archers",
      name: "Archers",
      cost: 3,
      hp: 420,
      dmg: 85,
      atkSpd: 1.1,
      range: 170,
      speed: 74,
      radius: 12,
      atkType: "ranged",
      projectile: { type: "arrow", speed: 360, splash: 0 },
      spawn: 2,
      tags: ["ground", "ranged"],
    },
    {
      id: "skeletons",
      name: "Skeletons",
      cost: 1,
      hp: 180,
      dmg: 55,
      atkSpd: 1.0,
      range: 22,
      speed: 88,
      radius: 10,
      atkType: "melee",
      spawn: 3,
      tags: ["ground", "swarm"],
    },
    {
      id: "giant",
      name: "Giant",
      cost: 5,
      hp: 2400,
      dmg: 160,
      atkSpd: 1.5,
      range: 24,
      speed: 56,
      radius: 20,
      atkType: "melee",
      tags: ["ground", "tank", "towerTarget"],
    },
    {
      id: "musketeer",
      name: "Musketeer",
      cost: 4,
      hp: 720,
      dmg: 135,
      atkSpd: 1.2,
      range: 200,
      speed: 70,
      radius: 14,
      atkType: "ranged",
      projectile: { type: "bullet", speed: 440, splash: 0 },
      tags: ["ground", "ranged"],
    },
    {
      id: "valkyrie",
      name: "Valkyrie",
      cost: 4,
      hp: 1300,
      dmg: 140,
      atkSpd: 1.3,
      range: 26,
      speed: 72,
      radius: 16,
      atkType: "melee",
      splashMelee: 42,
      tags: ["ground", "splash"],
    },
    {
      id: "wizard",
      name: "Wizard",
      cost: 5,
      hp: 720,
      dmg: 150,
      atkSpd: 1.4,
      range: 190,
      speed: 66,
      radius: 14,
      atkType: "ranged",
      projectile: { type: "fireball", speed: 300, splash: 54 },
      tags: ["ground", "ranged", "splash"],
    },
    {
      id: "babydragon",
      name: "Baby Dragon",
      cost: 4,
      hp: 1150,
      dmg: 135,
      atkSpd: 1.5,
      range: 170,
      speed: 74,
      radius: 16,
      atkType: "ranged",
      projectile: { type: "dragonfire", speed: 320, splash: 46 },
      tags: ["ground", "ranged", "splash"],
    },
    {
      id: "hogrider",
      name: "Hog Rider",
      cost: 4,
      hp: 1200,
      dmg: 185,
      atkSpd: 1.4,
      range: 24,
      speed: 98,
      radius: 16,
      atkType: "melee",
      tags: ["ground", "towerTarget", "fast"],
    },
    {
      id: "minions",
      name: "Minions",
      cost: 3,
      hp: 310,
      dmg: 75,
      atkSpd: 1.1,
      range: 22,
      speed: 92,
      radius: 12,
      atkType: "melee",
      spawn: 3,
      tags: ["ground", "swarm"],
    },
    {
      id: "bomber",
      name: "Bomber",
      cost: 2,
      hp: 500,
      dmg: 165,
      atkSpd: 1.8,
      range: 160,
      speed: 68,
      radius: 13,
      atkType: "ranged",
      projectile: { type: "bomb", speed: 260, splash: 56, arc: true },
      tags: ["ground", "ranged", "splash"],
    },
  ];

  const CARD_BY_ID = Object.create(null);
  for (const c of CARDS) CARD_BY_ID[c.id] = c;

  const DEFAULT_DECK = [
    "knight","archers","minipekka","giant",
    "musketeer","valkyrie","skeletons","hogrider"
  ];

  const STORAGE_KEY = "cr_web_deck_v1";

  /* =========================================================
     UI NAVIGATION
  ========================================================= */
  let currentScreen = "main";

  function showScreen(name) {
    currentScreen = name;

    // hide all screens
    menuMain.classList.remove("active");
    menuDeck.classList.remove("active");
    menuSettings.classList.remove("active");
    gameOver.classList.remove("active");

    // HUD toggling
    if (name === "match") {
      hud.classList.remove("hidden");
    } else {
      hud.classList.add("hidden");
      placementHint.classList.add("hidden");
    }

    if (name === "main") menuMain.classList.add("active");
    if (name === "deck") menuDeck.classList.add("active");
    if (name === "settings") menuSettings.classList.add("active");
    if (name === "gameover") gameOver.classList.add("active");
  }

  /* =========================================================
     DECK SELECTION STATE
  ========================================================= */
  function loadDeck() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_DECK.slice(0, 8);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_DECK.slice(0, 8);
      const cleaned = parsed.filter((id) => CARD_BY_ID[id]);
      // Ensure uniqueness and max 8
      const uniq = [];
      for (const id of cleaned) if (!uniq.includes(id)) uniq.push(id);
      while (uniq.length < 8) {
        const fallback = DEFAULT_DECK.find((x) => !uniq.includes(x)) || CARDS.find((x) => !uniq.includes(x.id))?.id;
        if (!fallback) break;
        uniq.push(fallback);
      }
      return uniq.slice(0, 8);
    } catch {
      return DEFAULT_DECK.slice(0, 8);
    }
  }

  function saveDeck(deckIds) {
    const uniq = [];
    for (const id of deckIds) if (CARD_BY_ID[id] && !uniq.includes(id)) uniq.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniq.slice(0, 8)));
  }

  let selectedDeck = loadDeck();

  function renderDeckUI() {
    deckSelectedEl.innerHTML = "";
    allCardsGrid.innerHTML = "";

    // Selected 8
    for (let i = 0; i < 8; i++) {
      const id = selectedDeck[i];
      const card = CARD_BY_ID[id];
      const tile = document.createElement("div");
      tile.className = "cardTile selected";
      tile.dataset.cardId = id;

      tile.innerHTML = `
        <div class="costBubble">${card.cost}</div>
        <div class="cardName">${card.name}</div>
        <div class="cardMeta">${card.atkType.toUpperCase()} • HP ${card.hp}</div>
      `;

      tile.addEventListener("click", () => {
        // remove from selected
        selectedDeck = selectedDeck.filter((x) => x !== id);
        while (selectedDeck.length < 8) {
          const add = CARDS.find((c) => !selectedDeck.includes(c.id))?.id;
          if (!add) break;
          selectedDeck.push(add);
        }
        saveDeck(selectedDeck);
        renderDeckUI();
      });

      deckSelectedEl.appendChild(tile);
    }

    // All cards
    for (const card of CARDS) {
      const tile = document.createElement("div");
      const isSel = selectedDeck.includes(card.id);
      tile.className = "cardTile" + (isSel ? " selected" : "");
      tile.dataset.cardId = card.id;

      tile.innerHTML = `
        <div class="costBubble">${card.cost}</div>
        <div class="cardName">${card.name}</div>
        <div class="cardMeta">${card.atkType.toUpperCase()} • DMG ${card.dmg}</div>
      `;

      tile.addEventListener("click", () => {
        const already = selectedDeck.includes(card.id);
        if (already) {
          // can't go below 8; keep exactly 8 selected
          // So: ignore removal from ALL list (remove only via selected slots)
          // For CR-like behavior: tap on All toggles, but limit to 8.
          // We'll support toggle:
          selectedDeck = selectedDeck.filter((x) => x !== card.id);
          while (selectedDeck.length < 8) {
            const add = CARDS.find((c) => !selectedDeck.includes(c.id))?.id;
            if (!add) break;
            selectedDeck.push(add);
          }
        } else {
          if (selectedDeck.length >= 8) {
            // can't add more than 8
            // small shake feedback
            tile.style.transform = "translateY(2px) scale(0.98)";
            setTimeout(() => (tile.style.transform = ""), 140);
            return;
          }
          selectedDeck.push(card.id);
        }
        saveDeck(selectedDeck);
        renderDeckUI();
      });

      allCardsGrid.appendChild(tile);
    }
  }

  /* =========================================================
     FULLSCREEN
  ========================================================= */
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore (some browsers block)
    }
  }

  /* =========================================================
     GAME STATE
  ========================================================= */
  const SIDE = { YOU: 0, ENEMY: 1 };

  let gameState = "menu"; // menu | match | gameover
  let tNow = 0;
  let lastTime = 0;

  // Elixir
  const ELIXIR_MAX = 10;
  const ELIXIR_REGEN_SECONDS_PER_1 = 2.8; // ~Clash Royale feel
  const ELIXIR_RATE = 1 / ELIXIR_REGEN_SECONDS_PER_1;

  const state = {
    youElixir: 0,
    enemyElixir: 0,

    youDeck: [],
    enemyDeck: [],

    youQueue: [],
    enemyQueue: [],
    youHand: [],
    enemyHand: [],

    youNext: null,
    enemyNext: null,

    selectedHandIndex: -1, // 0..3
    selectedCardId: null,

    // Bot
    botTimer: 0,

    // Arena
    map: null,

    // Entities
    units: [],
    projectiles: [],
    towers: [],

    // Input
    pointer: { x: 0, y: 0, down: false, over: false },

    // Outcome
    winner: null,
    reason: "",
  };

  /* =========================================================
     MAP LAYOUT (computed on resize)
  ========================================================= */
  function buildMap(w, h) {
    const riverY = h * 0.5;
    const riverH = h * 0.14;
    const riverTop = riverY - riverH / 2;
    const riverBottom = riverY + riverH / 2;

    const bridgeW = w * 0.18;
    const bridgeH = riverH;
    const bridgeY = riverTop;

    const bridgeLeft = {
      cx: w * 0.25,
      rect: { x: w * 0.25 - bridgeW / 2, y: bridgeY, w: bridgeW, h: bridgeH },
      lane: "left",
    };
    const bridgeRight = {
      cx: w * 0.75,
      rect: { x: w * 0.75 - bridgeW / 2, y: bridgeY, w: bridgeW, h: bridgeH },
      lane: "right",
    };

    // Tower positions (CR-like)
    const princessOffsetY = h * 0.18;
    const kingOffsetY = h * 0.10;

    const youPrincessY = riverBottom + princessOffsetY;
    const enemyPrincessY = riverTop - princessOffsetY;

    const youKingY = h - (h * 0.08 + kingOffsetY);
    const enemyKingY = (h * 0.08 + kingOffsetY);

    const laneXLeft = w * 0.28;
    const laneXRight = w * 0.72;

    return {
      w, h,
      riverY, riverH, riverTop, riverBottom,
      bridges: [bridgeLeft, bridgeRight],
      lanes: { leftX: laneXLeft, rightX: laneXRight },
      placements: {
        youMinY: riverBottom + 14,
        youMaxY: h - 20,
        enemyMinY: 20,
        enemyMaxY: riverTop - 14
      },
      towerPos: {
        youPrincessL: { x: laneXLeft, y: youPrincessY },
        youPrincessR: { x: laneXRight, y: youPrincessY },
        youKing: { x: w * 0.5, y: youKingY },

        enemyPrincessL: { x: laneXLeft, y: enemyPrincessY },
        enemyPrincessR: { x: laneXRight, y: enemyPrincessY },
        enemyKing: { x: w * 0.5, y: enemyKingY },
      }
    };
  }

  function isInsideRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function isInBridge(map, x, y) {
    for (const b of map.bridges) {
      if (isInsideRect(x, y, b.rect)) return true;
    }
    return false;
  }

  function isInWater(map, x, y) {
    const inRiverBand = (y >= map.riverTop && y <= map.riverBottom);
    if (!inRiverBand) return false;
    return !isInBridge(map, x, y);
  }

  function sideOfRiver(map, y) {
    if (y > map.riverBottom) return "bottom";
    if (y < map.riverTop) return "top";
    return "river";
  }

  function mustCrossRiver(map, yFrom, yTo) {
    const a = sideOfRiver(map, yFrom);
    const b = sideOfRiver(map, yTo);
    if (a === "river" || b === "river") return false;
    return a !== b;
  }

  function pickBestBridge(map, ux, uy, tx, ty) {
    let best = null;
    let bestCost = Infinity;

    const fromBottom = (uy > map.riverBottom);
    for (const b of map.bridges) {
      const entryLandY = fromBottom ? (map.riverBottom + 16) : (map.riverTop - 16);
      const exitLandY  = fromBottom ? (map.riverTop - 16) : (map.riverBottom + 16);

      const entry = { x: b.cx, y: entryLandY };
      const exit  = { x: b.cx, y: exitLandY };

      const c = dist(ux, uy, entry.x, entry.y) + dist(entry.x, entry.y, exit.x, exit.y) + dist(exit.x, exit.y, tx, ty);
      if (c < bestCost) { bestCost = c; best = b; }
    }
    return best || map.bridges[0];
  }

  function computePath(map, unit, tx, ty) {
    // Always ensure: no water crossing outside bridges
    const path = [];
    const needsCross = mustCrossRiver(map, unit.y, ty);

    if (!needsCross) {
      path.push({ x: tx, y: ty });
      return path;
    }

    const b = pickBestBridge(map, unit.x, unit.y, tx, ty);
    const fromBottom = (unit.y > map.riverBottom);

    const entryLand = { x: b.cx, y: fromBottom ? (map.riverBottom + unit.radius + 10) : (map.riverTop - unit.radius - 10) };
    const intoBridge = { x: b.cx, y: fromBottom ? (map.riverBottom - 2) : (map.riverTop + 2) };
    const outBridge  = { x: b.cx, y: fromBottom ? (map.riverTop + 2) : (map.riverBottom - 2) };
    const exitLand   = { x: b.cx, y: fromBottom ? (map.riverTop - unit.radius - 10) : (map.riverBottom + unit.radius + 10) };

    // Add a "lane keep" waypoint to keep a strong lane feel
    const laneKeep = { x: b.cx, y: lerp(exitLand.y, ty, 0.55) };

    path.push(entryLand, intoBridge, outBridge, exitLand, laneKeep, { x: tx, y: ty });
    return path;
  }

  /* =========================================================
     ENTITIES
  ========================================================= */
  let nextEntityId = 1;
  function makeUnit(side, cardId, x, y) {
    const c = CARD_BY_ID[cardId];
    const scale = state.map ? (state.map.h / 860) : 1;
    const speed = c.speed * scale;
    const radius = c.radius * scale;

    return {
      kind: "unit",
      eid: nextEntityId++,
      side,
      cardId,
      name: c.name,

      x, y,
      vx: 0, vy: 0,

      hp: c.hp,
      maxHp: c.hp,

      dmg: c.dmg,
      atkSpd: c.atkSpd,
      range: c.range * scale,
      speed,
      radius,

      atkType: c.atkType,
      projectile: c.projectile ? { ...c.projectile } : null,
      splashMelee: c.splashMelee ? (c.splashMelee * scale) : 0,

      tags: (c.tags || []).slice(),

      // pathing
      path: [],
      pathIndex: 0,
      targetEid: 0,
      targetKind: "",
      retargetT: 0,

      // anim
      bobSeed: Math.random() * 1000,
      hitFlash: 0,
      atkFlash: 0,
      alive: true,
    };
  }

  function makeTower(side, type, x, y) {
    // type: "princess" | "king"
    const scale = state.map ? (state.map.h / 860) : 1;
    const isKing = type === "king";
    const radius = (isKing ? 28 : 24) * scale;

    const maxHp = isKing ? 2600 : 1900;
    const range = (isKing ? 230 : 210) * scale;
    const dmg = isKing ? 95 : 85;
    const atkSpd = 0.9;

    return {
      kind: "tower",
      eid: nextEntityId++,
      side,
      type,
      x, y,
      radius,
      hp: maxHp,
      maxHp,
      range,
      dmg,
      atkSpd,
      cd: rand(0.0, 0.5),
      alive: true,

      hitFlash: 0,
      shootFlash: 0,
    };
  }

  function makeProjectile(p) {
    // p: {side, x,y, tx,ty, speed, dmg, type, splash, arc, targetEid, targetKind}
    const eid = nextEntityId++;
    if (p.arc) {
      // arc projectile: interpolate from start to end with a height curve
      const duration = clamp(dist(p.x, p.y, p.tx, p.ty) / p.speed, 0.18, 0.7);
      return {
        kind: "proj",
        eid,
        side: p.side,
        type: p.type,
        x: p.x, y: p.y,
        sx: p.x, sy: p.y,
        ex: p.tx, ey: p.ty,
        t: 0,
        duration,
        dmg: p.dmg,
        splash: p.splash || 0,
        arc: true,
        targetEid: p.targetEid || 0,
        targetKind: p.targetKind || "",
        alive: true,
      };
    } else {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const vx = (dx / len) * p.speed;
      const vy = (dy / len) * p.speed;
      return {
        kind: "proj",
        eid,
        side: p.side,
        type: p.type,
        x: p.x, y: p.y,
        vx, vy,
        dmg: p.dmg,
        splash: p.splash || 0,
        arc: false,
        targetEid: p.targetEid || 0,
        targetKind: p.targetKind || "",
        ttl: 2.2,
        alive: true,
      };
    }
  }

  /* =========================================================
     DECK / HAND LOGIC (CR-like: 8 deck, 4 hand, cycle)
  ========================================================= */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildQueueFromDeck(deckIds) {
    // Shuffle for match start
    return shuffle(deckIds.slice());
  }

  function drawInitialHand(deckIds) {
    const queue = buildQueueFromDeck(deckIds);
    const hand = queue.splice(0, 4);
    const next = queue.length ? queue[0] : null;
    return { queue, hand, next };
  }

  function cycleAfterPlay(side, playedCardId) {
    if (side === SIDE.YOU) {
      // move played to end of queue, draw from front into hand
      state.youQueue.push(playedCardId);
      const idx = state.youHand.indexOf(playedCardId);
      if (idx !== -1) state.youHand.splice(idx, 1);

      const drawn = state.youQueue.shift();
      if (drawn) state.youHand.push(drawn);

      state.youNext = state.youQueue.length ? state.youQueue[0] : null;
    } else {
      state.enemyQueue.push(playedCardId);
      const idx = state.enemyHand.indexOf(playedCardId);
      if (idx !== -1) state.enemyHand.splice(idx, 1);

      const drawn = state.enemyQueue.shift();
      if (drawn) state.enemyHand.push(drawn);

      state.enemyNext = state.enemyQueue.length ? state.enemyQueue[0] : null;
    }
  }

  /* =========================================================
     MATCH SETUP / RESET
  ========================================================= */
  function resetMatch() {
    state.units.length = 0;
    state.projectiles.length = 0;
    state.towers.length = 0;

    state.winner = null;
    state.reason = "";
    state.selectedHandIndex = -1;
    state.selectedCardId = null;

    state.youElixir = 5;
    state.enemyElixir = 5;

    // Use chosen deck (ensure 8)
    selectedDeck = loadDeck().slice(0, 8);
    while (selectedDeck.length < 8) {
      const add = CARDS.find((c) => !selectedDeck.includes(c.id))?.id;
      if (!add) break;
      selectedDeck.push(add);
    }

    state.youDeck = selectedDeck.slice(0, 8);

    // Enemy deck (also 8): mix for variety, always includes required cards available
    const enemyPool = CARDS.map((c) => c.id);
    shuffle(enemyPool);
    state.enemyDeck = enemyPool.slice(0, 8);

    const youDraw = drawInitialHand(state.youDeck);
    state.youQueue = youDraw.queue;
    state.youHand = youDraw.hand;
    state.youNext = youDraw.next;

    const enDraw = drawInitialHand(state.enemyDeck);
    state.enemyQueue = enDraw.queue;
    state.enemyHand = enDraw.hand;
    state.enemyNext = enDraw.next;

    // Bot timer
    state.botTimer = rand(2.6, 4.2);

    // Towers
    const m = state.map;
    const tp = m.towerPos;

    // Enemy towers (top)
    state.towers.push(makeTower(SIDE.ENEMY, "princess", tp.enemyPrincessL.x, tp.enemyPrincessL.y));
    state.towers.push(makeTower(SIDE.ENEMY, "princess", tp.enemyPrincessR.x, tp.enemyPrincessR.y));
    state.towers.push(makeTower(SIDE.ENEMY, "king", tp.enemyKing.x, tp.enemyKing.y));

    // Your towers (bottom)
    state.towers.push(makeTower(SIDE.YOU, "princess", tp.youPrincessL.x, tp.youPrincessL.y));
    state.towers.push(makeTower(SIDE.YOU, "princess", tp.youPrincessR.x, tp.youPrincessR.y));
    state.towers.push(makeTower(SIDE.YOU, "king", tp.youKing.x, tp.youKing.y));

    // UI
    renderHandUI();
    updateElixirUI();
  }

  /* =========================================================
     UI: Hand rendering
  ========================================================= */
  function makeHandCardEl(cardId, index) {
    const c = CARD_BY_ID[cardId];
    const el = document.createElement("div");
    el.className = "handCard";
    el.dataset.index = String(index);

    el.innerHTML = `
      <div class="handCost">${c.cost}</div>
      <div class="handName">${c.name}</div>
      <div class="handType">${c.atkType.toUpperCase()}</div>
    `;

    el.addEventListener("click", () => {
      if (gameState !== "match") return;

      // Toggle select
      if (state.selectedHandIndex === index) {
        state.selectedHandIndex = -1;
        state.selectedCardId = null;
        placementHint.classList.add("hidden");
      } else {
        state.selectedHandIndex = index;
        state.selectedCardId = cardId;
        placementHint.classList.remove("hidden");
      }
      renderHandUI();
    });

    return el;
  }

  function renderHandUI() {
    handRow.innerHTML = "";

    for (let i = 0; i < 4; i++) {
      const id = state.youHand[i];
      if (!id) continue;

      const el = makeHandCardEl(id, i);
      if (state.selectedHandIndex === i) el.classList.add("selected");

      const c = CARD_BY_ID[id];
      const canPay = state.youElixir >= c.cost - 1e-6;
      if (!canPay) el.classList.add("disabled");

      handRow.appendChild(el);
    }

    // Next
    if (state.youNext && CARD_BY_ID[state.youNext]) {
      nextCardEl.textContent = CARD_BY_ID[state.youNext].name;
    } else {
      nextCardEl.textContent = "—";
    }
  }

  function updateElixirUI() {
    const e = clamp(state.youElixir, 0, ELIXIR_MAX);
    elixirFill.style.width = `${(e / ELIXIR_MAX) * 100}%`;
    elixirNum.textContent = String(Math.floor(e + 1e-6));
    youMini.textContent = `Elixir: ${Math.floor(state.youElixir + 1e-6)}`;
    enemyMini.textContent = `Elixir: ${Math.floor(state.enemyElixir + 1e-6)}`;
  }

  /* =========================================================
     INPUT: Canvas placement
  ========================================================= */
  function canvasToLocal(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function placementValid(x, y, side, unitRadius) {
    const m = state.map;

    // Can't place in water or river band at all (including bridges) for CR-like feel
    if (y >= m.riverTop && y <= m.riverBottom) return false;
    if (isInWater(m, x, y)) return false;

    // Side placement limits
    if (side === SIDE.YOU) {
      if (y < m.placements.youMinY || y > m.placements.youMaxY) return false;
    } else {
      if (y < m.placements.enemyMinY || y > m.placements.enemyMaxY) return false;
    }

    // Avoid placing on towers
    for (const tw of state.towers) {
      if (!tw.alive) continue;
      if (tw.side !== side) continue; // allow placing near enemy? In CR you can't place on enemy side anyway
      const d = dist(x, y, tw.x, tw.y);
      if (d < (tw.radius + unitRadius + 10)) return false;
    }

    return true;
  }

  function playCard(side, cardId, x, y) {
    const c = CARD_BY_ID[cardId];
    if (!c) return false;

    if (side === SIDE.YOU) {
      if (state.youElixir < c.cost - 1e-6) return false;
    } else {
      if (state.enemyElixir < c.cost - 1e-6) return false;
    }

    const scale = state.map.h / 860;
    const radius = c.radius * scale;

    if (!placementValid(x, y, side, radius)) return false;

    // Spend elixir
    if (side === SIDE.YOU) state.youElixir -= c.cost;
    else state.enemyElixir -= c.cost;

    // Spawn (some cards spawn multiple troops)
    const spawnCount = c.spawn ? c.spawn : 1;
    const spread = (radius * 1.6);
    for (let i = 0; i < spawnCount; i++) {
      const ox = (i - (spawnCount - 1) / 2) * spread * 0.65;
      const oy = ((i % 2) ? 1 : -1) * spread * 0.35;

      const u = makeUnit(side, cardId,
        clamp(x + ox, 18, state.map.w - 18),
        clamp(y + oy, 18, state.map.h - 18)
      );
      state.units.push(u);
    }

    // Cycle hand
    cycleAfterPlay(side, cardId);

    // If player: clear selection
    if (side === SIDE.YOU) {
      state.selectedHandIndex = -1;
      state.selectedCardId = null;
      placementHint.classList.add("hidden");
      renderHandUI();
    }

    updateElixirUI();
    return true;
  }

  function onPointerMove(e) {
    const p = canvasToLocal(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.over = true;
  }

  function onPointerDown(e) {
    state.pointer.down = true;
    const p = canvasToLocal(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;

    if (gameState !== "match") return;
    if (!state.selectedCardId) return;

    // try to place on your side
    playCard(SIDE.YOU, state.selectedCardId, p.x, p.y);
  }

  function onPointerUp() {
    state.pointer.down = false;
  }

  /* =========================================================
     TARGETING
  ========================================================= */
  function getEnemyUnits(side) {
    return state.units.filter((u) => u.alive && u.side !== side);
  }

  function getEnemyTowers(side) {
    return state.towers.filter((t) => t.alive && t.side !== side);
  }

  function getAllyTowers(side) {
    return state.towers.filter((t) => t.alive && t.side === side);
  }

  function findNearest(list, x, y) {
    let best = null, bestD2 = Infinity;
    for (const e of list) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD2) { bestD2 = d; best = e; }
    }
    return best;
  }

  function chooseTarget(unit) {
    const enemiesU = getEnemyUnits(unit.side);
    const enemiesT = getEnemyTowers(unit.side);

    // Tower-targeting units (Giant, Hog Rider) prefer towers
    const wantsTower = unit.tags.includes("towerTarget");

    if (wantsTower && enemiesT.length) {
      // Prefer princess towers first if alive, else king
      const princess = enemiesT.filter((t) => t.type === "princess");
      if (princess.length) return findNearest(princess, unit.x, unit.y);
      return findNearest(enemiesT, unit.x, unit.y);
    }

    // Otherwise: if enemy unit near, target closest; else towers
    if (enemiesU.length) return findNearest(enemiesU, unit.x, unit.y);
    if (enemiesT.length) return findNearest(enemiesT, unit.x, unit.y);
    return null;
  }

  /* =========================================================
     DAMAGE / HIT / SPLASH
  ========================================================= */
  function applyDamage(target, dmg) {
    if (!target || !target.alive) return;
    target.hp -= dmg;
    target.hitFlash = 0.12;

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
    }
  }

  function splashDamage(side, x, y, radius, dmg, falloff = 0.35) {
    if (radius <= 0) return;

    // damage enemy units and towers in radius
    for (const u of state.units) {
      if (!u.alive) continue;
      if (u.side === side) continue;
      const d = dist(u.x, u.y, x, y);
      if (d <= radius + u.radius) {
        const k = clamp(1 - (d / (radius + u.radius)), 0, 1);
        applyDamage(u, dmg * (falloff + (1 - falloff) * k));
      }
    }
    for (const t of state.towers) {
      if (!t.alive) continue;
      if (t.side === side) continue;
      const d = dist(t.x, t.y, x, y);
      if (d <= radius + t.radius) {
        const k = clamp(1 - (d / (radius + t.radius)), 0, 1);
        applyDamage(t, dmg * (falloff + (1 - falloff) * k));
      }
    }
  }

  /* =========================================================
     BOT AI
  ========================================================= */
  function botTryPlay(dt) {
    state.botTimer -= dt;
    if (state.botTimer > 0) return;

    // reset timer first (even if fails, still next attempt)
    state.botTimer = rand(3.0, 6.0);

    // choose affordable from enemy hand
    const affordable = state.enemyHand
      .map((id, idx) => ({ id, idx, cost: CARD_BY_ID[id]?.cost ?? 99 }))
      .filter((x) => x.id && x.cost <= state.enemyElixir + 1e-6);

    if (!affordable.length) return;

    const pick = affordable[irand(0, affordable.length - 1)].id;
    const c = CARD_BY_ID[pick];
    if (!c) return;

    // place on enemy side behind princess towers, pick lane
    const m = state.map;
    const lane = Math.random() < 0.5 ? "left" : "right";
    const laneX = lane === "left" ? m.lanes.leftX : m.lanes.rightX;

    const baseY = m.towerPos.enemyPrincessL.y; // both share Y
    const x = clamp(laneX + rand(-24, 24), 18, m.w - 18);
    const y = clamp(baseY - rand(40, 90), m.placements.enemyMinY, m.placements.enemyMaxY);

    playCard(SIDE.ENEMY, pick, x, y);
  }

  /* =========================================================
     UPDATE LOOP
  ========================================================= */
  function update(dt) {
    tNow += dt;

    if (gameState !== "match") return;

    // Elixir regen
    state.youElixir = clamp(state.youElixir + ELIXIR_RATE * dt, 0, ELIXIR_MAX);
    state.enemyElixir = clamp(state.enemyElixir + ELIXIR_RATE * dt, 0, ELIXIR_MAX);

    // Bot AI
    botTryPlay(dt);

    // Towers attack
    for (const tw of state.towers) {
      if (!tw.alive) continue;

      tw.cd -= dt;
      tw.hitFlash = Math.max(0, tw.hitFlash - dt);
      tw.shootFlash = Math.max(0, tw.shootFlash - dt);

      if (tw.cd > 0) continue;

      // Find closest enemy unit within range, else any enemy tower? (towers don't shoot towers in CR)
      const enemies = state.units.filter((u) => u.alive && u.side !== tw.side);
      let target = null;
      let bestD2 = Infinity;
      for (const u of enemies) {
        const d2 = dist2(tw.x, tw.y, u.x, u.y);
        if (d2 < bestD2 && d2 <= (tw.range + u.radius) * (tw.range + u.radius)) {
          bestD2 = d2;
          target = u;
        }
      }

      if (target) {
        tw.cd = tw.atkSpd;
        tw.shootFlash = 0.10;

        const proj = makeProjectile({
          side: tw.side,
          x: tw.x,
          y: tw.y,
          tx: target.x,
          ty: target.y,
          speed: 520 * (state.map.h / 860),
          dmg: tw.dmg,
          type: "towerbolt",
          splash: 0,
          arc: false,
          targetEid: target.eid,
          targetKind: target.kind
        });
        state.projectiles.push(proj);
      } else {
        // small idle delay so it doesn't spam checks
        tw.cd = 0.15;
      }
    }

    // Units update
    for (const u of state.units) {
      if (!u.alive) continue;

      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.atkFlash = Math.max(0, u.atkFlash - dt);

      // Retarget periodically
      u.retargetT -= dt;
      if (u.retargetT <= 0 || !u.targetEid) {
        const tgt = chooseTarget(u);
        if (tgt) {
          u.targetEid = tgt.eid;
          u.targetKind = tgt.kind;
        } else {
          u.targetEid = 0;
          u.targetKind = "";
        }
        u.retargetT = rand(0.15, 0.35);
      }

      // Resolve target ref
      let target = null;

  if (u.targetEid) {
    if (u.targetKind === "unit") {
      target = state.units.find((x) => x.eid === u.targetEid && x.alive);
    }   else if (u.targetKind === "tower") {
    target = state.towers.find((x) => x.eid === u.targetEid && x.alive);
    }
  }


      if (!target) {
        u.targetEid = 0;
        u.targetKind = "";
        u.path.length = 0;
        u.pathIndex = 0;
        u.pathTargetEid = 0;
        // no target: drift towards enemy king (if alive)
        const enemyKing = state.towers.find((t) => t.alive && t.side !== u.side && t.type === "king");
        if (enemyKing) {
          u.targetEid = enemyKing.eid;
          u.targetKind = "tower";
        }
      }

      // Lazy init cooldown for older saved object shapes
      if (typeof u.cd !== "number") u.cd = rand(0.05, 0.25);
      u.cd -= dt;

      // Animate bobbing (cosmetic)
      const bob = Math.sin(tNow * 7 + u.bobSeed) * 0.6;

      // Movement / Attack
      if (target && target.alive) {
        const dTo = dist(u.x, u.y, target.x, target.y);
        const engageDist = u.range + (target.radius || 0) + u.radius;

        const inRange = dTo <= engageDist;

        if (inRange) {
          // Attack
          u.vx = 0; u.vy = 0;

          if (u.cd <= 0) {
            u.cd = u.atkSpd;
            u.atkFlash = 0.10;

            if (u.atkType === "melee") {
              // Melee hit
              applyDamage(target, u.dmg);

              // Valk-like splash melee
              if (u.splashMelee > 0) {
                splashDamage(u.side, target.x, target.y, u.splashMelee, u.dmg * 0.75, 0.55);
              }
            } else {
              // Ranged shot
              const pr = u.projectile || { type: "arrow", speed: 360 * (state.map.h / 860), splash: 0 };
              const shot = makeProjectile({
                side: u.side,
                x: u.x,
                y: u.y - 2 + bob,
                tx: target.x,
                ty: target.y,
                speed: pr.speed * (state.map.h / 860),
                dmg: u.dmg,
                type: pr.type || "arrow",
                splash: pr.splash || 0,
                arc: !!pr.arc,
                targetEid: target.eid,
                targetKind: target.kind
              });
              state.projectiles.push(shot);
            }
          }
        } else {
          // Move towards target using bridge path
          if (u.pathTargetEid !== u.targetEid || !u.path.length) {
            u.path = computePath(state.map, u, target.x, target.y);
            u.pathIndex = 0;
            u.pathTargetEid = u.targetEid;
          }

          // Advance along current waypoint
          let wp = u.path[u.pathIndex];
          if (!wp) {
            // fallback direct
            wp = { x: target.x, y: target.y };
          }

          const dx = wp.x - u.x;
          const dy = wp.y - u.y;
          const len = Math.hypot(dx, dy) || 1;

          const sp = u.speed;
          u.vx = (dx / len) * sp;
          u.vy = (dy / len) * sp;

          u.x += u.vx * dt;
          u.y += u.vy * dt;

          // Waypoint reach
          if (len <= Math.max(8, u.radius * 0.9)) {
            u.pathIndex = Math.min(u.pathIndex + 1, u.path.length);
          }

          // HARD RULE: never allow water walk outside bridges
          if (isInWater(state.map, u.x, u.y)) {
            // push to nearest edge of river band and align to nearest bridge lane
            const fromBottom = (u.y > state.map.riverY);
            const safeY = fromBottom ? (state.map.riverBottom + u.radius + 2) : (state.map.riverTop - u.radius - 2);
            // snap x closer to nearest bridge center
            let bestB = state.map.bridges[0];
            let best = Infinity;
            for (const b of state.map.bridges) {
              const d = Math.abs(u.x - b.cx);
              if (d < best) { best = d; bestB = b; }
            }
            u.x = lerp(u.x, bestB.cx, 0.65);
            u.y = safeY;
          }

          // Keep inside arena bounds
          u.x = clamp(u.x, 12 + u.radius, state.map.w - 12 - u.radius);
          u.y = clamp(u.y, 12 + u.radius, state.map.h - 12 - u.radius);
        }
      } else {
        // No target at all: idle slight drift towards enemy side
        const dir = (u.side === SIDE.YOU) ? -1 : 1;
        u.vx = 0;
        u.vy = dir * (u.speed * 0.35);
        u.y += u.vy * dt;

        // Prevent river
        if (isInWater(state.map, u.x, u.y)) {
          const safeY = (u.side === SIDE.YOU) ? (state.map.riverBottom + u.radius + 2) : (state.map.riverTop - u.radius - 2);
          u.y = safeY;
        }
      }
    }

    // Simple separation (prevent stacking too much)
    for (let i = 0; i < state.units.length; i++) {
      const a = state.units[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < state.units.length; j++) {
        const b = state.units[j];
        if (!b.alive) continue;
        if (a.side !== b.side) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const minD = a.radius + b.radius + 2;
        if (d < minD) {
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;

          // Keep safe
          a.x = clamp(a.x, 12 + a.radius, state.map.w - 12 - a.radius);
          a.y = clamp(a.y, 12 + a.radius, state.map.h - 12 - a.radius);
          b.x = clamp(b.x, 12 + b.radius, state.map.w - 12 - b.radius);
          b.y = clamp(b.y, 12 + b.radius, state.map.h - 12 - b.radius);

          // Also ensure no water
          if (isInWater(state.map, a.x, a.y)) {
            a.y = (a.y > state.map.riverY) ? (state.map.riverBottom + a.radius + 2) : (state.map.riverTop - a.radius - 2);
          }
          if (isInWater(state.map, b.x, b.y)) {
            b.y = (b.y > state.map.riverY) ? (state.map.riverBottom + b.radius + 2) : (state.map.riverTop - b.radius - 2);
          }
        }
      }
    }

    // Projectiles update
    for (const p of state.projectiles) {
      if (!p.alive) continue;

      if (p.arc) {
        p.t += dt;
        const tt = clamp(p.t / p.duration, 0, 1);
        // Parabolic arc
        const x = lerp(p.sx, p.ex, tt);
        const y = lerp(p.sy, p.ey, tt);
        const h = Math.sin(Math.PI * tt) * 42 * (state.map.h / 860);
        p.x = x;
        p.y = y - h;

        if (tt >= 1) {
          // impact at endpoint
          const hitX = p.ex, hitY = p.ey;

          // try precise target first
          let hitTarget = null;
          if (p.targetKind === "unit") hitTarget = state.units.find((u) => u.alive && u.eid === p.targetEid);
          if (p.targetKind === "tower") hitTarget = state.towers.find((t) => t.alive && t.eid === p.targetEid);

          if (hitTarget) {
            applyDamage(hitTarget, p.dmg);
          } else {
            // hit closest enemy near impact
            const enemies = state.units.filter((u) => u.alive && u.side !== p.side);
            hitTarget = findNearest(enemies, hitX, hitY);
            if (hitTarget && dist(hitTarget.x, hitTarget.y, hitX, hitY) < 26 + hitTarget.radius) {
              applyDamage(hitTarget, p.dmg);
            }
          }

          if (p.splash > 0) {
            splashDamage(p.side, hitX, hitY, p.splash, p.dmg * 0.9, 0.45);
          }

          p.alive = false;
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.ttl -= dt;

        // Collision
        let hit = null;
        if (p.targetKind === "unit") hit = state.units.find((u) => u.alive && u.eid === p.targetEid);
        if (p.targetKind === "tower") hit = state.towers.find((t) => t.alive && t.eid === p.targetEid);

        if (hit) {
          const rr = (hit.radius || 0) + 6;
          if (dist2(p.x, p.y, hit.x, hit.y) <= rr * rr) {
            applyDamage(hit, p.dmg);
            if (p.splash > 0) splashDamage(p.side, hit.x, hit.y, p.splash, p.dmg * 0.9, 0.45);
            p.alive = false;
          }
        } else {
          // fallback: hit first enemy unit in small radius
          const enemies = state.units.filter((u) => u.alive && u.side !== p.side);
          for (const e of enemies) {
            const rr = e.radius + 6;
            if (dist2(p.x, p.y, e.x, e.y) <= rr * rr) {
              applyDamage(e, p.dmg);
              if (p.splash > 0) splashDamage(p.side, e.x, e.y, p.splash, p.dmg * 0.9, 0.45);
              p.alive = false;
              break;
            }
          }
        }

        if (p.ttl <= 0) p.alive = false;
      }
    }

    // Cleanup dead projectiles
    state.projectiles = state.projectiles.filter((p) => p.alive);

    // Cleanup dead units (keep a tiny fade window)
    for (const u of state.units) {
      if (u.alive) continue;
      if (typeof u.deathT !== "number") u.deathT = 0.22;
      u.deathT -= dt;
    }
    state.units = state.units.filter((u) => u.alive || (u.deathT && u.deathT > 0));

    // Tower death fade
    for (const t of state.towers) {
      if (t.alive) continue;
      if (typeof t.deathT !== "number") t.deathT = 0.4;
      t.deathT -= dt;
    }
    state.towers = state.towers.filter((t) => t.alive || (t.deathT && t.deathT > 0));

    // Check victory (king destroyed)
    const yourKing = state.towers.find((t) => t.type === "king" && t.side === SIDE.YOU);
    const enemyKing = state.towers.find((t) => t.type === "king" && t.side === SIDE.ENEMY);

    if (!enemyKing || !enemyKing.alive) {
      endMatch(SIDE.YOU, "Enemy King Tower destroyed");
    } else if (!yourKing || !yourKing.alive) {
      endMatch(SIDE.ENEMY, "Your King Tower destroyed");
    }

    // HUD refresh (lightweight)
    if (typeof state.uiTick !== "number") state.uiTick = 0;
    state.uiTick -= dt;
    if (state.uiTick <= 0) {
      state.uiTick = 0.10;
      updateElixirUI();
      renderHandUI();
    }
  }

  function endMatch(winnerSide, reason) {
    if (gameState !== "match") return;
    gameState = "gameover";
    state.winner = winnerSide;
    state.reason = reason || "";

    const win = (winnerSide === SIDE.YOU);
    gameOverTitle.textContent = win ? "VICTORY!" : "DEFEAT";
    gameOverSub.textContent = reason ? reason : (win ? "Well played!" : "Try again!");
    showScreen("gameover");
  }

  /* =========================================================
     RENDERING
  ========================================================= */
  function drawRoundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fillStroke(fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawArena() {
    const m = state.map;
    const w = m.w, h = m.h;

    // Background grass
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#2fbf5a");
    bgGrad.addColorStop(1, "#1c8b44");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle lane shading
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h * 0.5);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.restore();

    // Lanes guides
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(m.lanes.leftX, 0);
    ctx.lineTo(m.lanes.leftX, h);
    ctx.moveTo(m.lanes.rightX, 0);
    ctx.lineTo(m.lanes.rightX, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // River
    const riverGrad = ctx.createLinearGradient(0, m.riverTop, 0, m.riverBottom);
    riverGrad.addColorStop(0, "#1f7bd9");
    riverGrad.addColorStop(1, "#0b4ea6");
    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, m.riverTop, w, m.riverH);

    // Water waves
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const yy = m.riverTop + (i + 0.8) * (m.riverH / 8);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 18) {
        const off = Math.sin((x * 0.05) + tNow * 2 + i) * 3;
        ctx.lineTo(x, yy + off);
      }
      ctx.stroke();
    }
    ctx.restore();

    // River borders
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, m.riverTop);
    ctx.lineTo(w, m.riverTop);
    ctx.moveTo(0, m.riverBottom);
    ctx.lineTo(w, m.riverBottom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, m.riverTop);
    ctx.lineTo(w, m.riverTop);
    ctx.moveTo(0, m.riverBottom);
    ctx.lineTo(w, m.riverBottom);
    ctx.stroke();
    ctx.restore();

    // Bridges
    for (const b of m.bridges) {
      // wooden base
      const r = b.rect;
      const wood = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      wood.addColorStop(0, "#c9a46a");
      wood.addColorStop(1, "#a0773f");

      ctx.save();
      drawRoundedRect(r.x, r.y, r.w, r.h, 12);
      fillStroke(wood, "rgba(0,0,0,0.45)", 5);

      // planks
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const yy = r.y + (i + 1) * (r.h / 7);
        ctx.beginPath();
        ctx.moveTo(r.x + 10, yy);
        ctx.lineTo(r.x + r.w - 10, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Center split hint
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, m.riverY - 2, w, 4);
    ctx.restore();
  }

  function drawHpBar(x, y, w, h, hp, maxHp) {
    const t = clamp(maxHp > 0 ? (hp / maxHp) : 0, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawRoundedRect(x, y, w, h, h / 2);
    fillStroke("rgba(0,0,0,0.45)", "rgba(0,0,0,0.65)", 2);

    drawRoundedRect(x + 1.5, y + 1.5, (w - 3) * t, h - 3, (h - 3) / 2);
    fillStroke(t > 0.5 ? "#37d66f" : (t > 0.25 ? "#f59e0b" : "#ef4444"), null, 0);
    ctx.restore();
  }

  function unitBaseColor(cardId) {
    // bright cartoon palette per troop
    switch (cardId) {
      case "knight": return "#fbbf24";
      case "minipekka": return "#60a5fa";
      case "archers": return "#fb7185";
      case "skeletons": return "#cbd5e1";
      case "giant": return "#f97316";
      case "musketeer": return "#a78bfa";
      case "valkyrie": return "#f472b6";
      case "wizard": return "#38bdf8";
      case "babydragon": return "#34d399";
      case "hogrider": return "#a16207";
      case "minions": return "#818cf8";
      case "bomber": return "#94a3b8";
      default: return "#e2e8f0";
    }
  }

  function sideTint(side) {
    return side === SIDE.YOU ? COLORS.blue : COLORS.red;
  }

  function drawUnit(u) {
    const a = u.alive ? 1 : clamp((u.deathT || 0) / 0.22, 0, 1);
    const bob = Math.sin(tNow * 7 + u.bobSeed) * 0.8;

    ctx.save();
    ctx.globalAlpha = a;

    // shadow
    ctx.globalAlpha = a * 0.35;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + u.radius * 0.9, u.radius * 0.85, u.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a;

    // body
    const base = unitBaseColor(u.cardId);
    const tint = sideTint(u.side);

    const rg = ctx.createRadialGradient(u.x - u.radius * 0.35, u.y - u.radius * 0.35 + bob, u.radius * 0.2, u.x, u.y + bob, u.radius * 1.2);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.18, base);
    rg.addColorStop(1, "rgba(0,0,0,0.35)");

    ctx.beginPath();
    ctx.arc(u.x, u.y + bob, u.radius, 0, Math.PI * 2);

    // hit flash
    if (u.hitFlash > 0) {
      const k = clamp(u.hitFlash / 0.12, 0, 1);
      ctx.fillStyle = `rgba(255,255,255,${0.55 * k})`;
      ctx.fill();
    } else {
      ctx.fillStyle = rg;
      ctx.fill();
    }

    ctx.lineWidth = Math.max(2.5, u.radius * 0.18);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();

    // side ring
    ctx.lineWidth = Math.max(2.0, u.radius * 0.14);
    ctx.strokeStyle = tint;
    ctx.globalAlpha = a * 0.85;
    ctx.beginPath();
    ctx.arc(u.x, u.y + bob, u.radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a;

    // label
    ctx.font = `${Math.floor(u.radius * 0.9)}px system-ui, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.fillText(u.name[0], u.x + 1, u.y + bob + 1);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(u.name[0], u.x, u.y + bob);

    // hp bar
    drawHpBar(u.x - u.radius, u.y - u.radius - 12, u.radius * 2, 7, u.hp, u.maxHp);

    // attack flash spark
    if (u.atkFlash > 0) {
      const k = clamp(u.atkFlash / 0.10, 0, 1);
      ctx.save();
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u.x, u.y + bob, u.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawTower(t) {
    const a = t.alive ? 1 : clamp((t.deathT || 0) / 0.4, 0, 1);

    ctx.save();
    ctx.globalAlpha = a;

    // shadow
    ctx.globalAlpha = a * 0.35;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + t.radius * 0.95, t.radius * 1.05, t.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a;

    // base
    const side = sideTint(t.side);
    const baseGrad = ctx.createLinearGradient(t.x, t.y - t.radius, t.x, t.y + t.radius);
    baseGrad.addColorStop(0, t.type === "king" ? "#ffd1a6" : "#ffe5b4");
    baseGrad.addColorStop(1, t.type === "king" ? "#c084fc" : "#60a5fa");

    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // hit flash overlay
    if (t.hitFlash > 0) {
      const k = clamp(t.hitFlash / 0.12, 0, 1);
      ctx.fillStyle = `rgba(255,255,255,${0.45 * k})`;
      ctx.fill();
    }

    ctx.lineWidth = Math.max(4, t.radius * 0.22);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();

    // side crest ring
    ctx.lineWidth = Math.max(3, t.radius * 0.18);
    ctx.strokeStyle = side;
    ctx.globalAlpha = a * 0.85;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a;

    // top turret
    ctx.beginPath();
    ctx.arc(t.x, t.y - t.radius * 0.65, t.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = t.type === "king" ? "#f59e0b" : "#fde68a";
    ctx.fill();
    ctx.lineWidth = Math.max(3, t.radius * 0.18);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();

    // shoot flash
    if (t.shootFlash > 0) {
      const k = clamp(t.shootFlash / 0.10, 0, 1);
      ctx.save();
      ctx.globalAlpha = k * 0.75;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y - t.radius * 0.65, t.radius * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // hp bar
    drawHpBar(t.x - t.radius, t.y + t.radius + 10, t.radius * 2, 8, t.hp, t.maxHp);

    // label
    ctx.font = `${Math.floor(t.radius * 0.55)}px system-ui, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillText(t.type === "king" ? "K" : "P", t.x + 1, t.y + 1);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(t.type === "king" ? "K" : "P", t.x, t.y);

    ctx.restore();
  }

  function drawProjectile(p) {
    ctx.save();

    // Cartoon trail
    if (p.type === "arrow") {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx * 0.02), p.y - (p.vy * 0.02));
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (p.type === "bullet" || p.type === "towerbolt") {
      ctx.fillStyle = p.type === "towerbolt" ? "#93c5fd" : "#e5e7eb";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === "towerbolt" ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(p.x - 6, p.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "fireball" || p.type === "dragonfire") {
      const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 2, p.x, p.y, 10);
      g.addColorStop(0, "#fff7ed");
      g.addColorStop(0.35, p.type === "dragonfire" ? "#34d399" : "#fb7185");
      g.addColorStop(1, "rgba(0,0,0,0.25)");

      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === "bomb") {
      ctx.fillStyle = "#94a3b8";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(p.x + 3, p.y - 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPlacementOverlay() {
    if (gameState !== "match") return;
    if (!state.selectedCardId) return;
    if (!state.pointer.over) return;

    const c = CARD_BY_ID[state.selectedCardId];
    if (!c) return;

    const scale = state.map.h / 860;
    const r = c.radius * scale;

    const ok = placementValid(state.pointer.x, state.pointer.y, SIDE.YOU, r);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = ok ? "rgba(59,130,246,0.45)" : "rgba(239,68,68,0.45)";
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, r + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = ok ? "rgba(59,130,246,0.9)" : "rgba(239,68,68,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, r + 10, 0, Math.PI * 2);
    ctx.stroke();

    // show forbidden river zone warning line if near river
    const m = state.map;
    if (state.pointer.y >= m.riverTop - 12 && state.pointer.y <= m.riverBottom + 12) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, m.riverTop, m.w, m.riverH);
    }

    ctx.restore();
  }

  function render() {
    if (!state.map) return;

    // Clear / draw arena
    drawArena();

    // Draw towers
    for (const t of state.towers) drawTower(t);

    // Draw units
    for (const u of state.units) drawUnit(u);

    // Projectiles on top
    for (const p of state.projectiles) drawProjectile(p);

    // Placement overlay top-most
    drawPlacementOverlay();
  }

  /* =========================================================
     MAIN LOOP
  ========================================================= */
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = clamp((ts - lastTime) / 1000, 0, 0.033);
    lastTime = ts;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  /* =========================================================
     RESIZE
  ========================================================= */
  function resize() {
    // Keep a vertical phone-like aspect but still responsive on desktop.
    const maxW = 520;
    const maxH = 980;

    const availW = window.innerWidth;
    const availH = window.innerHeight;

    let w = Math.min(availW, maxW);
    let h = Math.min(availH, maxH);

    // Ensure it's tall
    const minAspect = 1.62; // h/w
    if (h / w < minAspect) {
      h = Math.min(availH, Math.floor(w * minAspect));
    } else {
      w = Math.min(availW, Math.floor(h / minAspect));
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.map = buildMap(w, h);

    // If match running, reposition towers to exact map points (preserve hp if possible)
    if (gameState === "match" && state.towers.length) {
      const tp = state.map.towerPos;
      const keep = (side, type) => state.towers.find((t) => t.side === side && t.type === type);

      const oldYouK = keep(SIDE.YOU, "king");
      const oldEnK = keep(SIDE.ENEMY, "king");
      const oldYouPL = state.towers.find((t) => t.side === SIDE.YOU && t.type === "princess" && t.x < state.map.w * 0.5);
      const oldYouPR = state.towers.find((t) => t.side === SIDE.YOU && t.type === "princess" && t.x > state.map.w * 0.5);
      const oldEnPL = state.towers.find((t) => t.side === SIDE.ENEMY && t.type === "princess" && t.x < state.map.w * 0.5);
      const oldEnPR = state.towers.find((t) => t.side === SIDE.ENEMY && t.type === "princess" && t.x > state.map.w * 0.5);

      const rebuilt = [];

      // rebuild preserving hp/alive if found
      function rebuild(side, type, pos, old) {
        const t = makeTower(side, type, pos.x, pos.y);
        if (old) {
          t.hp = old.hp;
          t.alive = old.alive;
          if (!old.alive && typeof old.deathT === "number") t.deathT = old.deathT;
        }
        rebuilt.push(t);
      }

      rebuild(SIDE.ENEMY, "princess", tp.enemyPrincessL, oldEnPL);
      rebuild(SIDE.ENEMY, "princess", tp.enemyPrincessR, oldEnPR);
      rebuild(SIDE.ENEMY, "king", tp.enemyKing, oldEnK);

      rebuild(SIDE.YOU, "princess", tp.youPrincessL, oldYouPL);
      rebuild(SIDE.YOU, "princess", tp.youPrincessR, oldYouPR);
      rebuild(SIDE.YOU, "king", tp.youKing, oldYouK);

      state.towers = rebuilt;
    }
  }

  /* =========================================================
     MATCH START
  ========================================================= */
  function startMatch() {
    gameState = "match";
    showScreen("match");
    resetMatch();
  }

  function backToMenu() {
    gameState = "menu";
    showScreen("main");
  }

  /* =========================================================
     MENU BUTTONS + SETTINGS
  ========================================================= */
  btnPlay.addEventListener("click", () => startMatch());
  btnDeck.addEventListener("click", () => {
    renderDeckUI();
    showScreen("deck");
  });
  btnSettings.addEventListener("click", () => showScreen("settings"));

  deckBack.addEventListener("click", () => showScreen("main"));
  deckBack2.addEventListener("click", () => showScreen("main"));
  settingsBack.addEventListener("click", () => showScreen("main"));
  settingsBack2.addEventListener("click", () => showScreen("main"));

  btnFullscreen.addEventListener("click", () => toggleFullscreen());

  volume.addEventListener("input", () => {
    volValue.textContent = `${volume.value}%`;
    // (stub) no real audio in this version
  });

  btnExit.addEventListener("click", () => backToMenu());
  btnReplay.addEventListener("click", () => startMatch());
  btnBackMenu.addEventListener("click", () => backToMenu());

  /* =========================================================
     CANVAS INPUT EVENTS
  ========================================================= */
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mouseup", onPointerUp);

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onPointerDown({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onPointerMove({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    onPointerUp();
  }, { passive: false });

  canvas.addEventListener("mouseleave", () => {
    state.pointer.over = false;
  });

  // ESC / Back
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (currentScreen === "match") {
        backToMenu();
      } else if (currentScreen === "deck" || currentScreen === "settings") {
        showScreen("main");
      }
    }
  });

  window.addEventListener("resize", resize);

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    showScreen("main");
    volValue.textContent = `${volume.value}%`;
    resize();
    requestAnimationFrame(loop);
  }

  init();
})();

