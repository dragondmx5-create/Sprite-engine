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
    specStrength: 0.22, roughness: 0.72, metallic: false, shadowCoolShift: 0.25,
  }),

  // Matte. Almost no specular — light is all diffuse form.
  cloth: (base) => ({
    name: 'cloth', base,
    specStrength: 0.08, roughness: 0.92, metallic: false, shadowCoolShift: 0.35,
  }),

  // Semi-gloss. A defined but soft highlight band — catches light on one edge.
  leather: (base) => ({
    name: 'leather', base,
    specStrength: 0.48, roughness: 0.50, metallic: false, shadowCoolShift: 0.30,
  }),

  // Tight, bright, COLOR-TINTED highlight. Reads unmistakably shiny.
  metal: (base) => ({
    name: 'metal', base,
    specStrength: 0.75, roughness: 0.22, metallic: true, shadowCoolShift: 0.45,
  }),

  // Glossy strands — strong but slightly broad sheen, defined shadows.
  hair: (base) => ({
    name: 'hair', base,
    specStrength: 0.44, roughness: 0.40, metallic: false, shadowCoolShift: 0.40,
  }),

  // --- Creature / loot materials (Phase 1) -------------------------------

  // Insect shell: dark, hard, wet-looking. A tight tinted sheen rolls along
  // the lit edge of every segment, reading as polished chitin.
  chitin: (base) => ({
    name: 'chitin', base,
    specStrength: 0.65, roughness: 0.28, metallic: true, shadowCoolShift: 0.45,
  }),

  // Living tissue: soft, slightly wet, deep saturated shadows.
  flesh: (base) => ({
    name: 'flesh', base,
    specStrength: 0.32, roughness: 0.55, metallic: false, shadowCoolShift: 0.22,
  }),

  // Cut gem / crystal: bright, razor-tight pinpoint highlight, base-tinted.
  gem: (base) => ({
    name: 'gem', base,
    specStrength: 0.92, roughness: 0.08, metallic: true, shadowCoolShift: 0.35,
  }),

  // Bone / tusk: chalky, near-matte, faint dry sheen.
  bone: (base) => ({
    name: 'bone', base,
    specStrength: 0.14, roughness: 0.82, metallic: false, shadowCoolShift: 0.38,
  }),

  // Ember / molten: emissive-feeling, warm shadows.
  ember: (base) => ({
    name: 'ember', base,
    specStrength: 0.58, roughness: 0.65, metallic: false, shadowCoolShift: 0.0,
  }),

  // Gold: warm metal with a bright, color-tinted highlight.
  gold: (base) => ({
    name: 'gold', base,
    specStrength: 0.82, roughness: 0.20, metallic: true, shadowCoolShift: 0.25,
  }),

  // Glass: bright, very tight pinpoint sheen.
  glass: (base) => ({
    name: 'glass', base,
    specStrength: 0.95, roughness: 0.06, metallic: false, shadowCoolShift: 0.38,
  }),
};
