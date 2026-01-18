// ==========================================
// 1. БАЗА ДАННЫХ С УЛУЧШЕННЫМИ МЕХАНИКАМИ
// ==========================================
const DATABASE = [
    { id: 0, name: 'Knight', hp: 1450, dmg: 160, spd: 0.6, range: 45, cost: 3, color: '#3b82f6' },
    { id: 1, name: 'Archer', hp: 260, dmg: 95, spd: 0.5, range: 250, cost: 3, color: '#f43f5e' },
    { id: 2, name: 'Giant', hp: 3500, dmg: 210, spd: 0.2, range: 50, cost: 5, color: '#f59e0b', towerOnly: true },
    { id: 3, name: 'Mini PEKKA', hp: 1150, dmg: 620, spd: 0.8, range: 45, cost: 4, color: '#6366f1' },
    { id: 4, name: 'Hog Rider', hp: 1500, dmg: 280, spd: 1.1, range: 50, cost: 4, color: '#78350f', towerOnly: true },
    { id: 5, name: 'P.E.K.K.A', hp: 3600, dmg: 750, spd: 0.3, range: 50, cost: 7, color: '#0f172a' },
    { id: 6, name: 'Musketeer', hp: 600, dmg: 185, spd: 0.5, range: 280, cost: 4, color: '#a855f7' },
    { id: 7, name: 'Wizard', hp: 550, dmg: 235, spd: 0.5, range: 220, cost: 5, color: '#ea580c' },
    { id: 8, name: 'Golem', hp: 4600, dmg: 260, spd: 0.15, range: 50, cost: 8, color: '#4b5563', towerOnly: true },
    { id: 11, name: 'Sparky', hp: 1200, dmg: 1300, spd: 0.2, range: 200, cost: 6, color: '#facc15', slowAttack: true },
    { id: 16, name: 'Electro Wiz', hp: 590, dmg: 110, spd: 0.7, range: 200, cost: 4, color: '#60a5fa', stun: true },
    { id: 18, name: 'Miner', hp: 1000, dmg: 160, spd: 1.2, range: 50, cost: 3, color: '#94a3b8', anyWhere: true },
    { id: 20, name: 'Bandit', hp: 750, dmg: 160, spd: 1.3, range: 60, cost: 3, color: '#1e293b', dash: true },
    { id: 19, name: 'Princess', hp: 216, dmg: 140, spd: 0.5, range: 450, cost: 3, color: '#f472b6' },
    { id: 21, name: 'Hunter', hp: 900, dmg: 70, spd: 0.7, range: 150, cost: 4, color: '#475569', spread: true }, // Охотник (дробь)
{ id: 22, name: 'Giant Skeleton', hp: 3200, dmg: 170, spd: 0.4, range: 50, cost: 6, color: '#e2e8f0', deathBomb: true }, // Гигантский скелет
{ id: 23, name: 'Baby Dragon', hp: 1000, dmg: 120, spd: 0.6, range: 180, cost: 4, color: '#4ade80', areaDmg: true, flying: true }, // Дракончик
{ id: 24, name: 'Electro Dragon', hp: 850, dmg: 90, spd: 0.5, range: 180, cost: 5, color: '#60a5fa', chainLightning: true, flying: true }, // Электро-дракон
{ id: 25, name: 'Skeleton Army', hp: 80, dmg: 60, spd: 1.1, range: 45, cost: 3, color: '#ffffff', count: 15 }, // Армия скелетов
{ id: 26, name: 'Guards', hp: 200, dmg: 100, spd: 1.0, range: 60, cost: 3, color: '#94a3b8', shield: true, count: 3 }, // Стражи (со щитами)
{ id: 27, name: 'Bowler', hp: 1600, dmg: 240, spd: 0.4, range: 150, cost: 5, color: '#8b5cf6', knockback: true }, // Боулер
{ id: 28, name: 'Balloon', hp: 1400, dmg: 800, spd: 0.3, range: 50, cost: 5, color: '#ef4444', towerOnly: true, flying: true } // Шар
];

let units = [], towers = [], projectiles = [];
let elixir = 5, aiElixir = 5, gameRunning = false, selectedCardIdx = null;
let battleDeck = [];

const canvas = document.getElementById('game');
const ctx = canvas ? canvas.getContext('2d') : null;
const bridges = [{ x: 150, y: 385 }, { x: 450, y: 385 }];

