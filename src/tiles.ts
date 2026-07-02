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
import { Part, roundedBox, circle, capsule, ellipse, union } from './shapes';
import { fbm2D } from './noise';

export type TileKind = 'stone_floor' | 'dirt_floor' | 'grass_floor' | 'wood_floor' | 'wood_wall' | 'stone_wall' | 'crystal_floor' | 'wood_door' | 'lava_floor' | 'ice_floor' | 'moss_floor' | 'spike_trap' | 'stairs_down' | 'stairs_up' | 'cracked_wall' | 'pit' | 'water_pool' | 'underground_river' | 'stalagmite' | 'cobweb' | 'barrel' | 'chain' | 'bone_pile' | 'shop_counter' | 'iron_gate' | 'torch_bracket' | 'altar' | 'anvil' | 'bed' | 'table' | 'bookshelf' | 'pillar' | 'fountain' | 'tree' | 'pine_tree' | 'dead_tree' | 'house' | 'ruins' | 'fence' | 'water' | 'bush' | 'flowers' | 'rock'
  | 'lantern' | 'crate' | 'banner' | 'statue' | 'shelf' | 'cauldron' | 'chest' | 'well' | 'bench' | 'planter' | 'firewood' | 'signpost' | 'bucket' | 'gravestone'
  | 'interior_wall' | 'rug' | 'pebbles' | 'root' | 'grass_dirt_mix';

export interface TileConfig {
  kind?: TileKind;
  seed?: number | string;
  /**
   * Which sides/corners of this tile touch the neighboring terrain it blends
   * into: grass for dirt_floor/water (grass creeps over the path/shore),
   * dirt for stone_floor (dirt crumbles onto a plaza edge). Flagged sides
   * get an irregular fringe drawn over the edge, flagged corners get a small
   * tuft, so terrain blends organically instead of ending in hard tile
   * seams. Corner flags are only needed when neither adjacent side is
   * flagged (inner corners of a path bend). Compute these per grid cell with
   * autotile.ts's `autotileEdges` instead of hand-rolling neighbor lookups.
   */
  edges?: {
    n?: boolean; e?: boolean; s?: boolean; w?: boolean;
    ne?: boolean; nw?: boolean; se?: boolean; sw?: boolean;
  };
  /**
   * Props (furniture, barrels, counters…) normally paint their own stone
   * floor slab so they work as standalone dungeon tiles. Set bare: true when
   * compositing them over an existing floor (e.g. a wood_floor interior) to
   * skip the slab. Same seed produces the same prop either way.
   */
  bare?: boolean;
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

/**
 * Attach a stack of surface texture layers to a material. Layers apply in
 * order like paint passes — combine a broad mottle (scale 4-6), a mid
 * speckle, and a fine grain for hand-textured depth.
 */
type Tex = { kind: 'grain' | 'speckle' | 'bump'; amount: number; scale?: number; sx?: number; sy?: number };
function textured(mat: Part['material'], ...layers: Tex[]): Part['material'] {
  return { ...mat, texture: layers };
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

// Set per buildTile() call from config.bare; when true, props skip their
// built-in floor slab (they're being composited over an existing floor).
let bareProps = false;

function floorBase(parts: Part[], rng: RNG, s: number) {
  // Always draw from the RNG so seed→prop mapping is identical with/without
  // the slab (bare must not shift downstream random values).
  const j = rng.jitter(6);
  const col: RGB = [92 + j, 82 + j, 70 + j];
  if (!bareProps) pushBox(parts, MATERIALS.bone(col), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.01, 0.1);
  return col;
}

// ---- tile builders ----------------------------------------------------------

function buildStoneFloor(rng: RNG, s: number, edges?: TileConfig['edges']): Part[] {
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
      pushBox(parts, textured(MATERIALS.bone(base), { kind: 'grain', amount: 0.04, scale: 3 }, { kind: 'grain', amount: 0.05 }, { kind: 'bump', amount: 0.3, scale: 2.5 }), cx, cy, hw, hh, s * 0.016, 0.16);
      // Subtle surface variation
      if (rng.float() > 0.4) {
        pushCircle(parts, MATERIALS.bone([base[0] + 8, base[1] + 6, base[2] + 4] as RGB),
          cx + rng.jitter(bw * 0.18), cy + rng.jitter(bw * 0.18), s * 0.03, 0.08);
      }
      // Chipped corner — a grout-colored nick eating into one corner. Old
      // pavement is never four perfect rectangles; one broken corner per
      // few flags is what sells the wear.
      if (rng.float() > 0.55) {
        const ccx = cx + (rng.float() > 0.5 ? hw : -hw);
        const ccy = cy + (rng.float() > 0.5 ? hh : -hh);
        pushCircle(parts, MATERIALS.bone([44 + warmth, 40 + warmth, 34 + warmth] as RGB),
          ccx, ccy, s * (0.02 + rng.float() * 0.015), 0.12);
      }
      // Faint wear scratch across the face
      if (rng.float() > 0.6) {
        const wx = cx + rng.jitter(hw * 0.5), wy = cy + rng.jitter(hh * 0.5);
        pushCapsule(parts, MATERIALS.bone([base[0] - 14, base[1] - 13, base[2] - 12] as RGB),
          wx, wy, wx + rng.jitter(hw * 0.8), wy + rng.jitter(hh * 0.5), Math.max(1, s * 0.005), 0.06);
      }
    }
  }
  // Occasional crack
  if (rng.float() > 0.5) {
    const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
    pushCapsule(parts, MATERIALS.bone([36 + warmth, 32 + warmth, 26 + warmth] as RGB), ax, ay,
      ax + rng.jitter(s * 0.22), ay + rng.jitter(s * 0.22), Math.max(1, s * 0.007), 0.08);
  }
  // Moss creeping into the grout — a paved area this old always has a few
  // grout lines gone green, which is most of what sells "worn plaza" over
  // "repeating clean pattern" at a glance.
  if (rng.float() > 0.35) {
    const mossCol: RGB = [46 + rng.jitter(10), 84 + rng.jitter(14), 38 + rng.jitter(8)];
    const along = rng.float() > 0.5;
    const gx = along ? s * 0.5 : gap + bw + gap / 2;
    const gy = along ? gap + bw + gap / 2 : s * 0.5;
    const n = 2 + Math.floor(rng.float() * 2);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      const px = along ? gx + t * bw * 1.6 : gx + rng.jitter(bw * 0.15);
      const py = along ? gy + rng.jitter(bw * 0.15) : gy + t * bw * 1.6;
      pushCircle(parts, MATERIALS.flesh(mossCol), px, py, s * (0.02 + rng.float() * 0.015), 0.1);
    }
  }
  // Dirt crumbling onto the edges that touch a dirt path/yard
  edgeFringe(parts, rng, s, edges, 'dirt');
  return parts;
}

/**
 * Base color of a terrain's fringe blobs, keyed by the neighboring tile kind
 * so any pair of adjacent floors can blend without hardcoding one terrain.
 * Matches the base tone each builder uses for its own floor.
 */
type FringeTerrain = 'grass' | 'dirt';
function fringeColor(terrain: FringeTerrain, j: number): RGB {
  return terrain === 'grass' ? [58 + j, 92 + j, 40 + j] : [112 + j, 84 + j, 56 + j];
}

/**
 * Irregular fringe of `terrain`-colored blobs along the flagged edges of a
 * tile (e.g. grass creeping over a dirt path, or dirt crumbling onto a stone
 * plaza). Shared by every tile kind that takes `edges`.
 */
function edgeFringe(parts: Part[], rng: RNG, s: number, edges: TileConfig['edges'] | undefined, terrain: FringeTerrain) {
  if (!edges) return;
  const blobs = (fx: (t: number) => number, fy: (t: number) => number, ix: number, iy: number) => {
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5 + rng.jitter(0.06);
      const col = fringeColor(terrain, rng.jitter(8));
      pushCircle(parts, MATERIALS.flesh(col), fx(t) * s, fy(t) * s, s * (0.055 + rng.float() * 0.05), 0.06);
    }
    // Dithered speck band just inside the blob fringe — scattered small dots
    // trailing off into the tile, so the transition dissolves pixel-art-style
    // instead of ending at the blob arc. (ix, iy) points into the tile.
    for (let i = 0; i < 4; i++) {
      const t = rng.float();
      const col = fringeColor(terrain, rng.jitter(8));
      const inset = 0.07 + rng.float() * 0.07;
      pushCircle(parts, MATERIALS.flesh(col),
        (fx(t) + ix * inset) * s, (fy(t) + iy * inset) * s, s * (0.016 + rng.float() * 0.016), 0.08);
    }
  };
  if (edges.n) blobs((t) => t, () => rng.jitter(0.03), 0, 1);
  if (edges.s) blobs((t) => t, () => 1 + rng.jitter(0.03), 0, -1);
  if (edges.w) blobs(() => rng.jitter(0.03), (t) => t, 1, 0);
  if (edges.e) blobs(() => 1 + rng.jitter(0.03), (t) => t, -1, 0);
  // Inner-corner tufts where only a diagonal neighbor matches
  const tuft = (px: number, py: number) => {
    for (let i = 0; i < 3; i++) {
      const col = fringeColor(terrain, rng.jitter(8));
      pushCircle(parts, MATERIALS.flesh(col),
        (px + rng.jitter(0.05)) * s, (py + rng.jitter(0.05)) * s, s * (0.045 + rng.float() * 0.035), 0.06);
    }
  };
  if (edges.nw) tuft(0, 0);
  if (edges.ne) tuft(1, 0);
  if (edges.sw) tuft(0, 1);
  if (edges.se) tuft(1, 1);
}

