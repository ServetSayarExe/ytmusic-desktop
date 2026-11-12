# Uygulama simgesini (1024x1024 PNG) çizer. Ek paket gerektirmez; derleme sırasında çalışır.
import struct
import sys
import zlib

N = 1024
SS = 3  # kenar yumuşatma için örnekleme
OUT = sys.argv[1] if len(sys.argv) > 1 else 'icon-1024.png'

RED = (255, 0, 0)
WHITE = (255, 255, 255)
c = N / 2
ring_out, ring_in = N * 0.30, N * 0.255
# Oynat üçgeni (sağa bakan), halkanın içinde ortalanmış
tri = [(c - N * 0.085, c - N * 0.135), (c - N * 0.085, c + N * 0.135), (c + N * 0.145, c)]


def in_tri(x, y):
    (x1, y1), (x2, y2), (x3, y3) = tri
    d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)
    d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3)
    d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)


offs = [(i + 0.5) / SS for i in range(SS)]
total = SS * SS
rows = []
for py in range(N):
    row = bytearray([0])
    dy0 = py - c
    for px in range(N):
        dx0 = px - c
        r2 = dx0 * dx0 + dy0 * dy0
        # Hızlı yol: kesin kırmızı alan
        if r2 > (ring_out + 2) ** 2 or (r2 < (ring_in - 2) ** 2 and abs(dx0) > N * 0.16 or
                                        r2 < (ring_in - 2) ** 2 and abs(dy0) > N * 0.15):
            row += bytes(RED)
            continue
        w = 0
        for oy in offs:
            y = py + oy
            dy = y - c
            for ox in offs:
                x = px + ox
                dx = x - c
                d2 = dx * dx + dy * dy
                if ring_in * ring_in <= d2 <= ring_out * ring_out or in_tri(x, y):
                    w += 1
        a = w / total
        row += bytes(round(RED[i] * (1 - a) + WHITE[i] * a) for i in range(3))
    rows.append(bytes(row))


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 2, 0, 0, 0)) + \
    chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
with open(OUT, 'wb') as f:
    f.write(png)
print('yazıldı:', OUT)
