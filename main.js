// YouTube Music Desktop
const {
  app, BrowserWindow, Tray, Menu, shell, session, globalShortcut, nativeImage,
  ipcMain, net, Notification, clipboard, screen
} = require('electron');
const path = require('path');
const fs = require('fs');
const { DiscordRPC } = require('./discord');

const YTM_URL = 'https://music.youtube.com';
const APP_ID = 'com.local.ytmusicdesktop';
// Discord uygulama kimliği (herkese açık bir numara, gizli değil). Uygulamaya gömülü.
const DISCORD_CLIENT_ID = '1569795567800950804';

// ---------------- Kimlik (User-Agent) ----------------
// YouTube Music: gerçek Chrome kimliği. Google girişi: Firefox kimliği (Electron engelini aşmak için).
const UA_CHROME = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const UA_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
const isLoginHost = (url) => {
  try { const h = new URL(url).hostname; return h === 'accounts.google.com' || h.endsWith('.accounts.google.com') || h === 'accounts.youtube.com'; }
  catch { return false; }
};
const uaFor = (url) => (isLoginHost(url) ? UA_FIREFOX : UA_CHROME);
app.userAgentFallback = UA_CHROME;

// ---------------- Performans ----------------
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Reklam/izleyici istekleri (müzik çalmayı ve dinleme geçmişini ETKİLEMEYENLER)
const BLOCK_URLS = [
  '*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*',
  '*://*.google-analytics.com/*', '*://*.googletagmanager.com/*', '*://*.googletagservices.com/*',
  '*://*.youtube.com/pagead/*', '*://*.youtube.com/ptracking*', '*://*.youtube.com/api/stats/ads*',
  '*://*.youtube.com/api/stats/atr*', '*://*.youtube.com/youtubei/v1/log_event*', '*://play.google.com/log*'
];
const PRECONNECT = [
  'https://music.youtube.com', 'https://www.youtube.com', 'https://i.ytimg.com',
  'https://lh3.googleusercontent.com', 'https://yt3.ggpht.com', 'https://fonts.gstatic.com', 'https://www.gstatic.com'
];

let win = null, tray = null, quitting = false;
let miniWin = null, settingsWin = null, statsWin = null;
const discord = new DiscordRPC();

