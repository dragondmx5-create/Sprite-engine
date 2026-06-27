// =============================================================================
// tiles.ts — procedural dungeon tiles. Built as Part[] and rendered through
// the SAME SDF + distance-field + lighting pipeline as characters and items,
// so lighting is consistent across the entire scene.
//
// Five kinds matching UNDRAL's dungeon layers:
//   • stone_floor — standard gray flagstone (Ashveil, Irondeep)
//   • dirt_floor  — packed earth with pebbles (The Rot)
//   • stone_wall  — mortared brickwork
//   • crystal_floor — dark stone veined with glowing gems (The Hollow)
//   • wood_door   — oak panel with iron bands
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, roundedBox, circle, capsule } from './shapes';

export type TileKind = 'stone_floor' | 'dirt_floor' | 'stone_wall' | 'crystal_floor' | 'wood_door' | 'lava_floor' | 'ice_floor' | 'moss_floor' | 'spike_trap' | 'stairs_down' | 'stairs_up' | 'cracked_wall' | 'pit' | 'water_pool' | 'underground_river' | 'stalagmite' | 'cobweb' | 'barrel' | 'chain' | 'bone_pile';

export interface TileConfig {
  kind?: TileKind;
  seed?: number | string;
}

// ---- helpers ----------------------------------------------------------------

function pushBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: roundedBox(cx, cy, hx, hy, corner),
    bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)],
  });
}
function pushCircle(parts: Part[], mat: Part['material'], cx: number, cy: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: circle(cx, cy, r),
    bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)],
  });
}
function pushCapsule(parts: Part[], mat: Part['material'], ax: number, ay: number, bx: number, by: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: capsule(ax, ay, bx, by, r),
    bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2),
           Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)],
  });
}

// ---- tile builders ----------------------------------------------------------

function buildStoneFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const gap = s * 0.04;
  const bw = (s - gap * 3) / 2;
  const bh = (s - gap * 3) / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const j = rng.jitter(6);
      const base: RGB = [88 + j, 82 + j, 76 + j];
      const cx = gap + bw / 2 + col * (bw + gap);
      const cy = gap + bh / 2 + row * (bh + gap);
      pushBox(parts, MATERIALS.bone(base), cx, cy, bw / 2 - 1, bh / 2 - 1, s * 0.02, 0.15);
    }
  }
  // occasional crack
  if (rng.float() > 0.5) {
    const ax = s * (0.2 + rng.float() * 0.6), ay = s * (0.2 + rng.float() * 0.6);
    const bx = ax + rng.jitter(s * 0.2), by = ay + rng.jitter(s * 0.2);
    pushCapsule(parts, MATERIALS.bone([50, 46, 42]), ax, ay, bx, by, Math.max(1, s * 0.008), 0.1);
  }
  return parts;
}

function buildDirtFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [110 + rng.jitter(15), 80 + rng.jitter(10), 55 + rng.jitter(10)];
  pushBox(parts, MATERIALS.flesh(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.03, 0.08);
  for (let i = 0; i < 3; i++) {
    const px = s * (0.15 + rng.float() * 0.7);
    const py = s * (0.15 + rng.float() * 0.7);
    const pr = s * (0.025 + rng.float() * 0.02);
    pushCircle(parts, MATERIALS.bone([base[0] * 0.75, base[1] * 0.75, base[2] * 0.75] as RGB), px, py, pr, 0.25);
  }
  return parts;
}

function buildStoneWall(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [62 + rng.jitter(8), 58 + rng.jitter(6), 56 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.3);
  // horizontal mortar
  const my = s * (0.38 + rng.jitter(0.04));
  pushBox(parts, MATERIALS.bone([base[0] * 0.6, base[1] * 0.6, base[2] * 0.6] as RGB), s * 0.5, my, s * 0.44, s * 0.012, s * 0.005, 0.08);
  // vertical mortar (offset brick pattern)
  const mx = s * (0.33 + rng.jitter(0.06));
  pushBox(parts, MATERIALS.bone([base[0] * 0.63, base[1] * 0.63, base[2] * 0.63] as RGB), mx, s * 0.22, s * 0.012, s * 0.16, s * 0.005, 0.08);
  // second vertical on different row
  const mx2 = s * (0.6 + rng.jitter(0.06));
  pushBox(parts, MATERIALS.bone([base[0] * 0.63, base[1] * 0.63, base[2] * 0.63] as RGB), mx2, s * 0.68, s * 0.012, s * 0.16, s * 0.005, 0.08);
  return parts;
}

function buildCrystalFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [38 + rng.jitter(8), 33 + rng.jitter(6), 48 + rng.jitter(8)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  const veins = 2 + Math.floor(rng.float() * 2);
  for (let i = 0; i < veins; i++) {
    const ax = s * (0.12 + rng.float() * 0.76);
    const ay = s * (0.12 + rng.float() * 0.76);
    const bx = s * (0.12 + rng.float() * 0.76);
    const by = s * (0.12 + rng.float() * 0.76);
    const r = Math.max(1, s * 0.014);
    const color: RGB = [70 + rng.jitter(20), 150 + rng.jitter(30), 200 + rng.jitter(20)];
    pushCapsule(parts, MATERIALS.gem(color), ax, ay, bx, by, r, 0.5);
  }
  return parts;
}

function buildWoodDoor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const wood: RGB = [118 + rng.jitter(10), 78 + rng.jitter(8), 48 + rng.jitter(6)];
  const frame: RGB = [78, 73, 68];
  pushBox(parts, MATERIALS.bone(frame), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.02, 0.2);
  pushBox(parts, MATERIALS.leather(wood), s * 0.5, s * 0.52, s * 0.34, s * 0.42, s * 0.025, 0.28);
  // iron bands
  const band = MATERIALS.metal([95, 95, 105]);
  pushBox(parts, band, s * 0.5, s * 0.28, s * 0.36, s * 0.016, s * 0.008, 0.35);
  pushBox(parts, band, s * 0.5, s * 0.72, s * 0.36, s * 0.016, s * 0.008, 0.35);
  // handle
  pushCircle(parts, MATERIALS.metal([148, 138, 96]), s * 0.63, s * 0.52, s * 0.028, 0.55);
  return parts;
}

function buildLavaFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [38 + rng.jitter(5), 26 + rng.jitter(4), 22 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.1);
  const veins = 2 + Math.floor(rng.float() * 2);
  for (let i = 0; i < veins; i++) {
    const ax = s * (0.1 + rng.float() * 0.8), ay = s * (0.1 + rng.float() * 0.8);
    const bx = s * (0.1 + rng.float() * 0.8), by = s * (0.1 + rng.float() * 0.8);
    const r = Math.max(1, s * 0.016);
    const color: RGB = [255, 100 + rng.jitter(40), 30 + rng.jitter(20)];
    pushCapsule(parts, MATERIALS.ember(color), ax, ay, bx, by, r, 0.4);
  }
  return parts;
}

function buildIceFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [168 + rng.jitter(10), 198 + rng.jitter(8), 218 + rng.jitter(6)];
  pushBox(parts, MATERIALS.glass(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.15);
  for (let i = 0; i < 2; i++) {
    const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
    const bx = s * (0.15 + rng.float() * 0.7), by = s * (0.15 + rng.float() * 0.7);
    pushCapsule(parts, MATERIALS.glass([220, 235, 250]), ax, ay, bx, by, Math.max(1, s * 0.008), 0.2);
  }
  return parts;
}

function buildMossFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [62 + rng.jitter(8), 76 + rng.jitter(8), 52 + rng.jitter(6)];
  pushBox(parts, MATERIALS.flesh(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.08);
  for (let i = 0; i < 3; i++) {
    const px = s * (0.15 + rng.float() * 0.7), py = s * (0.15 + rng.float() * 0.7);
    const pr = s * (0.035 + rng.float() * 0.025);
    const color: RGB = [48 + rng.jitter(15), 95 + rng.jitter(20), 38 + rng.jitter(10)];
    pushCircle(parts, MATERIALS.flesh(color), px, py, pr, 0.12);
  }
  return parts;
}

