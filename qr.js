// Küçük QR kod üreticisi (bayt modu, hata düzeltme L/M, sürüm 1–10). Bağımlılık yok.
// qr(text, 'M') -> { size, modules: [[bool]] }
'use strict';

const ECC = { L: 0, M: 1 };
const FORMAT_BITS = { L: 1, M: 0 };
// [sürüm][seviye] = [blok başına ECC kod sözcüğü, blok sayısı]
const ECC_CODEWORDS = [null,
  [7, 10], [10, 16], [15, 26], [20, 18], [26, 24], [18, 16], [20, 18], [24, 22], [30, 22], [18, 26]];
const NUM_BLOCKS = [null,
  [1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [2, 4], [2, 4], [2, 4], [2, 5], [4, 5]];

function numRawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
  return r;
}
const numDataCodewords = (ver, lvl) => Math.floor(numRawDataModules(ver) / 8) - ECC_CODEWORDS[ver][ECC[lvl]] * NUM_BLOCKS[ver][ECC[lvl]];

// GF(256) Reed–Solomon
function rsMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
function rsDivisor(deg) {
  const res = new Array(deg).fill(0); res[deg - 1] = 1; let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < res.length; j++) { res[j] = rsMul(res[j], root); if (j + 1 < res.length) res[j] ^= res[j + 1]; }
    root = rsMul(root, 0x02);
  }
  return res;
}
function rsRemainder(data, div) {
  const res = div.map(() => 0);
  for (const b of data) { const f = b ^ res.shift(); res.push(0); div.forEach((c, i) => { res[i] ^= rsMul(c, f); }); }
  return res;
}

function qr(text, level = 'M') {
  const bytes = Array.from(Buffer.from(String(text), 'utf8'));
  let ver = 1;
  for (; ver <= 10; ver++) { const cap = numDataCodewords(ver, level) * 8; if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap) break; }
  if (ver > 10) throw new Error('QR: metin çok uzun');
  // Bit akışı
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4); push(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => push(b, 8));
  const capBits = numDataCodewords(ver, level) * 8;
  push(0, Math.min(4, capBits - bits.length));
  push(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) push(pad, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // Bloklar + ECC + araya serpiştirme
  const nb = NUM_BLOCKS[ver][ECC[level]], eccLen = ECC_CODEWORDS[ver][ECC[level]];
  const rawCw = Math.floor(numRawDataModules(ver) / 8), shortLen = Math.floor(rawCw / nb), numShort = nb - rawCw % nb;
  const div = rsDivisor(eccLen), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1)); k += dat.length;
    const ecc = rsRemainder(dat, div); if (i < numShort) dat.push(0); blocks.push(dat.concat(ecc));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= numShort) all.push(b[i]); });

  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = ver === 1 ? [] : (() => { const n = Math.floor(ver / 7) + 2, step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6]; for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; })();
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = FORMAT_BITS[level] << 3 | mask; let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = (d << 10 | rem) ^ 0x5412;
    const bit = (i) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const b = ver << 12 | rem;
    for (let i = 0; i < 18; i++) { const bt = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bt); set(c, a, bt); }
  }
  // Veri modüllerini yerleştir
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && i < all.length * 8) { mod[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }
  const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x]; };
  const penalty = () => {
    let p = 0;
    const runs = (get) => { for (let a = 0; a < size; a++) { let c = get(a, 0), n = 1; for (let b = 1; b < size; b++) { const v = get(a, b); if (v === c) { n++; if (n === 5) p += 3; else if (n > 5) p++; } else { c = v; n = 1; } } } };
    runs((a, b) => mod[a][b]); runs((a, b) => mod[b][a]);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
    const pat = (get) => { for (let a = 0; a < size; a++) for (let b = 0; b + 10 < size; b++) { const s = []; for (let k = 0; k < 11; k++) s.push(get(a, b + k) ? 1 : 0); const t = s.join(''); if (t === '10111010000' || t === '00001011101') p += 40; } };
    pat((a, b) => mod[a][b]); pat((a, b) => mod[b][a]);
    let dark = 0; mod.forEach((r) => r.forEach((v) => { if (v) dark++; }));
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  return { size, modules: mod };
}

module.exports = { qr };
