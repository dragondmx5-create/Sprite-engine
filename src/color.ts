// =============================================================================
// color.ts — RGB color math used by the lighting pass.
// Produces smooth multi-tone ramps (highlight → midtone → shadow → core
// shadow) from a single base color, instead of flat fills.
// =============================================================================

import type { RGB } from './types';

export const clamp = (v: number, lo = 0, hi = 1): number =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Linear interpolate two colors. t in [0,1]. */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Scale brightness (multiply all channels). */
export function scale(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Hermite smoothstep, the workhorse for soft falloffs. */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
}

const WHITE: RGB = [255, 255, 255];

/**
 * Build a 5-stop tone ramp from a base color.
 * Shadows are darkened AND shifted cool; lights are lifted AND shifted warm.
 * This warm/cool split is what reads as "painted volume" rather than a plain
 * brightness gradient.
 */
export interface ToneRamp {
  core: RGB;   // deepest shadow
  shadow: RGB;
  mid: RGB;    // == base
  light: RGB;
  hi: RGB;     // brightest diffuse (pre-specular)
}

export function buildRamp(base: RGB, coolShift: number): ToneRamp {
  // Cool shift nudges shadows toward blue — reduced range for less watercolor.
  const cool = (c: RGB, amt: number): RGB => [
    c[0] * (1 - 0.12 * amt),
    c[1] * (1 - 0.04 * amt),
    c[2] * (1 + 0.08 * amt),
  ];
  // Warm shift nudges lights toward yellow (add R/G, hold B).
  const warm = (c: RGB, amt: number): RGB => [
    c[0] + (255 - c[0]) * 0.12 * amt,
    c[1] + (255 - c[1]) * 0.08 * amt,
    c[2] + (255 - c[2]) * 0.02 * amt,
  ];
  return {
    core: cool(scale(base, 0.38), coolShift),
    shadow: cool(scale(base, 0.65), coolShift),
    mid: base,
    light: warm(scale(base, 1.14), 1),
    hi: warm(mix(scale(base, 1.20), WHITE, 0.22), 1),
  };
}

/**
 * Sample the ramp at diffuse intensity x in [0,1] (0 = facing away, 1 = facing
 * the light). Piecewise smoothstep gives soft, painterly band transitions.
 */
export function sampleRamp(r: ToneRamp, x: number): RGB {
  if (x < 0.35) return mix(r.core, r.shadow, smoothstep(0.0, 0.35, x));
  if (x < 0.48) return mix(r.shadow, r.mid, smoothstep(0.35, 0.48, x));
  if (x < 0.74) return mix(r.mid, r.light, smoothstep(0.48, 0.74, x));
  return mix(r.light, r.hi, smoothstep(0.74, 1.0, x));
}

/** Posterize a channel to `levels` steps — the "crunchy pixel" option. */
export function quantizeChannel(v: number, levels: number): number {
  if (levels <= 1) return v;
  const step = 255 / (levels - 1);
  return Math.round(v / step) * step;
}

/**
 * Hue-preserving posterize: quantize the LUMINANCE to `levels` steps and
 * rescale RGB uniformly. Per-channel quantization collapses distinct hues
 * into the same posterized color at coarse levels (e.g. warm dirt browns and
 * olive grass greens both snap to [128,128,64] at 5 levels); scaling all
 * channels by the same factor keeps the hue and only crunches the shading.
 */
export function quantizeColor(data: Uint8ClampedArray, i: number, levels: number): void {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luma <= 0) return;
  const k = quantizeChannel(luma, levels) / luma;
  data[i] = clamp255(r * k);
  data[i + 1] = clamp255(g * k);
  data[i + 2] = clamp255(b * k);
}
