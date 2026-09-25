/* ============================================
   اهرب من الرياضيات — كود اللعبة
   ============================================ */
(function () {
  'use strict';

  // ============ حماية localStorage ============
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ============ الإعدادات ============
  const SYMBOLS = [
    { ch: '+',  color: '#22c55e' },
    { ch: '−',  color: '#ef4444' },
    { ch: '×',  color: '#f59e0b' },
    { ch: '÷',  color: '#06b6d4' },
    { ch: '√',  color: '#8b5cf6' },
    { ch: 'π',  color: '#ec4899' },
    { ch: 'e',  color: '#14b8a6' },
    { ch: 'ln', color: '#f97316' },
    { ch: '²',  color: '#6366f1' },
    { ch: '³',  color: '#a855f7' }
  ];
  const PLAYER_R = 22;
  const ENEMY_R = 18;
  const MAX_HEARTS = 3;
  const MAX_ENEMIES_CAP = 14;
  const MIN_LIFETIME = 6;
  const MAX_LIFETIME = 9;
  const BEST_KEY = 'mathEscapeBest';

  // ============ الحالة ============
  const state = {
    running: false,
    elapsed: 0,
    hearts: MAX_HEARTS,
    level: 1,
    player: { x: 0, y: 0, tx: 0, ty: 0 },
    trail: [],
    enemies: [],
    particles: [],
    W: 0, H: 0,
    maxEnemies: 2,
    baseSpeed: 70,
    spawnInterval: 2.5,
    lastSpawn: 0,
    shake: 0,
    lastTimerUpdate: 0,
    bestTime: parseFloat(store.get(BEST_KEY) || '0') || 0
  };

  // ============ DOM ============
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const heartsEl = document.getElementById('hearts');
  const timerEl = document.getElementById('timer');
  const bestEl = document.getElementById('best');
  const levelBadge = document.getElementById('levelBadge');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalTimeEl = document.getElementById('finalTime');
  const bestTimeEl = document.getElementById('bestTime');
  const finalLevelEl = document.getElementById('finalLevel');
  const resultMessage = document.getElementById('resultMessage');

  // ============ الأصوات ============
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(freq, duration, type, volume, endFreq) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(volume || .15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function sndStart() {
    initAudio();
    [523.25, 659.25, 783.99].forEach(function (f, i) {
      setTimeout(function () { playTone(f, .18, 'sine', .14); }, i * 90);
    });
  }
  function sndSpawn() { playTone(1100, .06, 'sine', .035, 800); }
  function sndCollision() {
    playTone(180, .22, 'sawtooth', .17, 80);
    playTone(90, .28, 'sine', .11);
  }
  function sndGameOver() {
    [440, 392, 330, 262, 196].forEach(function (f, i) {
      setTimeout(function () { playTone(f, .28, 'sine', .15); }, i * 130);
    });
  }
  function sndLevelUp() {
    [660, 880, 1100].forEach(function (f, i) {
      setTimeout(function () { playTone(f, .12, 'triangle', .1); }, i * 70);
    });
  }

  // ============ التهيئة ============
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    state.W = rect.width;
    state.H = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.player.x) {
      state.player.x = state.W / 2;
      state.player.y = state.H / 2;
      state.player.tx = state.player.x;
      state.player.ty = state.player.y;
    } else {
      state.player.x = Math.max(PLAYER_R, Math.min(state.W - PLAYER_R, state.player.x));
      state.player.y = Math.max(PLAYER_R, Math.min(state.H - PLAYER_R, state.player.y));
      state.player.tx = state.player.x;
      state.player.ty = state.player.y;
    }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  // ============ التحكم ============
  function setTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    state.player.tx = Math.max(PLAYER_R, Math.min(state.W - PLAYER_R, clientX - rect.left));
    state.player.ty = Math.max(PLAYER_R, Math.min(state.H - PLAYER_R, clientY - rect.top));
  }
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault(); initAudio();
    setTarget(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    setTarget(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('mousemove', function (e) {
    if (!state.running) return;
    setTarget(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousedown', function (e) {
    initAudio();
    if (state.running) setTarget(e.clientX, e.clientY);
  });

  // ============ توليد الأعداء ============
  function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const margin = ENEMY_R + 30;
    let x, y;
    if (side === 0) { x = Math.random() * state.W; y = -margin; }
    else if (side === 1) { x = state.W + margin; y = Math.random() * state.H; }
    else if (side === 2) { x = Math.random() * state.W; y = state.H + margin; }
    else { x = -margin; y = Math.random() * state.H; }

    const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const lifetime = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);

    state.enemies.push({
      x, y,
      r: ENEMY_R,
      symbol: sym.ch,
      color: sym.color,
      speed: state.baseSpeed * (.85 + Math.random() * .4),
      life: lifetime,
      maxLife: lifetime,
      phase: Math.random() * Math.PI * 2,
      wander: Math.random() < .5 ? 1 : 0,
      rot: Math.random() * Math.PI * 2
    });
    sndSpawn();
  }

  // ============ الانفجارات ============
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: .6 + Math.random() * .4,
        maxLife: 1,
        color,
        r: 2 + Math.random() * 3
      });
    }
  }

  // ============ التحديث ============
  function update(dt) {
    state.elapsed += dt;

    const newLevel = Math.floor(state.elapsed / 8) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.maxEnemies = Math.min(MAX_ENEMIES_CAP, 2 + newLevel);
      state.baseSpeed = 70 + newLevel * 7;
      state.spawnInterval = Math.max(1, 2.5 - newLevel * .15);
      levelBadge.textContent = 'المستوى ' + state.level;
      levelBadge.classList.add('level-up');
      sndLevelUp();
      setTimeout(function () { levelBadge.classList.remove('level-up'); }, 600);
    }

    if (state.elapsed - state.lastTimerUpdate > .08) {
      state.lastTimerUpdate = state.elapsed;
      timerEl.textContent = state.elapsed.toFixed(1) + 's';
    }

    const p = state.player;
    const follow = Math.min(1, dt * 18);
    p.x += (p.tx - p.x) * follow;
    p.y += (p.ty - p.y) * follow;

    state.trail.push({ x: p.x, y: p.y, life: .35 });
    if (state.trail.length > 12) state.trail.shift();
    for (let i = state.trail.length - 1; i >= 0; i--) {
      state.trail[i].life -= dt;
      if (state.trail[i].life <= 0) state.trail.splice(i, 1);
    }

    state.lastSpawn += dt;
    if (state.lastSpawn >= state.spawnInterval && state.enemies.length < state.maxEnemies) {
      state.lastSpawn = 0;
      spawnEnemy();
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const ex = p.x - e.x, ey = p.y - e.y;
      const edist = Math.sqrt(ex * ex + ey * ey) || 1;
      let vx = (ex / edist) * e.speed;
      let vy = (ey / edist) * e.speed;
      if (e.wander) {
        const perpX = -ey / edist, perpY = ex / edist;
        const w = Math.sin(state.elapsed * 3 + e.phase) * 55;
        vx += perpX * w; vy += perpY * w;
      }
      e.x += vx * dt; e.y += vy * dt;
      e.rot += dt * .7;
      e.life -= dt;
      if (e.life <= 0) { state.enemies.splice(i, 1); continue; }

      const cdx = e.x - p.x, cdy = e.y - p.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist < e.r + PLAYER_R - 6) {
        state.hearts--;
        updateHearts(true);
        sndCollision();
        state.shake = .35;
        burst(e.x, e.y, e.color, 14);
        state.enemies.splice(i, 1);
        if (state.hearts <= 0) { gameOver(); return; }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= .94; pt.vy *= .94;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.5);
  }

  // ============ الرسم ============
  function render() {
    ctx.clearRect(0, 0, state.W, state.H);
    ctx.save();
    if (state.shake > 0) {
      const s = state.shake * 18;
      ctx.translate((Math.random() - .5) * s, (Math.random() - .5) * s);
    }

    // الأثر
    for (let i = 0; i < state.trail.length; i++) {
      const t = state.trail[i];
      const a = (t.life / .35) * .4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, PLAYER_R * .75, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,102,241,' + a.toFixed(3) + ')';
      ctx.fill();
    }

    // الأعداء
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      let alpha = 1;
      if (e.life < 1) alpha = .3 + .7 * Math.abs(Math.sin(e.life * 15));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot * .25);
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fillStyle = e.color + '2e';
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = e.color;
      const fs = e.symbol.length > 1 ? e.r * .85 : e.r * 1.1;
      ctx.font = 'bold ' + fs + 'px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.symbol, 0, 1);
      ctx.restore();
    }

    // الجزيئات
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * a, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // اللاعب
    const p = state.player;
    const grad = ctx.createRadialGradient(p.x - 6, p.y - 6, 2, p.x, p.y, PLAYER_R);
    grad.addColorStop(0, '#c7d2fe');
    grad.addColorStop(.5, '#818cf8');
    grad.addColorStop(1, '#4f46e5');
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(165,180,252,0.25)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x - 6, p.y - 6, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }

  // ============ الحلقة ============
  let lastFrame = 0;
  function loop(now) {
    if (!lastFrame) lastFrame = now;
    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt > .1) dt = .1;
    if (state.running) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ============ واجهة ============
  function updateHearts(animate) {
    const h = Math.max(0, state.hearts);
    heartsEl.textContent = '❤️'.repeat(h) + '🤍'.repeat(MAX_HEARTS - h);
    if (animate) {
      heartsEl.classList.add('hit');
      setTimeout(function () { heartsEl.classList.remove('hit'); }, 400);
    }
  }

  function resetGame() {
    state.elapsed = 0;
    state.hearts = MAX_HEARTS;
    state.level = 1;
    state.enemies = [];
    state.particles = [];
    state.trail = [];
    state.maxEnemies = 2;
    state.baseSpeed = 70;
    state.spawnInterval = 2.5;
    state.lastSpawn = 0;
    state.shake = 0;
    state.lastTimerUpdate = 0;
    state.player.x = state.W / 2;
    state.player.y = state.H / 2;
    state.player.tx = state.player.x;
    state.player.ty = state.player.y;
    updateHearts(false);
    timerEl.textContent = '0.0s';
    levelBadge.textContent = 'المستوى 1';
    bestEl.textContent = 'أفضل: ' + state.bestTime.toFixed(1) + 's';
  }

  function startGame() {
    initAudio();
    sndStart();
    resize();
    resetGame();
    startOverlay.hidden = true;
    gameOverOverlay.hidden = true;
    document.body.classList.add('playing');
    state.running = true;
    setTimeout(function () {
      if (!state.running) return;
      spawnEnemy();
      setTimeout(function () { if (state.running) spawnEnemy(); }, 900);
    }, 500);
  }

  function gameOver() {
    state.running = false;
    document.body.classList.remove('playing');
    sndGameOver();
    const time = state.elapsed;
    const isNewBest = time > state.bestTime;
    if (isNewBest) {
      state.bestTime = time;
      store.set(BEST_KEY, time.toString());
    }
    finalTimeEl.textContent = time.toFixed(1) + 's';
    bestTimeEl.textContent = state.bestTime.toFixed(1) + 's';
    finalLevelEl.textContent = state.level;
    if (isNewBest) {
      resultMessage.textContent = '🎉 رقم قياسي جديد!';
      resultMessage.style.color = '#fbbf24';
    } else {
      resultMessage.textContent = '💪 حاول مرة أخرى!';
      resultMessage.style.color = 'rgba(255,255,255,0.75)';
    }
    setTimeout(function () { gameOverOverlay.hidden = false; }, 700);
  }

  // ============ الأزرار ============
  document.getElementById('startBtn').addEventListener('click', function () {
    initAudio(); startGame();
  });
  document.getElementById('retryBtn').addEventListener('click', function () {
    initAudio(); startGame();
  });

  // ============ الإقلاع ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      resize();
      resetGame();
      requestAnimationFrame(loop);
    });
  } else {
    resize();
    resetGame();
    requestAnimationFrame(loop);
  }

})();