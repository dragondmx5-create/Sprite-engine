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
import { Part, roundedBox, circle, capsule, ellipse } from './shapes';

export type TileKind = 'stone_floor' | 'dirt_floor' | 'stone_wall' | 'crystal_floor' | 'wood_door' | 'lava_floor' | 'ice_floor' | 'moss_floor' | 'spike_trap' | 'stairs_down' | 'stairs_up' | 'cracked_wall' | 'pit' | 'water_pool' | 'underground_river' | 'stalagmite' | 'cobweb' | 'barrel' | 'chain' | 'bone_pile' | 'shop_counter' | 'iron_gate' | 'torch_bracket' | 'altar' | 'anvil' | 'bed' | 'table' | 'bookshelf' | 'pillar' | 'fountain';

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
function pushEllipse(parts: Part[], mat: Part['material'], cx: number, cy: number, rx: number, ry: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: ellipse(cx, cy, rx, ry),
    bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)],
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
  // top-down: solid stone block filling tile, darker than floor
  const base: RGB = [62 + rng.jitter(8), 58 + rng.jitter(6), 56 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.02, 0.3);
  // edge shadow (lower/right) to show height
  const edgeDark: RGB = [base[0] * 0.5, base[1] * 0.5, base[2] * 0.5] as RGB;
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.97, s * 0.5, s * 0.02, s * 0.48, s * 0.005, 0.15);
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.5, s * 0.97, s * 0.48, s * 0.02, s * 0.005, 0.15);
  // edge highlight (upper/left) to show height
  const edgeLight: RGB = [base[0] * 1.2, base[1] * 1.2, base[2] * 1.2] as RGB;
  pushBox(parts, MATERIALS.bone(edgeLight), s * 0.03, s * 0.5, s * 0.02, s * 0.48, s * 0.005, 0.18);
  pushBox(parts, MATERIALS.bone(edgeLight), s * 0.5, s * 0.03, s * 0.48, s * 0.02, s * 0.005, 0.18);
  // subtle surface variation (stone blocks from above)
  const lighter: RGB = [base[0] + 8, base[1] + 6, base[2] + 5] as RGB;
  pushBox(parts, MATERIALS.bone(lighter), s * 0.3, s * 0.3, s * 0.18, s * 0.18, s * 0.01, 0.25);
  pushBox(parts, MATERIALS.bone(lighter), s * 0.72, s * 0.68, s * 0.16, s * 0.2, s * 0.01, 0.25);
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
  // top-down: stone wall with wooden door plank across opening
  const frame: RGB = [62 + rng.jitter(6), 58 + rng.jitter(5), 56 + rng.jitter(5)];
  // left and right stone frame walls
  pushBox(parts, MATERIALS.bone(frame), s * 0.12, s * 0.5, s * 0.12, s * 0.48, s * 0.02, 0.28);
  pushBox(parts, MATERIALS.bone(frame), s * 0.88, s * 0.5, s * 0.12, s * 0.48, s * 0.02, 0.28);
  // floor in doorway
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.28, s * 0.48, s * 0.02, 0.12);
  // wooden door plank from above (thick horizontal bar)
  const wood: RGB = [118 + rng.jitter(10), 78 + rng.jitter(8), 48 + rng.jitter(6)];
  pushBox(parts, MATERIALS.leather(wood), s * 0.5, s * 0.5, s * 0.26, s * 0.06, s * 0.02, 0.28);
  // iron bands across door (vertical lines from top-down)
  const band = MATERIALS.metal([95, 95, 105]);
  pushBox(parts, band, s * 0.34, s * 0.5, s * 0.012, s * 0.07, s * 0.005, 0.35);
  pushBox(parts, band, s * 0.66, s * 0.5, s * 0.012, s * 0.07, s * 0.005, 0.35);
  // handle (small dot from above)
  pushCircle(parts, MATERIALS.metal([148, 138, 96]), s * 0.56, s * 0.5, s * 0.02, 0.55);
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
  // top-down: spike tips as small bright dots with darker hole around them
  const cols = 3, rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = s * (0.22 + c * 0.28) + rng.jitter(s * 0.02);
      const sy = s * (0.22 + r * 0.28) + rng.jitter(s * 0.02);
      // dark hole
      pushCircle(parts, MATERIALS.bone([30, 26, 22]), sx, sy, s * 0.035, 0.1);
      // spike tip (bright metal point)
      pushCircle(parts, MATERIALS.metal([160, 155, 148]), sx, sy, s * 0.018, 0.6);
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
  // top-down: cracked stone block, same raised style as stone_wall
  const base: RGB = [58 + rng.jitter(8), 54 + rng.jitter(6), 52 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.02, 0.28);
  // edge shadows for height
  const edgeDark: RGB = [base[0] * 0.5, base[1] * 0.5, base[2] * 0.5] as RGB;
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.97, s * 0.5, s * 0.02, s * 0.48, s * 0.005, 0.15);
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.5, s * 0.97, s * 0.48, s * 0.02, s * 0.005, 0.15);
  const edgeLight: RGB = [base[0] * 1.15, base[1] * 1.15, base[2] * 1.15] as RGB;
  pushBox(parts, MATERIALS.bone(edgeLight), s * 0.03, s * 0.5, s * 0.02, s * 0.48, s * 0.005, 0.18);
  pushBox(parts, MATERIALS.bone(edgeLight), s * 0.5, s * 0.03, s * 0.48, s * 0.02, s * 0.005, 0.18);
  // cracks across top surface
  const crackCol = MATERIALS.bone([base[0] * 0.35, base[1] * 0.35, base[2] * 0.35] as RGB);
  const cracks = 3 + Math.floor(rng.float() * 3);
  for (let i = 0; i < cracks; i++) {
    const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
    const bx = ax + rng.jitter(s * 0.25), by = ay + rng.jitter(s * 0.25);
    pushCapsule(parts, crackCol, ax, ay, bx, by, Math.max(1, s * 0.012), 0.1);
  }
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
  // top-down: stalagmite tips are small circles/dots seen from above
  const pillars = 2 + (rng.float() > 0.5 ? 1 : 0);
  for (let i = 0; i < pillars; i++) {
    const j = rng.jitter(10);
    const col: RGB = [95 + j, 85 + j, 75 + j];
    const cx = s * (0.25 + i * 0.25) + rng.jitter(s * 0.06);
    const cy = s * (0.35 + rng.float() * 0.3);
    const baseR = s * (0.06 + rng.float() * 0.04);
    // shadow ring at base
    pushCircle(parts, MATERIALS.bone([baseCol[0] * 0.6, baseCol[1] * 0.6, baseCol[2] * 0.6] as RGB), cx, cy, baseR + s * 0.02, 0.1);
    // wider base
    pushCircle(parts, MATERIALS.bone(col), cx, cy, baseR, 0.25);
    // pointed tip (smaller, lighter)
    pushCircle(parts, MATERIALS.bone([col[0] + 20, col[1] + 18, col[2] + 15] as RGB), cx, cy, baseR * 0.45, 0.4);
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
  // top-down: circular barrel lid from above
  const woodCol: RGB = [118 + rng.jitter(10), 78 + rng.jitter(8), 48 + rng.jitter(6)];
  // metal band ring (outer)
  const bandMat = MATERIALS.metal([140, 135, 128]);
  pushCircle(parts, bandMat, s * 0.5, s * 0.5, s * 0.22, 0.4);
  // wooden lid
  pushCircle(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.5, s * 0.19, 0.3);
  // plank lines across lid
  const plankDark: RGB = [woodCol[0] * 0.8, woodCol[1] * 0.8, woodCol[2] * 0.8] as RGB;
  pushCapsule(parts, MATERIALS.leather(plankDark), s * 0.35, s * 0.32, s * 0.65, s * 0.32, Math.max(1.2, s * 0.008), 0.2);
  pushCapsule(parts, MATERIALS.leather(plankDark), s * 0.33, s * 0.5, s * 0.67, s * 0.5, Math.max(1.2, s * 0.008), 0.2);
  pushCapsule(parts, MATERIALS.leather(plankDark), s * 0.35, s * 0.68, s * 0.65, s * 0.68, Math.max(1.2, s * 0.008), 0.2);
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

// ---- interior / building tile builders --------------------------------------

function buildShopCounter(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: L-shaped wooden counter surface from above
  const woodCol: RGB = [105 + rng.jitter(8), 68 + rng.jitter(6), 42 + rng.jitter(5)];
  // main counter bar (horizontal)
  pushBox(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.55, s * 0.38, s * 0.08, s * 0.02, 0.28);
  // side extension
  pushBox(parts, MATERIALS.leather(woodCol), s * 0.15, s * 0.38, s * 0.08, s * 0.2, s * 0.02, 0.26);
  // counter edge highlight
  const edgeLight: RGB = [woodCol[0] + 15, woodCol[1] + 10, woodCol[2] + 8] as RGB;
  pushBox(parts, MATERIALS.leather(edgeLight), s * 0.5, s * 0.48, s * 0.36, s * 0.012, s * 0.005, 0.2);
  // items on counter
  pushCircle(parts, MATERIALS.gold([210, 185, 80]), s * 0.58, s * 0.55, s * 0.025, 0.5);
  pushCircle(parts, MATERIALS.gold([195, 170, 70]), s * 0.45, s * 0.55, s * 0.02, 0.45);
  // small box on counter
  pushBox(parts, MATERIALS.leather([woodCol[0] * 0.85, woodCol[1] * 0.85, woodCol[2] * 0.85] as RGB), s * 0.7, s * 0.55, s * 0.04, s * 0.03, s * 0.008, 0.2);
  return parts;
}

function buildIronGate(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // top-down: stone walls on sides with metal bars spanning the gap
  const frameCol: RGB = [52 + rng.jitter(6), 48 + rng.jitter(5), 46 + rng.jitter(5)];
  // left and right stone walls
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.1, s * 0.5, s * 0.1, s * 0.48, s * 0.02, 0.28);
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.9, s * 0.5, s * 0.1, s * 0.48, s * 0.02, 0.28);
  // floor in gateway
  pushBox(parts, MATERIALS.bone([72, 66, 62]), s * 0.5, s * 0.5, s * 0.32, s * 0.48, s * 0.02, 0.1);
  // horizontal metal bars spanning left to right (seen from above)
  const barMat = MATERIALS.metal([120 + rng.jitter(8), 118 + rng.jitter(6), 115 + rng.jitter(6)]);
  const bars = 5;
  for (let i = 0; i < bars; i++) {
    const by = s * (0.18 + i * 0.16);
    pushCapsule(parts, barMat, s * 0.2, by, s * 0.8, by, Math.max(1.2, s * 0.018), 0.45);
  }
  // vertical crossbar along center
  pushCapsule(parts, barMat, s * 0.5, s * 0.12, s * 0.5, s * 0.88, Math.max(1.2, s * 0.016), 0.4);
  return parts;
}

