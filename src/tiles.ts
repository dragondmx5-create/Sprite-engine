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

export type TileKind = 'stone_floor' | 'dirt_floor' | 'stone_wall' | 'crystal_floor' | 'wood_door';

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

// ---- public API -------------------------------------------------------------

export function buildTile(config: TileConfig, s: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  switch (config.kind ?? 'stone_floor') {
    case 'dirt_floor':    return buildDirtFloor(rng, s);
    case 'stone_wall':    return buildStoneWall(rng, s);
    case 'crystal_floor': return buildCrystalFloor(rng, s);
    case 'wood_door':     return buildWoodDoor(rng, s);
    case 'stone_floor':
    default:              return buildStoneFloor(rng, s);
  }
}

export const TILE_KINDS: TileKind[] = ['stone_floor', 'dirt_floor', 'stone_wall', 'crystal_floor', 'wood_door'];
