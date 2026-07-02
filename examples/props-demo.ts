// =============================================================================
// examples/props-demo.ts — renders every Phase 2 prop to preview/props-sheet.png:
// a labeled grid, each prop with a drop shadow underneath (as it would sit in
// a scene). Run: npx tsx examples/props-demo.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateShadow } from '../src/index';
import { renderScene, type SceneEntity } from '../src/scene';
import type { SpriteBuffer, TileKind } from '../src/index';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

// All 15 requested props: 14 new this phase + barrel (already existed).
const PROPS: TileKind[] = ['barrel', 'crate', 'banner', 'statue', 'shelf', 'cauldron', 'chest', 'well', 'bench', 'planter', 'firewood', 'signpost', 'bucket', 'gravestone', 'lantern'];

const CELL = 96, TS = 40, COLS = 5;
const rows = Math.ceil(PROPS.length / COLS);
const sheetW = COLS * CELL, sheetH = rows * CELL;

const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];
for (let i = 0; i < PROPS.length; i++) {
  const kind = PROPS[i];
  const col = i % COLS, row = (i / COLS) | 0;
  const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2;
  const spr = generateTile({ kind, seed: `props-${kind}`, size: TS, height: Math.round(TS * 1.6), supersample: 2, outline: false } as any);
  const x = cx - spr.width / 2, y = cy + CELL * 0.28 - spr.height;
  shadows.push({ sprite: generateShadow(Math.round(TS * 0.7), 0.35), x: cx - Math.round(TS * 0.7) / 2, y: cy + CELL * 0.22 });
  entities.push({ sprite: spr, x, y });
}
const out = renderScene(sheetW, sheetH, { entities, shadows });
// Solid backdrop so transparent PNG regions are visible when eyeballed
const bg: SpriteBuffer = { width: sheetW, height: sheetH, data: new Uint8ClampedArray(sheetW * sheetH * 4) };
for (let i = 0; i < bg.data.length; i += 4) { bg.data[i] = 40; bg.data[i+1] = 44; bg.data[i+2] = 38; bg.data[i+3] = 255; }
for (let i = 0; i < out.data.length; i += 4) {
  const a = out.data[i+3] / 255, inv = 1 - a;
  bg.data[i]   = out.data[i]   * a + bg.data[i]   * inv;
  bg.data[i+1] = out.data[i+1] * a + bg.data[i+1] * inv;
  bg.data[i+2] = out.data[i+2] * a + bg.data[i+2] * inv;
}
const up = upscale(bg, 2);
writeFileSync('preview/props-sheet.png', png(up.width, up.height, up.data));
console.log(`wrote props-sheet.png (${PROPS.length} props)`);
