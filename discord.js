// Bağımlılıksız, minimal Discord Rich Presence istemcisi (yerel IPC borusu üzerinden)
const net = require('net');
const path = require('path');

const OP_HANDSHAKE = 0, OP_FRAME = 1, OP_CLOSE = 2, OP_PING = 3, OP_PONG = 4;

function pipePath(i) {
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${i}`;
  const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || '/tmp';
  return path.join(base, `discord-ipc-${i}`);
}

function encode(op, data) {
  const json = Buffer.from(JSON.stringify(data), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

class DiscordRPC {
  constructor() {
    this.clientId = '';
    this.enabled = false;
    this.socket = null;
    this.ready = false;
    this.buf = Buffer.alloc(0);
    this.activity = null;     // en son istenen durum
    this.lastSentAt = 0;
    this.sendTimer = null;
    this.retryTimer = null;
  }

  configure(clientId, enabled) {
    const changed = clientId !== this.clientId;
    this.clientId = (clientId || '').trim();
    this.enabled = !!enabled && /^\d{15,25}$/.test(this.clientId);
    if (!this.enabled) return this.disconnect();
    if (changed) this.disconnect();
    this.connect();
  }

  connect(i = 0) {
    if (!this.enabled || this.socket) return;
    if (i > 9) return this.scheduleRetry();
    const sock = net.createConnection(pipePath(i));
    let opened = false;
    sock.once('connect', () => {
      opened = true;
      this.socket = sock;
      this.buf = Buffer.alloc(0);
      sock.write(encode(OP_HANDSHAKE, { v: 1, client_id: this.clientId }));
    });
    sock.on('data', (d) => this.onData(d));
    sock.on('error', () => { if (!opened) { sock.destroy(); this.connect(i + 1); } });
    sock.on('close', () => {
      if (!opened) return;
      this.socket = null; this.ready = false;
      this.scheduleRetry();
    });
  }

  scheduleRetry() {
    clearTimeout(this.retryTimer);
    if (this.enabled) this.retryTimer = setTimeout(() => this.connect(), 15000);
  }

  disconnect() {
    clearTimeout(this.retryTimer); clearTimeout(this.sendTimer);
    if (this.socket) { try { this.socket.removeAllListeners('close'); this.socket.destroy(); } catch (e) {} }
    this.socket = null; this.ready = false;
  }

  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 8) {
      const op = this.buf.readInt32LE(0), len = this.buf.readInt32LE(4);
      if (this.buf.length < 8 + len) break;
      let msg = {};
      try { msg = JSON.parse(this.buf.slice(8, 8 + len).toString('utf8')); } catch (e) {}
      this.buf = this.buf.slice(8 + len);
      if (op === OP_PING) this.socket && this.socket.write(encode(OP_PONG, msg));
      else if (op === OP_CLOSE) this.disconnect(), this.scheduleRetry();
      else if (op === OP_FRAME && msg.evt === 'READY') { this.ready = true; this.flush(true); }
    }
  }

  setActivity(activity) {
    this.activity = activity;
    this.flush();
  }

  // Discord sınırı: ~20 sn'de 5 güncelleme. En fazla 4 sn'de bir gönder.
  flush(force) {
    if (!this.ready || !this.socket) return;
    clearTimeout(this.sendTimer);
    const wait = force ? 0 : Math.max(0, 4000 - (Date.now() - this.lastSentAt));
    this.sendTimer = setTimeout(() => {
      if (!this.ready || !this.socket) return;
      this.lastSentAt = Date.now();
      this.socket.write(encode(OP_FRAME, {
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity: this.activity || undefined },
        nonce: Math.random().toString(36).slice(2)
      }));
    }, wait);
  }
}

module.exports = { DiscordRPC, encode };