function buildDirtFloor(rng: RNG, s: number, edges?: TileConfig['edges']): Part[] {
  const parts: Part[] = [];
  const base: RGB = [122 + rng.jitter(14), 80 + rng.jitter(10), 46 + rng.jitter(8)];
  pushBox(parts, textured(MATERIALS.flesh(base), { kind: 'grain', amount: 0.06, scale: 4 }, { kind: 'grain', amount: 0.06 }, { kind: 'speckle', amount: 0.04 }, { kind: 'bump', amount: 0.28, scale: 3 }), s * 0.5, s * 0.5, s * 0.50, s * 0.50, s * 0.015, 0.08);
  // Dense clod mottle — trodden earth is many small lumps each catching its
  // own light, and this pass is most of what separates a "cobbled path" read
  // from a flat brown plane: a dozen soft overlapping clods in varied browns
  // (some redder, some greyer) with real roundness so the shading pipeline
  // models each one, not just tints it.
  const clods = 10 + Math.floor(rng.float() * 4);
  for (let i = 0; i < clods; i++) {
    const px = s * (0.06 + rng.float() * 0.88), py = s * (0.06 + rng.float() * 0.88);
    const cr = s * (0.05 + rng.float() * 0.06);
    const jc = rng.jitter(16);
    const warm = rng.float() > 0.5 ? 7 : -9;
    const col: RGB = [base[0] + jc + warm, base[1] + jc * 0.9 + warm * 0.6, base[2] + jc * 0.8];
    pushEllipse(parts, textured(MATERIALS.flesh(col), { kind: 'grain', amount: 0.05 }, { kind: 'bump', amount: 0.2, scale: 2 }),
      px, py, cr, cr * (0.62 + rng.float() * 0.24), 0.18);
  }
  // Darker damp patches sunk between the clods
  for (let i = 0; i < 3; i++) {
    const px = s * (0.15 + rng.float() * 0.7), py = s * (0.15 + rng.float() * 0.7);
    pushEllipse(parts, textured(MATERIALS.flesh([base[0] * 0.78, base[1] * 0.78, base[2] * 0.76] as RGB), { kind: 'grain', amount: 0.05 }),
      px, py, s * (0.06 + rng.float() * 0.05), s * (0.04 + rng.float() * 0.03), 0.08);
  }
  // Pebbles — contact shadow first, stone on top, so each reads as sitting
  // ON the path (a bare bright dot floats instead of settling in).
  const stones = 5 + Math.floor(rng.float() * 3);
  for (let i = 0; i < stones; i++) {
    const px = s * (0.08 + rng.float() * 0.84), py = s * (0.08 + rng.float() * 0.84);
    const pr = s * (0.016 + rng.float() * 0.016);
    const j = rng.jitter(10);
    pushEllipse(parts, MATERIALS.flesh([base[0] * 0.55, base[1] * 0.55, base[2] * 0.52] as RGB),
      px + pr * 0.25, py + pr * 0.5, pr * 1.15, pr * 0.6, 0.08);
    pushCircle(parts, MATERIALS.bone([base[0] * 0.68 + j, base[1] * 0.68 + j, base[2] * 0.68 + j] as RGB),
      px, py, pr, 0.3);
  }
  // Stray grass sprigs surviving in the packed dirt
  const sprigs = Math.floor(rng.float() * 3);
  for (let i = 0; i < sprigs; i++) {
    const gx = s * (0.12 + rng.float() * 0.76), gy = s * (0.15 + rng.float() * 0.7);
    pushCapsule(parts, MATERIALS.flesh([54 + rng.jitter(8), 92 + rng.jitter(10), 38 + rng.jitter(6)] as RGB),
      gx, gy, gx + rng.jitter(s * 0.015), gy - s * (0.028 + rng.float() * 0.015), Math.max(1, s * 0.008), 0.1);
  }
  // Occasional twig
  if (rng.float() > 0.6) {
    const ax = s * (0.2 + rng.float() * 0.5), ay = s * (0.3 + rng.float() * 0.4);
    pushCapsule(parts, MATERIALS.leather([72, 52, 32]),
      ax, ay, ax + rng.jitter(s * 0.15), ay + rng.jitter(s * 0.08), Math.max(1, s * 0.006), 0.15);
  }
  // Grass creeping over the edges that touch grass tiles
  edgeFringe(parts, rng, s, edges, 'grass');
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

/**
 * Deterministic per-tile decoration variants for grass_floor. Selected by
 * hashing the tile's own RNG stream — same seed (e.g. a `row-col` coordinate
 * string) always picks the same variant, so a lawn reads as varied but
 * stable rather than boiling between renders.
 */
const GRASS_VARIANTS = ['bare', 'tuft', 'flowers', 'pebbles', 'leaves', 'clover'] as const;

function buildGrassFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  // Small jitter only — large per-tile brightness differences read as a grid
  // over a big lawn; variation should come from the patches/blades instead.
  const j = rng.jitter(4);
  const base: RGB = [50 + j, 96 + j, 34 + j];
  // Speckled base — dense light/dark leaf dots do most of the "dense turf"
  // work, and a fine bump layer gives the turf actual noise-driven relief
  // (light rolls across it) instead of a flat plane with dots painted on.
  pushBox(parts, textured(MATERIALS.flesh(base), { kind: 'grain', amount: 0.05, scale: 5 }, { kind: 'speckle', amount: 0.06 }, { kind: 'grain', amount: 0.03 }, { kind: 'bump', amount: 0.22, scale: 1.6 }), s * 0.5, s * 0.5, s * 0.50, s * 0.50, 0, 0.08);
  // Occasional dominant patch — most of what still made a big lawn of these
  // tiles feel like wallpaper wasn't color, it was SILHOUETTE: every tile had
  // the same handful of small dots in the same size range, so from a few
  // tiles back they all resolve to the same texture regardless of position.
  // One tile in ~6 gets a single much bigger, off-center patch (parched
  // yellow-brown or lush dark) that dominates that tile's read and makes a
  // lawn of them look like a real uneven field instead of a repeated swatch.
  if (rng.float() > 0.82) {
    const dry = rng.float() > 0.5;
    const featCol: RGB = dry
      ? [base[0] + 30, base[1] + 8, base[2] - 14]
      : [base[0] * 0.62, base[1] * 0.78, base[2] * 0.85];
    const fx = s * (0.2 + rng.float() * 0.6), fy = s * (0.2 + rng.float() * 0.6);
    pushEllipse(parts, textured(MATERIALS.flesh(featCol), { kind: 'speckle', amount: 0.05 }, { kind: 'grain', amount: 0.04 }, { kind: 'bump', amount: 0.2, scale: 1.6 }),
      fx, fy, s * (0.22 + rng.float() * 0.1), s * (0.16 + rng.float() * 0.08), 0.15);
  }
  // Darker grass patches — shadow patches lean blue-green, so the turf gets
  // actual hue variation (Cambria mottle), not just darker copies of one
  // green. Count/size both randomized per tile (not just position) so
  // tiles differ in DENSITY, not just where the same fixed layout landed.
  const darkPatches = 2 + Math.floor(rng.float() * 4);
  for (let i = 0; i < darkPatches; i++) {
    const px = s * (0.08 + rng.float() * 0.84);
    const py = s * (0.08 + rng.float() * 0.84);
    pushCircle(parts, textured(MATERIALS.flesh([base[0] * 0.72, base[1] * 0.84, base[2] * 0.88] as RGB), { kind: 'speckle', amount: 0.05 }, { kind: 'grain', amount: 0.03 }, { kind: 'bump', amount: 0.2, scale: 1.6 }),
      px, py, s * (0.05 + rng.float() * 0.06), 0.06);
  }
  // Lighter grass highlights — sun patches lean yellow-green
  const lightPatches = 1 + Math.floor(rng.float() * 4);
  for (let i = 0; i < lightPatches; i++) {
    const px = s * (0.15 + rng.float() * 0.7);
    const py = s * (0.15 + rng.float() * 0.7);
    pushCircle(parts, textured(MATERIALS.flesh([base[0] + 16, base[1] + 15, base[2] + 2] as RGB), { kind: 'speckle', amount: 0.05 }, { kind: 'grain', amount: 0.03 }),
      px, py, s * (0.03 + rng.float() * 0.04), 0.05);
  }
  // Individual grass blades — mixed dark and sunlit strokes; the light ones
  // are what read as blades catching the sun instead of uniform stubble.
  const bladeMat = MATERIALS.flesh([base[0] * 0.72, base[1] * 0.80, base[2] * 0.70] as RGB);
  const bladeLitMat = MATERIALS.flesh([base[0] + 22, base[1] + 24, base[2] + 6] as RGB);
  const blades = 5 + Math.floor(rng.float() * 7);
  for (let i = 0; i < blades; i++) {
    const bx = s * (0.08 + rng.float() * 0.84);
    const by = s * (0.12 + rng.float() * 0.8);
    const lean = rng.jitter(s * 0.02);
    pushCapsule(parts, i % 3 === 2 ? bladeLitMat : bladeMat, bx, by, bx + lean, by - s * (0.035 + rng.float() * 0.02), Math.max(1, s * 0.010), 0.1);
  }
  // Dirt specks — count varies (some tiles bare, some scuffed)
  const dirtSpecks = Math.floor(rng.float() * 4);
  for (let i = 0; i < dirtSpecks; i++) {
    const px = s * (0.12 + rng.float() * 0.76);
    const py = s * (0.12 + rng.float() * 0.76);
    pushCircle(parts, MATERIALS.flesh([92 + rng.jitter(8), 70 + rng.jitter(6), 46 + rng.jitter(5)] as RGB),
      px, py, s * (0.018 + rng.float() * 0.012), 0.1);
  }
  // Per-tile decorative variant — one of 6 deterministic looks, picked from
  // the RNG the tile was seeded with. Callers that seed grass tiles by grid
  // coordinate (e.g. `grass-${row}-${col}`) get a stable, non-repeating mix
  // across a lawn instead of every tile rolling the same independent chances.
  const variant = GRASS_VARIANTS[Math.floor(rng.float() * GRASS_VARIANTS.length) % GRASS_VARIANTS.length];
  switch (variant) {
    case 'bare':
      break;
    case 'tuft': {
      // A small V of two taller blades
      const tx = s * (0.15 + rng.float() * 0.7), ty = s * (0.2 + rng.float() * 0.65);
      const tuftMat = MATERIALS.flesh([base[0] * 0.8, base[1] * 0.92, base[2] * 0.78] as RGB);
      pushCapsule(parts, tuftMat, tx, ty, tx - s * 0.025, ty - s * 0.055, Math.max(1, s * 0.011), 0.12);
      pushCapsule(parts, tuftMat, tx, ty, tx + s * 0.028, ty - s * 0.05, Math.max(1, s * 0.011), 0.12);
      break;
    }
    case 'flowers': {
      // A meadow blossom with a ring of petal dots around the core — a lone
      // filled circle reads as a paint blob; the petal ring is what makes it
      // read "flower" at 3-4px. Occasionally a second smaller bud beside it.
      const fx = s * (0.15 + rng.float() * 0.7), fy = s * (0.2 + rng.float() * 0.6);
      const petal: RGB = rng.float() > 0.5 ? [235, 228, 210] : [230, 205, 95];
      const petalMat = MATERIALS.cloth(petal);
      const pr = Math.max(1, s * 0.011);
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + rng.jitter(0.2);
        pushCircle(parts, petalMat, fx + Math.cos(ang) * pr * 1.35, fy + Math.sin(ang) * pr * 1.35, pr, 0.35);
      }
      pushCircle(parts, MATERIALS.gold([225, 185, 70]), fx, fy, Math.max(1, s * 0.009), 0.5);
      if (rng.float() > 0.55) {
        pushCircle(parts, petalMat, fx + rng.jitter(s * 0.08) + s * 0.06, fy + rng.jitter(s * 0.05), Math.max(1, s * 0.012), 0.4);
      }
      break;
    }
    case 'pebbles': {
      // A couple of small stones nestled in the turf
      const n = 2 + Math.floor(rng.float() * 2);
      for (let i = 0; i < n; i++) {
        const px = s * (0.15 + rng.float() * 0.7), py = s * (0.2 + rng.float() * 0.65);
        const j2 = rng.jitter(10);
        pushCircle(parts, MATERIALS.bone([120 + j2, 116 + j2, 108 + j2] as RGB),
          px, py, s * (0.02 + rng.float() * 0.015), 0.2);
      }
      break;
    }
    case 'leaves': {
      // Fallen autumn-colored leaf flecks
      const n = 2 + Math.floor(rng.float() * 2);
      for (let i = 0; i < n; i++) {
        const lx = s * (0.15 + rng.float() * 0.7), ly = s * (0.2 + rng.float() * 0.65);
        const leafCol: RGB = rng.float() > 0.5 ? [180 + rng.jitter(20), 95 + rng.jitter(15), 30 + rng.jitter(10)] : [195 + rng.jitter(15), 150 + rng.jitter(15), 45 + rng.jitter(10)];
        pushEllipse(parts, MATERIALS.leather(leafCol), lx, ly, s * 0.025, s * 0.013, 0.3);
      }
      break;
    }
    case 'clover': {
      // A small cluster of three-leaf clovers — a distinct silhouette from
      // the tuft/flowers variants, so a lawn mixing all six doesn't settle
      // into "little green blob here, little green blob there" sameness.
      const cloverMat = MATERIALS.flesh([base[0] * 0.75, base[1] * 1.05, base[2] * 0.7] as RGB);
      const n = 2 + Math.floor(rng.float() * 2);
      for (let i = 0; i < n; i++) {
        const cx = s * (0.15 + rng.float() * 0.7), cy = s * (0.2 + rng.float() * 0.6);
        const lr = Math.max(1, s * 0.014);
        for (let leaf = 0; leaf < 3; leaf++) {
          const ang = (leaf / 3) * Math.PI * 2 - Math.PI / 2;
          pushCircle(parts, cloverMat, cx + Math.cos(ang) * lr * 0.9, cy + Math.sin(ang) * lr * 0.9, lr, 0.3);
        }
      }
      break;
    }
  }
  return parts;
}

/**
 * A single tile that is GENUINELY part grass, part dirt — not two whole
 * tiles blended at their shared edge (that's what `edges`/edgeFringe do),
 * but one tile whose own interior splits roughly in half along a meandering
 * line, each side carrying its terrain's own detail pass (dirt clods, grass
 * blades). Meant for the worn-patch tiles right at the edge of a path
 * carving through a lawn, where a full dirt_floor tile reads as an abrupt
 * bite out of the grass — this softens that step into two visible.
 *
 * The boundary is a capsule chain, not a raw half-plane SDF, so every part
 * keeps its GPU sdfDesc (see shapes.ts/gpu.ts) and the tile stays renderable
 * on the WebGPU path like every other tile.
 */
