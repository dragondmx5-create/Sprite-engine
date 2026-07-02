// =============================================================================
// examples/game-map.ts — a full, clean UNDRAL village/overworld map at ~1080p,
// pulling together every phase from ROADMAP_VISUAL.md: autotiled terrain
// (grass<->dirt, grass<->water, dirt<->stone), the Phase 2 prop library, a
// subtle Phase 3 daytime lantern glow, a Phase 4 interior_wall building, and
// Phase 5 8-way character facing. Run: npx tsx examples/game-map.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateSprite, generateEnemy, generateItem, generateShadow, generateLightGlow, lanternLight } from '../src/index';
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

// Main east-west road (stops before the river).
for (let c = 0; c < 26; c++) {
  const center = 8 + Math.round(Math.sin(c * 0.4));
  for (let r = center - 1; r <= center + 1; r++) set(r, c, 'dirt_floor');
}
// North spur up to house A's door (col 19).
for (let r = 6; r <= 8; r++) set(r, 19, 'dirt_floor');
// River along the east edge.
for (let r = 0; r < ROWS; r++) for (let c = 26; c < COLS; c++) set(r, c, 'water');
// Stone plaza + connecting dirt spur (dirt<->stone transition).
for (let r = 9; r <= 11; r++) for (let c = 3; c <= 6; c++) set(r, c, 'stone_floor');
for (let r = 9; r <= 11; r++) set(r, 7, 'dirt_floor');
// House A interior (Cambria-style: interior_wall perimeter this time, to
// show it alongside wood_wall which village-demo.ts already demonstrates).
const A = { r0: 1, r1: 6, c0: 16, c1: 22, doorC: 19 };
for (let r = A.r0; r <= A.r1; r++) for (let c = A.c0; c <= A.c1; c++) {
  const isWall = (r === A.r0 || r === A.r1 || c === A.c0 || c === A.c1) && !(r === A.r1 && c === A.doorC);
  set(r, c, isWall ? 'interior_wall' : 'wood_floor');
}

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
  const spr = generateTile({ kind: kind as any, seed, size: w, height: Math.round(w * hMul), supersample: 3, outline: false } as any);
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
addProp('gravestone', 'gv3', 24, 14);

// -- Lanterns (also feed the daytime glow below) --
const lanternSpots: [string, number, number][] = [['ln1', 2, 7], ['ln2', 12, 7], ['ln3', 24, 7]];
const lights = lanternSpots.map(([seed, tx, ty], i) => {
  const spr = addTall('lantern', seed, tx, ty, 22, 1.9);
  const lx = tx * TS + TS / 2, ly = ty * TS - (spr.height - TS) + spr.height * 0.16;
  return lanternLight(lx, ly, { phase: 0.2 + i * 0.23, seed: i });
});

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
