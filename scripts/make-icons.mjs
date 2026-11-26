// Rysuje ikonę aplikacji (kartka z ogłoszeniem i znak „pasuje”) bez zewnętrznych narzędzi graficznych:
// kształty jako funkcje odległości, wygładzanie krawędzi, zapis PNG przez zlib. Użycie: node scripts/make-icons.mjs
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BRAND = [0x0f, 0x5c, 0x4a];
const WHITE = [255, 255, 255];
const LINE = [0xb9, 0xd3, 0xca];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc(body));
  return Buffer.concat([head, body, tail]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Odległość ze znakiem (ujemna w środku) w układzie 0..1.
const box = (cx, cy, hw, hh, r) => (x, y) => {
  const dx = Math.abs(x - cx) - hw + r;
  const dy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};
const capsule = (ax, ay, bx, by, r) => (x, y) => {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)) - r;
};
const union = (...shapes) => (x, y) => Math.min(...shapes.map((s) => s(x, y)));

const sheet = box(0.5, 0.5, 0.235, 0.305, 0.05);
const lines = union(capsule(0.36, 0.325, 0.64, 0.325, 0.014), capsule(0.36, 0.405, 0.56, 0.405, 0.014));
const check = union(capsule(0.375, 0.6, 0.465, 0.69, 0.031), capsule(0.465, 0.69, 0.635, 0.52, 0.031));

/**
 * layers: [kształt, kolor RGB albo null = wytnij do przezroczystości]. scale zmniejsza znak wokół środka
 * (Android wymaga marginesu wokół pierwszego planu ikony).
 */
function render(size, background, layers, scale = 1) {
  const out = Buffer.alloc(size * size * 4);
  const aa = 1 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size - 0.5) / scale + 0.5;
      const y = ((py + 0.5) / size - 0.5) / scale + 0.5;
      let [r, g, b] = background ?? [0, 0, 0];
      let a = background ? 1 : 0;
      for (const [shape, color] of layers) {
        const cover = Math.max(0, Math.min(1, 0.5 - (shape(x, y) * scale) / aa));
        if (cover === 0) continue;
        if (!color) {
          a *= 1 - cover;
          continue;
        }
        const na = cover + a * (1 - cover);
        r = (color[0] * cover + r * a * (1 - cover)) / na;
        g = (color[1] * cover + g * a * (1 - cover)) / na;
        b = (color[2] * cover + b * a * (1 - cover)) / na;
        a = na;
      }
      out.set([Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)], (py * size + px) * 4);
    }
  }
  return png(size, out);
}

const mark = [
  [sheet, WHITE],
  [lines, LINE],
  [check, BRAND],
];
const dir = new URL('../assets/images/', import.meta.url);
const save = (name, data) => writeFileSync(new URL(name, dir), data);

save('icon.png', render(1024, BRAND, mark));
save('splash-icon.png', render(512, null, mark, 1.5));
save('android-icon-foreground.png', render(1024, null, mark, 0.62));
save('android-icon-background.png', render(1024, BRAND, []));
save('android-icon-monochrome.png', render(1024, null, [[sheet, WHITE], [lines, null], [check, null]], 0.62));
save('favicon.png', render(64, BRAND, mark));
console.log('Zapisano ikony w assets/images');
