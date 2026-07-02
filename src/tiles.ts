// =============================================================================
// tiles.ts — procedural dungeon tiles (Cambria 3/4 perspective style).
//
// Walls show their FRONT FACE with brickwork/mortar detail and a visible
// top surface. Props show front + top views. Floors are seen from above.
// Built as Part[] through the shared SDF + EDT + lighting pipeline.
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, roundedBox, circle, capsule, ellipse } from './shapes';

export type TileKind = 'stone_floor' | 'dirt_floor' | 'grass_floor' | 'stone_wall' | 'crystal_floor' | 'wood_door' | 'lava_floor' | 'ice_floor' | 'moss_floor' | 'spike_trap' | 'stairs_down' | 'stairs_up' | 'cracked_wall' | 'pit' | 'water_pool' | 'underground_river' | 'stalagmite' | 'cobweb' | 'barrel' | 'chain' | 'bone_pile' | 'shop_counter' | 'iron_gate' | 'torch_bracket' | 'altar' | 'anvil' | 'bed' | 'table' | 'bookshelf' | 'pillar' | 'fountain' | 'tree' | 'pine_tree' | 'dead_tree' | 'house' | 'ruins' | 'fence';

export interface TileConfig {
  kind?: TileKind;
  seed?: number | string;
  /**
   * Which sides of this tile touch grass (for path tiles). Flagged sides get
   * an irregular grass fringe drawn over the edge so paths blend organically
   * into the surrounding grass instead of ending in hard tile seams.
   */
  edges?: { n?: boolean; e?: boolean; s?: boolean; w?: boolean };
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

// ---- 3/4 perspective wall helpers -------------------------------------------

function wallTopAndFront(parts: Part[], rng: RNG, s: number, h: number, topCol: RGB, frontCol: RGB) {
  pushBox(parts, MATERIALS.bone(topCol), s * 0.5, h * 0.08, s * 0.50, h * 0.08, 0, 0.2);
  const lipCol: RGB = [topCol[0] + 18, topCol[1] + 15, topCol[2] + 12];
  pushBox(parts, MATERIALS.bone(lipCol), s * 0.5, h * 0.16, s * 0.50, h * 0.005, 0, 0.15);
  pushBox(parts, MATERIALS.bone(frontCol), s * 0.5, h * 0.58, s * 0.50, h * 0.42, 0, 0.18);
}

function wallBricks(parts: Part[], rng: RNG, s: number, h: number, frontCol: RGB) {
  const mortarCol: RGB = [frontCol[0] * 0.65, frontCol[1] * 0.62, frontCol[2] * 0.58];
  const mortarMat = MATERIALS.bone(mortarCol);
  const rows = h > s * 1.2 ? 3 : 2;
  const step = 0.66 / rows;
  for (let i = 0; i < rows; i++) {
    const my = h * (0.28 + i * step);
    pushCapsule(parts, mortarMat, s * 0.04, my, s * 0.96, my, Math.max(1, s * 0.005), 0.06);
  }
  for (let row = 0; row <= rows; row++) {
    const ry0 = h * (0.20 + row * step);
    const ry1 = ry0 + h * step;
    const offset = (row % 2) * 0.2;
    for (let v = 0; v < 2; v++) {
      const vx = s * (0.25 + offset + v * 0.5);
      if (vx > s * 0.05 && vx < s * 0.95) {
        pushCapsule(parts, mortarMat, vx, ry0 + h * 0.01, vx, ry1 - h * 0.01, Math.max(1, s * 0.004), 0.05);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const j = rng.jitter(10);
    const bx = s * (0.15 + rng.float() * 0.7);
    const by = h * (0.25 + rng.float() * 0.55);
    pushBox(parts, MATERIALS.bone([frontCol[0] + 12 + j, frontCol[1] + 10 + j, frontCol[2] + 6 + j] as RGB),
      bx, by, s * 0.07, h * 0.035, s * 0.006, 0.12);
  }
}

function wallBaseShadow(parts: Part[], s: number, h: number, frontCol: RGB) {
  pushBox(parts, MATERIALS.bone([frontCol[0] * 0.40, frontCol[1] * 0.38, frontCol[2] * 0.34] as RGB),
    s * 0.5, h * 0.975, s * 0.50, h * 0.025, 0, 0.08);
}

// ---- floor on which props sit -----------------------------------------------

function floorBase(parts: Part[], rng: RNG, s: number) {
  const j = rng.jitter(6);
  const col: RGB = [92 + j, 82 + j, 70 + j];
  pushBox(parts, MATERIALS.bone(col), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.01, 0.1);
  return col;
}

// ---- tile builders ----------------------------------------------------------

function buildStoneFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const warmth = rng.jitter(5);
  // Warm grout base
  pushBox(parts, MATERIALS.bone([48 + warmth, 44 + warmth, 38 + warmth] as RGB),
    s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.01, 0.08);
  // 2x2 flagstones with size and color variation
  const gap = s * 0.04;
  const bw = (s - gap * 3) / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const j = rng.jitter(14);
      const base: RGB = [100 + j + warmth, 90 + j + warmth, 76 + j + warmth];
      const cx = gap + bw / 2 + col * (bw + gap) + rng.jitter(s * 0.02);
      const cy = gap + bw / 2 + row * (bw + gap) + rng.jitter(s * 0.02);
      const hw = bw / 2 - 1 + rng.jitter(s * 0.01);
      const hh = bw / 2 - 1 + rng.jitter(s * 0.01);
      pushBox(parts, MATERIALS.bone(base), cx, cy, hw, hh, s * 0.016, 0.16);
      // Subtle surface variation
      if (rng.float() > 0.4) {
        pushCircle(parts, MATERIALS.bone([base[0] + 8, base[1] + 6, base[2] + 4] as RGB),
          cx + rng.jitter(bw * 0.18), cy + rng.jitter(bw * 0.18), s * 0.03, 0.08);
      }
    }
  }
  // Occasional crack
  if (rng.float() > 0.5) {
    const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
    pushCapsule(parts, MATERIALS.bone([36 + warmth, 32 + warmth, 26 + warmth] as RGB), ax, ay,
      ax + rng.jitter(s * 0.22), ay + rng.jitter(s * 0.22), Math.max(1, s * 0.007), 0.08);
  }
  return parts;
}

/**
 * Irregular grass fringe along the flagged edges of a path tile. Color matches
 * the grass_floor base so the fringe blends with neighboring grass tiles.
 */
function grassFringe(parts: Part[], rng: RNG, s: number, edges?: TileConfig['edges']) {
  if (!edges) return;
  const blobs = (fx: (t: number) => number, fy: (t: number) => number) => {
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5 + rng.jitter(0.06);
      const j = rng.jitter(8);
      const col: RGB = [58 + j, 92 + j, 40 + j];
      pushCircle(parts, MATERIALS.flesh(col), fx(t) * s, fy(t) * s, s * (0.055 + rng.float() * 0.05), 0.06);
    }
  };
  if (edges.n) blobs((t) => t, () => rng.jitter(0.03));
  if (edges.s) blobs((t) => t, () => 1 + rng.jitter(0.03));
  if (edges.w) blobs(() => rng.jitter(0.03), (t) => t);
  if (edges.e) blobs(() => 1 + rng.jitter(0.03), (t) => t);
}

function buildDirtFloor(rng: RNG, s: number, edges?: TileConfig['edges']): Part[] {
  const parts: Part[] = [];
  const base: RGB = [112 + rng.jitter(14), 84 + rng.jitter(10), 56 + rng.jitter(8)];
  pushBox(parts, MATERIALS.flesh(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.08);
  // Darker dirt patches
  for (let i = 0; i < 2; i++) {
    const px = s * (0.2 + rng.float() * 0.6), py = s * (0.2 + rng.float() * 0.6);
    pushCircle(parts, MATERIALS.flesh([base[0] * 0.82, base[1] * 0.82, base[2] * 0.8] as RGB),
      px, py, s * (0.06 + rng.float() * 0.04), 0.06);
  }
  // Pebbles
  for (let i = 0; i < 4; i++) {
    const px = s * (0.1 + rng.float() * 0.8), py = s * (0.1 + rng.float() * 0.8);
    const pr = s * (0.018 + rng.float() * 0.015);
    const j = rng.jitter(10);
    pushCircle(parts, MATERIALS.bone([base[0] * 0.65 + j, base[1] * 0.65 + j, base[2] * 0.65 + j] as RGB),
      px, py, pr, 0.2);
  }
  // Occasional twig
  if (rng.float() > 0.6) {
    const ax = s * (0.2 + rng.float() * 0.5), ay = s * (0.3 + rng.float() * 0.4);
    pushCapsule(parts, MATERIALS.leather([72, 52, 32]),
      ax, ay, ax + rng.jitter(s * 0.15), ay + rng.jitter(s * 0.08), Math.max(1, s * 0.006), 0.15);
  }
  // Grass creeping over the edges that touch grass tiles
  grassFringe(parts, rng, s, edges);
  return parts;
}

function buildStoneWall(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const topCol: RGB = [68 + rng.jitter(8), 58 + rng.jitter(6), 48 + rng.jitter(5)];
  const frontCol: RGB = [92 + rng.jitter(10), 80 + rng.jitter(8), 68 + rng.jitter(7)];
  wallTopAndFront(parts, rng, s, h, topCol, frontCol);
  wallBricks(parts, rng, s, h, frontCol);
  wallBaseShadow(parts, s, h, frontCol);
  return parts;
}

function buildCrystalFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [35 + rng.jitter(6), 30 + rng.jitter(5), 45 + rng.jitter(6)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.12);
  // Crystal veins
  const veins = 3 + Math.floor(rng.float() * 2);
  for (let i = 0; i < veins; i++) {
    const ax = s * (0.08 + rng.float() * 0.84), ay = s * (0.08 + rng.float() * 0.84);
    const bx = s * (0.08 + rng.float() * 0.84), by = s * (0.08 + rng.float() * 0.84);
    const color: RGB = [65 + rng.jitter(20), 140 + rng.jitter(30), 195 + rng.jitter(20)];
    pushCapsule(parts, MATERIALS.gem(color), ax, ay, bx, by, Math.max(1, s * 0.014), 0.5);
  }
  // Bright crystal nodes at vein intersections
  for (let i = 0; i < 2; i++) {
    const nx = s * (0.2 + rng.float() * 0.6), ny = s * (0.2 + rng.float() * 0.6);
    pushCircle(parts, MATERIALS.gem([120 + rng.jitter(20), 200 + rng.jitter(20), 240]),
      nx, ny, s * (0.02 + rng.float() * 0.015), 0.7);
  }
  return parts;
}