function buildGrassDirtMix(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];

  // Full grass base first — the dirt half paints over it, so only the detail
  // passes below need to reason about which side of the line they're on.
  const gj = rng.jitter(4);
  const grassBase: RGB = [50 + gj, 96 + gj, 34 + gj];
  pushBox(parts, textured(MATERIALS.flesh(grassBase), { kind: 'grain', amount: 0.05, scale: 5 }, { kind: 'speckle', amount: 0.06 }, { kind: 'bump', amount: 0.22, scale: 1.6 }),
    s * 0.5, s * 0.5, s * 0.50, s * 0.50, 0, 0.08);

  // Meandering boundary: split runs either top/bottom or left/right, wobbled
  // by fbm so it reads as a worn coastline instead of a ruler-straight cut.
  // dirtFrac stays close to 0.5 (the "half and half" the idea asked for)
  // with just enough per-tile variety that a row of these doesn't repeat.
  const horizontal = rng.float() > 0.5;
  const dirtFrac = 0.42 + rng.float() * 0.16;
  const flip = rng.float() > 0.5;
  const waveSalt = Math.floor(rng.float() * 1000);
  // Amplitude kept small relative to the capsule radius below (see the
  // comment on `steps`) — too large and consecutive capsule centers land
  // far enough apart perpendicular to the chain that the union stops
  // reading as one smooth edge and beads into a row of separate lobes.
  const boundary = (t: number) => dirtFrac + (fbm2D(t * 2.6, 1.7, 2, waveSalt) - 0.5) * 0.14;

  const dirtBase: RGB = [122 + rng.jitter(14), 80 + rng.jitter(10), 46 + rng.jitter(8)];
  const dirtMat = textured(MATERIALS.flesh(dirtBase), { kind: 'grain', amount: 0.06, scale: 4 }, { kind: 'grain', amount: 0.06 }, { kind: 'speckle', amount: 0.04 }, { kind: 'bump', amount: 0.28, scale: 3 });

  // Same formula the capsule chain paints from, so detail placement below
  // always agrees with where the boundary actually landed.
  const isDirt = (px: number, py: number): boolean => {
    const t = horizontal ? px / s : py / s;
    const perp = horizontal ? py / s : px / s;
    const side = perp > boundary(t);
    return flip ? !side : side;
  };

  // Wavy dirt patch: a chain of overlapping capsules run from the boundary
  // line out past the tile edge. These are UNIONED into one combined SDF and
  // pushed as a single Part — each capsule bevel-shaded independently would
  // leave a visible ridge at every overlap seam (the per-part distance-field
  // bevel has no idea a neighboring part exists); one shared SDF means the
  // whole blob gets bevel-shaded once, as one coherent shape. Enough steps
  // that consecutive centers never drift apart (perpendicular to the chain)
  // by more than the radius, or the union reads as beaded lobes instead of
  // one smooth edge.
  const steps = 14;
  let dirtSDF: (x: number, y: number) => number = () => Infinity;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const b = boundary(t) * s;
    const along = t * s;
    const to = flip ? -s * 0.15 : s * 1.15;
    const ax = horizontal ? along : b, ay = horizontal ? b : along;
    const bx = horizontal ? along : to, by = horizontal ? to : along;
    dirtSDF = union(dirtSDF, capsule(ax, ay, bx, by, s * 0.08));
  }
  parts.push({
    material: dirtMat, roundness: 0.14, sdf: dirtSDF,
    bbox: [Math.floor(-s * 0.2), Math.floor(-s * 0.2), Math.ceil(s * 1.2), Math.ceil(s * 1.2)],
  });

  // Blended fringe dots straddling the boundary — mixes both colors so the
  // seam dissolves pixel-art-style instead of reading as a painted edge.
  for (let i = 0; i < 8; i++) {
    const t = rng.float();
    const b = (boundary(t) + rng.jitter(0.05)) * s;
    const along = t * s;
    const px = horizontal ? along : b, py = horizontal ? b : along;
    const col = rng.float() > 0.5 ? dirtBase : grassBase;
    pushCircle(parts, MATERIALS.flesh(col), px, py, s * (0.015 + rng.float() * 0.018), 0.08);
  }

  // Dirt-side clods (same look as buildDirtFloor's mottle pass), rejection-
  // sampled against isDirt() so none of them stray onto the grass side.
  let placed = 0, tries = 0;
  while (placed < 6 && tries < 50) {
    tries++;
    const px = s * (0.06 + rng.float() * 0.88), py = s * (0.06 + rng.float() * 0.88);
    if (!isDirt(px, py)) continue;
    placed++;
    const cr = s * (0.05 + rng.float() * 0.05);
    const jc = rng.jitter(16);
    const col: RGB = [dirtBase[0] + jc, dirtBase[1] + jc * 0.9, dirtBase[2] + jc * 0.8];
    pushEllipse(parts, textured(MATERIALS.flesh(col), { kind: 'grain', amount: 0.05 }, { kind: 'bump', amount: 0.2, scale: 2 }),
      px, py, cr, cr * (0.62 + rng.float() * 0.24), 0.18);
  }
  // Dirt-side pebbles: contact shadow, then stone.
  placed = 0; tries = 0;
  while (placed < 3 && tries < 50) {
    tries++;
    const px = s * (0.08 + rng.float() * 0.84), py = s * (0.08 + rng.float() * 0.84);
    if (!isDirt(px, py)) continue;
    placed++;
    const pr = s * (0.016 + rng.float() * 0.014);
    const j = rng.jitter(10);
    pushEllipse(parts, MATERIALS.flesh([dirtBase[0] * 0.55, dirtBase[1] * 0.55, dirtBase[2] * 0.52] as RGB),
      px + pr * 0.25, py + pr * 0.5, pr * 1.15, pr * 0.6, 0.08);
    pushCircle(parts, MATERIALS.bone([dirtBase[0] * 0.68 + j, dirtBase[1] * 0.68 + j, dirtBase[2] * 0.68 + j] as RGB),
      px, py, pr, 0.3);
  }

  // Grass-side blades — mixed dark and sunlit strokes, skipped on the dirt side.
  const bladeMat = MATERIALS.flesh([grassBase[0] * 0.72, grassBase[1] * 0.80, grassBase[2] * 0.70] as RGB);
  const bladeLitMat = MATERIALS.flesh([grassBase[0] + 22, grassBase[1] + 24, grassBase[2] + 6] as RGB);
  placed = 0; tries = 0;
  while (placed < 6 && tries < 50) {
    tries++;
    const bx = s * (0.06 + rng.float() * 0.88), by = s * (0.1 + rng.float() * 0.82);
    if (isDirt(bx, by)) continue;
    placed++;
    const lean = rng.jitter(s * 0.02);
    pushCapsule(parts, placed % 3 === 2 ? bladeLitMat : bladeMat, bx, by, bx + lean, by - s * (0.035 + rng.float() * 0.02), Math.max(1, s * 0.010), 0.1);
  }

  return parts;
}

/** Interior wood plank floor — warm boards with seams, knots and wood grain. */
function buildWoodFloor(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const j = rng.jitter(6);
  const base: RGB = [148 + j, 106 + j, 62 + j];
  pushBox(parts, textured(MATERIALS.leather(base), { kind: 'grain', amount: 0.05, sx: 6, sy: 1 }, { kind: 'grain', amount: 0.04 }),
    s * 0.5, s * 0.5, s * 0.50, s * 0.50, 0, 0.08);
  // Alternating board tint — every other board slightly lighter/darker
  const boards = 4;
  for (let i = 0; i < boards; i++) {
    if (i % 2 === 0) continue;
    const lift = rng.float() > 0.5 ? 8 : -8;
    pushBox(parts, textured(MATERIALS.leather([base[0] + lift, base[1] + lift * 0.8, base[2] + lift * 0.6] as RGB), { kind: 'grain', amount: 0.05 }),
      s * 0.5, s * ((i + 0.5) / boards), s * 0.50, s * (0.5 / boards), 0, 0.06);
  }
  // Board seams
  const seam = MATERIALS.leather([base[0] * 0.66, base[1] * 0.66, base[2] * 0.62] as RGB);
  for (let i = 1; i < boards; i++) {
    pushCapsule(parts, seam, 0, s * (i / boards), s, s * (i / boards), Math.max(1, s * 0.006), 0.05);
  }
  // Vertical butt joints, staggered per board
  for (let i = 0; i < boards; i++) {
    const bx = s * (0.2 + rng.float() * 0.6);
    pushCapsule(parts, seam, bx, s * (i / boards) + s * 0.01, bx, s * ((i + 1) / boards) - s * 0.01, Math.max(1, s * 0.005), 0.05);
  }
  // Occasional knot
  if (rng.float() > 0.55) {
    pushCircle(parts, MATERIALS.leather([base[0] * 0.72, base[1] * 0.72, base[2] * 0.68] as RGB),
      s * (0.2 + rng.float() * 0.6), s * (0.2 + rng.float() * 0.6), Math.max(1, s * 0.02), 0.3);
  }
  return parts;
}

/**
 * Timber wall in 3/4: visible TOP surface strip plus a tall shaded FRONT face
 * with vertical plank seams — the wall reads as a solid slab with height,
 * matching stone_wall's construction (Cambria interior style).
 */
function buildWoodWall(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const topCol: RGB = [104 + rng.jitter(8), 76 + rng.jitter(6), 48 + rng.jitter(5)];
  const frontCol: RGB = [126 + rng.jitter(8), 92 + rng.jitter(7), 58 + rng.jitter(5)];
  // Top surface + bright lip + front face
  pushBox(parts, textured(MATERIALS.leather(topCol), { kind: 'grain', amount: 0.05 }), s * 0.5, h * 0.08, s * 0.50, h * 0.08, 0, 0.2);
  pushBox(parts, MATERIALS.leather([topCol[0] + 18, topCol[1] + 14, topCol[2] + 10] as RGB), s * 0.5, h * 0.16, s * 0.50, h * 0.005, 0, 0.15);
  pushBox(parts, textured(MATERIALS.leather(frontCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 5 }, { kind: 'grain', amount: 0.04 }),
    s * 0.5, h * 0.58, s * 0.50, h * 0.42, 0, 0.18);
  // Vertical plank seams on the front face
  const seam = MATERIALS.leather([frontCol[0] * 0.66, frontCol[1] * 0.66, frontCol[2] * 0.62] as RGB);
  for (let i = 0; i < 3; i++) {
    const vx = s * (0.25 + i * 0.25) + rng.jitter(s * 0.02);
    pushCapsule(parts, seam, vx, h * 0.20, vx, h * 0.94, Math.max(1, s * 0.005), 0.06);
  }
  // Horizontal rail
  pushCapsule(parts, seam, s * 0.03, h * 0.55, s * 0.97, h * 0.55, Math.max(1, s * 0.005), 0.06);
  wallBaseShadow(parts, s, h, frontCol);
  return parts;
}

/**
 * Plain plaster interior wall — flat and smooth (no brickwork/planks) unlike
 * stone_wall/wood_wall, with a soft ambient-occlusion gradient rising from
 * the floor line so an enclosed room reads as grounded rather than flat.
 */
function buildInteriorWall(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const topCol: RGB = [150 + rng.jitter(6), 140 + rng.jitter(5), 126 + rng.jitter(5)];
  const frontCol: RGB = [178 + rng.jitter(8), 168 + rng.jitter(6), 152 + rng.jitter(6)];
  wallTopAndFront(parts, rng, s, h, topCol, frontCol);
  // Faint plaster grain only — deliberately no brick/plank pattern. A lone
  // coarse-scale layer reads as blotchy quilting at tile scale, so this is
  // fine per-pixel noise only (no `scale`), matching a smooth plastered wall.
  pushBox(parts, textured(MATERIALS.bone(frontCol), { kind: 'grain', amount: 0.025 }),
    s * 0.5, h * 0.58, s * 0.50, h * 0.42, 0, 0.12);
  // Soft AO gradient: overlapping bands darkening toward the floor line
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const by = h * (0.80 + t * 0.17);
    const darken = 1 - t * 0.55;
    const bandCol: RGB = [frontCol[0] * darken, frontCol[1] * darken, frontCol[2] * darken];
    pushBox(parts, MATERIALS.bone(bandCol), s * 0.5, by, s * 0.50, h * 0.055, 0, 0.05);
  }
  // Occasional water stain / crack for texture variety
  if (rng.float() > 0.6) {
    pushCapsule(parts, MATERIALS.bone([frontCol[0] * 0.82, frontCol[1] * 0.80, frontCol[2] * 0.76] as RGB),
      s * (0.2 + rng.float() * 0.6), h * 0.3, s * (0.2 + rng.float() * 0.6) + rng.jitter(s * 0.06), h * 0.7,
      Math.max(1, s * 0.01), 0.1);
  }
  wallBaseShadow(parts, s, h, frontCol);
  return parts;
}

/**
 * Decorative rug/carpet — composites over wood_floor/stone_floor (no floor
 * slab of its own, same convention as bush/flowers/fence overworld props).
 */
