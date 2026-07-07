// =============================================================================
// examples/pixelcrawler-dungeon.ts — a dungeon level built entirely from real
// hand-drawn tiles cropped out of the "Pixel Crawler - Free Pack" asset pack
// (examples/assets/pixel-crawler/, see LICENSE-pixel-crawler.txt), NOT from
// the procedural engine's generateTile()/generateSprite(). This is a
// deliberate, separate sibling to examples/dungeon-map.ts: same room+corridor
// layout idea and the same tall-wall / darkness-overlay conventions, but
// every piece of art is a pixel-perfect crop out of the pack's own
// spritesheets instead of math. Only src/darkness.ts + src/scene.ts's
// blitOver are reused — those are generic SpriteBuffer/lighting utilities
// with no procedural sprite generation in them, so pulling them in doesn't
// mix "generated" tiles into this real-art map.
// Run: npx tsx examples/pixelcrawler-dungeon.ts
// =============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { generateDarknessOverlay, generateLightGlow, torchFlicker, type LightSource } from '../src/darkness';
import { blitOver } from '../src/scene';
import type { SpriteBuffer } from '../src/types';

// ---- tiny self-contained PNG read/write (no external image libs) ----------
interface RawImage { width: number; height: number; data: Buffer; }

function readPNG(path: string): RawImage {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0, height = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(Buffer.from(data));
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = Buffer.alloc(height * stride);
  let prevRow = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const curRow = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? curRow[x - 4] : 0;
      const b = prevRow[x];
      const c = x >= 4 ? prevRow[x - 4] : 0;
      let val = row[x];
      if (filter === 1) val = (val + a) & 255;
      else if (filter === 2) val = (val + b) & 255;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (val + pr) & 255;
      }
      curRow[x] = val;
    }
    curRow.copy(out, y * stride);
    prevRow = curRow;
  }
  return { width, height, data: out };
}
function crc32(b: Uint8Array) { let c = ~0; for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(t: string, d: Uint8Array) { const tt = Uint8Array.from(t, ch => ch.charCodeAt(0)); const body = new Uint8Array(tt.length + d.length); body.set(tt); body.set(d, tt.length); const o = new Uint8Array(4 + body.length + 4); const dv = new DataView(o.buffer); dv.setUint32(0, d.length); o.set(body, 4); dv.setUint32(4 + body.length, crc32(body)); return o; }
function encodePNG(w: number, h: number, rgba: Uint8ClampedArray) {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const idat = deflateSync(raw);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function cropRaw(img: RawImage, x: number, y: number, w: number, h: number): RawImage {
  const out = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const sy = y + yy;
    if (sy < 0 || sy >= img.height) continue;
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4;
      const di = (yy * w + xx) * 4;
      img.data.copy(out, di, si, si + 4);
    }
  }
  return { width: w, height: h, data: out };
}

// alpha-composite src over dst at (ox, oy); dst is a flat Uint8ClampedArray canvas
function blitRaw(dst: Uint8ClampedArray, dstW: number, dstH: number, src: RawImage, ox: number, oy: number) {
  for (let y = 0; y < src.height; y++) {
    const dy = oy + y;
    if (dy < 0 || dy >= dstH) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x;
      if (dx < 0 || dx >= dstW) continue;
      const si = (y * src.width + x) * 4;
      const a = src.data[si + 3] / 255;
      if (a <= 0) continue;
      const di = (dy * dstW + dx) * 4;
      if (a >= 1) {
        dst[di] = src.data[si]; dst[di + 1] = src.data[si + 1]; dst[di + 2] = src.data[si + 2]; dst[di + 3] = 255;
        continue;
      }
      dst[di] = src.data[si] * a + dst[di] * (1 - a);
      dst[di + 1] = src.data[si + 1] * a + dst[di + 1] * (1 - a);
      dst[di + 2] = src.data[si + 2] * a + dst[di + 2] * (1 - a);
      dst[di + 3] = 255 * a + dst[di + 3] * (1 - a);
    }
  }
}

