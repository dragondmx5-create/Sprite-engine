// =============================================================================
// effects.ts — visual effects for combat and status feedback.
//
// Two categories:
//   • SDF-based (rendered through the same pipeline as sprites): slash arcs,
//     impact bursts, drop shadows
//   • Post-processing (pixel ops on existing SpriteBuffers): flash, tint,
//     status overlays (poison/frozen/burning)
//
// All output SpriteBuffers — the game composites them the same way as sprites.
// =============================================================================

import type { RGB, SpriteBuffer } from './types';
import type { Part } from './shapes';
import { circle, capsule } from './shapes';
import { MATERIALS } from './materials';
import { resolveRenderOpts, renderParts } from './engine';
import { clamp255 } from './color';

export type StatusEffect = 'poison' | 'frozen' | 'burning';
export type ProjectileKind = 'arrow' | 'fireball' | 'magic_bolt';

export interface VFXConfig {
  size?: number;
  color?: RGB;
  seed?: number | string;
  supersample?: number;
}

export interface ProjectileConfig {
  kind?: ProjectileKind;
  size?: number;
  color?: RGB;
  supersample?: number;
}

// =============================================================================
// Drop Shadow — a soft dark ellipse drawn beneath the character's feet.
// Generated separately so the game can position it at the correct layer.
// =============================================================================

export function generateShadow(size: number, opacity = 0.4): SpriteBuffer {
  const w = size;
  const h = Math.max(1, Math.ceil(size * 0.3));
  const data = new Uint8ClampedArray(w * h * 4);
  const cx = w * 0.5, cy = h * 0.5;
  const rx = w * 0.42, ry = h * 0.42;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d < 1.0) {
        const i = (y * w + x) * 4;
        data[i + 3] = clamp255((1 - d) * opacity * 255);
      }
    }
  }
  return { width: w, height: h, data };
}

// =============================================================================
// Slash Effect — a glowing crescent arc overlaid on the target during attack.
// Built from capsule segments tracing an arc, lit with glass + ember materials.
// =============================================================================

export function generateSlashEffect(config: VFXConfig = {}): SpriteBuffer {
  const size = config.size ?? 32;
  const color: RGB = config.color ?? [255, 240, 200];
  const ss = config.supersample ?? 2;
  const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];
  const mat = MATERIALS.glass(color);
  const core = MATERIALS.ember([255, 255, 240]);

  const cx = s * 0.45, cy = s * 0.5;
  const r = s * 0.35;
  const segs = 5;
  const a0 = -Math.PI * 0.65, a1 = Math.PI * 0.25;
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + (a1 - a0) * (i / segs);
    const t1 = a0 + (a1 - a0) * ((i + 1) / segs);
    const ax = cx + Math.cos(t0) * r, ay = cy + Math.sin(t0) * r;
    const bx = cx + Math.cos(t1) * r, by = cy + Math.sin(t1) * r;
    const w = s * 0.03;
    parts.push({
      material: mat, roundness: 0.9, sdf: capsule(ax, ay, bx, by, w),
      bbox: [Math.floor(Math.min(ax, bx) - w - 2), Math.floor(Math.min(ay, by) - w - 2),
             Math.ceil(Math.max(ax, bx) + w + 2), Math.ceil(Math.max(ay, by) + w + 2)],
    });
    const wc = s * 0.014;
    parts.push({
      material: core, roundness: 0.9, sdf: capsule(ax, ay, bx, by, wc),
      bbox: [Math.floor(Math.min(ax, bx) - wc - 2), Math.floor(Math.min(ay, by) - wc - 2),
             Math.ceil(Math.max(ax, bx) + wc + 2), Math.ceil(Math.max(ay, by) + wc + 2)],
    });
  }
  return renderParts(parts, opts);
}

// =============================================================================
// Impact Burst — a starburst of rays radiating from center. Damage feedback.
// =============================================================================

export function generateImpactEffect(config: VFXConfig = {}): SpriteBuffer {
  const size = config.size ?? 24;
  const color: RGB = config.color ?? [255, 220, 100];
  const ss = config.supersample ?? 2;
  const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];
  const mat = MATERIALS.ember(color);
  const cx = s * 0.5, cy = s * 0.5;
  const rays = 6;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.2;
    const len = s * (0.24 + (i % 2) * 0.1);
    const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
    const r = s * 0.022;
    parts.push({
      material: mat, roundness: 0.8, sdf: capsule(cx, cy, bx, by, r),
      bbox: [Math.floor(Math.min(cx, bx) - r - 2), Math.floor(Math.min(cy, by) - r - 2),
             Math.ceil(Math.max(cx, bx) + r + 2), Math.ceil(Math.max(cy, by) + r + 2)],
    });
  }
  const cr = s * 0.055;
  parts.push({
    material: MATERIALS.ember([255, 255, 230]), roundness: 1.0, sdf: circle(cx, cy, cr),
    bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)],
  });
  return renderParts(parts, opts);
}

// =============================================================================
// Projectiles — ranged combat sprites (arrow, fireball, magic bolt).
// =============================================================================

