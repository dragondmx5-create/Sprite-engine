// =============================================================================
// examples/game-map.ts — a full, clean UNDRAL village/overworld map at ~1080p,
// pulling together every phase from ROADMAP_VISUAL.md: autotiled terrain
// (grass<->dirt, grass<->water, dirt<->stone), the Phase 2 prop library, a
// subtle Phase 3 daytime lantern glow, a Phase 4 interior_wall building, and
// Phase 5 8-way character facing. Run: npx tsx examples/game-map.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateSprite, generateEnemy, generateItem, generateShadow, generateLightGlow, lanternLight, valueNoise2D } from '../src/index';
import { renderScene, blitOver, type SceneEntity } from '../src/scene';
import { autotileEdges, gridMatcher } from '../src/autotile';
import type { SpriteBuffer } from '../src/types';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

const TS = 32, COLS = 30, ROWS = 17;

// ---- 1) Terrain grid ---------------------------------------------------
const kinds: string[] = new Array(COLS * ROWS).fill('grass_floor');
const at = (r: number, c: number) => kinds[r * COLS + c];
const set = (r: number, c: number, k: string) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) kinds[r * COLS + c] = k; };

/**
 * An irregular, organic blob rather than a hard-edged rectangle — every
 * hand-placed rect/circle region reads as an obviously "square" tool shape
 * once you notice the pattern. A rasterized circle (even noise-perturbed)
 * looks like a blocky diamond/cross at only 2-3 tiles of radius — too few
 * grid cells for curvature to read at all — so this grows the patch as a
 * deterministic random walk from the center instead (the standard technique
 * for carving organic blobs/caves on a coarse tile grid): each step queues
 * its still-grass neighbors with a chance to skip, so the frontier grows
 * raggedly rather than as a filled disc. Never eats an already-placed
 * road/plaza/building cell.
 */