function upscale(w: number, h: number, data: Uint8ClampedArray, k: number) {
  const W = w * k, H = h * k;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = (((y / k) | 0) * w + ((x / k) | 0)) * 4;
    const di = (y * W + x) * 4;
    out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
  }
  return { width: W, height: H, data: out };
}

// ---- 1) Load spritesheets + crop the pieces we use -------------------------
const ASSET_DIR = 'examples/assets/pixel-crawler';
const tiles = readPNG(`${ASSET_DIR}/Dungeon_Tiles.png`);
const props = readPNG(`${ASSET_DIR}/Dungeon_Props.png`);

const T = 16; // native tile size in this pack
const wallBrick = cropRaw(tiles, 16, 16, T, T);       // seamless dark brick wall
const floorStone = cropRaw(tiles, 132, 0, T, T);      // seamless dark stone-grid floor
const floorWood = cropRaw(tiles, 280, 20, T, T);      // seamless wood plank floor
const torch = cropRaw(tiles, 14, 280, 20, 24);        // wall-mounted torch + flame
const archDoor = cropRaw(tiles, 0, 158, 34, 54);       // dark stone archway opening
const banner = cropRaw(tiles, 84, 158, 24, 68);        // hanging red/gold banner

const gate = cropRaw(props, 0, 8, 54, 22);             // spiked iron fence/portcullis
const chain = cropRaw(props, 74, 12, 22, 18);          // hanging wall chain
const shrine = cropRaw(props, 97, 1, 14, 21);          // small stone shrine niche
const coffinA = cropRaw(props, 113, 2, 14, 20);
const coffinB = cropRaw(props, 129, 2, 14, 20);
const spikeFrames = [
  cropRaw(props, 19, 42, 10, 22), cropRaw(props, 35, 44, 10, 20),
  cropRaw(props, 51, 49, 10, 18), cropRaw(props, 67, 34, 10, 21),
  cropRaw(props, 83, 41, 10, 14), cropRaw(props, 99, 41, 10, 19),
  cropRaw(props, 115, 41, 10, 14), cropRaw(props, 3, 49, 10, 15),
];
const bench = cropRaw(props, 11, 85, 42, 8);
const bannerRed = cropRaw(props, 67, 70, 10, 21);
const bannerBlue = cropRaw(props, 83, 70, 10, 21);
const bannerGreen = cropRaw(props, 99, 70, 10, 21);

// ---- 2) Room + corridor layout (tile units, T px each) ---------------------
const COLS = 30, ROWS = 20;
type Kind = 'wall' | 'stone' | 'wood';
const kinds: Kind[] = new Array(COLS * ROWS).fill('wall');
const at = (r: number, c: number) => kinds[r * COLS + c];
const set = (r: number, c: number, k: Kind) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) kinds[r * COLS + c] = k; };
const fillRect = (r0: number, r1: number, c0: number, c1: number, k: Kind) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c, k);
};

fillRect(2, 7, 1, 7, 'stone');   // Room A — entrance chamber
fillRect(4, 5, 7, 10, 'stone');  // corridor A -> B
fillRect(1, 7, 10, 16, 'stone'); // Room B — crypt
fillRect(4, 5, 16, 19, 'stone'); // corridor B -> C
fillRect(2, 8, 19, 26, 'wood');  // Room C — hall
fillRect(8, 9, 4, 6, 'stone');   // corridor A -> D (down)
fillRect(10, 15, 1, 8, 'stone'); // Room D — prison

const isFloor = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS && at(r, c) !== 'wall';

// ---- 3) Compose the canvas --------------------------------------------------
const W = COLS * T, H = ROWS * T;
const canvas = new Uint8ClampedArray(W * H * 4);

