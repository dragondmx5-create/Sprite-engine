// =============================================================================
// examples/dusk-demo.ts — Phase 3 (Lighting) test render: a small dusk village
// scene with 3 lit lanterns. Each lantern feeds one `lanternLight` source into
// both a soft warm glow (daytime-safe tint) and the darkness overlay, so the
// lanterns visibly push back the dusk gloom around them.
// Run: npx tsx examples/dusk-demo.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateSprite, generateShadow, generateDarknessOverlay, generateLightGlow, lanternLight } from '../src/index';
import { renderScene, blitOver, type SceneEntity } from '../src/scene';
import { autotileEdges, gridMatcher } from '../src/autotile';
import type { SpriteBuffer } from '../src/types';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

const TS=32, COLS=16, ROWS=12;
const kinds: string[] = [];
for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
  let k = 'grass_floor';
  if (Math.abs(r - 6 - Math.round(Math.sin(c*0.5))) <= 1) k = 'dirt_floor';
  kinds.push(k);
}
// One Cambria-style house
const B = { r0: 1, r1: 5, c0: 2, c1: 7, doorC: 4 };
for (let r=B.r0; r<=B.r1; r++) for (let c=B.c0; c<=B.c1; c++) {
  const isWall = (r===B.r0 || r===B.r1 || c===B.c0 || c===B.c1) && !(r===B.r1 && c===B.doorC);
  kinds[r*COLS+c] = isWall ? 'wood_wall' : 'wood_floor';
}
const isGrass = gridMatcher(kinds, COLS, ROWS, (k) => k === 'grass_floor');
const tiles = kinds.map((k,i)=>{
  const r=(i/COLS)|0, c=i%COLS;
  const edges = k==='dirt_floor' ? autotileEdges(r, c, isGrass) : undefined;
  return generateTile({ kind: k as any, seed: `t${r}_${c}`, size: TS, supersample: 2, outline: false, edges } as any);
});

const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];
function addTall(kind:string, seed:string, tx:number, ty:number, w:number, hMul:number){
  // bare: true so props that paint their own floor slab (bench/lantern/...)
  // don't show it as a hard square over the grass.
  const spr = generateTile({ kind: kind as any, seed, size: w, height: Math.round(w*hMul), supersample: 2, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx*TS-(w-TS)/2, y: ty*TS-(spr.height-TS) });
  return spr;
}
addTall('house','villa1', 4, 3, 110, 1.35);
addTall('tree','oak1', 13, 2, 76, 1.6);
addTall('tree','oak2', 12, 9, 70, 1.6);
addTall('bush','b1', 9, 4, 32, 1.0);
addTall('bench','bn1', 10, 8, 28, 1.6);

// Three lanterns: by the door, at a path bend, and near the bench. Each is
// both a rendered prop AND a light source — the same (x, y) feeds both.
const lanternSpots: [string, number, number][] = [['ln1', 6, 5], ['ln2', 3, 8], ['ln3', 11, 7]];
const lights = lanternSpots.map(([seed, tx, ty], i) => {
  const spr = addTall('lantern', seed, tx, ty, 22, 1.9);
  const lx = tx * TS + TS / 2, ly = ty * TS - (spr.height - TS) + spr.height * 0.16;
  return lanternLight(lx, ly, { phase: 0.31 + i * 0.17, seed: i });
});

function addChar(cfg:any, tx:number, ty:number){
  const CS = 44;
  const spr = generateSprite({ size: CS, supersample: 2, ...cfg });
  shadows.push({ sprite: generateShadow(26, 0.35), x: tx*TS+2, y: ty*TS+20 });
  entities.push({ sprite: spr, x: tx*TS-(CS-TS)/2, y: ty*TS-(CS-TS) });
}
addChar({ seed:'villager', outfit:{hat:'cap'} }, 6, 7);
addChar({ seed:'keeper', outfit:{hat:'bandana'} }, 3, 6);

const W = COLS*TS, H = ROWS*TS;
const scene = renderScene(W, H, { tiles, tileSize: TS, tilesPerRow: COLS, entities, shadows });

// Dusk lighting: a soft warm bloom around each lantern (visible even where
// the darkness overlay below leaves things fairly bright), then the dusk
// gloom itself — dim ambient with each lantern punching a brighter hole.
const glow = generateLightGlow(W, H, lights, 0.24);
blitOver(scene, glow, 0, 0);
const dusk = generateDarknessOverlay(W, H, lights, 0.42);
blitOver(scene, dusk, 0, 0);

const up = upscale(scene, 3);
writeFileSync('preview/dusk-village.png', png(up.width, up.height, up.data));
console.log('wrote dusk-village.png');
