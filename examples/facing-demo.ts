// =============================================================================
// examples/facing-demo.ts — Phase 5 (Equipment layers) test render: one
// character, with and without a helmet, in all 8 facing directions. Also
// equipped with a cape and shield so all three "layer" pieces the phase asked
// for (helmet, cape, shield) are visible turning together with the body.
// Run: npx tsx examples/facing-demo.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateSprite } from '../src/index';
import { renderScene, type SceneEntity } from '../src/scene';
import type { SpriteBuffer } from '../src/types';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

// 8 compass points in a natural reading order (N row, mid row w/ E-W, S row) — 9 cells, 'front' repeated as the grid center for a clean 3x3, not double-counted as a distinct direction.
const ORDER = ['back-left','back','back-right','left','front','right','front-left','front','front-right'] as const;

const CS = 56, CELL = 68, COLS = 3;
const rows = Math.ceil(ORDER.length / COLS);

function buildGrid(helmet: boolean): SpriteBuffer {
  const entities: SceneEntity[] = [];
  ORDER.forEach((facing, i) => {
    const col = i % COLS, row = (i / COLS) | 0;
    const spr = generateSprite({
      seed: 'sentinel', size: CS, supersample: 2, facing,
      weapon: 'sword', shield: true,
      outfit: { armor: true, cape: true, hat: helmet ? 'helmet' : 'none' },
      palette: { cape: [200, 55, 55] },
    });
    entities.push({ sprite: spr, x: col * CELL + (CELL - spr.width) / 2, y: row * CELL + (CELL - spr.height) / 2 });
  });
  const out = renderScene(COLS * CELL, rows * CELL, { entities });
  return out;
}

const noHelmet = buildGrid(false);
const withHelmet = buildGrid(true);

const pad = 10;
const sheetW = noHelmet.width * 2 + pad * 3;
const sheetH = noHelmet.height + pad * 2;
const sheet: SpriteBuffer = { width: sheetW, height: sheetH, data: new Uint8ClampedArray(sheetW * sheetH * 4) };
for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 34; sheet.data[i+1] = 38; sheet.data[i+2] = 32; sheet.data[i+3] = 255; }
function blit(dst: SpriteBuffer, src: SpriteBuffer, ox: number, oy: number) {
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const si = (y*src.width+x)*4, a = src.data[si+3]/255, inv = 1-a;
    const di = ((y+oy)*dst.width+(x+ox))*4;
    dst.data[di]   = src.data[si]  *a + dst.data[di]  *inv;
    dst.data[di+1] = src.data[si+1]*a + dst.data[di+1]*inv;
    dst.data[di+2] = src.data[si+2]*a + dst.data[di+2]*inv;
    dst.data[di+3] = 255;
  }
}
blit(sheet, noHelmet, pad, pad);
blit(sheet, withHelmet, pad*2 + noHelmet.width, pad);

const up = upscale(sheet, 4);
writeFileSync('preview/facing-8way.png', png(up.width, up.height, up.data));
console.log('wrote facing-8way.png (left: no helmet, right: helmet — 3x3 grid: back-left/back/back-right, left/front/right, front-left/front/front-right)');