function buildRug(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  // Independent width/height: a rug is usually laid as a multi-tile
  // rectangle (e.g. 4x2 tiles), not a single square tile like most other
  // builders assume, so every proportion below scales off its own axis.
  const th = h ?? s;
  const short = Math.min(s, th);
  const palettes: RGB[] = [[150, 45, 45], [45, 70, 140], [140, 95, 40], [70, 110, 60]];
  const base = palettes[Math.floor(rng.float() * palettes.length)];
  const j = rng.jitter(6);
  const rugCol: RGB = [base[0] + j, base[1] + j, base[2] + j];
  const borderCol: RGB = [rugCol[0] * 0.55, rugCol[1] * 0.55, rugCol[2] * 0.55];
  // Border frame, then a smaller inner field on top
  pushBox(parts, MATERIALS.cloth(borderCol), s * 0.5, th * 0.5, s * 0.44, th * 0.44, short * 0.05, 0.08);
  pushBox(parts, textured(MATERIALS.cloth(rugCol), { kind: 'grain', amount: 0.04, scale: 4 }, { kind: 'speckle', amount: 0.02 }, { kind: 'bump', amount: 0.25, scale: 2.5 }),
    s * 0.5, th * 0.5, s * 0.37, th * 0.37, short * 0.04, 0.08);
  // Center medallion
  const accentCol: RGB = [rugCol[0] + 30, rugCol[1] + 20, rugCol[2] + 10];
  pushEllipse(parts, MATERIALS.cloth(accentCol), s * 0.5, th * 0.5, s * 0.13, th * 0.16, 0.3);
  pushEllipse(parts, MATERIALS.cloth(borderCol), s * 0.5, th * 0.5, s * 0.065, th * 0.08, 0.3);
  // Fringe ticks along the top/bottom edges
  for (let i = 0; i < 5; i++) {
    const tx = s * (0.14 + i * 0.18);
    pushCapsule(parts, MATERIALS.cloth(borderCol), tx, th * 0.09, tx, th * 0.03, Math.max(1, short * 0.025), 0.2);
    pushCapsule(parts, MATERIALS.cloth(borderCol), tx, th * 0.91, tx, th * 0.97, Math.max(1, short * 0.025), 0.2);
  }
  return parts;
}

/**
 * Overworld water (lake/river). Sides flagged in `edges` touch grass and get
 * a dark waterline plus a grass overhang so shores read organically.
 */
function buildWater(rng: RNG, s: number, edges?: TileConfig['edges']): Part[] {
  const parts: Part[] = [];
  // Tiny jitter only: adjacent water tiles must read as one continuous body,
  // per-tile brightness differences show up as a checkerboard on flat water.
  const j = rng.jitter(1.5);
  const waterCol: RGB = [30 + j, 72 + j, 118 + j];
  pushBox(parts, textured(MATERIALS.glass(waterCol), { kind: 'grain', amount: 0.04, sx: 7, sy: 1 }, { kind: 'grain', amount: 0.025, sx: 3, sy: 1 }, { kind: 'bump', amount: 0.18, sx: 8, sy: 2 }),
    s * 0.5, s * 0.5, s * 0.50, s * 0.50, 0, 0.06);
  // Drifting highlight streaks (calm surface)
  for (let i = 0; i < 3; i++) {
    const wy = s * (0.15 + rng.float() * 0.7);
    const wx = s * (0.1 + rng.float() * 0.5);
    const len = s * (0.12 + rng.float() * 0.16);
    pushCapsule(parts, MATERIALS.glass([waterCol[0] + 26, waterCol[1] + 30, waterCol[2] + 26] as RGB),
      wx, wy, wx + len, wy, Math.max(1, s * 0.008), 0.1);
  }
  // Occasional sparkle
  if (rng.float() > 0.5) {
    pushCircle(parts, MATERIALS.glass([waterCol[0] + 60, waterCol[1] + 65, waterCol[2] + 55] as RGB),
      s * (0.25 + rng.float() * 0.5), s * (0.25 + rng.float() * 0.5), Math.max(1, s * 0.014), 0.3);
  }
  // Dark waterline under the grass overhang on shore sides
  if (edges) {
    const lineCol: RGB = [waterCol[0] * 0.55, waterCol[1] * 0.55, waterCol[2] * 0.6];
    const line = (ax: number, ay: number, bx: number, by: number) =>
      pushCapsule(parts, MATERIALS.glass(lineCol), ax * s, ay * s, bx * s, by * s, Math.max(1.2, s * 0.02), 0.08);
    if (edges.n) line(0, 0.03, 1, 0.03);
    if (edges.s) line(0, 0.97, 1, 0.97);
    if (edges.w) line(0.03, 0, 0.03, 1);
    if (edges.e) line(0.97, 0, 0.97, 1);
  }
  edgeFringe(parts, rng, s, edges, 'grass');
  return parts;
}

/** Leafy bush prop — overlapping foliage lobes, composited over terrain. */
function buildBush(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  pushEllipse(parts, MATERIALS.bone([33, 36, 26]), cx, s * 0.82, s * 0.30, s * 0.06, 0.05);
  const leafCol: RGB = [46 + rng.jitter(10), 98 + rng.jitter(12), 42 + rng.jitter(8)];
  const leaf = textured(MATERIALS.flesh(leafCol), { kind: 'grain', amount: 0.05, scale: 4 }, { kind: 'speckle', amount: 0.07 });
  const leafDark = textured(MATERIALS.flesh([leafCol[0] * 0.60, leafCol[1] * 0.70, leafCol[2] * 0.74] as RGB), { kind: 'speckle', amount: 0.06 }, { kind: 'grain', amount: 0.04 });
  const leafLight = textured(MATERIALS.flesh([leafCol[0] + 24, leafCol[1] + 24, leafCol[2] + 4] as RGB), { kind: 'speckle', amount: 0.07 }, { kind: 'grain', amount: 0.04 });
  // Back mass, then side lobes, then light top
  pushEllipse(parts, leafDark, cx, s * 0.62, s * 0.34, s * 0.24, 0.3);
  pushCircle(parts, leaf, cx - s * 0.18, s * 0.62, s * 0.17, 0.32);
  pushCircle(parts, leaf, cx + s * 0.17, s * 0.60, s * 0.16, 0.32);
  pushCircle(parts, leaf, cx, s * 0.52, s * 0.19, 0.35);
  pushCircle(parts, leafDark, cx + s * 0.05, s * 0.68, s * 0.10, 0.25);
  pushCircle(parts, leafLight, cx - s * 0.07, s * 0.44, s * 0.10, 0.28);
  // Rim scallop — small clumps around the outline so the bush silhouette is
  // bunched leaves, matching the tree canopy treatment. Dark below, base at
  // the sides, one sunlit clump up top.
  const rimN = 6 + Math.floor(rng.float() * 3);
  for (let i = 0; i < rimN; i++) {
    const ang = (i / rimN) * Math.PI * 2 + rng.jitter(0.25);
    const px = cx + Math.cos(ang) * s * 0.28 + rng.jitter(s * 0.02);
    const py = s * 0.58 + Math.sin(ang) * s * 0.20 + rng.jitter(s * 0.015);
    const mat = Math.sin(ang) > 0.35 ? leafDark : Math.sin(ang) < -0.4 ? leafLight : leaf;
    pushCircle(parts, mat, px, py, s * (0.05 + rng.float() * 0.03), 0.35);
  }
  // Tiny sunlit leaf dots on the light side
  for (let i = 0; i < 3; i++) {
    pushCircle(parts, leafLight, cx - s * 0.12 + rng.float() * s * 0.2, s * (0.40 + rng.float() * 0.1), Math.max(1, s * 0.02), 0.3);
  }
  // A few berries on some bushes
  if (rng.float() > 0.5) {
    for (let i = 0; i < 3; i++) {
      pushCircle(parts, MATERIALS.gem([190 + rng.jitter(20), 50, 60]),
        cx + rng.jitter(s * 0.22), s * (0.5 + rng.float() * 0.18), Math.max(1, s * 0.022), 0.6);
    }
  }
  return parts;
}

/** Flower patch prop — a few colored blossoms with leaves, no base tile. */
function buildFlowers(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const palettes: RGB[] = [[225, 210, 235], [235, 200, 90], [220, 120, 150], [150, 170, 235]];
  const petal = palettes[Math.floor(rng.float() * palettes.length)];
  const leafMat = MATERIALS.flesh([50 + rng.jitter(8), 100 + rng.jitter(10), 44 + rng.jitter(6)]);
  const n = 3 + Math.floor(rng.float() * 3);
  for (let i = 0; i < n; i++) {
    const fx = s * (0.18 + rng.float() * 0.64);
    const fy = s * (0.2 + rng.float() * 0.6);
    // Leaf tuft under the blossom
    pushCircle(parts, leafMat, fx + rng.jitter(s * 0.04), fy + s * 0.05, s * (0.06 + rng.float() * 0.025), 0.1);
    // Petals — 4 dots around a warm center
    const pr = Math.max(1.4, s * 0.035);
    const fm = MATERIALS.cloth([petal[0] + rng.jitter(15), petal[1] + rng.jitter(15), petal[2] + rng.jitter(15)] as RGB);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      pushCircle(parts, fm, fx + dx * pr * 1.1, fy + dy * pr * 1.1, pr, 0.3);
    }
    pushCircle(parts, MATERIALS.gold([230, 190, 70]), fx, fy, Math.max(1, pr * 0.7), 0.5);
  }
  return parts;
}

/** Boulder prop — rounded gray rock with moss, composited over terrain. */
function buildRock(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  pushEllipse(parts, MATERIALS.bone([33, 36, 26]), cx + s * 0.02, s * 0.78, s * 0.26, s * 0.06, 0.05);
  const rockCol: RGB = [104 + rng.jitter(10), 100 + rng.jitter(8), 94 + rng.jitter(8)];
  const rock = textured(MATERIALS.bone(rockCol), { kind: 'grain', amount: 0.05, scale: 3 }, { kind: 'grain', amount: 0.06 });
  // Main boulder + secondary lump
  pushEllipse(parts, rock, cx, s * 0.58, s * 0.26, s * 0.20, 0.45);
  pushEllipse(parts, rock, cx + s * 0.16, s * 0.66, s * 0.13, s * 0.10, 0.4);
  // Crack line
  pushCapsule(parts, MATERIALS.bone([rockCol[0] * 0.6, rockCol[1] * 0.6, rockCol[2] * 0.58] as RGB),
    cx - s * 0.08, s * 0.48, cx - s * 0.02 + rng.jitter(s * 0.04), s * 0.64, Math.max(1, s * 0.008), 0.1);
  // Moss cap on some rocks
  if (rng.float() > 0.4) {
    pushEllipse(parts, MATERIALS.flesh([56 + rng.jitter(8), 96 + rng.jitter(10), 44 + rng.jitter(6)]),
      cx - s * 0.06, s * 0.44, s * 0.14, s * 0.06, 0.2);
  }
  return parts;
}

/**
 * A loose cluster of small stones — a lighter, denser ground-scatter prop
 * than the single `rock` boulder. Meant to be placed many times along path
 * edges/clearings; a lone boulder every so often reads as sparse, a handful
 * of these mixed in reads as a naturally stony patch of ground.
 */
function buildPebbles(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const n = 4 + Math.floor(rng.float() * 3);
  for (let i = 0; i < n; i++) {
    const px = s * (0.12 + rng.float() * 0.76), py = s * (0.38 + rng.float() * 0.5);
    const pr = s * (0.08 + rng.float() * 0.08);
    pushEllipse(parts, MATERIALS.bone([28, 26, 22]), px + pr * 0.12, py + pr * 0.5, pr * 0.95, pr * 0.25, 0.08);
  }
  for (let i = 0; i < n; i++) {
    const px = s * (0.12 + rng.float() * 0.76), py = s * (0.38 + rng.float() * 0.5);
    const pr = s * (0.08 + rng.float() * 0.08);
    const j = rng.jitter(14);
    const col: RGB = [140 + j, 133 + j, 122 + j];
    pushEllipse(parts, textured(MATERIALS.bone(col), { kind: 'grain', amount: 0.05 }, { kind: 'bump', amount: 0.25, scale: 2 }),
      px, py, pr, pr * 0.74, 0.35);
  }
  return parts;
}

/**
 * A pale, spreading tree root system on bare ground — the kind of dramatic
 * root tangle at the base of an old/dead tree. No floor slab; composites
 * over grass/dirt like bush/flowers/rock.
 */
function buildRoot(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const rootCol: RGB = [182 + rng.jitter(15), 170 + rng.jitter(12), 148 + rng.jitter(10)];
  const mat = textured(MATERIALS.bone(rootCol), { kind: 'grain', amount: 0.05 }, { kind: 'bump', amount: 0.2, scale: 2 });
  const darkMat = MATERIALS.bone([rootCol[0] * 0.7, rootCol[1] * 0.7, rootCol[2] * 0.65] as RGB);
  const cx = s * 0.5, cy = s * 0.55;
  const branches = 4 + Math.floor(rng.float() * 2);
  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + rng.jitter(0.5);
    const len = s * (0.26 + rng.float() * 0.16);
    const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len * 0.55;
    const thick = Math.max(1.2, s * (0.026 - i * 0.001));
    pushCapsule(parts, mat, cx, cy, ex, ey, thick, 0.35);
    pushCapsule(parts, darkMat, cx, cy, ex, ey, Math.max(1, thick * 0.35), 0.3);
    // occasional forking offshoot
    if (rng.float() > 0.35) {
      const midx = cx + (ex - cx) * 0.55, midy = cy + (ey - cy) * 0.55;
      const ang2 = ang + rng.jitter(1.0);
      const len2 = len * 0.45;
      pushCapsule(parts, mat, midx, midy, midx + Math.cos(ang2) * len2, midy + Math.sin(ang2) * len2 * 0.5,
        Math.max(1, thick * 0.55), 0.3);
    }
  }
  pushCircle(parts, mat, cx, cy, s * 0.07, 0.4);
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