function buildSpikeTrap(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  const spikeMat = MATERIALS.metal([140, 135, 128]);
  const cols = 3, rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = s * (0.22 + c * 0.28) + rng.jitter(s * 0.02);
      const sy = s * (0.22 + r * 0.28) + rng.jitter(s * 0.02);
      const h = s * 0.08 + rng.float() * s * 0.04;
      pushCapsule(parts, spikeMat, sx, sy + h * 0.5, sx, sy - h * 0.5, Math.max(1, s * 0.016), 0.6);
    }
  }
  return parts;
}

function buildStairsDown(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [72 + rng.jitter(6), 68 + rng.jitter(5), 64 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.15);
  const step = MATERIALS.bone([base[0] * 0.8, base[1] * 0.8, base[2] * 0.8] as RGB);
  const dark = MATERIALS.bone([20, 18, 16]);
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const sy = s * (0.20 + i * 0.16);
    const sw = s * (0.38 - i * 0.03);
    pushBox(parts, step, s * 0.5, sy, sw / 2, s * 0.05, s * 0.01, 0.2);
  }
  pushBox(parts, dark, s * 0.5, s * 0.82, s * 0.14, s * 0.08, s * 0.02, 0.1);
  return parts;
}

function buildStairsUp(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [72 + rng.jitter(6), 68 + rng.jitter(5), 64 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.15);
  const step = MATERIALS.bone([base[0] * 1.1, base[1] * 1.1, base[2] * 1.1] as RGB);
  const light = MATERIALS.ember([200, 190, 140]);
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const sy = s * (0.75 - i * 0.16);
    const sw = s * (0.38 - i * 0.03);
    pushBox(parts, step, s * 0.5, sy, sw / 2, s * 0.05, s * 0.01, 0.2);
  }
  pushCircle(parts, light, s * 0.5, s * 0.14, s * 0.06, 0.8);
  return parts;
}

function buildCrackedWall(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [58 + rng.jitter(8), 54 + rng.jitter(6), 52 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.28);
  const crackCol = MATERIALS.bone([base[0] * 0.4, base[1] * 0.4, base[2] * 0.4] as RGB);
  const cracks = 3 + Math.floor(rng.float() * 3);
  for (let i = 0; i < cracks; i++) {
    const ax = s * (0.2 + rng.float() * 0.6), ay = s * (0.15 + rng.float() * 0.7);
    const bx = ax + rng.jitter(s * 0.2), by = ay + rng.jitter(s * 0.25);
    pushCapsule(parts, crackCol, ax, ay, bx, by, Math.max(1, s * 0.01), 0.1);
  }
  // mortar lines
  const my = s * (0.35 + rng.jitter(0.05));
  pushBox(parts, MATERIALS.bone([base[0] * 0.55, base[1] * 0.55, base[2] * 0.55] as RGB), s * 0.5, my, s * 0.44, s * 0.01, s * 0.004, 0.08);
  return parts;
}

function buildPit(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const edge: RGB = [68 + rng.jitter(6), 62 + rng.jitter(5), 58 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(edge), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  pushCircle(parts, MATERIALS.bone([15, 12, 10]), s * 0.5, s * 0.5, s * 0.30, 0.1);
  pushCircle(parts, MATERIALS.bone([edge[0] * 0.7, edge[1] * 0.7, edge[2] * 0.7] as RGB), s * 0.5, s * 0.5, s * 0.32, 0.15);
  return parts;
}

function buildWaterPool(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const j = rng.jitter(6);
  const base: RGB = [30 + j, 55 + j, 70 + j];
  // dark reflective water surface
  pushBox(parts, MATERIALS.glass(base), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.04, 0.15);
  // 2-3 ripple rings
  const ripples = 2 + (rng.float() > 0.5 ? 1 : 0);
  for (let i = 0; i < ripples; i++) {
    const cx = s * (0.3 + rng.float() * 0.4);
    const cy = s * (0.3 + rng.float() * 0.4);
    const r = s * (0.08 + rng.float() * 0.06);
    const rippleCol: RGB = [base[0] + 35, base[1] + 40, base[2] + 35];
    // draw ripple as a ring of capsule arcs (top, bottom, left, right)
    const thickness = Math.max(1.2, s * 0.012);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx - r, cy, cx, cy - r, thickness, 0.2);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx, cy - r, cx + r, cy, thickness, 0.2);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx + r, cy, cx, cy + r, thickness, 0.2);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx, cy + r, cx - r, cy, thickness, 0.2);
  }
  return parts;
}