// ---------------- Kalıcı durum ----------------
const userData = app.getPath('userData');
const stateFile = path.join(userData, 'window-state.json');
const settingsFile = path.join(userData, 'settings.json');
const historyFile = path.join(userData, 'history.json');
const readJSON = (f, def) => { try { return { ...def, ...JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch { return def; } };
const loadState = () => readJSON(stateFile, { width: 1280, height: 800 });
function saveState() {
  if (!win || win.isMinimized() || win.isFullScreen()) return;
  try { fs.writeFileSync(stateFile, JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {}
}
const DEFAULTS = {
  theme: true, themeMode: 'dark', transitions: true,
  notifications: true, discord: true, discordClientId: '',
  eq: { enabled: false, preset: 'Düz', bands: [0, 0, 0, 0, 0] }, normalize: false,
  stats: true, miniBounds: null
};
const settings = readJSON(settingsFile, DEFAULTS);
const saveSettings = () => { try { fs.writeFileSync(settingsFile, JSON.stringify(settings)); } catch {} };

// Görünüm dosyaları: Belgeler\ytmusic-desktop'taki kopya uygulamadakinden YENİYSE o kullanılır
// (tema düzeltmesi için yeniden derlemeye gerek kalmaz; güncelleme gelince de eski kopya onu gölgelemez).
const DEV_DIR = path.join(app.getPath('documents'), 'ytmusic-desktop');
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return -1; } };
const readText = (f) => {
  const dev = path.join(DEV_DIR, f), own = path.join(__dirname, f);
  const ownTime = Math.max(mtime(own), app.isPackaged ? mtime(process.resourcesPath + '/app.asar') : -1);
  const pick = mtime(dev) > ownTime ? dev : own;
  try { return fs.readFileSync(pick, 'utf8'); } catch { try { return fs.readFileSync(own, 'utf8'); } catch { return ''; } }
};

// Sadece Google giriş sayfasında Chromium izlerini gizle
const LOGIN_STEALTH_JS = `
  if (/(^|\\.)accounts\\.(google|youtube)\\.com$/.test(location.hostname)) {
    try { Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined }); } catch (e) {}
    try { delete window.chrome; } catch (e) {}
  }`;

function isInternal(url) {
  try { const h = new URL(url).hostname; return h.endsWith('youtube.com') || h.endsWith('google.com') || h.endsWith('google.com.tr'); }
  catch { return false; }
}
const pageJS = (code) => { if (win) win.webContents.executeJavaScript(code).catch(() => {}); };
const showMain = () => { if (win) { win.show(); win.focus(); } };

// ---------------- Oynatıcı kontrolü ----------------
function control(action) {
  if (!['playpause', 'next', 'prev'].includes(action)) return;
  const map = { playpause: 'toggle', next: 'next', prev: 'prev' };
  pageJS(`window.__ytmdControl && window.__ytmdControl('${map[action]}')`);
}

// ---------------- Görev çubuğu tuşları ----------------
const asset = (n) => nativeImage.createFromPath(path.join(__dirname, 'thumb-' + n));
let thumbPlaying = false;
function updateThumbar() {
  if (!win || process.platform !== 'win32' || !win.isVisible()) return;
  try {
    win.setThumbarButtons([
      { tooltip: 'Önceki', icon: asset('prev.png'), click: () => control('prev') },
      { tooltip: thumbPlaying ? 'Duraklat' : 'Oynat', icon: asset(thumbPlaying ? 'pause.png' : 'play.png'), click: () => control('playpause') },
      { tooltip: 'Sonraki', icon: asset('next.png'), click: () => control('next') }
    ]);
  } catch (e) {}
}

// ---------------- Kapak: vurgu rengi + bildirim görseli ----------------
async function fetchImage(url) {
  try {
    const res = await net.fetch(url);
    if (!res.ok) return null;
    const img = nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer()));
    return img.isEmpty() ? null : img;
  } catch { return null; }
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
function accentFromImage(img) {
  const size = 24;
  const bmp = img.resize({ width: size, height: size, quality: 'good' }).toBitmap(); // BGRA
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, s: 0, l: 0, hx: 0, hy: 0 }));
  for (let i = 0; i < bmp.length; i += 4) {
    const [h, s, l] = rgbToHsl(bmp[i + 2], bmp[i + 1], bmp[i]);
    const w = s * (1 - Math.abs(l - 0.5) * 2);
    if (w < 0.05) continue;
    const b = buckets[Math.floor(h * 24) % 24];
    b.w += w; b.s += s * w; b.l += l * w;
    b.hx += Math.cos(h * 2 * Math.PI) * w; b.hy += Math.sin(h * 2 * Math.PI) * w;
  }
  const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w < 0.5) return null;
  let h = Math.atan2(best.hy, best.hx) / (2 * Math.PI); if (h < 0) h += 1;
  return hslToRgb(h, Math.min(1, Math.max(0.6, best.s / best.w)), Math.min(0.66, Math.max(0.56, best.l / best.w)));
}
let accentHex = '#ff4d6d';
function applyAccent(rgb) {
  const [r, g, b] = rgb || [255, 77, 109];
  accentHex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  pageJS(`document.documentElement.style.setProperty('--ytmd-accent','${accentHex}');` +
    `document.documentElement.style.setProperty('--ytmd-accent-rgb','${r}, ${g}, ${b}');`);
}

// ---------------- Dinleme geçmişi ----------------
let history = [];
try { const h = JSON.parse(fs.readFileSync(historyFile, 'utf8')); if (Array.isArray(h)) history = h; } catch {}
let historyTimer = null;
function saveHistory(sync) {
  clearTimeout(historyTimer);
  const write = () => { try { fs.writeFileSync(historyFile, JSON.stringify(history)); } catch {} };
  if (sync) write(); else historyTimer = setTimeout(write, 4000);
}
let listen = null; // şu an dinlenen şarkının süre sayacı
function trackListen(d) {
  const now = Date.now();
  const key = (d.videoId || '') + '|' + d.title;
  if (listen && listen.playing) listen.sec += Math.min((now - listen.lastTs) / 1000, 600);
  if (!listen || listen.key !== key) {
    commitListen();
    listen = { key, id: d.videoId || '', title: d.title, artist: d.artist, album: d.album, art: d.artwork, dur: d.duration, start: now, sec: 0 };
  }
  listen.playing = !d.paused; listen.lastTs = now;
  if (d.duration) listen.dur = d.duration;
}
function commitListen(final) {
  if (!listen) return;
  if (final && listen.playing) listen.sec += Math.min((Date.now() - listen.lastTs) / 1000, 600);
  const counts = listen.sec >= 30 || (listen.dur && listen.sec >= Math.min(30, listen.dur * 0.5) && listen.sec >= 10);
  if (settings.stats && counts) {
    history.push({
      t: listen.start, id: listen.id, title: String(listen.title).slice(0, 200), artist: String(listen.artist || '').slice(0, 200),
      album: String(listen.album || '').slice(0, 200), art: String(listen.art || '').replace(/=w\d+-h\d+/, '=w226-h226').slice(0, 300),
      sec: Math.round(listen.sec), dur: Math.round(listen.dur || 0)
    });
    if (history.length > 50000) history = history.slice(-50000);
    saveHistory(final);
  }
  listen = null;
}