// ---- Phase 2 prop library (village/dungeon dressing) ------------------------

function buildCrate(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const woodCol: RGB = [122 + rng.jitter(10), 88 + rng.jitter(8), 52 + rng.jitter(6)];
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.88, s * 0.22, s * 0.05, 0.05);
  // Front face
  pushBox(parts, textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 4 }, { kind: 'grain', amount: 0.04 }),
    s * 0.5, s * 0.62, s * 0.22, s * 0.24, s * 0.02, 0.14);
  const seam: RGB = [woodCol[0] * 0.72, woodCol[1] * 0.72, woodCol[2] * 0.68];
  pushCapsule(parts, MATERIALS.leather(seam), s * 0.5, s * 0.40, s * 0.5, s * 0.84, Math.max(1, s * 0.005), 0.06);
  // Corner battens
  const batten = MATERIALS.leather([woodCol[0] * 0.6, woodCol[1] * 0.6, woodCol[2] * 0.56] as RGB);
  pushBox(parts, batten, s * 0.30, s * 0.62, s * 0.02, s * 0.24, s * 0.006, 0.1);
  pushBox(parts, batten, s * 0.70, s * 0.62, s * 0.02, s * 0.24, s * 0.006, 0.1);
  // Top surface (foreshortened)
  pushBox(parts, textured(MATERIALS.leather([woodCol[0] + 14, woodCol[1] + 10, woodCol[2] + 6] as RGB), { kind: 'grain', amount: 0.05, sx: 4, sy: 1 }),
    s * 0.5, s * 0.40, s * 0.22, s * 0.06, s * 0.015, 0.12);
  pushCapsule(parts, MATERIALS.leather(seam), s * 0.30, s * 0.40, s * 0.70, s * 0.40, Math.max(1, s * 0.004), 0.05);
  pushCapsule(parts, MATERIALS.leather(seam), s * 0.5, s * 0.35, s * 0.5, s * 0.45, Math.max(1, s * 0.004), 0.05);
  return parts;
}

function buildCauldron(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.88, s * 0.24, s * 0.05, 0.05);
  const ironCol: RGB = [42 + rng.jitter(5), 40 + rng.jitter(4), 40 + rng.jitter(4)];
  const legMat = MATERIALS.matteMetal(ironCol);
  pushCapsule(parts, legMat, s * 0.36, s * 0.60, s * 0.30, s * 0.84, Math.max(1.2, s * 0.02), 0.3);
  pushCapsule(parts, legMat, s * 0.64, s * 0.60, s * 0.70, s * 0.84, Math.max(1.2, s * 0.02), 0.3);
  // Pot body
  pushEllipse(parts, textured(MATERIALS.matteMetal(ironCol), { kind: 'speckle', amount: 0.03 }, { kind: 'grain', amount: 0.03 }),
    s * 0.5, s * 0.55, s * 0.24, s * 0.18, 0.5);
  // Rim
  pushEllipse(parts, MATERIALS.matteMetal([ironCol[0] + 18, ironCol[1] + 16, ironCol[2] + 16] as RGB),
    s * 0.5, s * 0.40, s * 0.22, s * 0.06, 0.3);
  // Bubbling brew
  const brewCol: RGB = [90 + rng.jitter(20), 190 + rng.jitter(20), 110 + rng.jitter(15)];
  pushEllipse(parts, MATERIALS.ember(brewCol), s * 0.5, s * 0.40, s * 0.16, s * 0.035, 0.5);
  // Handles
  pushCircle(parts, legMat, s * 0.28, s * 0.42, s * 0.025, 0.4);
  pushCircle(parts, legMat, s * 0.72, s * 0.42, s * 0.025, 0.4);
  return parts;
}

/** Closed storage chest — a static dressing prop (see items.ts's `chest` for the animated, openable loot version). */
function buildChestProp(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.52, s * 0.88, s * 0.22, s * 0.05, 0.05);
  const woodCol: RGB = [120 + rng.jitter(10), 80 + rng.jitter(8), 46 + rng.jitter(6)];
  // Body
  pushBox(parts, textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 4 }, { kind: 'grain', amount: 0.03 }),
    s * 0.5, s * 0.70, s * 0.20, s * 0.14, s * 0.02, 0.14);
  // Domed lid, flush with the body's width so it reads as a cap, not a brim
  const lidCol: RGB = [woodCol[0] + 10, woodCol[1] + 7, woodCol[2] + 4];
  pushEllipse(parts, textured(MATERIALS.leather(lidCol), { kind: 'grain', amount: 0.04, sx: 4, sy: 1 }), s * 0.5, s * 0.54, s * 0.20, s * 0.09, 0.5);
  pushBox(parts, MATERIALS.leather([lidCol[0] + 14, lidCol[1] + 10, lidCol[2] + 6] as RGB),
    s * 0.5, s * 0.50, s * 0.17, s * 0.02, s * 0.01, 0.3);
  // Iron corner bands wrapping over lid and body
  const bandMat = MATERIALS.matteMetal([70, 64, 58]);
  pushCapsule(parts, bandMat, s * 0.30, s * 0.46, s * 0.30, s * 0.84, Math.max(1, s * 0.014), 0.15);
  pushCapsule(parts, bandMat, s * 0.70, s * 0.46, s * 0.70, s * 0.84, Math.max(1, s * 0.014), 0.15);
  // Lock plate
  pushBox(parts, bandMat, s * 0.5, s * 0.62, s * 0.035, s * 0.03, s * 0.008, 0.3);
  pushCircle(parts, MATERIALS.gold([210, 175, 75] as RGB), s * 0.5, s * 0.62, s * 0.012, 0.5);
  return parts;
}

function buildWell(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const th = h ?? s * 1.7;
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, th * 0.94, s * 0.3, s * 0.06, 0.05);
  const stoneCol: RGB = [96 + rng.jitter(6), 90 + rng.jitter(5), 82 + rng.jitter(5)];
  pushEllipse(parts, textured(MATERIALS.bone(stoneCol), { kind: 'grain', amount: 0.04, scale: 3 }, { kind: 'grain', amount: 0.04 }),
    s * 0.5, th * 0.68, s * 0.26, s * 0.16, 0.3);
  pushEllipse(parts, MATERIALS.bone([stoneCol[0] * 0.5, stoneCol[1] * 0.5, stoneCol[2] * 0.48] as RGB),
    s * 0.5, th * 0.62, s * 0.18, s * 0.08, 0.3);
  pushEllipse(parts, MATERIALS.bone([stoneCol[0] + 16, stoneCol[1] + 13, stoneCol[2] + 10] as RGB),
    s * 0.5, th * 0.58, s * 0.19, s * 0.09, 0.3);
  // Roof posts + gabled roof
  const postMat = MATERIALS.leather([102, 68, 42]);
  pushCapsule(parts, postMat, s * 0.28, th * 0.90, s * 0.28, th * 0.30, Math.max(1.2, s * 0.03), 0.3);
  pushCapsule(parts, postMat, s * 0.72, th * 0.90, s * 0.72, th * 0.30, Math.max(1.2, s * 0.03), 0.3);
  pushBox(parts, MATERIALS.leather([120, 55, 40]), s * 0.5, th * 0.22, s * 0.34, th * 0.05, s * 0.02, 0.2);
  pushCapsule(parts, postMat, s * 0.28, th * 0.34, s * 0.72, th * 0.34, Math.max(1.2, s * 0.018), 0.3);
  // Rope + bucket dangling into the well
  pushCapsule(parts, MATERIALS.bone([170, 150, 110]), s * 0.5, th * 0.36, s * 0.5, th * 0.55, Math.max(1, s * 0.008), 0.1);
  pushBox(parts, MATERIALS.leather([110, 78, 46]), s * 0.5, th * 0.58, s * 0.05, s * 0.05, s * 0.01, 0.2);
  return parts;
}

function buildBench(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const woodCol: RGB = [118 + rng.jitter(8), 82 + rng.jitter(6), 50 + rng.jitter(5)];
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.88, s * 0.32, s * 0.05, 0.05);
  const legMat = MATERIALS.leather([woodCol[0] * 0.7, woodCol[1] * 0.7, woodCol[2] * 0.66] as RGB);
  pushCapsule(parts, legMat, s * 0.24, s * 0.62, s * 0.24, s * 0.84, Math.max(1, s * 0.014), 0.15);
  pushCapsule(parts, legMat, s * 0.76, s * 0.62, s * 0.76, s * 0.84, Math.max(1, s * 0.014), 0.15);
  // Seat
  pushBox(parts, textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.05, sx: 4, sy: 1 }),
    s * 0.5, s * 0.62, s * 0.34, s * 0.045, s * 0.01, 0.15);
  // Backrest
  pushBox(parts, textured(MATERIALS.leather([woodCol[0] - 6, woodCol[1] - 5, woodCol[2] - 4] as RGB), { kind: 'grain', amount: 0.05, sx: 4, sy: 1 }),
    s * 0.5, s * 0.40, s * 0.32, s * 0.04, s * 0.01, 0.15);
  pushCapsule(parts, legMat, s * 0.24, s * 0.62, s * 0.24, s * 0.36, Math.max(1, s * 0.012), 0.15);
  pushCapsule(parts, legMat, s * 0.76, s * 0.62, s * 0.76, s * 0.36, Math.max(1, s * 0.012), 0.15);
  return parts;
}

function buildPlanter(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.86, s * 0.18, s * 0.045, 0.05);
  const potCol: RGB = [140 + rng.jitter(10), 88 + rng.jitter(8), 60 + rng.jitter(6)];
  pushBox(parts, textured(MATERIALS.bone(potCol), { kind: 'grain', amount: 0.04 }, { kind: 'speckle', amount: 0.02 }),
    s * 0.5, s * 0.72, s * 0.15, s * 0.12, s * 0.02, 0.2);
  pushEllipse(parts, MATERIALS.bone([potCol[0] + 15, potCol[1] + 10, potCol[2] + 6] as RGB), s * 0.5, s * 0.60, s * 0.16, s * 0.03, 0.2);
  pushEllipse(parts, MATERIALS.bone([45, 35, 28]), s * 0.5, s * 0.60, s * 0.13, s * 0.02, 0.15);
  // Foliage + blossoms
  const leafMat = MATERIALS.flesh([48 + rng.jitter(8), 100 + rng.jitter(10), 44 + rng.jitter(6)] as RGB);
  pushCircle(parts, leafMat, s * 0.5, s * 0.46, s * 0.13, 0.3);
  const palettes: RGB[] = [[225, 120, 150], [235, 200, 90], [150, 170, 235]];
  for (let i = 0; i < 3; i++) {
    const col = palettes[i % palettes.length];
    const ang = (i / 3) * Math.PI * 2;
    pushCircle(parts, MATERIALS.cloth(col), s * 0.5 + Math.cos(ang) * s * 0.08, s * 0.40 + Math.sin(ang) * s * 0.05, s * 0.03, 0.4);
  }
  return parts;
}

function buildFirewood(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.86, s * 0.26, s * 0.05, 0.05);
  const barkCol: RGB = [92 + rng.jitter(10), 62 + rng.jitter(8), 40 + rng.jitter(6)];
  const woodMat = textured(MATERIALS.leather(barkCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 3 }, { kind: 'grain', amount: 0.03 });
  const ringCol: RGB = [barkCol[0] + 40, barkCol[1] + 30, barkCol[2] + 18];
  for (let i = 0; i < 4; i++) {
    const lx = s * (0.2 + i * 0.2);
    pushCapsule(parts, woodMat, lx - s * 0.09, s * 0.7, lx + s * 0.09, s * 0.7, s * 0.075, 0.6);
    pushCircle(parts, MATERIALS.bone(ringCol), lx + s * 0.09, s * 0.7, s * 0.06, 0.4);
  }
  for (let i = 0; i < 3; i++) {
    const lx = s * (0.3 + i * 0.2);
    pushCapsule(parts, woodMat, lx - s * 0.09, s * 0.55, lx + s * 0.09, s * 0.55, s * 0.065, 0.6);
    pushCircle(parts, MATERIALS.bone(ringCol), lx + s * 0.09, s * 0.55, s * 0.05, 0.4);
  }
  return parts;
}

