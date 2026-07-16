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
import { circle, capsule, ellipse } from './shapes';
import { MATERIALS } from './materials';
import { resolveRenderOpts, renderParts } from './engine';
import { clamp255 } from './color';
import { wave } from './anim/spring';

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
// Phase-driven effect BUILDERS — return Part[] for use in animation loops.
// Same contract as creatures/items: pure function of (config, s, phase, amp).
// =============================================================================

export type EffectKind = 'slash' | 'impact' | 'sparkle' | 'fireball' | 'magic_bolt' | 'water_ripple' | 'smoke' | 'drip';

export interface EffectConfig {
  kind?: EffectKind;
  size?: number;
  color?: RGB;
  supersample?: number;
}

/** Build slash arc parts — arc sweeps in over phase. */
export function buildSlashEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.glass(color);
  const core = MATERIALS.ember([255, 255, 240]);
  const cx = s * 0.45, cy = s * 0.5;
  const r = s * 0.35;
  const segs = 5;
  const a0 = -Math.PI * 0.65, a1 = Math.PI * 0.25;
  const visibleSegs = Math.ceil(segs * phase * amp + (1 - amp) * segs);
  for (let i = 0; i < visibleSegs && i < segs; i++) {
    const t0 = a0 + (a1 - a0) * (i / segs);
    const t1 = a0 + (a1 - a0) * ((i + 1) / segs);
    const ax = cx + Math.cos(t0) * r, ay = cy + Math.sin(t0) * r;
    const bx = cx + Math.cos(t1) * r, by = cy + Math.sin(t1) * r;
    const fade = 1 - i / segs * 0.3;
    const w = s * 0.03 * fade;
    parts.push({
      material: mat, roundness: 0.9, sdf: capsule(ax, ay, bx, by, w),
      bbox: [Math.floor(Math.min(ax, bx) - w - 2), Math.floor(Math.min(ay, by) - w - 2),
             Math.ceil(Math.max(ax, bx) + w + 2), Math.ceil(Math.max(ay, by) + w + 2)],
    });
    const wc = s * 0.014 * fade;
    parts.push({
      material: core, roundness: 0.9, sdf: capsule(ax, ay, bx, by, wc),
      bbox: [Math.floor(Math.min(ax, bx) - wc - 2), Math.floor(Math.min(ay, by) - wc - 2),
             Math.ceil(Math.max(ax, bx) + wc + 2), Math.ceil(Math.max(ay, by) + wc + 2)],
    });
  }
  return parts;
}

/** Build impact burst parts — rays expand outward over phase. */
export function buildImpactEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.ember(color);
  const cx = s * 0.5, cy = s * 0.5;
  const rays = 6;
  const expand = (0.3 + 0.7 * phase) * amp + (1 - amp);
  const fade = 1 - phase * 0.6;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.2;
    const len = s * (0.24 + (i % 2) * 0.1) * expand;
    const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
    const r = Math.max(1, s * 0.022 * fade);
    parts.push({
      material: mat, roundness: 0.8, sdf: capsule(cx, cy, bx, by, r),
      bbox: [Math.floor(Math.min(cx, bx) - r - 2), Math.floor(Math.min(cy, by) - r - 2),
             Math.ceil(Math.max(cx, bx) + r + 2), Math.ceil(Math.max(cy, by) + r + 2)],
    });
  }
  const cr = Math.max(1, s * 0.055 * fade);
  parts.push({
    material: MATERIALS.ember([255, 255, 230]), roundness: 1.0, sdf: circle(cx, cy, cr),
    bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)],
  });
  return parts;
}

/** Build sparkle parts — arms rotate and size pulses. */
export function buildSparkleEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.ember(color);
  const cx = s * 0.5, cy = s * 0.5;
  const rot = phase * Math.PI * 0.5 * amp;
  const pulse = 1 + 0.2 * wave(phase, 2) * amp;
  const r = Math.max(1, s * 0.025 * pulse);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + Math.PI / 8 + rot;
    const len = s * (i % 2 === 0 ? 0.3 : 0.18) * pulse;
    const ax = cx + Math.cos(a) * len, ay = cy + Math.sin(a) * len;
    const bx = cx - Math.cos(a) * len, by = cy - Math.sin(a) * len;
    parts.push({ material: mat, roundness: 0.8, sdf: capsule(ax, ay, bx, by, r),
      bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2),
             Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)] });
  }
  const cr = Math.max(1, s * 0.045 * pulse);
  parts.push({ material: MATERIALS.ember([255, 255, 255]), roundness: 1.0, sdf: circle(cx, cy, cr),
    bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)] });
  return parts;
}