// ---------------- Şimdi çalan ----------------
let np = null, npAt = 0, lastTrackKey = '';
async function onNowPlaying(data) {
  if (!data || typeof data !== 'object' || typeof data.title !== 'string') return;
  np = data; npAt = Date.now();
  trackListen(data);
  const trackKey = (data.videoId || '') + '|' + data.title;
  const newTrack = trackKey !== lastTrackKey;
  lastTrackKey = trackKey;

  if (thumbPlaying !== !data.paused) { thumbPlaying = !data.paused; updateThumbar(); }
  if (tray) tray.setToolTip(`${data.title}${data.artist ? ' – ' + data.artist : ''}`.slice(0, 127));
  updateDiscord();
  pushMini();

  if (!newTrack) return;
  const artSmall = (data.artwork || '').replace(/=w\d+-h\d+/, '=w120-h120');
  const img = artSmall ? await fetchImage(artSmall) : null;
  if (trackKey !== lastTrackKey) return;
  applyAccent(img ? accentFromImage(img) : null);
  pushMini();
  if (settings.notifications && Notification.isSupported() && win && (!win.isVisible() || !win.isFocused()) && !data.paused && !(miniWin && miniWin.isVisible())) {
    try { new Notification({ title: data.title, body: data.artist || 'YouTube Music', icon: img || undefined, silent: true }).show(); } catch (e) {}
  }
}