function buildSignpost(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const th = h ?? s * 1.6;
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, th * 0.96, s * 0.14, s * 0.04, 0.05);
  const postCol: RGB = [110 + rng.jitter(8), 78 + rng.jitter(6), 48 + rng.jitter(5)];
  pushCapsule(parts, textured(MATERIALS.leather(postCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 5 }), s * 0.5, th * 0.94, s * 0.5, th * 0.34, Math.max(1.2, s * 0.035), 0.3);
  const signCol: RGB = [130 + rng.jitter(8), 96 + rng.jitter(6), 60 + rng.jitter(5)];
  pushBox(parts, textured(MATERIALS.leather(signCol), { kind: 'grain', amount: 0.05, sx: 4, sy: 1 }, { kind: 'grain', amount: 0.03 }),
    s * 0.5, th * 0.24, s * 0.28, th * 0.09, s * 0.015, 0.15);
  pushCapsule(parts, MATERIALS.leather([signCol[0] * 0.75, signCol[1] * 0.75, signCol[2] * 0.72] as RGB),
    s * 0.5 - s * 0.24, th * 0.24, s * 0.5 + s * 0.24, th * 0.24, Math.max(1, s * 0.004), 0.06);
  // Carved mark
  pushCapsule(parts, MATERIALS.bone([50, 44, 38]), s * 0.5 - s * 0.1, th * 0.24, s * 0.5 + s * 0.1, th * 0.24, Math.max(1, s * 0.01), 0.1);
  return parts;
}

function buildBucket(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.86, s * 0.14, s * 0.035, 0.05);
  const woodCol: RGB = [130 + rng.jitter(10), 92 + rng.jitter(8), 55 + rng.jitter(6)];
  pushBox(parts, textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.05, sx: 1, sy: 4 }), s * 0.5, s * 0.68, s * 0.11, s * 0.14, s * 0.01, 0.16);
  const bandMat = MATERIALS.matteMetal([120, 116, 110]);
  pushBox(parts, bandMat, s * 0.5, s * 0.60, s * 0.12, s * 0.01, s * 0.004, 0.3);
  pushBox(parts, bandMat, s * 0.5, s * 0.76, s * 0.115, s * 0.01, s * 0.004, 0.3);
  pushEllipse(parts, MATERIALS.leather([woodCol[0] + 12, woodCol[1] + 8, woodCol[2] + 5] as RGB), s * 0.5, s * 0.56, s * 0.11, s * 0.025, 0.2);
  pushCapsule(parts, bandMat, s * 0.40, s * 0.54, s * 0.5, s * 0.44, Math.max(1, s * 0.012), 0.3);
  pushCapsule(parts, bandMat, s * 0.5, s * 0.44, s * 0.60, s * 0.54, Math.max(1, s * 0.012), 0.3);
  return parts;
}

/** Standalone graveyard marker (see loot.ts's `gravestone` for the death-drop marker with a name plaque). */
function buildGravestoneProp(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, s * 0.88, s * 0.2, s * 0.05, 0.05);
  const stoneCol: RGB = [96 + rng.jitter(6), 92 + rng.jitter(5), 88 + rng.jitter(5)];
  const gravestoneMat = textured(MATERIALS.bone(stoneCol), { kind: 'grain', amount: 0.04 }, { kind: 'speckle', amount: 0.025 });
  pushBox(parts, gravestoneMat, s * 0.5, s * 0.58, s * 0.14, s * 0.26, s * 0.05, 0.4);
  pushEllipse(parts, gravestoneMat, s * 0.5, s * 0.34, s * 0.14, s * 0.06, 0.4);
  if (rng.float() > 0.4) {
    pushCircle(parts, MATERIALS.flesh([50 + rng.jitter(8), 92 + rng.jitter(10), 42 + rng.jitter(6)] as RGB),
      s * 0.5 + rng.jitter(s * 0.05), s * 0.62, s * 0.05, 0.15);
  }
  pushCapsule(parts, MATERIALS.bone([stoneCol[0] * 0.6, stoneCol[1] * 0.6, stoneCol[2] * 0.58] as RGB),
    s * 0.44, s * 0.42, s * 0.48, s * 0.66, Math.max(1, s * 0.006), 0.1);
  return parts;
}

function buildStatue(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const th = h ?? s * 1.8;
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, th * 0.97, s * 0.2, s * 0.05, 0.05);
  const stoneCol: RGB = [124 + rng.jitter(8), 120 + rng.jitter(6), 112 + rng.jitter(6)];
  const stone = textured(MATERIALS.bone(stoneCol), { kind: 'grain', amount: 0.04, scale: 3 }, { kind: 'grain', amount: 0.03 }, { kind: 'speckle', amount: 0.02 });
  pushBox(parts, MATERIALS.bone([stoneCol[0] - 20, stoneCol[1] - 18, stoneCol[2] - 16] as RGB),
    s * 0.5, th * 0.88, s * 0.18, th * 0.07, s * 0.02, 0.2);
  pushCapsule(parts, stone, s * 0.5, th * 0.80, s * 0.5, th * 0.55, s * 0.09, 0.3);
  pushCapsule(parts, stone, s * 0.5, th * 0.56, s * 0.5, th * 0.30, s * 0.11, 0.4);
  pushCircle(parts, stone, s * 0.5, th * 0.22, s * 0.09, 0.5);
  pushCapsule(parts, stone, s * 0.5, th * 0.38, s * 0.32, th * 0.24, Math.max(1.2, s * 0.045), 0.35);
  pushCapsule(parts, MATERIALS.bone([stoneCol[0] * 0.7, stoneCol[1] * 0.72, stoneCol[2] * 0.68] as RGB),
    s * 0.44, th * 0.30, s * 0.42, th * 0.70, Math.max(1, s * 0.012), 0.1);
  return parts;
}

/** Wall-mounted storage shelf with jars/pots (see bookshelf for the book-lined version). */
function buildShelf(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const th = h ?? s;
  const wallCol: RGB = [65 + rng.jitter(6), 60 + rng.jitter(5), 56 + rng.jitter(5)];
  const topCol: RGB = [wallCol[0] - 12, wallCol[1] - 11, wallCol[2] - 10];
  wallTopAndFront(parts, rng, s, th, topCol, wallCol);
  const woodCol: RGB = [108 + rng.jitter(8), 74 + rng.jitter(6), 44 + rng.jitter(5)];
  const shelfWood = textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.05, sx: 4, sy: 1 });
  pushBox(parts, shelfWood, s * 0.5, th * 0.48, s * 0.42, th * 0.025, s * 0.01, 0.15);
  pushBox(parts, shelfWood, s * 0.5, th * 0.72, s * 0.42, th * 0.025, s * 0.01, 0.15);
  const bracket = MATERIALS.matteMetal([90, 86, 80]);
  pushCapsule(parts, bracket, s * 0.14, th * 0.48, s * 0.14, th * 0.72, Math.max(1, s * 0.008), 0.2);
  pushCapsule(parts, bracket, s * 0.86, th * 0.48, s * 0.86, th * 0.72, Math.max(1, s * 0.008), 0.2);
  const jarCols: RGB[] = [[90, 140, 150], [150, 110, 60], [110, 150, 90]];
  for (let i = 0; i < 3; i++) {
    pushBox(parts, MATERIALS.glass(jarCols[i]), s * (0.24 + i * 0.24), th * 0.42, s * 0.045, th * 0.045, s * 0.01, 0.3);
  }
  for (let i = 0; i < 2; i++) {
    pushCircle(parts, MATERIALS.bone([150 + rng.jitter(10), 130 + rng.jitter(8), 100 + rng.jitter(8)] as RGB),
      s * (0.32 + i * 0.32), th * 0.68, s * 0.04, 0.25);
  }
  return parts;
}

/** Wall-mounted cloth banner with an emblem. */
function buildBanner(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const th = h ?? s * 1.6;
  const wallCol: RGB = [58 + rng.jitter(6), 54 + rng.jitter(5), 50 + rng.jitter(5)];
  pushBox(parts, MATERIALS.bone(wallCol), s * 0.5, th * 0.5, s * 0.5, th * 0.5, 0, 0.05);
  const poleMat = MATERIALS.matteMetal([110, 102, 90]);
  pushCapsule(parts, poleMat, s * 0.2, th * 0.08, s * 0.8, th * 0.08, Math.max(1.2, s * 0.02), 0.4);
  pushCircle(parts, poleMat, s * 0.18, th * 0.08, s * 0.025, 0.5);
  pushCircle(parts, poleMat, s * 0.82, th * 0.08, s * 0.025, 0.5);
  const clothCol: RGB = rng.float() > 0.5
    ? [160 + rng.jitter(20), 40 + rng.jitter(10), 44 + rng.jitter(10)]
    : [50 + rng.jitter(10), 70 + rng.jitter(15), 150 + rng.jitter(20)];
  pushBox(parts, textured(MATERIALS.cloth(clothCol), { kind: 'grain', amount: 0.04, sx: 1, sy: 3 }, { kind: 'grain', amount: 0.03 }, { kind: 'bump', amount: 0.3, sx: 1, sy: 2.5 }),
    s * 0.5, th * 0.5, s * 0.30, th * 0.4, s * 0.02, 0.1);
  // Swallowtail notch at the bottom
  const notch: RGB = [clothCol[0] * 0.8, clothCol[1] * 0.8, clothCol[2] * 0.8];
  pushCapsule(parts, MATERIALS.cloth(notch), s * 0.5 - s * 0.06, th * 0.86, s * 0.5, th * 0.98, Math.max(1, s * 0.012), 0.15);
  pushCapsule(parts, MATERIALS.cloth(notch), s * 0.5 + s * 0.06, th * 0.86, s * 0.5, th * 0.98, Math.max(1, s * 0.012), 0.15);
  // Emblem + fold shading
  pushCircle(parts, MATERIALS.gold([210 + rng.jitter(15), 175 + rng.jitter(10), 80 + rng.jitter(10)] as RGB), s * 0.5, th * 0.36, s * 0.07, 0.4);
  pushCapsule(parts, MATERIALS.cloth([clothCol[0] * 0.7, clothCol[1] * 0.7, clothCol[2] * 0.7] as RGB),
    s * 0.38, th * 0.2, s * 0.38, th * 0.75, Math.max(1, s * 0.006), 0.08);
  return parts;
}

/** Freestanding street lantern (see torch_bracket for the wall-mounted version). */
function buildLantern(rng: RNG, s: number, h?: number): Part[] {
  const parts: Part[] = [];
  const floorCol = floorBase(parts, rng, s);
  const th = h ?? s * 1.9;
  pushEllipse(parts, MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42] as RGB),
    s * 0.5, th * 0.97, s * 0.14, s * 0.04, 0.05);
  const poleMat = MATERIALS.matteMetal([70 + rng.jitter(6), 66 + rng.jitter(5), 60 + rng.jitter(5)] as RGB);
  pushBox(parts, poleMat, s * 0.5, th * 0.90, s * 0.08, th * 0.03, s * 0.01, 0.25);
  pushCapsule(parts, poleMat, s * 0.5, th * 0.88, s * 0.5, th * 0.30, Math.max(1.2, s * 0.03), 0.35);
  const cageMat = MATERIALS.matteMetal([56, 52, 48]);
  pushBox(parts, cageMat, s * 0.5, th * 0.20, s * 0.11, th * 0.10, s * 0.01, 0.25);
  const glowCol: RGB = [255, 190 + rng.jitter(15), 100 + rng.jitter(15)];
  pushBox(parts, MATERIALS.glass(glowCol), s * 0.5, th * 0.20, s * 0.08, th * 0.075, s * 0.008, 0.3);
  pushEllipse(parts, poleMat, s * 0.5, th * 0.09, s * 0.09, s * 0.03, 0.3);
  pushCircle(parts, poleMat, s * 0.5, th * 0.05, s * 0.02, 0.5);
  // Warm glow halo (static hint; darkness.ts wires the actual light source)
  pushCircle(parts, MATERIALS.ember([255, 200, 110]), s * 0.5, th * 0.20, s * 0.18, 0.12);
  return parts;
}

// ---- trees, buildings, fences (3/4 perspective tall props) ------------------

function buildTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow at bottom
  pushEllipse(parts, MATERIALS.bone([33, 36, 26]), cx + s * 0.02, h * 0.93, s * 0.24, s * 0.06, 0.05);
  // Trunk — long vertical with bark texture
  const trunkCol: RGB = [82 + rng.jitter(8), 58 + rng.jitter(6), 38 + rng.jitter(5)];
  const trunk = textured(MATERIALS.leather(trunkCol), { kind: 'grain', amount: 0.06, sx: 1, sy: 5 }, { kind: 'bump', amount: 0.25, sx: 2, sy: 6 });
  const trunkDark = MATERIALS.leather([trunkCol[0] * 0.7, trunkCol[1] * 0.7, trunkCol[2] * 0.65] as RGB);
  const trunkLight = MATERIALS.leather([trunkCol[0] + 18, trunkCol[1] + 14, trunkCol[2] + 8] as RGB);
  pushCapsule(parts, trunk, cx, h * 0.90, cx - s * 0.01, h * 0.42, s * 0.085, 0.4);
  // Root flares — the trunk splays into the ground instead of ending in a
  // straight-cut cylinder, which is what anchors the tree to the tile.
  pushCapsule(parts, trunk, cx - s * 0.02, h * 0.84, cx - s * 0.13, h * 0.915, s * 0.028, 0.35);
  pushCapsule(parts, trunk, cx + s * 0.02, h * 0.85, cx + s * 0.12, h * 0.92, s * 0.026, 0.35);
  pushEllipse(parts, trunk, cx, h * 0.91, s * 0.12, h * 0.025, 0.3);
  // Bark ridges — alternating dark furrows and one lit ridge, wandering
  // slightly so the bark reads gnarled rather than pinstriped.
  const ridges = 3 + Math.floor(rng.float() * 2);
  for (let i = 0; i < ridges; i++) {
    const rx = cx + s * (-0.045 + (i / Math.max(1, ridges - 1)) * 0.09) + rng.jitter(s * 0.01);
    const y0 = h * (0.80 + rng.float() * 0.05), y1 = h * (0.48 + rng.float() * 0.08);
    pushCapsule(parts, i === 1 ? trunkLight : trunkDark, rx, y0, rx + rng.jitter(s * 0.02), y1, Math.max(1, s * 0.010), 0.15);
  }
  // Knot hole
  if (rng.float() > 0.55) {
    const ky = h * (0.6 + rng.float() * 0.15);
    pushEllipse(parts, trunkDark, cx + rng.jitter(s * 0.03), ky, s * 0.022, s * 0.03, 0.4);
  }
  // Canopy — big lush mass built from overlapping lobes (reads like foliage,
  // not a single balloon).
  const leafCol: RGB = [42 + rng.jitter(12), 95 + rng.jitter(15), 38 + rng.jitter(10)];
  const leaf = textured(MATERIALS.flesh(leafCol), { kind: 'grain', amount: 0.05, scale: 4 }, { kind: 'speckle', amount: 0.07 }, { kind: 'bump', amount: 0.3, scale: 2.5 });
  // Highlights lean yellow-green (sunlit) and shadows lean blue-green — the
  // hue split, not just the value split, is what gives the canopy the
  // painted Cambria look instead of one green at three brightnesses.
  const leafLight: RGB = [leafCol[0] + 26, leafCol[1] + 27, leafCol[2] + 4];
  const leafDark: RGB = [leafCol[0] * 0.58, leafCol[1] * 0.68, leafCol[2] * 0.72];
  const leafDarkMat = textured(MATERIALS.flesh(leafDark), { kind: 'speckle', amount: 0.06 }, { kind: 'grain', amount: 0.04 }, { kind: 'bump', amount: 0.25, scale: 2 });
  const leafLightMat = textured(MATERIALS.flesh(leafLight), { kind: 'speckle', amount: 0.07 }, { kind: 'grain', amount: 0.04 });
  // Back shadow mass — widest layer, sits behind everything
  pushEllipse(parts, leafDarkMat, cx, h * 0.30, s * 0.46, h * 0.21, 0.3);
  // Under-canopy shade over the trunk top
  pushEllipse(parts, leafDarkMat, cx, h * 0.42, s * 0.28, h * 0.08, 0.25);
  // Main canopy dome
  pushEllipse(parts, leaf, cx, h * 0.24, s * 0.46, h * 0.21, 0.4);
  // Side lobes bulging out of the dome
  pushCircle(parts, leaf, cx - s * 0.30 + rng.jitter(s * 0.03), h * 0.30, s * 0.16, 0.32);
  pushCircle(parts, leaf, cx + s * 0.30 + rng.jitter(s * 0.03), h * 0.28, s * 0.15, 0.32);
  pushCircle(parts, leaf, cx - s * 0.12 + rng.jitter(s * 0.04), h * 0.38, s * 0.14, 0.3);
  pushCircle(parts, leaf, cx + s * 0.14 + rng.jitter(s * 0.04), h * 0.36, s * 0.13, 0.3);
  // Rim scallop — a ring of small leaf clumps along the canopy edge breaks
  // the smooth ellipse outline into bunches of leaves. Lower-rim clumps go
  // dark (under-shadow), upper-left clumps go light (toward the light), the
  // rest stay base green. THIS is the single highest-impact pass for making
  // the tree read hand-drawn instead of airbrushed.
  const rimN = 10 + Math.floor(rng.float() * 3);
  for (let i = 0; i < rimN; i++) {
    const ang = (i / rimN) * Math.PI * 2 + rng.jitter(0.18);
    const px = cx + Math.cos(ang) * s * 0.42 + rng.jitter(s * 0.02);
    const py = h * 0.26 + Math.sin(ang) * h * 0.185 + rng.jitter(h * 0.012);
    const r = s * (0.065 + rng.float() * 0.045);
    const mat = Math.sin(ang) > 0.35 ? leafDarkMat
      : Math.sin(ang) < -0.4 && Math.cos(ang) < 0.35 ? leafLightMat
      : leaf;
    pushCircle(parts, mat, px, py, r, 0.35);
  }
  // Dark crevice clumps — shadow pockets between the lobes give the canopy
  // interior depth (without them the inside is one flat green field).
  pushCircle(parts, leafDarkMat, cx + s * 0.06, h * 0.34, s * 0.10, 0.25);
  pushCircle(parts, leafDarkMat, cx - s * 0.16, h * 0.26, s * 0.08, 0.25);
  pushCircle(parts, leafDarkMat, cx + s * 0.20 + rng.jitter(s * 0.03), h * 0.33, s * 0.07, 0.25);
  pushCircle(parts, leafDarkMat, cx - s * 0.02 + rng.jitter(s * 0.03), h * 0.20, s * 0.06, 0.25);
  // Top highlight lobes catching the light
  pushEllipse(parts, leafLightMat, cx - s * 0.08, h * 0.12, s * 0.26, h * 0.09, 0.25);
  pushCircle(parts, leafLightMat, cx + s * 0.16, h * 0.16, s * 0.10, 0.25);
  // Sunlit leaf-cluster dots — small bright bunches scattered over the
  // upper-left, with a couple of near-white sparks on top. These read as
  // individual leaf clusters catching the sun.
  const glints = 5 + Math.floor(rng.float() * 3);
  for (let i = 0; i < glints; i++) {
    const gx = cx + s * (-0.30 + rng.float() * 0.42);
    const gy = h * (0.10 + rng.float() * 0.14);
    pushCircle(parts, leafLightMat, gx, gy, s * (0.028 + rng.float() * 0.022), 0.3);
  }
  const sparkMat = MATERIALS.flesh([leafCol[0] + 45, leafCol[1] + 44, leafCol[2] + 18] as RGB);
  pushCircle(parts, sparkMat, cx - s * (0.06 + rng.float() * 0.12), h * (0.11 + rng.float() * 0.05), Math.max(1, s * 0.018), 0.3);
  pushCircle(parts, sparkMat, cx + s * (0.02 + rng.float() * 0.12), h * (0.15 + rng.float() * 0.05), Math.max(1, s * 0.014), 0.3);
  // Occasional fruit dots peeking out of the foliage
  if (rng.float() > 0.65) {
    const fruitMat = MATERIALS.cloth([200 + rng.jitter(20), 60 + rng.jitter(15), 45] as RGB);
    const n = 2 + Math.floor(rng.float() * 2);
    for (let i = 0; i < n; i++) {
      pushCircle(parts, fruitMat, cx + rng.jitter(s * 0.30), h * (0.22 + rng.float() * 0.14), Math.max(1, s * 0.016), 0.5);
    }
  }
  return parts;
}

function buildPineTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow
  pushEllipse(parts, MATERIALS.bone([33, 36, 26]), cx, h * 0.94, s * 0.18, s * 0.05, 0.05);
  // Trunk
  const trunkCol: RGB = [75 + rng.jitter(6), 52 + rng.jitter(5), 35 + rng.jitter(4)];
  pushCapsule(parts, textured(MATERIALS.leather(trunkCol), { kind: 'grain', amount: 0.06, sx: 1, sy: 4 }), cx, h * 0.92, cx, h * 0.35, s * 0.045, 0.35);
  // Tiered needle layers — wider at bottom, narrow at top. Each tier gets a
  // scalloped bottom edge (small dark clumps hanging below the ellipse rim —
  // drooping branch tips) and a sunlit sliver along its upper-left, which is
  // what turns three stacked ovals into recognizable pine boughs.
  const needleCol: RGB = [28 + rng.jitter(8), 72 + rng.jitter(10), 32 + rng.jitter(8)];
  const needle = textured(MATERIALS.flesh(needleCol), { kind: 'grain', amount: 0.05, scale: 3 }, { kind: 'speckle', amount: 0.07 }, { kind: 'bump', amount: 0.28, scale: 2 });
  const needleDark = textured(MATERIALS.flesh([needleCol[0] * 0.62, needleCol[1] * 0.68, needleCol[2] * 0.72] as RGB), { kind: 'speckle', amount: 0.06 }, { kind: 'grain', amount: 0.04 });
  const needleLight: RGB = [needleCol[0] + 18, needleCol[1] + 22, needleCol[2] + 4];
  const needleLightMat = textured(MATERIALS.flesh(needleLight), { kind: 'speckle', amount: 0.06 });
  const tiers: { y: number; rx: number; ry: number }[] = [
    { y: 0.52, rx: 0.32, ry: 0.09 },
    { y: 0.34, rx: 0.22, ry: 0.08 },
    { y: 0.18, rx: 0.14, ry: 0.07 },
  ];
  for (const tier of tiers) {
    const ty = h * tier.y, trx = s * tier.rx, try_ = h * tier.ry;
    // under-shadow mass behind/below the tier
    pushEllipse(parts, needleDark, cx, ty + h * 0.04, trx * 1.06, try_ * 0.9, 0.25);
    // drooping branch-tip clumps along the bottom rim
    const tips = 3 + Math.floor(rng.float() * 3);
    for (let i = 0; i < tips; i++) {
      const t = (i + 0.5) / tips - 0.5 + rng.jitter(0.06);
      pushCircle(parts, needleDark, cx + t * trx * 2 * 0.85, ty + try_ * (0.7 + rng.float() * 0.5), s * (0.035 + rng.float() * 0.025), 0.3);
    }
    // main bough
    pushEllipse(parts, needle, cx, ty, trx, try_, 0.3);
    // sunlit sliver on the upper-left edge
    pushEllipse(parts, needleLightMat, cx - trx * 0.3, ty - try_ * 0.45, trx * 0.5, try_ * 0.4, 0.2);
  }
  // Top point
  pushEllipse(parts, needle, cx, h * 0.08, s * 0.06, h * 0.06, 0.3);
  pushEllipse(parts, needleLightMat, cx - s * 0.02, h * 0.06, s * 0.04, h * 0.04, 0.2);
  return parts;
}