// ==========================================
// 2. СИСТЕМА СНАРЯДОВ (С ОГЛУШЕНИЕМ)
// ==========================================
class Projectile {
    constructor(x, y, target, dmg, color, isStun = false) {
        this.x = x; this.y = y; this.target = target;
        this.dmg = dmg; this.color = color; this.isStun = isStun;
        this.spd = 9; this.reached = false;
    }
    update() {
        if (!this.target || this.target.hp <= 0) { this.reached = true; return; }
        let dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
        if (dist < 15) {
            this.target.hp -= this.dmg;
            if (this.isStun) this.target.stunTimer = 35; // Эффект электро-мага
            this.reached = true;
        } else {
            this.x += (this.target.x - this.x) / dist * this.spd;
            this.y += (this.target.y - this.y) / dist * this.spd;
        }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI*2); ctx.fill();
        if (this.isStun) { // Сияние для электро-заряда
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }
    }
}

// ==========================================
// 3. КЛАСС ЮНИТА (ИСПРАВЛЕННЫЙ ИИ)
// ==========================================
class Unit {
    constructor(x, y, team, data) {
        this.x = x; this.y = y; this.team = team; this.data = data;
        const boost = team === 'enemy' ? 1.15 : 1;
        this.hp = data.hp * boost;
        this.maxHp = this.hp;
        this.dmg = data.dmg * boost;
        this.spd = data.spd * boost; // ДОБАВЬ ЭТУ СТРОКУ

        this.attackTimer = 0;
        this.stunTimer = 0;
        this.isDashing = false;
    }




    update() {
        if (this.stunTimer > 0) { this.stunTimer--; return; }

        let targets = (this.data.towerOnly ? towers : units.concat(towers)).filter(u => u.team !== this.team && u.hp > 0);
        let target = targets.sort((a,b) => Math.hypot(this.x-a.x, this.y-a.y) - Math.hypot(this.x-b.x, this.y-b.y))[0];

        if (target) {
            let dist = Math.hypot(this.x - target.x, this.y - target.y);

            // Механика Бандитки
            if (this.data.dash && dist > 150 && dist < 300 && !this.isDashing) this.isDashing = true;

            // ЕСЛИ ЦЕЛЬ В РАДИУСЕ - СТРЕЛЯЕМ (Не отходим)
            if (dist <= this.data.range || (this.isDashing && dist < 80)) {
                let attackLimit = this.data.slowAttack ? 180 : 55;
                if (this.attackTimer++ >= attackLimit) {
                    let damage = this.isDashing ? this.dmg * 2 : this.dmg;
                    if (this.data.range > 70) {
                        projectiles.push(new Projectile(this.x, this.y, target, damage, this.data.color, this.data.stun));
                    } else {
                        target.hp -= damage;
                        if (this.data.stun) target.stunTimer = 30;
                    }
                    this.attackTimer = 0;
                    this.isDashing = false;
                }
            } else {
                // ДВИЖЕНИЕ
                let currentSpd = this.isDashing ? this.spd * 4 : this.spd;
                let needsBridge = !this.data.anyWhere && ((this.team === 'player' && this.y > 410) || (this.team === 'enemy' && this.y < 360));

                if (needsBridge && Math.abs(this.y - 385) > 20) {
                    let b = bridges.sort((a,b) => Math.hypot(this.x-a.x, this.y-a.y) - Math.hypot(this.x-b.x, this.y-b.y))[0];
                    let bDist = Math.hypot(this.x - b.x, this.y - b.y);
                    this.x += (b.x - this.x) / bDist * currentSpd;
                    this.y += (b.y - this.y) / bDist * currentSpd;
                } else {
                    this.x += (target.x - this.x) / dist * currentSpd;
                    this.y += (target.y - this.y) / dist * currentSpd;
                }
            }
        }
    }

    draw() {
        // Зарядка Спарки
        if (this.data.slowAttack && this.attackTimer > 0) {
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, (this.attackTimer/180)*Math.PI*2); ctx.stroke();
        }

        ctx.fillStyle = this.data.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = this.stunTimer > 0 ? 'yellow' : (this.team === 'player' ? '#3b82f6' : '#ef4444');
        ctx.lineWidth = this.isDashing ? 6 : 3;
        ctx.stroke();

        ctx.fillStyle = 'black'; ctx.fillRect(this.x-20, this.y-30, 40, 5);
        ctx.fillStyle = this.team === 'player' ? '#4ade80' : '#f87171';
        ctx.fillRect(this.x-20, this.y-30, 40*(this.hp/this.maxHp), 5);
    }
}