/** Build fireball parts — pulsing glow, flickering corona. */
export function buildFireballEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.5;
  const breathe = 1 + wave(phase, 3) * 0.12 * amp;
  const flick = wave(phase, 5) * s * 0.015 * amp;
  const r = s * 0.14 * breathe, ri = s * 0.07 * breathe;
  parts.push({ material: MATERIALS.ember(color), roundness: 1.0, sdf: circle(cx + flick, cy, r),
    bbox: [Math.floor(cx + flick - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + flick + r + 2), Math.ceil(cy + r + 2)] });
  parts.push({ material: MATERIALS.ember([255, 240, 180]), roundness: 1.0, sdf: circle(cx + flick * 0.3, cy, ri),
    bbox: [Math.floor(cx + flick * 0.3 - ri - 2), Math.floor(cy - ri - 2), Math.ceil(cx + flick * 0.3 + ri + 2), Math.ceil(cy + ri + 2)] });
  // corona wisps
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + phase * Math.PI * 2;
    const wr = s * 0.04;
    const wx = cx + Math.cos(a) * r * 0.85, wy = cy + Math.sin(a) * r * 0.85;
    parts.push({ material: MATERIALS.ember([255, 200, 80]), roundness: 1.0, sdf: circle(wx, wy, Math.max(1, wr)),
      bbox: [Math.floor(wx - wr - 2), Math.floor(wy - wr - 2), Math.ceil(wx + wr + 2), Math.ceil(wy + wr + 2)] });
  }
  return parts;
}

/** Build magic bolt parts — energy crackle, pulsing core. */
export function buildMagicBoltEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.5;
  const pulse = 1 + wave(phase, 2) * 0.15 * amp;
  const ro = Math.max(1.5, s * 0.05 * pulse), ri = Math.max(1, s * 0.025 * pulse);
  parts.push({ material: MATERIALS.ember(color), roundness: 0.8, sdf: capsule(cx - s * 0.2, cy, cx + s * 0.2, cy, ro),
    bbox: [Math.floor(cx - s * 0.24), Math.floor(cy - ro - 2), Math.ceil(cx + s * 0.24), Math.ceil(cy + ro + 2)] });
  parts.push({ material: MATERIALS.ember([200, 180, 255]), roundness: 0.8, sdf: capsule(cx - s * 0.1, cy, cx + s * 0.1, cy, ri),
    bbox: [Math.floor(cx - s * 0.12), Math.floor(cy - ri - 2), Math.ceil(cx + s * 0.12), Math.ceil(cy + ri + 2)] });
  // crackle arcs around the bolt
  for (let i = 0; i < 2; i++) {
    const offset = wave(phase, 3, i * 0.5) * s * 0.06 * amp;
    const cr = Math.max(1, s * 0.015);
    const ex = cx + (i === 0 ? -s * 0.12 : s * 0.12);
    parts.push({ material: MATERIALS.ember([230, 220, 255]), roundness: 0.9, sdf: capsule(ex, cy + offset, ex + s * 0.06, cy - offset, cr),
      bbox: [Math.floor(ex - cr - 2), Math.floor(cy - Math.abs(offset) - cr - 2),
             Math.ceil(ex + s * 0.06 + cr + 2), Math.ceil(cy + Math.abs(offset) + cr + 2)] });
  }
  return parts;
}