// ---------------- Discord ----------------
const clip = (s, n) => { s = String(s || ''); s = s.length < 2 ? s + '  ' : s; return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function updateDiscord() {
  if (!np) return discord.setActivity(null);
  const a = {
    type: 2,
    details: clip(np.title, 128),
    state: clip(np.paused ? `Duraklatıldı · ${np.artist}` : np.artist || 'YouTube Music', 128),
    assets: {}
  };
  const art = (np.artwork || '').replace(/=w\d+-h\d+/, '=w512-h512');
  if (/^https:\/\//.test(art) && art.length < 256) a.assets.large_image = art;
  a.assets.large_text = clip(np.album || np.title, 128);
  if (!np.paused && np.duration > 0) {
    const start = Date.now() - np.currentTime * 1000;
    a.timestamps = { start: Math.round(start), end: Math.round(start + np.duration * 1000) };
  }
  if (np.videoId) a.buttons = [{ label: "YouTube Music'te dinle", url: `https://music.youtube.com/watch?v=${np.videoId}` }];
  discord.setActivity(a);
}
const applyDiscordSettings = () => discord.configure(settings.discordClientId || DISCORD_CLIENT_ID, settings.discord);

// ---------------- Şarkı sözleri (lrclib.net) ----------------
const lyricsCache = new Map();
function cleanTitle(t) {
  return String(t || '')
    .replace(/\s*[\(\[][^\)\]]*(official|video|audio|lyric|lyrics|klip|mv|visuali[sz]er|hd|4k|remaster|prod\.?|feat\.?|ft\.?)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s+(feat\.?|ft\.?)\s.+$/i, '')
    .replace(/\s*[-–|]\s*(official|video|audio).*$/i, '')
    .trim();
}
const firstArtist = (a) => String(a || '').split(/,|&| x | X | ve | feat\.? | ft\.? /)[0].trim();
async function lrclib(q) {
  try {
    const res = await net.fetch('https://lrclib.net/api/' + q, { headers: { 'User-Agent': 'YouTubeMusicDesktop/1.5 (kisisel kullanim)' } });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}
async function findLyrics({ title, artist, album, duration }) {
  const t = cleanTitle(title), a = firstArtist(artist);
  const key = `${t}|${a}|${Math.round(duration || 0)}`;
  if (lyricsCache.has(key)) return lyricsCache.get(key);
  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();
  const pick = (r) => (r && (r.syncedLyrics || r.plainLyrics) ? { synced: r.syncedLyrics || null, plain: r.plainLyrics || null } : null);
  let out = null;
  if (duration > 0) out = pick(await lrclib('get?' + qs({ track_name: t, artist_name: a, album_name: album, duration: Math.round(duration) })));
  if (!out) {
    const list = await lrclib('search?' + qs({ track_name: t, artist_name: a }));
    if (Array.isArray(list) && list.length) {
      const near = (r) => !duration || !r.duration || Math.abs(r.duration - duration) < 6;
      out = pick(list.find((r) => r.syncedLyrics && near(r)) || list.find((r) => near(r)) || list[0]);
    }
  }
  if (!out) {
    const list = await lrclib('search?' + qs({ q: `${t} ${a}` }));
    if (Array.isArray(list) && list.length) out = pick(list.find((r) => r.syncedLyrics) || list[0]);
  }
  lyricsCache.set(key, out);
  return out;
}

// ---------------- Sayfa ayarları ----------------
const pageSettings = () => ({ themeMode: settings.themeMode, transitions: settings.transitions, eq: settings.eq, normalize: settings.normalize });
const pushPageSettings = () => pageJS(`window.__ytmdApply && window.__ytmdApply(${JSON.stringify(pageSettings())})`);

function setSetting(key, value) {
  const bool = (v) => !!v;
  switch (key) {
    case 'theme': settings.theme = bool(value); saveSettings(); quitting = true; app.relaunch(); app.quit(); return;
    case 'themeMode': if (!['dark', 'amoled', 'cover'].includes(value)) return; settings.themeMode = value; break;
    case 'transitions': case 'normalize': case 'notifications': case 'stats': settings[key] = bool(value); break;
    case 'discord': settings.discord = bool(value); applyDiscordSettings(); updateDiscord(); break;
    case 'eq': {
      if (!value || typeof value !== 'object') return;
      const bands = Array.isArray(value.bands) ? value.bands.slice(0, 5).map((b) => Math.max(-12, Math.min(12, Math.round(+b || 0)))) : settings.eq.bands;
      while (bands.length < 5) bands.push(0);
      settings.eq = { enabled: bool(value.enabled), preset: String(value.preset || 'Özel').slice(0, 40), bands };
      break;
    }
    default: return;
  }
  saveSettings();
  pushPageSettings();
}

// ---------------- Uyku zamanlayıcı ----------------
let sleep = { mode: 'off', until: 0 }, sleepTimer = null;
function setSleep(mode) {
  clearTimeout(sleepTimer);
  if (mode === 'off') { sleep = { mode: 'off', until: 0 }; pageJS("window.__ytmdSleep && window.__ytmdSleep('cancel')"); }
  else if (mode === 'track') { sleep = { mode: 'track', until: 0 }; pageJS("window.__ytmdSleep && window.__ytmdSleep('track')"); }
  else {
    const min = parseInt(mode, 10);
    if (!(min > 0 && min <= 600)) return;
    pageJS("window.__ytmdSleep && window.__ytmdSleep('cancel')");
    sleep = { mode: 'timer', until: Date.now() + min * 60000 };
    sleepTimer = setTimeout(() => { sleep = { mode: 'off', until: 0 }; pageJS("window.__ytmdSleep && window.__ytmdSleep('fade')"); buildTrayMenu(); }, min * 60000);
    pageJS(`window.__ytmdToast && window.__ytmdToast(${JSON.stringify(`Uyku zamanlayıcı: ${min} dakika sonra müzik duracak`)})`);
  }
  buildTrayMenu();
}

// ---------------- Pencereler ----------------
const ICON = path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const auxPrefs = () => ({ preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false });

function createWindow() {
  const s = loadState();
  win = new BrowserWindow({
    width: s.width, height: s.height, x: s.x, y: s.y, minWidth: 480, minHeight: 360,
    title: 'YouTube Music', icon: ICON, backgroundColor: '#07070a', autoHideMenuBar: true,
    frame: !settings.theme, show: true,
    webPreferences: {
      partition: 'persist:ytmusic', preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
      backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required'
    }
  });
  if (s.maximized) win.maximize();

  win.webContents.setUserAgent(UA_CHROME);
  try {
    const dbg = win.webContents.debugger;
    dbg.attach('1.3');
    dbg.sendCommand('Page.enable');
    dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: LOGIN_STEALTH_JS });
  } catch (e) { console.error('debugger attach failed', e); }
  win.webContents.on('did-start-navigation', (d) => { if (d.isMainFrame) win.webContents.setUserAgent(uaFor(d.url)); });

  win.loadURL(YTM_URL);

  win.webContents.on('dom-ready', () => {
    if (!win.webContents.getURL().includes('music.youtube.com')) return;
    win.webContents.insertCSS(readText('core.css')).catch(() => {});
    if (settings.theme) win.webContents.insertCSS(readText('theme.css')).catch(() => {});
    win.webContents.executeJavaScript(`window.__ytmdTheme = ${settings.theme ? 'true' : 'false'};\n${readText('page.js')}`)
      .then(() => { pushPageSettings(); applyAccent(hexToRgb(accentHex)); if (sleep.mode === 'track') setSleep('track'); })
      .catch((e) => console.error('page.js', e));
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) win.loadURL(url); else shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!isInternal(url)) { e.preventDefault(); shell.openExternal(url); } });

  win.on('show', () => setTimeout(updateThumbar, 300));
  win.on('leave-full-screen', () => pageJS('window.__ytmdFull && window.__ytmdFull(false)'));
  win.on('close', (e) => { saveState(); if (!quitting) { e.preventDefault(); if (win.isFullScreen()) win.setFullScreen(false); win.hide(); } });
  win.on('resized', saveState);
  win.on('moved', saveState);
}
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function openAux(ref, file, opts) {
  if (ref.win && !ref.win.isDestroyed()) { ref.win.show(); ref.win.focus(); return ref.win; }
  const w = new BrowserWindow({ icon: ICON, autoHideMenuBar: true, backgroundColor: '#0d0d12', show: false, ...opts, webPreferences: auxPrefs() });
  w.loadFile(path.join(__dirname, file));
  w.once('ready-to-show', () => w.show());
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  ref.win = w;
  w.on('closed', () => { ref.win = null; });
  return w;
}
const settingsRef = { win: null }, statsRef = { win: null };
const openSettings = () => { settingsWin = openAux(settingsRef, 'settings.html', { width: 900, height: 700, minWidth: 720, minHeight: 500, title: 'Ayarlar' }); };
const openStats = () => { statsWin = openAux(statsRef, 'stats.html', { width: 1000, height: 760, minWidth: 760, minHeight: 520, title: 'İstatistikler', backgroundColor: '#0b0b10' }); };
const isFrom = (e, ref) => ref.win && !ref.win.isDestroyed() && e.sender === ref.win.webContents;
const fromMain = (e) => win && e.sender === win.webContents;

