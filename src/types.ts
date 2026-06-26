// =============================================================================
// types.ts — shared types for the procedural chibi sprite engine.
// Pure data definitions, zero runtime/DOM dependencies.
// =============================================================================

/** RGB triple, each channel 0..255 (floats allowed during math). */
export type RGB = [number, number, number];

/** A 3D unit-ish vector. Screen convention: +x right, +y DOWN, +z toward viewer. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * A material describes how a surface responds to light.
 * The SAME lighting math runs for every material — only these knobs differ,
 * which is what makes a metal pauldron read shiny and cloth read matte from
 * one unified system.
 */
export interface Material {
  name: string;
  /** Base/albedo color (the "midtone" the ramp is built around). */
  base: RGB;
  /** How strongly the surface catches specular highlights. 0 = none, 1 = strong. */
  specStrength: number;
  /** 0 = mirror-tight pinpoint sheen, 1 = fully matte/broad. Controls spec tightness. */
  roughness: number;
  /** If true, specular is tinted by the base color (real metals do this). */
  metallic: boolean;
  /** How far shadows shift toward cool/blue (0..1). Gives painterly depth. */
  shadowCoolShift: number;
}

/** A light, expressed as the direction FROM the surface TOWARD the light. */
export interface Light {
  dir: Vec3; // will be normalized internally
  /** Ambient floor so shadows never go pure black. 0..1. */
  ambient: number;
}

/** High-level config for generateSprite(). Everything optional → sensible defaults. */
export interface SpriteConfig {
  /** Same seed + same config => byte-identical sprite, always. */
  seed?: number | string;
  /** Logical output size in px (square). Default 64. */
  size?: number;
  /** Internal supersample factor for AA + smoother gradients. Default 2. */
  supersample?: number;

  /** Direction toward the light. Default upper-left-front. */
  light?: Partial<Vec3>;
  /** Ambient floor. Default 0.18. */
  ambient?: number;
  /**
   * 0..1 — how rounded each part's volume reads.
   * 1 = fully spherical bevel (ball-like), low = flat top with a thin rim.
   * Default 0.85.
   */
  roundness?: number;

  /** Optional 1px exterior outline. Pass false to disable. */
  outline?: false | { color?: RGB };
  /** Optional posterize. Pass a level count (e.g. 6) for crunchy-pixel look. */
  quantize?: false | number;

  /** Body proportions / pose. */
  body?: {
    headScale?: number;  // default 1
    bodyWidth?: number;  // default 1
    limbLength?: number; // default 1
    pose?: {
      armSwing?: number; // radians, default 0
      stance?: number;   // leg spread multiplier, default 1
    };
  };

  /** Explicit colors. Anything omitted is chosen deterministically from the seed. */
  palette?: {
    skin?: RGB;
    hair?: RGB;
    cloth?: RGB;
    leather?: RGB;
    metal?: RGB;
    hat?: RGB;
  };

  /** Outfit composition. */
  outfit?: {
    torso?: 'cloth' | 'leather'; // default 'cloth'
    armor?: boolean;             // metal chestplate + pauldrons. default false
    belt?: boolean;              // leather belt. default true
    hat?: 'none' | 'cap' | 'hat'; // headwear. default 'none'
  };

  /** Draw simple eyes. Default true. */
  face?: boolean;
}

/** RGBA pixel buffer — the engine's native, DOM-free output. */
export interface SpriteBuffer {
  width: number;
  height: number;
  /** RGBA, row-major, length = width*height*4, channels 0..255. */
  data: Uint8ClampedArray;
}
