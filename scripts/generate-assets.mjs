/**
 * Generates all PNG app icons and pixel-art game sprites locally.
 * No external binaries or image libraries are required.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

function writePng(path, width, height, painter) {
  const pixels = Buffer.alloc(width * height * 4);
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a;
  };
  const rect = (x, y, w, h, color) => {
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) set(xx, yy, color);
  };
  painter({ set, rect, width, height });
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, png);
}

const C = {
  night: [9, 12, 22], border: [220, 38, 38], bone: [226, 232, 240], coat: [30, 41, 63],
  gold: [250, 204, 21], green: [34, 197, 94], wall: [52, 58, 74], floor: [24, 29, 43],
  desk: [120, 72, 45], door: [110, 38, 45], monster: [22, 24, 35], eye: [255, 70, 70],
};

// App icons: dark tile, red frame, blocky "LL" mark and an alert eye.
function icon(size) {
  const s = size / 64;
  writePng(join('apps/web/public/icons', `icon-${size}x${size}.png`), size, size, ({ rect }) => {
    rect(0, 0, size, size, C.night);
    rect(0, 0, size, Math.round(4 * s), C.border);
    rect(0, size - Math.round(4 * s), size, Math.round(4 * s), C.border);
    rect(0, 0, Math.round(4 * s), size, C.border);
    rect(size - Math.round(4 * s), 0, Math.round(4 * s), size, C.border);
    // Two bold L shapes
    rect(Math.round(14 * s), Math.round(15 * s), Math.round(7 * s), Math.round(32 * s), C.bone);
    rect(Math.round(14 * s), Math.round(42 * s), Math.round(18 * s), Math.round(6 * s), C.bone);
    rect(Math.round(35 * s), Math.round(15 * s), Math.round(7 * s), Math.round(32 * s), C.border);
    rect(Math.round(35 * s), Math.round(42 * s), Math.round(17 * s), Math.round(6 * s), C.border);
    // Eye glint
    rect(Math.round(43 * s), Math.round(22 * s), Math.round(4 * s), Math.round(4 * s), C.gold);
  });
}
icon(192);
icon(512);
icon(64);

const sprites = join('apps/web/public/game/sprites');
writePng(join(sprites, 'player.png'), 32, 32, ({ rect }) => {
  rect(11, 3, 10, 9, C.bone); rect(12, 2, 8, 2, C.coat);
  rect(8, 12, 16, 16, C.coat); rect(6, 16, 4, 10, [70, 85, 110]);
  rect(24, 14, 5, 3, C.gold); rect(12, 14, 3, 2, [10, 12, 18]); rect(18, 14, 3, 2, [10, 12, 18]);
  rect(10, 28, 5, 4, [15, 20, 30]); rect(18, 28, 5, 4, [15, 20, 30]);
});
writePng(join(sprites, 'monster.png'), 40, 40, ({ rect }) => {
  rect(8, 6, 24, 26, C.monster); rect(4, 12, 6, 18, C.monster); rect(30, 12, 6, 18, C.monster);
  rect(12, 13, 6, 4, C.eye); rect(22, 13, 6, 4, C.eye);
  rect(14, 24, 12, 2, [120, 20, 30]); rect(10, 32, 6, 6, C.monster); rect(24, 32, 6, 6, C.monster);
});
writePng(join(sprites, 'key.png'), 24, 24, ({ rect }) => {
  rect(5, 4, 14, 4, C.gold); rect(14, 7, 4, 8, C.gold);
  rect(11, 13, 4, 3, C.gold); rect(11, 16, 3, 4, C.gold);
});
writePng(join(sprites, 'battery.png'), 24, 24, ({ rect }) => {
  rect(7, 3, 10, 3, [160, 170, 185]); rect(5, 6, 14, 15, [40, 50, 60]);
  rect(7, 8, 10, 11, C.green); rect(11, 6, 2, 2, [200, 210, 220]);
});
writePng(join(sprites, 'wall.png'), 40, 40, ({ rect }) => {
  rect(0, 0, 40, 40, C.wall); rect(0, 0, 40, 2, [75, 82, 100]);
  rect(0, 19, 40, 2, [35, 40, 54]); rect(19, 0, 2, 19, [35, 40, 54]); rect(8, 23, 2, 14, [35, 40, 54]);
});
writePng(join(sprites, 'floor.png'), 40, 40, ({ rect }) => {
  rect(0, 0, 40, 40, C.floor); rect(0, 0, 40, 1, [32, 38, 55]); rect(0, 0, 1, 40, [32, 38, 55]);
  rect(20, 20, 2, 2, [45, 52, 72]);
});
writePng(join(sprites, 'desk.png'), 40, 40, ({ rect }) => {
  rect(2, 4, 36, 20, C.desk); rect(2, 4, 36, 3, [160, 100, 62]);
  rect(5, 24, 5, 13, [70, 42, 28]); rect(30, 24, 5, 13, [70, 42, 28]);
  rect(12, 10, 16, 8, [180, 190, 200]);
});
writePng(join(sprites, 'door.png'), 48, 64, ({ rect }) => {
  rect(0, 0, 48, 64, C.door); rect(4, 4, 40, 56, [82, 30, 38]);
  rect(8, 10, 32, 18, [40, 24, 30]); rect(8, 34, 32, 18, [40, 24, 30]);
  rect(37, 31, 4, 4, C.gold);
});
writePng(join(sprites, 'exit.png'), 48, 64, ({ rect }) => {
  rect(0, 0, 48, 64, [16, 60, 40]); rect(4, 4, 40, 56, [22, 100, 60]);
  rect(20, 26, 8, 4, [180, 255, 200]);
});
writePng(join(sprites, 'glow.png'), 128, 128, ({ set }) => {
  for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
    const d = Math.hypot(x - 64, y - 64) / 64;
    const a = Math.max(0, Math.round(255 * (1 - d) ** 2));
    set(x, y, [255, 255, 255, a]);
  }
});

console.log('Generated PWA icons and game sprites.');