function buildTorchBracket(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // top-down: wall surface with torch protruding from bottom edge
  const wallCol: RGB = [62 + rng.jitter(8), 58 + rng.jitter(6), 56 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(wallCol), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.02, 0.28);
  // wall edges
  const edgeDark: RGB = [wallCol[0] * 0.5, wallCol[1] * 0.5, wallCol[2] * 0.5] as RGB;
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.5, s * 0.97, s * 0.48, s * 0.02, s * 0.005, 0.15);
  const edgeLight: RGB = [wallCol[0] * 1.2, wallCol[1] * 1.2, wallCol[2] * 1.2] as RGB;
  pushBox(parts, MATERIALS.bone(edgeLight), s * 0.5, s * 0.03, s * 0.48, s * 0.02, s * 0.005, 0.18);
  // metal bracket on wall top (small rect from above)
  const bracketMat = MATERIALS.metal([130, 125, 120]);
  pushBox(parts, bracketMat, s * 0.5, s * 0.82, s * 0.04, s * 0.06, s * 0.01, 0.4);
  // torch stick extending downward (away from wall)
  const torchWood: RGB = [100, 62, 35];
  pushCapsule(parts, MATERIALS.leather(torchWood), s * 0.5, s * 0.82, s * 0.5, s * 0.58, Math.max(1.2, s * 0.022), 0.25);
  // flame glow circle at torch tip (seen from above)
  pushCircle(parts, MATERIALS.ember([255, 180, 40]), s * 0.5, s * 0.55, s * 0.06, 0.7);
  pushCircle(parts, MATERIALS.ember([255, 230, 120]), s * 0.5, s * 0.55, s * 0.03, 0.8);
  return parts;
}