function buildDeadTree(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // Ground shadow
  pushEllipse(parts, MATERIALS.bone([33, 36, 26]), cx, h * 0.92, s * 0.18, s * 0.04, 0.05);
  // Trunk — tall, gnarled
  const barkCol: RGB = [55 + rng.jitter(6), 42 + rng.jitter(5), 32 + rng.jitter(4)];
  const bark = textured(MATERIALS.leather(barkCol), { kind: 'grain', amount: 0.07, sx: 1, sy: 5 }, { kind: 'bump', amount: 0.3, sx: 2, sy: 6 });
  const barkDark = MATERIALS.leather([barkCol[0] * 0.68, barkCol[1] * 0.68, barkCol[2] * 0.62] as RGB);
  pushCapsule(parts, bark, cx + s * 0.02, h * 0.90, cx - s * 0.02, h * 0.22, s * 0.06, 0.35);
  // Deep weathered furrows down the dead wood
  pushCapsule(parts, barkDark, cx - s * 0.015, h * 0.82, cx - s * 0.03, h * 0.35, Math.max(1, s * 0.009), 0.12);
  pushCapsule(parts, barkDark, cx + s * 0.025, h * 0.78, cx + s * 0.01, h * 0.4, Math.max(1, s * 0.008), 0.12);
  // Root flare + snapped branch stub
  pushCapsule(parts, bark, cx, h * 0.85, cx - s * 0.10, h * 0.905, s * 0.022, 0.3);
  pushCapsule(parts, bark, cx + s * 0.01, h * 0.86, cx + s * 0.09, h * 0.91, s * 0.02, 0.3);
  if (rng.float() > 0.5) {
    pushCapsule(parts, barkDark, cx - s * 0.04, h * 0.44, cx - s * 0.10, h * 0.40, Math.max(1, s * 0.012), 0.3);
  }
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

/**
 * 3/4 top-down house. The roof is a big sloped PLANE seen from above (rows of
 * shingles that get wider and darker toward the eave — perspective
 * foreshortening), then a dark fascia with a cast shadow onto the wall below.
 * The right side wall is a darker vertical strip, which is what sells the
 * building as a volume with height rather than a flat facade.
 */
function buildHouse(rng: RNG, s: number, h: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  // NO oval drop shadow: a building sits flush on the ground (an ellipse
  // reads as floating). Just a thin contact line under the base, drawn
  // slightly narrower than the walls so it never peeks past the corners.

  const wallCol: RGB = [136 + rng.jitter(10), 104 + rng.jitter(8), 72 + rng.jitter(6)];
  const wallDark: RGB = [wallCol[0] * 0.62, wallCol[1] * 0.62, wallCol[2] * 0.58];
  const wall = textured(MATERIALS.leather(wallCol), { kind: 'grain', amount: 0.04, scale: 4 }, { kind: 'grain', amount: 0.05 });

  // --- WALLS (drawn first, roof overhangs them) --------------------------
  const wallTop = h * 0.42, wallBot = h * 0.92;
  const wallCy = (wallTop + wallBot) / 2, wallHh = (wallBot - wallTop) / 2;
  // Thin ground contact line hugging the base of the walls
  pushBox(parts, MATERIALS.bone([30, 28, 24]), cx + s * 0.005, wallBot + h * 0.006, s * 0.46, h * 0.008, s * 0.004, 0.05);
  // Right side wall — in shade, sells the depth
  pushBox(parts, textured(MATERIALS.leather(wallDark), { kind: 'grain', amount: 0.05 }),
    cx + s * 0.40, wallCy, s * 0.075, wallHh, s * 0.008, 0.15);
  // Vertical siding seams on the side wall
  pushCapsule(parts, MATERIALS.leather([wallDark[0] * 0.8, wallDark[1] * 0.8, wallDark[2] * 0.8] as RGB),
    cx + s * 0.40, wallTop + h * 0.02, cx + s * 0.40, wallBot - h * 0.02, Math.max(1, s * 0.004), 0.06);
  // Front wall
  pushBox(parts, wall, cx - s * 0.065, wallCy, s * 0.395, wallHh, s * 0.008, 0.2);
  // Horizontal plank seams
  const seam = MATERIALS.leather([wallCol[0] * 0.72, wallCol[1] * 0.72, wallCol[2] * 0.68] as RGB);
  for (let i = 0; i < 3; i++) {
    const sy = h * (0.52 + i * 0.115);
    pushCapsule(parts, seam, cx - s * 0.45, sy, cx + s * 0.32, sy, Math.max(1, s * 0.004), 0.06);
  }
  // Corner beams + half-timber braces
  const beam = MATERIALS.leather([wallCol[0] * 0.52, wallCol[1] * 0.52, wallCol[2] * 0.49] as RGB);
  pushBox(parts, beam, cx - s * 0.445, wallCy, s * 0.018, wallHh, s * 0.006, 0.2);
  pushBox(parts, beam, cx + s * 0.315, wallCy, s * 0.018, wallHh, s * 0.006, 0.2);
  pushCapsule(parts, beam, cx - s * 0.44, h * 0.52, cx - s * 0.34, h * 0.45, Math.max(1, s * 0.009), 0.15);
  pushCapsule(parts, beam, cx + s * 0.31, h * 0.52, cx + s * 0.21, h * 0.45, Math.max(1, s * 0.009), 0.15);

  // Windows — warm-lit panes with shutters
  const frameMat = MATERIALS.leather([60, 45, 30]);
  const shutterMat = MATERIALS.leather([wallCol[0] * 0.5, wallCol[1] * 0.48, wallCol[2] * 0.45] as RGB);
  const windowAt = (wx: number, wy: number) => {
    pushBox(parts, shutterMat, wx - s * 0.075, wy, s * 0.022, h * 0.042, s * 0.006, 0.25);
    pushBox(parts, shutterMat, wx + s * 0.075, wy, s * 0.022, h * 0.042, s * 0.006, 0.25);
    pushBox(parts, MATERIALS.glass([200, 165, 90]), wx, wy, s * 0.05, h * 0.037, s * 0.008, 0.3);
    pushBox(parts, frameMat, wx, wy, s * 0.055, s * 0.0035, s * 0.002, 0.2);
    pushBox(parts, frameMat, wx, wy, s * 0.0035, h * 0.040, s * 0.002, 0.2);
    pushBox(parts, frameMat, wx, wy + h * 0.048, s * 0.065, s * 0.006, s * 0.003, 0.2);
  };
  windowAt(cx + s * 0.14, h * 0.60);
  windowAt(cx - s * 0.28, h * 0.60);

  // Door with a small gabled canopy
  const doorCol: RGB = [95 + rng.jitter(8), 65 + rng.jitter(6), 42 + rng.jitter(5)];
  pushBox(parts, MATERIALS.leather(doorCol), cx - s * 0.08, h * 0.815, s * 0.095, h * 0.105, s * 0.012, 0.25);
  // thin lintel beam over the door
  pushBox(parts, frameMat, cx - s * 0.08, h * 0.705, s * 0.115, h * 0.010, s * 0.005, 0.15);
  pushCircle(parts, MATERIALS.gold([190, 170, 70]), cx - s * 0.015, h * 0.82, Math.max(1, s * 0.014), 0.5);
  pushBox(parts, MATERIALS.bone([98, 92, 82]), cx - s * 0.08, h * 0.925, s * 0.125, h * 0.012, s * 0.006, 0.2);

  // --- ROOF: sloped plane seen from above --------------------------------
  const roofCol: RGB = [96 + rng.jitter(8), 48 + rng.jitter(6), 36 + rng.jitter(4)];
  const rowSeam = MATERIALS.leather([roofCol[0] * 0.62, roofCol[1] * 0.62, roofCol[2] * 0.62] as RGB);
  // Four shingle rows: wider + darker toward the eave (foreshortened slope
  // catching less sky light). Slight right offset per row = viewing angle.
  const rows = 4;
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);                        // 0 = ridge, 1 = eave
    const cyR = h * (0.115 + i * 0.082);
    const hwR = s * (0.42 + t * 0.09);
    const lift = 24 - t * 34;                        // +24 → -10 brightness
    const rowCol: RGB = [roofCol[0] + lift, roofCol[1] + lift * 0.75, roofCol[2] + lift * 0.6];
    pushBox(parts, textured(MATERIALS.leather(rowCol), { kind: 'grain', amount: 0.04, sx: 5, sy: 1 }, { kind: 'grain', amount: 0.05, scale: 3 }, { kind: 'grain', amount: 0.04 }),
      cx - s * 0.02 + s * 0.012 * i, cyR, hwR, h * 0.048, s * 0.008, 0.14);
    // seam under each row
    pushCapsule(parts, rowSeam, cx - s * 0.02 + s * 0.012 * i - hwR, cyR + h * 0.043,
      cx - s * 0.02 + s * 0.012 * i + hwR, cyR + h * 0.043, Math.max(1, s * 0.0045), 0.06);
    // staggered shingle tick marks along the row
    const ticks = 4 + (i % 2);
    for (let k = 0; k < ticks; k++) {
      const tx = cx - hwR * 0.85 + (k + 0.5 + (i % 2) * 0.5) * (hwR * 1.7 / ticks) + rng.jitter(s * 0.01);
      pushCapsule(parts, rowSeam, tx, cyR - h * 0.012, tx, cyR + h * 0.026, Math.max(1, s * 0.004), 0.05);
    }
  }
  // Ridge cap along the top
  pushBox(parts, MATERIALS.leather([roofCol[0] + 34, roofCol[1] + 24, roofCol[2] + 18] as RGB),
    cx - s * 0.02, h * 0.072, s * 0.415, h * 0.017, s * 0.01, 0.3);
  // Eave fascia — dark board where the roof ends, overhanging the walls
  pushBox(parts, MATERIALS.leather([roofCol[0] * 0.55, roofCol[1] * 0.55, roofCol[2] * 0.55] as RGB),
    cx + s * 0.016, h * 0.435, s * 0.515, h * 0.018, s * 0.008, 0.12);
  // Cast shadow from the overhang onto the wall
  pushBox(parts, MATERIALS.leather([wallCol[0] * 0.5, wallCol[1] * 0.5, wallCol[2] * 0.48] as RGB),
    cx - s * 0.065, h * 0.468, s * 0.395, h * 0.014, s * 0.006, 0.06);

  // Chimney sitting ON the roof plane (drawn after it), with cap and mouth
  const chimCol: RGB = [88 + rng.jitter(5), 78 + rng.jitter(4), 70 + rng.jitter(4)];
  pushBox(parts, textured(MATERIALS.bone(chimCol), { kind: 'grain', amount: 0.05 }),
    cx + s * 0.27, h * 0.115, s * 0.045, h * 0.075, s * 0.006, 0.25);
  pushBox(parts, MATERIALS.bone([chimCol[0] + 15, chimCol[1] + 12, chimCol[2] + 10] as RGB),
    cx + s * 0.27, h * 0.048, s * 0.055, h * 0.014, s * 0.006, 0.3);
  pushEllipse(parts, MATERIALS.bone([30, 27, 24]), cx + s * 0.27, h * 0.036, s * 0.032, h * 0.006, 0.1);
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
  pushEllipse(parts, MATERIALS.bone([35, 37, 28]), s * 0.5, s * 0.82, s * 0.46, s * 0.04, 0.05);
  // Fence posts and rails — 3/4 view shows front face
  const woodCol: RGB = [105 + rng.jitter(10), 78 + rng.jitter(8), 52 + rng.jitter(6)];
  const wood = textured(MATERIALS.leather(woodCol), { kind: 'grain', amount: 0.06, sx: 1, sy: 4 });
  const woodDark = textured(MATERIALS.leather([woodCol[0] * 0.75, woodCol[1] * 0.75, woodCol[2] * 0.7] as RGB), { kind: 'grain', amount: 0.06, sx: 4, sy: 1 });
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
  bareProps = !!config.bare;
  switch (config.kind ?? 'stone_floor') {
    case 'dirt_floor':    return buildDirtFloor(rng, s, config.edges);
    case 'grass_floor':   return buildGrassFloor(rng, s);
    case 'wood_floor':    return buildWoodFloor(rng, s);
    case 'wood_wall':     return buildWoodWall(rng, s, th);
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
    case 'water':            return buildWater(rng, s, config.edges);
    case 'bush':             return buildBush(rng, s);
    case 'flowers':          return buildFlowers(rng, s);
    case 'rock':             return buildRock(rng, s);
    case 'lantern':          return buildLantern(rng, s, h);
    case 'crate':            return buildCrate(rng, s);
    case 'banner':           return buildBanner(rng, s, h);
    case 'statue':           return buildStatue(rng, s, h);
    case 'shelf':            return buildShelf(rng, s, h);
    case 'cauldron':         return buildCauldron(rng, s);
    case 'chest':            return buildChestProp(rng, s);
    case 'well':             return buildWell(rng, s, h);
    case 'bench':            return buildBench(rng, s);
    case 'planter':          return buildPlanter(rng, s);
    case 'firewood':         return buildFirewood(rng, s);
    case 'signpost':         return buildSignpost(rng, s, h);
    case 'bucket':           return buildBucket(rng, s);
    case 'gravestone':       return buildGravestoneProp(rng, s);
    case 'interior_wall':    return buildInteriorWall(rng, s, th);
    case 'rug':              return buildRug(rng, s, th);
    case 'pebbles':          return buildPebbles(rng, s);
    case 'root':             return buildRoot(rng, s);
    case 'grass_dirt_mix':   return buildGrassDirtMix(rng, s);
    case 'stone_floor':
    default:                 return buildStoneFloor(rng, s, config.edges);
  }
}

export const TILE_KINDS: TileKind[] = ['stone_floor', 'dirt_floor', 'grass_floor', 'wood_floor', 'wood_wall', 'stone_wall', 'crystal_floor', 'wood_door', 'lava_floor', 'ice_floor', 'moss_floor', 'spike_trap', 'stairs_down', 'stairs_up', 'cracked_wall', 'pit', 'water_pool', 'underground_river', 'stalagmite', 'cobweb', 'barrel', 'chain', 'bone_pile', 'shop_counter', 'iron_gate', 'torch_bracket', 'altar', 'anvil', 'bed', 'table', 'bookshelf', 'pillar', 'fountain', 'tree', 'pine_tree', 'dead_tree', 'house', 'ruins', 'fence', 'water', 'bush', 'flowers', 'rock',
  'lantern', 'crate', 'banner', 'statue', 'shelf', 'cauldron', 'chest', 'well', 'bench', 'planter', 'firewood', 'signpost', 'bucket', 'gravestone', 'pebbles', 'root',
  'interior_wall', 'rug', 'grass_dirt_mix'];
