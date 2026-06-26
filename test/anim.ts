// test/anim.ts — validates animation determinism/stability and renders previews.
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';
import { generateAnimation, packSpriteSheet, listAnimations } from '../src/animation';
import type { SpriteBuffer } from '../src/types';

// --- minimal PNG encoder (RGBA) -------------------------------------------
function crc32(buf: Uint8Array): number { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type: string, data: Uint8Array): Uint8Array { const t = Uint8Array.from(type, (ch) => ch.charCodeAt(0)); const body = new Uint8Array(t.length + data.length); body.set(t); body.set(data, t.length); const out = new Uint8Array(4 + body.length + 4); const dv = new DataView(out.buffer); dv.setUint32(0, data.length); out.set(body, 4); dv.setUint32(4 + body.length, crc32(body)); return out; }
function encodePNG(w: number, h: number, rgba: Uint8ClampedArray): Uint8Array { const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; const raw = new Uint8Array(h * (w * 4 + 1)); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); } const idat = deflateSync(raw); const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]; const total = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }
function upscaleOnBg(s: SpriteBuffer, k: number): Uint8ClampedArray { const W = s.width * k, H = s.height * k; const out = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const si = ((y / k | 0) * s.width + (x / k | 0)) * 4; const a = s.data[si + 3] / 255; const cb = (((x >> 3) ^ (y >> 3)) & 1) ? 205 : 170; const di = (y * W + x) * 4; out[di] = s.data[si] * a + cb * (1 - a); out[di + 1] = s.data[si + 1] * a + cb * (1 - a); out[di + 2] = s.data[si + 2] * a + cb * (1 - a); out[di + 3] = 255; } return out; }

const eq = (a: SpriteBuffer, b: SpriteBuffer) => a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);
const dominantColor = (s: SpriteBuffer): string => { const m = new Map<string, number>(); for (let i = 0; i < s.data.length; i += 4) { if (s.data[i + 3] < 250) continue; if (s.data[i] + s.data[i + 1] + s.data[i + 2] < 110) continue; const k = `${s.data[i]},${s.data[i + 1]},${s.data[i + 2]}`; m.set(k, (m.get(k) || 0) + 1); } let best = '', bc = -1; for (const [k, c] of m) if (c > bc) { bc = c; best = k; } return best; };

const cfg = { seed: 'hero', size: 48 };

// --- 1) determinism: same seed+config+anim => identical frames -------------
for (const name of listAnimations()) {
  const a = generateAnimation(cfg, name);
  const b = generateAnimation(cfg, name);
  const same = a.frames.length === b.frames.length && a.frames.every((f, i) => eq(f, b.frames[i]));
  console.log(`determinism [${name}]: ${same}  (frames=${a.frameCount}, fps=${a.fps}, loop=${a.loop})`);
}

// --- 2) different seed => different frames ----------------------------------
{
  const a = generateAnimation({ seed: 'hero', size: 48 }, 'walk');
  const b = generateAnimation({ seed: 'other', size: 48 }, 'walk');
  console.log('different seed => different:', !eq(a.frames[0], b.frames[0]));
}

// --- 3) animation actually moves (consecutive walk frames differ) ----------
{
  const w = generateAnimation(cfg, 'walk');
  let moved = false;
  for (let i = 1; i < w.frames.length; i++) if (!eq(w.frames[i], w.frames[i - 1])) moved = true;
  console.log('walk frames change over time:', moved);
}

// --- 4) temporal stability proxy: dominant body color is constant ----------
//     (no "boiling": the large flat-lit torso keeps the same core color every
//      frame for non-leaning clips).
for (const name of ['walk', 'idle']) {
  const a = generateAnimation(cfg, name);
  const cols = a.frames.map(dominantColor);
  const stable = cols.every((c) => c === cols[0]);
  console.log(`dominant-color stability [${name}]: ${stable}  (${cols[0]})`);
}

// --- 5) perf: full walk cycle ----------------------------------------------
{
  let acc = 0; const N = 50;
  for (let i = 0; i < N; i++) { const t = performance.now(); generateAnimation({ seed: i, size: 48 }, 'walk'); acc += performance.now() - t; }
  const w = generateAnimation(cfg, 'walk');
  console.log(`avg walk cycle (${w.frameCount} frames @48px): ${(acc / N).toFixed(2)} ms  (${(acc / N / w.frameCount).toFixed(2)} ms/frame)`);
}

// --- 6) render montages (each anim, frames left→right) + a spritesheet ------
const K = 7;
for (const name of listAnimations()) {
  const a = generateAnimation({ seed: 'hero', size: 48, outfit: { hat: name === 'attack' ? 'cap' : 'none' } }, name);
  const sheet = packSpriteSheet(a.frames);                 // horizontal strip
  // raw spritesheet (1x) for actual use
  writeFileSync(`preview/sheet_${name}.png`, encodePNG(sheet.width, sheet.height, sheet.data));
  // upscaled preview strip
  writeFileSync(`preview/anim_${name}.png`, encodePNG(sheet.width * K, sheet.height * K, upscaleOnBg(sheet, K)));
}
console.log('wrote anim_* preview strips and sheet_* raw spritesheets for:', listAnimations().join(', '));