// ---------------- Mini oynatıcı ----------------
function toggleMini() {
  if (miniWin && !miniWin.isDestroyed()) { miniWin.close(); return; }
  const W = 380, H = 130;
  let b = settings.miniBounds;
  const visible = b && screen.getAllDisplays().some((d) => {
    const a = d.workArea; return b.x >= a.x - 50 && b.y >= a.y - 50 && b.x + W <= a.x + a.width + 50 && b.y + H <= a.y + a.height + 50;
  });
  if (!visible) { const a = screen.getPrimaryDisplay().workArea; b = { x: a.x + a.width - W - 24, y: a.y + a.height - H - 24 }; }
  miniWin = new BrowserWindow({
    x: b.x, y: b.y, width: W, height: H, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, maximizable: false, fullscreenable: false, hasShadow: false,
    backgroundColor: '#00000000', icon: ICON, show: false, webPreferences: auxPrefs()
  });
  miniWin.setAlwaysOnTop(true, 'floating');
  miniWin.loadFile(path.join(__dirname, 'mini.html'));
  miniWin.once('ready-to-show', () => miniWin.showInactive());
  miniWin.webContents.on('will-navigate', (e) => e.preventDefault());
  miniWin.on('moved', () => { const [x, y] = miniWin.getPosition(); settings.miniBounds = { x, y }; saveSettings(); });
  miniWin.on('closed', () => { miniWin = null; buildTrayMenu(); });
  buildTrayMenu();
}
function pushMini() {
  if (!miniWin || miniWin.isDestroyed() || !np) return;
  const t = np.currentTime + (np.paused ? 0 : (Date.now() - npAt) / 1000);
  miniWin.webContents.send('ytmd-np-push', { ...np, currentTime: t, accent: accentHex });
}

