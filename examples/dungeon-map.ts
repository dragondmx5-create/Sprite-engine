// =============================================================================
// examples/dungeon-map.ts — a full underground UNDRAL dungeon level: entrance
// chamber -> crystal vault (+ prison cell branch) -> hazard cave (lava, spike
// trap, pit, underground river) -> library -> stairs down, deeper. Pulls the
// darkness.ts system (Phase 3) in for real — ambient light is set NEAR ZERO,
// so the map is genuinely dark except in the radius of each torch_bracket
// (and the lava pool, which glows on its own). This is the "darkness = death"
// mechanic the engine's own header comment for darkness.ts describes.
// Run: npx tsx examples/dungeon-map.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import {
  generateTile, generateSprite, generateEnemy, generateItem, generateShadow,
  generateDarknessOverlay, generateLightGlow, torchFlicker,
} from '../src/index';
import { renderScene, blitOver, type SceneEntity } from '../src/scene';
import type { SpriteBuffer } from '../src/types';
import type { LightSource } from '../src/darkness';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

const TS = 32, COLS = 28, ROWS = 18;

// ---- 1) Room + corridor layout -------------------------------------------
// Default fill is solid rock (stone_wall); rooms/corridors are carved out as
// floor. A hand-built layout (not autotiled) — a built dungeon reads as
// deliberate rectangular rooms and straight corridors, not organic caves.
const kinds: string[] = new Array(COLS * ROWS).fill('stone_wall');
const at = (r: number, c: number) => kinds[r * COLS + c];
const set = (r: number, c: number, k: string) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) kinds[r * COLS + c] = k; };
const fillRect = (r0: number, r1: number, c0: number, c1: number, k: string) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c, k);
};

// Room A — entrance chamber
fillRect(3, 7, 1, 6, 'stone_floor');
set(5, 1, 'stairs_up');
// Corridor A -> B
fillRect(5, 5, 7, 9, 'stone_floor');
// Room B — crystal vault
fillRect(1, 7, 10, 17, 'crystal_floor');
// Corridor B -> C
fillRect(8, 10, 13, 13, 'stone_floor');
// Room C — hazard cave
fillRect(11, 16, 8, 19, 'stone_floor');
// Corridor C -> D
fillRect(13, 13, 20, 21, 'stone_floor');
// Room D — library
fillRect(10, 14, 22, 27, 'wood_floor');
// Corridor A -> E (prison branch)
fillRect(8, 9, 3, 3, 'stone_floor');
// Room E — prison cell
fillRect(10, 12, 1, 5, 'stone_floor');

// Hazard cave features: lava pool, underground river slicing across, a
// couple of stalagmites, a cracked stretch of wall, cobweb in the corner.
fillRect(13, 14, 16, 18, 'lava_floor');
set(14, 9, 'underground_river'); set(14, 10, 'underground_river'); set(14, 11, 'underground_river');
set(12, 10, 'spike_trap');
set(15, 12, 'pit');
set(11, 9, 'stalagmite'); set(16, 19, 'stalagmite');
set(11, 13, 'cracked_wall'); set(11, 14, 'cracked_wall');
set(16, 9, 'cobweb');

// Prison cell: damp, bone-strewn, deliberately left unlit (chain on the wall
// instead of a torch — a cell doesn't get to be cozy).
set(11, 2, 'bone_pile');
set(9, 4, 'chain');
set(12, 1, 'cobweb');
set(11, 4, 'moss_floor'); set(12, 4, 'moss_floor'); set(11, 5, 'moss_floor');

// Vault dressing
set(2, 12, 'pillar'); set(2, 15, 'pillar');
set(4, 13, 'altar');
set(5, 15, 'chest');

// Library dressing
set(10, 23, 'bookshelf'); set(10, 26, 'bookshelf');
set(12, 24, 'table'); set(13, 24, 'bench');
set(14, 26, 'stairs_down'); // the path continues deeper

// Loose dressing in the entrance/corridors
set(3, 5, 'barrel'); set(7, 2, 'crate');

// Torch brackets — mounted directly on wall cells, each becomes a light
// source below. Placed so every room gets at least one, avoiding corridor
// openings (a bracket can't sit where the wall itself is carved away).
const torchCells: [number, number][] = [
  [2, 3],            // room A north wall
  [0, 11], [0, 16],  // room B north wall
  [7, 15],           // room B south wall
  [10, 11],          // room C north wall
  [17, 15],          // room C south wall
  [9, 24],           // room D north wall
];
for (const [r, c] of torchCells) set(r, c, 'torch_bracket');

const tiles = kinds.map((k, i) => {
  const r = (i / COLS) | 0, c = i % COLS;
  return generateTile({ kind: k as any, seed: `t${r}_${c}`, size: TS, supersample: 2, outline: false } as any);
});