function buildAltar(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [68 + rng.jitter(6), 62 + rng.jitter(5), 58 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: stone slab from above with rune circle
  const stoneCol: RGB = [78 + rng.jitter(5), 72 + rng.jitter(4), 82 + rng.jitter(5)];
  // shadow under altar
  pushBox(parts, MATERIALS.bone([floorCol[0] * 0.6, floorCol[1] * 0.6, floorCol[2] * 0.6] as RGB), s * 0.52, s * 0.52, s * 0.22, s * 0.16, s * 0.02, 0.08);
  // altar top surface (rectangular stone slab)
  pushBox(parts, MATERIALS.bone(stoneCol), s * 0.5, s * 0.5, s * 0.2, s * 0.14, s * 0.03, 0.25);
  // edge highlight
  pushBox(parts, MATERIALS.bone([stoneCol[0] + 18, stoneCol[1] + 15, stoneCol[2] + 20] as RGB), s * 0.5, s * 0.37, s * 0.18, s * 0.012, s * 0.005, 0.2);
  // glowing rune circle on altar surface
  const runeCol: RGB = [140 + rng.jitter(20), 80 + rng.jitter(15), 200 + rng.jitter(20)];
  pushCircle(parts, MATERIALS.gem(runeCol), s * 0.5, s * 0.5, s * 0.08, 0.6);
  pushCircle(parts, MATERIALS.ember([180, 120, 255]), s * 0.5, s * 0.5, s * 0.04, 0.8);
  return parts;
}

function buildAnvil(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // dark stone floor
  const floorCol: RGB = [62 + rng.jitter(6), 56 + rng.jitter(5), 52 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: anvil T-shape from above
  const anvilCol: RGB = [55 + rng.jitter(6), 52 + rng.jitter(5), 50 + rng.jitter(5)];
  // shadow under anvil
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.55, floorCol[1] * 0.55, floorCol[2] * 0.55] as RGB), s * 0.47, s * 0.52, s * 0.2, s * 0.1, 0.08);
  // anvil body (narrow center from above)
  pushBox(parts, MATERIALS.metal(anvilCol), s * 0.5, s * 0.5, s * 0.06, s * 0.12, s * 0.015, 0.35);
  // anvil face (wide top - working surface from above)
  const topCol: RGB = [anvilCol[0] + 18, anvilCol[1] + 15, anvilCol[2] + 12] as RGB;
  pushBox(parts, MATERIALS.metal(topCol), s * 0.5, s * 0.42, s * 0.16, s * 0.05, s * 0.02, 0.4);
  // anvil horn (pointed, extends down from above)
  pushCapsule(parts, MATERIALS.metal(anvilCol), s * 0.5, s * 0.58, s * 0.5, s * 0.7, Math.max(1.2, s * 0.025), 0.38);
  // small hammer nearby
  const hammerHead: RGB = [100, 95, 90];
  pushBox(parts, MATERIALS.metal(hammerHead), s * 0.72, s * 0.42, s * 0.035, s * 0.025, s * 0.008, 0.4);
  pushCapsule(parts, MATERIALS.leather([90, 58, 35]), s * 0.72, s * 0.46, s * 0.72, s * 0.62, Math.max(1.2, s * 0.012), 0.22);
  return parts;
}

