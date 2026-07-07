// =============================================================================
// noise.ts — deterministic smooth value noise for organic surface relief.
//
// engine.ts's existing per-pixel texture stack (grain/speckle) only dithers
// *color* after shading — the lighting itself stays perfectly smooth no
// matter how much grain is painted on top, which is why surfaces read flat
// even with heavy texture. This module is the noise source for the 'bump'
// texture kind, which perturbs the shading NORMAL instead, so light and
// shadow actually roll across the relief (turf fuzz, rough stone, cloth
// creases) rather than just tinting a flat-lit pixel.
//
// Position-hash based (same family as engine.ts's hash2) but bilinearly
// interpolated with smoothstep easing, so it reads as soft, continuous
// undulation instead of the blocky per-cell dithering of raw hashed noise.
// =============================================================================

function hash(x: number, y: number, salt: number): number {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Smooth 2D value noise in [0,1), continuous — no lattice-cell edges. */
export function valueNoise2D(x: number, y: number, salt = 0): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smoothstep(x - x0), fy = smoothstep(y - y0);
  const a = hash(x0, y0, salt), b = hash(x0 + 1, y0, salt);
  const c = hash(x0, y0 + 1, salt), d = hash(x0 + 1, y0 + 1, salt);
  const top = a + (b - a) * fx;
  const bot = c + (d - c) * fx;
  return top + (bot - top) * fy;
}

/**
 * Fractal sum of `valueNoise2D` octaves — richer and less repetitive than a
 * single layer (breaks up the "every tile looks the same" uniformity of a
 * single-frequency pattern). Returns [0,1).
 */
export function fbm2D(x: number, y: number, octaves = 3, salt = 0): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * freq, y * freq, salt + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.15;
  }
  return sum / norm;
}