function buildWoodDoor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Stone frame top surface
  const frameCol: RGB = [58 + rng.jitter(6), 54 + rng.jitter(5), 50 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.12, s * 0.13, s * 0.11, s * 0.12, s * 0.01, 0.22);
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.88, s * 0.13, s * 0.11, s * 0.12, s * 0.01, 0.22);
  // Stone arch/lintel at top center
  pushBox(parts, MATERIALS.bone([frameCol[0] + 8, frameCol[1] + 6, frameCol[2] + 5] as RGB),
    s * 0.5, s * 0.06, s * 0.3, s * 0.05, s * 0.02, 0.2);
  // Stone frame front face (sides)
  const frameFront: RGB = [frameCol[0] + 12, frameCol[1] + 10, frameCol[2] + 8];
  pushBox(parts, MATERIALS.bone(frameFront), s * 0.12, s * 0.6, s * 0.11, s * 0.36, s * 0.01, 0.2);
  pushBox(parts, MATERIALS.bone(frameFront), s * 0.88, s * 0.6, s * 0.11, s * 0.36, s * 0.01, 0.2);
  // Floor in doorway
  pushBox(parts, MATERIALS.bone([75 + rng.jitter(5), 70 + rng.jitter(4), 65 + rng.jitter(4)] as RGB),
    s * 0.5, s * 0.8, s * 0.28, s * 0.18, s * 0.01, 0.1);
  // Wooden door front face (vertical planks)
  const wood: RGB = [125 + rng.jitter(10), 82 + rng.jitter(8), 48 + rng.jitter(6)];
  pushBox(parts, MATERIALS.leather(wood), s * 0.5, s * 0.52, s * 0.26, s * 0.32, s * 0.015, 0.25);
  // Plank seams (vertical lines on door)
  const seam: RGB = [wood[0] * 0.72, wood[1] * 0.72, wood[2] * 0.72];
  for (let i = -1; i <= 1; i++) {
    const px = s * 0.5 + i * s * 0.12;
    pushCapsule(parts, MATERIALS.leather(seam), px, s * 0.25, px, s * 0.80,
      Math.max(1, s * 0.005), 0.1);
  }
  // Iron bands (horizontal)
  const bandMat = MATERIALS.metal([100, 98, 95]);
  pushBox(parts, bandMat, s * 0.5, s * 0.34, s * 0.27, s * 0.015, s * 0.006, 0.35);
  pushBox(parts, bandMat, s * 0.5, s * 0.58, s * 0.27, s * 0.015, s * 0.006, 0.35);
  pushBox(parts, bandMat, s * 0.5, s * 0.78, s * 0.27, s * 0.015, s * 0.006, 0.35);
  // Metal handle
  pushCircle(parts, MATERIALS.metal([155, 145, 105]), s * 0.58, s * 0.54, s * 0.025, 0.5);
  // Threshold shadow
  pushBox(parts, MATERIALS.bone([30, 28, 25]), s * 0.5, s * 0.96, s * 0.28, s * 0.012, s * 0.004, 0.06);
  return parts;
}

function buildLavaFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Dark cracked rock
  const base: RGB = [35 + rng.jitter(4), 24 + rng.jitter(3), 20 + rng.jitter(3)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.1);
  // Rock cracks (dark)
  for (let i = 0; i < 3; i++) {
    const ax = s * (0.05 + rng.float() * 0.9), ay = s * (0.05 + rng.float() * 0.9);
    const bx = s * (0.05 + rng.float() * 0.9), by = s * (0.05 + rng.float() * 0.9);
    pushCapsule(parts, MATERIALS.bone([20, 15, 12]), ax, ay, bx, by, Math.max(1, s * 0.006), 0.08);
  }
  // Glowing lava veins
  const veins = 2 + Math.floor(rng.float() * 2);
  for (let i = 0; i < veins; i++) {
    const ax = s * (0.08 + rng.float() * 0.84), ay = s * (0.08 + rng.float() * 0.84);
    const bx = s * (0.08 + rng.float() * 0.84), by = s * (0.08 + rng.float() * 0.84);
    const color: RGB = [255, 95 + rng.jitter(35), 25 + rng.jitter(15)];
    pushCapsule(parts, MATERIALS.ember(color), ax, ay, bx, by, Math.max(1.2, s * 0.018), 0.4);
  }
  // Bright glow spots
  for (let i = 0; i < 2; i++) {
    const gx = s * (0.2 + rng.float() * 0.6), gy = s * (0.2 + rng.float() * 0.6);
    pushCircle(parts, MATERIALS.ember([255, 180, 60]), gx, gy, s * (0.025 + rng.float() * 0.02), 0.6);
  }
  return parts;
}

function buildIceFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [170 + rng.jitter(8), 200 + rng.jitter(6), 220 + rng.jitter(4)];
  pushBox(parts, MATERIALS.glass(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.15);
  // Crack patterns
  for (let i = 0; i < 3; i++) {
    const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
    const bx = ax + rng.jitter(s * 0.3), by = ay + rng.jitter(s * 0.3);
    pushCapsule(parts, MATERIALS.glass([210, 230, 245]), ax, ay, bx, by, Math.max(1, s * 0.006), 0.15);
  }
  // Specular highlight spots
  pushCircle(parts, MATERIALS.glass([235, 245, 255]),
    s * (0.3 + rng.float() * 0.3), s * (0.3 + rng.float() * 0.3), s * 0.04, 0.3);
  return parts;
}

function buildMossFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Stone base
  const base: RGB = [82 + rng.jitter(6), 76 + rng.jitter(5), 70 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.1);
  // Moss patches
  for (let i = 0; i < 4; i++) {
    const px = s * (0.12 + rng.float() * 0.76), py = s * (0.12 + rng.float() * 0.76);
    const pr = s * (0.04 + rng.float() * 0.035);
    const color: RGB = [42 + rng.jitter(12), 88 + rng.jitter(18), 35 + rng.jitter(10)];
    pushCircle(parts, MATERIALS.flesh(color), px, py, pr, 0.1);
  }
  // Small plant tufts
  for (let i = 0; i < 2; i++) {
    const tx = s * (0.2 + rng.float() * 0.6), ty = s * (0.2 + rng.float() * 0.5);
    pushCapsule(parts, MATERIALS.flesh([55 + rng.jitter(10), 105 + rng.jitter(15), 45 + rng.jitter(8)] as RGB),
      tx, ty + s * 0.04, tx + rng.jitter(s * 0.02), ty - s * 0.03,
      Math.max(1, s * 0.008), 0.15);
  }
  return parts;
}

function buildGrassFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const j = rng.jitter(8);
  const base: RGB = [58 + j, 92 + j, 40 + j];
  pushBox(parts, MATERIALS.flesh(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, 0, 0.08);
  // Darker grass patches
  for (let i = 0; i < 3; i++) {
    const px = s * (0.08 + rng.float() * 0.84);
    const py = s * (0.08 + rng.float() * 0.84);
    pushCircle(parts, MATERIALS.flesh([base[0] * 0.78, base[1] * 0.84, base[2] * 0.76] as RGB),
      px, py, s * (0.06 + rng.float() * 0.04), 0.06);
  }
  // Lighter grass highlights
  for (let i = 0; i < 2; i++) {
    const px = s * (0.15 + rng.float() * 0.7);
    const py = s * (0.15 + rng.float() * 0.7);
    pushCircle(parts, MATERIALS.flesh([base[0] + 12, base[1] + 15, base[2] + 8] as RGB),
      px, py, s * (0.04 + rng.float() * 0.03), 0.05);
  }
  // Dirt specks
  for (let i = 0; i < 2; i++) {
    const px = s * (0.12 + rng.float() * 0.76);
    const py = s * (0.12 + rng.float() * 0.76);
    pushCircle(parts, MATERIALS.flesh([92 + rng.jitter(8), 70 + rng.jitter(6), 46 + rng.jitter(5)] as RGB),
      px, py, s * (0.018 + rng.float() * 0.012), 0.1);
  }
  return parts;
}

