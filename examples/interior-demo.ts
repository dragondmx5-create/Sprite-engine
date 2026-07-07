// =============================================================================
// examples/interior-demo.ts — Phase 4 (Interior tiles) test render: inside a
// house. wood_floor + a rug, interior_wall perimeter with its ambient-
// occlusion base shadow, and Phase 2 furniture props. Run:
// npx tsx examples/interior-demo.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateSprite, generateShadow } from '../src/index';
import { renderScene, type SceneEntity } from '../src/scene';
import type { SpriteBuffer } from '../src/types';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

const TS=32, COLS=12, ROWS=9;
const R = { r0: 0, r1: 8, c0: 0, c1: 11, doorC: 5 };
const kinds: string[] = [];
for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
  const isWall = (r===R.r0 || r===R.r1 || c===R.c0 || c===R.c1) && !(r===R.r1 && c===R.doorC);
  kinds.push(isWall ? 'interior_wall' : 'wood_floor');
}
// A stone-floor kitchen corner, to show both interior floor kinds together.
for (let r=1; r<=3; r++) for (let c=8; c<=10; c++) kinds[r*COLS+c] = 'stone_floor';
const tiles = kinds.map((k,i)=>{
  const r=(i/COLS)|0, c=i%COLS;
  // Uniform TS height for every grid cell (including walls) — renderScene's
  // tile loop blits each at a fixed col*TS,row*TS with no per-cell height
  // allowance, so an oversized wall sprite would bleed into the row below it.
  return generateTile({ kind: k as any, seed: `t${r}_${c}`, size: TS, supersample: 2, outline: false } as any);
});

const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];
function addProp(kind:string, seed:string, tx:number, ty:number, size = TS){
  const spr = generateTile({ kind: kind as any, seed, size, height: Math.round(size*1.4), supersample: 2, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx*TS-(size-TS)/2, y: ty*TS-(spr.height-TS) });
}
function addRug(tx:number, ty:number, wTiles:number, hTiles:number, seed:string){
  const spr = generateTile({ kind: 'rug' as any, seed, size: wTiles*TS, height: hTiles*TS, supersample: 2, outline: false } as any);
  entities.push({ sprite: spr, x: tx*TS, y: ty*TS, z: ty*TS - 1 });
}
addRug(3, 4, 4, 3, 'rug3');
addProp('bed', 'bd1', 2, 1);
addProp('shelf', 'sh1', 9, 1);
addProp('bookshelf', 'bs1', 1, 1);
addProp('table', 'tb1', 5, 5);
addProp('bench', 'bn1', 5, 6);
addProp('chest', 'ch1', 9, 6);
addProp('cauldron', 'ca1', 10, 2);
addProp('planter', 'pl1', 10, 6);

function addChar(cfg:any, tx:number, ty:number){
  const CS = 44;
  const spr = generateSprite({ size: CS, supersample: 2, ...cfg });
  shadows.push({ sprite: generateShadow(26, 0.35), x: tx*TS+2, y: ty*TS+20 });
  entities.push({ sprite: spr, x: tx*TS-(CS-TS)/2, y: ty*TS-(CS-TS) });
}
addChar({ seed:'keeper', outfit:{hat:'bandana'} }, 4, 6);

const W = COLS*TS, H = ROWS*TS;
const out = renderScene(W, H, { tiles, tileSize: TS, tilesPerRow: COLS, entities, shadows });
const up = upscale(out, 3);
writeFileSync('preview/interior.png', png(up.width, up.height, up.data));
console.log('wrote interior.png');