// ---------------- Otomatik güncelleme ----------------
let updater = null, updateState = '', updateReady = false;
function initUpdater() {
  if (!app.isPackaged) { updateState = 'Geliştirme sürümü (güncelleme yok)'; return; }
  if (!fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) {
    updateState = 'Otomatik güncelleme henüz bağlanmadı (GitHub kurulumu bekleniyor)'; return;
  }
  try { updater = require('electron-updater').autoUpdater; } catch (e) { updateState = 'Güncelleme modülü bulunamadı'; return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => { updateState = 'Denetleniyor…'; });
  updater.on('update-available', (i) => { updateState = `Yeni sürüm indiriliyor: ${i.version}`; });
  updater.on('update-not-available', () => { updateState = 'En güncel sürümü kullanıyorsun'; });
  updater.on('error', () => { updateState = 'Güncelleme denetlenemedi (internet?)'; });
  updater.on('update-downloaded', (i) => {
    updateReady = true;
    updateState = `${i.version} hazır — uygulama kapanınca kurulacak`;
    buildTrayMenu();
    try { new Notification({ title: 'YouTube Music güncellendi', body: `${i.version} sürümü hazır. Tepsi menüsünden hemen kurabilirsin.`, silent: true }).show(); } catch (e) {}
  });
  const check = () => updater.checkForUpdates().catch(() => {});
  setTimeout(check, 15000);
  setInterval(check, 6 * 3600 * 1000);
}

// ---------------- IPC ----------------
ipcMain.on('ytmd-window', (e, action) => {
  if (!fromMain(e)) return;
  if (action === 'minimize') win.minimize();
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (action === 'close') win.close();
});
ipcMain.on('ytmd-fullscreen', (e, on) => { if (fromMain(e)) win.setFullScreen(!!on); });
ipcMain.on('ytmd-np', (e, data) => { if (fromMain(e)) onNowPlaying(data); });
ipcMain.handle('ytmd-lyrics', (e, q) => (fromMain(e) && q ? findLyrics(q) : null));
ipcMain.handle('ytmd-share', (e, d) => {
  if (!fromMain(e) || !d || !/^[\w-]{6,20}$/.test(d.videoId || '')) return false;
  clipboard.writeText(`https://music.youtube.com/watch?v=${d.videoId}`);
  return true;
});
ipcMain.on('ytmd-mini-toggle', (e) => { if (fromMain(e)) toggleMini(); });
ipcMain.on('ytmd-sleep-done', (e) => { if (fromMain(e)) { sleep = { mode: 'off', until: 0 }; buildTrayMenu(); } });
// mini oynatıcı
const fromMini = (e) => miniWin && !miniWin.isDestroyed() && e.sender === miniWin.webContents;
ipcMain.on('ytmd-mini-ready', (e) => { if (fromMini(e)) pushMini(); });
ipcMain.on('ytmd-control', (e, a) => { if (fromMini(e)) control(a); });
ipcMain.on('ytmd-show-main', (e) => { if (fromMini(e)) showMain(); });
// ayarlar
ipcMain.handle('ytmd-settings-get', (e) => (isFrom(e, settingsRef) ? { ...settings, accent: accentHex, version: app.getVersion(), updateState } : null));
ipcMain.on('ytmd-settings-set', (e, k, v) => { if (isFrom(e, settingsRef)) setSetting(k, v); });
ipcMain.handle('ytmd-sleep-get', (e) => (isFrom(e, settingsRef) ? sleep : null));
ipcMain.on('ytmd-sleep-set', (e, m) => { if (isFrom(e, settingsRef)) setSleep(String(m)); });
ipcMain.handle('ytmd-update-check', async (e) => {
  if (!isFrom(e, settingsRef)) return '';
  if (!updater) return updateState;
  try { const r = await updater.checkForUpdates(); return r && r.updateInfo && r.updateInfo.version !== app.getVersion() ? `Yeni sürüm bulundu: ${r.updateInfo.version} — indiriliyor` : 'En güncel sürümü kullanıyorsun'; }
  catch { return 'Güncelleme denetlenemedi (internet?)'; }
});
// istatistikler
const fromStatsOrSettings = (e) => isFrom(e, statsRef) || isFrom(e, settingsRef);
ipcMain.handle('ytmd-history-get', (e) => (fromStatsOrSettings(e) ? { history, accent: accentHex } : null));
ipcMain.handle('ytmd-history-count', (e) => (fromStatsOrSettings(e) ? history.length : 0));
ipcMain.handle('ytmd-history-clear', (e) => { if (!isFrom(e, settingsRef)) return false; history = []; saveHistory(true); return true; });
ipcMain.on('ytmd-open-stats', (e) => { if (isFrom(e, settingsRef)) openStats(); });
ipcMain.on('ytmd-play-video', (e, id) => {
  if (!fromStatsOrSettings(e) || !/^[\w-]{6,20}$/.test(String(id))) return;
  win.loadURL(`https://music.youtube.com/watch?v=${id}`); showMain();
});