function buildSpikeTrap(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.12);
  // 3x3 spike holes with metal tips
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const sx = s * (0.22 + c * 0.28) + rng.jitter(s * 0.015);
      const sy = s * (0.22 + r * 0.28) + rng.jitter(s * 0.015);
      // Dark hole
      pushCircle(parts, MATERIALS.bone([25, 22, 18]), sx, sy, s * 0.04, 0.08);
      // Spike tip (bright metal)
      pushCircle(parts, MATERIALS.metal([165, 160, 152]), sx, sy, s * 0.018, 0.6);
      // Tiny highlight on spike
      pushCircle(parts, MATERIALS.metal([210, 205, 195]), sx - s * 0.005, sy - s * 0.005, s * 0.006, 0.5);
    }
  }
  return parts;
}

function buildStairsDown(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Surrounding stone
  const base: RGB = [72 + rng.jitter(5), 68 + rng.jitter(4), 64 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.15);
  // Steps descending (each darker than the last)
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const sy = s * (0.15 + i * 0.145);
    const sw = s * (0.40 - i * 0.025);
    const brightness = 1 - t * 0.5;
    const stepCol: RGB = [base[0] * brightness, base[1] * brightness, base[2] * brightness];
    // Step tread (top face)
    pushBox(parts, MATERIALS.bone(stepCol), s * 0.5, sy, sw / 2, s * 0.035, s * 0.008, 0.18);
    // Step riser (front edge, slightly lighter)
    pushBox(parts, MATERIALS.bone([stepCol[0] + 8, stepCol[1] + 6, stepCol[2] + 5] as RGB),
      s * 0.5, sy + s * 0.04, sw / 2, s * 0.015, s * 0.005, 0.12);
  }
  // Dark void at bottom
  pushBox(parts, MATERIALS.bone([15, 12, 10]), s * 0.5, s * 0.88, s * 0.16, s * 0.08, s * 0.015, 0.06);
  return parts;
}

function buildStairsUp(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const base: RGB = [72 + rng.jitter(5), 68 + rng.jitter(4), 64 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.15);
  // Steps ascending (each lighter)
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const sy = s * (0.78 - i * 0.145);
    const sw = s * (0.40 - i * 0.025);
    const brightness = 1 + t * 0.25;
    const stepCol: RGB = [
      Math.min(255, base[0] * brightness),
      Math.min(255, base[1] * brightness),
      Math.min(255, base[2] * brightness),
    ];
    pushBox(parts, MATERIALS.bone(stepCol), s * 0.5, sy, sw / 2, s * 0.035, s * 0.008, 0.18);
    pushBox(parts, MATERIALS.bone([stepCol[0] + 8, stepCol[1] + 6, stepCol[2] + 5] as RGB),
      s * 0.5, sy + s * 0.04, sw / 2, s * 0.015, s * 0.005, 0.12);
  }
  // Light from above
  pushCircle(parts, MATERIALS.ember([210, 200, 150]), s * 0.5, s * 0.12, s * 0.065, 0.8);
  return parts;
}

function buildCrackedWall(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const topCol: RGB = [50 + rng.jitter(6), 46 + rng.jitter(5), 44 + rng.jitter(5)];
  const frontCol: RGB = [72 + rng.jitter(8), 66 + rng.jitter(6), 62 + rng.jitter(6)];
  wallTopAndFront(parts, rng, s, h, topCol, frontCol);
  wallBricks(parts, rng, s, h, frontCol);
  const crackCol = MATERIALS.bone([frontCol[0] * 0.3, frontCol[1] * 0.3, frontCol[2] * 0.28] as RGB);
  const cracks = 3 + Math.floor(rng.float() * 3);
  for (let i = 0; i < cracks; i++) {
    const ax = s * (0.1 + rng.float() * 0.8), ay = h * (0.22 + rng.float() * 0.55);
    const bx = ax + rng.jitter(s * 0.3), by = ay + rng.jitter(h * 0.2);
    pushCapsule(parts, crackCol, ax, ay, bx, by, Math.max(1, s * 0.012), 0.08);
  }
  pushBox(parts, MATERIALS.bone([25, 22, 20]),
    s * (0.3 + rng.float() * 0.4), h * (0.35 + rng.float() * 0.3),
    s * 0.06, h * 0.03, s * 0.008, 0.06);
  wallBaseShadow(parts, s, h, frontCol);
  return parts;
}

function buildPit(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const edge: RGB = [72 + rng.jitter(5), 66 + rng.jitter(4), 62 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(edge), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.12);
  // Darker inner rim
  pushCircle(parts, MATERIALS.bone([edge[0] * 0.6, edge[1] * 0.6, edge[2] * 0.58] as RGB),
    s * 0.5, s * 0.5, s * 0.34, 0.12);
  // Deep black void
  pushCircle(parts, MATERIALS.bone([12, 10, 8]), s * 0.5, s * 0.5, s * 0.28, 0.06);
  // Rim highlight (top edge catches light)
  pushCapsule(parts, MATERIALS.bone([edge[0] + 18, edge[1] + 15, edge[2] + 12] as RGB),
    s * 0.25, s * 0.36, s * 0.75, s * 0.36, Math.max(1, s * 0.008), 0.15);
  return parts;
}

function buildWaterPool(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const j = rng.jitter(5);
  // Stone rim
  const rimCol: RGB = [82 + j, 76 + j, 70 + j];
  pushBox(parts, MATERIALS.bone(rimCol), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.12);
  // Water surface (dark reflective)
  const waterCol: RGB = [28 + j, 52 + j, 68 + j];
  pushCircle(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.5, s * 0.36, 0.15);
  // Ripple rings
  const ripples = 2 + (rng.float() > 0.5 ? 1 : 0);
  for (let i = 0; i < ripples; i++) {
    const cx = s * (0.35 + rng.float() * 0.3);
    const cy = s * (0.35 + rng.float() * 0.3);
    const r = s * (0.06 + rng.float() * 0.05);
    const rippleCol: RGB = [waterCol[0] + 30, waterCol[1] + 35, waterCol[2] + 28];
    const t = Math.max(1.2, s * 0.01);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx - r, cy, cx, cy - r * 0.6, t, 0.18);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx, cy - r * 0.6, cx + r, cy, t, 0.18);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx + r, cy, cx, cy + r * 0.6, t, 0.18);
    pushCapsule(parts, MATERIALS.glass(rippleCol), cx, cy + r * 0.6, cx - r, cy, t, 0.18);
  }
  // Specular glint on water
  pushCircle(parts, MATERIALS.glass([waterCol[0] + 50, waterCol[1] + 55, waterCol[2] + 50] as RGB),
    s * (0.35 + rng.float() * 0.15), s * (0.35 + rng.float() * 0.15), s * 0.025, 0.25);
  return parts;
}

function buildUndergroundRiver(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Stone banks (3/4 view: top bank shows top surface, bottom bank shows front edge)
  const bankCol: RGB = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.1, s * 0.50, s * 0.1, 0, 0.18);
  // Bank front edge
  pushBox(parts, MATERIALS.bone([bankCol[0] + 10, bankCol[1] + 8, bankCol[2] + 6] as RGB),
    s * 0.5, s * 0.21, s * 0.50, s * 0.015, 0, 0.12);
  // Bottom bank (top surface visible)
  pushBox(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.9, s * 0.50, s * 0.1, 0, 0.18);
  // Water channel
  const j = rng.jitter(5);
  const waterCol: RGB = [24 + j, 48 + j, 62 + j];
  pushBox(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.52, s * 0.50, s * 0.28, 0, 0.12);
  // Flow lines (horizontal ripples)
  const ripples = 4 + Math.floor(rng.float() * 2);
  for (let i = 0; i < ripples; i++) {
    const ry = s * (0.3 + rng.float() * 0.4);
    const ax = s * (0.06 + rng.float() * 0.15);
    const bx = s * (0.70 + rng.float() * 0.22);
    pushCapsule(parts, MATERIALS.glass([waterCol[0] + 25, waterCol[1] + 30, waterCol[2] + 25] as RGB),
      ax, ry, bx, ry + rng.jitter(s * 0.015), Math.max(1.2, s * 0.008), 0.15);
  }
  return parts;
}

function buildStalagmite(rng: RNG, s: number, _h?: number): Part[] {
  const parts: Part[] = [];
  // Floor base
  const floorCol = floorBase(parts, rng, s);
  // 3/4 view: stalagmite shows front face (rising from floor)
  const pillars = 2 + (rng.float() > 0.5 ? 1 : 0);
  for (let i = 0; i < pillars; i++) {
    const j = rng.jitter(10);
    const col: RGB = [95 + j, 85 + j, 75 + j];
    const cx = s * (0.25 + i * 0.25) + rng.jitter(s * 0.04);
    const baseY = s * 0.82;
    const tipY = s * (0.22 + rng.float() * 0.15);
    const baseW = s * (0.06 + rng.float() * 0.03);
    // Shadow at base
    pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.5, floorCol[1] * 0.5, floorCol[2] * 0.5] as RGB),
      cx, baseY + s * 0.02, baseW * 1.3, s * 0.025, 0.06);
    // Rock body (front face, tapers upward)
    pushCapsule(parts, MATERIALS.bone(col), cx, baseY, cx, tipY, baseW, 0.3);
    // Wider base
    pushEllipse(parts, MATERIALS.bone([col[0] - 8, col[1] - 6, col[2] - 5] as RGB),
      cx, baseY - s * 0.02, baseW * 1.2, s * 0.04, 0.2);
    // Highlight on tip
    pushCircle(parts, MATERIALS.bone([col[0] + 22, col[1] + 18, col[2] + 15] as RGB),
      cx, tipY + s * 0.02, baseW * 0.4, 0.35);
  }
  return parts;
}

