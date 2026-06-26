// test/content.ts — validates the Phase 1 content additions (enemies + items +
// facing): determinism, performance, and writes PNG previews for eyeballing.
// Run in Node. Mirrors the encoder/preview helpers of test/driver.ts but is
// self-contained and writes to a relative ./preview/ dir (portable).

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import {
  generateSprite, generateEnemy, generateItem,
  CREATURE_KINDS, ITEM_KINDS,
} from '../src/index';
import type { SpriteBuffer } from '../src/types';

// --- minimal PNG encoder ----------------------------------------------------
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const body = new Uint8Array(t.length + data.length); body.set(t); body.set(data, t.length);
  const out = new Uint8Array(4 + body.length + 4); const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length); out.set(body, 4); dv.setUint32(4 + body.length, crc32(body));
  return out;
}
function encodePNG(w: number, h: number, rgba: Uint8ClampedArray): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const idat = deflateSync(raw);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function upscaleOnBg(s: SpriteBuffer, k: number): Uint8ClampedArray {
  const W = s.width * k, H = s.height * k; const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = (((y / k) | 0) * s.width + ((x / k) | 0)) * 4; const a = s.data[si + 3] / 255; const di = (y * W + x) * 4;
    out[di] = s.data[si] * a + 30 * (1 - a); out[di + 1] = s.data[si + 1] * a + 26 * (1 - a); out[di + 2] = s.data[si + 2] * a + 22 * (1 - a); out[di + 3] = 255;
  }
  return out;
}
const same = (a: SpriteBuffer, b: SpriteBuffer) =>
  a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);

let failures = 0;
const check = (label: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) failures++; };

// --- 1) determinism: same seed+config => byte-identical ---------------------
for (const kind of CREATURE_KINDS) {
  const c = { kind, seed: 'det', size: 40, supersample: 2 } as const;
  check(`enemy ${kind} deterministic`, same(generateEnemy(c), generateEnemy(c)));
}
for (const kind of ITEM_KINDS) {
  const c = { kind, seed: 'det', size: 40, supersample: 2 } as const;
  check(`item ${kind} deterministic`, same(generateItem(c), generateItem(c)));
}
// different seed => different pixels
check('enemy seed varies', !same(
  generateEnemy({ kind: 'insect', seed: 'a', size: 40 }),
  generateEnemy({ kind: 'insect', seed: 'b', size: 40 }),
));
// facing changes the character (front vs back must differ)
check('facing changes sprite', !same(
  generateSprite({ seed: 'hero', size: 40, facing: 'front' }),
  generateSprite({ seed: 'hero', size: 40, facing: 'back' }),
));
// facing='front' is byte-identical to the default (no facing) — back-compat
check('facing front == default', same(
  generateSprite({ seed: 'hero', size: 40 }),
  generateSprite({ seed: 'hero', size: 40, facing: 'front' }),
));

// --- 2) perf: a creature/item should generate in a few ms -------------------
let acc = 0; const N = 100;
for (let i = 0; i < N; i++) {
  const t = performance.now();
  generateEnemy({ kind: CREATURE_KINDS[i % 3], seed: i, size: 32, supersample: 2 });
  acc += performance.now() - t;
}
console.log(`avg generateEnemy (32px, ss2): ${(acc / N).toFixed(2)} ms`);

// --- 3) PNG previews --------------------------------------------------------
mkdirSync('preview', { recursive: true });
const previews: { name: string; sprite: SpriteBuffer }[] = [];
for (const kind of CREATURE_KINDS) {
  previews.push({ name: `enemy_${kind}`, sprite: generateEnemy({ kind, seed: kind, size: 48, supersample: 2 }) });
  previews.push({ name: `enemy_${kind}_alert`, sprite: generateEnemy({ kind, seed: kind, size: 48, supersample: 2, alerted: true }) });
}
for (const kind of ITEM_KINDS) previews.push({ name: `item_${kind}`, sprite: generateItem({ kind, seed: kind, size: 48, supersample: 2 }) });
for (const facing of ['front', 'back', 'left', 'right'] as const) previews.push({ name: `face_${facing}`, sprite: generateSprite({ seed: 'hero', size: 48, supersample: 2, facing }) });
const k = 6;
for (const { name, sprite } of previews) writeFileSync(`preview/${name}.png`, encodePNG(sprite.width * k, sprite.height * k, upscaleOnBg(sprite, k)));
console.log(`wrote ${previews.length} preview PNGs to ./preview/`);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nall checks passed');
