// =============================================================================
// lighting.ts — shade one pixel given its fake normal and a material.
// Diffuse uses the painterly tone ramp; specular is Blinn-Phong whose
// tightness comes from material roughness. Metals tint the highlight.
// =============================================================================

import type { Light, Material, RGB, Vec3 } from './types';
import { buildRamp, sampleRamp, clamp, type ToneRamp } from './color';

/** Normalize a Vec3 in place-ish (returns a fresh object). */
export function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1e-6;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// The viewer looks straight at the sprite from +z.
const VIEW: Vec3 = { x: 0, y: 0, z: 1 };

/** Precomputed per-material/-light data so the hot loop stays cheap. */
export interface ShadeContext {
  ramp: ToneRamp;
  L: Vec3;          // normalized light direction (toward light)
  H: Vec3;          // normalized half-vector (L + V)
  ambient: number;
  shininess: number; // Blinn-Phong exponent from roughness
  specStrength: number;
  specColor: RGB;    // white for dielectric, base-tinted for metal
}

export function makeShadeContext(mat: Material, light: Light): ShadeContext {
  const L = normalize(light.dir);
  const H = normalize({ x: L.x + VIEW.x, y: L.y + VIEW.y, z: L.z + VIEW.z });
  // roughness 1 → broad (exp ~8), roughness 0 → tight pinpoint (exp ~140).
  const shininess = 8 + (1 - mat.roughness) * (1 - mat.roughness) * 132;
  const specColor: RGB = mat.metallic
    ? [
        // tint white toward the base color for a metallic highlight
        255 * 0.35 + mat.base[0] * 0.65,
        255 * 0.35 + mat.base[1] * 0.65,
        255 * 0.35 + mat.base[2] * 0.65,
      ]
    : [255, 255, 255];
  return {
    ramp: buildRamp(mat.base, mat.shadowCoolShift),
    L, H, ambient: light.ambient,
    shininess, specStrength: mat.specStrength, specColor,
  };
}

/**
 * Shade a single pixel. `nx,ny,nz` is the fake normal from field.ts.
 * Writes the resulting RGB into `out` (length-3 scratch array).
 */
export function shade(
  ctx: ShadeContext,
  nx: number,
  ny: number,
  nz: number,
  out: RGB,
): void {
  // --- Diffuse (Lambert), wrapped into the painterly ramp ---------------
  const ndotl = nx * ctx.L.x + ny * ctx.L.y + nz * ctx.L.z; // -1..1
  // Lift by ambient and remap to 0..1 so even back-faces keep some core color.
  const x = clamp(ctx.ambient + (1 - ctx.ambient) * (ndotl * 0.5 + 0.5));
  const diff = sampleRamp(ctx.ramp, x);

  // --- Specular (Blinn-Phong) -------------------------------------------
  const ndoth = nx * ctx.H.x + ny * ctx.H.y + nz * ctx.H.z;
  let spec = 0;
  if (ndoth > 0 && ctx.specStrength > 0) {
    spec = Math.pow(ndoth, ctx.shininess) * ctx.specStrength;
  }

  out[0] = diff[0] + ctx.specColor[0] * spec;
  out[1] = diff[1] + ctx.specColor[1] * spec;
  out[2] = diff[2] + ctx.specColor[2] * spec;
}