function buildCobweb(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Stone background
  const baseCol: RGB = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
  pushBox(parts, MATERIALS.bone(baseCol), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.1);
  // Web strands radiating from corner
  const webCol: RGB = [185, 182, 178];
  const ox = s * 0.04, oy = s * 0.04;
  const strands = 6 + Math.floor(rng.float() * 3);
  for (let i = 0; i < strands; i++) {
    const angle = (i / strands) * (Math.PI * 0.5);
    const len = s * (0.35 + rng.float() * 0.4);
    const ex = ox + Math.cos(angle) * len;
    const ey = oy + Math.sin(angle) * len;
    pushCapsule(parts, MATERIALS.bone(webCol), ox, oy, ex, ey, Math.max(1.2, s * 0.006), 0.06);
  }
  // Cross strands connecting radial strands
  for (let ring = 0; ring < 3; ring++) {
    const dist = s * (0.12 + ring * 0.15);
    for (let seg = 0; seg < 3; seg++) {
      const a1 = (seg / 4) * (Math.PI * 0.5) + rng.jitter(0.1);
      const a2 = ((seg + 1) / 4) * (Math.PI * 0.5) + rng.jitter(0.1);
      const ax = ox + Math.cos(a1) * dist, ay = oy + Math.sin(a1) * dist;
      const bx = ox + Math.cos(a2) * dist, by = oy + Math.sin(a2) * dist;
      pushCapsule(parts, MATERIALS.bone(webCol), ax, ay, bx, by, Math.max(1, s * 0.004), 0.04);
    }
  }
  return parts;
}

function buildBarrel(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const woodCol: RGB = [120 + rng.jitter(10), 80 + rng.jitter(8), 48 + rng.jitter(6)];
  // Shadow under barrel
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.88, s * 0.22, s * 0.06, 0.05);
  // Barrel front face (rounded rectangle with wood staves)
  pushBox(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.62, s * 0.18, s * 0.26, s * 0.04, 0.3);
  // Stave lines (vertical on front face)
  const staveDark: RGB = [woodCol[0] * 0.78, woodCol[1] * 0.78, woodCol[2] * 0.75];
  for (let i = -2; i <= 2; i++) {
    const sx = s * 0.5 + i * s * 0.065;
    pushCapsule(parts, MATERIALS.leather(staveDark), sx, s * 0.40, sx, s * 0.84,
      Math.max(1, s * 0.004), 0.12);
  }
  // Metal bands (horizontal across front face)
  const bandMat = MATERIALS.metal([140, 135, 128]);
  pushBox(parts, bandMat, s * 0.5, s * 0.45, s * 0.19, s * 0.012, s * 0.005, 0.4);
  pushBox(parts, bandMat, s * 0.5, s * 0.62, s * 0.20, s * 0.012, s * 0.005, 0.4);
  pushBox(parts, bandMat, s * 0.5, s * 0.79, s * 0.19, s * 0.012, s * 0.005, 0.4);
  // Top (elliptical lid visible from 3/4 angle)
  pushEllipse(parts, MATERIALS.leather([woodCol[0] * 0.88, woodCol[1] * 0.88, woodCol[2] * 0.85] as RGB),
    s * 0.5, s * 0.35, s * 0.17, s * 0.07, 0.25);
  // Top rim
  pushEllipse(parts, bandMat, s * 0.5, s * 0.35, s * 0.18, s * 0.075, 0.35);
  pushEllipse(parts, MATERIALS.leather([woodCol[0] * 0.85, woodCol[1] * 0.85, woodCol[2] * 0.82] as RGB),
    s * 0.5, s * 0.35, s * 0.155, s * 0.06, 0.22);
  return parts;
}

function buildChain(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Dark background (ceiling/wall)
  pushBox(parts, MATERIALS.bone([22, 20, 18]), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.06);
  // Chain links hanging
  const chainMat = MATERIALS.metal([162 + rng.jitter(8), 156 + rng.jitter(6), 148 + rng.jitter(6)]);
  const links = 5 + Math.floor(rng.float() * 2);
  const cx = s * 0.5 + rng.jitter(s * 0.04);
  for (let i = 0; i < links; i++) {
    const ly = s * (0.08 + i * 0.15);
    const linkR = Math.max(1.2, s * 0.032);
    if (i % 2 === 0) {
      pushCircle(parts, chainMat, cx, ly, linkR, 0.5);
      pushCircle(parts, MATERIALS.bone([25, 22, 20]), cx, ly, linkR * 0.45, 0.3);
    } else {
      pushCapsule(parts, chainMat, cx, ly - linkR * 0.5, cx, ly + linkR * 0.5,
        Math.max(1.2, s * 0.016), 0.45);
    }
  }
  return parts;
}

function buildBonePile(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  floorBase(parts, rng, s);
  // Scattered bones
  const boneMat = MATERIALS.bone([205, 196, 178]);
  const bones = 6 + Math.floor(rng.float() * 3);
  for (let i = 0; i < bones; i++) {
    const cx = s * (0.18 + rng.float() * 0.64);
    const cy = s * (0.35 + rng.float() * 0.45);
    const angle = rng.float() * Math.PI;
    const len = s * (0.05 + rng.float() * 0.08);
    const ax = cx - Math.cos(angle) * len, ay = cy - Math.sin(angle) * len;
    const bx = cx + Math.cos(angle) * len, by = cy + Math.sin(angle) * len;
    pushCapsule(parts, boneMat, ax, ay, bx, by,
      Math.max(1.2, s * (0.012 + rng.float() * 0.008)), 0.3);
  }
  // Skull detail
  pushCircle(parts, boneMat, s * (0.42 + rng.jitter(0.06)), s * (0.48 + rng.jitter(0.05)),
    s * 0.042, 0.35);
  // Eye socket dots
  const skullX = s * (0.42 + rng.jitter(0.06));
  const skullY = s * (0.48 + rng.jitter(0.05));
  pushCircle(parts, MATERIALS.bone([35, 30, 28]), skullX - s * 0.015, skullY - s * 0.008, s * 0.008, 0.2);
  pushCircle(parts, MATERIALS.bone([35, 30, 28]), skullX + s * 0.015, skullY - s * 0.008, s * 0.008, 0.2);
  return parts;
}

// ---- interior / building tile builders (3/4 perspective) --------------------

function buildShopCounter(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const woodCol: RGB = [108 + rng.jitter(8), 70 + rng.jitter(6), 42 + rng.jitter(5)];
  // Shadow under counter
  pushBox(parts, MATERIALS.bone([floorCol[0] * 0.5, floorCol[1] * 0.5, floorCol[2] * 0.48] as RGB),
    s * 0.52, s * 0.88, s * 0.36, s * 0.06, s * 0.01, 0.06);
  // Counter front face
  pushBox(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.7, s * 0.38, s * 0.14, s * 0.02, 0.22);
  // Plank detail on front face
  const plankDark: RGB = [woodCol[0] * 0.8, woodCol[1] * 0.8, woodCol[2] * 0.78];
  pushCapsule(parts, MATERIALS.leather(plankDark), s * 0.14, s * 0.62, s * 0.86, s * 0.62,
    Math.max(1, s * 0.004), 0.08);
  pushCapsule(parts, MATERIALS.leather(plankDark), s * 0.14, s * 0.72, s * 0.86, s * 0.72,
    Math.max(1, s * 0.004), 0.08);
  // Counter top surface (foreshortened)
  pushBox(parts, MATERIALS.leather([woodCol[0] + 12, woodCol[1] + 8, woodCol[2] + 5] as RGB),
    s * 0.5, s * 0.54, s * 0.38, s * 0.05, s * 0.015, 0.2);
  // Edge highlight
  pushBox(parts, MATERIALS.leather([woodCol[0] + 22, woodCol[1] + 15, woodCol[2] + 10] as RGB),
    s * 0.5, s * 0.50, s * 0.37, s * 0.008, s * 0.003, 0.15);
  // Items on counter
  pushCircle(parts, MATERIALS.gold([215, 188, 82]), s * 0.6, s * 0.53, s * 0.022, 0.5);
  pushCircle(parts, MATERIALS.gold([200, 175, 72]), s * 0.4, s * 0.54, s * 0.018, 0.45);
  pushBox(parts, MATERIALS.leather([woodCol[0] * 0.85, woodCol[1] * 0.85, woodCol[2] * 0.82] as RGB),
    s * 0.72, s * 0.53, s * 0.035, s * 0.025, s * 0.008, 0.2);
  return parts;
}