// ==========================================
// 4. ЛОГИКА ИГРЫ И UI
// ==========================================
function loop() {
    if (!gameRunning) return;
    ctx.fillStyle = '#459237'; ctx.fillRect(0, 0, 600, 770);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 375, 600, 25);
    ctx.fillStyle = '#92400e'; bridges.forEach(b => ctx.fillRect(b.x-40, b.y-15, 80, 30));

    towers.forEach(t => {
        if (t.hp <= 0) { if (t.king) handleGameOver(t.team === 'enemy'); return; }
        ctx.fillStyle = t.team === 'player' ? '#2563eb' : '#dc2626';
        ctx.fillRect(t.x-t.size/2, t.y-t.size/2, t.size, t.size);
        ctx.fillStyle = 'white'; ctx.fillText(Math.floor(t.hp), t.x-15, t.y-t.size/2-10);
    });

    units.forEach((u, i) => { u.update(); u.draw(); if (u.hp <= 0) units.splice(i, 1); });
    projectiles.forEach((p, i) => { p.update(); p.draw(); if (p.reached) projectiles.splice(i, 1); });

    aiElixir += 0.010; // ⬅ немного быстрее копит эликсир

if (aiElixir >= 6) {
    let card = DATABASE[Math.floor(Math.random() * DATABASE.length)];

    if (aiElixir < card.cost) return;
    aiElixir -= card.cost;

    const side = getWeakSide();
    const spawnX = side === 'left'
        ? 150 + Math.random() * 80
        : 450 + Math.random() * 80;

    const spawnY = card.anyWhere ? 400 : 120;

    units.push(new Unit(spawnX, spawnY, 'enemy', card));
}


    elixir = Math.min(elixir + 0.008, 10);
    drawElixirUI();
    requestAnimationFrame(loop);

    towers.forEach(t => {
    if (t.hp <= 0) {
        if (t.king) handleGameOver(t.team === 'enemy');
        return;
    }

    // Отрисовка башни
    ctx.fillStyle = t.team === 'player' ? '#2563eb' : '#dc2626';
    ctx.fillRect(t.x-t.size/2, t.y-t.size/2, t.size, t.size);
    ctx.fillStyle = 'white';
    ctx.fillText(Math.floor(t.hp), t.x-15, t.y-t.size/2-10);

    // Логика стрельбы башни
    t.attackTimer++;
    // Ищем ближайшего вражеского юнита в радиусе 250
    let targets = units.filter(u => u.team !== t.team && Math.hypot(t.x - u.x, t.y - u.y) < 250);
    let target = targets.sort((a,b) => Math.hypot(t.x-a.x, t.y-a.y) - Math.hypot(t.x-b.x, t.y-b.y))[0];

    if (target && t.attackTimer > (60 / t.spd)) {
        projectiles.push(new Projectile(t.x, t.y, target, t.dmg, t.team === 'player' ? '#60a5fa' : '#ef4444'));
        t.attackTimer = 0;
    }
});
}

if (canvas) {
    canvas.onclick = (e) => {
    if (selectedCardIdx === null) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const card = DATABASE.find(c => c.id === battleDeck[selectedCardIdx]);
    if (card && elixir >= card.cost) {
        // Ограничение: нельзя ставить на сторону врага
        if (!card.anyWhere && y < 385) return;

        elixir -= card.cost;
        units.push(new Unit(x, y, 'player', card));

        // Ротация карт
        const used = battleDeck.splice(selectedCardIdx, 1)[0];
        battleDeck.push(used);
        selectedCardIdx = null;
        renderBattleCards();
    }
};
}

function renderBattleCards() {
    const panel = document.getElementById('cards-panel');
    if (!panel) return;
    panel.innerHTML = '';

    // Показываем первые 4 карты из колоды (рука игрока)
    battleDeck.slice(0, 4).forEach((id, i) => {
        const card = DATABASE.find(c => c.id === id);
        const d = document.createElement('div');
        d.className = 'card-select' + (selectedCardIdx === i ? ' active' : '');

        // Показываем следующую карту (которая под индексом 4)
        const nextCard = DATABASE.find(c => c.id === battleDeck[4]);

        d.innerHTML = `
            <div style="font-size:10px; color:blue">СЛЕД: ${nextCard.name}</div>
            <b>${card.name}</b>
            <br>💧${card.cost}
        `;

        d.onclick = (e) => {
            e.stopPropagation();
            selectedCardIdx = i;
            renderBattleCards();
        };
        panel.appendChild(d);
    });
}