// ---------------- Tepsi ----------------
function buildTrayMenu() {
  if (!tray) return;
  const sleepLabel = sleep.mode === 'timer' ? `Uyku zamanlayıcı (${Math.max(0, Math.ceil((sleep.until - Date.now()) / 60000))} dk)` : sleep.mode === 'track' ? 'Uyku zamanlayıcı (şarkı bitince)' : 'Uyku zamanlayıcı';
  const template = [
    { label: 'Göster', click: showMain },
    { label: 'Mini oynatıcı', type: 'checkbox', checked: !!(miniWin && !miniWin.isDestroyed()), click: toggleMini },
    { type: 'separator' },
    { label: 'Oynat / Duraklat', click: () => control('playpause') },
    { label: 'Sonraki', click: () => control('next') },
    { label: 'Önceki', click: () => control('prev') },
    { type: 'separator' },
    { label: sleepLabel, submenu: [
      ...[15, 30, 45, 60, 90].map((m) => ({ label: `${m} dakika`, click: () => setSleep(String(m)) })),
      { label: 'Bu şarkı bitince', click: () => setSleep('track') },
      { type: 'separator' },
      { label: 'Kapat', enabled: sleep.mode !== 'off', click: () => setSleep('off') }
    ] },
    { label: 'İstatistikler', click: openStats },
    { label: 'Ayarlar', click: openSettings },
    { type: 'separator' }
  ];
  if (updateReady) template.push({ label: 'Güncellemeyi kur ve yeniden başlat', click: () => { quitting = true; commitListen(true); updater.quitAndInstall(true, true); } });
  template.push({ label: 'Çıkış', click: () => { quitting = true; app.quit(); } });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}
function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('YouTube Music');
  buildTrayMenu();
  tray.on('click', () => { win.isVisible() ? win.hide() : showMain(); });
  setInterval(() => { if (sleep.mode === 'timer') buildTrayMenu(); }, 60000);
}

// ---------------- Başlangıç ----------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
  app.on('second-instance', showMain);

  app.whenReady().then(() => {
    const ses = session.fromPartition('persist:ytmusic');
    ses.setUserAgent(UA_CHROME);
    for (const url of PRECONNECT) { try { ses.preconnect({ url, numSockets: 2 }); } catch (e) {} }
    ses.webRequest.onBeforeRequest({ urls: BLOCK_URLS }, (d, cb) => cb({ cancel: true }));
    ses.webRequest.onBeforeSendHeaders((details, cb) => {
      const h = details.requestHeaders;
      if (isLoginHost(details.url) || isLoginHost(details.referrer || '')) {
        for (const k of Object.keys(h)) if (k.toLowerCase().startsWith('sec-ch-ua')) delete h[k];
        h['User-Agent'] = UA_FIREFOX;
      } else h['User-Agent'] = UA_CHROME;
      cb({ requestHeaders: h });
    });

    createWindow();
    createTray();
    applyDiscordSettings();
    initUpdater();

    globalShortcut.register('CommandOrControl+Shift+Space', () => control('playpause'));
    globalShortcut.register('CommandOrControl+Shift+Right', () => control('next'));
    globalShortcut.register('CommandOrControl+Shift+Left', () => control('prev'));
    globalShortcut.register('CommandOrControl+Shift+M', toggleMini);
  });

  app.on('before-quit', () => { quitting = true; commitListen(true); saveHistory(true); });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); discord.disconnect(); });
  app.on('activate', showMain);
}