function buildIronGate(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Stone frame 3/4 view
  const frameCol: RGB = [55 + rng.jitter(6), 50 + rng.jitter(5), 48 + rng.jitter(5)];
  // Frame top surfaces
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.1, s * 0.13, s * 0.09, s * 0.12, s * 0.01, 0.22);
  pushBox(parts, MATERIALS.bone(frameCol), s * 0.9, s * 0.13, s * 0.09, s * 0.12, s * 0.01, 0.22);
  // Frame front faces
  const frameFront: RGB = [frameCol[0] + 12, frameCol[1] + 10, frameCol[2] + 8];
  pushBox(parts, MATERIALS.bone(frameFront), s * 0.1, s * 0.6, s * 0.09, s * 0.36, s * 0.01, 0.2);
  pushBox(parts, MATERIALS.bone(frameFront), s * 0.9, s * 0.6, s * 0.09, s * 0.36, s * 0.01, 0.2);
  // Floor in gateway
  pushBox(parts, MATERIALS.bone([72, 66, 62]), s * 0.5, s * 0.6, s * 0.32, s * 0.38, s * 0.01, 0.08);
  // Top bar connecting the frame
  const barMat = MATERIALS.metal([122 + rng.jitter(6), 118 + rng.jitter(5), 115 + rng.jitter(5)]);
  pushBox(parts, barMat, s * 0.5, s * 0.26, s * 0.32, s * 0.018, s * 0.006, 0.4);
  // Vertical iron bars (front face, spanning top to bottom)
  const bars = 5;
  for (let i = 0; i < bars; i++) {
    const bx = s * (0.25 + i * 0.125);
    pushCapsule(parts, barMat, bx, s * 0.28, bx, s * 0.92, Math.max(1.2, s * 0.016), 0.42);
  }
  // Crossbar at mid height
  pushCapsule(parts, barMat, s * 0.22, s * 0.58, s * 0.78, s * 0.58, Math.max(1.2, s * 0.014), 0.38);
  return parts;
}

function buildTorchBracket(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const wallCol: RGB = [68 + rng.jitter(6), 62 + rng.jitter(5), 58 + rng.jitter(5)];
  const topCol: RGB = [wallCol[0] - 15, wallCol[1] - 14, wallCol[2] - 13];
  wallTopAndFront(parts, rng, s, s, topCol, wallCol);
  // A few brick hints
  const mortarCol: RGB = [wallCol[0] * 0.6, wallCol[1] * 0.6, wallCol[2] * 0.58];
  pushCapsule(parts, MATERIALS.bone(mortarCol), s * 0.04, s * 0.48, s * 0.96, s * 0.48,
    Math.max(1, s * 0.004), 0.06);
  pushCapsule(parts, MATERIALS.bone(mortarCol), s * 0.04, s * 0.68, s * 0.96, s * 0.68,
    Math.max(1, s * 0.004), 0.06);
  // Metal bracket (mounted on wall face)
  const bracketMat = MATERIALS.metal([135, 128, 122]);
  pushBox(parts, bracketMat, s * 0.5, s * 0.68, s * 0.035, s * 0.06, s * 0.008, 0.4);
  // Bracket arm extending outward (toward viewer in 3/4)
  pushCapsule(parts, bracketMat, s * 0.5, s * 0.68, s * 0.5, s * 0.78, Math.max(1.2, s * 0.02), 0.35);
  // Torch handle
  pushCapsule(parts, MATERIALS.leather([105, 65, 38]),
    s * 0.5, s * 0.60, s * 0.5, s * 0.42, Math.max(1.2, s * 0.025), 0.25);
  // Flame (front-facing, visible from 3/4)
  pushEllipse(parts, MATERIALS.ember([255, 150, 40]), s * 0.5, s * 0.32, s * 0.06, s * 0.10, 0.7);
  pushEllipse(parts, MATERIALS.ember([255, 230, 120]), s * 0.5, s * 0.34, s * 0.03, s * 0.06, 0.8);
  // Warm glow on nearby wall
  pushCircle(parts, MATERIALS.ember([255, 200, 80]), s * 0.5, s * 0.50, s * 0.12, 0.15);
  return parts;
}

function buildAltar(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const stoneCol: RGB = [80 + rng.jitter(5), 74 + rng.jitter(4), 84 + rng.jitter(5)];
  // Shadow under altar
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.88, s * 0.24, s * 0.06, 0.06);
  // Altar front face (stone block)
  pushBox(parts, MATERIALS.bone(stoneCol), s * 0.5, s * 0.68, s * 0.22, s * 0.18, s * 0.02, 0.22);
  // Carved detail on front face
  pushBox(parts, MATERIALS.bone([stoneCol[0] * 0.8, stoneCol[1] * 0.8, stoneCol[2] * 0.82] as RGB),
    s * 0.5, s * 0.70, s * 0.14, s * 0.06, s * 0.015, 0.18);
  // Altar top surface (foreshortened)
  pushBox(parts, MATERIALS.bone([stoneCol[0] + 15, stoneCol[1] + 12, stoneCol[2] + 16] as RGB),
    s * 0.5, s * 0.48, s * 0.24, s * 0.06, s * 0.02, 0.2);
  // Edge highlight
  pushBox(parts, MATERIALS.bone([stoneCol[0] + 28, stoneCol[1] + 24, stoneCol[2] + 30] as RGB),
    s * 0.5, s * 0.43, s * 0.22, s * 0.006, s * 0.003, 0.15);
  // Glowing rune circle on top surface
  const runeCol: RGB = [135 + rng.jitter(20), 75 + rng.jitter(15), 195 + rng.jitter(20)];
  pushCircle(parts, MATERIALS.gem(runeCol), s * 0.5, s * 0.48, s * 0.06, 0.6);
  pushCircle(parts, MATERIALS.ember([175, 115, 248]), s * 0.5, s * 0.48, s * 0.03, 0.8);
  return parts;
}

function buildAnvil(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const anvilCol: RGB = [58 + rng.jitter(5), 55 + rng.jitter(4), 52 + rng.jitter(4)];
  // Shadow under anvil
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.48, s * 0.86, s * 0.2, s * 0.05, 0.06);
  // Anvil base/pedestal (front face)
  pushBox(parts, MATERIALS.metal([anvilCol[0] - 5, anvilCol[1] - 4, anvilCol[2] - 3] as RGB),
    s * 0.5, s * 0.76, s * 0.08, s * 0.1, s * 0.015, 0.3);
  // Anvil body (front face, narrower middle)
  pushBox(parts, MATERIALS.metal(anvilCol), s * 0.5, s * 0.60, s * 0.06, s * 0.08, s * 0.012, 0.32);
  // Anvil face (wide working surface, top view)
  const topCol: RGB = [anvilCol[0] + 20, anvilCol[1] + 16, anvilCol[2] + 13];
  pushBox(parts, MATERIALS.metal(topCol), s * 0.5, s * 0.48, s * 0.17, s * 0.05, s * 0.02, 0.38);
  // Horn extending to one side
  pushCapsule(parts, MATERIALS.metal(anvilCol), s * 0.67, s * 0.50, s * 0.78, s * 0.52,
    Math.max(1.2, s * 0.025), 0.35);
  // Hammer lying nearby
  const hammerHead: RGB = [105, 100, 95];
  pushBox(parts, MATERIALS.metal(hammerHead), s * 0.28, s * 0.74, s * 0.035, s * 0.022, s * 0.008, 0.38);
  pushCapsule(parts, MATERIALS.leather([92, 60, 38]), s * 0.28, s * 0.76, s * 0.28, s * 0.90,
    Math.max(1.2, s * 0.01), 0.2);
  return parts;
}

function buildBed(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const frameCol: RGB = [98 + rng.jitter(8), 64 + rng.jitter(6), 40 + rng.jitter(5)];
  // Shadow under bed
  pushBox(parts, MATERIALS.bone([floorCol[0] * 0.48, floorCol[1] * 0.48, floorCol[2] * 0.45] as RGB),
    s * 0.52, s * 0.9, s * 0.22, s * 0.05, s * 0.01, 0.05);
  // Bed legs visible from front
  pushBox(parts, MATERIALS.leather([frameCol[0] * 0.8, frameCol[1] * 0.8, frameCol[2] * 0.78] as RGB),
    s * 0.3, s * 0.88, s * 0.02, s * 0.04, s * 0.008, 0.2);
  pushBox(parts, MATERIALS.leather([frameCol[0] * 0.8, frameCol[1] * 0.8, frameCol[2] * 0.78] as RGB),
    s * 0.7, s * 0.88, s * 0.02, s * 0.04, s * 0.008, 0.2);
  // Bed frame front face (foot of bed)
  pushBox(parts, MATERIALS.leather(frameCol), s * 0.5, s * 0.78, s * 0.22, s * 0.04, s * 0.015, 0.22);
  // Headboard (back of bed, taller, visible above the mattress)
  pushBox(parts, MATERIALS.leather([frameCol[0] * 0.88, frameCol[1] * 0.88, frameCol[2] * 0.86] as RGB),
    s * 0.5, s * 0.30, s * 0.24, s * 0.06, s * 0.02, 0.25);
  // Mattress/blanket top surface (foreshortened, main visible area)
  const blanketCol: RGB = [62 + rng.jitter(15), 52 + rng.jitter(10), 78 + rng.jitter(15)];
  pushBox(parts, MATERIALS.cloth(blanketCol), s * 0.5, s * 0.55, s * 0.2, s * 0.18, s * 0.02, 0.15);
  // Blanket fold detail
  pushCapsule(parts, MATERIALS.cloth([blanketCol[0] * 0.85, blanketCol[1] * 0.85, blanketCol[2] * 0.88] as RGB),
    s * 0.32, s * 0.62, s * 0.68, s * 0.60, Math.max(1, s * 0.006), 0.08);
  // Pillow
  const pillowCol: RGB = [162 + rng.jitter(8), 158 + rng.jitter(6), 148 + rng.jitter(6)];
  pushEllipse(parts, MATERIALS.cloth(pillowCol), s * 0.5, s * 0.40, s * 0.10, s * 0.04, 0.2);
  return parts;
}

