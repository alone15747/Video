/* =============================================
   PARI KI DUNIYA — script.js
   Developed by Ishant
   ============================================= */

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  W = canvas.width;
  H = canvas.height;
}
window.addEventListener('resize', resize);
resize();

// ── STATE ──
let gstate = 'title';
let score = 0, lives = 3, best = +localStorage.getItem('pari_best') || 0;
let level = 1, combo = 0, comboTimer = 0;
let baseSpeed = 110, spawnRate = 1500, spawnCd = 0;
let items = [], sparks = [], trailPts = [];
let rafId, lastT = 0, paused = false;
let bgStars = [];

// DOM refs
const scEl     = document.getElementById('sc');
const bsEl     = document.getElementById('bs');
const hEls     = [0, 1, 2].map(i => document.getElementById('h' + i));
const pauseBtn = document.getElementById('pause-btn');
const lvlEl    = document.getElementById('lvl');
const uiEl     = document.getElementById('ui');

// ── BACKGROUND STARS ──
function initStars() {
  bgStars = Array.from({ length: 90 }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 1.5 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.025
  }));
}

// ── ITEM DEFINITIONS ──
const GOOD = [
  { e: '🧚‍♀️', pts: 10, r: 28 },
  { e: '🧚',   pts: 15, r: 26 },
  { e: '⭐',   pts: 20, r: 24 },
  { e: '🌟',   pts: 25, r: 26 },
  { e: '💫',   pts: 18, r: 24 },
  { e: '🦋',   pts: 12, r: 26 },
  { e: '🌸',   pts:  8, r: 24 },
  { e: '🪷',   pts: 10, r: 24 },
];
const RARE = { e: '💎', pts: 50, r: 22, rare: true };
const BAD  = [
  { e: '🕷️', bad: true, r: 26 },
  { e: '👻',  bad: true, r: 26 },
  { e: '💀',  bad: true, r: 24 },
];

// ── SPAWN ITEM ──
function spawnItem() {
  const roll = Math.random();
  let def;
  if (roll < 0.05)                   def = { ...RARE };
  else if (level >= 2 && roll < 0.18) def = { ...BAD[Math.floor(Math.random() * BAD.length)] };
  else                                def = { ...GOOD[Math.floor(Math.random() * GOOD.length)] };

  const margin = 55;
  const x = margin + Math.random() * (W - margin * 2);
  const spd = baseSpeed * (
    def.rare ? 1.5 :
    def.bad  ? (0.8 + Math.random() * 0.5) :
               (0.8 + Math.random() * 0.6)
  );

  items.push({
    ...def,
    x, y: -55, baseX: x,
    vy: spd, vx: 0,
    wobble:      Math.random() * Math.PI * 2,
    wobbleAmp:   18 + Math.random() * 28,
    wobbleSpeed: 0.035 + Math.random() * 0.03,
    launched: false,
    opacity: 1,
    scale: 1
  });
}

