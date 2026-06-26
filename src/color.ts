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
  // Cool shift nudges shadows toward blue (subtract a little R, add a little B).
  const cool = (c: RGB, amt: number): RGB => [
    c[0] * (1 - 0.18 * amt),
    c[1] * (1 - 0.06 * amt),
    c[2] * (1 + 0.10 * amt),
  ];
  // Warm shift nudges lights toward yellow (add R/G, hold B).
  const warm = (c: RGB, amt: number): RGB => [
    c[0] + (255 - c[0]) * 0.10 * amt,
    c[1] + (255 - c[1]) * 0.07 * amt,
    c[2] + (255 - c[2]) * 0.02 * amt,
  ];
  return {
    core: cool(scale(base, 0.34), coolShift),
    shadow: cool(scale(base, 0.62), coolShift),
    mid: base,
    light: warm(scale(base, 1.12), 1),
    hi: warm(mix(scale(base, 1.18), WHITE, 0.25), 1),
  };
}

/**
 * Sample the ramp at diffuse intensity x in [0,1] (0 = facing away, 1 = facing
 * the light). Piecewise smoothstep gives soft, painterly band transitions.
 */
export function sampleRamp(r: ToneRamp, x: number): RGB {
  if (x < 0.4) return mix(r.core, r.shadow, smoothstep(0.0, 0.4, x));
  if (x < 0.55) return mix(r.shadow, r.mid, smoothstep(0.4, 0.55, x));
  if (x < 0.78) return mix(r.mid, r.light, smoothstep(0.55, 0.78, x));
  return mix(r.light, r.hi, smoothstep(0.78, 1.0, x));
}

/** Posterize a channel to `levels` steps — the "crunchy pixel" option. */
export function quantizeChannel(v: number, levels: number): number {
  if (levels <= 1) return v;
  const step = 255 / (levels - 1);
  return Math.round(v / step) * step;
}