function buildTable(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const topCol: RGB = [112 + rng.jitter(8), 74 + rng.jitter(6), 46 + rng.jitter(5)];
  // Shadow under table
  pushBox(parts, MATERIALS.bone([floorCol[0] * 0.48, floorCol[1] * 0.48, floorCol[2] * 0.45] as RGB),
    s * 0.52, s * 0.88, s * 0.28, s * 0.05, s * 0.01, 0.05);
  // Table legs (visible from 3/4 front)
  const legCol: RGB = [topCol[0] * 0.8, topCol[1] * 0.8, topCol[2] * 0.78];
  pushCapsule(parts, MATERIALS.leather(legCol), s * 0.26, s * 0.60, s * 0.26, s * 0.88,
    Math.max(1.2, s * 0.016), 0.2);
  pushCapsule(parts, MATERIALS.leather(legCol), s * 0.74, s * 0.60, s * 0.74, s * 0.88,
    Math.max(1.2, s * 0.016), 0.2);
  // Table front edge (apron)
  pushBox(parts, MATERIALS.leather([topCol[0] - 8, topCol[1] - 5, topCol[2] - 4] as RGB),
    s * 0.5, s * 0.60, s * 0.26, s * 0.03, s * 0.01, 0.2);
  // Table top surface (foreshortened)
  pushBox(parts, MATERIALS.leather(topCol), s * 0.5, s * 0.50, s * 0.28, s * 0.08, s * 0.02, 0.25);
  // Top edge highlight
  pushBox(parts, MATERIALS.leather([topCol[0] + 15, topCol[1] + 10, topCol[2] + 8] as RGB),
    s * 0.5, s * 0.43, s * 0.26, s * 0.006, s * 0.003, 0.18);
  // Items on table
  // Mug
  pushCircle(parts, MATERIALS.bone([142, 132, 118]), s * 0.62, s * 0.48, s * 0.025, 0.3);
  pushCircle(parts, MATERIALS.bone([88, 72, 58]), s * 0.62, s * 0.48, s * 0.014, 0.15);
  // Plate
  pushCircle(parts, MATERIALS.bone([168, 162, 150]), s * 0.38, s * 0.50, s * 0.035, 0.18);
  return parts;
}

function buildBookshelf(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const wallCol: RGB = [65 + rng.jitter(6), 60 + rng.jitter(5), 56 + rng.jitter(5)];
  const topCol: RGB = [wallCol[0] - 12, wallCol[1] - 11, wallCol[2] - 10];
  wallTopAndFront(parts, rng, s, s, topCol, wallCol);
  // Bookshelf frame (front face visible, against wall)
  const shelfCol: RGB = [102 + rng.jitter(6), 68 + rng.jitter(5), 40 + rng.jitter(4)];
  pushBox(parts, MATERIALS.leather(shelfCol), s * 0.5, s * 0.62, s * 0.38, s * 0.28, s * 0.015, 0.2);
  // Shelf dividers (horizontal lines across front)
  const shelfDark: RGB = [shelfCol[0] * 0.75, shelfCol[1] * 0.75, shelfCol[2] * 0.72];
  pushCapsule(parts, MATERIALS.leather(shelfDark), s * 0.14, s * 0.50, s * 0.86, s * 0.50,
    Math.max(1, s * 0.006), 0.12);
  pushCapsule(parts, MATERIALS.leather(shelfDark), s * 0.14, s * 0.68, s * 0.86, s * 0.68,
    Math.max(1, s * 0.006), 0.12);
  // Book spines (colored rectangles on each shelf row)
  const bookColors: RGB[] = [
    [138 + rng.jitter(18), 42 + rng.jitter(12), 42 + rng.jitter(12)],
    [42 + rng.jitter(12), 62 + rng.jitter(12), 128 + rng.jitter(18)],
    [52 + rng.jitter(12), 108 + rng.jitter(18), 52 + rng.jitter(12)],
    [128 + rng.jitter(18), 108 + rng.jitter(12), 40 + rng.jitter(10)],
    [90 + rng.jitter(15), 45 + rng.jitter(10), 110 + rng.jitter(15)],
    [120 + rng.jitter(15), 75 + rng.jitter(10), 45 + rng.jitter(10)],
  ];
  // Top shelf books
  for (let i = 0; i < 3; i++) {
    const bx = s * (0.2 + i * 0.2) + rng.jitter(s * 0.015);
    const bh = s * (0.04 + rng.float() * 0.025);
    pushBox(parts, MATERIALS.cloth(bookColors[i]), bx, s * 0.42, s * 0.04, bh, s * 0.005, 0.15);
  }
  // Bottom shelf books
  for (let i = 0; i < 3; i++) {
    const bx = s * (0.22 + i * 0.2) + rng.jitter(s * 0.015);
    const bh = s * (0.04 + rng.float() * 0.025);
    pushBox(parts, MATERIALS.cloth(bookColors[i + 3]), bx, s * 0.60, s * 0.04, bh, s * 0.005, 0.15);
  }
  // Bookshelf top surface (narrow ledge visible from 3/4)
  pushBox(parts, MATERIALS.leather([shelfCol[0] + 10, shelfCol[1] + 7, shelfCol[2] + 5] as RGB),
    s * 0.5, s * 0.33, s * 0.38, s * 0.02, s * 0.008, 0.18);
  return parts;
}

function buildPillar(rng: RNG, s: number, _h?: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const pillarCol: RGB = [108 + rng.jitter(8), 100 + rng.jitter(6), 92 + rng.jitter(6)];
  // Shadow at base
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.88, s * 0.18, s * 0.05, 0.06);
  // Pillar base (wider, front face)
  pushBox(parts, MATERIALS.bone([pillarCol[0] - 8, pillarCol[1] - 6, pillarCol[2] - 5] as RGB),
    s * 0.5, s * 0.82, s * 0.16, s * 0.05, s * 0.02, 0.22);
  // Pillar shaft (front face, tall cylinder approximated as rounded box)
  pushBox(parts, MATERIALS.bone(pillarCol), s * 0.5, s * 0.52, s * 0.1, s * 0.28, s * 0.06, 0.3);
  // Pillar capital (wider top section)
  pushBox(parts, MATERIALS.bone([pillarCol[0] - 5, pillarCol[1] - 4, pillarCol[2] - 3] as RGB),
    s * 0.5, s * 0.23, s * 0.14, s * 0.04, s * 0.02, 0.25);
  // Top surface (elliptical from 3/4)
  pushEllipse(parts, MATERIALS.bone([pillarCol[0] + 18, pillarCol[1] + 15, pillarCol[2] + 12] as RGB),
    s * 0.5, s * 0.19, s * 0.13, s * 0.04, 0.22);
  // Highlight on front face
  pushBox(parts, MATERIALS.bone([pillarCol[0] + 12, pillarCol[1] + 10, pillarCol[2] + 8] as RGB),
    s * 0.45, s * 0.52, s * 0.03, s * 0.22, s * 0.02, 0.2);
  return parts;
}

function buildFountain(rng: RNG, s: number, _h?: number): Part[] {
  const parts: Part[] = [];
  // Floor
  const floorCol = floorBase(parts, rng, s);
  const basinCol: RGB = [90 + rng.jitter(5), 84 + rng.jitter(4), 80 + rng.jitter(4)];
  // Shadow under fountain
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.9, s * 0.28, s * 0.06, 0.05);
  // Basin front face (stone wall of the basin)
  pushBox(parts, MATERIALS.bone(basinCol), s * 0.5, s * 0.72, s * 0.28, s * 0.14, s * 0.03, 0.2);
  // Basin rim highlight
  pushBox(parts, MATERIALS.bone([basinCol[0] + 18, basinCol[1] + 15, basinCol[2] + 12] as RGB),
    s * 0.5, s * 0.58, s * 0.29, s * 0.012, s * 0.005, 0.18);
  // Water surface (elliptical from 3/4, inside basin)
  const waterCol: RGB = [38 + rng.jitter(6), 72 + rng.jitter(8), 108 + rng.jitter(8)];
  pushEllipse(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.52, s * 0.22, s * 0.1, 0.18);
  // Center spout (pillar rising from water)
  pushCapsule(parts, MATERIALS.bone([basinCol[0] + 10, basinCol[1] + 8, basinCol[2] + 6] as RGB),
    s * 0.5, s * 0.52, s * 0.5, s * 0.30, Math.max(1.2, s * 0.025), 0.25);
  // Water droplets/splash at top of spout
  pushCircle(parts, MATERIALS.glass([waterCol[0] + 40, waterCol[1] + 45, waterCol[2] + 40] as RGB),
    s * 0.5, s * 0.28, s * 0.035, 0.3);
  // Ripples on water surface
  const rippleCol: RGB = [waterCol[0] + 28, waterCol[1] + 32, waterCol[2] + 25];
  const t = Math.max(1.2, s * 0.008);
  const r1 = s * 0.08;
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5 - r1, s * 0.52, s * 0.5, s * 0.52 - r1 * 0.5, t, 0.15);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.52 - r1 * 0.5, s * 0.5 + r1, s * 0.52, t, 0.15);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5 + r1, s * 0.52, s * 0.5, s * 0.52 + r1 * 0.5, t, 0.15);
  pushCapsule(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.52 + r1 * 0.5, s * 0.5 - r1, s * 0.52, t, 0.15);
  return parts;
}

// ---- trees, buildings, fences (3/4 perspective tall props) ------------------

function buildTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow at bottom
  pushEllipse(parts, MATERIALS.bone([28, 26, 22]), cx + s * 0.02, h * 0.93, s * 0.24, s * 0.06, 0.05);
  // Trunk — long vertical with bark texture
  const trunkCol: RGB = [82 + rng.jitter(8), 58 + rng.jitter(6), 38 + rng.jitter(5)];
  const trunk = MATERIALS.leather(trunkCol);
  const trunkDark = MATERIALS.leather([trunkCol[0] * 0.7, trunkCol[1] * 0.7, trunkCol[2] * 0.65] as RGB);
  pushCapsule(parts, trunk, cx, h * 0.90, cx - s * 0.01, h * 0.42, s * 0.085, 0.4);
  // Bark details
  pushCapsule(parts, trunkDark, cx - s * 0.03, h * 0.82, cx - s * 0.02, h * 0.55, Math.max(1, s * 0.012), 0.15);
  pushCapsule(parts, trunkDark, cx + s * 0.02, h * 0.75, cx + s * 0.03, h * 0.52, Math.max(1, s * 0.01), 0.12);
  // Root bulge
  pushEllipse(parts, trunk, cx, h * 0.91, s * 0.12, h * 0.025, 0.3);
  // Canopy — big lush mass built from overlapping lobes (reads like foliage,
  // not a single balloon).
  const leafCol: RGB = [42 + rng.jitter(12), 95 + rng.jitter(15), 38 + rng.jitter(10)];
  const leaf = MATERIALS.flesh(leafCol);
  const leafLight: RGB = [leafCol[0] + 20, leafCol[1] + 25, leafCol[2] + 15];
  const leafDark: RGB = [leafCol[0] * 0.65, leafCol[1] * 0.7, leafCol[2] * 0.6];
  // Back shadow mass — widest layer, sits behind everything
  pushEllipse(parts, MATERIALS.flesh(leafDark), cx, h * 0.30, s * 0.46, h * 0.21, 0.3);
  // Under-canopy shade over the trunk top
  pushEllipse(parts, MATERIALS.flesh(leafDark), cx, h * 0.42, s * 0.28, h * 0.08, 0.25);
  // Main canopy dome
  pushEllipse(parts, leaf, cx, h * 0.24, s * 0.46, h * 0.21, 0.4);
  // Side lobes bulging out of the dome
  pushCircle(parts, leaf, cx - s * 0.30 + rng.jitter(s * 0.03), h * 0.30, s * 0.16, 0.32);
  pushCircle(parts, leaf, cx + s * 0.30 + rng.jitter(s * 0.03), h * 0.28, s * 0.15, 0.32);
  pushCircle(parts, leaf, cx - s * 0.12 + rng.jitter(s * 0.04), h * 0.38, s * 0.14, 0.3);
  pushCircle(parts, leaf, cx + s * 0.14 + rng.jitter(s * 0.04), h * 0.36, s * 0.13, 0.3);
  // Dark inner clumps for depth
  pushCircle(parts, MATERIALS.flesh(leafDark), cx + s * 0.06, h * 0.34, s * 0.10, 0.25);
  pushCircle(parts, MATERIALS.flesh(leafDark), cx - s * 0.16, h * 0.26, s * 0.08, 0.25);
  // Top highlight lobes catching the light
  pushEllipse(parts, MATERIALS.flesh(leafLight), cx - s * 0.08, h * 0.12, s * 0.26, h * 0.09, 0.25);
  pushCircle(parts, MATERIALS.flesh(leafLight), cx + s * 0.16, h * 0.16, s * 0.10, 0.25);
  return parts;
}

function buildPineTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow
  pushEllipse(parts, MATERIALS.bone([28, 26, 22]), cx, h * 0.94, s * 0.18, s * 0.05, 0.05);
  // Trunk
  const trunkCol: RGB = [75 + rng.jitter(6), 52 + rng.jitter(5), 35 + rng.jitter(4)];
  pushCapsule(parts, MATERIALS.leather(trunkCol), cx, h * 0.92, cx, h * 0.35, s * 0.045, 0.35);
  // Tiered needle layers — wider at bottom, narrow at top
  const needleCol: RGB = [28 + rng.jitter(8), 72 + rng.jitter(10), 32 + rng.jitter(8)];
  const needle = MATERIALS.flesh(needleCol);
  const needleDark = MATERIALS.flesh([needleCol[0] * 0.7, needleCol[1] * 0.72, needleCol[2] * 0.65] as RGB);
  const needleLight: RGB = [needleCol[0] + 15, needleCol[1] + 20, needleCol[2] + 10];
  // Four tiers bottom to top
  pushEllipse(parts, needleDark, cx, h * 0.56, s * 0.34, h * 0.08, 0.25);
  pushEllipse(parts, needle, cx, h * 0.52, s * 0.32, h * 0.09, 0.3);
  pushEllipse(parts, needleDark, cx, h * 0.38, s * 0.24, h * 0.07, 0.25);
  pushEllipse(parts, needle, cx, h * 0.34, s * 0.22, h * 0.08, 0.3);
  pushEllipse(parts, needleDark, cx, h * 0.22, s * 0.15, h * 0.06, 0.25);
  pushEllipse(parts, needle, cx, h * 0.18, s * 0.14, h * 0.07, 0.3);
  // Top point
  pushEllipse(parts, needle, cx, h * 0.08, s * 0.06, h * 0.06, 0.3);
  pushEllipse(parts, MATERIALS.flesh(needleLight), cx - s * 0.02, h * 0.06, s * 0.04, h * 0.04, 0.2);
  return parts;
}

function buildDeadTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow
  pushEllipse(parts, MATERIALS.bone([28, 26, 22]), cx, h * 0.92, s * 0.18, s * 0.04, 0.05);
  // Trunk — tall, gnarled
  const barkCol: RGB = [55 + rng.jitter(6), 42 + rng.jitter(5), 32 + rng.jitter(4)];
  const bark = MATERIALS.leather(barkCol);
  pushCapsule(parts, bark, cx + s * 0.02, h * 0.90, cx - s * 0.02, h * 0.22, s * 0.06, 0.35);
  // Main branches
  pushCapsule(parts, bark, cx - s * 0.02, h * 0.32, cx - s * 0.28, h * 0.12, Math.max(1, s * 0.022), 0.3);
  pushCapsule(parts, bark, cx, h * 0.26, cx + s * 0.24, h * 0.08, Math.max(1, s * 0.02), 0.28);
  // Secondary branches
  pushCapsule(parts, bark, cx - s * 0.28, h * 0.12, cx - s * 0.36, h * 0.05, Math.max(1, s * 0.01), 0.2);
  pushCapsule(parts, bark, cx + s * 0.24, h * 0.08, cx + s * 0.32, h * 0.03, Math.max(1, s * 0.01), 0.2);
  // Mid branch stub
  pushCapsule(parts, bark, cx + s * 0.04, h * 0.52, cx + s * 0.14, h * 0.44, Math.max(1, s * 0.014), 0.25);
  pushCapsule(parts, bark, cx - s * 0.03, h * 0.60, cx - s * 0.12, h * 0.54, Math.max(1, s * 0.012), 0.22);
  return parts;
}

