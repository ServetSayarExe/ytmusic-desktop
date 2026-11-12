// 2.0 özellikleri (ana işlem): Oyun modu, Telefondan kumanda, Akıllı sıra (enerji verisi), Birlikte dinle (şifreli aktarım).
// Hepsi varsayılan olarak KAPALI; kapalıyken hiçbir zamanlayıcı/sunucu/bağlantı çalışmaz.
'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { qr } = require('./qr');
const createMdns = require('./mdns');

const GAME_DEFAULT = [
  'VALORANT-Win64-Shipping.exe', 'cs2.exe', 'League of Legends.exe', 'FortniteClient-Win64-Shipping.exe',
  'r5apex.exe', 'r5apex_dx12.exe', 'GTA5.exe', 'GTA5_Enhanced.exe', 'RDR2.exe', 'eldenring.exe', 'Overwatch.exe',
  'RocketLeague.exe', 'dota2.exe', 'TslGame.exe', 'destiny2.exe', 'cod.exe', 'RainbowSix.exe', 'Cyberpunk2077.exe',
  'Marvel-Win64-Shipping.exe', 'Warframe.x64.exe', 'FC25.exe', 'FC26.exe', 'Minecraft.Windows.exe', 'MonsterHunterWilds.exe'
];

module.exports = function features(ctx) {
  const { app, fetch, settings, saveSettings, pageJS, pageEval, control, onChange, userData } = ctx;
  const askPair = ctx.askPair || (async () => false);
  const win = () => ctx.getWin();
  const isWin = process.platform === 'win32';
  if (!Array.isArray(settings.gameList)) settings.gameList = GAME_DEFAULT.slice();

  // ================= OYUN MODU =================
  const game = { manual: false, detected: '', muted: '', active: false, timer: null };
  function setPriorities(low) {
    if (!isWin) return;
    const P = os.constants.priority;
    let mainPid = 0; try { mainPid = win() && win().webContents.getOSProcessId(); } catch (e) {}
    for (const m of app.getAppMetrics()) {
      // Ses servisi ve müziği çalan sayfa normal kalır (cızırtı olmasın); gerisi oyuna yol verir.
      if (m.pid === mainPid || (m.type === 'Utility' && /audio/i.test(m.serviceName || ''))) continue;
      try { os.setPriority(m.pid, low ? P.PRIORITY_BELOW_NORMAL : P.PRIORITY_NORMAL); } catch (e) {}
    }
  }
  function applyGame() {
    const on = game.manual || (!!game.detected && game.detected !== game.muted);
    if (on === game.active) { if (on) setPriorities(true); return; }
    game.active = on;
    pageJS(`window.__ytmdGame && window.__ytmdGame(${on})`);
    setPriorities(on);
    onChange();
  }
  function scanGames() {
    if (!isWin) return;
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 4 << 20 }, (err, out) => {
      if (err) return;
      const running = new Set(String(out).split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((s) => s.toLowerCase()));
      const hit = (settings.gameList || []).find((g) => running.has(String(g).toLowerCase())) || '';
      if (hit !== game.detected) { game.detected = hit; if (!hit) game.muted = ''; applyGame(); }
    });
  }
  function gameWatch() {
    clearInterval(game.timer); game.timer = null;
    if (settings.gameAuto && isWin) { scanGames(); game.timer = setInterval(scanGames, 15000); }
    else if (game.detected) { game.detected = ''; applyGame(); }
  }
  const toggleGame = (on) => {
    const want = on === undefined ? !game.active : !!on;
    game.manual = want;
    game.muted = !want && game.detected ? game.detected : '';   // oyun açıkken elle kapatılırsa o oyun kapanana kadar kapalı kalır
    applyGame();
  };
  const gameInfo = () => ({ active: game.active, manual: game.manual, detected: game.detected, auto: !!settings.gameAuto, list: settings.gameList });

  // ================= TELEFONDAN KUMANDA =================
  const remote = { server: null, port: 0, clients: new Set(), timer: null, last: '', qrUrl: '', qr: null };
  if (!/^[0-9a-f]{32}$/.test(settings.remoteToken || '')) { settings.remoteToken = crypto.randomBytes(16).toString('hex'); saveSettings(); }
  if (!/^[0-9a-f]{16}$/.test(settings.deviceId || '')) { settings.deviceId = crypto.randomBytes(8).toString('hex'); saveSettings(); }
  if (!Array.isArray(settings.pairedDevices)) settings.pairedDevices = [];
  // iPhone uygulaması bu bilgisayarı aynı Wi-Fi'da kendiliğinden bulsun (Bonjour)
  const mdns = createMdns({ name: os.hostname(), id: settings.deviceId, port: () => remote.port, getIP: () => lanIP() });
  let pairPending = null;
  const pairDenied = {};
  function readBody(req, max) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > max) req.destroy(); });
      req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve(null); } });
      req.on('error', () => resolve(null));
    });
  }
  async function handlePair(req, res) {
    const c = await readBody(req, 1000);
    const device = c && /^[A-Za-z0-9-]{8,64}$/.test(String(c.device || '')) ? String(c.device) : '';
    const name = c ? String(c.name || 'iPhone').replace(/[\u0000-\u001f"]/g, '').trim().slice(0, 40) || 'iPhone' : '';
    const reply = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(obj ? JSON.stringify(obj) : ''); };
    if (!device) return reply(400);
    const ok = () => reply(200, { token: settings.remoteToken, name: os.hostname(), id: settings.deviceId });
    if (settings.pairedDevices.some((d) => d.id === device)) return ok();
    if (pairPending || (pairDenied[device] && Date.now() - pairDenied[device] < 30000)) return reply(429);
    pairPending = device;
    let allowed = false;
    try { allowed = await askPair(name); } catch (e) {}
    pairPending = null;
    if (!allowed) { pairDenied[device] = Date.now(); return reply(403); }
    settings.pairedDevices = settings.pairedDevices.filter((d) => d.id !== device).concat({ id: device, name }).slice(-10);
    saveSettings();
    ok();
  }
  const lanIP = () => {
    const all = [];
    for (const [name, list] of Object.entries(os.networkInterfaces())) for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal || a.address.startsWith('169.254.')) continue;
      const virt = /vmware|virtualbox|vethernet|hyper-v|wsl|docker|tailscale|zerotier|hamachi|radmin|vpn|tap/i.test(name);
      const priv = /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a.address);
      all.push({ a: a.address, score: (priv ? 2 : 0) + (virt ? -3 : 0) + (a.address.startsWith('192.168.') ? 1 : 0) });
    }
    all.sort((x, y) => y.score - x.score);
    return all.length ? all[0].a : '';
  };
  const tokenOk = (t) => { const a = Buffer.from(String(t || '')), b = Buffer.from(settings.remoteToken); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const remoteUrl = () => (remote.server && remote.port ? `http://${lanIP() || '127.0.0.1'}:${remote.port}/r/${settings.remoteToken}` : '');
  async function remoteState() {
    const np = ctx.getNp();
    let extra = null; try { extra = await pageEval('window.__ytmdRemote ? window.__ytmdRemote("state") : null'); } catch (e) {}
    return { np: np.np, at: np.npAt, accent: np.accent, now: Date.now(), game: game.active, party: party ? { code: party.code, host: party.host } : null, ...(extra || {}) };
  }
  async function pushRemote(force) {
    if (!remote.clients.size) return;
    const s = await remoteState();
    const body = JSON.stringify(s);
    const sig = body.replace(/"(now|at)":\d+,?/g, '');
    if (!force && sig === remote.last) return;
    remote.last = sig;
    for (const res of remote.clients) { try { res.write(`data: ${body}\n\n`); } catch (e) {} }
  }
  function serveFile(res, file, type) {
    fs.readFile(path.join(__dirname, file), (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      res.end(buf);
    });
  }
  const REMOTE_CMDS = ['toggle', 'next', 'prev', 'seek', 'vol', 'mute', 'like', 'dislike', 'play', 'shuffle', 'repeat'];
  function onRequest(req, res) {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/pair' && req.method === 'POST') { handlePair(req, res); return; }
    const m = u.pathname.match(/^\/(r|api)\/([0-9a-f]{32})(?:\/(\w+))?$/);
    if (!m || !tokenOk(m[2])) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Bulunamadı'); return; }
    if (m[1] === 'r') return serveFile(res, 'remote.html', 'text/html; charset=utf-8');
    if (m[3] === 'events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      remote.clients.add(res); remote.last = '';
      req.on('close', () => { remote.clients.delete(res); if (!remote.clients.size) { clearInterval(remote.timer); remote.timer = null; } });
      if (!remote.timer) remote.timer = setInterval(() => pushRemote(false), 2000);
      pushRemote(true);
      return;
    }
    if (m[3] === 'cmd' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2000) req.destroy(); });
      req.on('end', () => {
        let c = null; try { c = JSON.parse(body); } catch (e) {}
        if (!c || !REMOTE_CMDS.includes(c.cmd)) { res.writeHead(400); res.end(); return; }
        const v = Number(c.v);
        if (c.cmd === 'toggle') control('playpause');
        else if (c.cmd === 'next') control('next');
        else if (c.cmd === 'prev') control('prev');
        else if (c.cmd === 'seek') control('seek', v);
        else if (isFinite(v) || !('v' in c)) pageJS(`window.__ytmdRemote && window.__ytmdRemote(${JSON.stringify(c.cmd)}, ${isFinite(v) ? v : 'undefined'})`);
        res.writeHead(204); res.end();
        setTimeout(() => pushRemote(true), 350);
      });
      return;
    }
    res.writeHead(404); res.end();
  }
  function remoteStart() {
    if (remote.server) return;
    const srv = http.createServer(onRequest);
    srv.on('error', (e) => {
      if (e.code === 'EADDRINUSE' && srv.__try !== 'any') { srv.__try = 'any'; srv.listen(0, '0.0.0.0'); return; }
      remote.server = null; remote.port = 0; onChange();
    });
    srv.on('listening', () => { remote.port = srv.address().port; onChange(); if (settings.connect !== false) mdns.start(); });
    srv.keepAliveTimeout = 5000;
    remote.server = srv;
    srv.listen(47823, '0.0.0.0');
  }
  function remoteStop() {
    if (!remote.server) return;
    for (const r of remote.clients) { try { r.end(); } catch (e) {} }
    remote.clients.clear(); clearInterval(remote.timer); remote.timer = null;
    mdns.stop();
    try { remote.server.close(); } catch (e) {}
    remote.server = null; remote.port = 0; onChange();
  }
  const remoteWatch = () => {
    if (settings.remote || settings.connect !== false) {
      remoteStart();
      if (remote.port) { if (settings.connect !== false) mdns.start(); else mdns.stop(); }
    } else remoteStop();
  };
  const remoteInfo = () => {
    const url = remoteUrl();
    if (url !== remote.qrUrl) { remote.qrUrl = url; remote.qr = null; if (url) { try { remote.qr = qr(url, 'M'); } catch (e) {} } }
    const code = remote.qr;
    return { on: !!settings.remote, connect: settings.connect !== false, paired: settings.pairedDevices.length, running: !!remote.port, url, clients: remote.clients.size, qr: code };
  };

  // ================= AKILLI SIRA: şarkı enerjisi (Deezer: BPM + ses yüksekliği) =================
  const energyFile = path.join(userData, 'energy-cache.json');
  let energyCache = null, energySaveT = null;
  const loadEnergy = () => { if (energyCache) return; try { energyCache = JSON.parse(fs.readFileSync(energyFile, 'utf8')) || {}; } catch (e) { energyCache = {}; } };
  const saveEnergy = () => { clearTimeout(energySaveT); energySaveT = setTimeout(() => {
    const keys = Object.keys(energyCache); if (keys.length > 4000) keys.slice(0, keys.length - 3000).forEach((k) => delete energyCache[k]);
    try { fs.writeFileSync(energyFile, JSON.stringify(energyCache)); } catch (e) {}
  }, 5000); };
  const clean = (s) => String(s || '').replace(/\(.*?\)|\[.*?\]|official|video|audio|lyrics?|klip|remaster(ed)?/gi, ' ').replace(/\s+/g, ' ').trim();
  async function deezer(url) {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('deezer ' + r.status);
    const j = await r.json(); if (j && j.error) throw new Error('deezer err');
    return j;
  }
  async function energyOf(t) {
    const key = String(t.id || '');
    if (key && energyCache[key]) return energyCache[key];
    let out = { bpm: 0, gain: 0, e: -1 };
    try {
      const art = clean(String(t.artist || '').split(/,|&| x | ve | feat/i)[0]), title = clean(t.title);
      const s = await deezer('https://api.deezer.com/search?limit=1&q=' + encodeURIComponent(`artist:"${art}" track:"${title}"`));
      let hit = s.data && s.data[0];
      if (!hit) { const s2 = await deezer('https://api.deezer.com/search?limit=1&q=' + encodeURIComponent(art + ' ' + title)); hit = s2.data && s2.data[0]; }
      if (hit) {
        const d = await deezer('https://api.deezer.com/track/' + hit.id);
        const bpm = +d.bpm || 0, gain = +d.gain || 0;
        // Deezer "gain": yüksek sesli (enerjik) kayıtlarda daha eksi olur
        const eg = gain ? Math.max(0, Math.min(1, (-gain - 5) / 10)) : 0.5;
        const eb = bpm >= 50 && bpm <= 220 ? Math.max(0, Math.min(1, (bpm - 70) / 100)) : -1;
        out = { bpm: Math.round(bpm), gain: Math.round(gain * 10) / 10, e: Math.round((eb >= 0 ? eb * 0.6 + eg * 0.4 : eg) * 1000) / 1000 };
      }
    } catch (e) { return null; }   // ağ hatası: önbelleğe yazma, sonra tekrar dene
    if (key) { energyCache[key] = out; saveEnergy(); }
    return out;
  }
  async function energies(list) {
    loadEnergy();
    const items = (Array.isArray(list) ? list : []).slice(0, 30).filter((t) => t && /^[\w-]{6,20}$/.test(String(t.id || '')));
    const res = {}; let i = 0;
    const worker = async () => { while (i < items.length) { const t = items[i++]; const v = await energyOf(t); if (v) res[t.id] = v; } };
    await Promise.all([worker(), worker(), worker()]);
    return res;
  }

  // ================= BİRLİKTE DİNLE: uçtan uca şifreli oda (ntfy aktarıcısı) =================
  let party = null;
  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => { const b = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += CODE_ABC[b[i] % 32]; return s.slice(0, 4) + '-' + s.slice(4); };
  const normCode = (c) => { const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[A-HJ-NP-Z2-9]{8}$/.test(s) ? s.slice(0, 4) + '-' + s.slice(4) : ''; };
  const relayBase = () => { const r = String(settings.partyRelay || 'https://ntfy.sh').replace(/\/+$/, ''); return /^https:\/\/[\w.-]+(:\d+)?$/.test(r) ? r : 'https://ntfy.sh'; };
  const toPage = (m) => pageJS(`window.__ytmdPartyMsg && window.__ytmdPartyMsg(${JSON.stringify(m)})`);
  function enc(obj, key) {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
  }
  function dec(b64, key) {
    try {
      const b = Buffer.from(String(b64), 'base64'); if (b.length < 29) return null;
      const d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
      return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
    } catch (e) { return null; }
  }
  async function subscribe(p) {
    let backoff = 1000;
    while (party === p) {
      try {
        const since = p.lastId ? '&since=' + encodeURIComponent(p.lastId) : '';
        const r = await fetch(`${relayBase()}/${p.topic}/json?x=1${since}`, { signal: p.abort.signal, headers: { Accept: 'application/x-ndjson' } });
        if (!r.ok) throw new Error('relay ' + r.status);
        if (party !== p) return;
        status(p, 'online'); backoff = 1000;
        const reader = r.body.getReader(); const td = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buf += td.decode(value, { stream: true });
          let nl; while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
            let ev = null; try { ev = JSON.parse(line); } catch (e) { continue; }
            if (!ev || ev.event !== 'message') continue;
            if (ev.id) p.lastId = ev.id;
            const m = dec(ev.message, p.key);
            if (m && m.from !== p.id && party === p) toPage(m);
          }
          if (buf.length > 65536) buf = '';
        }
      } catch (e) { if (party !== p) return; }
      if (party !== p) return;
      status(p, 'reconnecting');
      await new Promise((r) => setTimeout(r, backoff)); backoff = Math.min(30000, backoff * 2);
    }
  }
  function status(p, s, extra) { p.status = s; pageJS(`window.__ytmdPartyStatus && window.__ytmdPartyStatus(${JSON.stringify({ code: p.code, host: p.host, id: p.id, status: s, ...(extra || {}) })})`); }
  async function flush(p) {
    if (p.sending || party !== p) return;
    p.sending = true;
    while (p.outbox.length && party === p) {
      const wait = 1100 - (Date.now() - p.lastSend); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const m = p.outbox.shift(); p.lastSend = Date.now();
      try {
        const r = await fetch(`${relayBase()}/${p.topic}`, { method: 'POST', body: enc(m, p.key), headers: { 'Content-Type': 'text/plain', Cache: 'yes' } });
        if (r.status === 429) { status(p, 'limited'); p.outbox.length = 0; break; }
        if (!r.ok) throw new Error('post ' + r.status);
        if (p.status === 'limited') status(p, 'online');
      } catch (e) { if (m.t !== 'state') p.outbox.unshift(m); await new Promise((r) => setTimeout(r, 3000)); }
    }
    p.sending = false;
  }
  function send(m) {
    const p = party; if (!p || !m || typeof m !== 'object') return false;
    const msg = { ...m, from: p.id, name: p.name, ts: Date.now() };
    if (JSON.stringify(msg).length > 2500) return false;
    if (msg.t === 'state') { const i = p.outbox.findIndex((x) => x.t === 'state'); if (i >= 0) p.outbox.splice(i, 1); }   // sadece en güncel durum gitsin
    p.outbox.push(msg); flush(p);
    return true;
  }
  function partyJoin(code, host) {
    partyLeave(true);
    const c = host ? newCode() : normCode(code);
    if (!c) return { ok: false, error: 'Kod geçersiz (ör. ABCD-EF23)' };
    const raw = c.replace('-', '');
    const p = {
      code: c, host: !!host, id: crypto.randomBytes(6).toString('hex'),
      name: String(settings.partyName || os.userInfo().username || 'Dinleyici').slice(0, 24),
      topic: 'ytmd' + crypto.createHash('sha256').update('topic:' + raw).digest('hex').slice(0, 28),
      key: crypto.pbkdf2Sync(raw, 'ytmd-party-v1', 60000, 32, 'sha256'),
      abort: new AbortController(), outbox: [], lastSend: 0, sending: false, lastId: '', status: 'connecting'
    };
    party = p;
    status(p, 'connecting');
    subscribe(p);
    setTimeout(() => { if (party === p) send({ t: 'hello' }); }, 1500);
    onChange();
    return { ok: true, code: c, host: p.host, id: p.id, name: p.name };
  }
  function partyLeave(silent) {
    const p = party; if (!p) return;
    party = null;
    let bye = null; try { bye = enc({ t: 'bye', from: p.id, name: p.name, ts: Date.now() }, p.key); } catch (e) {}
    if (bye) fetch(`${relayBase()}/${p.topic}`, { method: 'POST', body: bye, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    try { p.abort.abort(); } catch (e) {}
    if (!silent) pageJS('window.__ytmdPartyStatus && window.__ytmdPartyStatus(null)');
    onChange();
  }

  // ================= Ayarlar =================
  function setSetting(key, value) {
    switch (key) {
      case 'gameAuto': settings.gameAuto = !!value; saveSettings(); gameWatch(); onChange(); return true;
      case 'gameList': {
        const list = (Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/)).map((s) => String(s).trim()).filter((s) => /^[^\\/:*?"<>|]{1,80}\.exe$/i.test(s)).slice(0, 80);
        settings.gameList = list.length ? list : GAME_DEFAULT.slice(); saveSettings(); if (settings.gameAuto) scanGames(); return true;
      }
      case 'gameManual': toggleGame(!!value); return true;
      case 'remote': settings.remote = !!value; saveSettings(); remoteWatch(); return true;
      case 'remoteReset': settings.remoteToken = crypto.randomBytes(16).toString('hex'); settings.pairedDevices = []; saveSettings(); remoteStop(); remoteWatch(); return true;
      case 'connect': settings.connect = !!value; saveSettings(); remoteWatch(); onChange(); return true;
      case 'partyName': settings.partyName = String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24); saveSettings(); if (party) party.name = settings.partyName || party.name; return true;
      default: return false;
    }
  }

  function start() { gameWatch(); remoteWatch(); }
  function stop() { remoteStop(); partyLeave(true); clearInterval(game.timer); if (game.active) setPriorities(false); }

  return {
    start, stop, setSetting, GAME_DEFAULT,
    game: { toggle: toggleGame, info: gameInfo, isActive: () => game.active, reapply: () => { if (game.active) pageJS('window.__ytmdGame && window.__ytmdGame(true)'); } },
    remote: { info: remoteInfo, push: () => pushRemote(false) },
    energy: energies,
    party: { join: partyJoin, leave: () => partyLeave(false), send, info: () => (party ? { code: party.code, host: party.host, id: party.id, name: party.name, status: party.status } : null) }
  };
};