// base pass: every cell gets its floor or wall backdrop tile
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const k = at(r, c);
  const img = k === 'wood' ? floorWood : k === 'stone' ? floorStone : wallBrick;
  blitRaw(canvas, W, H, img, c * T, r * T);
}
// tall walls: north/side walls get a second brick tile stacked above them
// (same "rises up but never blocks the near view" convention as the
// procedural dungeon-map.ts) — south/near walls stay a flat single tile.
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  if (at(r, c) !== 'wall') continue;
  const north = isFloor(r + 1, c);
  const side = isFloor(r, c - 1) || isFloor(r, c + 1);
  if (north || side) blitRaw(canvas, W, H, wallBrick, c * T, r * T - T);
}

// arch doorways at the two room entrances that face open corridor
blitRaw(canvas, W, H, archDoor, 1 * T - 8, 4 * T - (archDoor.height - T));
blitRaw(canvas, W, H, archDoor, 19 * T - 8, 4 * T - (archDoor.height - T));

// crypt (Room B) dressing
blitRaw(canvas, W, H, shrine, 13 * T + 1, 2 * T - (shrine.height - T));
blitRaw(canvas, W, H, coffinA, 11 * T + 1, 5 * T - (coffinA.height - T));
blitRaw(canvas, W, H, coffinB, 15 * T + 1, 5 * T - (coffinB.height - T));
blitRaw(canvas, W, H, chain, 10 * T + 3, 1 * T - (chain.height - T));
blitRaw(canvas, W, H, banner, 16 * T - 4, 1 * T - (banner.height - T));

// prison (Room D) dressing — bars on the corridor-facing wall, spike frames,
// a lone chain; deliberately no torch here (a cell doesn't get to be cozy).
blitRaw(canvas, W, H, gate, 4 * T - 11, 10 * T - (gate.height - T) + 2);
blitRaw(canvas, W, H, spikeFrames[0], 2 * T + 3, 12 * T - (spikeFrames[0].height - T));
blitRaw(canvas, W, H, spikeFrames[3], 6 * T + 3, 13 * T - (spikeFrames[3].height - T));
blitRaw(canvas, W, H, spikeFrames[5], 7 * T + 3, 14 * T - (spikeFrames[5].height - T));
blitRaw(canvas, W, H, chain, 2 * T + 3, 10 * T - (chain.height - T));

// hall (Room C) dressing — bench, colored banners
blitRaw(canvas, W, H, bench, 22 * T, 5 * T + 4);
blitRaw(canvas, W, H, bannerRed, 20 * T + 3, 2 * T - (bannerRed.height - T));
blitRaw(canvas, W, H, bannerBlue, 23 * T + 3, 2 * T - (bannerBlue.height - T));
blitRaw(canvas, W, H, bannerGreen, 26 * T + 3, 2 * T - (bannerGreen.height - T));

// torches — one per room, mounted on a north wall cell, plus one in each
// corridor. (r, c) is the wall cell the bracket sits on.
const torchCells: [number, number][] = [
  [1, 4],            // Room A
  [0, 12], [0, 15],  // Room B
  [1, 22], [1, 25],  // Room C
];
for (const [r, c] of torchCells) blitRaw(canvas, W, H, torch, c * T - 2, r * T - (torch.height - T));

// ---- 4) Lighting — same darkness-overlay convention as dungeon-map.ts ------
// (torch flame sits near the top-center of its tile, matching the crop's own
// mount position, so the light hole lines up with the drawn flame.)
const lights: LightSource[] = torchCells.map(([r, c], i) => {
  const flicker = torchFlicker(0.2 + i * 0.13, i);
  return { x: c * T + T * 0.5, y: r * T + T * 0.4, radius: 70 * flicker, intensity: 0.95, color: [255, 165, 70] as [number, number, number] };
});

const scene: SpriteBuffer = { width: W, height: H, data: canvas };
blitOver(scene, generateLightGlow(W, H, lights, 0.35), 0, 0);
blitOver(scene, generateDarknessOverlay(W, H, lights, 0.05), 0, 0);

const up = upscale(W, H, scene.data, 4);
writeFileSync('preview/pixelcrawler-dungeon.png', encodePNG(up.width, up.height, up.data));
console.log(`wrote pixelcrawler-dungeon.png (${up.width}x${up.height})`);
