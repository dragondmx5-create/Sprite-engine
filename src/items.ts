// =============================================================================
// items.ts — procedural LOOT builders for UNDRAL.
//
// Same contract as skeleton.ts / creatures.ts: build an ordered `Part[]` and
// let the shared `renderParts` pass light it. Three kinds matching the sim's
// ITEM_TEMPLATES:
//   • mushroom (قارچ)            — common; edible, restores food
//   • crystal  (کریستال)         — rare; a faceted gem cluster
//   • dagger   (Shadowfang)      — legendary; a dark steel blade
//
// Items are drawn small (≈ one tile), so silhouettes are kept bold and the
// detail count low — they must still read at 16–20 px.
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, circle, ellipse, capsule, roundedBox, rotatedAround, transformedAABB, type SDF } from './shapes';

export type ItemKind = 'mushroom' | 'crystal' | 'dagger';

export interface ItemConfig {
  seed?: number | string;
  kind?: ItemKind;
  /** Override the primary color; otherwise chosen deterministically. */
  color?: RGB;
}

// ---- bbox helpers (mirror creatures.ts) -------------------------------------

function pushEllipse(parts: Part[], mat: Part['material'], cx: number, cy: number, rx: number, ry: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: ellipse(cx, cy, rx, ry),
    bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)],
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
    bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2), Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)],
  });
}
function pushBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: roundedBox(cx, cy, hx, hy, corner),
    bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)],
  });
}
/** A rounded box rotated about its own center — used for crystal shards. */
function pushRotBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, angle: number, roundness: number) {
  const base: SDF = roundedBox(cx, cy, hx, hy, corner);
  const sdf = rotatedAround(base, angle, cx, cy);
  parts.push({
    material: mat, roundness, sdf,
    bbox: transformedAABB(cx - hx, cy - hy, cx + hx, cy + hy, angle, cx, cy, 0, 0),
  });
}

// ---- deterministic default colors -------------------------------------------

function defaultColor(rng: RNG, kind: ItemKind): RGB {
  const j = (c: RGB, amt: number): RGB => [
    c[0] * (1 + rng.jitter(amt)), c[1] * (1 + rng.jitter(amt)), c[2] * (1 + rng.jitter(amt)),
  ];
  switch (kind) {
    case 'mushroom': return j([176, 58, 52], 0.16);  // red cap
    case 'crystal':  return j([96, 178, 214], 0.14);  // cyan gem
    case 'dagger':   return j([122, 132, 150], 0.10);  // cold steel
  }
}

// =============================================================================
// Builders. `s` = working px (size * supersample).
// =============================================================================

/** MUSHROOM — pale stem + domed colored cap with spots. Edible loot. */
function buildMushroom(rng: RNG, s: number, color: RGB): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const stem = MATERIALS.flesh([224, 212, 190]);
  const cap = MATERIALS.flesh(color);
  const spot = MATERIALS.bone([238, 232, 214]);

  // stem
  pushCapsule(parts, stem, cx - s * 0.02, s * 0.78, cx, s * 0.52, s * 0.07, 1.0);
  // cap — a wide dome (a flattened ellipse sitting on the stem top)
  const capCy = s * 0.46, capRx = s * 0.26, capRy = s * 0.18;
  pushEllipse(parts, cap, cx, capCy, capRx, capRy, 1.0);
  // a thin lip under the cap for a little overhang
  pushEllipse(parts, cap, cx, capCy + capRy * 0.55, capRx * 0.92, capRy * 0.4, 1.0);
  // spots — deterministic scatter across the cap
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = rng.range(-1, 1) * 0.9;
    const sx = cx + a * capRx * 0.7;
    const sy = capCy - capRy * 0.2 + rng.jitter(capRy * 0.3);
    pushCircle(parts, spot, sx, sy, s * (0.03 + rng.range(0, 0.015)), 0.8);
  }
  return parts;
}

/** CRYSTAL — a cluster of faceted shards. Bright, base-tinted spec. */
function buildCrystal(rng: RNG, s: number, color: RGB): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, baseY = s * 0.74;
  const gem = MATERIALS.gem(color);
  const gemDim = MATERIALS.gem([color[0] * 0.7, color[1] * 0.72, color[2] * 0.78]);

  // two side shards (behind), then the tall central one (front)
  pushRotBox(parts, gemDim, cx - s * 0.13, baseY - s * 0.12, s * 0.05, s * 0.16, s * 0.02, -0.35 + rng.jitter(0.1), 0.9);
  pushRotBox(parts, gemDim, cx + s * 0.14, baseY - s * 0.10, s * 0.045, s * 0.14, s * 0.02, 0.4 + rng.jitter(0.1), 0.9);
  pushRotBox(parts, gem, cx + s * 0.01, baseY - s * 0.18, s * 0.07, s * 0.24, s * 0.025, rng.jitter(0.12), 0.9);
  // a small bright tip highlight chip on the main shard
  pushCircle(parts, MATERIALS.gem([Math.min(255, color[0] + 60), Math.min(255, color[1] + 60), Math.min(255, color[2] + 60)]),
    cx + s * 0.01, baseY - s * 0.36, s * 0.03, 0.8);
  return parts;
}

/** DAGGER (Shadowfang) — leaf blade, crossguard, wrapped grip, gem pommel. */
function buildDagger(rng: RNG, s: number, color: RGB): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const steel = MATERIALS.metal(color);
  const guard = MATERIALS.metal([150, 120, 70]);   // brass crossguard
  const grip = MATERIALS.leather([70, 50, 44]);
  const pommel = MATERIALS.gem([150, 70, 190]);     // legendary purple stone

  // blade — a thin, pointed vertical leaf (ellipse reads as double-edged steel)
  pushEllipse(parts, steel, cx, s * 0.36, s * 0.055, s * 0.28, 0.7);
  // fuller / center highlight ridge
  pushCapsule(parts, MATERIALS.metal([170, 178, 196]), cx, s * 0.20, cx, s * 0.52, Math.max(1, s * 0.012), 0.6);
  // crossguard
  pushBox(parts, guard, cx, s * 0.66, s * 0.16, s * 0.03, s * 0.015, 0.6);
  // grip
  pushCapsule(parts, grip, cx, s * 0.70, cx, s * 0.84, s * 0.035, 1.0);
  // pommel
  pushCircle(parts, pommel, cx, s * 0.87, s * 0.045, 0.85);
  return parts;
}

/** Build an item's part list. `s` = working px (size * supersample). */
export function buildItem(config: ItemConfig, s: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const kind = config.kind ?? 'mushroom';
  const color = config.color ?? defaultColor(rng, kind);
  switch (kind) {
    case 'crystal': return buildCrystal(rng, s, color);
    case 'dagger':  return buildDagger(rng, s, color);
    case 'mushroom':
    default:        return buildMushroom(rng, s, color);
  }
}

/** Names of the built-in item kinds. */
export const ITEM_KINDS: ItemKind[] = ['mushroom', 'crystal', 'dagger'];