function buildHouse(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow at bottom
  pushEllipse(parts, MATERIALS.bone([25, 24, 20]), cx + s * 0.02, h * 0.95, s * 0.28, s * 0.06, 0.05);
  // Front wall — warm timber planks (Cambria buildings are wood, not stucco)
  const wallCol: RGB = [136 + rng.jitter(10), 104 + rng.jitter(8), 72 + rng.jitter(6)];
  const wallDark: RGB = [wallCol[0] * 0.68, wallCol[1] * 0.68, wallCol[2] * 0.64];
  const wall = MATERIALS.leather(wallCol);
  // Side edge (dark depth)
  pushBox(parts, MATERIALS.leather(wallDark), cx + s * 0.40, h * 0.62, s * 0.08, h * 0.28, s * 0.01, 0.18);
  // Main front face
  pushBox(parts, wall, cx - s * 0.04, h * 0.62, s * 0.38, h * 0.28, s * 0.01, 0.2);
  // Horizontal plank seams
  const seam = MATERIALS.leather([wallCol[0] * 0.72, wallCol[1] * 0.72, wallCol[2] * 0.68] as RGB);
  for (let i = 0; i < 3; i++) {
    const sy = h * (0.46 + i * 0.115);
    pushCapsule(parts, seam, cx - s * 0.41, sy, cx + s * 0.33, sy, Math.max(1, s * 0.004), 0.06);
  }
  // Corner support beams
  const beam = MATERIALS.leather([wallCol[0] * 0.55, wallCol[1] * 0.55, wallCol[2] * 0.52] as RGB);
  pushBox(parts, beam, cx - s * 0.40, h * 0.62, s * 0.018, h * 0.28, s * 0.006, 0.2);
  pushBox(parts, beam, cx + s * 0.32, h * 0.62, s * 0.018, h * 0.28, s * 0.006, 0.2);
  // Door (taller)
  const doorCol: RGB = [95 + rng.jitter(8), 65 + rng.jitter(6), 42 + rng.jitter(5)];
  pushBox(parts, MATERIALS.leather(doorCol), cx - s * 0.10, h * 0.78, s * 0.10, h * 0.12, s * 0.01, 0.25);
  pushCircle(parts, MATERIALS.gold([190, 170, 70]), cx - s * 0.03, h * 0.78, Math.max(1, s * 0.014), 0.5);
  // Stone doorstep
  pushBox(parts, MATERIALS.bone([98, 92, 82]), cx - s * 0.10, h * 0.905, s * 0.13, h * 0.012, s * 0.006, 0.2);
  // Window
  pushBox(parts, MATERIALS.glass([80, 120, 160]), cx + s * 0.16, h * 0.54, s * 0.07, h * 0.06, s * 0.008, 0.3);
  pushBox(parts, MATERIALS.leather([60, 45, 30]), cx + s * 0.16, h * 0.54, s * 0.08, s * 0.003, s * 0.002, 0.2);
  pushBox(parts, MATERIALS.leather([60, 45, 30]), cx + s * 0.16, h * 0.54, s * 0.003, h * 0.07, s * 0.002, 0.2);
  // Second window (left side)
  pushBox(parts, MATERIALS.glass([80, 120, 160]), cx - s * 0.26, h * 0.54, s * 0.06, h * 0.05, s * 0.008, 0.3);
  pushBox(parts, MATERIALS.leather([60, 45, 30]), cx - s * 0.26, h * 0.54, s * 0.003, h * 0.06, s * 0.002, 0.2);
  // Roof — large, prominent, muted shingle red
  const roofCol: RGB = [94 + rng.jitter(8), 46 + rng.jitter(6), 34 + rng.jitter(4)];
  const roof = MATERIALS.leather(roofCol);
  const roofLight: RGB = [roofCol[0] + 20, roofCol[1] + 15, roofCol[2] + 10];
  // Roof front face (tall eave)
  pushBox(parts, roof, cx - s * 0.04, h * 0.28, s * 0.44, h * 0.08, s * 0.01, 0.2);
  // Roof top slope
  pushBox(parts, MATERIALS.leather(roofLight), cx - s * 0.04, h * 0.18, s * 0.42, h * 0.06, s * 0.01, 0.15);
  // Shingle row seams across the eave
  const shingleSeam = MATERIALS.leather([roofCol[0] * 0.7, roofCol[1] * 0.7, roofCol[2] * 0.7] as RGB);
  for (let i = 0; i < 2; i++) {
    const sy = h * (0.25 + i * 0.05);
    pushCapsule(parts, shingleSeam, cx - s * 0.46, sy, cx + s * 0.38, sy, Math.max(1, s * 0.004), 0.06);
  }
  // Staggered shingle tabs
  for (let i = 0; i < 5; i++) {
    const sx = cx - s * 0.38 + i * s * 0.17 + rng.jitter(s * 0.02);
    pushBox(parts, MATERIALS.leather([roofCol[0] + 10, roofCol[1] + 6, roofCol[2] + 4] as RGB),
      sx, h * (0.27 + (i % 2) * 0.045), s * 0.045, h * 0.012, s * 0.006, 0.12);
  }
  // Chimney
  pushBox(parts, MATERIALS.bone([70 + rng.jitter(5), 62 + rng.jitter(4), 56 + rng.jitter(4)] as RGB),
    cx + s * 0.28, h * 0.10, s * 0.05, h * 0.08, s * 0.006, 0.25);
  // Roof overhang shadow
  pushBox(parts, MATERIALS.bone([wallCol[0] * 0.6, wallCol[1] * 0.6, wallCol[2] * 0.58] as RGB),
    cx - s * 0.04, h * 0.36, s * 0.40, h * 0.008, s * 0.004, 0.08);
  return parts;
}

function buildRuins(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const rubbleCol: RGB = [78 + rng.jitter(8), 72 + rng.jitter(6), 64 + rng.jitter(5)];
  // Rubble stones at bottom
  for (let i = 0; i < 5; i++) {
    const rx = s * (0.1 + rng.float() * 0.8);
    const ry = h * (0.78 + rng.float() * 0.16);
    const rr = s * (0.03 + rng.float() * 0.025);
    const j = rng.jitter(8);
    pushCircle(parts, MATERIALS.bone([rubbleCol[0] * 0.85 + j, rubbleCol[1] * 0.85 + j, rubbleCol[2] * 0.82 + j] as RGB),
      rx, ry, rr, 0.2);
  }
  // Broken wall segments — irregular heights
  const wallCol: RGB = [90 + rng.jitter(10), 82 + rng.jitter(8), 72 + rng.jitter(6)];
  const wallMat = MATERIALS.bone(wallCol);
  // Left broken wall (tall)
  pushBox(parts, wallMat, s * 0.15, h * 0.45, s * 0.12, h * 0.35, s * 0.01, 0.2);
  pushBox(parts, MATERIALS.bone([wallCol[0] * 0.7, wallCol[1] * 0.7, wallCol[2] * 0.68] as RGB),
    s * 0.15, h * 0.12, s * 0.12, h * 0.02, s * 0.008, 0.15);
  // Right broken wall (shorter)
  pushBox(parts, wallMat, s * 0.82, h * 0.55, s * 0.10, h * 0.25, s * 0.01, 0.18);
  pushBox(parts, MATERIALS.bone([wallCol[0] * 0.7, wallCol[1] * 0.7, wallCol[2] * 0.68] as RGB),
    s * 0.82, h * 0.32, s * 0.10, h * 0.02, s * 0.008, 0.15);
  // Crack
  pushCapsule(parts, MATERIALS.bone([35, 32, 28]), s * 0.12 + rng.jitter(s * 0.03), h * 0.25,
    s * 0.18 + rng.jitter(s * 0.03), h * 0.55, Math.max(1, s * 0.006), 0.1);
  return parts;
}

function buildFence(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // No floor base: the fence is an overworld prop composited over whatever
  // terrain tile is underneath (a stone slab here would punch a gray square
  // into grass).
  // Shadow behind fence
  pushEllipse(parts, MATERIALS.bone([30, 28, 24]), s * 0.5, s * 0.82, s * 0.46, s * 0.04, 0.05);
  // Fence posts and rails — 3/4 view shows front face
  const woodCol: RGB = [105 + rng.jitter(10), 78 + rng.jitter(8), 52 + rng.jitter(6)];
  const wood = MATERIALS.leather(woodCol);
  const woodDark = MATERIALS.leather([woodCol[0] * 0.75, woodCol[1] * 0.75, woodCol[2] * 0.7] as RGB);
  // Three vertical posts
  for (let i = 0; i < 3; i++) {
    const px = s * (0.15 + i * 0.35);
    pushCapsule(parts, wood, px, s * 0.80, px, s * 0.30, s * 0.03, 0.3);
    // Post top cap
    pushCircle(parts, MATERIALS.leather([woodCol[0] + 12, woodCol[1] + 10, woodCol[2] + 8] as RGB),
      px, s * 0.28, s * 0.035, 0.25);
  }
  // Horizontal rails
  pushCapsule(parts, woodDark, s * 0.10, s * 0.45, s * 0.90, s * 0.45, s * 0.02, 0.25);
  pushCapsule(parts, woodDark, s * 0.10, s * 0.62, s * 0.90, s * 0.62, s * 0.02, 0.25);
  return parts;
}

// ---- public API -------------------------------------------------------------

export function buildTile(config: TileConfig, s: number, h?: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const th = h ?? s;
  switch (config.kind ?? 'stone_floor') {
    case 'dirt_floor':    return buildDirtFloor(rng, s, config.edges);
    case 'grass_floor':   return buildGrassFloor(rng, s);
    case 'stone_wall':    return buildStoneWall(rng, s, th);
    case 'crystal_floor': return buildCrystalFloor(rng, s);
    case 'wood_door':     return buildWoodDoor(rng, s);
    case 'lava_floor':    return buildLavaFloor(rng, s);
    case 'ice_floor':     return buildIceFloor(rng, s);
    case 'moss_floor':    return buildMossFloor(rng, s);
    case 'spike_trap':    return buildSpikeTrap(rng, s);
    case 'stairs_down':   return buildStairsDown(rng, s);
    case 'stairs_up':     return buildStairsUp(rng, s);
    case 'cracked_wall':  return buildCrackedWall(rng, s, th);
    case 'pit':              return buildPit(rng, s);
    case 'water_pool':       return buildWaterPool(rng, s);
    case 'underground_river': return buildUndergroundRiver(rng, s);
    case 'stalagmite':       return buildStalagmite(rng, s, th);
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
    case 'pillar':           return buildPillar(rng, s, th);
    case 'fountain':         return buildFountain(rng, s, th);
    case 'tree':             return buildTree(rng, s, th);
    case 'pine_tree':        return buildPineTree(rng, s, th);
    case 'dead_tree':        return buildDeadTree(rng, s, th);
    case 'house':            return buildHouse(rng, s, th);
    case 'ruins':            return buildRuins(rng, s, th);
    case 'fence':            return buildFence(rng, s);
    case 'stone_floor':
    default:                 return buildStoneFloor(rng, s);
  }
}

export const TILE_KINDS: TileKind[] = ['stone_floor', 'dirt_floor', 'grass_floor', 'stone_wall', 'crystal_floor', 'wood_door', 'lava_floor', 'ice_floor', 'moss_floor', 'spike_trap', 'stairs_down', 'stairs_up', 'cracked_wall', 'pit', 'water_pool', 'underground_river', 'stalagmite', 'cobweb', 'barrel', 'chain', 'bone_pile', 'shop_counter', 'iron_gate', 'torch_bracket', 'altar', 'anvil', 'bed', 'table', 'bookshelf', 'pillar', 'fountain', 'tree', 'pine_tree', 'dead_tree', 'house', 'ruins', 'fence'];