export function generateProjectile(config: ProjectileConfig = {}): SpriteBuffer {
  const kind = config.kind ?? 'arrow';
  const size = config.size ?? 16;
  const ss = config.supersample ?? 2;
  const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.5;

  switch (kind) {
    case 'arrow': {
      const color: RGB = config.color ?? [180, 160, 130];
      const shaft = MATERIALS.leather(color);
      const head = MATERIALS.metal([160, 165, 175]);
      const fletch = MATERIALS.cloth([180, 60, 50]);
      const r1 = Math.max(1.2, s * 0.025), r2 = Math.max(1.5, s * 0.04), rf = Math.max(1, s * 0.018);
      parts.push({ material: shaft, roundness: 0.7, sdf: capsule(cx - s * 0.28, cy, cx + s * 0.18, cy, r1),
        bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - r1 - 2), Math.ceil(cx + s * 0.2), Math.ceil(cy + r1 + 2)] });
      parts.push({ material: head, roundness: 0.5, sdf: capsule(cx + s * 0.18, cy, cx + s * 0.34, cy, r2),
        bbox: [Math.floor(cx + s * 0.15), Math.floor(cy - r2 - 2), Math.ceil(cx + s * 0.37), Math.ceil(cy + r2 + 2)] });
      parts.push({ material: fletch, roundness: 0.4, sdf: capsule(cx - s * 0.28, cy - s * 0.04, cx - s * 0.18, cy, rf),
        bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - s * 0.06), Math.ceil(cx - s * 0.16), Math.ceil(cy + rf + 2)] });
      parts.push({ material: fletch, roundness: 0.4, sdf: capsule(cx - s * 0.28, cy + s * 0.04, cx - s * 0.18, cy, rf),
        bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - rf - 2), Math.ceil(cx - s * 0.16), Math.ceil(cy + s * 0.06)] });
      break;
    }
    case 'fireball': {
      const color: RGB = config.color ?? [255, 140, 40];
      const r = s * 0.14, ri = s * 0.07;
      parts.push({ material: MATERIALS.ember(color), roundness: 1.0, sdf: circle(cx, cy, r),
        bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)] });
      parts.push({ material: MATERIALS.ember([255, 240, 180]), roundness: 1.0, sdf: circle(cx, cy, ri),
        bbox: [Math.floor(cx - ri - 2), Math.floor(cy - ri - 2), Math.ceil(cx + ri + 2), Math.ceil(cy + ri + 2)] });
      break;
    }
    case 'magic_bolt': {
      const color: RGB = config.color ?? [120, 80, 255];
      const ro = Math.max(1.5, s * 0.05), ri = Math.max(1, s * 0.025);
      parts.push({ material: MATERIALS.ember(color), roundness: 0.8, sdf: capsule(cx - s * 0.2, cy, cx + s * 0.2, cy, ro),
        bbox: [Math.floor(cx - s * 0.24), Math.floor(cy - ro - 2), Math.ceil(cx + s * 0.24), Math.ceil(cy + ro + 2)] });
      parts.push({ material: MATERIALS.ember([200, 180, 255]), roundness: 0.8, sdf: capsule(cx - s * 0.1, cy, cx + s * 0.1, cy, ri),
        bbox: [Math.floor(cx - s * 0.12), Math.floor(cy - ri - 2), Math.ceil(cx + s * 0.12), Math.ceil(cy + ri + 2)] });
      break;
    }
  }
  return renderParts(parts, opts);
}

// =============================================================================
// Sparkle — a 4-pointed star for loot pickup / level-up feedback.
// =============================================================================

export function generateSparkle(config: VFXConfig = {}): SpriteBuffer {
  const size = config.size ?? 16;
  const color: RGB = config.color ?? [255, 255, 200];
  const ss = config.supersample ?? 2;
  const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];
  const mat = MATERIALS.ember(color);
  const cx = s * 0.5, cy = s * 0.5;
  const r = s * 0.025;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + Math.PI / 8;
    const len = s * (i % 2 === 0 ? 0.3 : 0.18);
    const ax = cx + Math.cos(a) * len, ay = cy + Math.sin(a) * len;
    const bx = cx - Math.cos(a) * len, by = cy - Math.sin(a) * len;
    parts.push({ material: mat, roundness: 0.8, sdf: capsule(ax, ay, bx, by, r),
      bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2),
             Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)] });
  }
  const cr = s * 0.045;
  parts.push({ material: MATERIALS.ember([255, 255, 255]), roundness: 1.0, sdf: circle(cx, cy, cr),
    bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)] });
  return renderParts(parts, opts);
}

// =============================================================================
// Post-processing effects — operate on existing SpriteBuffers.
// =============================================================================

/** Flash all opaque pixels to white (one-frame hit feedback). */
export function flashSprite(sprite: SpriteBuffer): SpriteBuffer {
  const data = new Uint8ClampedArray(sprite.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 8) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  }
  return { width: sprite.width, height: sprite.height, data };
}

/** Tint all opaque pixels toward a color (0 = original, 1 = fully tinted). */
export function tintSprite(sprite: SpriteBuffer, color: RGB, amount: number): SpriteBuffer {
  const data = new Uint8ClampedArray(sprite.data);
  const inv = 1 - amount;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 8) {
      data[i]     = clamp255(data[i] * inv + color[0] * amount);
      data[i + 1] = clamp255(data[i + 1] * inv + color[1] * amount);
      data[i + 2] = clamp255(data[i + 2] * inv + color[2] * amount);
    }
  }
  return { width: sprite.width, height: sprite.height, data };
}

/**
 * Apply a status-effect overlay. `phase` (0..1) drives pulsing effects
 * (poison, burning); frozen is static.
 */
export function applyStatusEffect(sprite: SpriteBuffer, effect: StatusEffect, phase = 0): SpriteBuffer {
  switch (effect) {
    case 'poison':  return tintSprite(sprite, [50, 210, 70],   0.22 + 0.10 * Math.sin(phase * Math.PI * 2));
    case 'frozen':  return tintSprite(sprite, [130, 200, 255], 0.35);
    case 'burning': return tintSprite(sprite, [255, 110, 30],  0.18 + 0.14 * Math.sin(phase * Math.PI * 2));
  }
}