function initBattle() {
    gameRunning = true;
    battleDeck = JSON.parse(localStorage.getItem('selectedDeck')) || [0,1,2,3,4,5,6,7];
    towers = [
        { x: 150, y: 150, hp: 3000, max: 3000, team: 'enemy', size: 60 },
        { x: 450, y: 150, hp: 3000, max: 3000, team: 'enemy', size: 60 },
        { x: 300, y: 80, hp: 4500, max: 4500, team: 'enemy', size: 80, king: true },
        { x: 150, y: 620, hp: 3000, max: 3000, team: 'player', size: 60 },
        { x: 450, y: 620, hp: 3000, max: 3000, team: 'player', size: 60 },
        { x: 300, y: 700, hp: 4500, max: 4500, team: 'player', size: 80, king: true }
    ];
    renderBattleCards();
    loop();
}

// УДАЛИ ЭТУ СТАРУЮ ВЕРСИЮ:
// function drawElixirUI() {
//    const ui = document.getElementById('ui'); if (!ui) return;
//    ui.innerHTML = `<div style="background:magenta; color:white; ...">...</div>`;
// }

// ОСТАВЬ ЭТУ ВЕРСИЮ:
function drawElixirUI() {
    const bar = document.getElementById('elixir-bar');
    const text = document.getElementById('elixir-text');
    if (bar && text) {
        const percentage = (elixir / 10) * 100;
        bar.style.width = percentage + '%';
        text.innerText = Math.floor(elixir);
        bar.style.filter = elixir >= 9.5 ? 'brightness(1.3)' : 'none';
    }
}

function initBattle() {
    gameRunning = true;
    battleDeck = JSON.parse(localStorage.getItem('selectedDeck')) || [0,1,2,3,4,5,6,7];
    towers = [
        // Боковые башни врага (маленький урон)
        { x: 150, y: 150, hp: 3000, max: 3000, team: 'enemy', size: 60, dmg: 50, spd: 0.8 },
        { x: 450, y: 150, hp: 3000, max: 3000, team: 'enemy', size: 60, dmg: 50, spd: 0.8 },
        // Королевская башня врага (средний урон)
        { x: 300, y: 80, hp: 4500, max: 4500, team: 'enemy', size: 80, king: true, dmg: 120, spd: 1.0 },

        // Боковые башни игрока (маленький урон)
        { x: 150, y: 620, hp: 3000, max: 3000, team: 'player', size: 60, dmg: 50, spd: 0.8 },
        { x: 450, y: 620, hp: 3000, max: 3000, team: 'player', size: 60, dmg: 50, spd: 0.8 },
        // Королевская башня игрока (средний урон)
        { x: 300, y: 700, hp: 4500, max: 4500, team: 'player', size: 80, king: true, dmg: 120, spd: 1.0 }
    ];

    // Добавляем таймер атаки для каждой башни
    towers.forEach(t => t.attackTimer = 0);

    renderBattleCards();
    loop();
}

function handleGameOver(win) {
    gameRunning = false;
    alert(win ? "ПОБЕДА!" : "ПОРАЖЕНИЕ!");
    window.location.href = 'index.html';
}

// ==========================================
// СИСТЕМА СБОРА КОЛОДЫ
// ==========================================
window.onload = () => {
        if (!localStorage.getItem('userDeck')) {
            localStorage.setItem('userDeck', JSON.stringify([]));
        }
        updateTrophyDisplay();
        renderDeckBuilder();
    }


