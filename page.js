// YouTube Music sayfasına enjekte edilen betik.
// NOT: YouTube "Trusted Types" kullanır; innerHTML YASAK. Her şey createElement ile kurulur.
(() => {
  if (window.__ytmd) return;
  window.__ytmd = true;

  const THEME = window.__ytmdTheme === true;
  const api = window.ytmd || {};
  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';

  // ---------------- Yardımcılar ----------------
  const el = (tag, props = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    kids.forEach((c) => c && e.appendChild(c));
    return e;
  };
  const svgIcon = (viewBox, d, { size = 10, stroke = true, width = 1 } = {}) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', viewBox);
    s.setAttribute('width', size);
    s.setAttribute('height', size);
    for (const p of [].concat(d)) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', p);
      if (stroke) {
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', width);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
      } else path.setAttribute('fill', 'currentColor');
      s.appendChild(path);
    }
    return s;
  };
  const ICON = {
    lyrics: () => svgIcon('0 0 24 24', ['M4 6h16', 'M4 12h11', 'M4 18h7'], { size: 16, width: 2 }),
    share: () => svgIcon('0 0 24 24', ['M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'], { size: 16, width: 2 }),
    full: () => svgIcon('0 0 24 24', ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'], { size: 16, width: 2 }),
    mini: () => svgIcon('0 0 24 24', ['M3 5h18v14H3z', 'M12 12h7v5h-7z'], { size: 16, width: 1.8 }),
    gear: () => svgIcon('0 0 24 24', ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'], { size: 16, width: 1.7 }),
    close: (s = 12) => svgIcon('0 0 10 10', ['M1 1l8 8', 'M9 1L1 9'], { size: s, width: 1.4 }),
    prev: () => svgIcon('0 0 24 24', ['M6 5h2v14H6z', 'M20 5v14L9 12z'], { size: 26, stroke: false }),
    next: () => svgIcon('0 0 24 24', ['M16 5h2v14h-2z', 'M4 5v14l11-7z'], { size: 26, stroke: false }),
    play: () => svgIcon('0 0 24 24', 'M8 5v14l11-7z', { size: 30, stroke: false }),
    pause: () => svgIcon('0 0 24 24', ['M7 5h3.5v14H7z', 'M13.5 5H17v14h-3.5z'], { size: 30, stroke: false }),
    speaker: () => svgIcon('0 0 24 24', ['M4 9v6h4l5 4V5L8 9z', 'M16.5 8.5a5 5 0 0 1 0 7', 'M19 6a8.5 8.5 0 0 1 0 12'], { size: 16, width: 1.9 }),
    queue: () => svgIcon('0 0 24 24', ['M4 6h12', 'M4 11h12', 'M4 16h7', 'M15 15.5v5l4.5-2.5z'], { size: 16, width: 1.9 }),
    image: () => svgIcon('0 0 24 24', ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2-2 5 5', 'M15.5 9.5h.01'], { size: 16, width: 1.9 }),
    copy: () => svgIcon('0 0 24 24', ['M9 9h11v11H9z', 'M5 15H4V4h11v1'], { size: 16, width: 1.9 }),
    save: () => svgIcon('0 0 24 24', ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'], { size: 16, width: 1.9 }),
    link: () => svgIcon('0 0 24 24', ['M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'], { size: 16, width: 1.9 }),
    playSm: () => svgIcon('0 0 24 24', 'M8 5v14l11-7z', { size: 18, stroke: false }),
    party: () => svgIcon('0 0 24 24', ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5', 'M16 4.3a3.5 3.5 0 0 1 0 6.4', 'M18 14.8c2 .7 3.2 2.5 3.5 5.2'], { size: 16, width: 1.9 }),
    translate: () => svgIcon('0 0 24 24', ['M4 5h9', 'M8.5 3v2', 'M11 5c-1 4-3.5 7-7 9', 'M6 9c1.2 2 3 3.6 5 4.5', 'M13 21l4-9 4 9', 'M14.5 18h5'], { size: 15, width: 1.8 })
  };
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  const video = () => document.querySelector('video');
  const player = () => document.getElementById('movie_player');
  const ctl = {
    toggle() { const p = player(); try { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); } catch (e) { document.querySelector('#play-pause-button')?.click(); } },
    next() { try { player().nextVideo(); } catch (e) { document.querySelector('.next-button')?.click(); } },
    prev() { document.querySelector('.previous-button')?.click(); },
    pause() { try { player().pauseVideo(); } catch (e) { const v = video(); v && v.pause(); } },
    seek(t) { const v = video(); if (v) v.currentTime = t; }
  };
  window.__ytmdControl = (a, x) => ctl[a] && ctl[a](x);
  let GAME = false;   // oyun modu: arayüz güncellemeleri durur
  const idle = () => document.hidden || GAME;
  const bootFns = [];   // açılışta YouTube menüyü çizer çizmez yerleşecek parçalar

  // ---------------- Bildirim balonu ----------------
  const toastEl = el('div', { id: 'ytmd-toast' });
  root.appendChild(toastEl);
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  window.__ytmdToast = toast;

  // ---------------- Tema öğeleri ----------------
  let amb = null;
  if (THEME) {
    amb = el('div', { id: 'ytmd-ambient' });
    root.appendChild(amb);
    root.appendChild(el('div', { id: 'ytmd-shade' }));
    root.appendChild(el('div', { id: 'ytmd-fade' }));
    root.appendChild(el('div', { id: 'ytmd-drag' }));
    const btn = (action, title, icon, cls = '') =>
      el('button', { title, class: cls, onclick: () => api[action] && api[action]() }, [icon]);
    root.appendChild(el('div', { id: 'ytmd-controls' }, [
      btn('minimize', 'Küçült', svgIcon('0 0 10 10', 'M0 5.5h10')),
      btn('maximize', 'Büyüt', svgIcon('0 0 10 10', 'M.5 .5h9v9h-9z')),
      btn('close', 'Kapat', svgIcon('0 0 10 10', ['M0 0l10 10', 'M10 0L0 10']), 'close')
    ]));
  }

  // ---------------- Şimdi çalan ----------------
  function readNowPlaying() {
    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    if (!md || !md.title) return null;
    const art = [...(md.artwork || [])].sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))[0];
    const v = video();
    let videoId = '';
    try { videoId = player().getVideoData().video_id || ''; } catch (e) {}
    if (!videoId) { try { videoId = new URL(location.href).searchParams.get('v') || ''; } catch (e) {} }
    return {
      title: md.title || '', artist: md.artist || '', album: md.album || '',
      artwork: art ? art.src : '', videoId,
      paused: v ? v.paused : true,
      currentTime: v ? v.currentTime || 0 : 0,
      duration: v && isFinite(v.duration) ? v.duration : 0,
      rate: v ? v.playbackRate || 1 : 1
    };
  }

  let lastKey = '', lastTrack = '', lastSent = 0, lastSentPos = 0, lastArt = '';
  let current = null;
  const trackListeners = [];
  function tickNowPlaying() {
    const np = readNowPlaying();
    root.classList.toggle('ytmd-has-track', !!np);
    if (!np) return;
    current = np;
    const track = np.videoId || np.title + '|' + np.artist;
    const key = track + '|' + np.paused + '|' + Math.round(np.duration || 0);
    const now = Date.now();
    const expected = lastSentPos + (np.paused ? 0 : (now - lastSent) / 1000 * (np.rate || 1));
    const seeked = Math.abs(expected - np.currentTime) > 2.5;
    if (key !== lastKey || seeked || now - lastSent > 30000) {
      lastKey = key; lastSent = now; lastSentPos = np.currentTime;
      try { api.update && api.update(np); } catch (e) {}
    }
    if (track !== lastTrack) {
      const first = !lastTrack;
      lastTrack = track;
      if (!first) {
        root.classList.remove('ytmd-track-change'); void root.offsetWidth;
        root.classList.add('ytmd-track-change');
        setTimeout(() => root.classList.remove('ytmd-track-change'), 800);
      }
      trackListeners.forEach((f) => { try { f(np, first); } catch (e) {} });
    }
    if (amb && np.artwork && np.artwork !== lastArt) {
      lastArt = np.artwork;
      amb.style.backgroundImage = 'url("' + np.artwork.replace(/=w\d+-h\d+/, '=w180-h180').replace(/"/g, '') + '")';
    }
    if (lyricsOpen || fullOpen) loadLyricsFor(np);
    if (fullOpen) renderFullInfo(np);
  }
  setInterval(() => { if (!idle()) tickNowPlaying(); }, 1000);
  setInterval(() => { if (idle()) tickNowPlaying(); }, 5000);

  // ---------------- Şarkı sözleri (panel + tam ekran ortak) ----------------
  let lyricsOpen = false;
  try { lyricsOpen = localStorage.getItem('ytmd-lyrics') === '1'; } catch (e) {}
  let lyricsKey = '', lines = [], synced = false, activeIdx = -1, userScrollAt = 0;
  const bodies = [];   // sözlerin çizildiği kaplar (panel ve tam ekran)

  const panelTitle = el('div', { class: 'ytmd-ly-track' });
  const panelBody = el('div', { class: 'ytmd-ly-body' });
  bodies.push(panelBody);
  const panel = el('div', { id: 'ytmd-lyrics' }, [
    el('div', { class: 'ytmd-ly-head' }, [
      el('div', {}, [el('div', { class: 'ytmd-ly-label', text: 'Şarkı sözleri' }), panelTitle]),
      el('div', { class: 'ytmd-ly-tools' }, [
        el('button', { class: 'ytmd-ly-trbtn', title: 'Türkçe çeviriyi göster / gizle', onclick: () => setTranslate(!lyTr) }, [ICON.translate(), el('span', { text: 'Çeviri' })]),
        el('button', { class: 'ytmd-ly-close', title: 'Kapat', onclick: () => setLyrics(false) }, [ICON.close()])
      ])
    ]),
    panelBody
  ]);
  root.appendChild(panel);
  panelBody.addEventListener('wheel', () => { userScrollAt = Date.now(); }, { passive: true });

  function setLyrics(open) {
    lyricsOpen = open;
    if (open && typeof setQueue === 'function') setQueue(false);
    if (open && window.__ytmdParty) window.__ytmdParty(false);
    try { localStorage.setItem('ytmd-lyrics', open ? '1' : '0'); } catch (e) {}
    root.classList.toggle('ytmd-lyrics-open', open);
    if (open && current) { lyricsKey = ''; loadLyricsFor(current); }
  }

  function renderAll(build) { bodies.forEach((b) => b.replaceChildren(...build())); }
  function message(text) {
    lines = []; synced = false; activeIdx = -1;
    renderAll(() => [el('div', { class: 'ytmd-ly-msg', text })]);
  }
  function parseLRC(text) {
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!stamps.length) continue;
      const words = raw.replace(/\[[^\]]*\]/g, '').trim();
      for (const s of stamps) out.push({ t: parseInt(s[1]) * 60 + parseFloat(s[2]), text: words });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  async function loadLyricsFor(np) {
    const key = np.videoId || np.title + np.artist;
    if (key === lyricsKey) return;
    lyricsKey = key;
    panelTitle.textContent = np.title + (np.artist ? ' · ' + np.artist : '');
    message('Sözler aranıyor…');
    let res = null;
    try { res = api.lyrics ? await api.lyrics({ title: np.title, artist: np.artist, album: np.album, duration: np.duration }) : null; } catch (e) {}
    if (key !== lyricsKey) return;
    if (res && res.synced) { lines = parseLRC(res.synced).filter((l) => l.text); synced = lines.length > 0; }
    else if (res && res.plain) { lines = res.plain.split(/\r?\n/).map((text) => ({ t: -1, text })); synced = false; }
    else { message('Bu şarkı için söz bulunamadı.'); return; }
    trLines = null; trFor = '';
    renderLines();
    bodies.forEach((b) => { b.scrollTop = 0; });
    if (lyTr) translateLyrics();
  }
  // ---- Türkçe çeviri ----
  let lyTr = false, trLines = null, trFor = '';
  try { lyTr = localStorage.getItem('ytmd-lyrics-tr') === '1'; } catch (e) {}
  function renderLines() {
    activeIdx = -1;
    renderAll(() => lines.map((l, i) => el('div', {
      class: 'ytmd-ly-line' + (synced ? '' : ' plain'),
      onclick: () => { if (synced) { ctl.seek(l.t); userScrollAt = 0; } }
    }, [document.createTextNode(l.text || '\u00a0'),
        lyTr && trLines && trLines[i] && trLines[i] !== l.text ? el('div', { class: 'ytmd-ly-tr', text: trLines[i] }) : null])));
  }
  async function translateLyrics() {
    const key = lyricsKey;
    if (!lines.length || trFor === key) { renderLines(); return; }
    trFor = key;
    let res = null;
    try { res = api.translate ? await api.translate(lines.map((l) => l.text || '')) : null; } catch (e) {}
    if (key !== lyricsKey) return;
    if (!res || !Array.isArray(res.lines)) { trFor = ''; toast('Çeviri yapılamadı (internet?)'); return; }
    if (res.src === 'tr') { toast('Bu şarkının sözleri zaten Türkçe'); trLines = null; return; }
    trLines = res.lines;
    renderLines();
  }
  function setTranslate(on) {
    lyTr = on;
    try { localStorage.setItem('ytmd-lyrics-tr', on ? '1' : '0'); } catch (e) {}
    root.classList.toggle('ytmd-tr-on', on);
    if (on) translateLyrics(); else renderLines();
  }
  if (lyTr) root.classList.add('ytmd-tr-on');
  setInterval(() => {
    if ((!lyricsOpen && !fullOpen) || !synced || document.hidden) return;
    const v = video(); if (!v) return;
    const t = v.currentTime + 0.3;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) { if (lines[i].t <= t) idx = i; else break; }
    if (idx === activeIdx) return;
    const prev = activeIdx; activeIdx = idx;
    for (const body of bodies) {
      const kids = body.children;
      if (kids[prev]) kids[prev].classList.remove('active');
      const line = kids[idx];
      if (!line) continue;
      line.classList.add('active');
      if (body.offsetParent && Date.now() - userScrollAt > 3000) {
        body.scrollTo({ top: line.offsetTop - body.clientHeight / 2 + line.clientHeight / 2, behavior: 'smooth' });
      }
    }
  }, 200);

  // ---------------- Sağ alttaki düğmeler ----------------
  const actBtn = (title, icon, label, onclick, id) =>
    el('button', { class: 'ytmd-act', title, id: id || '', onclick }, [icon, label ? el('span', { text: label }) : null]);
  root.appendChild(el('div', { id: 'ytmd-actions' }, [
    actBtn('Ayarlar', ICON.gear(), '', () => api.openSettings && api.openSettings()),
    actBtn('Mini oynatıcı', ICON.mini(), '', () => api.mini && api.mini()),
    actBtn('Ses: hız, yumuşak geçiş, çıkış cihazı', ICON.speaker(), '', () => toggleAudioPop(), 'ytmd-audio-btn'),
    actBtn('Şarkı kartı paylaş', ICON.share(), '', () => openCard()),
    actBtn('Tam ekran', ICON.full(), '', () => setFull(true)),
    actBtn('Birlikte dinle', ICON.party(), '', () => window.__ytmdParty && window.__ytmdParty(), 'ytmd-party-btn'),
    actBtn('Sıradakiler', ICON.queue(), '', () => setQueue(!queueOpen), 'ytmd-queue-btn'),
    actBtn('Şarkı sözleri', ICON.lyrics(), 'Sözler', () => setLyrics(!lyricsOpen), 'ytmd-lyrics-btn')
  ]));

  async function share() {
    const np = current || readNowPlaying();
    if (!np || !np.videoId) return toast('Önce bir şarkı çal');
    const ok = api.share ? await api.share(np) : false;
    toast(ok ? 'Bağlantı kopyalandı — Discord\'a yapıştırabilirsin' : 'Kopyalanamadı');
    return ok;
  }
  window.__ytmdShare = share;

  // ---------------- Tam ekran mod ----------------
  let fullOpen = false;
  const fBg1 = el('div', { class: 'ytmd-f-bg one' });
  const fBg2 = el('div', { class: 'ytmd-f-bg two' });
  const fCover = el('img', { class: 'ytmd-f-cover', alt: '' });
  const fTitle = el('div', { class: 'ytmd-f-title' });
  const fArtist = el('div', { class: 'ytmd-f-artist' });
  const fCur = el('span', { text: '0:00' });
  const fDur = el('span', { text: '0:00' });
  const fFill = el('div', { class: 'ytmd-f-fill' });
  const fBar = el('div', { class: 'ytmd-f-bar', onclick: (e) => {
    const v = video(); if (!v || !isFinite(v.duration)) return;
    const r = fBar.getBoundingClientRect();
    ctl.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration);
  } }, [fFill]);
  const fPlay = el('button', { class: 'ytmd-f-btn big', title: 'Oynat / Duraklat', onclick: () => ctl.toggle() }, [ICON.play()]);
  const fBody = el('div', { class: 'ytmd-ly-body ytmd-f-lyrics' });
  bodies.push(fBody);
  fBody.addEventListener('wheel', () => { userScrollAt = Date.now(); }, { passive: true });
  const full = el('div', { id: 'ytmd-full' }, [
    fBg1, fBg2, el('div', { class: 'ytmd-f-shade' }),
    el('button', { class: 'ytmd-f-exit', title: 'Tam ekrandan çık (Esc)', onclick: () => setFull(false) }, [ICON.close(14)]),
    el('button', { class: 'ytmd-f-tr ytmd-ly-trbtn', title: 'Türkçe çeviriyi göster / gizle', onclick: () => setTranslate(!lyTr) }, [ICON.translate(), el('span', { text: 'Çeviri' })]),
    el('div', { class: 'ytmd-f-main' }, [
      el('div', { class: 'ytmd-f-left' }, [
        fCover,
        el('div', { class: 'ytmd-f-meta' }, [fTitle, fArtist]),
        el('div', { class: 'ytmd-f-progress' }, [fBar, el('div', { class: 'ytmd-f-times' }, [fCur, fDur])]),
        el('div', { class: 'ytmd-f-controls' }, [
          el('button', { class: 'ytmd-f-btn', title: 'Önceki', onclick: () => ctl.prev() }, [ICON.prev()]),
          fPlay,
          el('button', { class: 'ytmd-f-btn', title: 'Sonraki', onclick: () => ctl.next() }, [ICON.next()])
        ])
      ]),
      fBody
    ])
  ]);
  root.appendChild(full);

  let fLastArt = '', fWasPaused = null;
  function renderFullInfo(np) {
    fTitle.textContent = np.title; fArtist.textContent = np.artist;
    if (np.artwork && np.artwork !== fLastArt) {
      fLastArt = np.artwork;
      const big = np.artwork.replace(/=w\d+-h\d+/, '=w1080-h1080');
      fCover.src = big;
      const url = 'url("' + np.artwork.replace(/=w\d+-h\d+/, '=w300-h300').replace(/"/g, '') + '")';
      fBg1.style.backgroundImage = url; fBg2.style.backgroundImage = url;
    }
    if (np.paused !== fWasPaused) { fWasPaused = np.paused; fPlay.replaceChildren(np.paused ? ICON.play() : ICON.pause()); }
  }
  setInterval(() => {
    if (!fullOpen) return;
    const v = video(); if (!v) return;
    const d = isFinite(v.duration) ? v.duration : 0;
    fCur.textContent = fmt(v.currentTime); fDur.textContent = fmt(d);
    fFill.style.width = d ? (v.currentTime / d * 100) + '%' : '0%';
    if (v.paused !== fWasPaused) { fWasPaused = v.paused; fPlay.replaceChildren(v.paused ? ICON.play() : ICON.pause()); }
  }, 250);

  function setFull(open) {
    fullOpen = open;
    root.classList.toggle('ytmd-full-open', open);
    try { api.fullscreen && api.fullscreen(open); } catch (e) {}
    if (open) { const np = current || readNowPlaying(); if (np) { renderFullInfo(np); lyricsKey = ''; loadLyricsFor(np); } }
  }
  window.__ytmdFull = (open) => setFull(open === undefined ? !fullOpen : !!open);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullOpen) { setFull(false); e.stopPropagation(); }
    if (fullOpen && e.code === 'Space' && !/input|textarea/i.test(e.target.tagName)) { ctl.toggle(); e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---------------- Ekolayzer + ses eşitleme (Web Audio) ----------------
  const EQ_FREQS = [60, 230, 910, 3600, 14000];
  const eq = { ctx: null, src: null, video: null, filters: [], comp: null, makeup: null, fade: null, settings: { enabled: false, bands: [0, 0, 0, 0, 0], normalize: false } };
  const audio = { crossfade: 0, speed: 1, device: '', boost: 1 };
  function eqNeeded() { return eq.settings.enabled || eq.settings.normalize || audio.crossfade > 0 || audio.boost > 1; }
  function eqEnsure() {
    const v = video();
    if (!v) return false;
    if (!eq.ctx) {
      eq.ctx = new AudioContext();
      eq.filters = EQ_FREQS.map((f, i) => {
        const b = eq.ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f; b.Q.value = 1.0; b.gain.value = 0;
        return b;
      });
      for (let i = 0; i < eq.filters.length - 1; i++) eq.filters[i].connect(eq.filters[i + 1]);
      eq.comp = eq.ctx.createDynamicsCompressor();
      eq.comp.threshold.value = -24; eq.comp.knee.value = 18; eq.comp.ratio.value = 4;
      eq.comp.attack.value = 0.005; eq.comp.release.value = 0.3;
      eq.makeup = eq.ctx.createGain();
      eq.comp.connect(eq.makeup);
      eq.fade = eq.ctx.createGain();
      // Ses yükseltme + taşmayı (cızırtıyı) önleyen sınırlayıcı
      eq.boost = eq.ctx.createGain();
      eq.limit = eq.ctx.createDynamicsCompressor();
      eq.limit.knee.value = 0; eq.limit.ratio.value = 20; eq.limit.attack.value = 0.002; eq.limit.release.value = 0.12; eq.limit.threshold.value = 0;
      eq.boost.connect(eq.limit); eq.limit.connect(eq.ctx.destination);
      applySink();
      const resume = () => { if (eq.ctx.state === 'suspended') eq.ctx.resume().catch(() => {}); };
      document.addEventListener('play', resume, true);
      document.addEventListener('click', resume, true);
    }
    if (eq.video !== v) {
      try { eq.src = eq.ctx.createMediaElementSource(v); eq.video = v; eq.src.connect(eq.filters[0]); }
      catch (e) { return false; }
    }
    if (eq.ctx.state === 'suspended') eq.ctx.resume().catch(() => {});
    return true;
  }
  function eqApply() {
    if (!eq.ctx && !eqNeeded()) return;   // hiç açılmadıysa sesi hiç ellemeyiz
    if (!eqEnsure()) return;
    const s = eq.settings;
    eq.filters.forEach((f, i) => f.gain.setTargetAtTime(s.enabled ? Math.max(-12, Math.min(12, +s.bands[i] || 0)) : 0, eq.ctx.currentTime, 0.05));
    const last = eq.filters[eq.filters.length - 1];
    try { last.disconnect(); } catch (e) {}
    try { eq.makeup.disconnect(); } catch (e) {}
    if (s.normalize) { last.connect(eq.comp); eq.makeup.gain.value = 1.35; eq.makeup.connect(eq.fade); }
    else last.connect(eq.fade);
    try { eq.fade.disconnect(); } catch (e) {}
    if (audio.boost > 1) { eq.boost.gain.setTargetAtTime(audio.boost, eq.ctx.currentTime, 0.08); eq.limit.threshold.value = -1; eq.fade.connect(eq.boost); }
    else eq.fade.connect(eq.ctx.destination);   // yükseltme kapalı: sınırlayıcı devre dışı
  }
  // Ses çıkış cihazı (boş = sistem varsayılanı)
  function applySink() {
    const id = audio.device || '';
    const v = video();
    try { if (v && v.setSinkId && v.sinkId !== id) v.setSinkId(id).catch(() => {}); } catch (e) {}
    try { if (eq.ctx && eq.ctx.setSinkId && (eq.ctx.sinkId || '') !== id) eq.ctx.setSinkId(id).catch(() => toast('Ses cihazına geçilemedi')); } catch (e) {}
  }
  window.__ytmdDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      let n = 0;
      return list.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications')
        .map((d) => ({ id: d.deviceId, label: d.label || 'Ses cihazı ' + (++n) }));
    } catch (e) { return []; }
  };
  // Oynatma hızı: YouTube her şarkıda 1x'e döndürebilir, o yüzden sürekli koru
  setInterval(() => {
    const v = video(); if (!v) return;
    if (Math.abs((v.playbackRate || 1) - audio.speed) > 0.01) { try { v.playbackRate = audio.speed; } catch (e) {} }
    if (audio.device && v.sinkId !== audio.device && !eq.ctx) applySink();
  }, 1000);
  // Yumuşak geçiş: şarkı sonunda sesi kıs, yeni şarkıda yavaşça aç
  let cfArmed = false, cfTimer = 0;
  function cfSchedule() {
    clearInterval(cfTimer); cfTimer = 0;
    if (audio.crossfade > 0) cfTimer = setInterval(cfTick, 200);
  }
  function cfTick() {
    const cf = audio.crossfade;
    if (!cf || !eq.fade || !eq.ctx) return;
    const v = video(); if (!v || !isFinite(v.duration) || v.duration <= 0) return;
    const rate = v.playbackRate || 1;
    const rem = (v.duration - v.currentTime) / rate;
    const g = eq.fade.gain, now = eq.ctx.currentTime;
    if (cfArmed) {
      if (v.currentTime < 4 && rem > cf) {             // yeni şarkı başladı
        cfArmed = false;
        g.cancelScheduledValues(now); g.setValueAtTime(Math.min(g.value, 0.05), now); g.linearRampToValueAtTime(1, now + cf);
      } else if (rem > cf + 1) {                       // geri sarıldı
        cfArmed = false; g.cancelScheduledValues(now); g.setTargetAtTime(1, now, 0.15);
      } else if (!v.paused) g.setTargetAtTime(Math.max(0, rem / cf), now, 0.08);
      return;
    }
    if (!v.paused && v.duration > cf * 2 + 8 && rem <= cf && rem > 0) {
      cfArmed = true; g.cancelScheduledValues(now); g.setTargetAtTime(Math.max(0, rem / cf), now, 0.08);
    }
  }
  // YouTube video öğesini değiştirirse yeniden bağlan
  setInterval(() => { if (eq.ctx && video() && video() !== eq.video) eqApply(); }, 3000);

  // ---------------- Uyku zamanlayıcı ----------------
  let sleepAfterTrack = false;
  trackListeners.push((np, first) => {
    if (sleepAfterTrack && !first) {
      sleepAfterTrack = false; ctl.pause(); toast('Uyku zamanlayıcı: müzik durduruldu');
      try { api.sleepDone && api.sleepDone(); } catch (e) {}
    }
  });
  let fading = false;
  async function sleepFade() {
    if (fading) return; fading = true;
    const v = video();
    if (v) {
      const start = v.volume;
      for (let i = 1; i <= 40; i++) { v.volume = start * (1 - i / 40); await new Promise((r) => setTimeout(r, 500)); }
      ctl.pause();
      setTimeout(() => { v.volume = start; }, 800);
    }
    fading = false;
    toast('Uyku zamanlayıcı: iyi geceler 🌙');
  }

  // ---------------- Spotify tarzı kitaplık (sol menü) ----------------
  const LIB = (() => {
    const SOURCES = { playlists: 'FEmusic_liked_playlists', albums: 'FEmusic_liked_albums', artists: 'FEmusic_library_corpus_artists' };
    const LABEL = { playlists: 'Çalma Listeleri', albums: 'Albümler', artists: 'Sanatçılar' };
    let tab = 'playlists', sort = 'recent', query = '', data = {}, panel = null, listEl = null, searchInput = null;
    try { const c = JSON.parse(localStorage.getItem('ytmd-lib') || '{}'); if (c && typeof c === 'object') data = c; } catch (e) {}
    try { tab = localStorage.getItem('ytmd-lib-tab') || 'playlists'; if (!SOURCES[tab]) tab = 'playlists'; } catch (e) {}

    const txt = (o) => (o && o.runs ? o.runs.map((r) => r.text).join('') : (o && o.simpleText) || '');
    const lastThumb = (t) => { const a = t && t.thumbnails; return a && a.length ? a[a.length - 1].url : ''; };
    function parse(json) {
      const out = [], seen = new Set();
      (function walk(o, depth) {
        if (!o || typeof o !== 'object' || depth > 40) return;
        if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
        const two = o.musicTwoRowItemRenderer, row = o.musicResponsiveListItemRenderer;
        if (two || row) {
          const r = two || row;
          const ep = r.navigationEndpoint;
          const id = ep && ep.browseEndpoint && ep.browseEndpoint.browseId;
          if (id && !seen.has(id)) {
            seen.add(id);
            const title = two ? txt(r.title) : txt(r.flexColumns && r.flexColumns[0] && r.flexColumns[0].musicResponsiveListItemFlexColumnRenderer && r.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text);
            const sub = two ? txt(r.subtitle) : txt(r.flexColumns && r.flexColumns[1] && r.flexColumns[1].musicResponsiveListItemFlexColumnRenderer && r.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text);
            const thumb = two ? lastThumb(r.thumbnailRenderer && r.thumbnailRenderer.musicThumbnailRenderer && r.thumbnailRenderer.musicThumbnailRenderer.thumbnail)
                              : lastThumb(r.thumbnail && r.thumbnail.musicThumbnailRenderer && r.thumbnail.musicThumbnailRenderer.thumbnail);
            if (title) out.push({ id, title, sub, thumb, round: !!row, ep: { browseEndpoint: ep.browseEndpoint } });
          }
          return;
        }
        for (const k in o) walk(o[k], depth + 1);
      })(json, 0);
      return out;
    }
    async function load(which) {
      const app = document.querySelector('ytmusic-app');
      if (!app || !app.networkManager || !app.networkManager.fetch) return;
      try {
        const res = await app.networkManager.fetch('/browse', { browseId: SOURCES[which] });
        const items = parse(res);
        if (items.length || !data[which]) {
          data[which] = { items, at: Date.now() };
          try { localStorage.setItem('ytmd-lib', JSON.stringify(data)); } catch (e) {}
          if (which === tab) render();
        }
      } catch (e) {}
    }
    function go(item) {
      const before = location.href;
      try {
        (listEl || document.body).dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint: item.ep } }));
      } catch (e) {}
      setTimeout(() => { if (location.href === before) location.assign('/browse/' + encodeURIComponent(item.id)); }, 400);
    }
    function render() {
      if (!listEl) return;
      let items = ((data[tab] && data[tab].items) || []).slice();
      if (query) { const q = query.toLocaleLowerCase('tr'); items = items.filter((x) => (x.title + ' ' + x.sub).toLocaleLowerCase('tr').includes(q)); }
      if (sort === 'alpha') items.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
      // "Beğendiğim müzikler" her zaman en üstte
      const liked = items.findIndex((x) => x.id === 'VLLM'); if (liked > 0) items.unshift(items.splice(liked, 1)[0]);
      if (!items.length) {
        listEl.replaceChildren(el('div', { class: 'ytmd-lib-empty', text: data[tab] ? (query ? 'Eşleşen bir şey yok' : 'Burası henüz boş') : 'Yükleniyor…' }));
        return;
      }
      listEl.replaceChildren(...items.map((x) => {
        const cover = x.thumb ? el('img', { class: 'ytmd-lib-cover' + (x.round ? ' round' : ''), src: x.thumb.replace(/=w\d+-h\d+/, '=w120-h120'), alt: '', loading: 'lazy' })
                              : el('div', { class: 'ytmd-lib-cover ph' + (x.round ? ' round' : ''), text: (x.title[0] || '♪').toUpperCase() });
        const subEl = el('div', { class: 'ytmd-lib-sub' }, [x.id === 'VLLM' ? el('span', { class: 'ytmd-lib-pin', text: '📌 ' }) : null, document.createTextNode(x.sub || LABEL[tab])]);
        const rowEl = el('a', { class: 'ytmd-lib-row', href: '/browse/' + encodeURIComponent(x.id), title: x.title, onclick: (e) => { e.preventDefault(); go(x); } },
          [cover, el('div', { class: 'ytmd-lib-meta' }, [el('div', { class: 'ytmd-lib-title', text: x.title }), subEl])]);
        if (location.pathname + location.search === '/browse/' + x.id || location.search.includes('list=' + x.id.replace(/^VL/, ''))) rowEl.classList.add('active');
        return rowEl;
      }));
    }
    function build() {
      const chips = el('div', { class: 'ytmd-lib-chips' }, Object.keys(SOURCES).map((k) => el('button', {
        class: 'ytmd-lib-chip' + (k === tab ? ' on' : ''), text: LABEL[k], 'data-k': k,
        onclick: () => {
          tab = k; try { localStorage.setItem('ytmd-lib-tab', k); } catch (e) {}
          chips.querySelectorAll('.ytmd-lib-chip').forEach((c) => c.classList.toggle('on', c.getAttribute('data-k') === k));
          render(); load(k);
        }
      })));
      // Fare tekerleğiyle çipleri yana kaydır
      chips.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { chips.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
      searchInput = el('input', { class: 'ytmd-lib-search', placeholder: 'Kitaplıkta ara', oninput: () => { query = searchInput.value.trim(); render(); } });
      const searchBtn = el('button', { class: 'ytmd-lib-icon', title: 'Ara', onclick: () => { panel.classList.toggle('searching'); if (panel.classList.contains('searching')) searchInput.focus(); else { searchInput.value = ''; query = ''; render(); } } },
        [svgIcon('0 0 24 24', ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'], { size: 16, width: 2 })]);
      const sortBtn = el('button', { class: 'ytmd-lib-sort', text: 'Yakın tarihli', onclick: () => {
        sort = sort === 'recent' ? 'alpha' : 'recent'; sortBtn.textContent = sort === 'recent' ? 'Yakın tarihli' : 'Alfabetik'; render();
      } });
      listEl = el('div', { class: 'ytmd-lib-list' });
      panel = el('div', { id: 'ytmd-lib' }, [
        el('div', { class: 'ytmd-lib-head' }, [el('div', { class: 'ytmd-lib-h', text: 'Kitaplığın' })]),
        chips,
        el('div', { class: 'ytmd-lib-tools' }, [searchBtn, searchInput, sortBtn]),
        listEl
      ]);
      return panel;
    }
    // Paneli sol menüye yerleştir; YouTube'un yazı listesi halindeki çalma listelerini gizle
    function mount() {
      const guide = document.querySelector('ytmusic-guide-renderer');
      if (!guide) return false;
      const host = guide.querySelector('#sections') || guide;
      let fresh = false;
      if (!panel) { build(); fresh = true; }
      if (panel.parentElement !== host) { host.appendChild(panel); fresh = true; }
      guide.querySelectorAll('ytmusic-guide-entry-renderer').forEach((e) => {
        const d = e.data || (e.__data && e.__data.data);
        if (d && !d.isPrimary) e.classList.add('ytmd-lib-hidden');
      });
      root.classList.add('ytmd-lib-on');
      return fresh ? 'fresh' : true;
    }
    return { _set: (k, v) => { data[k] = v; }, mount, load, render, refresh: () => Object.keys(SOURCES).forEach((k, i) => setTimeout(() => load(k), i * 700)), parse };
  })();
  if (THEME) {
    const tryMount = () => { if (!idle() && LIB.mount() === 'fresh') LIB.render(); };
    tryMount(); bootFns.push(tryMount);
    setInterval(tryMount, 3000);           // YouTube menüyü yeniden çizerse tekrar yerleştir
    setTimeout(() => LIB.refresh(), 2500); // açılışta tazele
    setInterval(() => LIB.refresh(), 10 * 60 * 1000);
    window.addEventListener('yt-navigate-finish', () => LIB.render());
  }

  // ---------------- Ses açılır paneli (hız, yumuşak geçiş, çıkış cihazı) ----------------
  const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5];
  const speedChips = el('div', { class: 'ytmd-ap-chips' }, SPEEDS.map((x) => el('button', {
    class: 'ytmd-ap-chip', 'data-v': String(x), text: String(x).replace('.', ',') + 'x',
    onclick: () => { api.pageSet && api.pageSet('speed', x); audio.speed = x; renderAudioPop(); }
  })));
  const cfVal = el('span', { class: 'ytmd-ap-val' });
  const cfRange = el('input', { type: 'range', min: '0', max: '12', step: '1', class: 'ytmd-ap-range' });
  cfRange.addEventListener('input', () => { cfVal.textContent = +cfRange.value ? cfRange.value + ' sn' : 'Kapalı'; });
  cfRange.addEventListener('change', () => { api.pageSet && api.pageSet('crossfade', +cfRange.value); });
  const boostVal = el('span', { class: 'ytmd-ap-val' });
  const boostRange = el('input', { type: 'range', min: '100', max: '200', step: '10', class: 'ytmd-ap-range' });
  boostRange.addEventListener('input', () => { boostVal.textContent = '%' + boostRange.value; });
  boostRange.addEventListener('change', () => { api.pageSet && api.pageSet('boost', +boostRange.value); });
  const devSel = el('select', { class: 'ytmd-ap-select' });
  devSel.addEventListener('change', () => { api.pageSet && api.pageSet('outputDevice', devSel.value); });
  const audioPop = el('div', { id: 'ytmd-audio' }, [
    el('div', { class: 'ytmd-ap-h', text: 'Oynatma hızı' }), speedChips,
    el('div', { class: 'ytmd-ap-h' }, [document.createTextNode('Yumuşak geçiş '), cfVal]), cfRange,
    el('div', { class: 'ytmd-ap-hint', text: 'Şarkı biterken ses kısılır, yenisi yavaşça açılır' }),
    el('div', { class: 'ytmd-ap-h' }, [document.createTextNode('Ses yükseltme '), boostVal]), boostRange,
    el('div', { class: 'ytmd-ap-hint', text: 'Sessiz kayıtlar için sesi %200\'e kadar açar' }),
    el('div', { class: 'ytmd-ap-h', text: 'Ses çıkışı' }), devSel
  ]);
  root.appendChild(audioPop);
  function renderAudioPop() {
    speedChips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Math.abs(+b.getAttribute('data-v') - audio.speed) < 0.01));
    boostRange.value = String(Math.round(audio.boost * 100)); boostVal.textContent = '%' + Math.round(audio.boost * 100);
    cfRange.value = String(audio.crossfade); cfVal.textContent = audio.crossfade ? audio.crossfade + ' sn' : 'Kapalı';
    if (devSel.value !== audio.device) devSel.value = audio.device;
  }
  async function fillDevices() {
    const list = await window.__ytmdDevices();
    devSel.replaceChildren(el('option', { value: '', text: 'Sistem varsayılanı' }), ...list.map((d) => el('option', { value: d.id, text: d.label })));
    if (audio.device && !list.some((d) => d.id === audio.device)) devSel.appendChild(el('option', { value: audio.device, text: 'Kayıtlı cihaz (bağlı değil)' }));
    devSel.value = audio.device;
  }
  function toggleAudioPop(open) {
    const on = open === undefined ? !root.classList.contains('ytmd-audio-open') : open;
    root.classList.toggle('ytmd-audio-open', on);
    if (on) { renderAudioPop(); fillDevices(); }
  }
  document.addEventListener('pointerdown', (e) => {
    if (root.classList.contains('ytmd-audio-open') && !audioPop.contains(e.target) && !e.target.closest('#ytmd-audio-btn')) toggleAudioPop(false);
  }, true);

  // ---------------- Sıradakiler paneli ----------------
  let queueOpen = false;
  const qBody = el('div', { class: 'ytmd-q-body' });
  const qPanel = el('div', { id: 'ytmd-queue' }, [
    el('div', { class: 'ytmd-ly-head' }, [
      el('div', {}, [el('div', { class: 'ytmd-ly-label', text: 'Sıradakiler' }), el('div', { class: 'ytmd-ly-track', text: 'Tıkla, o şarkıya geç' })]),
      el('button', { class: 'ytmd-ly-close', title: 'Kapat', onclick: () => setQueue(false) }, [ICON.close()])
    ]),
    qBody
  ]);
  root.appendChild(qPanel);
  const rtxt = (o) => (o && o.runs ? o.runs.map((r) => r.text).join('') : (o && o.simpleText) || '');
  const qRenderer = (it) => it && (it.playlistPanelVideoRenderer ||
    (it.playlistPanelVideoWrapperRenderer && it.playlistPanelVideoWrapperRenderer.primaryRenderer && it.playlistPanelVideoWrapperRenderer.primaryRenderer.playlistPanelVideoRenderer));
  function queueState() {
    try { const q = document.querySelector('ytmusic-player-queue'); return q && q.getState ? q.getState().queue : null; } catch (e) { return null; }
  }
  function qItem(it) {
    const r = qRenderer(it); if (!r) return null;
    const by = (r.shortBylineText && rtxt(r.shortBylineText)) || rtxt(r.longBylineText).split(' • ')[0];
    const th = r.thumbnail && r.thumbnail.thumbnails; const art = th && th.length ? th[0].url : '';
    return { id: r.videoId, title: rtxt(r.title), artist: by, art, len: rtxt(r.lengthText), ep: r.navigationEndpoint };
  }
  function qPlay(index, x, automix) {
    if (!automix) {
      const dom = document.querySelectorAll('ytmusic-player-queue #contents > ytmusic-player-queue-item, ytmusic-player-queue #contents > ytmusic-playlist-panel-video-wrapper-renderer');
      const node = dom[index];
      const btn = node && node.querySelector('ytmusic-play-button-renderer');
      if (btn) { btn.click(); return; }
    }
    if (x.ep) document.querySelector('ytmusic-app').dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint: x.ep } }));
  }
  let qSig = '';
  function qRow(x, onclick, cls) {
    const cover = x.art ? el('img', { class: 'ytmd-q-cover', src: x.art, alt: '', loading: 'lazy' }) : el('div', { class: 'ytmd-q-cover' });
    return el('div', { class: 'ytmd-q-row ' + (cls || ''), title: x.title, onclick }, [
      el('div', { class: 'ytmd-q-art' }, [cover, el('div', { class: 'ytmd-q-hover' }, [ICON.playSm()])]),
      el('div', { class: 'ytmd-q-meta' }, [el('div', { class: 'ytmd-q-title', text: x.title }), el('div', { class: 'ytmd-q-sub', text: x.artist })]),
      el('div', { class: 'ytmd-q-len', text: x.len || '' })
    ]);
  }
  function renderQueue(force) {
    const q = queueState();
    const items = (q && q.items) || [], sel = q ? q.selectedItemIndex || 0 : 0, auto = (q && q.automixItems) || [];
    const sig = sel + '|' + items.length + '|' + auto.length + '|' + (items[sel] && (qRenderer(items[sel]) || {}).videoId) + '|' + (items[items.length - 1] && (qRenderer(items[items.length - 1]) || {}).videoId);
    if (!force && sig === qSig) return;
    qSig = sig;
    const kids = [];
    const cur = items[sel] && qItem(items[sel]);
    if (cur) { kids.push(el('div', { class: 'ytmd-q-h', text: 'Şimdi çalıyor' })); kids.push(qRow(cur, () => {}, 'now')); }
    const next = [];
    for (let i = sel + 1; i < items.length && next.length < 80; i++) { const x = qItem(items[i]); if (x) next.push([i, x]); }
    if (next.length) {
      kids.push(el('div', { class: 'ytmd-q-h', text: 'Sırada' }));
      next.forEach(([i, x]) => kids.push(qRow(x, () => { qPlay(i, x, false); setTimeout(() => renderQueue(true), 800); })));
    }
    const am = auto.map(qItem).filter(Boolean).slice(0, 30);
    if (am.length) {
      kids.push(el('div', { class: 'ytmd-q-h', text: 'Sonra otomatik çalacak' }));
      am.forEach((x) => kids.push(qRow(x, () => { qPlay(-1, x, true); setTimeout(() => renderQueue(true), 800); }, 'auto')));
    }
    if (!kids.length) kids.push(el('div', { class: 'ytmd-ly-msg', text: 'Sırada şarkı yok. Bir şarkı, albüm ya da liste çal.' }));
    qBody.replaceChildren(...kids);
  }
  function setQueue(open) {
    queueOpen = open;
    root.classList.toggle('ytmd-queue-open', open);
    if (open) { if (lyricsOpen) setLyrics(false); if (window.__ytmdParty) window.__ytmdParty(false); renderQueue(true); qBody.scrollTop = 0; }
  }
  setInterval(() => { if (queueOpen && !idle()) renderQueue(false); }, 1500);
  window.__ytmdQueue = (o) => setQueue(o === undefined ? !queueOpen : !!o);

  // ---------------- Şarkı kartı (görsel olarak paylaş) ----------------
  const cardImg = el('img', { class: 'ytmd-card-img', alt: '' });
  const cardMsg = el('div', { class: 'ytmd-card-msg', text: 'Hazırlanıyor…' });
  let cardData = '', cardName = 'sarki';
  const cardBtn = (label, icon, fn, cls) => el('button', { class: 'ytmd-card-btn ' + (cls || ''), onclick: fn }, [icon, el('span', { text: label })]);
  const cardModal = el('div', { id: 'ytmd-card', onclick: (e) => { if (e.target === cardModal) closeCard(); } }, [
    el('div', { class: 'ytmd-card-box' }, [
      el('button', { class: 'ytmd-ly-close ytmd-card-x', title: 'Kapat', onclick: () => closeCard() }, [ICON.close()]),
      el('div', { class: 'ytmd-card-pv' }, [cardImg, cardMsg]),
      el('div', { class: 'ytmd-card-side' }, [
        el('div', { class: 'ytmd-ly-label', text: 'Şarkıyı paylaş' }),
        el('div', { class: 'ytmd-card-h', text: 'Kapaklı kart hazır' }),
        el('div', { class: 'ytmd-card-p', text: 'Görseli kopyalayıp Discord, WhatsApp ya da Instagram\'a yapıştırabilirsin.' }),
        cardBtn('Görseli kopyala', ICON.copy(), async () => { if (cardData && api.copyImage && await api.copyImage(cardData)) toast('Kart panoya kopyalandı'); }, 'primary'),
        cardBtn('Görsel olarak kaydet', ICON.save(), async () => { if (cardData && api.saveImage) { const r = await api.saveImage(cardData, cardName); if (r) toast('Kaydedildi'); } }),
        cardBtn('Bağlantıyı kopyala', ICON.link(), () => share())
      ])
    ])
  ]);
  root.appendChild(cardModal);
  function closeCard() { root.classList.remove('ytmd-card-open'); }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('ytmd-card-open')) { closeCard(); e.stopPropagation(); } }, true);
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  function wrapLines(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/); const out = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = w; }
    }
    if (line) out.push(line);
    if (out.length > maxLines) { out.length = maxLines; let l = out[maxLines - 1]; while (l && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1); out[maxLines - 1] = l + '…'; }
    return out;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  async function renderCard(np) {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const accent = getComputedStyle(root).getPropertyValue('--ytmd-accent').trim() || '#ff4d6d';
    let data = null;
    try { data = api.coverData ? await api.coverData(np.artwork.replace(/=w\d+-h\d+/, '=w900-h900')) : null; } catch (e) {}
    const img = await loadImg(data);
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
    if (img) {
      ctx.save(); ctx.filter = 'blur(70px) saturate(1.7) brightness(.6)';
      ctx.drawImage(img, -200, -200, W + 400, H + 400); ctx.restore();
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, accent); g.addColorStop(1, '#14141c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const sh = ctx.createLinearGradient(0, H * 0.45, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.65)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    const S = 760, X = (W - S) / 2, Y = 130;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
    rrect(ctx, X, Y, S, S, 36); ctx.fillStyle = '#222'; ctx.fill(); ctx.restore();
    if (img) { ctx.save(); rrect(ctx, X, Y, S, S, 36); ctx.clip(); const m = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, X, Y, S, S); ctx.restore(); }
    const font = '"YouTube Sans", "Segoe UI Variable Display", "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
    ctx.font = '800 66px ' + font;
    let y = Y + S + 64;
    for (const l of wrapLines(ctx, np.title, S, 2)) { ctx.fillText(l, X, y); y += 78; }
    ctx.font = '500 40px ' + font; ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText(wrapLines(ctx, np.artist || '', S, 1)[0] || '', X, y + 6);
    // alt şerit
    const by = H - 120;
    ctx.fillStyle = accent; rrect(ctx, X, by, 64, 64, 32); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(X + 25, by + 18); ctx.lineTo(X + 25, by + 46); ctx.lineTo(X + 48, by + 32); ctx.closePath(); ctx.fill();
    ctx.font = '700 32px ' + font; ctx.fillStyle = '#fff'; ctx.fillText('YouTube Music\'te dinle', X + 86, by + 2);
    ctx.font = '400 26px ' + font; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('music.youtube.com/watch?v=' + (np.videoId || ''), X + 86, by + 40);
    return c.toDataURL('image/png');
  }
  async function openCard() {
    const np = current || readNowPlaying();
    if (!np || !np.title) return toast('Önce bir şarkı çal');
    toggleAudioPop(false);
    cardData = ''; cardImg.removeAttribute('src'); cardMsg.style.display = '';
    cardName = (np.artist ? np.artist + ' - ' : '') + np.title;
    root.classList.add('ytmd-card-open');
    try { await document.fonts.ready; } catch (e) {}
    try { cardData = await renderCard(np); cardImg.src = cardData; cardMsg.style.display = 'none'; }
    catch (e) { cardMsg.textContent = 'Kart hazırlanamadı'; }
  }
  window.__ytmdCard = openCard;

  // ---------------- Ana sayfa: "Sana özel" bölümü ----------------
  const HOME = (() => {
    let box = null, built = '', on = true;
    const greet = () => { const h = new Date().getHours(); return h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar'; };
    const nav = (ep) => document.querySelector('ytmusic-app').dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint: ep } }));
    let libRaw = null, libParsed = {}, recentAt = 0, recentList = [], builtAt = 0;
    function libItems() {
      let raw = null; try { raw = localStorage.getItem('ytmd-lib'); } catch (e) {}
      if (raw !== libRaw) { libRaw = raw; try { libParsed = JSON.parse(raw || '{}') || {}; } catch (e) { libParsed = {}; } }
      const d = libParsed;
      const pl = ((d.playlists && d.playlists.items) || []), al = ((d.albums && d.albums.items) || []);
      const liked = pl.find((x) => x.id === 'VLLM');
      const rest = []; const a = pl.filter((x) => x.id !== 'VLLM'), b = al.slice();
      while ((a.length || b.length) && rest.length < 7) { if (a.length) rest.push(a.shift()); if (b.length && rest.length < 7) rest.push(b.shift()); }
      return [liked || { id: 'VLLM', title: 'Beğendiğim müzikler', thumb: '', ep: { browseEndpoint: { browseId: 'VLLM' } } }, ...rest].slice(0, 8);
    }
    async function build() {
      if (!recentAt || Date.now() - recentAt > 60000) { recentAt = Date.now(); recentList = api.recent ? (await api.recent().catch(() => [])) || [] : []; }
      const recent = recentList;
      const tiles = libItems();
      const key = tiles.map((t) => t.id).join(',') + '|' + recent.map((r) => r.id).join(',') + '|' + greet();
      if (box && key === built) return box;
      built = key;
      const tileEls = tiles.map((t) => el('div', { class: 'ytmd-h-tile', title: t.title, onclick: () => nav(t.ep) }, [
        t.thumb ? el('img', { src: t.thumb.replace(/=w\d+-h\d+/, '=w120-h120'), alt: '', loading: 'lazy' })
                : el('div', { class: 'ytmd-h-ph', text: t.id === 'VLLM' ? '♥' : (t.title[0] || '♪') }),
        el('span', { text: t.title }),
        el('div', { class: 'ytmd-h-play' }, [ICON.playSm()])
      ]));
      const kids = [el('div', { class: 'ytmd-h-greet', text: greet() }), el('div', { class: 'ytmd-h-grid' }, tileEls)];
      if (recent.length) {
        kids.push(el('div', { class: 'ytmd-h-title', text: 'Son çaldıkların' }));
        kids.push(el('div', { class: 'ytmd-h-row' }, recent.map((r) => el('div', { class: 'ytmd-h-card', title: r.title, onclick: () => nav({ watchEndpoint: { videoId: r.id } }) }, [
          el('div', { class: 'ytmd-h-cov' }, [
            r.art ? el('img', { src: r.art.replace(/=w\d+-h\d+/, '=w320-h320'), alt: '', loading: 'lazy' }) : el('div', { class: 'ytmd-h-ph big', text: '♪' }),
            el('div', { class: 'ytmd-h-play' }, [ICON.playSm()])
          ]),
          el('b', { text: r.title }), el('span', { text: r.artist })
        ]))));
      }
      const nb = el('div', { id: 'ytmd-home' }, kids);
      if (box && box.parentElement) box.replaceWith(nb);
      box = nb;
      return box;
    }
    let busy = false;
    async function tick() {
      const isHome = location.pathname === '/' || location.pathname === '/home' || (location.pathname === '/browse' && /FEmusic_home/.test(location.search));
      root.classList.toggle('ytmd-home-page', isHome && on);
      if (!isHome || !on || busy || idle()) return;
      const sl = document.querySelector('ytmusic-browse-response ytmusic-section-list-renderer');
      const contents = sl && sl.querySelector(':scope > #contents');
      if (!contents) return;
      // Zaten yerindeyse ve yeniyse hiçbir şey yapma
      if (box && box.parentElement === sl && box.nextElementSibling === contents && Date.now() - builtAt < 60000) return;
      busy = true; builtAt = Date.now();
      try { const b = await build(); if (b.nextElementSibling !== contents || b.parentElement !== sl) sl.insertBefore(b, contents); } catch (e) {}
      busy = false;
    }
    return { tick, set: (v) => { on = v; if (!on && box) box.remove(); built = on ? built : ''; builtAt = 0; tick(); }, refresh: () => { built = ''; builtAt = 0; recentAt = 0; tick(); } };
  })();
  if (THEME) {
    setInterval(() => HOME.tick(), 2000); bootFns.push(() => HOME.tick());
    window.addEventListener('yt-navigate-finish', () => setTimeout(() => HOME.tick(), 200));
    trackListeners.push(() => setTimeout(() => HOME.refresh(), 40000));
  }

  // ---------------- Ses yüzdesi (sağ alttaki ses kaydırıcısının yanında) ----------------
  const volEl = el('span', { id: 'ytmd-vol', title: 'Ses seviyesi' });
  let volLast = '', volBar = null, volFindAt = 0;
  function tickVolume() {
    // Sayfada birden çok oynatıcı çubuğu olabiliyor: görünür olanı seç (ara sıra, pahalı olduğu için)
    if (!volBar || !volBar.isConnected || Date.now() - volFindAt > 5000) {
      volFindAt = Date.now();
      volBar = [...document.querySelectorAll('ytmusic-player-bar #right-controls .right-controls-buttons')].find((b) => b.offsetWidth > 0) || null;
    }
    const bar = volBar;
    if (!bar) return;
    if (volEl.parentElement !== bar) bar.insertBefore(volEl, bar.firstChild);
    let v = 0, muted = false;
    try { const p = player(); v = Math.round(p.getVolume()); muted = p.isMuted(); } catch (e) { const vd = video(); if (vd) { v = Math.round(vd.volume * 100); muted = vd.muted; } }
    const boost = Math.round(audio.boost * 100);
    const key = v + '|' + muted + '|' + boost;
    if (key === volLast) return;
    volLast = key;
    volEl.classList.toggle('muted', muted || v === 0);
    volEl.replaceChildren(document.createTextNode(muted ? 'Sessiz' : '%' + v));
    if (!muted && boost > 100) volEl.appendChild(el('small', { text: ' ×' + (boost / 100).toString().replace('.', ',') }));
    volEl.title = muted ? 'Ses kapalı' : 'Ses seviyesi: %' + v + (boost > 100 ? ' (yükseltme %' + boost + ')' : '');
  }
  setInterval(() => { if (!idle()) tickVolume(); }, 1000);
  document.addEventListener('volumechange', () => tickVolume(), true);

  // ---------------- Az bellek modu (pencere gizliyken) ----------------
  // Görünmeyen videoyu en düşük kaliteye alır (ses kalitesi değişmez) ve kullanılmayan belleği boşaltır.
  let lowPower = false, gcTimer = 0;
  const freeMem = () => { try { typeof window.gc === 'function' && window.gc(); } catch (e) {} };
  window.__ytmdLowPower = (on) => {
    if (!on && GAME) return;   // oyun modunda pencere açılsa da düşük güçte kal
    if (on === lowPower) return;
    lowPower = on;
    const p = player();
    try { p && p.setPlaybackQualityRange && (on ? p.setPlaybackQualityRange('tiny', 'tiny') : p.setPlaybackQualityRange('auto', 'auto')); } catch (e) {}
    clearInterval(gcTimer);
    if (on) { setTimeout(freeMem, 15000); gcTimer = setInterval(freeMem, 180000); }
  };
  // Yeni şarkıda YouTube kaliteyi sıfırlayabilir: gizliyken tekrar düşür
  trackListeners.push(() => { if (lowPower) { lowPower = false; window.__ytmdLowPower(true); } });

  // ---------------- Sol menü genişliği (sürükleyerek) ----------------
  if (THEME) {
    const GMIN = 240, GMAX = 420;
    let gmin = GMIN;   // imza ölçülünce büyür: iki satırlık imza kitaplığa sığsın
    let gw = GMIN; try { gw = Math.max(GMIN, Math.min(GMAX, parseInt(localStorage.getItem('ytmd-guide-w'), 10) || GMIN)); } catch (e) {}
    const handle = el('div', { id: 'ytmd-guide-handle', title: 'Sürükleyerek kitaplığı genişlet (çift tık: sıfırla)' });
    root.appendChild(handle);
    root.style.setProperty('--ytmd-guide-w', gw + 'px');
    // YouTube'un kendi genişliğine bak: menü açıksa (240) bizim genişliğimizi uygula, kapalıysa (72) dokunma
    function applyGuide() {
      const lay = document.querySelector('ytmusic-app-layout');
      if (!lay) return;
      root.classList.remove('ytmd-guide-wide');
      const natural = parseInt(getComputedStyle(lay).getPropertyValue('--ytmusic-guide-width'), 10) || 0;
      root.classList.toggle('ytmd-guide-wide', natural >= GMIN);
      // Kapanırken imza beklemeden gitsin; açılırken menü yerleşince gelsin
      if (natural >= GMIN) setTimeout(() => window.__ytmdCredit && window.__ytmdCredit(), 350);
      else window.__ytmdCredit && window.__ytmdCredit();
    }
    let watched = null;
    function watch() {
      const app = document.querySelector('ytmusic-app');
      if (!app || app === watched) return;
      watched = app;
      new MutationObserver(applyGuide).observe(app, { attributes: true, attributeFilter: ['guide-collapsed'] });
      applyGuide();
    }
    watch(); bootFns.push(watch); setInterval(watch, 5000);
    window.addEventListener('resize', () => { clearTimeout(watch.t); watch.t = setTimeout(applyGuide, 250); });
    let drag = null;
    handle.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, w: gw }; handle.setPointerCapture(e.pointerId); root.classList.add('ytmd-guide-drag'); e.preventDefault(); });
    handle.addEventListener('pointermove', (e) => {
      if (!drag) return;
      gw = Math.max(gmin, Math.min(GMAX, Math.round(drag.w + e.clientX - drag.x)));
      root.style.setProperty('--ytmd-guide-w', gw + 'px');
      window.__ytmdCredit && window.__ytmdCredit();
    });
    const end = () => { if (!drag) return; drag = null; root.classList.remove('ytmd-guide-drag'); try { localStorage.setItem('ytmd-guide-w', String(gw)); } catch (e) {} mountCreditSoon(); };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end); handle.addEventListener('lostpointercapture', end);
    handle.addEventListener('dblclick', () => { gw = gmin; root.style.setProperty('--ytmd-guide-w', gw + 'px'); try { localStorage.setItem('ytmd-guide-w', String(gw)); } catch (e) {} mountCreditSoon(); });
    window.__ytmdGuideMin = (m) => {
      const n = Math.max(GMIN, Math.min(GMAX, Math.ceil(m)));
      if (n === gmin) return;
      gmin = n;
      if (gw < gmin) { gw = gmin; root.style.setProperty('--ytmd-guide-w', gw + 'px'); }
    };
    function mountCreditSoon() { setTimeout(() => window.__ytmdCredit && window.__ytmdCredit(), 200); }
  }

  // ---------------- İmza: "Made by @servetsayarexe" ----------------
  const CREDIT_URL = 'https://www.instagram.com/servetsayarexe';
  const creditBy = el('span', { class: 'ytmd-cr-by', text: 'Made by' });
  const credit = el('div', { id: 'ytmd-credit' }, [
    creditBy,
    el('a', { href: CREDIT_URL, target: '_blank', rel: 'noopener', title: 'Instagram: @servetsayarexe', onclick: (e) => { e.preventDefault(); e.stopPropagation(); window.open(CREDIT_URL, '_blank'); } }, [document.createTextNode('@servetsayarexe')])
  ]);
  const creditW = { inline: 0, stack: 0 };
  function mountCredit() {
    const nav = document.querySelector('ytmusic-nav-bar');
    if (!nav) return;
    if (credit.parentElement !== nav) nav.appendChild(credit);
    // Yer varsa tek satır, azsa iki satır ("Made by" üstte, bağlantı altta), hiç yoksa gizle
    if (!creditW.inline) {
      const link = credit.querySelector('a');
      const byW = creditBy.offsetWidth, aW = link ? link.offsetWidth : 0;
      if (!byW || !aW) return;
      creditW.inline = byW + 4 + aW; creditW.stack = Math.max(byW, aW);
      credit.style.setProperty('--cr-bw', byW + 'px');
      credit.style.width = creditW.inline + 'px';
      // Kitaplığın en dar hali, iki satırlık imzayı (soldan 150 px + genişliği + pay) tamamen kapsasın
      window.__ytmdGuideMin && window.__ytmdGuideMin(150 + creditW.stack + 12);
    }
    // Tema açıkken kitaplık kapalıysa imzaya yer yok: hemen gizle (arama kutusunun kaymasını bekleme)
    if (THEME && !root.classList.contains('ytmd-guide-wide')) { credit.classList.add('ytmd-hide'); return; }
    const sb = nav.querySelector('ytmusic-search-box');
    const room = sb ? sb.getBoundingClientRect().left - 150 - 14 : 9999;
    // Kitaplık dar haldeyken (300 pikselin altı) her zaman iki satır
    const narrowGuide = root.classList.contains('ytmd-guide-wide') && (parseInt(root.style.getPropertyValue('--ytmd-guide-w'), 10) || 240) < Math.max(300, 150 + creditW.inline + 12);
    const mode = room < creditW.stack ? 'hide' : (narrowGuide || room < creditW.inline) ? 'stack' : 'inline';
    credit.classList.toggle('ytmd-stack', mode === 'stack');
    credit.classList.toggle('ytmd-hide', mode === 'hide');
  }
  window.__ytmdCredit = mountCredit;
  mountCredit(); bootFns.push(mountCredit); setInterval(() => { if (!idle()) mountCredit(); }, 2000);
  window.addEventListener('resize', () => setTimeout(mountCredit, 300));

  // ---------------- Güncelleme kartı ----------------
  const updTitle = el('div', { class: 'ytmd-upd-title' });
  const updNotes = el('div', { class: 'ytmd-upd-notes' });
  const updNow = el('button', { class: 'ytmd-upd-btn primary', text: 'Şimdi güncelle', onclick: () => {
    updCard.classList.add('busy'); updNow.textContent = 'Kuruluyor…'; updLater.style.display = 'none';
    updNotes.textContent = 'Uygulama birkaç saniye içinde kendiliğinden yeniden açılacak.';
    try { api.installUpdate && api.installUpdate(); } catch (e) {}
  } });
  const updLater = el('button', { class: 'ytmd-upd-btn', text: 'Sonra', onclick: () => {
    updCard.classList.remove('show'); toast('Uygulamayı kapattığında güncelleme kendiliğinden kurulacak');
  } });
  const updCard = el('div', { id: 'ytmd-update' }, [
    el('div', { class: 'ytmd-upd-icon' }, [svgIcon('0 0 24 24', ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'], { size: 20, width: 2 })]),
    el('div', { class: 'ytmd-upd-body' }, [updTitle, updNotes, el('div', { class: 'ytmd-upd-actions' }, [updNow, updLater])])
  ]);
  root.appendChild(updCard);
  window.__ytmdUpdate = (u = {}) => {
    updTitle.textContent = 'Yeni sürüm hazır' + (u.version ? ': ' + u.version : '');
    updNotes.textContent = u.notes || 'Yeni özellikler ve düzeltmeler içeriyor.';
    updCard.classList.add('show');
  };

  // ================= 2.0: Oyun modu · Telefondan kumanda · Akıllı sıra · Birlikte dinle =================
  const PT = { code: '', host: false, id: '', status: '', members: new Map(), queue: [], pending: null, pendT: 0, lastSend: 0, beat: 0, ping: 0, open: false, results: [], searching: false, err: '' };
  const visBar = () => [...document.querySelectorAll('ytmusic-player-bar')].find((b) => b.offsetWidth > 0) || document.querySelector('ytmusic-player-bar');
  const ytApp = () => document.querySelector('ytmusic-app');
  const navTo = (endpoint) => { const a = ytApp(); if (a) a.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } })); };
  const playId = (id, ep) => navTo(ep && ep.watchEndpoint ? ep : { watchEndpoint: { videoId: id } });
  const curId = () => { try { return player().getVideoData().video_id || ''; } catch (e) { return (current && current.videoId) || ''; } };
  const ytFetch = (p, body) => { const a = ytApp(); if (!a || !a.networkManager) return Promise.reject(new Error('nm')); return a.networkManager.fetch(p, body); };
  const findAll = (o, key, out = [], d = 0) => {
    if (!o || typeof o !== 'object' || d > 30 || out.length > 80) return out;
    if (Array.isArray(o)) { for (const x of o) findAll(x, key, out, d + 1); return out; }
    for (const k in o) { if (k === key) out.push(o[k]); else findAll(o[k], key, out, d + 1); }
    return out;
  };

  // ---------- Oyun modu ----------
  window.__ytmdGame = (on) => {
    on = !!on; if (on === GAME) return; GAME = on;
    root.classList.toggle('ytmd-game', on);
    if (on) window.__ytmdLowPower(true); else if (!document.hidden) window.__ytmdLowPower(false);
    toast(on ? 'Oyun modu açık: animasyonlar durdu, kaynak kullanımı en aza indi' : 'Oyun modu kapandı');
  };

  // ---------- Telefondan kumanda (ana işlem sorar) ----------
  const likeR = () => { const b = visBar(); return b && b.querySelector('ytmusic-like-button-renderer'); };
  function clickLike(dis) {
    const r = likeR(); if (!r) return;
    const b = r.querySelector(dis ? '#button-shape-dislike button' : '#button-shape-like button') || r.querySelectorAll('button')[dis ? 0 : 1];
    b && b.click();
  }
  function setVol(v) {
    v = Math.max(0, Math.min(100, Math.round(v)));
    const b = visBar(), s = b && b.querySelector('#volume-slider');
    if (s) { s.value = v; ['immediate-value-change', 'change'].forEach((t) => s.dispatchEvent(new CustomEvent(t, { bubbles: true, composed: true }))); }
    else { try { player().setVolume(v); } catch (e) {} }
  }
  function remoteQueue() {
    const q = queueState(); if (!q) return [];
    const items = q.items || [], sel = q.selectedItemIndex || 0, out = [];
    for (let i = sel + 1; i < items.length && out.length < 20; i++) { const x = qItem(items[i]); if (x) out.push({ i, title: x.title, artist: x.artist, art: x.art, len: x.len }); }
    (q.automixItems || []).forEach((it, k) => { if (out.length >= 20) return; const x = qItem(it); if (x) out.push({ i: 1000 + k, title: x.title, artist: x.artist, art: x.art, len: x.len, auto: true }); });
    return out;
  }
  window.__ytmdRemote = (cmd, v) => {
    if (cmd === 'state') {
      const b = visBar(), s = b && b.querySelector('#volume-slider'); let muted = false; try { muted = player().isMuted(); } catch (e) {}
      const r = likeR();
      return { vol: s ? Math.round(+s.value) : null, muted, like: r ? r.getAttribute('like-status') || 'INDIFFERENT' : '', queue: remoteQueue(), smart: SQ.mode, partyRoom: PT.code ? { code: PT.code, host: PT.host, n: PT.members.size + 1 } : null };
    }
    if (cmd === 'vol') return setVol(v);
    if (cmd === 'mute') { const btn = visBar() && visBar().querySelector('#right-controls .volume'); if (btn) btn.click(); else { try { const p = player(); p.isMuted() ? p.unMute() : p.mute(); } catch (e) {} } return; }
    if (cmd === 'like' || cmd === 'dislike') return clickLike(cmd === 'dislike');
    if (cmd === 'shuffle' || cmd === 'repeat') { const btn = visBar() && visBar().querySelector('.' + cmd); btn && btn.click(); return; }
    if (cmd === 'play') {
      const q = queueState(); if (!q) return;
      if (v >= 1000) { const x = qItem((q.automixItems || [])[v - 1000]); if (x) qPlay(-1, x, true); }
      else { const x = qItem((q.items || [])[v]); if (x) qPlay(v, x, false); }
    }
  };

  // ---------- Akıllı sıra ----------
  const SQ = { mode: 'off', pick: null, cur: null, plan: 0, played: [], firedFor: '' };
  try { SQ.mode = localStorage.getItem('ytmd-smart') || 'off'; } catch (e) {}
  if (!['off', 'calm', 'same', 'up'].includes(SQ.mode)) SQ.mode = 'off';
  const SQ_MODES = [['off', 'Kapalı'], ['calm', 'Sakinleş'], ['same', 'Aynı hava'], ['up', 'Hızlan']];
  const SQ_DELTA = { calm: -0.14, same: 0, up: 0.14 };
  const sqInfo = el('div', { class: 'ytmd-sq-info' });
  const sqChips = el('div', { class: 'ytmd-sq-chips' }, SQ_MODES.map(([k, t]) => el('button', { class: 'ytmd-sq-chip', 'data-k': k, text: t, onclick: () => sqSet(k) })));
  const sqBox = el('div', { class: 'ytmd-sq' }, [
    el('div', { class: 'ytmd-sq-h' }, [el('b', { text: 'Akıllı sıra' }), el('span', { text: 'Çalanın enerjisine (BPM, ses gücü) göre sıradakini seçer' })]),
    sqChips, sqInfo
  ]);
  qPanel.insertBefore(sqBox, qBody);
  const pct = (e) => (e >= 0 ? '%' + Math.round(e * 100) : '?');
  function sqRender() {
    sqChips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-k') === SQ.mode));
    const kids = [];
    if (PT.code && !PT.host) kids.push(el('span', { text: 'Birlikte dinlerken sırayı oda sahibi belirler' }));
    else if (SQ.mode !== 'off') {
      if (SQ.cur) kids.push(el('span', { text: 'Şu an enerji ' + pct(SQ.cur.e) + (SQ.cur.bpm ? ' · ' + SQ.cur.bpm + ' BPM' : '') }));
      if (SQ.pick) kids.push(el('div', { class: 'ytmd-sq-pick', title: 'Tıkla, hemen çal', onclick: () => sqPlay() }, [
        el('small', { text: 'Sıradaki seçim' }), el('b', { text: SQ.pick.x.title }), el('span', { text: SQ.pick.x.artist + ' · enerji ' + pct(SQ.pick.e) })
      ]));
      else kids.push(el('span', { text: SQ.plan ? 'Uygun şarkı aranıyor…' : 'Bir şarkı çalınca sıradaki seçilecek' }));
    }
    sqInfo.replaceChildren(...kids);
  }
  function sqSet(k) {
    SQ.mode = k; SQ.pick = null; try { localStorage.setItem('ytmd-smart', k); } catch (e) {}
    sqRender();
    if (k !== 'off') { sqPlan(); toast('Akıllı sıra: ' + SQ_MODES.find((m) => m[0] === k)[1]); }
  }
  async function sqCandidates(id) {
    const out = [], seen = new Set([id]);
    const add = (x, i, auto) => { if (x && x.id && !seen.has(x.id)) { seen.add(x.id); out.push({ ...x, i, auto }); } };
    const q = queueState();
    if (q) {
      const items = q.items || [], sel = q.selectedItemIndex || 0;
      for (let i = sel + 1; i < items.length && out.length < 18; i++) add(qItem(items[i]), i, false);
      (q.automixItems || []).forEach((it, k) => add(qItem(it), k, true));
    }
    if (out.length < 10) {
      try {
        const r = await ytFetch('/next', { videoId: id, playlistId: 'RDAMVM' + id, isAudioOnly: true });
        findAll(r, 'playlistPanelVideoRenderer').forEach((pv) => add(qItem({ playlistPanelVideoRenderer: pv }), -1, 'radio'));
      } catch (e) {}
    }
    return out.slice(0, 25);
  }
  async function sqPlan() {
    if (SQ.mode === 'off' || (PT.code && !PT.host) || !api.energy) { sqRender(); return; }
    const np = current; if (!np || !np.videoId) return;
    const token = ++SQ.plan; sqRender();
    const cands = await sqCandidates(np.videoId);
    if (token !== SQ.plan || np.videoId !== curId()) return;
    let en = {};
    try { en = (await api.energy([{ id: np.videoId, title: np.title, artist: np.artist }, ...cands.map((c) => ({ id: c.id, title: c.title, artist: c.artist }))])) || {}; } catch (e) {}
    if (token !== SQ.plan) return;
    const cur = en[np.videoId] || { e: -1, bpm: 0 };
    SQ.cur = cur;
    const target = Math.max(0, Math.min(1, (cur.e >= 0 ? cur.e : 0.5) + SQ_DELTA[SQ.mode]));
    const recentArtists = SQ.played.slice(-3).map((p) => p.a);
    const mainArtist = (s) => String(s || '').split(/,|&| ve | x /)[0].trim().toLowerCase();
    let best = null;
    for (const c of cands) {
      const e = en[c.id] ? en[c.id].e : -1;
      let s = e >= 0 ? -Math.abs(e - target) : -0.32;
      if (SQ.played.some((p) => p.id === c.id)) s -= 1;
      if (recentArtists.includes(mainArtist(c.artist))) s -= 0.08;
      if (c.auto === false) s += 0.03;
      if (!best || s > best.s) best = { x: c, e, s };
    }
    SQ.pick = best; SQ.plan = 0; sqRender();
  }
  function sqPlay() {
    const p = SQ.pick; if (!p) return false;
    SQ.pick = null; sqRender();
    const x = p.x;
    if (x.auto === false && x.i >= 0) { const q = queueState(); const it = q && qItem((q.items || [])[x.i]); if (it && it.id === x.id) { qPlay(x.i, x, false); return true; } }
    playId(x.id, x.ep); return true;
  }
  trackListeners.push((np) => {
    SQ.played.push({ id: np.videoId, a: String(np.artist || '').split(/,|&| ve | x /)[0].trim().toLowerCase() });
    if (SQ.played.length > 40) SQ.played.shift();
    SQ.pick = null; SQ.cur = null;
    if (SQ.mode !== 'off') setTimeout(sqPlan, 1500);
  });
  sqRender();

  // ---------- Sonraki şarkı: ortak sıra > akıllı seçim > YouTube ----------
  function nextOverride() {
    if (PT.code && !PT.host) { api.party && api.party('send', { t: 'skip' }); toast('Oda sahibine "sonraki" isteği gönderildi'); return true; }
    if (PT.code && PT.host && PT.queue.length) { const it = PT.queue.shift(); playId(it.v); ptHostSend(); ptRender(); return true; }
    if (SQ.mode !== 'off' && SQ.pick) return sqPlay();
    return false;
  }
  const ytNext = ctl.next;
  ctl.next = () => { if (!nextOverride()) ytNext(); };
  document.addEventListener('click', (e) => {
    if (!e.isTrusted) return;
    const nb = e.target.closest && e.target.closest('ytmusic-player-bar .next-button');
    if (nb && nextOverride()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('timeupdate', (e) => {
    const v = e.target; if (!(v instanceof HTMLVideoElement) || v.paused || !isFinite(v.duration) || v.duration < 20) return;
    const rem = (v.duration - v.currentTime) / (v.playbackRate || 1);
    if (rem > 0.9) return;
    const id = curId(); if (SQ.firedFor === id) return;
    if (PT.code && !PT.host) { SQ.firedFor = id; ctl.pause(); return; }   // misafir: oda sahibinin sıradaki şarkısını bekle
    if ((PT.code && PT.host && PT.queue.length) || (SQ.mode !== 'off' && SQ.pick)) { SQ.firedFor = id; nextOverride(); }
  }, true);

  // ---------- Birlikte dinle ----------
  const ptStatusTxt = { connecting: 'Bağlanıyor…', online: 'Bağlı', reconnecting: 'Bağlantı koptu, tekrar deneniyor…', limited: 'Aktarım sunucusunun günlük sınırı doldu' };
  const ptBody = el('div', { class: 'ytmd-pt-body' });
  const ptPanel = el('div', { id: 'ytmd-party' }, [
    el('div', { class: 'ytmd-ly-head' }, [
      el('div', {}, [el('div', { class: 'ytmd-ly-label', text: 'Birlikte dinle' }), el('div', { class: 'ytmd-ly-track', text: 'Arkadaşlarınla aynı anda aynı şarkı' })]),
      el('button', { class: 'ytmd-ly-close', title: 'Kapat', onclick: () => setParty(false) }, [ICON.close()])
    ]),
    ptBody
  ]);
  root.appendChild(ptPanel);
  function setParty(open) {
    PT.open = open; root.classList.toggle('ytmd-party-open', open);
    if (open) { if (lyricsOpen) setLyrics(false); if (queueOpen) setQueue(false); ptRender(); }
  }
  window.__ytmdParty = (o) => setParty(o === undefined ? !PT.open : !!o);
  const ptMemberSeen = (m) => { if (m.from) PT.members.set(m.from, { name: String(m.name || 'Dinleyici').slice(0, 24), seen: Date.now(), host: m.t === 'state' || (PT.members.get(m.from) || {}).host }); };
  const ptItem = (x, by) => ({ v: x.id || x.v, title: String(x.title || '').slice(0, 120), artist: String(x.artist || '').slice(0, 80), art: /^https:\/\//.test(x.art || '') ? String(x.art).slice(0, 300) : '', by: String(by || '').slice(0, 24) });
  function ptHostSend() {
    if (!PT.code || !PT.host || !api.party) return;
    const v = video(), np = current;
    if (!np || !np.videoId) return;
    PT.lastSend = Date.now();
    api.party('send', { t: 'state', v: np.videoId, title: np.title, artist: np.artist, art: (np.artwork || '').replace(/=w\d+-h\d+/, '=w120-h120'), pos: v ? Math.round(v.currentTime * 10) / 10 : 0, paused: v ? v.paused : true, q: PT.queue.slice(0, 15) });
  }
  let ptDeb = 0;
  const ptHostSoon = () => { if (PT.code && PT.host) { clearTimeout(ptDeb); ptDeb = setTimeout(ptHostSend, 500); } };
  ['play', 'pause', 'seeked'].forEach((ev) => document.addEventListener(ev, (e) => { if (e.target instanceof HTMLVideoElement) ptHostSoon(); }, true));
  trackListeners.push(() => { if (PT.code && PT.host) setTimeout(ptHostSend, 1200); });
  function ptSync(pos, paused, at) {
    const v = video(); if (!v || !isFinite(v.duration) || v.duration <= 0) return false;
    const target = pos + (paused ? 0 : (Date.now() - at) / 1000 + 0.25);
    if (Math.abs(v.currentTime - target) > 1.8 && target < v.duration - 1) v.currentTime = Math.max(0, target);
    if (paused && !v.paused) ctl.pause();
    if (!paused && v.paused) { try { player().playVideo(); } catch (e) { v.play().catch(() => {}); } }
    return true;
  }
  function ptGuestState(m) {
    PT.queue = Array.isArray(m.q) ? m.q.slice(0, 15).map((x) => ptItem(x, x.by)) : [];
    if (!/^[\w-]{6,20}$/.test(m.v || '')) return;
    const at = Date.now();
    PT.pending = { v: m.v, pos: +m.pos || 0, paused: !!m.paused, at };
    SQ.firedFor = '';
    if (curId() !== m.v) playId(m.v);
    clearInterval(PT.pendT);
    let tries = 0;
    PT.pendT = setInterval(() => {
      const p = PT.pending; if (!p || ++tries > 30) { clearInterval(PT.pendT); return; }
      if (curId() === p.v && ptSync(p.pos, p.paused, p.at)) { PT.pending = null; clearInterval(PT.pendT); }
    }, 500);
  }
  window.__ytmdPartyMsg = (m) => {
    if (!m || typeof m !== 'object' || !PT.code) return;
    if (m.t === 'bye') {
      const was = PT.members.get(m.from); PT.members.delete(m.from);
      if (was) toast(was.name + ' odadan ayrıldı' + (was.host ? ' (oda sahibi)' : ''));
      ptRender(); return;
    }
    const isNew = !PT.members.has(m.from);
    ptMemberSeen(m);
    if (PT.host) {
      if (m.t === 'hello') { if (isNew) toast((m.name || 'Biri') + ' odaya katıldı'); ptHostSend(); }
      else if (m.t === 'add' && m.item && /^[\w-]{6,20}$/.test(m.item.v || '')) {
        if (!PT.queue.some((x) => x.v === m.item.v) && PT.queue.length < 30) { PT.queue.push(ptItem(m.item, m.name)); toast((m.name || 'Biri') + ' sıraya ekledi: ' + String(m.item.title || '').slice(0, 40)); ptHostSend(); }
      } else if (m.t === 'skip') { toast((m.name || 'Biri') + ' sonraki şarkıya geçti'); ctl.next(); }
    } else if (m.t === 'state') ptGuestState(m);
    else if (m.t === 'hello' && isNew) toast((m.name || 'Biri') + ' odaya katıldı');
    ptRender();
  };
  window.__ytmdPartyStatus = (s) => {
    if (!s) { PT.code = ''; PT.host = false; PT.members.clear(); PT.queue = []; PT.pending = null; clearInterval(PT.beat); clearInterval(PT.ping); ptRender(); sqRender(); return; }
    const fresh = PT.code !== s.code;
    PT.code = s.code; PT.host = !!s.host; PT.id = s.id; PT.status = s.status;
    if (fresh) {
      PT.members.clear(); PT.queue = []; clearInterval(PT.beat); clearInterval(PT.ping);
      // Az mesaj: oda sahibi sadece olaylarda + 2,5 dakikada bir; misafir 4 dakikada bir "buradayım" der
      if (PT.host) PT.beat = setInterval(() => { if (PT.members.size && Date.now() - PT.lastSend > 150000) ptHostSend(); }, 30000);
      else PT.ping = setInterval(() => api.party && api.party('send', { t: 'ping' }), 240000);
    }
    ptRender(); sqRender();
  };
  setInterval(() => { if (!PT.code) return; let ch = false; for (const [k, m] of PT.members) if (Date.now() - m.seen > 6 * 60000) { PT.members.delete(k); ch = true; } if (ch) ptRender(); }, 60000);
  async function ptSearch(q) {
    q = String(q || '').trim(); if (!q) return;
    PT.searching = true; ptRender();
    try {
      const r = await ytFetch('/search', { query: q, params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D' });
      PT.results = findAll(r, 'musicResponsiveListItemRenderer').map((x) => {
        const id = (x.playlistItemData && x.playlistItemData.videoId) || '';
        const col = (i) => rtxt(x.flexColumns && x.flexColumns[i] && x.flexColumns[i].musicResponsiveListItemFlexColumnRenderer.text);
        const parts = col(1).split(' • '); const artist = /^(şarkı|song)$/i.test(parts[0]) ? parts[1] || '' : parts[0];
        const th = x.thumbnail && x.thumbnail.musicThumbnailRenderer && x.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails;
        return id ? { id, title: col(0), artist, art: th && th.length ? th[0].url : '' } : null;
      }).filter(Boolean).slice(0, 12);
    } catch (e) { PT.results = []; toast('Arama yapılamadı'); }
    PT.searching = false; ptRender();
  }
  function ptAdd(x) {
    const item = ptItem(x, 'Sen');
    if (PT.host) { if (PT.queue.some((y) => y.v === item.v)) return toast('Zaten sırada'); PT.queue.push(item); ptHostSend(); }
    else api.party && api.party('send', { t: 'add', item });
    toast('Ortak sıraya eklendi: ' + item.title.slice(0, 40)); ptRender();
  }
  async function ptJoin(code, host) {
    if (!api.party) return;
    PT.err = '';
    const r = await api.party('join', host ? null : code, !!host);
    if (!r || !r.ok) { PT.err = (r && r.error) || 'Odaya girilemedi'; ptRender(); return; }
    window.__ytmdPartyStatus({ code: r.code, host: r.host, id: r.id, status: 'connecting' });
    toast(host ? 'Oda kuruldu: ' + r.code : 'Odaya katılınıyor: ' + r.code);
  }
  let ptSearchVal = '';
  function ptRender() {
    if (!PT.open) return;
    const kids = [];
    if (!PT.code) {
      const name = el('input', { class: 'ytmd-pt-in', placeholder: 'Adın (arkadaşların görür)', maxlength: '24' });
      api.party && api.party('info').then((i) => { if (i && i.name && !name.value) name.value = i.name; });
      name.addEventListener('change', () => api.party && api.party('name', name.value));
      const code = el('input', { class: 'ytmd-pt-in code', placeholder: 'ABCD-EF23', maxlength: '9' });
      code.addEventListener('keydown', (e) => { if (e.key === 'Enter') ptJoin(code.value, false); });
      kids.push(
        el('div', { class: 'ytmd-pt-h', text: 'Adın' }), name,
        el('button', { class: 'ytmd-pt-btn primary', text: 'Oda oluştur', onclick: () => ptJoin(null, true) }),
        el('div', { class: 'ytmd-pt-h', text: 'Ya da arkadaşının kodunu gir' }),
        el('div', { class: 'ytmd-pt-row' }, [code, el('button', { class: 'ytmd-pt-btn', text: 'Katıl', onclick: () => ptJoin(code.value, false) })]),
        PT.err ? el('div', { class: 'ytmd-pt-err', text: PT.err }) : null,
        el('div', { class: 'ytmd-pt-note', text: 'Oda kodunu bilen herkes katılabilir. Mesajlar uçtan uca şifrelenir ve ücretsiz ntfy.sh sunucusu üzerinden iletilir; sunucu içeriği göremez.' })
      );
    } else {
      kids.push(el('div', { class: 'ytmd-pt-code' }, [
        el('div', {}, [el('small', { text: PT.host ? 'Oda kodun (arkadaşlarına gönder)' : 'Katıldığın oda' }), el('b', { text: PT.code })]),
        el('button', { class: 'ytmd-pt-btn', title: 'Kodu kopyala', onclick: () => { navigator.clipboard.writeText(PT.code).then(() => toast('Kod kopyalandı'), () => {}); } }, [ICON.copy()])
      ]));
      kids.push(el('div', { class: 'ytmd-pt-status ' + PT.status, text: ptStatusTxt[PT.status] || PT.status }));
      kids.push(el('div', { class: 'ytmd-pt-h', text: 'Dinleyenler (' + (PT.members.size + 1) + ')' }));
      const mem = [el('span', { class: 'ytmd-pt-mem me', text: 'Sen' + (PT.host ? ' · oda sahibi' : '') })];
      for (const m of PT.members.values()) mem.push(el('span', { class: 'ytmd-pt-mem', text: m.name + (m.host && !PT.host ? ' · oda sahibi' : '') }));
      kids.push(el('div', { class: 'ytmd-pt-mems' }, mem));
      if (!PT.members.size) kids.push(el('div', { class: 'ytmd-pt-note', text: PT.host ? 'Kodu arkadaşına gönder; o da "Birlikte dinle"den kodu girsin.' : 'Oda sahibine bağlanılıyor…' }));
      kids.push(el('div', { class: 'ytmd-pt-h', text: 'Ortak sıra' }));
      if (PT.queue.length) PT.queue.forEach((x, i) => kids.push(el('div', { class: 'ytmd-q-row' }, [
        el('div', { class: 'ytmd-q-art' }, [x.art ? el('img', { class: 'ytmd-q-cover', src: x.art, alt: '', loading: 'lazy' }) : el('div', { class: 'ytmd-q-cover' })]),
        el('div', { class: 'ytmd-q-meta' }, [el('div', { class: 'ytmd-q-title', text: x.title }), el('div', { class: 'ytmd-q-sub', text: x.artist + (x.by ? ' · ' + x.by + ' ekledi' : '') })]),
        PT.host ? el('button', { class: 'ytmd-pt-x', title: 'Sıradan çıkar', onclick: () => { PT.queue.splice(i, 1); ptHostSend(); ptRender(); } }, [ICON.close(10)]) : null
      ])));
      else kids.push(el('div', { class: 'ytmd-pt-note', text: 'Sıra boş. Aşağıdan şarkı ara ve ekle; şu anki şarkı bitince sıradan devam edilir.' }));
      const s = el('input', { class: 'ytmd-pt-in', placeholder: 'Şarkı ara ve sıraya ekle…', value: ptSearchVal });
      s.addEventListener('input', () => { ptSearchVal = s.value; });
      s.addEventListener('keydown', (e) => { if (e.key === 'Enter') ptSearch(s.value); });
      kids.push(el('div', { class: 'ytmd-pt-row' }, [s, el('button', { class: 'ytmd-pt-btn', text: PT.searching ? '…' : 'Ara', onclick: () => ptSearch(s.value) })]));
      PT.results.forEach((x) => kids.push(el('div', { class: 'ytmd-q-row' }, [
        el('div', { class: 'ytmd-q-art' }, [x.art ? el('img', { class: 'ytmd-q-cover', src: x.art, alt: '', loading: 'lazy' }) : el('div', { class: 'ytmd-q-cover' })]),
        el('div', { class: 'ytmd-q-meta' }, [el('div', { class: 'ytmd-q-title', text: x.title }), el('div', { class: 'ytmd-q-sub', text: x.artist })]),
        el('button', { class: 'ytmd-pt-btn add', text: '+ Ekle', onclick: () => ptAdd(x) })
      ])));
      kids.push(el('button', { class: 'ytmd-pt-btn danger', text: 'Odadan ayrıl', onclick: () => { api.party && api.party('leave'); window.__ytmdPartyStatus(null); PT.results = []; toast('Odadan ayrıldın'); } }));
    }
    const focused = document.activeElement && ptBody.contains(document.activeElement) ? document.activeElement.className : '';
    ptBody.replaceChildren(...kids.filter(Boolean));
    if (focused) { const f = ptBody.querySelector('input.' + focused.split(' ').join('.')); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  }

  // Açılışın ilk 9 saniyesi: parçaları 150 ms'de bir dene (sonra normal seyrek kontrollere döner)
  { let n = 0; const id = setInterval(() => { for (const f of bootFns) { try { f(); } catch (e) {} } if (++n >= 60) clearInterval(id); }, 150); }

  // ---------------- Ayarları uygula (ana işlem çağırır) ----------------
  window.__ytmdApply = (s = {}) => {
    root.classList.remove('ytmd-mode-dark', 'ytmd-mode-amoled', 'ytmd-mode-cover');
    root.classList.add('ytmd-mode-' + (s.themeMode || 'dark'));
    root.classList.toggle('ytmd-anim', s.transitions !== false);
    if ('speed' in s) audio.speed = Math.max(0.5, Math.min(2, +s.speed || 1));
    if ('outputDevice' in s) { audio.device = String(s.outputDevice || ''); applySink(); }
    if ('boost' in s) audio.boost = Math.max(1, Math.min(2, (+s.boost || 100) / 100));
    if ('crossfade' in s) {
      audio.crossfade = Math.max(0, Math.min(12, +s.crossfade || 0));
      cfSchedule();
      if (!audio.crossfade && eq.fade) { cfArmed = false; eq.fade.gain.cancelScheduledValues(eq.ctx.currentTime); eq.fade.gain.setValueAtTime(1, eq.ctx.currentTime); }
    }
    if (s.eq) { eq.settings = { enabled: !!s.eq.enabled, bands: s.eq.bands || [0, 0, 0, 0, 0], normalize: !!s.normalize }; eqApply(); }
    else if ('normalize' in s) { eq.settings.normalize = !!s.normalize; eqApply(); }
    else eqApply();
    if ('homeHero' in s && THEME) HOME.set(s.homeHero !== false);
    renderAudioPop();
  };
  window.__ytmdSleep = (mode) => {
    if (mode === 'fade') sleepFade();
    else if (mode === 'track') { sleepAfterTrack = true; toast('Bu şarkı bitince müzik duracak'); }
    else if (mode === 'cancel') { sleepAfterTrack = false; }
  };

  if (lyricsOpen) root.classList.add('ytmd-lyrics-open');
  root.classList.add('ytmd-mode-dark', 'ytmd-anim');
  tickNowPlaying();
})();
