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
    pause: () => svgIcon('0 0 24 24', ['M7 5h3.5v14H7z', 'M13.5 5H17v14h-3.5z'], { size: 30, stroke: false })
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
      duration: v && isFinite(v.duration) ? v.duration : 0
    };
  }

  let lastKey = '', lastTrack = '', lastSent = 0, lastSentPos = 0, lastArt = '';
  let current = null;
  const trackListeners = [];
  function tickNowPlaying() {
    const np = readNowPlaying();
    if (!np) return;
    current = np;
    const track = np.videoId || np.title + '|' + np.artist;
    const key = track + '|' + np.paused;
    const now = Date.now();
    const expected = lastSentPos + (np.paused ? 0 : (now - lastSent) / 1000);
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
  setInterval(() => { if (!document.hidden) tickNowPlaying(); }, 1000);
  setInterval(() => { if (document.hidden) tickNowPlaying(); }, 5000);

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
      el('button', { class: 'ytmd-ly-close', title: 'Kapat', onclick: () => setLyrics(false) }, [ICON.close()])
    ]),
    panelBody
  ]);
  root.appendChild(panel);
  panelBody.addEventListener('wheel', () => { userScrollAt = Date.now(); }, { passive: true });

  function setLyrics(open) {
    lyricsOpen = open;
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
    activeIdx = -1;
    renderAll(() => lines.map((l) => el('div', {
      class: 'ytmd-ly-line' + (synced ? '' : ' plain'),
      text: l.text || ' ',
      onclick: () => { if (synced) { ctl.seek(l.t); userScrollAt = 0; } }
    })));
    bodies.forEach((b) => { b.scrollTop = 0; });
  }
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
    actBtn('Şarkıyı paylaş (bağlantıyı kopyala)', ICON.share(), '', share),
    actBtn('Tam ekran', ICON.full(), '', () => setFull(true)),
    actBtn('Şarkı sözleri', ICON.lyrics(), 'Sözler', () => setLyrics(!lyricsOpen), 'ytmd-lyrics-btn')
  ]));

  async function share() {
    const np = current || readNowPlaying();
    if (!np || !np.videoId) return toast('Önce bir şarkı çal');
    const ok = api.share ? await api.share(np) : false;
    toast(ok ? 'Bağlantı kopyalandı — Discord\'a yapıştırabilirsin' : 'Kopyalanamadı');
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
  const eq = { ctx: null, src: null, video: null, filters: [], comp: null, makeup: null, settings: { enabled: false, bands: [0, 0, 0, 0, 0], normalize: false } };
  function eqNeeded() { return eq.settings.enabled || eq.settings.normalize; }
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
    if (s.normalize) { last.connect(eq.comp); eq.makeup.gain.value = 1.35; eq.makeup.connect(eq.ctx.destination); }
    else last.connect(eq.ctx.destination);
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

  // ---------------- Ayarları uygula (ana işlem çağırır) ----------------
  window.__ytmdApply = (s = {}) => {
    root.classList.remove('ytmd-mode-dark', 'ytmd-mode-amoled', 'ytmd-mode-cover');
    root.classList.add('ytmd-mode-' + (s.themeMode || 'dark'));
    root.classList.toggle('ytmd-anim', s.transitions !== false);
    if (s.eq) { eq.settings = { enabled: !!s.eq.enabled, bands: s.eq.bands || [0, 0, 0, 0, 0], normalize: !!s.normalize }; eqApply(); }
    else if ('normalize' in s) { eq.settings.normalize = !!s.normalize; eqApply(); }
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