function renderDeckBuilder() {
    const allDiv = document.getElementById('all-cards');
    const currDiv = document.getElementById('current-deck');
    const sizeDisplay = document.getElementById('deck-size');

    if (!allDiv || !currDiv) return;

    let deck = [];
    try {
        const saved = localStorage.getItem('userDeck');
        deck = saved ? JSON.parse(saved) : [];
    } catch(e) {
        deck = [];
    }

    allDiv.innerHTML = '';
    currDiv.innerHTML = '';

    // 1. Отрисовка ТЕКУЩЕЙ КОЛОДЫ (ровно 8 слотов)
    for (let i = 0; i < 8; i++) {
        const cardId = deck[i];
        const el = document.createElement('div');

        if (cardId !== undefined) {
            const card = DATABASE.find(c => c.id === cardId);
            el.className = 'card-item selected';
            el.innerHTML = `💧${card.cost}<br><b>${card.name}</b>`;
            el.onclick = () => {
                deck.splice(i, 1);
                localStorage.setItem('userDeck', JSON.stringify(deck));
                renderDeckBuilder();
            };
        } else {
            el.className = 'card-item empty';
            el.innerHTML = `<br><b>ПУСТО</b>`;
        }
        currDiv.appendChild(el);
    }

    // 2. Отрисовка ВСЕХ ДОСТУПНЫХ КАРТ
    DATABASE.forEach(card => {
        const isSelected = deck.includes(card.id);
        const el = document.createElement('div');
        el.className = `card-item ${isSelected ? 'selected' : ''}`;
        el.style.opacity = isSelected ? '0.5' : '1';
        el.innerHTML = `💧${card.cost}<br><b>${card.name}</b>`;

        el.onclick = () => {
            if (!isSelected && deck.length < 8) {
                deck.push(card.id);
                localStorage.setItem('userDeck', JSON.stringify(deck));
                renderDeckBuilder();
            }
        };
        allDiv.appendChild(el);
    });

    if (sizeDisplay) sizeDisplay.innerText = deck.length;
}

// Улучшенный сброс
function resetDeck() {
    if (confirm("Очистить колоду?")) {
        localStorage.setItem('userDeck', JSON.stringify([]));
        renderDeckBuilder();
    }
}

function updateTrophyDisplay() {
    const el = document.getElementById('trophy-count');
    if (el) el.innerText = localStorage.getItem('myTrophies') || 0;
}

function getWeakSide() {
    const leftTower = towers.find(t => t.team === 'player' && t.x < 300 && !t.king);
    const rightTower = towers.find(t => t.team === 'player' && t.x > 300 && !t.king);

    if (!leftTower || !rightTower) return Math.random() < 0.5 ? 'left' : 'right';

    return leftTower.hp < rightTower.hp ? 'left' : 'right';
}

function resetDeck() {
    localStorage.setItem('userDeck', JSON.stringify([]));
    renderDeckBuilder();
}

function drawElixirUI() {
    const bar = document.getElementById('elixir-bar');
    const text = document.getElementById('elixir-text');

    if (bar && text) {
        // Рассчитываем процент заполнения (максимум 10 эликсира)
        const percentage = (elixir / 10) * 100;
        bar.style.width = percentage + '%';

        // Отображаем целое число эликсира
        text.innerText = Math.floor(elixir);

        // Если эликсира почти 10, можно добавить эффект свечения
        bar.style.filter = elixir >= 9.5 ? 'brightness(1.3)' : 'none';
    }
}
function showScreen(type) {
    document.getElementById('main-screen').style.display = (type === 'main') ? 'block' : 'none';
    document.getElementById('deck-screen').style.display = (type === 'deck') ? 'block' : 'none';

    // ПРИНУДИТЕЛЬНО ПЕРЕСЧИТЫВАЕМ ВЫСОТУ ПРИ ОТКРЫТИИ
    if(type === 'deck') {
        const deckScreen = document.getElementById('deck-screen');
        deckScreen.style.height = "100%";
    }
}

function renderBattleCards() {
    const panel = document.getElementById('cards-panel');
    if (!panel) return;
    panel.innerHTML = '';

    // Берем первые 4 карты из колоды
    battleDeck.slice(0, 4).forEach((id, i) => {
        const card = DATABASE.find(c => c.id === id);
        if (!card) return;

        const d = document.createElement('div');
        // Добавляем класс active, если карта выбрана
        d.className = 'card-select' + (selectedCardIdx === i ? ' active' : '');
        d.innerHTML = `<b>${card.name}</b><br>💧${card.cost}`;

        d.onclick = (e) => {
            e.stopPropagation(); // Чтобы клик по карте не считался кликом по полю
            selectedCardIdx = i;
            renderBattleCards();
        };
        panel.appendChild(d);
    });
    function resizeGame() {
    const game = document.getElementById('game');
    if (window.innerWidth <= 768) {  // если телефон
        game.width = window.innerWidth;
        game.height = window.innerHeight;
    } else { // ПК
        game.width = 800;
        game.height = 600;
    }
    }

window.addEventListener('resize', resizeGame);
window.addEventListener('load', resizeGame);

}
