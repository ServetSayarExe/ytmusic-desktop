// Aynı Wi-Fi'daki iPhone uygulamasının bilgisayarı kendiliğinden bulması için küçük bir mDNS (Bonjour) yayıncısı.
// Ek paket gerektirmez. Sadece "_ytmd._tcp" sorularını yanıtlar; boştayken işlemci kullanmaz.
'use strict';
const dgram = require('dgram');

const GROUP = '224.0.0.251';
const PORT = 5353;
const SERVICE = '_ytmd._tcp.local';
const META = '_services._dns-sd._udp.local';

function encName(name) {
  const parts = name.split('.').filter(Boolean);
  const bufs = parts.map((p) => { const b = Buffer.from(p, 'utf8').subarray(0, 63); return Buffer.concat([Buffer.from([b.length]), b]); });
  return Buffer.concat([...bufs, Buffer.from([0])]);
}

function readName(buf, off) {
  const labels = [];
  let jumped = false, end = off, guard = 0;
  while (off < buf.length && guard++ < 64) {
    const len = buf[off];
    if (len === 0) { if (!jumped) end = off + 1; break; }
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) end = off + 2;
      off = ((len & 0x3f) << 8) | buf[off + 1];
      jumped = true;
      continue;
    }
    labels.push(buf.toString('utf8', off + 1, off + 1 + len));
    off += 1 + len;
  }
  return { name: labels.join('.').toLowerCase(), end };
}

function record(name, type, cls, ttl, rdata) {
  const head = Buffer.alloc(10);
  head.writeUInt16BE(type, 0); head.writeUInt16BE(cls, 2); head.writeUInt32BE(ttl, 4); head.writeUInt16BE(rdata.length, 8);
  return Buffer.concat([encName(name), head, rdata]);
}

/**
 * opts: { name: görünen ad, id, port, getIP: () => '192.168.x.x' }
 */
module.exports = function createMdns(opts) {
  let sock = null;
  const hostName = `ytmd-${String(opts.id).slice(0, 8)}.local`;
  const label = String(opts.name || 'Bilgisayar').replace(/\./g, ' ').slice(0, 60);
  const instance = `${label}.${SERVICE}`;

  function packet(ttl) {
    const ip = opts.getIP();
    if (!ip) return null;
    const txt = [`id=${opts.id}`, `ip=${ip}`, `port=${opts.port()}`, 'v=1']
      .map((s) => { const b = Buffer.from(s, 'utf8'); return Buffer.concat([Buffer.from([b.length]), b]); });
    const srv = Buffer.alloc(6); srv.writeUInt16BE(0, 0); srv.writeUInt16BE(0, 2); srv.writeUInt16BE(opts.port(), 4);
    const answers = [
      record(SERVICE, 12, 1, ttl, encName(instance)),
      record(instance, 33, 0x8001, ttl, Buffer.concat([srv, encName(hostName)])),
      record(instance, 16, 0x8001, ttl, Buffer.concat(txt)),
      record(hostName, 1, 0x8001, ttl, Buffer.from(ip.split('.').map(Number)))
    ];
    const head = Buffer.alloc(12);
    head.writeUInt16BE(0, 0); head.writeUInt16BE(0x8400, 2); head.writeUInt16BE(0, 4);
    head.writeUInt16BE(answers.length, 6); head.writeUInt16BE(0, 8); head.writeUInt16BE(0, 10);
    return Buffer.concat([head, ...answers]);
  }

  function send(ttl) {
    if (!sock) return;
    const p = packet(ttl);
    if (p) sock.send(p, PORT, GROUP, () => {});
  }

  function onMessage(msg) {
    if (msg.length < 12 || (msg.readUInt16BE(2) & 0x8000)) return;   // sadece sorular
    const qd = msg.readUInt16BE(4);
    let off = 12;
    for (let i = 0; i < qd && off < msg.length; i++) {
      const q = readName(msg, off);
      off = q.end + 4;
      if (q.name === SERVICE || q.name === META || q.name === instance.toLowerCase() || q.name === hostName.toLowerCase()) {
        setTimeout(() => send(120), 20 + Math.random() * 100);
        return;
      }
    }
  }

  function start() {
    if (sock) return;
    try {
      sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', () => stop());
      sock.on('message', onMessage);
      sock.bind(PORT, () => {
        try {
          const ip = opts.getIP();
          if (ip) { sock.addMembership(GROUP, ip); sock.setMulticastInterface(ip); } else sock.addMembership(GROUP);
          sock.setMulticastTTL(255);
        } catch (e) {}
        send(120);
        setTimeout(() => send(120), 1000);
        setTimeout(() => send(120), 3000);
      });
    } catch (e) { sock = null; }
  }

  function stop() {
    if (!sock) return;
    try { send(0); } catch (e) {}
    const s = sock; sock = null;
    setTimeout(() => { try { s.close(); } catch (e) {} }, 50);
  }

  return { start, stop, announce: () => send(120) };
};
