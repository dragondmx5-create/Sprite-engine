// =============================================================================
// materials.ts — preset materials. One lighting model, five behaviours.
// =============================================================================

import type { Material, RGB } from './types';

/** Factory so callers can override the base color while keeping the response curve. */
type MatFactory = (base: RGB) => Material;

export const MATERIALS: Record<string, MatFactory> = {
  // Soft, broad sheen. Mostly matte with a faint living gloss. Warm shadows.
  skin: (base) => ({
    name: 'skin', base,
    specStrength: 0.25, roughness: 0.68, metallic: false, shadowCoolShift: 0.18,
  }),

  // Matte. Almost no specular — light is all diffuse form. Warm shadow tint.
  cloth: (base) => ({
    name: 'cloth', base,
    specStrength: 0.10, roughness: 0.88, metallic: false, shadowCoolShift: 0.28,
  }),

  // Semi-gloss. A defined but soft highlight band — catches light on one edge.
  leather: (base) => ({
    name: 'leather', base,
    specStrength: 0.50, roughness: 0.48, metallic: false, shadowCoolShift: 0.22,
  }),

  // Tight, bright, COLOR-TINTED highlight. Reads unmistakably shiny.
  metal: (base) => ({
    name: 'metal', base,
    specStrength: 0.78, roughness: 0.20, metallic: true, shadowCoolShift: 0.38,
  }),

  // Glossy strands — strong but slightly broad sheen, defined shadows.
  hair: (base) => ({
    name: 'hair', base,
    specStrength: 0.46, roughness: 0.38, metallic: false, shadowCoolShift: 0.32,
  }),

  // --- Creature / loot materials (Phase 1) -------------------------------

  // Insect shell: dark, hard, wet-looking. A tight tinted sheen rolls along
  // the lit edge of every segment, reading as polished chitin.
  chitin: (base) => ({
    name: 'chitin', base,
    specStrength: 0.68, roughness: 0.25, metallic: true, shadowCoolShift: 0.38,
  }),

  // Living tissue: soft, slightly wet, deep saturated shadows.
  flesh: (base) => ({
    name: 'flesh', base,
    specStrength: 0.34, roughness: 0.52, metallic: false, shadowCoolShift: 0.18,
  }),

  // Cut gem / crystal: bright, razor-tight pinpoint highlight, base-tinted.
  gem: (base) => ({
    name: 'gem', base,
    specStrength: 0.92, roughness: 0.08, metallic: true, shadowCoolShift: 0.30,
  }),

  // Bone / tusk / stone: chalky, near-matte, faint dry sheen. Warm shadows.
  bone: (base) => ({
    name: 'bone', base,
    specStrength: 0.16, roughness: 0.78, metallic: false, shadowCoolShift: 0.30,
  }),

  // Ember / molten: emissive-feeling, warm shadows.
  ember: (base) => ({
    name: 'ember', base,
    specStrength: 0.58, roughness: 0.65, metallic: false, shadowCoolShift: 0.0,
  }),

  // Gold: warm metal with a bright, color-tinted highlight.
  gold: (base) => ({
    name: 'gold', base,
    specStrength: 0.84, roughness: 0.18, metallic: true, shadowCoolShift: 0.20,
  }),

  // Glass: bright, very tight pinpoint sheen.
  glass: (base) => ({
    name: 'glass', base,
    specStrength: 0.95, roughness: 0.06, metallic: false, shadowCoolShift: 0.32,
  }),
};