function irregularPatch(kind: string, centerR: number, centerC: number, count: number, seed: number) {
  let s = (seed >>> 0) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const visited = new Set<string>();
  const frontier: [number, number][] = [[Math.round(centerR), Math.round(centerC)]];
  let placed = 0;
  while (placed < count && frontier.length) {
    const idx = Math.floor(rand() * frontier.length);
    const [cr, cc] = frontier.splice(idx, 1)[0];
    const key = `${cr},${cc}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
    // Keep exploring PAST a cell that's already something else (e.g. the
    // seed landing on a road tile) instead of dying there — otherwise a
    // patch whose center happens to brush an existing feature silently
    // places zero tiles.
    if (at(cr, cc) === 'grass_floor') { set(cr, cc, kind); placed++; }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (rand() > 0.3) frontier.push([cr + dr, cc + dc]);
    }
  }
}

// Main east-west road (stops before the river) — width wanders between a
// narrow 1-tile footpath and a wide 5-tile stretch instead of a uniform
// band, so it doesn't read as one long straight rectangle.
for (let c = 0; c < 26; c++) {
  const center = 8 + Math.round(Math.sin(c * 0.4) * 1.3);
  const wn = valueNoise2D(c * 0.15, 3.3);
  const half = wn > 0.72 ? 2 : wn < 0.22 ? 0 : 1;
  for (let r = center - half; r <= center + half; r++) set(r, c, 'dirt_floor');
}
// North spur up to house A's door (col 19).
for (let r = 6; r <= 8; r++) set(r, 19, 'dirt_floor');
// River along the east edge.
for (let r = 0; r < ROWS; r++) for (let c = 26; c < COLS; c++) set(r, c, 'water');
// Stone plaza: an irregular blob (not a hard rectangle) + connecting spur.
irregularPatch('stone_floor', 10, 4.5, 18, 40);
for (let r = 9; r <= 11; r++) set(r, 7, 'dirt_floor');
// A handful of scattered worn-dirt clearings so the lawn isn't one uniform
// grass_floor field — well clear of buildings/props. dirt_floor (not
// moss_floor: its grey dungeon-stone palette reads as a broken hole cut
// into the grass rather than a natural ground variant) picks up the same
// autotiled grass fringe as the road, so these blend softly, not as hard
// tile-edged rectangles.
irregularPatch('dirt_floor', 1.5, 11, 14, 71);
irregularPatch('dirt_floor', 5, 23.5, 8, 133);
irregularPatch('dirt_floor', 13, 18, 11, 205);
// House A interior (Cambria-style: interior_wall perimeter this time, to
// show it alongside wood_wall which village-demo.ts already demonstrates).
// The floor fills the WHOLE footprint, walls included — walls are added
// below as tall, bottom-anchored, z-sorted entities (like addTall already
// does for houses/trees), not baked into the flat tile grid. A flat grid
// cell can't rise above its own row, so a wall squeezed into one reads as
// a flat, low curb instead of a real Cambria-style wall with height.
const A = { r0: 1, r1: 6, c0: 16, c1: 22, doorC: 19 };
for (let r = A.r0; r <= A.r1; r++) for (let c = A.c0; c <= A.c1; c++) set(r, c, 'wood_floor');

const isGrass = gridMatcher(kinds, COLS, ROWS, (k) => k === 'grass_floor');
const isDirt = gridMatcher(kinds, COLS, ROWS, (k) => k === 'dirt_floor');
const tiles = kinds.map((k, i) => {
  const r = (i / COLS) | 0, c = i % COLS;
  let edges;
  if (k === 'dirt_floor' || k === 'water') edges = autotileEdges(r, c, isGrass);
  else if (k === 'stone_floor') edges = autotileEdges(r, c, isDirt);
  return generateTile({ kind: k as any, seed: `t${r}_${c}`, size: TS, supersample: 3, outline: false, edges } as any);
});

// ---- 2) Entities ---------------------------------------------------------
const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];

function addTall(kind: string, seed: string, tx: number, ty: number, w: number, hMul: number) {
  // bare: true — several prop builders (well/statue/signpost/lantern/bench/...)
  // paint their own stone floor slab so they double as standalone dungeon
  // tiles; on open grass that slab shows as a hard gray square instead of
  // blending with the terrain underneath, so always skip it out here.
  const spr = generateTile({ kind: kind as any, seed, size: w, height: Math.round(w * hMul), supersample: 3, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx * TS - (w - TS) / 2, y: ty * TS - (spr.height - TS) });
  return spr;
}
function addProp(kind: string, seed: string, tx: number, ty: number, size = TS) {
  const spr = generateTile({ kind: kind as any, seed, size, height: Math.round(size * 1.35), supersample: 3, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx * TS - (size - TS) / 2, y: ty * TS - (spr.height - TS) });
  return spr;
}
function addRug(tx: number, ty: number, wTiles: number, hTiles: number, seed: string) {
  const spr = generateTile({ kind: 'rug' as any, seed, size: wTiles * TS, height: hTiles * TS, supersample: 3, outline: false } as any);
  entities.push({ sprite: spr, x: tx * TS, y: ty * TS, z: ty * TS - 1 });
}

// -- Closed decorative buildings (village-demo proportions) --
addTall('house', 'villa1', 4, 3, 130, 1.35);
addTall('house', 'villa2', 10, 13, 120, 1.35);

// -- House A perimeter walls: one tall entity per cell (not a flat tile),
// z-sorted by its own row. Only the FAR (north) and SIDE walls rise tall —
// the NEAR (south) wall, being the row closest to the viewer, would z-sort
// in front of the furniture in the row just above it and hide the room's
// interior, so it stays a low baseboard like a real open-room threshold.
for (let r = A.r0; r <= A.r1; r++) for (let c = A.c0; c <= A.c1; c++) {
  const isWall = (r === A.r0 || r === A.r1 || c === A.c0 || c === A.c1) && !(r === A.r1 && c === A.doorC);
  if (isWall) addTall('interior_wall', `wA${r}_${c}`, c, r, TS, r === A.r1 ? 1.0 : 1.9);
}

// -- House A interior furnishing (interior rows are 2-5; r0=1/r1=6 are walls) --
addRug(17, 3, 4, 2, 'rugA');
addProp('bed', 'bdA', 17, 2);
addProp('bookshelf', 'bsA', 21, 2);
addProp('table', 'tbA', 20, 4);
addProp('bench', 'bnA', 20, 5);
addProp('planter', 'plA', 18, 5);

// -- Village greenery --
addTall('tree', 'oak1', 1, 2, 78, 1.6);
addTall('tree', 'oak2', 24, 3, 80, 1.6);
addTall('tree', 'oak3', 22, 12, 74, 1.6);
addTall('pine_tree', 'p1', 14, 4, 56, 1.9);
addTall('pine_tree', 'p2', 0, 11, 60, 1.9);
addTall('bush', 'b1', 6, 4, 34, 1.0);
addTall('bush', 'b2', 25, 8, 36, 1.0);
addTall('rock', 'r1', 21, 9, 34, 1.0);
addTall('flowers', 'fl1', 9, 4, 30, 1.0);
addTall('flowers', 'fl2', 2, 8, 30, 1.0);
addTall('flowers', 'fl3', 16, 10, 30, 1.0);
addTall('fence', 'f1', 3, 13, 30, 1.0);
addTall('fence', 'f2', 4, 13, 30, 1.0);

// -- Village amenities (Phase 2 props) --
addTall('well', 'well1', 10, 8, 30, 1.7);
addProp('bench', 'bn1', 11, 9);
addProp('planter', 'pl1', 9, 9);
addTall('statue', 'st1', 15, 9, 28, 1.8);
addTall('signpost', 'sg1', 1, 8, 22, 1.6);
addProp('crate', 'cr1', 9, 15);
addProp('barrel', 'br1', 11, 15);
addProp('firewood', 'fw1', 12, 15);
addProp('bucket', 'bk1', 8, 15);

// -- Small graveyard corner --
addTall('dead_tree', 'dt1', 23, 13, 60, 1.7);
addProp('gravestone', 'gv1', 22, 14);
addProp('gravestone', 'gv2', 23, 15);
addTall('root', 'rt1', 23, 13.6, 30, 1.0); // spreading at the dead tree's base
addTall('root', 'rt2', 1, 3, 26, 1.0);     // and under oak1
addProp('gravestone', 'gv3', 24, 14);

// -- Lanterns (also feed the daytime glow below) --
const lanternSpots: [string, number, number][] = [['ln1', 2, 7], ['ln2', 12, 7], ['ln3', 24, 7]];
const lights = lanternSpots.map(([seed, tx, ty], i) => {
  const spr = addTall('lantern', seed, tx, ty, 22, 1.9);
  const lx = tx * TS + TS / 2, ly = ty * TS - (spr.height - TS) + spr.height * 0.16;
  return lanternLight(lx, ly, { phase: 0.2 + i * 0.23, seed: i });
});

// -- Ground-scatter detail pass: dozens of small pebble clusters/flowers
// instead of the handful of hand-placed props above, so the terrain doesn't
// read as a repeating tile pattern with a few decorations sprinkled on top
// (a lone rock/flowers prop every several tiles is too sparse to break that
// up — real ground has this stuff everywhere). Skips a small circular
// "keep clear" buffer around each hand-placed cluster so scatter doesn't
// crowd it — a first pass used big rectangular exclusion zones and ended up
// covering 70% of the map (the road alone runs through most of them),
// leaving almost nothing to scatter onto; small radii around actual anchor
// points instead of sweeping rectangles fixes that.
const noScatterPoints: [number, number, number][] = [
  [3, 4, 3.5],     // villa1
  [3.5, 19, 4.5],  // house A
  [8, 10, 1.8],    // well
  [9, 15, 1.8],    // statue
  [13, 10, 4.5],   // villa2
  [15, 10, 2.2],   // crates row
  [8, 1, 1.8],     // signpost
  [13.5, 23, 3.2], // graveyard
  // Trees/bushes/rock/flowers/fence placed above — a first pass forgot
  // these, so a good chunk of the scatter pass landed directly under a wide
  // tree canopy and got completely z-order-hidden behind it (found by
  // dumping exact placement coordinates and cropping the actual pixels —
  // it wasn't a placement bug, the props render fine, they were just
  // invisible under existing foliage).
  [2, 1, 2.4], [3, 24, 2.5], [12, 22, 2.3], [4, 14, 1.9], [11, 0, 2.0],
  [4, 6, 1.3], [8, 25, 1.3], [9, 21, 1.3], [4, 9, 1.1], [8, 2, 1.1], [10, 16, 1.1],
  [13, 3, 1.1], [13, 4, 1.1],
];
const inScatterZone = (r: number, c: number) => noScatterPoints.some(([pr, pc, rad]) => Math.hypot(r - pr, c - pc) < rad);
// Raw uniform hash for the "place or not" roll — valueNoise2D is smoothly
// INTERPOLATED (a weighted average of 4 lattice corners), which clusters
// values toward 0.5 rather than spreading them uniformly across [0,1); a
// hand-rolled LCG single-stepped from small sequential seeds was worse
// still (stayed biased high for every seed this loop actually used, so
// nothing was ever placed). This is the same hash noise.ts's smooth noise
// is built on, just used raw/unfiltered here since chance thresholds need
// an actually-uniform distribution.
function hashRoll(x: number, y: number, salt: number): number {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
let scatterN = 0;
function scatter(kind: string, r: number, c: number, chance: number, sizeMin: number, sizeMax: number) {
  if (inScatterZone(r, c)) return;
  scatterN++;
  if (hashRoll(c, r, scatterN) > chance) return;
  const sizeT = valueNoise2D(c * 5.3 + scatterN, r * 5.3 - scatterN, scatterN + 51);
  const size = Math.round(sizeMin + sizeT * (sizeMax - sizeMin));
  const jx = valueNoise2D(c * 7.7 - scatterN, r * 7.7 + scatterN, scatterN + 97) - 0.5;
  const jy = valueNoise2D(c * 7.7 + scatterN, r * 7.7 - scatterN, scatterN + 131) - 0.5;
  addTall(kind, `sc${scatterN}`, c + jx * 0.6, r + jy * 0.6, size, 1.0);
}
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const k = at(r, c);
  if (k === 'dirt_floor' || k === 'stone_floor') scatter('pebbles', r, c, 0.3, 22, 32);
  else if (k === 'grass_floor') {
    scatter('flowers', r, c, 0.08, 28, 38);
    scatter('pebbles', r, c, 0.06, 20, 28);
  }
}

// -- Characters (Phase 5: a spread of 8-way facings) --
function addChar(cfg: any, tx: number, ty: number) {
  const CS = 46;
  const spr = generateSprite({ size: CS, supersample: 3, ...cfg });
  shadows.push({ sprite: generateShadow(28, 0.35), x: tx * TS + 2, y: ty * TS + 20 });
  entities.push({ sprite: spr, x: tx * TS - (CS - TS) / 2, y: ty * TS - (CS - TS) });
}
addChar({ seed: 'hero', weapon: 'sword', shield: true, outfit: { armor: true }, facing: 'front' }, 10, 9);
addChar({ seed: 'mage', weapon: 'staff', outfit: { hat: 'wizard', torso: 'robe' }, facing: 'front-left' }, 8, 10);
addChar({ seed: 'villager', outfit: { hat: 'cap' }, facing: 'right' }, 12, 14);
addChar({ seed: 'guard', weapon: 'sword', shield: true, outfit: { armor: true, hat: 'helmet', cape: true }, facing: 'back-left' }, 21, 13);
addChar({ seed: 'keeper', outfit: { hat: 'bandana' }, facing: 'left' }, 18, 7);
addChar({ seed: 'kid', body: { headScale: 1.1, limbLength: 0.85 }, facing: 'front-right' }, 15, 10);

// -- A little life/danger --
entities.push({ sprite: generateEnemy({ seed: 'sl1', kind: 'slime' as any, size: 40, supersample: 3 }), x: 22 * TS - 4, y: 15 * TS - 10 });
entities.push({ sprite: generateItem({ seed: 'chest1', kind: 'chest', size: 36, supersample: 3 }), x: 9 * TS - 2, y: 13 * TS - 4 });
entities.push({ sprite: generateItem({ seed: 'coin1', kind: 'coin', size: 24, supersample: 3 }), x: 5 * TS + 6, y: 10 * TS + 8 });
entities.push({ sprite: generateItem({ seed: 'mush1', kind: 'mushroom', size: 24, supersample: 3 }), x: 2 * TS + 4, y: 5 * TS + 10 });

// ---- 3) Compose + a soft daytime lantern glow (Phase 3, no darkness overlay) ----
const W = COLS * TS, H = ROWS * TS;
const scene = renderScene(W, H, { tiles, tileSize: TS, tilesPerRow: COLS, entities, shadows });
const glow = generateLightGlow(W, H, lights, 0.14);
blitOver(scene, glow, 0, 0);

const up = upscale(scene, 2);
writeFileSync('preview/game-map.png', png(up.width, up.height, up.data));
console.log(`wrote game-map.png (${up.width}x${up.height})`);
