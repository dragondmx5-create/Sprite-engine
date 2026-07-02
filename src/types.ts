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
  /**
   * Optional per-pixel surface texture layered over the shading — the
   * hand-dithered grain that makes terrain/foliage read detailed instead of
   * airbrushed. Deterministic (position-hash), so it never boils between
   * frames of the same sprite.
   *
   * Accepts a single layer or a STACK of layers applied in order — combine
   * scales like paint passes: a broad mottle (scale 4-6) for patchiness, a
   * mid speckle for clumps, a fine grain (scale 1) for tooth.
   *   'grain'   — luminance noise per cell (dirt, stone, wood)
   *   'speckle' — sparse strong light/dark dots (grass, foliage)
   *   'bump'    — perturbs the shading NORMAL (via noise.ts's smooth fbm),
   *               not just color, so light/shadow actually roll across the
   *               relief instead of a flat-lit pixel getting tinted. This is
   *               what makes turf/rough stone/cloth folds read as real
   *               surface relief rather than a flat plane with dots painted
   *               on. `amount` ~0.15..0.5; lower scale (2-3) + higher amount
   *               reads as soft creases/wrinkles, higher scale (6+) reads as
   *               fine roughness.
   *   'bitmap'  — tiles a small embedded RGBA source (see textures.ts) over
   *               the shape and blends it into the ALREADY-SHADED pixel at
   *               `amount` opacity. Unlike the others this carries real hue
   *               variation, not just luminance — hand-authored/photographed
   *               texture has irregularity procedural noise can't fake. It's
   *               a blend, not a paste: the SDF bevel's own light/shadow
   *               still shows through underneath, so it doesn't look stamped
   *               flat onto a rounded shape. Opt-in and tiny (one 16-32px
   *               source tile) — everything else on this page stays pure
   *               math with zero external assets; only parts that explicitly
   *               reach for a bitmap layer pull one in.
   */
  texture?: TextureLayer | TextureLayer[];
}

/** One octave of the material texture stack. */
export interface TextureLayer {
  kind: 'grain' | 'speckle' | 'bump' | 'bitmap';
  /** Strength of the perturbation: luminance for grain/speckle (~0.03..0.15), normal displacement for bump (~0.15..0.5), blend opacity for bitmap (~0.5..0.9). */
  amount: number;
  /** Pixel cell size of the pattern (1 = every output pixel). Default 1. Unused for 'bitmap' (uses the source's own native size). */
  scale?: number;
  /**
   * Anisotropic cell overrides — stretch the pattern along one axis.
   * sx: 6, sy: 1 → horizontal streaks (water drift, wood boards);
   * sx: 1, sy: 6 → vertical streaks (bark, plank walls). Default = scale.
   */
  sx?: number;
  sy?: number;
  /** Only for kind: 'bitmap' — a small tileable RGBA source, sampled 1:1 (one source pixel per output pixel) and wrapped at its own width/height. */
  bitmap?: { width: number; height: number; data: Uint8ClampedArray };
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
  /** Logical output width in px. Default 48. */
  size?: number;
  /** Logical output height in px. Defaults to size (square). */
  height?: number;
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
    cape?: RGB;
    pants?: RGB;
    accent?: RGB;
  };

  /** Outfit composition. */
  outfit?: {
    torso?: 'cloth' | 'leather' | 'robe' | 'chainmail' | 'vest'; // default 'cloth'
    armor?: boolean;             // metal chestplate + pauldrons. default false
    belt?: boolean;              // leather belt. default true
    hat?: 'none' | 'cap' | 'hat' | 'hood' | 'wizard' | 'crown' | 'helmet' | 'bandana'; // headwear
    cape?: boolean;              // flowing cloak behind the body. default false
    coat?: boolean;              // long coat extending past waist. default false
    boots?: boolean;             // tall boots on legs. default false
    gloves?: boolean;            // gauntlets / gloves on hands. default false
    scarf?: boolean;             // neck scarf / muffler. default false
    shoulderpad?: boolean;       // decorative shoulder pads (non-armor). default false
  };

  /** Hairstyle. Default 'short' (the original look). 'bald' draws no hair. */
  hairStyle?: 'short' | 'long' | 'spiky' | 'bun' | 'bald' | 'flowing' | 'ponytail';

  /** Weapon held in the right hand. Follows arm rotation during animations. */
  weapon?: 'none' | 'dagger' | 'sword' | 'axe' | 'staff' | 'bow' | 'mace' | 'wand' | 'hammer' | 'fishing_rod';

  /** Round buckler shield on the left arm. */
  shield?: boolean;

  /** Draw simple eyes. Default true. */
  face?: boolean;

  /**
   * Which way the character looks (for top-down movement). 8-way compass:
   *   'front' (default) — faces the viewer, both eyes centered
   *   'back'             — seen from behind; face hidden by hair
   *   'left' | 'right'   — full profile lean; eyes shifted to that side
   *   'front-left' | 'front-right' | 'back-left' | 'back-right' — diagonals,
   *     a lighter lean between the cardinal and the profile
   * Geometry-only (a torso-lean bias + eye shift, no buffer flipping), so it
   * also works in animation frames. The lean is shared by every part that
   * rotates with the upper body — torso, arms, head, cape, shield, weapon —
   * so equipment turns together with the character in all 8 directions.
   */
  facing?: 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';
}

/** RGBA pixel buffer — the engine's native, DOM-free output. */
export interface SpriteBuffer {
  width: number;
  height: number;
  /** RGBA, row-major, length = width*height*4, channels 0..255. */
  data: Uint8ClampedArray;
}