// ── DRAW BACKGROUND ──
function drawBg() {
  ctx.fillStyle = '#0d0020';
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W * 0.3, H * 0.25, 0, W * 0.3, H * 0.25, W * 0.65);
  g1.addColorStop(0, 'rgba(80,15,140,0.2)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, W * 0.5);
  g2.addColorStop(0, 'rgba(160,20,80,0.12)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Twinkling stars
  const now = performance.now() * 0.001;
  bgStars.forEach(s => {
    const a = 0.25 + 0.7 * Math.abs(Math.sin(s.phase + now * s.speed));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    ctx.fill();
  });

  // Danger zone glow
  const dg = ctx.createLinearGradient(0, H - 80, 0, H);
  dg.addColorStop(0, 'transparent');
  dg.addColorStop(1, 'rgba(255,40,40,0.1)');
  ctx.fillStyle = dg;
  ctx.fillRect(0, H - 80, W, 80);

  // Danger dashed line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,80,80,0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(0, H - 55);
  ctx.lineTo(W, H - 55);
  ctx.stroke();
  ctx.restore();
}

// ── DRAW ITEMS ──
function drawItems() {
  items.forEach(it => {
    ctx.save();
    ctx.globalAlpha = it.opacity;
    ctx.translate(it.x, it.y);
    ctx.scale(it.scale, it.scale);

    if (it.rare) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 20 + 8 * Math.abs(Math.sin(performance.now() * 0.005));
    } else if (it.bad) {
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur  = 12;
    } else {
      ctx.shadowColor = '#ff6eb4';
      ctx.shadowBlur  = 6;
    }

    ctx.font = `${it.r * 2}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.e, 0, 0);
    ctx.restore();
  });
}

// ── DRAW SPARKS ──
function drawSparks() {
  sparks.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.life;
    ctx.fillStyle   = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── DRAW SWIPE TRAIL ──
function drawTrail() {
  if (trailPts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,210,80,0.75)';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(trailPts[0].x, trailPts[0].y);
  for (let i = 1; i < trailPts.length; i++) {
    ctx.lineTo(trailPts[i].x, trailPts[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

// ── UPDATE LOGIC ──
function update(dt) {
  const sec = dt / 1000;

  // Combo timeout
  comboTimer += dt;
  if (comboTimer > 2500) combo = 0;

  // Spawn
  spawnCd += dt;
  if (spawnCd >= spawnRate) {
    spawnCd = 0;
    spawnItem();
    if (level >= 3 && Math.random() < 0.3) spawnItem();
  }

  // Update items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];

    if (it.launched) {
      it.x += it.vx * sec;
      it.y += it.vy * sec;
      it.opacity -= 2.8 * sec;
      it.scale   += 0.6 * sec;
      if (it.opacity <= 0) { items.splice(i, 1); continue; }
    } else {
      it.wobble += it.wobbleSpeed;
      it.y += it.vy * sec;
      it.x  = it.baseX + Math.sin(it.wobble) * it.wobbleAmp;

      if (it.y > H - 30) {
        items.splice(i, 1);
        if (!it.bad) loseLife();
      }
    }
  }

  // Update sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx * sec;
    s.y += s.vy * sec;
    s.vy += 300 * sec;
    s.life -= 1.6 * sec;
    if (s.life <= 0) sparks.splice(i, 1);
  }

  // Level progression
  if (score >= level * 120 && level < 8) {
    level++;
    baseSpeed = Math.min(290, 110 + (level - 1) * 26);
    spawnRate = Math.max(480, 1500 - (level - 1) * 145);
    showLevelBadge();
  }
}

// ── MAIN GAME LOOP ──
function loop(ts) {
  if (gstate !== 'game') return;
  const dt = Math.min(ts - lastT, 50);
  lastT = ts;

  if (!paused) update(dt);

  drawBg();
  drawSparks();
  drawTrail();
  drawItems();

  if (paused) {
    ctx.fillStyle = 'rgba(13,0,32,0.68)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = "bold 28px 'Quicksand',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('⏸  Paused', W / 2, H / 2);
  }

  rafId = requestAnimationFrame(loop);
}

// ── SWIPE INPUT ──
let touchSt = null;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  touchSt   = { x: t.clientX, y: t.clientY, time: Date.now() };
  trailPts  = [{ x: t.clientX, y: t.clientY }];
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchSt) return;
  const t = e.changedTouches[0];
  trailPts.push({ x: t.clientX, y: t.clientY });
  if (trailPts.length > 22) trailPts.shift();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (!touchSt) return;
  const t  = e.changedTouches[0];
  const dx = t.clientX - touchSt.x;
  const dy = t.clientY - touchSt.y;
  const dist    = Math.hypot(dx, dy);
  const elapsed = Date.now() - touchSt.time;
  if (dist > 20 && elapsed < 600) {
    doSwipe(touchSt.x, touchSt.y, t.clientX, t.clientY, dx, dy, elapsed);
  }
  touchSt = null;
  setTimeout(() => trailPts = [], 200);
}, { passive: false });

// Mouse fallback (desktop testing)
let mdown = false, mst = null;
canvas.addEventListener('mousedown', e => {
  mdown = true;
  mst   = { x: e.clientX, y: e.clientY, time: Date.now() };
  trailPts = [{ x: e.clientX, y: e.clientY }];
});
canvas.addEventListener('mousemove', e => {
  if (!mdown) return;
  trailPts.push({ x: e.clientX, y: e.clientY });
  if (trailPts.length > 22) trailPts.shift();
});
canvas.addEventListener('mouseup', e => {
  if (!mdown || !mst) return;
  mdown = false;
  const dx = e.clientX - mst.x, dy = e.clientY - mst.y;
  const dist = Math.hypot(dx, dy), elapsed = Date.now() - mst.time;
  if (dist > 20 && elapsed < 600) doSwipe(mst.x, mst.y, e.clientX, e.clientY, dx, dy, elapsed);
  mst = null;
  setTimeout(() => trailPts = [], 200);
});

function doSwipe(x1, y1, x2, y2, dx, dy, elapsed) {
  if (gstate !== 'game' || paused) return;
  const svx = (dx / elapsed) * 600;
  const svy = (dy / elapsed) * 600;

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.launched) continue;
    if (lineDist(x1, y1, x2, y2, it.x, it.y) < it.r + 22) {
      it.launched = true;
      it.vx = svx * 0.85;
      it.vy = svy * 0.85 - 40;

      if (it.bad) {
        addScore(20, it.x, it.y, '#ff9966', '💥 +20');
        burst(it.x, it.y, '#ff6633');
        vibrate([30]);
      } else {
        combo++;
        comboTimer = 0;
        const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
        const pts  = it.pts * mult;
        const label =
          combo >= 5 ? `${combo}x COMBO! +${pts}` :
          combo >= 3 ? `${combo}x +${pts}` :
                       `+${pts}`;
        addScore(pts, it.x, it.y, it.rare ? '#ffd700' : '#fff', label);
        burst(it.x, it.y, it.rare ? '#ffd700' : '#c77dff');
        vibrate(it.rare ? [25, 15, 25] : [20]);
      }
    }
  }
}

// ── GEOMETRY HELPER ──
function lineDist(x1, y1, x2, y2, cx, cy) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(cx - x1, cy - y1);
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
  return Math.hypot(cx - (x1 + t * dx), cy - (y1 + t * dy));
}

// ── SCORE ──
function addScore(pts, x, y, color, label) {
  score += pts;
  if (score > best) { best = score; localStorage.setItem('pari_best', best); }
  scEl.textContent = score;
  bsEl.textContent = best;
  floatText(label, x, y, color);
}

function floatText(txt, x, y, color) {
  const el = document.createElement('div');
  el.className = 'fscore';
  el.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
  el.textContent   = txt;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── LIVES ──
function loseLife() {
  lives--;
  hEls.forEach((h, i) => h.classList.toggle('dead', i >= lives));
  vibrate([80, 40, 80]);
  if (lives <= 0) endGame();
}

// ── SPARK BURST ──
function burst(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const a   = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 180;
    sparks.push({ x, y, r: 3 + Math.random() * 4, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60, life: 1, color });
  }
}

function vibrate(p) { if (navigator.vibrate) navigator.vibrate(p); }

// ── LEVEL BADGE ──
function showLevelBadge() {
  lvlEl.textContent = `🌟 Level ${level}!`;
  lvlEl.classList.add('show');
  setTimeout(() => lvlEl.classList.remove('show'), 2000);
}

// ── GAME FLOW ──
function startGame() {
  score = 0; lives = 3; level = 1; combo = 0; comboTimer = 0;
  baseSpeed = 110; spawnRate = 1500; spawnCd = 0;
  items = []; sparks = []; trailPts = [];

  scEl.textContent = 0;
  bsEl.textContent = best;
  hEls.forEach(h => h.classList.remove('dead'));

  uiEl.style.display       = 'flex';
  pauseBtn.style.display   = 'block';

  gstate = 'game';
  paused = false;
  showScreen(null);

  lastT = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function endGame() {
  gstate = 'result';
  cancelAnimationFrame(rafId);
  pauseBtn.style.display = 'none';
  uiEl.style.display     = 'none';

  const won = score >= 300;
  document.getElementById('res-icon').textContent  = won ? '🏆' : '🧚‍♀️';
  document.getElementById('res-title').textContent = won ? 'Pari Ne Jeeta! 🎉' : 'Game Over!';
  document.getElementById('res-info').innerHTML    =
    `Score: <strong>${score}</strong><br>` +
    `Best: <strong>${best}</strong><br>` +
    `Level Reached: <strong>${level}</strong>`;

  showScreen('result');
  vibrate([200, 100, 200]);
}

function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? '▶️ Resume' : '⏸ Pause';
  if (!paused) {
    lastT = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }
}

// ── SCREEN MANAGER ──
function showScreen(id) {
  ['title', 'result'].forEach(sid => {
    document.getElementById(sid).classList.toggle('off', sid !== id);
  });
}

// ── BUTTON EVENTS ──
document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);
document.getElementById('home-btn').addEventListener('click', () => {
  cancelAnimationFrame(rafId);
  gstate = 'title';
  uiEl.style.display     = 'none';
  pauseBtn.style.display = 'none';
  showScreen('title');
  titleAnim();
});
pauseBtn.addEventListener('click', togglePause);

// ── TITLE BG ANIMATION ──
function titleAnim() {
  if (gstate !== 'title') return;
  drawBg();
  requestAnimationFrame(titleAnim);
}

// ── INIT ──
bsEl.textContent = best;
initStars();
showScreen('title');
titleAnim();
