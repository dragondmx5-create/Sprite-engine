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

export interface VFXConfig {
  size?: number;
  color?: RGB;
  seed?: number | string;
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
