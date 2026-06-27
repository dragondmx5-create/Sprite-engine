// =============================================================================
// loot.ts — death markers, loot bags, gravestones for UNDRAL.
//
// "مرگ واقعی — همه لوت میفته همونجا. باید برگردی بگیریش."
//
// These sprites mark where a player or enemy died and dropped their inventory.
// Built as Part[] through the same pipeline as everything else.
// =============================================================================

import type { RGB, SpriteConfig, SpriteBuffer } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, circle, ellipse, capsule, roundedBox } from './shapes';
import { resolveRenderOpts, renderParts } from './engine';

export type LootMarkerKind = 'loot_bag' | 'skull' | 'gravestone' | 'blood_stain';

export interface LootMarkerConfig {
  seed?: number | string;
  kind?: LootMarkerKind;
  size?: number;
  color?: RGB;
  supersample?: number;
}

// ---- helpers ----------------------------------------------------------------

function pushCircle(parts: Part[], mat: Part['material'], cx: number, cy: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: circle(cx, cy, r),
    bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)],
  });
}
function pushEllipse(parts: Part[], mat: Part['material'], cx: number, cy: number, rx: number, ry: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: ellipse(cx, cy, rx, ry),
    bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)],
  });
}
function pushBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: roundedBox(cx, cy, hx, hy, corner),
    bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)],
  });
}
function pushCapsule(parts: Part[], mat: Part['material'], ax: number, ay: number, bx: number, by: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: capsule(ax, ay, bx, by, r),
    bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2),
           Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)],
  });
}

// ---- builders ---------------------------------------------------------------

function buildLootBag(rng: RNG, s: number, color: RGB): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const sack = MATERIALS.leather(color);
  const tie = MATERIALS.leather([color[0] * 0.6, color[1] * 0.55, color[2] * 0.5]);

  pushEllipse(parts, sack, cx, s * 0.58, s * 0.22, s * 0.18, 0.9);
  pushEllipse(parts, sack, cx, s * 0.42, s * 0.12, s * 0.10, 0.8);
  pushCapsule(parts, tie, cx - s * 0.06, s * 0.38, cx + s * 0.06, s * 0.38, Math.max(1, s * 0.015), 0.5);
  // knot
  pushCircle(parts, tie, cx, s * 0.36, s * 0.025, 0.7);

  return parts;
}

function buildSkull(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const bone = MATERIALS.bone([210, 200, 185]);
  const dark = MATERIALS.bone([40, 35, 30]);

  // cranium
  pushEllipse(parts, bone, cx, s * 0.42, s * 0.18, s * 0.20, 0.9);
  // jaw
  pushEllipse(parts, bone, cx, s * 0.62, s * 0.14, s * 0.08, 0.7);
  // eye sockets
  for (const dir of [-1, 1])
    pushCircle(parts, dark, cx + dir * s * 0.07, s * 0.40, s * 0.04, 0.5);
  // nose
  pushCircle(parts, dark, cx, s * 0.50, s * 0.02, 0.4);
  // teeth
  for (let i = -2; i <= 2; i++) {
    pushBox(parts, bone, cx + i * s * 0.03, s * 0.56, s * 0.012, s * 0.02, s * 0.004, 0.5);
  }

  return parts;
}

function buildGravestone(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const stone = MATERIALS.bone([80, 76, 72]);
  const dark = MATERIALS.bone([50, 46, 42]);

  // stone slab
  pushBox(parts, stone, cx, s * 0.48, s * 0.18, s * 0.28, s * 0.04, 0.35);
  // rounded top
  pushCircle(parts, stone, cx, s * 0.22, s * 0.18, 0.4);
  // ground
  pushBox(parts, MATERIALS.flesh([70, 55, 38]), cx, s * 0.80, s * 0.24, s * 0.06, s * 0.02, 0.2);
  // crack
  pushCapsule(parts, dark, cx + rng.jitter(s * 0.04), s * 0.30, cx + rng.jitter(s * 0.06), s * 0.55,
    Math.max(1, s * 0.008), 0.15);

  return parts;
}

function buildBloodStain(rng: RNG, s: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.55;
  const blood = MATERIALS.flesh([120, 20, 18]);

  pushEllipse(parts, blood, cx, cy, s * 0.20, s * 0.10, 0.15);
  for (let i = 0; i < 3; i++) {
    const px = cx + rng.jitter(s * 0.18);
    const py = cy + rng.jitter(s * 0.08);
    pushCircle(parts, blood, px, py, s * (0.03 + rng.float() * 0.025), 0.1);
  }

  return parts;
}

// ---- public API -------------------------------------------------------------

export function buildLootMarker(config: LootMarkerConfig, s: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const kind = config.kind ?? 'loot_bag';
  switch (kind) {
    case 'skull':       return buildSkull(rng, s);
    case 'gravestone':  return buildGravestone(rng, s);
    case 'blood_stain': return buildBloodStain(rng, s);
    case 'loot_bag':
    default:            return buildLootBag(rng, s, config.color ?? [140, 100, 60]);
  }
}

export function generateLootMarker(config: SpriteConfig & LootMarkerConfig = {}): SpriteBuffer {
  const opts = resolveRenderOpts(config);
  const parts = buildLootMarker(config, opts.W);
  return renderParts(parts, opts);
}

export const LOOT_MARKER_KINDS: LootMarkerKind[] = ['loot_bag', 'skull', 'gravestone', 'blood_stain'];
