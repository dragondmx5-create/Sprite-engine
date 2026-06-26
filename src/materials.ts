// =============================================================================
// materials.ts — preset materials. One lighting model, five behaviours.
// =============================================================================

import type { Material, RGB } from './types';

/** Factory so callers can override the base color while keeping the response curve. */
type MatFactory = (base: RGB) => Material;

export const MATERIALS: Record<string, MatFactory> = {
  // Soft, broad sheen. Mostly matte with a faint living gloss.
  skin: (base) => ({
    name: 'skin', base,
    specStrength: 0.18, roughness: 0.78, metallic: false, shadowCoolShift: 0.5,
  }),

  // Matte. Almost no specular — light is all diffuse form.
  cloth: (base) => ({
    name: 'cloth', base,
    specStrength: 0.05, roughness: 0.96, metallic: false, shadowCoolShift: 0.7,
  }),

  // Semi-gloss. A defined but soft highlight band — catches light on one edge.
  leather: (base) => ({
    name: 'leather', base,
    specStrength: 0.45, roughness: 0.55, metallic: false, shadowCoolShift: 0.6,
  }),

  // Tight, bright, COLOR-TINTED highlight. Reads unmistakably shiny.
  metal: (base) => ({
    name: 'metal', base,
    specStrength: 0.7, roughness: 0.26, metallic: true, shadowCoolShift: 0.8,
  }),

  // Glossy strands — strong but slightly broad sheen, deep cool shadows.
  hair: (base) => ({
    name: 'hair', base,
    specStrength: 0.4, roughness: 0.45, metallic: false, shadowCoolShift: 0.9,
  }),
};
