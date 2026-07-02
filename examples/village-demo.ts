// =============================================================================
// examples/village-demo.ts — renders a full Cambria-style village scene to
// preview/village.png: grass/dirt autotiled paths, a river shore, closed 3/4
// houses, an open wood-floor interior with bare furniture props, characters,
// props and an enemy. Run: npx tsx examples/village-demo.ts
// =============================================================================
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generateTile, generateSprite, generateEnemy, generateItem, generateShadow } from '../src/index';
import { renderScene, type SceneEntity } from '../src/scene';
import type { SpriteBuffer } from '../src/types';
function crc32(b:Uint8Array){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t:string,d:Uint8Array){const tt=Uint8Array.from(t,ch=>ch.charCodeAt(0));const body=new Uint8Array(tt.length+d.length);body.set(tt);body.set(d,tt.length);const o=new Uint8Array(4+body.length+4);const dv=new DataView(o.buffer);dv.setUint32(0,d.length);o.set(body,4);dv.setUint32(4+body.length,crc32(body));return o;}
function png(w:number,h:number,rgba:Uint8ClampedArray){const sig=new Uint8Array([137,80,78,71,13,10,26,10]);const ihdr=new Uint8Array(13);const dv=new DataView(ihdr.buffer);dv.setUint32(0,w);dv.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++){raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);}const idat=deflateSync(raw);const parts=[sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',new Uint8Array(0))];const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function upscale(s: SpriteBuffer, k:number): SpriteBuffer {const W=s.width*k,H=s.height*k;const out=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(((y/k)|0)*s.width+((x/k)|0))*4;const di=(y*W+x)*4;out[di]=s.data[si];out[di+1]=s.data[si+1];out[di+2]=s.data[si+2];out[di+3]=s.data[si+3];}return {width:W,height:H,data:out};}

const TS=32, COLS=24, ROWS=15;
const kinds: string[] = [];
for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
  let k = 'grass_floor';
  // main horizontal road + vertical branch
  if (Math.abs(r - 8 - Math.round(Math.sin(c*0.5))) <= 1) k = 'dirt_floor';
  if (c >= 11 && c <= 12 && r < 8) k = 'dirt_floor';
  // river along right edge
  if (c >= 21 && (c - 21) + Math.round(Math.sin(r*0.8)) >= 0 && c>=22-((r%5)?0:1)) k = 'water';
  kinds.push(k);
}
// Cambria-style open building: wood walls around a plank-floor interior
const B = { r0: 1, r1: 6, c0: 13, c1: 19, doorC: 16 };
for (let r=B.r0; r<=B.r1; r++) for (let c=B.c0; c<=B.c1; c++) {
  const isWall = (r===B.r0 || r===B.r1 || c===B.c0 || c===B.c1) && !(r===B.r1 && c===B.doorC);
  kinds[r*COLS+c] = isWall ? 'wood_wall' : 'wood_floor';
}
const at = (r:number,c:number)=> (r<0||r>=ROWS||c<0||c>=COLS)?'grass_floor':kinds[r*COLS+c];
const isG = (r:number,c:number)=> at(r,c)==='grass_floor';
const tiles = kinds.map((k,i)=>{
  const r=(i/COLS)|0, c=i%COLS;
  let edges;
  if (k==='dirt_floor' || k==='water') {
    const n=isG(r-1,c), s_=isG(r+1,c), w=isG(r,c-1), e=isG(r,c+1);
    edges = { n, s: s_, w, e,
      nw: !n && !w && isG(r-1,c-1), ne: !n && !e && isG(r-1,c+1),
      sw: !s_ && !w && isG(r+1,c-1), se: !s_ && !e && isG(r+1,c+1) };
  }
  return generateTile({ kind: k as any, seed: `t${i%7}`, size: TS, supersample: 2, outline: false, edges } as any);
});
const entities: SceneEntity[] = [];
const shadows: SceneEntity[] = [];
function addTall(kind:string, seed:string, tx:number, ty:number, w:number, hMul:number){
  const spr = generateTile({ kind: kind as any, seed, size: w, height: Math.round(w*hMul), supersample: 2, outline: false } as any);
  entities.push({ sprite: spr, x: tx*TS-(w-TS)/2, y: ty*TS-(spr.height-TS) });
}
// three houses — different seeds, different sizes, taller aspect to show height
addTall('house','villa1', 4, 6, 140, 1.35);

addTall('house','villa3', 8, 13, 128, 1.35);
// trees & greenery
addTall('tree','oak1', 1, 3, 76, 1.6);
addTall('tree','oak2', 19, 3, 84, 1.6);
addTall('tree','oak3', 18, 13, 72, 1.6);
addTall('pine_tree','p1', 12, 4, 56, 1.9);
addTall('pine_tree','p2', 0, 12, 60, 1.9);
addTall('bush','b1', 6, 5, 36, 1.0);
addTall('bush','b2', 17, 6, 40, 1.0);
addTall('bush','b3', 2, 8, 36, 1.0);
addTall('rock','r1', 20, 10, 36, 1.0);
addTall('flowers','fl1', 10, 5, 32, 1.0);
addTall('flowers','fl2', 3, 11, 32, 1.0);
addTall('flowers','fl3', 14, 10, 32, 1.0);
addTall('fence','f1', 13, 7, 32, 1.0);
addTall('fence','f2', 14, 7, 32, 1.0);
function addProp(kind:string, seed:string, tx:number, ty:number){
  const spr = generateTile({ kind: kind as any, seed, size: TS, supersample: 2, outline: false, bare: true } as any);
  entities.push({ sprite: spr, x: tx*TS, y: ty*TS });
}
addProp('bed','bd1', 14, 2);
addProp('table','tb1', 16, 3);
addProp('bookshelf','bs1', 18, 2);
addProp('shop_counter','sc1', 15, 4);
addProp('barrel','br1', 18, 4);
function addChar(cfg:any, tx:number, ty:number){
  const CS = 52;
  const spr = generateSprite({ size: CS, supersample: 2, ...cfg });
  shadows.push({ sprite: generateShadow(30, 0.35), x: tx*TS+1, y: ty*TS+22 });
  entities.push({ sprite: spr, x: tx*TS-(CS-TS)/2, y: ty*TS-(CS-TS) });
}
addChar({ seed:'hero', weapon:'sword', outfit:{armor:true} }, 9, 8);
addChar({ seed:'mage', weapon:'staff', outfit:{hat:'wizard', torso:'robe'} }, 12, 9);
addChar({ seed:'villager', outfit:{hat:'cap'} }, 5, 9);
addChar({ seed:'keeper', outfit:{hat:'bandana'} }, 16, 2);
addChar({ seed:'kid', body:{headScale:1.1, limbLength:0.85} }, 11, 11);
addChar({ seed:'guard', weapon:'sword', shield:true, outfit:{armor:true, hat:'helmet'} }, 13, 8);
entities.push({ sprite: generateEnemy({ seed:'sl', kind:'slime' as any, size: 44, supersample: 2 }), x: 17*TS-6, y: 10*TS-12 });
entities.push({ sprite: generateItem({ seed:'ch', kind:'chest', size: 38, supersample: 2 }), x: 2*TS-3, y: 13*TS-6 });
const out = renderScene(COLS*TS, ROWS*TS, { tiles, tileSize: TS, tilesPerRow: COLS, entities, shadows });
const up = upscale(out, 2);
writeFileSync('preview/village.png', png(up.width, up.height, up.data));
console.log('wrote village.png');