function buildUndergroundRiver(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone banks on top and bottom edges
  const bankCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.12, s * 0.46, s * 0.12, s * 0.02, 0.2);
  pushBox(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.88, s * 0.46, s * 0.12, s * 0.02, 0.2);
  // flowing water in center
  const j = rng.jitter(6);
  const waterCol: RGB = [25 + j, 50 + j, 65 + j];
  pushBox(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.5, s * 0.46, s * 0.28, s * 0.02, 0.12);
  // directional ripple lines (horizontal, following flow)
  const ripples = 3 + Math.floor(rng.float() * 2);
  for (let i = 0; i < ripples; i++) {
    const ry = s * (0.32 + rng.float() * 0.36);
    const ax = s * (0.08 + rng.float() * 0.15);
    const bx = s * (0.72 + rng.float() * 0.2);
    const rippleCol: RGB = [waterCol[0] + 30, waterCol[1] + 35, waterCol[2] + 30];
    pushCapsule(parts, MATERIALS.glass(rippleCol), ax, ry, bx, ry + rng.jitter(s * 0.02), Math.max(1.2, s * 0.01), 0.18);
  }
  return parts;
}

function buildStalagmite(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const baseCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(baseCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // 2-3 pointed stone pillars rising up
  const pillars = 2 + (rng.float() > 0.5 ? 1 : 0);
  for (let i = 0; i < pillars; i++) {
    const j = rng.jitter(10);
    const col: RGB = [95 + j, 85 + j, 75 + j];
    const cx = s * (0.25 + i * 0.25) + rng.jitter(s * 0.06);
    const baseY = s * 0.82;
    const tipY = s * (0.15 + rng.float() * 0.2);
    const thickness = Math.max(1.2, s * (0.04 + rng.float() * 0.025));
    pushCapsule(parts, MATERIALS.bone(col), cx, baseY, cx + rng.jitter(s * 0.03), tipY, thickness, 0.25);
  }
  return parts;
}

function buildCobweb(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const baseCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(baseCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // web strands radiating from top-left corner
  const webCol: RGB = [180, 180, 175];
  const originX = s * 0.05;
  const originY = s * 0.05;
  const strands = 5 + Math.floor(rng.float() * 3);
  for (let i = 0; i < strands; i++) {
    const angle = (i / strands) * (Math.PI * 0.5); // spread across 90 degrees
    const len = s * (0.4 + rng.float() * 0.35);
    const ex = originX + Math.cos(angle) * len;
    const ey = originY + Math.sin(angle) * len;
    const thickness = Math.max(1.2, s * 0.008);
    pushCapsule(parts, MATERIALS.bone(webCol), originX, originY, ex, ey, thickness, 0.08);
  }
  // cross strands connecting radial strands
  for (let i = 0; i < 2; i++) {
    const dist = s * (0.18 + i * 0.2);
    const a1 = 0.1 + rng.float() * 0.2;
    const a2 = 1.1 + rng.float() * 0.3;
    const ax = originX + Math.cos(a1) * dist;
    const ay = originY + Math.sin(a1) * dist;
    const bx = originX + Math.cos(a2) * dist;
    const by = originY + Math.sin(a2) * dist;
    pushCapsule(parts, MATERIALS.bone(webCol), ax, ay, bx, by, Math.max(1.2, s * 0.006), 0.06);
  }
  return parts;
}

function buildBarrel(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // barrel body (oval, wooden)
  const woodCol: RGB = [118 + rng.jitter(10), 78 + rng.jitter(8), 48 + rng.jitter(6)];
  pushBox(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.5, s * 0.22, s * 0.32, s * 0.12, 0.3);
  // metal bands (2 horizontal)
  const bandMat = MATERIALS.metal([140, 135, 128]);
  pushBox(parts, bandMat, s * 0.5, s * 0.3, s * 0.24, s * 0.018, s * 0.008, 0.4);
  pushBox(parts, bandMat, s * 0.5, s * 0.7, s * 0.24, s * 0.018, s * 0.008, 0.4);
  return parts;
}

function buildChain(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // dark background
  pushBox(parts, MATERIALS.bone([22, 20, 18]), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.08);
  // chain links descending from top center
  const chainMat = MATERIALS.metal([160 + rng.jitter(10), 155 + rng.jitter(8), 148 + rng.jitter(8)]);
  const links = 4 + Math.floor(rng.float() * 2);
  const cx = s * 0.5 + rng.jitter(s * 0.05);
  for (let i = 0; i < links; i++) {
    const ly = s * (0.12 + i * 0.17);
    const linkR = Math.max(1.2, s * 0.035);
    if (i % 2 === 0) {
      // vertical link: circle
      pushCircle(parts, chainMat, cx, ly, linkR, 0.5);
    } else {
      // connecting piece: small capsule
      pushCapsule(parts, chainMat, cx, ly - linkR * 0.6, cx, ly + linkR * 0.6, Math.max(1.2, s * 0.018), 0.45);
    }
  }
  return parts;
}

function buildBonePile(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const baseCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(baseCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // scattered bones at various angles
  const boneMat = MATERIALS.bone([200, 192, 175]);
  const bones = 5 + Math.floor(rng.float() * 3);
  for (let i = 0; i < bones; i++) {
    const cx = s * (0.2 + rng.float() * 0.6);
    const cy = s * (0.3 + rng.float() * 0.5);
    const angle = rng.float() * Math.PI;
    const len = s * (0.06 + rng.float() * 0.08);
    const ax = cx - Math.cos(angle) * len;
    const ay = cy - Math.sin(angle) * len;
    const bx = cx + Math.cos(angle) * len;
    const by = cy + Math.sin(angle) * len;
    const thickness = Math.max(1.2, s * (0.014 + rng.float() * 0.01));
    pushCapsule(parts, boneMat, ax, ay, bx, by, thickness, 0.3);
  }
  // a skull-like circle for detail
  pushCircle(parts, boneMat, s * (0.45 + rng.jitter(0.08)), s * (0.45 + rng.jitter(0.06)), s * 0.04, 0.35);
  return parts;
}

// ---- public API -------------------------------------------------------------

export function buildTile(config: TileConfig, s: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  switch (config.kind ?? 'stone_floor') {
    case 'dirt_floor':    return buildDirtFloor(rng, s);
    case 'stone_wall':    return buildStoneWall(rng, s);
    case 'crystal_floor': return buildCrystalFloor(rng, s);
    case 'wood_door':     return buildWoodDoor(rng, s);
    case 'lava_floor':    return buildLavaFloor(rng, s);
    case 'ice_floor':     return buildIceFloor(rng, s);
    case 'moss_floor':    return buildMossFloor(rng, s);
    case 'spike_trap':    return buildSpikeTrap(rng, s);
    case 'stairs_down':   return buildStairsDown(rng, s);
    case 'stairs_up':     return buildStairsUp(rng, s);
    case 'cracked_wall':  return buildCrackedWall(rng, s);
    case 'pit':              return buildPit(rng, s);
    case 'water_pool':       return buildWaterPool(rng, s);
    case 'underground_river': return buildUndergroundRiver(rng, s);
    case 'stalagmite':       return buildStalagmite(rng, s);
    case 'cobweb':           return buildCobweb(rng, s);
    case 'barrel':           return buildBarrel(rng, s);
    case 'chain':            return buildChain(rng, s);
    case 'bone_pile':        return buildBonePile(rng, s);
    case 'stone_floor':
    default:                 return buildStoneFloor(rng, s);
  }
}

export const TILE_KINDS: TileKind[] = ['stone_floor', 'dirt_floor', 'stone_wall', 'crystal_floor', 'wood_door', 'lava_floor', 'ice_floor', 'moss_floor', 'spike_trap', 'stairs_down', 'stairs_up', 'cracked_wall', 'pit', 'water_pool', 'underground_river', 'stalagmite', 'cobweb', 'barrel', 'chain', 'bone_pile'];
