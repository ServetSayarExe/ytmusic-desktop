// iPhone uygulamasında music.youtube.com'a sayfa yüklenirken eklenir.
(function () {
  if (window.__ytmdIOS) return;
  window.__ytmdIOS = true;

  // 1) Arka planda çalma: sayfa her zaman "görünür" sansın, YouTube müziği durdurmasın
  try {
    const def = (name, value) => Object.defineProperty(Document.prototype, name, { get: () => value, configurable: true });
    def('hidden', false);
    def('webkitHidden', false);
    def('visibilityState', 'visible');
    def('webkitVisibilityState', 'visible');
  } catch (e) {}
  const block = (e) => e.stopImmediatePropagation();
  ['visibilitychange', 'webkitvisibilitychange'].forEach((t) => {
    window.addEventListener(t, block, true);
    document.addEventListener(t, block, true);
  });

  // 2) Native oynatıcı köprüsü: medya oturumu işleyicilerini yakala, çift tetiklenmeyi engelle
  const HANDLERS = {};
  const lastCmd = {};
  const dup = (a) => { const t = Date.now(); if (lastCmd[a] && t - lastCmd[a] < 400) return true; lastCmd[a] = t; return false; };
  try {
    const ms = navigator.mediaSession;
    if (ms && ms.setActionHandler) {
      const orig = ms.setActionHandler.bind(ms);
      ms.setActionHandler = function (action, fn) {
        HANDLERS[action] = fn || null;
        if (!fn || action === 'seekto') return orig(action, fn);
        return orig(action, function (d) { if (dup(action)) return; return fn(d); });
      };
    }
  } catch (e) {}
  const vid = () => document.querySelector('video');
  const clickFirst = (sels) => { for (const s of sels) { const b = document.querySelector(s); if (b) { b.click(); return true; } } return false; };
  const NEXT = ['ytmusic-player-bar .next-button', '.next-button', 'button[aria-label="Next"]', 'button[aria-label="Sonraki"]', '[aria-label="Sonraki şarkı"]'];
  const PREV = ['ytmusic-player-bar .previous-button', '.previous-button', 'button[aria-label="Previous"]', 'button[aria-label="Önceki"]', '[aria-label="Önceki şarkı"]'];
  window.__ytmdCmd = function (cmd, arg) {
    const v = vid();
    if (cmd === 'play') { if (v && v.paused) v.play().catch(() => {}); }
    else if (cmd === 'pause') { if (v && !v.paused) v.pause(); }
    else if (cmd === 'seek') { if (v && isFinite(arg)) v.currentTime = arg; }
    else if (cmd === 'closeWebPlayer') { closeWebPlayer(); return; }
    else if (cmd === 'release') {
      if (v && !v.paused) v.pause();
      try { navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; } catch (e) {}
      return;
    }
    else if (cmd === 'next' || cmd === 'prev') {
      const action = cmd === 'next' ? 'nexttrack' : 'previoustrack';
      if (dup(action)) return;
      const fn = HANDLERS[action];
      if (fn) { try { fn({ action }); } catch (e) {} }
      else clickFirst(cmd === 'next' ? NEXT : PREV);
    }
    setTimeout(() => post(true), 250);
  };

  // YouTube'un kendi tam ekran oynatıcısı: açılınca yerine native oynatıcıyı aç, kapanınca bunu da kapat
  const layout = () => document.querySelector('ytmusic-app-layout');
  function closeWebPlayer() {
    const l = layout();
    if (!l || !l.hasAttribute('player-page-open')) return;
    const btn = document.querySelector('ytmusic-player-page .player-minimize-button, ytmusic-player-page [aria-label="Küçült"], ytmusic-player-page [aria-label="Minimize"], .toggle-player-page-button');
    if (btn) { btn.click(); return; }
    try { l.playerPageOpen_ = false; } catch (e) {}
    try { l.removeAttribute('player-page-open'); } catch (e) {}
  }
  let layoutObs = null;
  function watchLayout() {
    const l = layout();
    if (!l || l.__ytmdWatched) return;
    l.__ytmdWatched = true;
    layoutObs = new MutationObserver(() => {
      if (!l.hasAttribute('player-page-open')) return;
      const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ytmd;
      if (h) h.postMessage({ type: 'playerOpen' });
    });
    layoutObs.observe(l, { attributes: true, attributeFilter: ['player-page-open'] });
  }

  let lastKey = '', lastPost = 0;
  function artURL(md) {
    const a = md && md.artwork;
    if (!a || !a.length) return '';
    return String(a[a.length - 1].src || '').replace(/=w\d+-h\d+/, '=w1200-h1200');
  }
  function post(force) {
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ytmd;
    if (!h || AD.on) return;
    const v = vid();
    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    if (!md || !md.title) return;
    const s = {
      title: md.title || '', artist: md.artist || '', album: md.album || '', art: artURL(md),
      dur: v && isFinite(v.duration) ? v.duration : 0,
      pos: v ? v.currentTime : 0,
      playing: !!(v && !v.paused && !v.ended)
    };
    const key = [s.title, s.artist, s.art, s.playing, Math.round(s.dur)].join('|');
    const now = Date.now();
    if (force || key !== lastKey || now - lastPost > 1000) { lastKey = key; lastPost = now; h.postMessage(s); }
  }
  ['play', 'pause', 'playing', 'loadedmetadata', 'seeked', 'ended', 'durationchange'].forEach((t) =>
    document.addEventListener(t, () => post(true), true));

  // 3) Reklam atlayıcı: reklam başlarsa sesi kapat, sonuna sar, "Atla"ya bas
  const SKIP = '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button, button[id^="skip-button"], .ytm-ad-skip-button, button.ad-skip-button';
  const AD = { on: false, muted: false };
  function adCheck() {
    const v = document.querySelector('video');
    const ad = !!document.querySelector('.ad-showing, .ad-interrupting');
    if (ad && v) {
      if (!AD.on) { AD.on = true; AD.muted = v.muted; }
      v.muted = true;
      try {
        if (isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.2) {
          v.playbackRate = 16;
          v.currentTime = v.duration - 0.1;
        }
      } catch (e) {}
      const btn = document.querySelector(SKIP);
      if (btn) btn.click();
      setTimeout(adCheck, 300);
    } else if (AD.on) {
      AD.on = false;
      if (v) { v.muted = AD.muted; v.playbackRate = 1; }
    }
  }
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; adCheck(); }); } };
  function start() {
    new MutationObserver(schedule).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
    setInterval(adCheck, 1500);
    setInterval(() => post(false), 500);
    setInterval(watchLayout, 1000);

    // 4) Görünüm: YouTube'un kendi alt oynatıcı çubuğunu gizle (yerine native oynatıcı var)
    const st = document.createElement('style');
    st.textContent = 'html,body{-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none;background:#030303}ytmusic-player-bar,ytmusic-mini-player,#player-bar-background,ytmusic-app-layout>#player-bar-background{display:none!important}ytmusic-app,ytmusic-app-layout{--ytmusic-player-bar-height:0px!important}ytmusic-player-page{opacity:0!important;pointer-events:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
})();
