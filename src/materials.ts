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

  // --- Creature / loot materials (Phase 1) -------------------------------

  // Insect shell: dark, hard, wet-looking. A tight tinted sheen rolls along
  // the lit edge of every segment, reading as polished chitin.
  chitin: (base) => ({
    name: 'chitin', base,
    specStrength: 0.6, roughness: 0.3, metallic: true, shadowCoolShift: 0.85,
  }),

  // Living tissue: soft, slightly wet, deep saturated shadows. Used for worms
  // and crawlers — reads as something squishy and alive, not cloth.
  flesh: (base) => ({
    name: 'flesh', base,
    specStrength: 0.3, roughness: 0.6, metallic: false, shadowCoolShift: 0.45,
  }),

  // Cut gem / crystal: bright, razor-tight pinpoint highlight, base-tinted —
  // catches the light like a jewel even at a few pixels across.
  gem: (base) => ({
    name: 'gem', base,
    specStrength: 0.9, roughness: 0.1, metallic: true, shadowCoolShift: 0.6,
  }),

  // Bone / tusk: chalky, near-matte, faint dry sheen. Cool, dead tone.
  bone: (base) => ({
    name: 'bone', base,
    specStrength: 0.12, roughness: 0.85, metallic: false, shadowCoolShift: 0.7,
  }),

  // Ember / molten: emissive-feeling. Strong broad glow rather than a sharp
  // spec dot, warm shadows so even the dark side stays hot. (Deeper layers.)
  ember: (base) => ({
    name: 'ember', base,
    specStrength: 0.55, roughness: 0.7, metallic: false, shadowCoolShift: 0.0,
  }),

  // Gold: warm metal with a bright, color-tinted highlight — coins, trim.
  gold: (base) => ({
    name: 'gold', base,
    specStrength: 0.8, roughness: 0.22, metallic: true, shadowCoolShift: 0.5,
  }),

  // Glass: bright, very tight pinpoint sheen, cool — potion vials, lenses.
  glass: (base) => ({
    name: 'glass', base,
    specStrength: 0.95, roughness: 0.08, metallic: false, shadowCoolShift: 0.7,
  }),
};
