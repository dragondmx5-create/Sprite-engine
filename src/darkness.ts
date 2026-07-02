// =============================================================================
// darkness.ts — lighting / fog-of-war system for UNDRAL.
//
// "نور تموم میشه — تاریکی مطلق = مرگ"
//
// Renders a darkness overlay buffer that the game composites on top of the
// scene. Pixels outside the light radius are fully black; the edge is a smooth
// gradient. Multiple light sources (player torch, dropped torches, lava tiles)
// can punch holes in the darkness.
//
// All output is a SpriteBuffer (RGBA) so the game composites it exactly like
// any other sprite layer — no special canvas blending required.
// =============================================================================

import type { SpriteBuffer, RGB } from './types';
import { clamp255 } from './color';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  /** 0..1, how bright at center. Default 1. */
  intensity?: number;
  /** Optional tint (warm torch, blue crystal, red lava). Default warm white. */
  color?: RGB;
}

/**
 * Generate a darkness overlay for a viewport of the given size.
 * The overlay is black with alpha; transparent where lit, opaque where dark.
 * The game draws this OVER the scene with normal alpha compositing.
 *
 * @param width   Viewport width in pixels.
 * @param height  Viewport height in pixels.
 * @param lights  Array of light sources in viewport coordinates.
 * @param ambientLight  0..1, base visibility everywhere (0 = pitch black, 0.05 = faint).
 */
export function generateDarknessOverlay(
  width: number,
  height: number,
  lights: LightSource[],
  ambientLight = 0,
): SpriteBuffer {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let illumination = ambientLight;

      for (const light of lights) {
        const dx = x + 0.5 - light.x;
        const dy = y + 0.5 - light.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = light.radius;
        const intensity = light.intensity ?? 1;

        if (dist < r) {
          const t = dist / r;
          const falloff = 1 - t * t;
          illumination = Math.max(illumination, falloff * intensity);
        }
      }

      illumination = Math.min(1, illumination);
      const darkness = 1 - illumination;

      const i = (y * width + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = clamp255(darkness * 255);
    }
  }

  return { width, height, data };
}

/**
 * Generate a colored light glow buffer (additive layer).
 * Used for torch flicker, lava glow, crystal shimmer — drawn UNDER the
 * darkness overlay so it tints the scene within the lit area. `strength`
 * scales how strong the tint reads (default 0.3, same as before this param
 * existed); pass something gentler (~0.12-0.18) to blit a light source's
 * glow onto a full-daylight scene without a darkness overlay at all — e.g.
 * a lit lantern warming the grass around it at dusk.
 */
export function generateLightGlow(
  width: number,
  height: number,
  lights: LightSource[],
  strength = 0.3,
): SpriteBuffer {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (const light of lights) {
        const color = light.color ?? [255, 220, 160];
        const dx = x + 0.5 - light.x;
        const dy = y + 0.5 - light.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = light.radius;
        const intensity = light.intensity ?? 1;

        if (dist < radius) {
          const t = dist / radius;
          const falloff = (1 - t * t) * intensity * strength;
          r += color[0] * falloff;
          g += color[1] * falloff;
          b += color[2] * falloff;
          a = Math.max(a, falloff * 255);
        }
      }

      const i = (y * width + x) * 4;
      data[i] = clamp255(r);
      data[i + 1] = clamp255(g);
      data[i + 2] = clamp255(b);
      data[i + 3] = clamp255(a);
    }
  }

  return { width, height, data };
}

/**
 * Check if a point is in total darkness (no light reaches it).
 * Used by the game to trigger "darkness = death" mechanic.
 */
export function isInDarkness(
  x: number, y: number,
  lights: LightSource[],
  ambientLight = 0,
  threshold = 0.02,
): boolean {
  let illumination = ambientLight;
  for (const light of lights) {
    const dx = x - light.x;
    const dy = y - light.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = light.radius;
    if (dist < r) {
      const t = dist / r;
      illumination = Math.max(illumination, (1 - t * t) * (light.intensity ?? 1));
    }
    if (illumination >= threshold) return false;
  }
  return illumination < threshold;
}

/**
 * Torch flicker: returns a radius multiplier that wobbles over time.
 * Pure function of phase — deterministic, no boiling.
 */
export function torchFlicker(phase: number, seed = 0): number {
  const p1 = Math.sin(phase * Math.PI * 2 * 3.7 + seed) * 0.04;
  const p2 = Math.sin(phase * Math.PI * 2 * 7.1 + seed * 1.3) * 0.02;
  const p3 = Math.sin(phase * Math.PI * 2 * 1.3 + seed * 0.7) * 0.06;
  return 1 + p1 + p2 + p3;
}

export interface LanternLightOptions {
  /** Base radius before flicker. Lanterns are a small, local pool of light — default 46. */
  radius?: number;
  /** 0..1 brightness at center. Default 0.85 (a touch softer than a full torch). */
  intensity?: number;
  /** Warm tint. Default a soft orange candle-glow, matching tiles.ts's `lantern` prop glass. */
  color?: RGB;
  /** 0..1 animation phase — when given, radius wobbles via `torchFlicker` (deterministic, no boiling). Omit for a static light. */
  phase?: number;
  /** Per-lantern flicker variance so identical lanterns don't flicker in lockstep. */
  seed?: number;
}

/**
 * Build a warm, small-radius `LightSource` for a lit lantern prop at (x, y).
 * One call covers both night-time darkness holes (`generateDarknessOverlay`)
 * and a soft daytime/dusk tint (`generateLightGlow` with a low `strength`) —
 * the same light source feeds either, or both.
 */
export function lanternLight(x: number, y: number, opts: LanternLightOptions = {}): LightSource {
  const radius = opts.radius ?? 46;
  const flicker = opts.phase !== undefined ? torchFlicker(opts.phase, opts.seed ?? 0) : 1;
  return {
    x, y,
    radius: radius * flicker,
    intensity: opts.intensity ?? 0.85,
    color: opts.color ?? [255, 176, 86],
  };
}