// ---- 2) Entities -----------------------------------------------------------
const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];
function addProp(kind: string, seed: string, tx: number, ty: number, size = TS, hMul = 1.4) {
  const spr = generateTile({ kind: kind as any, seed, size, height: Math.round(size * hMul), supersample: 2, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx * TS - (size - TS) / 2, y: ty * TS - (spr.height - TS) });
  return spr;
}
function addChar(cfg: any, tx: number, ty: number) {
  const CS = 44;
  const spr = generateSprite({ size: CS, supersample: 2, ...cfg });
  shadows.push({ sprite: generateShadow(26, 0.35), x: tx * TS + 2, y: ty * TS + 20 });
  entities.push({ sprite: spr, x: tx * TS - (CS - TS) / 2, y: ty * TS - (CS - TS) });
}
function addEnemy(kind: string, seed: string, tx: number, ty: number, size = 36) {
  const spr = generateEnemy({ seed, kind: kind as any, size, supersample: 2 });
  shadows.push({ sprite: generateShadow(20, 0.3), x: tx * TS + 4, y: ty * TS + 18 });
  entities.push({ sprite: spr, x: tx * TS + (TS - size) / 2, y: ty * TS - (size - TS) });
}

// Tall standing walls: plain rock cells adjacent to a carved-out floor cell
// rise up as real entities instead of the flat grid texture (same north/
// side=tall, south/near=short-curb convention used for the house perimeter
// in game-map.ts). Decorated wall tiles (torch_bracket/chain/cracked_wall)
// keep their own unique flat art and are left alone. The flat stone_wall
// tile baked into the grid stays underneath as the backdrop, so there's no
// gap under the tall entity.
const WALL_KINDS = new Set(['stone_wall', 'torch_bracket', 'chain', 'cracked_wall']);
const isFloorCell = (r: number, c: number) => {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return !WALL_KINDS.has(at(r, c));
};
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  if (at(r, c) !== 'stone_wall') continue;
  const northWall = isFloorCell(r + 1, c); // floor to my south -> I'm a far wall -> tall
  const sideWall = isFloorCell(r, c - 1) || isFloorCell(r, c + 1); // side wall -> tall
  const southWall = isFloorCell(r - 1, c); // floor to my north -> I'm a near wall -> short curb
  if (northWall || sideWall) {
    addProp('stone_wall', `w${r}_${c}`, c, r, TS, 1.9);
  } else if (southWall) {
    addProp('stone_wall', `w${r}_${c}`, c, r, TS, 1.0);
  }
}

addChar({ seed: 'hero', weapon: 'sword', shield: true, outfit: { armor: true }, facing: 'front' }, 3, 5);
addChar({ seed: 'guard', weapon: 'sword', shield: true, outfit: { armor: true, hat: 'helmet' }, facing: 'left' }, 6, 4);
addEnemy('shadow', 'sh1', 13, 9);
addEnemy('undead', 'ud1', 3, 11);
addEnemy('bat', 'bt1', 16, 13);
addEnemy('slime', 'sl1', 10, 15);

entities.push({ sprite: generateItem({ seed: 'coin1', kind: 'coin', size: 22, supersample: 2 }), x: 15 * TS + 6, y: 5 * TS + 10 });
entities.push({ sprite: generateItem({ seed: 'key1', kind: 'key', size: 22, supersample: 2 }), x: 4 * TS + 4, y: 11 * TS + 8 });

// ---- 3) Torch light sources -------------------------------------------------
// Each torch_bracket's flame sits near the top-center of its tile (matching
// buildTorchBracket's own s*0.5, s*0.32 flame position) — same (x, y) that
// lit the prop also punches its hole in the darkness below.
const lights: LightSource[] = torchCells.map(([r, c], i) => {
  const flicker = torchFlicker(0.2 + i * 0.13, i);
  return {
    x: c * TS + TS * 0.5, y: r * TS + TS * 0.32,
    radius: 78 * flicker, intensity: 0.95, color: [255, 165, 70],
  };
});
// The lava pool glows on its own too (darkness.ts's own header comment lists
// this as a light source type) — one warm point per lava tile, dimmer/
// smaller than a torch since it's ambient glow, not a focused flame.
for (let r = 13; r <= 14; r++) for (let c = 16; c <= 18; c++) {
  lights.push({ x: c * TS + TS * 0.5, y: r * TS + TS * 0.5, radius: 50, intensity: 0.7, color: [255, 110, 40] });
}

// ---- 4) Compose + darkness --------------------------------------------------
const W = COLS * TS, H = ROWS * TS;
const scene = renderScene(W, H, { tiles, tileSize: TS, tilesPerRow: COLS, entities, shadows });

const glow = generateLightGlow(W, H, lights, 0.35);
blitOver(scene, glow, 0, 0);
// Near-zero ambient — this is the actual "darkness = death" reading: outside
// a torch/lava radius, the corridor is close to pitch black.
const dark = generateDarknessOverlay(W, H, lights, 0.04);
blitOver(scene, dark, 0, 0);

const up = upscale(scene, 3);
writeFileSync('preview/dungeon-map.png', png(up.width, up.height, up.data));
console.log(`wrote dungeon-map.png (${up.width}x${up.height})`);