function buildBed(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: rectangular bed from above
  const frameCol: RGB = [95 + rng.jitter(8), 62 + rng.jitter(6), 38 + rng.jitter(5)];
  // wooden bed frame (rectangle from above)
  pushBox(parts, MATERIALS.leather(frameCol), s * 0.5, s * 0.5, s * 0.2, s * 0.35, s * 0.02, 0.2);
  // headboard at top (thicker bar)
  pushBox(parts, MATERIALS.leather([frameCol[0] * 0.85, frameCol[1] * 0.85, frameCol[2] * 0.85] as RGB), s * 0.5, s * 0.16, s * 0.22, s * 0.03, s * 0.015, 0.25);
  // cloth blanket (covers most of bed from above)
  const blanketCol: RGB = [65 + rng.jitter(15), 55 + rng.jitter(10), 80 + rng.jitter(15)];
  pushBox(parts, MATERIALS.cloth(blanketCol), s * 0.5, s * 0.55, s * 0.17, s * 0.25, s * 0.02, 0.15);
  // pillow at headboard end
  const pillowCol: RGB = [160 + rng.jitter(10), 155 + rng.jitter(8), 145 + rng.jitter(8)];
  pushEllipse(parts, MATERIALS.cloth(pillowCol), s * 0.5, s * 0.24, s * 0.1, s * 0.05, 0.2);
  return parts;
}

