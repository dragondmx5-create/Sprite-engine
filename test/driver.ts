// test/driver.ts — runs in Node: determinism, perf, and PNG previews.
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';
import { generateSprite } from '../src/index';
import type { SpriteBuffer } from '../src/types';

// --- minimal PNG encoder (RGBA, filter 0 per row) --------------------------
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const body = new Uint8Array(t.length + data.length);
  body.set(t); body.set(data, t.length);
  const out = new Uint8Array(4 + body.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(body, 4);
  dv.setUint32(4 + body.length, crc32(body));
  return out;
}
function encodePNG(w: number, h: number, rgba: Uint8ClampedArray): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter none
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const idat = deflateSync(raw);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
// nearest-neighbour upscale on a checkerboard background for visibility
function upscaleOnBg(s: SpriteBuffer, k: number): Uint8ClampedArray {
  const W = s.width * k, H = s.height * k;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = ((y / k | 0) * s.width + (x / k | 0)) * 4;
    const a = s.data[si + 3] / 255;
    const cb = (((x >> 3) ^ (y >> 3)) & 1) ? 210 : 170;
    const di = (y * W + x) * 4;
    out[di]   = s.data[si]   * a + cb * (1 - a);
    out[di+1] = s.data[si+1] * a + cb * (1 - a);
    out[di+2] = s.data[si+2] * a + cb * (1 - a);
    out[di+3] = 255;
  }
  return out;
}

// --- 1) determinism --------------------------------------------------------
const cfgA = { seed: 'hyper', size: 64 };
const a1 = generateSprite(cfgA), a2 = generateSprite(cfgA);
const identical = a1.data.length === a2.data.length && a1.data.every((v, i) => v === a2.data[i]);
console.log('determinism (same seed+config => identical):', identical);

const b = generateSprite({ seed: 'other', size: 64 });
const differs = !a1.data.every((v, i) => v === b.data[i]);
console.log('different seed => different sprite:', differs);

// --- 2) perf ---------------------------------------------------------------
let acc = 0; const N = 100;
for (let i = 0; i < N; i++) {
  const t = performance.now();
  generateSprite({ seed: i, size: 64, supersample: 2 });
  acc += performance.now() - t;
}
console.log('avg generate time (64px, ss2):', (acc / N).toFixed(2), 'ms');

// --- 3) PNG previews -------------------------------------------------------
const sheet: { name: string; cfg: Parameters<typeof generateSprite>[0] }[] = [
  { name: 'a_villager', cfg: { seed: 'ember', size: 44 } },
  { name: 'b_redshirt', cfg: { seed: 'pip', size: 44, palette: { cloth: [200, 70, 70] } } },
  { name: 'c_cap',      cfg: { seed: 'cobalt', size: 44, outfit: { hat: 'cap', torso: 'cloth' } } },
  { name: 'd_wizard',   cfg: { seed: 'rune', size: 44, outfit: { hat: 'hat', torso: 'cloth' }, palette: { cloth: [80, 150, 110], hat: [110, 120, 90] } } },
  { name: 'e_knight',   cfg: { seed: 'onyx', size: 44, outfit: { armor: true } } },
  { name: 'f_rogue',    cfg: { seed: 'willow', size: 44, outfit: { torso: 'leather' } } },
  { name: 'g_painterly',cfg: { seed: 'ember', size: 64, supersample: 2, roundness: 0.9, quantize: false } },
  { name: 'h_litright', cfg: { seed: 'ember', size: 44, light: { x: 0.6 } } },
];
for (const { name, cfg } of sheet) {
  const s = generateSprite(cfg);
  const k = 8;
  writeFileSync(`/home/claude/sprite-engine/out_${name}.png`, encodePNG(s.width * k, s.height * k, upscaleOnBg(s, k)));
}
console.log('wrote', sheet.length, 'preview PNGs');
