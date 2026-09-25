/* ============================================
   مكتبة الرياضيات — الأكواد الرئيسية
   ============================================ */
(function () {
  'use strict';

  // ============ حماية localStorage ============
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ============ الحالة العامة ============
  const state = {
    data: null,
    currentFolder: null,
    currentItems: [],
    audioCtx: null,
    soundEnabled: store.get('soundEnabled') !== 'off',
    theme: store.get('theme') || 'dark',
    studentName: store.get('studentName') || ''
  };

  // ============ العناصر ============
  const $ = (id) => document.getElementById(id);
  const els = {
    pageLoader: $('pageLoader'),
    nameOverlay: $('nameOverlay'),
    nameInput: $('nameInput'),
    nameSubmit: $('nameSubmit'),
    nameError: $('nameError'),
    maintenanceScreen: $('maintenanceScreen'),
    noticeBar: $('noticeBar'),
    tickerContent: $('tickerContent'),
    particles: $('particles'),
    themeToggle: $('themeToggle'),
    soundToggle: $('soundToggle'),
    backToTop: $('backToTop'),
    homeBtn: $('homeBtn'),
    greeting: $('greeting'),
    greetingText: $('greetingText'),
    scheduleBtn: $('scheduleBtn'),
    errorBox: $('errorBox'),
    searchInput: $('searchInput'),
    refreshBtn: $('refreshBtn'),
    breadcrumb: $('breadcrumb'),
    content: $('content'),
    loading: $('loading'),
    empty: $('empty'),
    scheduleModal: $('scheduleModal'),
    scheduleTitle: $('scheduleTitle'),
    scheduleList: $('scheduleList'),
    year: $('year')
  };

  // ============ الأصوات ============
  function initAudio() {
    if (!state.audioCtx) {
      try {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        state.audioCtx = null;
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playTone(freq, dur, type, vol, endFreq) {
    if (!state.soundEnabled || !state.audioCtx) return;
    try {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, state.audioCtx.currentTime + dur);
      }
      gain.gain.setValueAtTime(vol || 0.12, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start(state.audioCtx.currentTime);
      osc.stop(state.audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function sndClick() {
    playTone(680, 0.08, 'sine', 0.1, 480);
  }

  function sndSuccess() {
    playTone(660, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.12), 90);
  }

  // ============ الثيم ============
  function applyTheme() {
    if (state.theme === 'light') {
      document.body.classList.add('light-mode');
      els.themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('light-mode');
      els.themeToggle.textContent = '🌙';
    }
  }

  els.themeToggle.addEventListener('click', () => {
    initAudio();
    sndClick();
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    store.set('theme', state.theme);
    applyTheme();
  });

  // ============ الأصوات (تفعيل/إيقاف) ============
  function applySoundState() {
    els.soundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
  }

  els.soundToggle.addEventListener('click', () => {
    initAudio();
    state.soundEnabled = !state.soundEnabled;
    store.set('soundEnabled', state.soundEnabled ? 'on' : 'off');
    applySoundState();
    if (state.soundEnabled) sndClick();
  });

  // صوت النقر العام
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, .card, a, .header-btn, .control-btn, .float-btn, .wa-btn, .modal-close');
    if (t) {
      initAudio();
      if (state.soundEnabled) sndClick();
    }
  }, { passive: true });

  // ============ الجزيئات ============
  function createParticles() {
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 14 : 35;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      const dur = 12 + Math.random() * 14;
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = (Math.random() * -dur) + 's';
      const s = 1 + Math.random() * 2.5;
      p.style.width = s + 'px';
      p.style.height = s + 'px';
      p.style.opacity = (0.35 + Math.random() * 0.55).toFixed(2);
      frag.appendChild(p);
    }
    els.particles.appendChild(frag);
  }

  // ============ جلب مع Timeout ============
  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ============ تحميل JSON ============
  async function loadJSON(path) {
    try {
      const res = await fetchWithTimeout(path + '?t=' + Date.now(), 12000);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // ============ حماية HTML ============
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  // ============ الإشعار العلوي ============
  async function initNotice() {
    const data = await loadJSON('notice.json');
    if (!data || data.active !== true) {
      els.noticeBar.hidden = true;
      return;
    }
    const color = data.color || 'green';
    els.noticeBar.className = 'notice-bar color-' + color;
    els.noticeBar.innerHTML = '<span class="notice-emoji">' + (data.emoji || '🌟') + '</span><span>' + escapeHTML(data.text || '') + '</span>';
    els.noticeBar.hidden = false;
  }

  // ============ شريط الإعلانات ============
  async function initTicker() {
    const data = await loadJSON('messages.json');
    if (!data || !Array.isArray(data.messages) || !data.messages.length) return;

    const defaultColor = data.defaultColor || 'green';
    const items = data.messages;
    const doubled = [...items, ...items];
    const frag = document.createDocumentFragment();

    doubled.forEach((msg) => {
      const span = document.createElement('span');
      let text = '', color = defaultColor;

      if (typeof msg === 'string') {
        text = msg;
      } else if (msg && typeof msg === 'object') {
        text = msg.text || '';
        color = msg.color || defaultColor;
      }

      const match = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u);
      let emoji = '', rest = text;
      if (match) {
        emoji = match[1];
        rest = match[2];
      }

      if (emoji) {
        const em = document.createElement('span');
        em.className = 'tk-emoji';
        em.textContent = emoji;
        span.appendChild(em);
      }

      const txt = document.createElement('span');
      txt.textContent = rest;
      if (color && color !== 'green') txt.style.color = colorToCss(color);
      span.appendChild(txt);
      frag.appendChild(span);
    });

    els.tickerContent.innerHTML = '';
    els.tickerContent.appendChild(frag);

    const seconds = Math.max(30, doubled.length * 4);
    els.tickerContent.style.animationDuration = seconds + 's';
  }

  function colorToCss(c) {
    const map = {
      green: '#22c55e',
      red: '#ef4444',
      blue: '#3b82f6',
      yellow: '#fbbf24',
      orange: '#f97316',
      purple: '#a855f7',
      gray: '#64748b'
    };
    return map[c] || 'inherit';
  }

  // ============ اسم الطالب ============
  function initNameFlow() {
    if (state.studentName) {
      els.nameOverlay.hidden = true;
      showGreeting();
    } else {
      els.nameOverlay.hidden = false;
      setTimeout(() => els.nameInput && els.nameInput.focus(), 300);
    }
  }

  function submitName() {
    const val = (els.nameInput.value || '').trim();
    if (val.length < 2) {
      els.nameError.textContent = 'الاسم قصير جدًا';
      els.nameInput.focus();
      return;
    }
    state.studentName = val;
    store.set('studentName', val);
    els.nameError.textContent = '';
    els.nameOverlay.hidden = true;
    initAudio();
    sndSuccess();
    showGreeting();
  }

  els.nameSubmit.addEventListener('click', submitName);
  els.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitName();
  });
  els.nameInput.addEventListener('input', () => {
    els.nameError.textContent = '';
  });

  function showGreeting() {
    if (!state.studentName) return;
    const h = new Date().getHours();
    let g = '';
    if (h >= 5 && h < 12) g = 'صباح الخير';
    else if (h >= 12 && h < 17) g = 'نهارك سعيد';
    else if (h >= 17 && h < 21) g = 'مساء الخير';
    else g = 'سهرة موفقة';
    els.greetingText.textContent = '🌟 ' + g + ' يا ' + state.studentName;
    els.greeting.hidden = false;
  }

  // ============ أدوات ============
  function getIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return '🎵';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📽️';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
    return '📎';
  }

  function normalizeArabic(str) {
    return String(str).toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F\u0670]/g, '');
  }

  // ============ مسار التنقل ============
  function renderBreadcrumb() {
    els.breadcrumb.innerHTML = '';

    const homeSpan = document.createElement('span');
    homeSpan.textContent = 'الرئيسية';
    homeSpan.tabIndex = 0;
    const goHome = () => {
      if (state.currentFolder === null) return;
      state.currentFolder = null;
      els.searchInput.value = '';
      renderCurrent();
    };
    homeSpan.onclick = goHome;
    homeSpan.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goHome();
      }
    };
    els.breadcrumb.appendChild(homeSpan);

    if (state.currentFolder !== null) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '›';
      els.breadcrumb.appendChild(sep);

      const cur = document.createElement('span');
      cur.textContent = state.currentFolder;
      els.breadcrumb.appendChild(cur);
    }
  }

  // ============ عرض البطاقات ============
  function renderCards(items) {
    els.content.innerHTML = '';

    if (!items.length) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    const frag = document.createDocumentFragment();

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'card' + (item.type === 'folder' ? ' folder-card' : '');
      card.style.animationDelay = Math.min(idx * 0.03, 0.6) + 's';

      // الأيقونة
      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = item.type === 'folder' ? (item.emoji || '📁') : getIcon(item.file || '');

      // الاسم
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.display || item.name;

      // الميتا
      const meta = document.createElement('div');
      meta.className = 'meta';
      if (item.type === 'folder') {
        meta.textContent = '📂 ' + (item.count || 0) + ' ملف';
      } else {
        meta.textContent = '📄 ملف';
      }

      // الأزرار
      const actions = document.createElement('div');
      actions.className = 'actions';

      if (item.type === 'folder') {
        const go = () => {
          state.currentFolder = item.name;
          els.searchInput.value = '';
          renderCurrent();
        };
        card.onclick = go;
        card.tabIndex = 0;
        card.onkeydown = (e) => {
          if (e.key === 'Enter') go();
        };
      } else {
        const a = document.createElement('a');
        a.href = 'files/' + encodeURIComponent(item.folder) + '/' + encodeURIComponent(item.file);
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('download', item.file);
        a.textContent = '⬇️ تنزيل';
        actions.appendChild(a);
      }

      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(actions);
      frag.appendChild(card);
    });

    els.content.appendChild(frag);
  }

  // ============ العرض الحالي ============
  function renderCurrent() {
    renderBreadcrumb();

    if (!state.data || !Array.isArray(state.data.folders)) {
      els.errorBox.textContent = '⚠️ لم يتم تحميل قائمة الملفات (files.json)';
      els.errorBox.hidden = false;
      return;
    }

    let items = [];

    if (state.currentFolder === null) {
      // عرض المجلدات
      items = state.data.folders.map(f => ({
        type: 'folder',
        name: f.name,
        display: f.name,
        emoji: f.emoji || '📁',
        count: (f.files || []).length
      }));
    } else {
      // عرض ملفات المجلد الحالي
      const folder = state.data.folders.find(f => f.name === state.currentFolder);
      if (!folder) {
        els.empty.hidden = false;
        return;
      }
      items = (folder.files || []).map(file => ({
        type: 'file',
        folder: folder.name,
        file: file.file,
        display: file.display || file.file
      }));
    }

    state.currentItems = items;
    renderCards(items);
  }

  // ============ البحث ============
  function filterItems() {
    const q = normalizeArabic((els.searchInput.value || '').trim());
    if (!q) {
      renderCards(state.currentItems);
      return;
    }
    renderCards(state.currentItems.filter(f =>
      normalizeArabic(f.display || f.name).includes(q)
    ));
  }
  els.searchInput.addEventListener('input', filterItems);

  // ============ تحميل البيانات ============
  async function loadData() {
    els.loading.hidden = false;
    els.content.innerHTML = '';
    els.empty.hidden = true;
    els.errorBox.hidden = true;

    const data = await loadJSON('files.json');

    if (!data || !Array.isArray(data.folders)) {
      els.errorBox.textContent = '⚠️ فشل تحميل files.json — تأكد من وجوده';
      els.errorBox.hidden = false;
      els.loading.hidden = true;
      return;
    }

    state.data = data;
    renderCurrent();
    els.loading.hidden = true;
  }

  // ============ زر التحديث ============
  els.refreshBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    loadData();
  });

  // ============ زر الرئيسية ============
  els.homeBtn.addEventListener('click', () => {
    state.currentFolder = null;
    els.searchInput.value = '';
    renderCurrent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============ زر العودة للأعلى ============
  let scrollRaf = false;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(() => {
      if (window.scrollY > 300) els.backToTop.classList.add('visible');
      else els.backToTop.classList.remove('visible');
      scrollRaf = false;
    });
  }, { passive: true });

  els.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============ الجدول ============
  async function initSchedule() {
    const data = await loadJSON('schedule.json');
    if (!data || !Array.isArray(data.items)) return;

    if (data.title) {
      els.scheduleTitle.textContent = (data.emoji ? data.emoji + ' ' : '') + data.title;
    }

    els.scheduleList.innerHTML = '';

    data.items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'schedule-item color-' + (item.color || 'blue');
      el.style.animationDelay = (i * 0.05) + 's';

      const day = document.createElement('div');
      day.className = 'schedule-day';
      day.textContent = item.day || '';

      const time = document.createElement('div');
      time.className = 'schedule-time';
      time.textContent = '🕐 ' + (item.time || '');

      el.appendChild(day);
      el.appendChild(time);

      if (item.label) {
        const l = document.createElement('div');
        l.className = 'schedule-label';
        l.textContent = item.label;
        el.appendChild(l);
      }

      els.scheduleList.appendChild(el);
    });
  }

  els.scheduleBtn.addEventListener('click', () => {
    els.scheduleModal.hidden = false;
  });

  els.scheduleModal.addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined ||
        e.target.classList.contains('modal-backdrop') ||
        e.target.classList.contains('modal-close')) {
      els.scheduleModal.hidden = true;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.scheduleModal.hidden) {
      els.scheduleModal.hidden = true;
    }
  });

  // ============ سنة الفوتر ============
  if (els.year) els.year.textContent = new Date().getFullYear();

  // ============ إخفاء شاشة التحميل ============
  function hideLoader() {
    setTimeout(() => {
      if (els.pageLoader) els.pageLoader.classList.add('hidden');
    }, 500);
  }

  // ============ الصيانة ============
  function checkMaintenance() {
    if (window.MAINTENANCE_MODE === true) {
      document.body.classList.add('maintenance-active');
      els.maintenanceScreen.hidden = false;
      els.pageLoader.classList.add('hidden');
      return true;
    }
    return false;
  }

  // ============ الإقلاع ============
  async function init() {
    applyTheme();
    applySoundState();
    createParticles();

    if (checkMaintenance()) return;

    initNameFlow();
    initNotice();
    initTicker();
    initSchedule();

    await loadData();
    hideLoader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();