function buildTable(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: rectangular table top from above with items
  const topCol: RGB = [110 + rng.jitter(8), 72 + rng.jitter(6), 45 + rng.jitter(5)];
  // shadow under table
  pushBox(parts, MATERIALS.bone([floorCol[0] * 0.6, floorCol[1] * 0.6, floorCol[2] * 0.6] as RGB), s * 0.52, s * 0.52, s * 0.28, s * 0.18, s * 0.02, 0.08);
  // table top surface
  pushBox(parts, MATERIALS.leather(topCol), s * 0.5, s * 0.5, s * 0.26, s * 0.16, s * 0.03, 0.28);
  // edge highlight
  pushBox(parts, MATERIALS.leather([topCol[0] + 12, topCol[1] + 8, topCol[2] + 6] as RGB), s * 0.5, s * 0.35, s * 0.24, s * 0.012, s * 0.005, 0.2);
  // mug on table (circle from above)
  pushCircle(parts, MATERIALS.bone([140, 130, 115]), s * 0.6, s * 0.48, s * 0.03, 0.3);
  pushCircle(parts, MATERIALS.bone([95, 80, 65]), s * 0.6, s * 0.48, s * 0.018, 0.15);
  // plate/bowl
  pushCircle(parts, MATERIALS.bone([165, 158, 145]), s * 0.38, s * 0.5, s * 0.04, 0.2);
  return parts;
}

function buildBookshelf(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // top-down: wall tile with bookshelf against it (narrow rectangle from above)
  const wallCol: RGB = [62 + rng.jitter(8), 58 + rng.jitter(6), 56 + rng.jitter(6)];
  // wall surface (top half of tile)
  pushBox(parts, MATERIALS.bone(wallCol), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.02, 0.28);
  // wall edges
  const edgeDark: RGB = [wallCol[0] * 0.5, wallCol[1] * 0.5, wallCol[2] * 0.5] as RGB;
  pushBox(parts, MATERIALS.bone(edgeDark), s * 0.5, s * 0.97, s * 0.48, s * 0.02, s * 0.005, 0.15);
  // bookshelf top surface (sits against wall, narrow depth)
  const shelfCol: RGB = [100 + rng.jitter(8), 65 + rng.jitter(6), 38 + rng.jitter(5)];
  pushBox(parts, MATERIALS.leather(shelfCol), s * 0.5, s * 0.75, s * 0.38, s * 0.1, s * 0.02, 0.22);
  // book spines visible from above (colored rectangles in a row)
  const bookColors: RGB[] = [
    [140 + rng.jitter(20), 45 + rng.jitter(15), 45 + rng.jitter(15)],
    [45 + rng.jitter(15), 65 + rng.jitter(15), 130 + rng.jitter(20)],
    [55 + rng.jitter(15), 110 + rng.jitter(20), 55 + rng.jitter(15)],
    [130 + rng.jitter(20), 110 + rng.jitter(15), 42 + rng.jitter(10)],
  ];
  for (let i = 0; i < 4; i++) {
    const bx = s * (0.24 + i * 0.14) + rng.jitter(s * 0.01);
    pushBox(parts, MATERIALS.cloth(bookColors[i]), bx, s * 0.75, s * 0.01, s * 0.06, s * 0.004, 0.15);
  }
  return parts;
}