/** Build water ripple parts — expanding concentric rings from center. */
export function buildWaterRippleEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.glass([150, 200, 220]);
  const cx = s * 0.5, cy = s * 0.5;
  const maxR = s * 0.4;
  for (let i = 0; i < 3; i++) {
    const ringPhase = ((phase * amp + i * 0.33) % 1);
    const radius = ringPhase * maxR;
    const thickness = Math.max(1, s * 0.02 * (1 - ringPhase));
    if (radius < 1) continue;
    // Draw ring as 8 capsule segments tracing a circle
    const segs = 8;
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2;
      const a1 = ((j + 1) / segs) * Math.PI * 2;
      const ax = cx + Math.cos(a0) * radius, ay = cy + Math.sin(a0) * radius;
      const bx = cx + Math.cos(a1) * radius, by = cy + Math.sin(a1) * radius;
      parts.push({
        material: mat, roundness: 0.9, sdf: capsule(ax, ay, bx, by, thickness),
        bbox: [Math.floor(Math.min(ax, bx) - thickness - 2), Math.floor(Math.min(ay, by) - thickness - 2),
               Math.ceil(Math.max(ax, bx) + thickness + 2), Math.ceil(Math.max(ay, by) + thickness + 2)],
      });
    }
  }
  return parts;
}

/** Build smoke parts — rising gray puff cloud. */
export function buildSmokeEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.bone([120, 115, 110]);
  const cx = s * 0.5, baseY = s * 0.7;
  const rise = phase * amp * s * 0.4;
  const expand = 1 + phase * amp * 0.8;
  for (let i = 0; i < 4; i++) {
    const spread = (i - 1.5) * s * 0.06 * expand;
    const puffCy = baseY - rise - i * s * 0.04;
    const r = Math.max(1.2, s * (0.04 + i * 0.015) * expand);
    parts.push({
      material: mat, roundness: 0.8, sdf: circle(cx + spread, puffCy, r),
      bbox: [Math.floor(cx + spread - r - 2), Math.floor(puffCy - r - 2),
             Math.ceil(cx + spread + r + 2), Math.ceil(puffCy + r + 2)],
    });
  }
  return parts;
}

/** Build drip parts — a water droplet falling with splash at bottom. */
export function buildDripEffect(s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const mat = MATERIALS.glass([140, 180, 210]);
  const cx = s * 0.5;
  const topY = s * 0.15;
  const botY = s * 0.8;
  const dropY = topY + (botY - topY) * phase * amp;
  const rx = Math.max(1.2, s * 0.025);
  const ry = Math.max(1.5, s * 0.04);
  // Falling droplet
  if (phase * amp < 0.85) {
    parts.push({
      material: mat, roundness: 0.9, sdf: ellipse(cx, dropY, rx, ry),
      bbox: [Math.floor(cx - rx - 2), Math.floor(dropY - ry - 2),
             Math.ceil(cx + rx + 2), Math.ceil(dropY + ry + 2)],
    });
  }
  // Splash circles at bottom of fall
  if (phase * amp > 0.8) {
    const splashPhase = (phase * amp - 0.8) / 0.2; // 0..1 within splash
    for (let i = -1; i <= 1; i++) {
      const sr = Math.max(1, s * 0.015 * (1 - splashPhase * 0.5));
      const sx = cx + i * s * 0.05 * splashPhase;
      const sy = botY - s * 0.02 * splashPhase;
      parts.push({
        material: mat, roundness: 0.9, sdf: circle(sx, sy, sr),
        bbox: [Math.floor(sx - sr - 2), Math.floor(sy - sr - 2),
               Math.ceil(sx + sr + 2), Math.ceil(sy + sr + 2)],
      });
    }
  }
  return parts;
}

/** Build effect parts by kind. */
export function buildEffect(kind: EffectKind, s: number, color: RGB, phase: number, amp: number): Part[] {
  switch (kind) {
    case 'slash':        return buildSlashEffect(s, color, phase, amp);
    case 'impact':       return buildImpactEffect(s, color, phase, amp);
    case 'sparkle':      return buildSparkleEffect(s, color, phase, amp);
    case 'fireball':     return buildFireballEffect(s, color, phase, amp);
    case 'magic_bolt':   return buildMagicBoltEffect(s, color, phase, amp);
    case 'water_ripple': return buildWaterRippleEffect(s, color, phase, amp);
    case 'smoke':        return buildSmokeEffect(s, color, phase, amp);
    case 'drip':         return buildDripEffect(s, color, phase, amp);
  }
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
