/**
 * Generates `public/glass/lens.png`, the displacement map used by the liquid
 * glass button filter (see components/LiquidGlassFilters.tsx).
 *
 * The map encodes a lens: the centre is neutral (128,128) so nothing moves,
 * and the displacement ramps toward the edges so the rim pulls the surface
 * inward. X is stored in the red channel and Y in the green channel, which is
 * what feDisplacementMap reads.
 *
 * Horizontal and vertical ramps are independent of aspect ratio, so the same
 * square map stretches correctly over a wide "Add to cart" and a square icon
 * button alike — no per-size map needed.
 *
 * Run:  node scripts/make-glass-lens.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 128 is plenty: the map is a smooth ramp and the browser samples it
// bilinearly when stretching it over the button, so a larger texture only
// adds bytes. 128 keeps the PNG under 10 kB.
const SIZE = 128;

/** Normalised ramp: 0 below `edge`, 1 at the border, smooth in between. */
const ramp = (edge, value) => {
  const t = Math.min(1, Math.max(0, (Math.abs(value) - edge) / (1 - edge)));
  return t * t * (3 - 2 * t);
};

const pixels = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const u = ((x + 0.5) / SIZE) * 2 - 1;
    const v = ((y + 0.5) / SIZE) * 2 - 1;

    // Pull toward the centre, strongest at the perimeter.
    const dx = -Math.sign(u) * ramp(0.3, u) * 0.6;
    const dy = -Math.sign(v) * ramp(0.5, v) * 0.45;

    const i = (y * SIZE + x) * 4;
    pixels[i] = Math.round(128 + dx * 127);
    pixels[i + 1] = Math.round(128 + dy * 127);
    pixels[i + 2] = 128;
    pixels[i + 3] = 255;
  }
}

// --- minimal PNG writer (truecolour + alpha, no interlacing) ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// Each scanline is prefixed with its filter type (0 = none).
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y += 1) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0;
  pixels.copy(raw, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'glass');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'lens.png');
writeFileSync(outFile, png);
console.log(`wrote ${outFile} (${png.length} bytes)`);