function buildPillar(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: circular column cross-section from above
  const pillarCol: RGB = [105 + rng.jitter(8), 98 + rng.jitter(6), 90 + rng.jitter(6)];
  // shadow around base
  pushCircle(parts, MATERIALS.bone([floorCol[0] * 0.55, floorCol[1] * 0.55, floorCol[2] * 0.55] as RGB), s * 0.52, s * 0.52, s * 0.18, 0.08);
  // column base (wider circle)
  pushCircle(parts, MATERIALS.bone([pillarCol[0] - 10, pillarCol[1] - 8, pillarCol[2] - 6] as RGB), s * 0.5, s * 0.5, s * 0.16, 0.25);
  // column top / cross-section (main circle)
  pushCircle(parts, MATERIALS.bone(pillarCol), s * 0.5, s * 0.5, s * 0.12, 0.35);
  // highlight on top
  pushCircle(parts, MATERIALS.bone([pillarCol[0] + 18, pillarCol[1] + 15, pillarCol[2] + 12] as RGB), s * 0.48, s * 0.47, s * 0.05, 0.3);
  return parts;
}

function buildFountain(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // stone floor base
  const floorCol: RGB = [78 + rng.jitter(6), 72 + rng.jitter(5), 68 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(floorCol), s * 0.5, s * 0.5, s * 0.46, s * 0.46, s * 0.02, 0.12);
  // top-down: circular basin from above with water
  const basinCol: RGB = [88 + rng.jitter(6), 82 + rng.jitter(5), 78 + rng.jitter(5)];
  // outer stone rim (circle from above)
  pushCircle(parts, MATERIALS.bone(basinCol), s * 0.5, s * 0.5, s * 0.3, 0.22);
  // inner basin (darker stone)
  pushCircle(parts, MATERIALS.bone([basinCol[0] * 0.6, basinCol[1] * 0.6, basinCol[2] * 0.6] as RGB), s * 0.5, s * 0.5, s * 0.24, 0.15);
  // water surface
  const waterCol: RGB = [40 + rng.jitter(8), 75 + rng.jitter(10), 110 + rng.jitter(10)];
  pushCircle(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.5, s * 0.2, 0.2);
  // center spout (small circle from above)
  pushCircle(parts, MATERIALS.bone([basinCol[0] + 12, basinCol[1] + 10, basinCol[2] + 8] as RGB), s * 0.5, s * 0.5, s * 0.04, 0.3);
  // ripple rings around spout
  const rippleCol: RGB = [waterCol[0] + 30, waterCol[1] + 35, waterCol[2] + 30];
  const thickness = Math.max(1.2, s * 0.01);
  const r1 = s * 0.1;
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5 - r1, s * 0.5, s * 0.5, s * 0.5 - r1, thickness, 0.18);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.5 - r1, s * 0.5 + r1, s * 0.5, thickness, 0.18);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5 + r1, s * 0.5, s * 0.5, s * 0.5 + r1, thickness, 0.18);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.5 + r1, s * 0.5 - r1, s * 0.5, thickness, 0.18);
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
    case 'shop_counter':     return buildShopCounter(rng, s);
    case 'iron_gate':        return buildIronGate(rng, s);
    case 'torch_bracket':    return buildTorchBracket(rng, s);
    case 'altar':            return buildAltar(rng, s);
    case 'anvil':            return buildAnvil(rng, s);
    case 'bed':              return buildBed(rng, s);
    case 'table':            return buildTable(rng, s);
    case 'bookshelf':        return buildBookshelf(rng, s);
    case 'pillar':           return buildPillar(rng, s);
    case 'fountain':         return buildFountain(rng, s);
    case 'stone_floor':
    default:                 return buildStoneFloor(rng, s);
  }
}

export const TILE_KINDS: TileKind[] = ['stone_floor', 'dirt_floor', 'stone_wall', 'crystal_floor', 'wood_door', 'lava_floor', 'ice_floor', 'moss_floor', 'spike_trap', 'stairs_down', 'stairs_up', 'cracked_wall', 'pit', 'water_pool', 'underground_river', 'stalagmite', 'cobweb', 'barrel', 'chain', 'bone_pile', 'shop_counter', 'iron_gate', 'torch_bracket', 'altar', 'anvil', 'bed', 'table', 'bookshelf', 'pillar', 'fountain'];
