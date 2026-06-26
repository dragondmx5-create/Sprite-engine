// test/content.ts — validates the Phase 1 content additions (enemies + items +
// facing): determinism, performance, and writes PNG previews for eyeballing.
// Run in Node. Mirrors the encoder/preview helpers of test/driver.ts but is
// self-contained and writes to a relative ./preview/ dir (portable).

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import {
  generateSprite, generateEnemy, generateItem,
  generateEnemyAnimation, generateAnimation,
  CREATURE_KINDS, ITEM_KINDS,
  solveTwoBone, fabrik,
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

// --- 1b) procedural animation: deterministic, moving, and non-boiling -------
const framesEqual = (a: SpriteBuffer[], b: SpriteBuffer[]) =>
  a.length === b.length && a.every((f, i) => same(f, b[i]));

for (const kind of CREATURE_KINDS) {
  const cfg = { kind, seed: 'anim', size: 40, supersample: 2 } as const;
  const a = generateEnemyAnimation(cfg, 'move');
  const b = generateEnemyAnimation(cfg, 'move');
  check(`enemy ${kind} animation deterministic`, framesEqual(a.frames, b.frames));
  // motion actually happens: at least one frame differs from frame 0
  check(`enemy ${kind} animation moves`, a.frames.some((f, i) => i > 0 && !same(f, a.frames[0])));
  // no "boiling": the average opaque color stays ~constant frame to frame
  const avg = (f: SpriteBuffer) => {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] > 128) { r += f.data[i]; g += f.data[i + 1]; bl += f.data[i + 2]; n++; }
    return n ? [r / n, g / n, bl / n] : [0, 0, 0];
  };
  const a0 = avg(a.frames[0]);
  const stable = a.frames.every((f) => {
    const c = avg(f);
    return Math.abs(c[0] - a0[0]) < 22 && Math.abs(c[1] - a0[1]) < 22 && Math.abs(c[2] - a0[2]) < 22;
  });
  check(`enemy ${kind} animation does not boil`, stable);
}
// new character clips exist and run
for (const name of ['hit', 'death']) {
  const a = generateAnimation({ seed: 'hero', size: 40 }, name);
  check(`character clip ${name} produces frames`, a.frames.length > 0);
}

// --- 1c) IK solvers ---------------------------------------------------------
{
  // two-bone reaches an in-range target exactly, and each bone keeps its length
  const base = { x: 0, y: 0 };
  const target = { x: 6, y: 4 };
  const { knee, foot } = solveTwoBone(base, target, 5, 5, 1);
  const reached = Math.hypot(foot.x - target.x, foot.y - target.y) < 1e-6;
  const l1ok = Math.abs(Math.hypot(knee.x - base.x, knee.y - base.y) - 5) < 1e-4;
  const l2ok = Math.abs(Math.hypot(foot.x - knee.x, foot.y - knee.y) - 5) < 1e-4;
  check('solveTwoBone reaches target', reached);
  check('solveTwoBone preserves bone lengths', l1ok && l2ok);

  // FABRIK converges toward an in-range target for a 4-link chain
  const chain = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 }];
  const out = fabrik(chain, { x: 5, y: 5 }, 16);
  const tipErr = Math.hypot(out[out.length - 1].x - 5, out[out.length - 1].y - 5);
  check('fabrik converges to target', tipErr < 0.05);
  check('fabrik pins the root', Math.hypot(out[0].x - chain[0].x, out[0].y - chain[0].y) < 1e-9);
}

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
