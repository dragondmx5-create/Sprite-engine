"use strict";
var SpriteEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    ATTACK: () => ATTACK,
    CLIPS: () => CLIPS,
    CREATURE_KINDS: () => CREATURE_KINDS,
    DEATH: () => DEATH,
    EFFECT_CLIPS: () => EFFECT_CLIPS,
    ENEMY_CLIPS: () => ENEMY_CLIPS,
    GPURenderer: () => GPURenderer,
    HIT: () => HIT,
    IDLE: () => IDLE,
    ITEM_CLIPS: () => ITEM_CLIPS,
    ITEM_KINDS: () => ITEM_KINDS,
    LOOT_MARKER_KINDS: () => LOOT_MARKER_KINDS,
    MATERIALS: () => MATERIALS,
    MINIMAP_ICONS: () => MINIMAP_ICONS,
    NEUTRAL_POSE: () => NEUTRAL_POSE,
    SDF_CAPSULE: () => SDF_CAPSULE,
    SDF_CIRCLE: () => SDF_CIRCLE,
    SDF_ELLIPSE: () => SDF_ELLIPSE,
    SDF_ROUNDED_BOX: () => SDF_ROUNDED_BOX,
    SpriteCache: () => SpriteCache,
    TILE_KINDS: () => TILE_KINDS,
    WALK: () => WALK,
    animationToCanvases: () => animationToCanvases,
    applyStatusEffect: () => applyStatusEffect,
    blitOver: () => blitOver,
    buildCreature: () => buildCreature,
    buildDripEffect: () => buildDripEffect,
    buildEffect: () => buildEffect,
    buildFireballEffect: () => buildFireballEffect,
    buildImpactEffect: () => buildImpactEffect,
    buildItem: () => buildItem,
    buildLootMarker: () => buildLootMarker,
    buildMagicBoltEffect: () => buildMagicBoltEffect,
    buildSlashEffect: () => buildSlashEffect,
    buildSmokeEffect: () => buildSmokeEffect,
    buildSparkleEffect: () => buildSparkleEffect,
    buildTile: () => buildTile,
    buildWaterRippleEffect: () => buildWaterRippleEffect,
    cachedAnimation: () => cachedAnimation,
    cachedEffectAnimation: () => cachedEffectAnimation,
    cachedEnemy: () => cachedEnemy,
    cachedEnemyAnimation: () => cachedEnemyAnimation,
    cachedItem: () => cachedItem,
    cachedItemAnimation: () => cachedItemAnimation,
    cachedSprite: () => cachedSprite,
    cachedTile: () => cachedTile,
    createBuffer: () => createBuffer,
    damp: () => damp,
    extractSDFDesc: () => extractSDFDesc,
    fabrik: () => fabrik,
    flashSprite: () => flashSprite,
    generateAnimation: () => generateAnimation,
    generateButton: () => generateButton,
    generateDamageNumber: () => generateDamageNumber,
    generateDarknessOverlay: () => generateDarknessOverlay,
    generateDialogBox: () => generateDialogBox,
    generateEffectAnimation: () => generateEffectAnimation,
    generateEnemy: () => generateEnemy,
    generateEnemyAnimation: () => generateEnemyAnimation,
    generateHealthBar: () => generateHealthBar,
    generateImpactEffect: () => generateImpactEffect,
    generateInventorySlot: () => generateInventorySlot,
    generateItem: () => generateItem,
    generateItemAnimation: () => generateItemAnimation,
    generateLightGlow: () => generateLightGlow,
    generateLootMarker: () => generateLootMarker,
    generateManaBar: () => generateManaBar,
    generateMinimapIcon: () => generateMinimapIcon,
    generateProjectile: () => generateProjectile,
    generateShadow: () => generateShadow,
    generateSlashEffect: () => generateSlashEffect,
    generateSparkle: () => generateSparkle,
    generateSprite: () => generateSprite,
    generateSpriteCanvas: () => generateSpriteCanvas,
    generateSpriteSheetCanvas: () => generateSpriteSheetCanvas,
    generateTile: () => generateTile,
    generateXPBar: () => generateXPBar,
    getGPURenderer: () => getGPURenderer,
    globalCache: () => globalCache,
    isInDarkness: () => isInDarkness,
    isVisible: () => isVisible,
    lag: () => lag,
    listAnimations: () => listAnimations,
    listEffectAnimations: () => listEffectAnimations,
    listEnemyAnimations: () => listEnemyAnimations,
    listItemAnimations: () => listItemAnimations,
    measureText: () => measureText,
    packSpriteSheet: () => packSpriteSheet,
    pulse: () => pulse,
    renderBatchGPU: () => renderBatchGPU,
    renderNumber: () => renderNumber,
    renderPartsGPU: () => renderPartsGPU,
    renderScene: () => renderScene,
    renderText: () => renderText,
    samplePose: () => samplePose,
    smooth: () => smooth,
    solveTwoBone: () => solveTwoBone,
    squash: () => squash,
    tintSprite: () => tintSprite,
    toCanvas: () => toCanvas,
    toImageData: () => toImageData,
    torchFlicker: () => torchFlicker,
    wave: () => wave
  });

  // src/rng.ts
  function hashSeed(seed) {
    const s = typeof seed === "number" ? seed.toString() : seed;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var RNG = class {
    constructor(seed) {
      this.next = mulberry32(hashSeed(seed));
    }
    /** Uniform float in [0,1). */
    float() {
      return this.next();
    }
    /** Uniform float in [min,max). */
    range(min2, max2) {
      return min2 + (max2 - min2) * this.next();
    }
    /** Symmetric jitter in [-amt, +amt]. */
    jitter(amt) {
      return (this.next() * 2 - 1) * amt;
    }
    /** Pick one element. */
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
  };

  // src/materials.ts
  var MATERIALS = {
    // Soft, broad sheen. Mostly matte with a faint living gloss. Warm shadows.
    skin: (base) => ({
      name: "skin",
      base,
      specStrength: 0.25,
      roughness: 0.68,
      metallic: false,
      shadowCoolShift: 0.18
    }),
    // Matte. Almost no specular — light is all diffuse form. Warm shadow tint.
    cloth: (base) => ({
      name: "cloth",
      base,
      specStrength: 0.1,
      roughness: 0.88,
      metallic: false,
      shadowCoolShift: 0.28
    }),
    // Semi-gloss. A defined but soft highlight band — catches light on one edge.
    leather: (base) => ({
      name: "leather",
      base,
      specStrength: 0.5,
      roughness: 0.48,
      metallic: false,
      shadowCoolShift: 0.22
    }),
    // Tight, bright, COLOR-TINTED highlight. Reads unmistakably shiny.
    metal: (base) => ({
      name: "metal",
      base,
      specStrength: 0.78,
      roughness: 0.2,
      metallic: true,
      shadowCoolShift: 0.38
    }),
    // Glossy strands — strong but slightly broad sheen, defined shadows.
    hair: (base) => ({
      name: "hair",
      base,
      specStrength: 0.46,
      roughness: 0.38,
      metallic: false,
      shadowCoolShift: 0.32
    }),
    // --- Creature / loot materials (Phase 1) -------------------------------
    // Insect shell: dark, hard, wet-looking. A tight tinted sheen rolls along
    // the lit edge of every segment, reading as polished chitin.
    chitin: (base) => ({
      name: "chitin",
      base,
      specStrength: 0.68,
      roughness: 0.25,
      metallic: true,
      shadowCoolShift: 0.38
    }),
    // Living tissue: soft, slightly wet, deep saturated shadows.
    flesh: (base) => ({
      name: "flesh",
      base,
      specStrength: 0.34,
      roughness: 0.52,
      metallic: false,
      shadowCoolShift: 0.18
    }),
    // Cut gem / crystal: bright, razor-tight pinpoint highlight, base-tinted.
    gem: (base) => ({
      name: "gem",
      base,
      specStrength: 0.92,
      roughness: 0.08,
      metallic: true,
      shadowCoolShift: 0.3
    }),
    // Bone / tusk / stone: chalky, near-matte, faint dry sheen. Warm shadows.
    bone: (base) => ({
      name: "bone",
      base,
      specStrength: 0.16,
      roughness: 0.78,
      metallic: false,
      shadowCoolShift: 0.3
    }),
    // Ember / molten: emissive-feeling, warm shadows.
    ember: (base) => ({
      name: "ember",
      base,
      specStrength: 0.58,
      roughness: 0.65,
      metallic: false,
      shadowCoolShift: 0
    }),
    // Gold: warm metal with a bright, color-tinted highlight.
    gold: (base) => ({
      name: "gold",
      base,
      specStrength: 0.84,
      roughness: 0.18,
      metallic: true,
      shadowCoolShift: 0.2
    }),
    // Glass: bright, very tight pinpoint sheen.
    glass: (base) => ({
      name: "glass",
      base,
      specStrength: 0.95,
      roughness: 0.06,
      metallic: false,
      shadowCoolShift: 0.32
    })
  };

  // src/shapes.ts
  var SDF_CIRCLE = 0;
  var SDF_ELLIPSE = 1;
  var SDF_CAPSULE = 2;
  var SDF_ROUNDED_BOX = 3;
  var min = Math.min;
  var max = Math.max;
  var hypot = Math.hypot;
  function circle(cx, cy, r) {
    const fn = (x, y) => hypot(x - cx, y - cy) - r;
    fn.__sdfDesc = { type: SDF_CIRCLE, params: [cx, cy, r] };
    return fn;
  }
  function ellipse(cx, cy, rx, ry) {
    const fn = (x, y) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return (hypot(dx, dy) - 1) * min(rx, ry);
    };
    fn.__sdfDesc = { type: SDF_ELLIPSE, params: [cx, cy, rx, ry] };
    return fn;
  }
  function capsule(ax, ay, bx, by, r) {
    const ex = bx - ax, ey = by - ay;
    const ee = ex * ex + ey * ey || 1e-6;
    const fn = (x, y) => {
      const px = x - ax, py = y - ay;
      let t = (px * ex + py * ey) / ee;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return hypot(px - ex * t, py - ey * t) - r;
    };
    fn.__sdfDesc = { type: SDF_CAPSULE, params: [ax, ay, bx, by, r] };
    return fn;
  }
  function roundedBox(cx, cy, hx, hy, r) {
    const fn = (x, y) => {
      const dx = Math.abs(x - cx) - hx + r;
      const dy = Math.abs(y - cy) - hy + r;
      const outside = hypot(max(dx, 0), max(dy, 0));
      const inside = min(max(dx, dy), 0);
      return outside + inside - r;
    };
    fn.__sdfDesc = { type: SDF_ROUNDED_BOX, params: [cx, cy, hx, hy, r] };
    return fn;
  }
  function extractSDFDesc(sdf) {
    return sdf.__sdfDesc;
  }
  function union(a, b) {
    return (x, y) => min(a(x, y), b(x, y));
  }
  function translated(sdf, dx, dy) {
    return (x, y) => sdf(x - dx, y - dy);
  }
  function rotatedAround(sdf, angle, px, py) {
    if (angle === 0) return sdf;
    const c = Math.cos(-angle), s = Math.sin(-angle);
    return (x, y) => {
      const dx = x - px, dy = y - py;
      return sdf(px + dx * c - dy * s, py + dx * s + dy * c);
    };
  }
  function transformedAABB(x0, y0, x1, y1, angle, px, py, dx, dy) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [x, y] of corners) {
      const rx = px + (x - px) * c - (y - py) * s + dx;
      const ry = py + (x - px) * s + (y - py) * c + dy;
      if (rx < minx) minx = rx;
      if (rx > maxx) maxx = rx;
      if (ry < miny) miny = ry;
      if (ry > maxy) maxy = ry;
    }
    return [Math.floor(minx - 2), Math.floor(miny - 2), Math.ceil(maxx + 2), Math.ceil(maxy + 2)];
  }

  // src/pose.ts
  var NEUTRAL_POSE = {
    rootX: 0,
    rootY: 0,
    headBob: 0,
    headTilt: 0,
    armL: 0,
    armR: 0,
    legL: 0,
    legR: 0,
    torsoLean: 0
  };
  var POSE_KEYS = Object.keys(NEUTRAL_POSE);
  function applyEase(e, x) {
    switch (e) {
      case "easeIn":
        return x * x;
      case "easeOut":
        return 1 - (1 - x) * (1 - x);
      case "linear":
        return x;
      case "easeInOut":
      default:
        return x * x * (3 - 2 * x);
    }
  }
  function fullPose(p) {
    return { ...NEUTRAL_POSE, ...p };
  }
  function samplePose(clip, phase) {
    const ks = clip.keyframes;
    let ph = phase;
    if (clip.loop) ph = (ph % 1 + 1) % 1;
    else ph = ph < 0 ? 0 : ph > 1 ? 1 : ph;
    if (ph <= ks[0].t) return fullPose(ks[0].pose);
    if (ph >= ks[ks.length - 1].t) return fullPose(ks[ks.length - 1].pose);
    let a = ks[0], b = ks[ks.length - 1];
    for (let i = 0; i < ks.length - 1; i++) {
      if (ph >= ks[i].t && ph <= ks[i + 1].t) {
        a = ks[i];
        b = ks[i + 1];
        break;
      }
    }
    const span = b.t - a.t || 1e-6;
    const local = applyEase(a.ease, (ph - a.t) / span);
    const pa = fullPose(a.pose);
    const pb = fullPose(b.pose);
    const out = { ...NEUTRAL_POSE };
    for (const k of POSE_KEYS) out[k] = pa[k] + (pb[k] - pa[k]) * local;
    return out;
  }
  var D = Math.PI / 180;
  var IDLE = {
    name: "idle",
    fps: 8,
    loop: true,
    frames: 4,
    keyframes: [
      { t: 0, pose: { rootY: 0, headBob: 0, armL: 3 * D, armR: -3 * D } },
      { t: 0.5, pose: { rootY: -0.8, headBob: -0.5, armL: 1 * D, armR: -1 * D } },
      { t: 1, pose: { rootY: 0, headBob: 0, armL: 3 * D, armR: -3 * D } }
    ]
  };
  var WALK = {
    name: "walk",
    fps: 12,
    loop: true,
    frames: 8,
    keyframes: [
      // contact: left leg forward, right leg back, arms opposite, body low
      { t: 0, pose: { legL: 18 * D, legR: -18 * D, armL: -16 * D, armR: 16 * D, rootY: 0.4 } },
      // passing: legs together under body, body lifts
      { t: 0.25, pose: { legL: 0, legR: 0, armL: 0, armR: 0, rootY: -1.2 } },
      // contact: mirrored
      { t: 0.5, pose: { legL: -18 * D, legR: 18 * D, armL: 16 * D, armR: -16 * D, rootY: 0.4 } },
      // passing
      { t: 0.75, pose: { legL: 0, legR: 0, armL: 0, armR: 0, rootY: -1.2 } },
      { t: 1, pose: { legL: 18 * D, legR: -18 * D, armL: -16 * D, armR: 16 * D, rootY: 0.4 } }
    ]
  };
  var ATTACK = {
    name: "attack",
    fps: 14,
    loop: false,
    frames: 6,
    keyframes: [
      { t: 0, pose: { armR: 0, torsoLean: 0 }, ease: "easeOut" },
      { t: 0.35, pose: { armR: -120 * D, torsoLean: -5 * D, headTilt: -4 * D }, ease: "easeIn" },
      // wind up (arm raised back)
      { t: 0.55, pose: { armR: 70 * D, torsoLean: 8 * D, headTilt: 3 * D }, ease: "easeOut" },
      // strike (arm swung forward/down)
      { t: 1, pose: { armR: 0, torsoLean: 0, headTilt: 0 } }
      // settle
    ]
  };
  var HIT = {
    name: "hit",
    fps: 16,
    loop: false,
    frames: 5,
    keyframes: [
      { t: 0, pose: { rootX: 0, headTilt: 0, torsoLean: 0 }, ease: "easeOut" },
      { t: 0.25, pose: { rootX: -2.2, headTilt: 9 * D, torsoLean: 7 * D }, ease: "easeIn" },
      // knocked back
      { t: 1, pose: { rootX: 0, headTilt: 0, torsoLean: 0 } }
      // settle
    ]
  };
  var DEATH = {
    name: "death",
    fps: 12,
    loop: false,
    frames: 7,
    keyframes: [
      { t: 0, pose: { torsoLean: 0, rootY: 0, headTilt: 0 }, ease: "easeIn" },
      { t: 0.2, pose: { torsoLean: -10 * D, headTilt: -8 * D, rootY: -1 }, ease: "easeOut" },
      // brief stagger up
      { t: 0.6, pose: { torsoLean: 62 * D, headTilt: 40 * D, rootY: 3, legL: 22 * D, legR: -16 * D, armL: 30 * D, armR: -24 * D }, ease: "easeIn" },
      { t: 1, pose: { torsoLean: 80 * D, headTilt: 55 * D, rootY: 5, legL: 26 * D, legR: -20 * D, armL: 38 * D, armR: -30 * D } }
      // collapsed
    ]
  };
  var CAST = {
    name: "cast",
    fps: 12,
    loop: false,
    frames: 6,
    keyframes: [
      { t: 0, pose: {} },
      // neutral
      { t: 0.25, pose: { armR: -90 * D, torsoLean: -8 * D }, ease: "easeOut" },
      // wind-up
      { t: 0.5, pose: { armR: 60 * D, torsoLean: 12 * D, headTilt: 5 * D }, ease: "easeIn" },
      // cast forward
      { t: 1, pose: {} }
      // settle
    ]
  };
  var DODGE = {
    name: "dodge",
    fps: 16,
    loop: false,
    frames: 5,
    keyframes: [
      { t: 0, pose: {} },
      // neutral
      { t: 0.3, pose: { rootX: -3, rootY: 1.5, torsoLean: -12 * D }, ease: "easeOut" },
      // sidestep
      { t: 1, pose: {} }
      // back to neutral
    ]
  };
  var CLIPS = {
    idle: IDLE,
    walk: WALK,
    attack: ATTACK,
    hit: HIT,
    death: DEATH,
    cast: CAST,
    dodge: DODGE
  };

  // src/skeleton.ts
  function defaultColor(rng, kind) {
    const hsv = (h, s, v) => {
      const c = v * s, hp = h % 1 * 6, xx = c * (1 - Math.abs(hp % 2 - 1));
      let r = 0, g = 0, b = 0;
      if (hp < 1) [r, g, b] = [c, xx, 0];
      else if (hp < 2) [r, g, b] = [xx, c, 0];
      else if (hp < 3) [r, g, b] = [0, c, xx];
      else if (hp < 4) [r, g, b] = [0, xx, c];
      else if (hp < 5) [r, g, b] = [xx, 0, c];
      else [r, g, b] = [c, 0, xx];
      const m = v - c;
      return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    };
    switch (kind) {
      case "skin":
        return hsv(rng.range(0.03, 0.09), rng.range(0.4, 0.58), rng.range(0.78, 0.92));
      case "hair":
        return hsv(rng.range(0, 1), rng.range(0.55, 0.9), rng.range(0.3, 0.72));
      case "cloth":
        return hsv(rng.range(0, 1), rng.range(0.62, 0.92), rng.range(0.52, 0.8));
      case "leather":
        return hsv(rng.range(0.05, 0.1), rng.range(0.55, 0.75), rng.range(0.32, 0.52));
      case "metal":
        return hsv(rng.range(0.55, 0.62), rng.range(0.08, 0.16), rng.range(0.54, 0.68));
      case "hat":
        return hsv(rng.range(0, 1), rng.range(0.55, 0.88), rng.range(0.42, 0.72));
      default:
        return [200, 200, 200];
    }
  }
  function fwd(x, y, xf) {
    if (xf.jointAngle) {
      const c = Math.cos(xf.jointAngle), s = Math.sin(xf.jointAngle);
      const dx = x - xf.jx, dy = y - xf.jy;
      x = xf.jx + dx * c - dy * s;
      y = xf.jy + dx * s + dy * c;
    }
    if (xf.pelvisRot) {
      const c = Math.cos(xf.pelvisRot), s = Math.sin(xf.pelvisRot);
      const dx = x - xf.px, dy = y - xf.py;
      x = xf.px + dx * c - dy * s;
      y = xf.py + dx * s + dy * c;
    }
    return [x + (xf.tx || 0), y + (xf.ty || 0)];
  }
  function buildSkeleton(config, s, pose = NEUTRAL_POSE) {
    const rng = new RNG(config.seed ?? 0);
    const body = config.body ?? {};
    const ipose = body.pose ?? {};
    const outfit = config.outfit ?? {};
    const torsoMat = outfit.torso ?? "cloth";
    const hasArmor = outfit.armor ?? false;
    const hasBelt = outfit.belt ?? true;
    const hat = outfit.hat ?? "none";
    const hasCoat = outfit.coat ?? false;
    const hasBoots = outfit.boots ?? false;
    const hasGloves = outfit.gloves ?? false;
    const hasScarf = outfit.scarf ?? false;
    const hasShoulderpads = outfit.shoulderpad ?? false;
    const headScale = (body.headScale ?? 1) * (1 + rng.jitter(0.04));
    const bodyWidth = (body.bodyWidth ?? 1) * (1 + rng.jitter(0.05));
    const limbLen = (body.limbLength ?? 1) * (1 + rng.jitter(0.05));
    const stanceBase = ipose.stance ?? 1;
    const facing = config.facing ?? "front";
    const hairStyle = config.hairStyle ?? "short";
    const hasCape = outfit.cape ?? false;
    const pal = config.palette ?? {};
    const col = {
      skin: pal.skin ?? defaultColor(rng, "skin"),
      hair: pal.hair ?? defaultColor(rng, "hair"),
      cloth: pal.cloth ?? defaultColor(rng, "cloth"),
      leather: pal.leather ?? defaultColor(rng, "leather"),
      metal: pal.metal ?? defaultColor(rng, "metal"),
      hat: pal.hat ?? defaultColor(rng, "hat")
    };
    const capeCol = pal.cape ?? col.cloth;
    const pantsCol = pal.pants ?? col.leather;
    const accentCol = pal.accent ?? [Math.min(255, col.cloth[0] + 50), Math.min(255, col.cloth[1] + 40), Math.min(255, col.cloth[2] + 30)];
    const torsoMatName = torsoMat === "leather" || torsoMat === "vest" ? "leather" : torsoMat === "chainmail" ? "metal" : "cloth";
    const torsoColor = torsoMatName === "leather" ? col.leather : torsoMatName === "metal" ? col.metal : col.cloth;
    const hatMatName = hat === "hat" || hat === "helmet" ? "leather" : hat === "crown" ? "metal" : "cloth";
    const M = {
      skin: MATERIALS.skin(col.skin),
      hair: MATERIALS.hair(col.hair),
      torso: MATERIALS[torsoMatName](torsoColor),
      legs: MATERIALS.cloth(pantsCol),
      leather: MATERIALS.leather(col.leather),
      metal: MATERIALS.metal(col.metal),
      hat: MATERIALS[hatMatName](hat === "crown" ? col.metal : col.hat),
      cape: MATERIALS.cloth(capeCol),
      accent: MATERIALS.cloth(accentCol),
      gold: MATERIALS.gold([220, 195, 80]),
      gem: MATERIALS.gem([150, 70, 210])
    };
    const cx = s * 0.5;
    const headHw = s * 0.21 * headScale;
    const headHh = s * 0.19 * headScale;
    const headCy = s * 0.27;
    const headCorner = headHw * 0.72;
    const torsoTop = headCy + headHh * 0.82;
    const torsoBot = s * 0.65;
    const torsoCy = (torsoTop + torsoBot) / 2;
    const torsoHw = s * 0.12 * bodyWidth;
    const torsoHh = (torsoBot - torsoTop) / 2;
    const shoulderY = torsoTop + s * 0.01;
    const armHw = s * 0.034 * bodyWidth;
    const armHh = torsoHh * 0.72 * limbLen;
    const armCy = shoulderY + armHh;
    const armX = torsoHw + armHw * 0.6;
    const legHw = s * 0.046 * bodyWidth;
    const legHh = s * 0.065 * limbLen;
    const legCy = torsoBot + legHh - s * 5e-3;
    const hipY = legCy - legHh;
    const legSpread = s * 0.054 * stanceBase;
    const unit = s / 48;
    const rootX = pose.rootX * unit;
    const rootY = pose.rootY * unit;
    const headBob = pose.headBob * unit;
    const lean = pose.torsoLean;
    const neckY = headCy + headHh;
    const pelX = cx, pelY = torsoBot;
    const xUpper = { pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY };
    const xHead = () => ({ jointAngle: pose.headTilt, jx: cx, jy: neckY, pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY + headBob });
    const xArm = (a, jx, jy) => ({ jointAngle: a, jx, jy, pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY });
    const xLeg = (a, jx, jy) => ({ jointAngle: a, jx, jy, tx: rootX, ty: rootY });
    const parts = [];
    const place = (mat, base, lx0, ly0, lx1, ly1, roundness, xf) => {
      let f = base;
      if (xf.jointAngle) f = rotatedAround(f, xf.jointAngle, xf.jx, xf.jy);
      if (xf.pelvisRot) f = rotatedAround(f, xf.pelvisRot, xf.px, xf.py);
      if (xf.tx || xf.ty) f = translated(f, xf.tx || 0, xf.ty || 0);
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (const [cxn, cyn] of [[lx0, ly0], [lx1, ly0], [lx1, ly1], [lx0, ly1]]) {
        const [px2, py2] = fwd(cxn, cyn, xf);
        if (px2 < minx) minx = px2;
        if (px2 > maxx) maxx = px2;
        if (py2 < miny) miny = py2;
        if (py2 > maxy) maxy = py2;
      }
      parts.push({ material: mat, roundness, sdf: f, bbox: [Math.floor(minx - 2), Math.floor(miny - 2), Math.ceil(maxx + 2), Math.ceil(maxy + 2)] });
    };
    const box = (mat, bx, by, hw, hh, r, roundness, xf) => place(mat, roundedBox(bx, by, hw, hh, r), bx - hw, by - hh, bx + hw, by + hh, roundness, xf);
    const drawCapeEarly = hasCape && facing !== "back";
    const placeCape = () => {
      const capeTop = shoulderY + s * 0.01;
      const capeBot = legCy + legHh * 0.4;
      box(M.cape, cx, (capeTop + capeBot) / 2, torsoHw * 1.45, (capeBot - capeTop) / 2, s * 0.03, 0.5, xUpper);
    };
    if (drawCapeEarly) placeCape();
    const hairHidden = hat === "hat" || hat === "hood";
    if (hairStyle !== "bald" && !hairHidden) {
      const isLong = hairStyle === "long" || hairStyle === "flowing";
      const back = isLong ? headHh * 1.35 : headHh * 0.95;
      box(M.hair, cx, headCy - headHh * 0.18 + (isLong ? headHh * 0.2 : 0), headHw * 1.06, back, headCorner * 0.9, 0.45, xHead());
    }
    for (const dir of [-1, 1]) {
      const lx = cx + dir * legSpread;
      const ang = dir < 0 ? pose.legL : pose.legR;
      box(M.legs, lx, legCy, legHw, legHh, legHw * 0.45, 0.4, xLeg(ang, lx, hipY));
      if (hasBoots) {
        const bootTop = legCy + legHh * 0.15;
        const bootBot = legCy + legHh + s * 0.018;
        const bootHh = (bootBot - bootTop) / 2;
        box(M.leather, lx, (bootTop + bootBot) / 2, legHw * 1.08, bootHh, legHw * 0.4, 0.45, xLeg(ang, lx, hipY));
        box(M.leather, lx, bootBot, legHw * 1.12, s * 0.01, s * 6e-3, 0.35, xLeg(ang, lx, hipY));
      } else {
        box(M.leather, lx + dir * legHw * 0.15, legCy + legHh + s * 0.012, legHw * 1.05, s * 0.022, s * 0.012, 0.45, xLeg(ang, lx, hipY));
      }
    }
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      const ang = dir < 0 ? pose.armL : pose.armR;
      const armMat = torsoMat === "vest" ? M.skin : M.torso;
      box(armMat, ax, armCy, armHw, armHh, armHw * 0.5, 0.4, xArm(ang, ax, shoulderY));
      if (hasGloves) {
        box(M.leather, ax, armCy + armHh + armHw * 0.2, armHw * 1.02, armHw * 1, armHw * 0.55, 0.5, xArm(ang, ax, shoulderY));
      } else {
        box(M.skin, ax, armCy + armHh + armHw * 0.2, armHw * 0.95, armHw * 0.9, armHw * 0.6, 0.5, xArm(ang, ax, shoulderY));
      }
    }
    box(M.torso, cx, torsoCy, torsoHw, torsoHh, s * 0.028, 0.4, xUpper);
    box(M.accent, cx, torsoTop + s * 0.02, torsoHw * 0.7, s * 8e-3, s * 5e-3, 0.35, xUpper);
    if (torsoMat === "robe") {
      const robeBot = legCy + legHh * 0.8;
      const robeHh = (robeBot - torsoTop) / 2;
      const robeCy = (torsoTop + robeBot) / 2;
      box(M.torso, cx, robeCy, torsoHw * 1.2, robeHh, s * 0.03, 0.4, xUpper);
      box(M.accent, cx, robeBot - s * 5e-3, torsoHw * 1.25, s * 0.01, s * 6e-3, 0.35, xUpper);
      box(M.accent, cx, robeCy + robeHh * 0.3, s * 8e-3, robeHh * 0.5, s * 4e-3, 0.3, xUpper);
      for (const dir of [-1, 1]) {
        const ax = cx + dir * armX;
        const ang = dir < 0 ? pose.armL : pose.armR;
        box(M.torso, ax, armCy + armHh * 0.3, armHw * 1.5, armHh * 0.7, armHw * 0.4, 0.45, xArm(ang, ax, shoulderY));
      }
    }
    if (torsoMat === "chainmail") {
      const chainCol = [col.metal[0] * 0.8, col.metal[1] * 0.8, col.metal[2] * 0.85];
      const chainMat = MATERIALS.metal(chainCol);
      box(chainMat, cx, torsoCy + torsoHh * 0.1, torsoHw * 0.85, torsoHh * 0.7, s * 0.02, 0.5, xUpper);
    }
    if (torsoMat === "vest") {
      box(M.accent, cx, torsoTop + torsoHh * 0.2, s * 0.01, torsoHh * 0.6, s * 4e-3, 0.3, xUpper);
    }
    if (hasBelt) {
      box(M.leather, cx, torsoBot - s * 0.03, torsoHw * 1.02, s * 0.02, s * 0.01, 0.4, xUpper);
      box(M.gold, cx, torsoBot - s * 0.03, s * 0.015, s * 0.015, s * 6e-3, 0.55, xUpper);
    }
    if (hasCoat) {
      const coatTop = torsoTop;
      const coatBot = legCy + legHh * 0.35;
      const coatHh = (coatBot - coatTop) / 2;
      const coatCy = (coatTop + coatBot) / 2;
      box(M.torso, cx, coatCy, torsoHw * 1.15, coatHh, s * 0.03, 0.4, xUpper);
      box(M.torso, cx, torsoTop + s * 0.01, torsoHw * 0.65, s * 0.025, s * 0.015, 0.5, xUpper);
      box(M.accent, cx, coatBot - s * 0.01, torsoHw * 1.28, s * 0.014, s * 8e-3, 0.35, xUpper);
    }
    if (hasScarf) {
      box(M.accent, cx, torsoTop - s * 0.01, torsoHw * 0.72, s * 0.028, s * 0.015, 0.55, xUpper);
      box(M.accent, cx + torsoHw * 0.35, torsoTop + s * 0.03, s * 0.018, s * 0.04, s * 8e-3, 0.45, xUpper);
    }
    if (hasShoulderpads && !hasArmor) {
      for (const dir of [-1, 1]) {
        const ax = cx + dir * armX;
        box(M.accent, ax, shoulderY + armHw * 0.2, armHw * 1.3, armHw * 0.65, armHw * 0.5, 0.5, xUpper);
      }
    }
    if (hasArmor) {
      box(M.metal, cx, torsoTop + torsoHh * 0.62, torsoHw * 0.95, torsoHh * 0.6, s * 0.03, 0.55, xUpper);
      for (const dir of [-1, 1]) {
        const ax = cx + dir * armX;
        box(M.metal, ax, shoulderY + armHw * 0.4, armHw * 1.25, armHw * 0.95, armHw * 0.7, 0.55, xUpper);
      }
    }
    box(M.skin, cx, headCy, headHw, headHh, headCorner, 0.52, xHead());
    if (config.face !== false && facing !== "back") {
      const eyeY = headCy + headHh * 0.2;
      const lookSign = facing === "left" ? -1 : facing === "right" ? 1 : 0;
      const eyeDx = lookSign === 0 ? headHw * 0.42 : headHw * 0.26;
      const shift = lookSign * headHw * 0.3;
      const ew = headHw * 0.13, eh = headHh * 0.2;
      const eyeMat = { ...M.skin, name: "eye", base: [40, 34, 44], specStrength: 0.7, roughness: 0.3 };
      for (const dir of [-1, 1]) box(eyeMat, cx + shift + dir * eyeDx, eyeY, ew, eh, ew * 0.5, 0.4, xHead());
    }
    const showHair = hairStyle !== "bald" && !hairHidden;
    if (showHair && facing === "back") {
      box(M.hair, cx, headCy + headHh * 0.04, headHw * 0.96, headHh * 0.9, headCorner * 0.85, 0.42, xHead());
    } else if (showHair) {
      const fy = headCy - headHh * 0.52;
      const fr = union(
        roundedBox(cx, fy, headHw * 0.98, headHh * 0.34, headHw * 0.2),
        union(
          roundedBox(cx - headHw * 0.74, headCy - headHh * 0.12, headHw * 0.28, headHh * 0.5, headHw * 0.18),
          roundedBox(cx + headHw * 0.74, headCy - headHh * 0.12, headHw * 0.28, headHh * 0.5, headHw * 0.18)
        )
      );
      place(M.hair, fr, cx - headHw * 1.05, headCy - headHh * 1, cx + headHw * 1.05, headCy + headHh * 0.45, 0.4, xHead());
      if (hairStyle === "spiky") {
        for (let k = -2; k <= 2; k++) {
          const sx = cx + k * headHw * 0.42;
          place(
            M.hair,
            capsule(sx, headCy - headHh * 0.7, sx + k * headHw * 0.08, headCy - headHh * 1.25, headHw * 0.13),
            sx - headHw * 0.3,
            headCy - headHh * 1.4,
            sx + headHw * 0.3,
            headCy - headHh * 0.5,
            0.5,
            xHead()
          );
        }
      } else if (hairStyle === "bun") {
        box(M.hair, cx, headCy - headHh * 0.95, headHw * 0.42, headHh * 0.4, headHw * 0.4, 0.7, xHead());
      } else if (hairStyle === "long") {
        for (const dir of [-1, 1]) {
          box(M.hair, cx + dir * headHw * 0.92, headCy + headHh * 0.55, headHw * 0.22, headHh * 0.95, headHw * 0.18, 0.45, xHead());
        }
      } else if (hairStyle === "flowing") {
        box(M.hair, cx, headCy + headHh * 0.6, headHw * 1.12, headHh * 1.6, headHw * 0.3, 0.5, xHead());
        for (const dir of [-1, 1]) {
          box(M.hair, cx + dir * headHw * 0.85, headCy + headHh * 0.3, headHw * 0.26, headHh * 1.1, headHw * 0.2, 0.5, xHead());
        }
      } else if (hairStyle === "ponytail") {
        box(M.hair, cx, headCy - headHh * 0.85, headHw * 0.34, headHh * 0.32, headHw * 0.3, 0.7, xHead());
        place(
          M.hair,
          capsule(cx + headHw * 0.1, headCy - headHh * 0.7, cx + headHw * 0.5, headCy + headHh * 0.6, headHw * 0.18),
          cx - headHw * 0.2,
          headCy - headHh * 1,
          cx + headHw * 0.8,
          headCy + headHh * 0.9,
          0.5,
          xHead()
        );
      }
    }
    if (hat === "cap") {
      box(M.hat, cx, headCy - headHh * 0.62, headHw * 1.02, headHh * 0.5, headHw * 0.5, 0.5, xHead());
      box(M.hat, cx, headCy - headHh * 0.32, headHw * 1.18, headHh * 0.12, s * 0.01, 0.4, xHead());
    } else if (hat === "hat") {
      box(M.hat, cx, headCy - headHh * 0.78, headHw * 0.72, headHh * 0.5, headHw * 0.3, 0.45, xHead());
      box(M.hat, cx, headCy - headHh * 0.42, headHw * 1.55, headHh * 0.16, headHh * 0.12, 0.4, xHead());
    } else if (hat === "hood") {
      box(M.cape, cx, headCy - headHh * 0.3, headHw * 1.18, headHh * 0.9, headHw * 0.7, 0.6, xHead());
      for (const dir of [-1, 1]) {
        box(M.cape, cx + dir * headHw * 0.85, headCy + headHh * 0.2, headHw * 0.28, headHh * 0.65, headHw * 0.2, 0.5, xHead());
      }
    } else if (hat === "wizard") {
      box(M.hat, cx, headCy - headHh * 0.5, headHw * 1.06, headHh * 0.35, headHw * 0.4, 0.45, xHead());
      place(
        M.hat,
        capsule(cx, headCy - headHh * 0.75, cx + headHw * 0.3, headCy - headHh * 2, headHw * 0.45),
        cx - headHw * 0.6,
        headCy - headHh * 2.3,
        cx + headHw * 0.9,
        headCy - headHh * 0.5,
        0.55,
        xHead()
      );
      box(M.hat, cx, headCy - headHh * 0.3, headHw * 1.45, headHh * 0.1, headHh * 0.08, 0.4, xHead());
      box(M.accent, cx, headCy - headHh * 0.62, headHw * 0.9, s * 0.01, s * 5e-3, 0.4, xHead());
      place(
        M.gem,
        circle(cx, headCy - headHh * 0.75, s * 0.018),
        cx - s * 0.03,
        headCy - headHh * 0.8,
        cx + s * 0.03,
        headCy - headHh * 0.65,
        0.9,
        xHead()
      );
    } else if (hat === "crown") {
      box(M.hat, cx, headCy - headHh * 0.55, headHw * 1, headHh * 0.25, headHw * 0.2, 0.4, xHead());
      for (let k = -1; k <= 1; k++) {
        const px = cx + k * headHw * 0.5;
        place(
          M.hat,
          capsule(px, headCy - headHh * 0.7, px, headCy - headHh * 1.1, headHw * 0.14),
          px - headHw * 0.2,
          headCy - headHh * 1.3,
          px + headHw * 0.2,
          headCy - headHh * 0.6,
          0.55,
          xHead()
        );
      }
      place(
        M.gem,
        circle(cx, headCy - headHh * 0.75, s * 0.015),
        cx - s * 0.025,
        headCy - headHh * 0.8,
        cx + s * 0.025,
        headCy - headHh * 0.68,
        0.9,
        xHead()
      );
    } else if (hat === "helmet") {
      box(M.metal, cx, headCy - headHh * 0.15, headHw * 1.12, headHh * 0.95, headHw * 0.6, 0.55, xHead());
      const visorMat = { ...M.metal, base: [30, 28, 25] };
      box(visorMat, cx, headCy + headHh * 0.15, headHw * 0.75, headHh * 0.1, s * 8e-3, 0.3, xHead());
      box(M.metal, cx, headCy + headHh * 0.05, s * 0.012, headHh * 0.3, s * 6e-3, 0.4, xHead());
      box(M.metal, cx, headCy - headHh * 0.6, headHw * 0.15, headHh * 0.35, headHw * 0.12, 0.5, xHead());
    } else if (hat === "bandana") {
      box(M.hat, cx, headCy - headHh * 0.45, headHw * 1.08, headHh * 0.35, headHw * 0.45, 0.5, xHead());
      place(
        M.hat,
        capsule(cx + headHw * 0.7, headCy - headHh * 0.3, cx + headHw * 1.2, headCy + headHh * 0.1, headHw * 0.12),
        cx + headHw * 0.5,
        headCy - headHh * 0.5,
        cx + headHw * 1.4,
        headCy + headHh * 0.3,
        0.5,
        xHead()
      );
      place(
        M.hat,
        capsule(cx + headHw * 0.7, headCy - headHh * 0.25, cx + headHw * 1.1, headCy + headHh * 0.3, headHw * 0.1),
        cx + headHw * 0.5,
        headCy - headHh * 0.4,
        cx + headHw * 1.3,
        headCy + headHh * 0.5,
        0.45,
        xHead()
      );
    }
    if (hasCape && facing === "back") placeCape();
    const weapon = config.weapon ?? "none";
    if (weapon !== "none") {
      const ax = cx + armX;
      const handY = armCy + armHh + armHw * 1.1;
      const xf = xArm(pose.armR, ax, shoulderY);
      const guard = MATERIALS.metal([160, 140, 80]);
      if (weapon === "dagger") {
        const bLen = s * 0.1;
        box(guard, ax, handY, s * 0.04, s * 8e-3, s * 4e-3, 0.5, xf);
        place(
          M.metal,
          capsule(ax, handY + s * 8e-3, ax, handY + bLen, s * 0.016),
          ax - s * 0.03,
          handY - s * 0.01,
          ax + s * 0.03,
          handY + bLen + s * 0.02,
          0.6,
          xf
        );
      } else if (weapon === "sword") {
        const bLen = s * 0.2;
        box(guard, ax, handY, s * 0.06, s * 0.01, s * 6e-3, 0.5, xf);
        place(
          M.metal,
          capsule(ax, handY + s * 0.01, ax, handY + bLen, s * 0.02),
          ax - s * 0.04,
          handY - s * 0.01,
          ax + s * 0.04,
          handY + bLen + s * 0.02,
          0.6,
          xf
        );
        place(
          MATERIALS.metal([200, 210, 230]),
          capsule(ax + s * 8e-3, handY + s * 0.04, ax + s * 8e-3, handY + bLen - s * 0.02, Math.max(1, s * 4e-3)),
          ax - s * 0.02,
          handY + s * 0.02,
          ax + s * 0.03,
          handY + bLen,
          0.5,
          xf
        );
      } else if (weapon === "axe") {
        const shaftLen = s * 0.18;
        place(
          M.leather,
          capsule(ax, handY - s * 0.02, ax, handY + shaftLen, s * 0.014),
          ax - s * 0.03,
          handY - s * 0.04,
          ax + s * 0.03,
          handY + shaftLen + s * 0.02,
          0.7,
          xf
        );
        box(M.metal, ax + s * 0.04, handY + shaftLen * 0.15, s * 0.048, s * 0.058, s * 0.012, 0.5, xf);
      } else if (weapon === "staff") {
        const staffLen = s * 0.28;
        place(
          M.leather,
          capsule(ax, handY - staffLen * 0.45, ax, handY + staffLen * 0.55, s * 0.012),
          ax - s * 0.025,
          handY - staffLen * 0.5,
          ax + s * 0.025,
          handY + staffLen * 0.6,
          0.8,
          xf
        );
        const orbR = s * 0.026;
        const orbY = handY - staffLen * 0.45 - orbR;
        place(
          MATERIALS.gem([150, 70, 210]),
          circle(ax, orbY, orbR),
          ax - orbR - 2,
          orbY - orbR - 2,
          ax + orbR + 2,
          orbY + orbR + 2,
          0.9,
          xf
        );
      } else if (weapon === "bow") {
        const bowH = s * 0.22;
        const bowCx = ax + s * 0.02;
        place(
          M.leather,
          capsule(bowCx, handY - bowH * 0.5, bowCx + s * 0.04, handY - bowH * 0.15, s * 0.01),
          bowCx - s * 0.02,
          handY - bowH * 0.55,
          bowCx + s * 0.07,
          handY - bowH * 0.1,
          0.7,
          xf
        );
        place(
          M.leather,
          capsule(bowCx, handY + bowH * 0.5, bowCx + s * 0.04, handY + bowH * 0.15, s * 0.01),
          bowCx - s * 0.02,
          handY + bowH * 0.1,
          bowCx + s * 0.07,
          handY + bowH * 0.55,
          0.7,
          xf
        );
        place(
          M.leather,
          capsule(bowCx + s * 0.04, handY - bowH * 0.15, bowCx + s * 0.05, handY + bowH * 0.15, s * 8e-3),
          bowCx + s * 0.02,
          handY - bowH * 0.2,
          bowCx + s * 0.07,
          handY + bowH * 0.2,
          0.7,
          xf
        );
        place(
          MATERIALS.cloth([220, 220, 210]),
          capsule(bowCx, handY - bowH * 0.48, bowCx, handY + bowH * 0.48, Math.max(1, s * 3e-3)),
          bowCx - s * 0.01,
          handY - bowH * 0.52,
          bowCx + s * 0.01,
          handY + bowH * 0.52,
          0.4,
          xf
        );
      } else if (weapon === "mace") {
        const shaftLen = s * 0.16;
        place(
          M.leather,
          capsule(ax, handY - s * 0.01, ax, handY + shaftLen, s * 0.013),
          ax - s * 0.025,
          handY - s * 0.03,
          ax + s * 0.025,
          handY + shaftLen + s * 0.02,
          0.7,
          xf
        );
        const headY = handY + shaftLen;
        const headR = s * 0.038;
        place(
          M.metal,
          circle(ax, headY, headR),
          ax - headR - 2,
          headY - headR - 2,
          ax + headR + 2,
          headY + headR + 2,
          0.5,
          xf
        );
        const spikeLen = s * 0.018;
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2;
          const sx = ax + Math.cos(a) * (headR + spikeLen * 0.3);
          const sy = headY + Math.sin(a) * (headR + spikeLen * 0.3);
          place(
            M.metal,
            circle(sx, sy, Math.max(1.2, spikeLen * 0.6)),
            sx - spikeLen,
            sy - spikeLen,
            sx + spikeLen,
            sy + spikeLen,
            0.4,
            xf
          );
        }
      } else if (weapon === "wand") {
        const wandLen = s * 0.16;
        place(
          M.leather,
          capsule(ax, handY - s * 0.01, ax, handY + wandLen, s * 9e-3),
          ax - s * 0.02,
          handY - s * 0.03,
          ax + s * 0.02,
          handY + wandLen + s * 0.01,
          0.7,
          xf
        );
        const tipR = s * 0.018;
        const tipY = handY + wandLen;
        place(
          MATERIALS.gem([100, 200, 255]),
          circle(ax, tipY, tipR),
          ax - tipR - 2,
          tipY - tipR - 2,
          ax + tipR + 2,
          tipY + tipR + 2,
          0.85,
          xf
        );
        const starR = tipR * 0.5;
        place(
          MATERIALS.gem([200, 240, 255]),
          circle(ax, tipY, starR),
          ax - starR - 1,
          tipY - starR - 1,
          ax + starR + 1,
          tipY + starR + 1,
          0.95,
          xf
        );
      } else if (weapon === "hammer") {
        const shaftLen = s * 0.2;
        place(
          M.leather,
          capsule(ax, handY - s * 0.02, ax, handY + shaftLen, s * 0.014),
          ax - s * 0.03,
          handY - s * 0.04,
          ax + s * 0.03,
          handY + shaftLen + s * 0.02,
          0.7,
          xf
        );
        const headW = s * 0.065;
        const headH = s * 0.04;
        const headY = handY + shaftLen * 0.05;
        box(M.metal, ax, headY, headW, headH, s * 0.012, 0.45, xf);
      } else if (weapon === "fishing_rod") {
        const rodLen = s * 0.3;
        place(
          M.leather,
          capsule(ax, handY - rodLen * 0.35, ax, handY + rodLen * 0.65, s * 0.01),
          ax - s * 0.02,
          handY - rodLen * 0.4,
          ax + s * 0.02,
          handY + rodLen * 0.7,
          0.8,
          xf
        );
        const tipY = handY - rodLen * 0.35;
        const lineBot = tipY + s * 0.18;
        const lineMat = MATERIALS.cloth([200, 200, 190]);
        place(
          lineMat,
          capsule(ax, tipY, ax + s * 0.02, lineBot, Math.max(1, s * 3e-3)),
          ax - s * 0.01,
          tipY - s * 0.01,
          ax + s * 0.04,
          lineBot + s * 0.01,
          0.4,
          xf
        );
        const hookR = Math.max(1.2, s * 8e-3);
        place(
          M.metal,
          circle(ax + s * 0.02, lineBot, hookR),
          ax + s * 0.02 - hookR - 2,
          lineBot - hookR - 2,
          ax + s * 0.02 + hookR + 2,
          lineBot + hookR + 2,
          0.6,
          xf
        );
      }
    }
    if (config.shield) {
      const shX = cx - armX;
      const shY = armCy;
      const xf = xArm(pose.armL, shX, shoulderY);
      const shR = s * 0.055;
      place(
        M.metal,
        circle(shX - s * 0.012, shY, shR),
        shX - shR - s * 0.02,
        shY - shR - 2,
        shX + shR + 2,
        shY + shR + 2,
        0.55,
        xf
      );
      place(
        MATERIALS.metal([188, 183, 168]),
        circle(shX - s * 0.012, shY, shR * 0.35),
        shX - shR * 0.4 - s * 0.02,
        shY - shR * 0.4 - 2,
        shX + shR * 0.4 + 2,
        shY + shR * 0.4 + 2,
        0.7,
        xf
      );
    }
    return parts;
  }

  // src/anim/ik.ts
  var hyp = Math.hypot;
  function solveTwoBone(base, target, l1, l2, bend) {
    let dx = target.x - base.x;
    let dy = target.y - base.y;
    let dist = hyp(dx, dy) || 1e-6;
    const maxReach = l1 + l2;
    const minReach = Math.abs(l1 - l2);
    const clamped = Math.max(minReach + 1e-4, Math.min(maxReach - 1e-4, dist));
    const ux = dx / dist, uy = dy / dist;
    const fx = base.x + ux * clamped;
    const fy = base.y + uy * clamped;
    const cosA = (l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped);
    const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const baseAng = Math.atan2(fy - base.y, fx - base.x);
    const kneeAng = baseAng + bend * a;
    const knee = { x: base.x + Math.cos(kneeAng) * l1, y: base.y + Math.sin(kneeAng) * l1 };
    return { knee, foot: { x: fx, y: fy } };
  }
  function fabrik(joints, target, iterations = 8, lengths) {
    const n = joints.length;
    if (n === 0) return [];
    if (n === 1) return [{ ...joints[0] }];
    const L = lengths ?? joints.slice(1).map((p2, i) => hyp(p2.x - joints[i].x, p2.y - joints[i].y) || 1e-6);
    const total = L.reduce((s, v) => s + v, 0);
    const root = { x: joints[0].x, y: joints[0].y };
    const p = joints.map((j) => ({ x: j.x, y: j.y }));
    const rootToTarget = hyp(target.x - root.x, target.y - root.y);
    if (rootToTarget > total) {
      const ux = (target.x - root.x) / (rootToTarget || 1e-6);
      const uy = (target.y - root.y) / (rootToTarget || 1e-6);
      p[0] = { ...root };
      for (let i = 1; i < n; i++) p[i] = { x: p[i - 1].x + ux * L[i - 1], y: p[i - 1].y + uy * L[i - 1] };
      return p;
    }
    for (let it = 0; it < iterations; it++) {
      p[n - 1] = { x: target.x, y: target.y };
      for (let i = n - 2; i >= 0; i--) {
        const dx = p[i].x - p[i + 1].x, dy = p[i].y - p[i + 1].y;
        const d = hyp(dx, dy) || 1e-6;
        const r = L[i] / d;
        p[i] = { x: p[i + 1].x + dx * r, y: p[i + 1].y + dy * r };
      }
      p[0] = { ...root };
      for (let i = 1; i < n; i++) {
        const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y;
        const d = hyp(dx, dy) || 1e-6;
        const r = L[i - 1] / d;
        p[i] = { x: p[i - 1].x + dx * r, y: p[i - 1].y + dy * r };
      }
      if (hyp(p[n - 1].x - target.x, p[n - 1].y - target.y) < 1e-3) break;
    }
    return p;
  }

  // src/anim/spring.ts
  var TAU = Math.PI * 2;
  function smooth(x) {
    const t = x < 0 ? 0 : x > 1 ? 1 : x;
    return t * t * (3 - 2 * t);
  }
  function damp(t, freq = 2, decay = 4) {
    return Math.sin(t * TAU * freq) * Math.exp(-t * decay);
  }
  function lag(lead, phase, amount) {
    let p = (phase - amount) % 1;
    if (p < 0) p += 1;
    return lead(p);
  }
  function squash(amount) {
    const a = Math.max(-0.6, Math.min(0.6, amount));
    const sy = 1 + a;
    const sx = 1 / Math.sqrt(sy);
    return { sx, sy };
  }
  function pulse(phase, center, w) {
    const d = Math.abs(phase - center);
    if (d > w) return 0;
    return smooth(1 - d / w);
  }
  function wave(phase, cycles = 1, offset = 0) {
    return Math.sin((phase * cycles + offset) * TAU);
  }

  // src/creatures.ts
  var PI = Math.PI;
  function pushEllipse(parts, mat, cx, cy, rx, ry, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: ellipse(cx, cy, rx, ry),
      bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)]
    });
  }
  function pushCircle(parts, mat, cx, cy, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: circle(cx, cy, r),
      bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)]
    });
  }
  function pushCapsule(parts, mat, ax, ay, bx, by, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: capsule(ax, ay, bx, by, r),
      bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2), Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)]
    });
  }
  function ikLeg(parts, mat, hip, restFoot, l1, l2, bend, legR, phase, stride, tuck) {
    let gp = phase % 1;
    if (gp < 0) gp += 1;
    let fy, fx;
    if (gp < 0.5) {
      const u = gp / 0.5;
      fy = restFoot.y + (0.5 - u) * stride;
      fx = restFoot.x;
    } else {
      const u = (gp - 0.5) / 0.5;
      fy = restFoot.y + (-0.5 + u) * stride;
      fx = restFoot.x + Math.sin(u * PI) * tuck * Math.sign(restFoot.x - hip.x || 1) * -1;
    }
    const { knee, foot } = solveTwoBone(hip, { x: fx, y: fy }, l1, l2, bend);
    pushCapsule(parts, mat, hip.x, hip.y, knee.x, knee.y, legR, 0.9);
    pushCapsule(parts, mat, knee.x, knee.y, foot.x, foot.y, legR * 0.85, 0.9);
  }
  function eyeMaterial(alerted) {
    return alerted ? MATERIALS.ember([255, 70, 40]) : { ...MATERIALS.gem([60, 12, 14]), name: "eye" };
  }
  function defaultColor2(rng, kind) {
    const j = (c, amt) => [
      c[0] * (1 + rng.jitter(amt)),
      c[1] * (1 + rng.jitter(amt)),
      c[2] * (1 + rng.jitter(amt))
    ];
    switch (kind) {
      case "insect":
        return j([44, 50, 40], 0.18);
      case "worm":
        return j([122, 138, 70], 0.16);
      case "crawler":
        return j([138, 46, 44], 0.16);
      case "fire_elemental":
        return j([255, 120, 40], 0.12);
      case "shadow":
        return j([30, 25, 45], 0.1);
      case "burrower":
        return j([95, 75, 50], 0.14);
      case "bat":
        return j([60, 50, 70], 0.16);
      case "slime":
        return j([70, 180, 80], 0.2);
      case "undead":
        return j([200, 190, 175], 0.1);
      case "golem":
        return j([100, 95, 88], 0.12);
      case "ghost":
        return j([180, 200, 220], 0.1);
      default:
        return j([80, 80, 80], 0.15);
    }
  }
  function buildInsect(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const shell = MATERIALS.chitin(color);
    const eye = eyeMaterial(alerted);
    const bodyR = s * 0.17;
    const bob = wave(phase, 2) * s * 0.012 * amp;
    const abdomenCy = s * 0.62 + bob;
    const thoraxCy = s * 0.44 + bob;
    const headCy = s * 0.3 + bob;
    const legR = Math.max(1, s * 0.022);
    const l1 = s * 0.13, l2 = s * 0.13;
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const hip = { x: cx + dir * bodyR * 0.7, y: thoraxCy + (i - 1) * s * 0.1 };
        const restFoot = { x: cx + dir * s * (0.36 + i * 0.015), y: thoraxCy + (i - 1) * s * 0.12 + s * 0.06 };
        const tripod = (i + (dir < 0 ? 0 : 1)) % 2 * 0.5;
        ikLeg(parts, shell, hip, restFoot, l1, l2, dir < 0 ? 1 : -1, legR, phase + tripod, s * 0.07 * amp, s * 0.05 * amp);
      }
    }
    const antLag = lag((p) => wave(p, 2), phase, 0.12) * amp;
    for (const dir of [-1, 1]) {
      pushCapsule(
        parts,
        shell,
        cx + dir * bodyR * 0.4,
        headCy - s * 0.02,
        cx + dir * s * 0.16 + dir * antLag * s * 0.03,
        headCy - s * 0.18 + antLag * s * 0.02,
        Math.max(1, s * 0.012),
        0.9
      );
    }
    const sq = squash(wave(phase, 2) * 0.05 * amp);
    pushEllipse(parts, shell, cx, abdomenCy, bodyR * 1.18 * sq.sx, bodyR * 1.4 * sq.sy, 1);
    pushEllipse(parts, shell, cx, thoraxCy, bodyR * sq.sx, bodyR * 0.95 * sq.sy, 1);
    pushCircle(parts, shell, cx, headCy, bodyR * 0.72, 1);
    const mand = (0.5 + 0.5 * wave(phase, 4)) * bodyR * 0.18 * amp;
    for (const dir of [-1, 1]) {
      pushCapsule(
        parts,
        shell,
        cx + dir * bodyR * 0.4,
        headCy + bodyR * 0.4,
        cx + dir * (bodyR * 0.85 + mand),
        headCy + bodyR * 0.8,
        legR * 0.9,
        0.85
      );
    }
    const eyeDx = bodyR * 0.42, eyeR = bodyR * 0.2;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, headCy - bodyR * 0.05, eyeR, 0.7);
    return parts;
  }
  function buildWorm(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const flesh = MATERIALS.flesh(color);
    const segs = 6;
    const baseY = s * 0.86, topY = s * 0.22;
    const lateral = rng.range(0.05, 0.085) * s * amp;
    const seedPhase = rng.range(0, PI * 2);
    const travel = phase * PI * 2;
    let topCx = cx, topR = 0, topCy = topY;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const cy = baseY + (topY - baseY) * t - wave(phase, 1) * s * 0.02 * amp * t;
      const segCx = cx + Math.sin(seedPhase + t * PI * 1.6 - travel) * lateral * (0.2 + t);
      const r = s * (0.16 - 0.085 * t);
      pushEllipse(parts, flesh, segCx, cy, r * 1.02, r * 1.18, 1);
      if (i === segs - 1) {
        topCx = segCx;
        topR = r;
        topCy = cy;
      }
    }
    const open = 0.5 + 0.5 * wave(phase, 2) * amp;
    const bone = MATERIALS.bone([200, 196, 176]);
    const maw = { ...MATERIALS.flesh([46, 30, 34]), name: "maw" };
    pushCircle(parts, maw, topCx, topCy, topR * (0.6 + 0.35 * open), 1);
    const teeth = 7;
    for (let k = 0; k < teeth; k++) {
      const a = k / teeth * PI * 2 + seedPhase;
      const ringR = topR * (0.55 + 0.25 * open);
      const tx = topCx + Math.cos(a) * ringR;
      const ty = topCy + Math.sin(a) * ringR;
      const ix = topCx + Math.cos(a) * topR * 0.25;
      const iy = topCy + Math.sin(a) * topR * 0.25;
      pushCapsule(parts, bone, tx, ty, ix, iy, Math.max(1, topR * 0.12), 0.85);
    }
    if (alerted) {
      const eye = eyeMaterial(true);
      for (const dir of [-1, 1]) pushCircle(parts, eye, topCx + dir * topR * 0.5, topCy + topR * 1.2, topR * 0.22, 0.7);
    }
    return parts;
  }
  function buildCrawler(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const flesh = MATERIALS.flesh(color);
    const shell = MATERIALS.chitin([color[0] * 0.5, color[1] * 0.4, color[2] * 0.4]);
    const eye = eyeMaterial(alerted);
    const bob = wave(phase, 2) * s * 0.01 * amp;
    const bodyCy = s * 0.56 + bob;
    const bodyHx = s * 0.3, bodyHy = s * 0.17;
    const legR = Math.max(1, s * 0.024);
    const l1 = s * 0.12, l2 = s * 0.12;
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const hip = { x: cx + dir * bodyHx * 0.55, y: bodyCy - bodyHy * 0.4 + (i - 1.5) * s * 0.05 };
        const restFoot = { x: cx + dir * s * (0.4 + i % 2 * 0.03), y: bodyCy + s * 0.14 + (i - 1.5) * s * 0.02 };
        const off = (i + (dir < 0 ? 0 : 1)) % 2 * 0.5;
        ikLeg(parts, shell, hip, restFoot, l1, l2, dir < 0 ? 1 : -1, legR, phase * 1.5 + off, s * 0.06 * amp, s * 0.045 * amp);
      }
    }
    const snap = (alerted ? 1 : 0.5) * (0.5 + 0.5 * wave(phase, alerted ? 3 : 1.5)) * s * 0.03 * amp;
    for (const dir of [-1, 1]) {
      const baseX = cx + dir * bodyHx * 0.5;
      const baseY = bodyCy + bodyHy * 0.5;
      const tipX = cx + dir * s * 0.2, tipY = bodyCy + s * 0.2;
      pushCapsule(parts, shell, baseX, baseY, tipX, tipY, legR * 1.3, 0.9);
      pushCapsule(parts, shell, tipX, tipY, cx + dir * (s * 0.13 - snap), tipY + s * 0.08 + snap, legR, 0.85);
    }
    const sq = squash(wave(phase, 2) * 0.04 * amp);
    pushEllipse(parts, flesh, cx, bodyCy, bodyHx * sq.sx, bodyHy * sq.sy, 1);
    pushEllipse(parts, shell, cx, bodyCy - bodyHy * 0.35, bodyHx * 0.7, bodyHy * 0.8, 1);
    const spikes = 3;
    for (let k = 0; k < spikes; k++) {
      const sx = cx + (k - (spikes - 1) / 2) * s * 0.11;
      pushCapsule(parts, shell, sx, bodyCy - bodyHy * 0.5, sx, bodyCy - bodyHy * 1.15, Math.max(1, s * 0.02), 0.8);
    }
    const eyeDx = bodyHx * 0.4, eyeY = bodyCy + bodyHy * 0.55, eyeR = s * 0.03;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, eyeY, eyeR, 0.7);
    return parts;
  }
  function buildFireElemental(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const flame = MATERIALS.ember(color);
    const core = MATERIALS.ember([255, 240, 160]);
    const eye = eyeMaterial(alerted);
    const breathe = 1 + wave(phase, 2) * 0.08 * amp;
    const flick = wave(phase, 3.7) * s * 0.02 * amp;
    const bob = wave(phase, 1.5) * s * 0.015 * amp;
    const bodyCy = s * 0.52 + bob;
    const bodyRx = s * 0.18 * breathe;
    const bodyRy = s * 0.22 * breathe;
    pushEllipse(parts, flame, cx + flick * 0.5, bodyCy + s * 0.08, bodyRx * 1.1, bodyRy * 0.6, 1);
    pushEllipse(parts, flame, cx + flick, bodyCy, bodyRx, bodyRy, 1);
    pushEllipse(parts, core, cx + flick * 0.3, bodyCy + s * 0.02, bodyRx * 0.5, bodyRy * 0.55, 1);
    const topY = bodyCy - bodyRy * 0.7;
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + phase * Math.PI * 2;
      const wr = s * (0.04 + 0.015 * wave(phase, 4, i * 0.33));
      const wx = cx + Math.cos(a) * bodyRx * 0.8 + flick;
      const wy = topY + Math.sin(a) * bodyRy * 0.3;
      pushCircle(parts, flame, wx, wy, Math.max(1.5, wr * amp + wr * 0.5), 1);
    }
    const eyeDx = bodyRx * 0.35;
    const eyeR = s * 0.03;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx + flick, bodyCy - bodyRy * 0.1, eyeR, 0.7);
    return parts;
  }
  function buildShadow(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const dark = MATERIALS.cloth(color);
    const wisp = MATERIALS.gem([80, 60, 140]);
    const eye = alerted ? MATERIALS.ember([255, 40, 40]) : MATERIALS.gem([140, 100, 255]);
    const drift = wave(phase, 0.7) * s * 0.02 * amp;
    const pulse2 = 1 + wave(phase, 1.3) * 0.06 * amp;
    const bodyCy = s * 0.5 + drift;
    pushEllipse(parts, dark, cx, bodyCy + s * 0.1, s * 0.24 * pulse2, s * 0.12, 0.8);
    pushEllipse(parts, dark, cx, bodyCy, s * 0.2 * pulse2, s * 0.25 * pulse2, 1);
    pushEllipse(
      parts,
      { ...dark, base: [color[0] * 0.6, color[1] * 0.6, color[2] * 0.7] },
      cx,
      bodyCy - s * 0.05,
      s * 0.14 * pulse2,
      s * 0.18 * pulse2,
      1
    );
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + phase * Math.PI;
      const wr = s * 0.025;
      const wx = cx + Math.cos(a) * s * 0.22;
      const wy = bodyCy + Math.sin(a) * s * 0.15;
      const wampPhase = (phase + i * 0.33) % 1;
      const wamp = 0.3 + 0.7 * (0.5 + 0.5 * wave(wampPhase, 1));
      pushCircle(parts, wisp, wx, wy, Math.max(1, wr * wamp * amp), 0.9);
    }
    const eyeDx = s * 0.06;
    const eyeR = s * 0.025;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, bodyCy - s * 0.06, eyeR, 0.8);
    return parts;
  }
  function buildBurrower(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const shell = MATERIALS.chitin(color);
    const dirt = MATERIALS.bone([color[0] * 0.6, color[1] * 0.55, color[2] * 0.5]);
    const eye = eyeMaterial(alerted);
    const emerge = 0.3 + 0.7 * (0.5 + 0.5 * wave(phase, 0.5)) * amp;
    const segs = 4;
    const baseY = s * 0.85;
    const topY = baseY - s * 0.55 * emerge;
    pushEllipse(parts, dirt, cx, baseY, s * 0.22, s * 0.06, 0.3);
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const segY = baseY + (topY - baseY) * t;
      if (segY > baseY - s * 0.02) continue;
      const segR = s * (0.14 - t * 0.04);
      const sway = wave(phase, 1.5) * s * 0.01 * amp * t;
      pushEllipse(parts, shell, cx + sway, segY, segR, segR * 0.8, 1);
    }
    if (emerge > 0.5) {
      const headY = topY;
      const headR = s * 0.12;
      pushCircle(parts, shell, cx, headY, headR, 1);
      const jawOpen = (0.5 + 0.5 * wave(phase, 2)) * s * 0.02 * amp;
      for (const dir of [-1, 1]) {
        pushCapsule(
          parts,
          shell,
          cx + dir * headR * 0.5,
          headY + headR * 0.6,
          cx + dir * (headR * 0.9 + jawOpen),
          headY + headR * 0.9,
          Math.max(1, s * 0.02),
          0.85
        );
      }
      for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * headR * 0.35, headY - headR * 0.15, s * 0.02, 0.7);
    }
    return parts;
  }
  function buildBat(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const skin = MATERIALS.flesh(color);
    const eye = eyeMaterial(alerted);
    const flapAngle = wave(phase, 3) * 0.6 * amp;
    const bob = wave(phase, 3) * s * 0.02 * amp;
    const bodyCy = s * 0.5 + bob;
    const bodyR = s * 0.08;
    for (const dir of [-1, 1]) {
      const wingTip = flapAngle * dir;
      const wx = cx + dir * s * 0.28;
      const wy = bodyCy - s * 0.05 + Math.abs(wingTip) * s * 0.15;
      pushCapsule(parts, skin, cx + dir * bodyR * 0.6, bodyCy - s * 0.02, wx, wy, Math.max(1.5, s * 0.03), 0.7);
      pushCapsule(
        parts,
        skin,
        wx,
        wy,
        wx + dir * s * 0.08,
        wy + s * 0.1 + wingTip * s * 0.08,
        Math.max(1, s * 0.018),
        0.6
      );
    }
    pushEllipse(parts, skin, cx, bodyCy, bodyR, bodyR * 1.1, 1);
    const earR = s * 0.03;
    for (const dir of [-1, 1]) {
      pushCapsule(
        parts,
        skin,
        cx + dir * bodyR * 0.5,
        bodyCy - bodyR,
        cx + dir * bodyR * 0.7,
        bodyCy - bodyR - s * 0.06,
        Math.max(1, earR),
        0.8
      );
    }
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * bodyR * 0.4, bodyCy - bodyR * 0.15, s * 0.015, 0.7);
    return parts;
  }
  function buildSlime(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const gel = MATERIALS.glass(color);
    const gelDark = MATERIALS.glass([color[0] * 0.6, color[1] * 0.65, color[2] * 0.6]);
    const eye = eyeMaterial(alerted);
    const bounce = Math.abs(wave(phase, 2)) * amp;
    const sq = squash(bounce * -0.3);
    const bodyCy = s * 0.58 - bounce * s * 0.06;
    const bodyRx = s * 0.22 * sq.sx;
    const bodyRy = s * 0.18 * sq.sy;
    pushEllipse(parts, gelDark, cx, bodyCy + bodyRy * 0.3, bodyRx * 0.9, bodyRy * 0.4, 0.8);
    pushEllipse(parts, gel, cx, bodyCy, bodyRx, bodyRy, 1);
    const highlightR = s * 0.04;
    pushCircle(parts, MATERIALS.glass([
      Math.min(255, color[0] + 80),
      Math.min(255, color[1] + 80),
      Math.min(255, color[2] + 60)
    ]), cx - bodyRx * 0.3, bodyCy - bodyRy * 0.4, highlightR, 0.9);
    const eyeDx = bodyRx * 0.3;
    const eyeR = s * 0.022;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, bodyCy - bodyRy * 0.15, eyeR, 0.7);
    return parts;
  }
  function buildUndead(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const bone = MATERIALS.bone(color);
    const boneDark = MATERIALS.bone([color[0] * 0.7, color[1] * 0.7, color[2] * 0.65]);
    const eye = eyeMaterial(alerted);
    const sway = wave(phase, 1) * s * 0.02 * amp;
    const bob = wave(phase, 2) * s * 8e-3 * amp;
    const headCy = s * 0.22 + bob;
    const torsoCy = s * 0.42 + bob;
    const hipCy = s * 0.58 + bob;
    for (const dir of [-1, 1]) {
      const legPhase = dir < 0 ? phase : (phase + 0.5) % 1;
      const legSway = wave(legPhase, 1) * s * 0.03 * amp;
      pushCapsule(
        parts,
        bone,
        cx + dir * s * 0.06 + sway,
        hipCy,
        cx + dir * s * 0.08 + sway + legSway,
        s * 0.72 + bob,
        Math.max(1, s * 0.025),
        0.8
      );
      pushCapsule(
        parts,
        bone,
        cx + dir * s * 0.08 + sway + legSway,
        s * 0.72 + bob,
        cx + dir * s * 0.1 + sway + legSway * 0.5,
        s * 0.88,
        Math.max(1, s * 0.02),
        0.75
      );
    }
    for (let i = 0; i < 3; i++) {
      const ribY = torsoCy - s * 0.06 + i * s * 0.05;
      pushCapsule(
        parts,
        boneDark,
        cx - s * 0.09 + sway,
        ribY,
        cx + s * 0.09 + sway,
        ribY,
        Math.max(1, s * 0.012),
        0.6
      );
    }
    pushCapsule(parts, bone, cx + sway, torsoCy - s * 0.1, cx + sway, hipCy, Math.max(1, s * 0.03), 0.7);
    const armRaise = alerted ? -s * 0.12 : 0;
    for (const dir of [-1, 1]) {
      const armDangle = wave(phase, 1, dir < 0 ? 0 : 0.5) * s * 0.015 * amp;
      pushCapsule(
        parts,
        bone,
        cx + dir * s * 0.12 + sway,
        torsoCy - s * 0.06,
        cx + dir * s * 0.18 + sway + armDangle,
        torsoCy + s * 0.1 + armRaise,
        Math.max(1, s * 0.02),
        0.75
      );
      pushCapsule(
        parts,
        bone,
        cx + dir * s * 0.18 + sway + armDangle,
        torsoCy + s * 0.1 + armRaise,
        cx + dir * s * 0.2 + sway + armDangle,
        torsoCy + s * 0.22 + armRaise,
        Math.max(1, s * 0.015),
        0.7
      );
    }
    const headR = s * 0.1;
    pushCircle(parts, bone, cx + sway, headCy, headR, 0.9);
    const eyeDx = headR * 0.4;
    const eyeR = s * 0.022;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx + sway, headCy - headR * 0.1, eyeR, 0.7);
    pushCapsule(
      parts,
      boneDark,
      cx - headR * 0.3 + sway,
      headCy + headR * 0.6,
      cx + headR * 0.3 + sway,
      headCy + headR * 0.6,
      Math.max(1, s * 0.015),
      0.6
    );
    return parts;
  }
  function buildGolem(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const stone = MATERIALS.bone(color);
    const stoneDark = MATERIALS.bone([color[0] * 0.75, color[1] * 0.75, color[2] * 0.72]);
    const eye = MATERIALS.ember(alerted ? [255, 100, 30] : [220, 140, 40]);
    const bob = wave(phase, 0.5) * s * 0.02 * amp;
    const bodyCy = s * 0.44 + bob;
    for (const dir of [-1, 1]) {
      const legPhase = dir < 0 ? phase : (phase + 0.5) % 1;
      const legLift = Math.max(0, wave(legPhase, 0.5)) * s * 0.02 * amp;
      pushCapsule(
        parts,
        stoneDark,
        cx + dir * s * 0.1,
        s * 0.62 + bob,
        cx + dir * s * 0.12,
        s * 0.82 - legLift,
        Math.max(1.5, s * 0.055),
        0.6
      );
      pushEllipse(parts, stoneDark, cx + dir * s * 0.12, s * 0.84 - legLift, s * 0.07, s * 0.03, 0.5);
    }
    pushEllipse(parts, stone, cx, bodyCy, s * 0.22, s * 0.2, 0.7);
    pushEllipse(parts, stoneDark, cx, bodyCy - s * 0.02, s * 0.16, s * 0.14, 0.6);
    for (const dir of [-1, 1]) {
      const armSwing = wave(phase, 0.5, dir < 0 ? 0 : 0.5) * s * 0.015 * amp;
      pushCapsule(
        parts,
        stone,
        cx + dir * s * 0.22,
        bodyCy - s * 0.06,
        cx + dir * s * 0.28 + armSwing,
        bodyCy + s * 0.16,
        Math.max(1.5, s * 0.045),
        0.65
      );
      pushCircle(parts, stoneDark, cx + dir * s * 0.28 + armSwing, bodyCy + s * 0.18, s * 0.04, 0.5);
    }
    const headCy = bodyCy - s * 0.24 + bob;
    pushEllipse(parts, stone, cx, headCy, s * 0.12, s * 0.1, 0.65);
    const eyeDx = s * 0.05;
    const eyeR = s * 0.02;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, headCy, eyeR, 0.8);
    return parts;
  }
  function buildGhost(rng, s, color, alerted, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const ether = MATERIALS.glass(color);
    const etherDark = MATERIALS.glass([color[0] * 0.8, color[1] * 0.82, color[2] * 0.85]);
    const eye = MATERIALS.ember(alerted ? [255, 60, 40] : [160, 220, 255]);
    const float = wave(phase, 1) * s * 0.03 * amp;
    const bodyCy = s * 0.42 + float;
    for (let i = 0; i < 3; i++) {
      const wispX = cx + (i - 1) * s * 0.08;
      const wispWave = wave(phase, 2, i * 0.33) * s * 0.03 * amp;
      pushCapsule(
        parts,
        etherDark,
        wispX,
        bodyCy + s * 0.18,
        wispX + wispWave,
        bodyCy + s * 0.36 + i * s * 0.02,
        Math.max(1, s * 0.018),
        0.7
      );
    }
    pushEllipse(parts, ether, cx, bodyCy, s * 0.18, s * 0.22, 0.9);
    pushEllipse(parts, ether, cx, bodyCy + s * 0.14, s * 0.12, s * 0.1, 0.85);
    pushEllipse(parts, ether, cx, bodyCy - s * 0.12, s * 0.14, s * 0.12, 0.95);
    const eyeDx = s * 0.055;
    const eyeR = s * 0.022;
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, bodyCy - s * 0.12, eyeR, 0.8);
    return parts;
  }
  function buildCreature(config, s, phase = 0, amp = 1) {
    const rng = new RNG(config.seed ?? 0);
    const kind = config.kind ?? "insect";
    const color = config.color ?? defaultColor2(rng, kind);
    const alerted = config.alerted ?? false;
    switch (kind) {
      case "worm":
        return buildWorm(rng, s, color, alerted, phase, amp);
      case "crawler":
        return buildCrawler(rng, s, color, alerted, phase, amp);
      case "fire_elemental":
        return buildFireElemental(rng, s, color, alerted, phase, amp);
      case "shadow":
        return buildShadow(rng, s, color, alerted, phase, amp);
      case "burrower":
        return buildBurrower(rng, s, color, alerted, phase, amp);
      case "bat":
        return buildBat(rng, s, color, alerted, phase, amp);
      case "slime":
        return buildSlime(rng, s, color, alerted, phase, amp);
      case "undead":
        return buildUndead(rng, s, color, alerted, phase, amp);
      case "golem":
        return buildGolem(rng, s, color, alerted, phase, amp);
      case "ghost":
        return buildGhost(rng, s, color, alerted, phase, amp);
      case "insect":
      default:
        return buildInsect(rng, s, color, alerted, phase, amp);
    }
  }
  var CREATURE_KINDS = ["insect", "worm", "crawler", "fire_elemental", "shadow", "burrower", "bat", "slime", "undead", "golem", "ghost"];

  // src/items.ts
  var PI2 = Math.PI;
  function pushEllipse2(parts, mat, cx, cy, rx, ry, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: ellipse(cx, cy, rx, ry),
      bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)]
    });
  }
  function pushCircle2(parts, mat, cx, cy, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: circle(cx, cy, r),
      bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)]
    });
  }
  function pushCapsule2(parts, mat, ax, ay, bx, by, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: capsule(ax, ay, bx, by, r),
      bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2), Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)]
    });
  }
  function pushBox(parts, mat, cx, cy, hx, hy, corner, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: roundedBox(cx, cy, hx, hy, corner),
      bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)]
    });
  }
  function pushRotBox(parts, mat, cx, cy, hx, hy, corner, angle, roundness) {
    const base = roundedBox(cx, cy, hx, hy, corner);
    const sdf = rotatedAround(base, angle, cx, cy);
    parts.push({
      material: mat,
      roundness,
      sdf,
      bbox: transformedAABB(cx - hx, cy - hy, cx + hx, cy + hy, angle, cx, cy, 0, 0)
    });
  }
  function defaultColor3(rng, kind) {
    const j = (c, amt) => [
      c[0] * (1 + rng.jitter(amt)),
      c[1] * (1 + rng.jitter(amt)),
      c[2] * (1 + rng.jitter(amt))
    ];
    switch (kind) {
      case "mushroom":
        return j([176, 58, 52], 0.16);
      // red cap
      case "crystal":
        return j([96, 178, 214], 0.14);
      // cyan gem
      case "dagger":
        return j([122, 132, 150], 0.1);
      // cold steel
      case "torch":
        return j([255, 150, 50], 0.1);
      // flame
      case "potion":
        return j([90, 210, 130], 0.18);
      // liquid
      case "coin":
        return j([220, 180, 70], 0.08);
      // gold
      case "rune":
        return j([150, 110, 230], 0.16);
      // arcane glyph
      case "chest":
        return j([140, 95, 55], 0.12);
      // wood
      case "key":
        return j([220, 190, 80], 0.08);
      // gold
      case "scroll":
        return j([230, 215, 180], 0.06);
      // parchment
      case "meat":
        return j([160, 60, 50], 0.14);
      // raw meat
      case "lantern":
        return j([220, 200, 120], 0.1);
      // warm light
      case "ore":
        return j([140, 145, 155], 0.08);
      // iron ore
      case "firestone":
        return j([255, 100, 30], 0.12);
      // fire stone
      case "bone_shard":
        return j([200, 192, 175], 0.08);
      // bone fragment
      case "fish":
        return j([210, 185, 175], 0.1);
      // pale cave fish
      default:
        return j([180, 180, 180], 0.1);
    }
  }
  function buildMushroom(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const sway = wave(phase, 1) * s * 0.012 * amp;
    const stem = MATERIALS.flesh([224, 212, 190]);
    const cap = MATERIALS.flesh(color);
    const spot = MATERIALS.bone([238, 232, 214]);
    pushCapsule2(parts, stem, cx - s * 0.02, s * 0.78, cx + sway, s * 0.52, s * 0.07, 1);
    const capCy = s * 0.46, capRx = s * 0.26, capRy = s * 0.18;
    pushEllipse2(parts, cap, cx + sway, capCy, capRx, capRy, 1);
    pushEllipse2(parts, cap, cx + sway, capCy + capRy * 0.55, capRx * 0.92, capRy * 0.4, 1);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = rng.range(-1, 1) * 0.9;
      const sx = cx + sway + a * capRx * 0.7;
      const sy = capCy - capRy * 0.2 + rng.jitter(capRy * 0.3);
      pushCircle2(parts, spot, sx, sy, s * (0.03 + rng.range(0, 0.015)), 0.8);
    }
    return parts;
  }
  function buildCrystal(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5, baseY = s * 0.74;
    const pulse2 = 0.5 + 0.5 * wave(phase, 1);
    const glow = pulse2 * amp;
    const hiColor = [
      Math.min(255, color[0] + 60 + 40 * glow),
      Math.min(255, color[1] + 60 + 40 * glow),
      Math.min(255, color[2] + 60 + 40 * glow)
    ];
    const gem = MATERIALS.gem(color);
    const gemDim = MATERIALS.gem([color[0] * 0.7, color[1] * 0.72, color[2] * 0.78]);
    pushRotBox(parts, gemDim, cx - s * 0.13, baseY - s * 0.12, s * 0.05, s * 0.16, s * 0.02, -0.35 + rng.jitter(0.1), 0.9);
    pushRotBox(parts, gemDim, cx + s * 0.14, baseY - s * 0.1, s * 0.045, s * 0.14, s * 0.02, 0.4 + rng.jitter(0.1), 0.9);
    pushRotBox(parts, gem, cx + s * 0.01, baseY - s * 0.18, s * 0.07, s * 0.24, s * 0.025, rng.jitter(0.12), 0.9);
    pushCircle2(parts, MATERIALS.gem(hiColor), cx + s * 0.01, baseY - s * 0.36, s * (0.03 + 0.01 * glow), 0.8);
    return parts;
  }
  function buildDagger(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const steel = MATERIALS.metal(color);
    const guard = MATERIALS.metal([150, 120, 70]);
    const grip = MATERIALS.leather([70, 50, 44]);
    const pommel = MATERIALS.gem([150, 70, 190]);
    pushEllipse2(parts, steel, cx, s * 0.36, s * 0.055, s * 0.28, 0.7);
    pushCapsule2(parts, MATERIALS.metal([170, 178, 196]), cx, s * 0.2, cx, s * 0.52, Math.max(1, s * 0.012), 0.6);
    pushBox(parts, guard, cx, s * 0.66, s * 0.16, s * 0.03, s * 0.015, 0.6);
    pushCapsule2(parts, grip, cx, s * 0.7, cx, s * 0.84, s * 0.035, 1);
    pushCircle2(parts, pommel, cx, s * 0.87, s * 0.045, 0.85);
    const glintY = s * (0.14 + 0.4 * ((phase * amp + 0.5) % 1));
    pushCircle2(parts, MATERIALS.metal([230, 240, 255]), cx + s * 0.03, glintY, Math.max(1, s * 0.014), 0.5);
    return parts;
  }
  function buildTorch(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const grip = MATERIALS.leather([86, 58, 40]);
    const head = MATERIALS.bone([60, 50, 46]);
    const flame = MATERIALS.ember(color);
    const flameHi = MATERIALS.ember([255, 235, 140]);
    pushCapsule2(parts, grip, cx, s * 0.86, cx, s * 0.48, s * 0.04, 1);
    pushCircle2(parts, head, cx, s * 0.46, s * 0.07, 0.9);
    const seedFlick = rng.jitter(s * 0.02);
    const flick = seedFlick + wave(phase, 3) * s * 0.025 * amp;
    const breathe = 1 + wave(phase, 2) * 0.12 * amp;
    const fy = s * 0.3 + wave(phase, 1.5) * s * 0.015 * amp;
    pushEllipse2(parts, flame, cx + flick, fy, s * 0.1 * breathe, s * 0.16 * breathe, 1);
    pushEllipse2(parts, flameHi, cx + flick * 0.4, fy + s * 0.02, s * 0.05, s * 0.1 * breathe, 1);
    return parts;
  }
  function buildPotion(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const glass = MATERIALS.glass([200, 220, 230]);
    const liquid = MATERIALS.ember(color);
    const cork = MATERIALS.leather([150, 110, 70]);
    pushEllipse2(parts, liquid, cx, s * 0.62, s * 0.18, s * 0.16, 1);
    pushCircle2(parts, glass, cx, s * 0.6, s * 0.21, 1);
    pushBox(parts, glass, cx, s * 0.36, s * 0.07, s * 0.1, s * 0.03, 0.8);
    const glow = 0.5 + 0.5 * wave(phase, 1.5);
    const glowAmt = 0.5 + 0.5 * glow * amp;
    const liqGlow = [
      Math.min(255, color[0] * glowAmt),
      Math.min(255, color[1] * glowAmt),
      Math.min(255, color[2] * glowAmt)
    ];
    pushEllipse2(parts, MATERIALS.ember(liqGlow), cx, s * 0.64, s * 0.14, s * 0.1, 1);
    const glintAngle = phase * PI2 * 2;
    const glintX = cx + Math.cos(glintAngle) * s * 0.1;
    const glintY = s * 0.52 + Math.sin(glintAngle) * s * 0.06;
    pushCircle2(parts, MATERIALS.glass([255, 255, 255]), glintX, glintY, Math.max(1, s * 0.025), 0.7);
    pushBox(parts, cork, cx, s * 0.26, s * 0.06, s * 0.05, s * 0.02, 0.9);
    return parts;
  }
  function buildCoin(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5, cy = s * 0.54;
    const gold = MATERIALS.gold(color);
    const goldDim = MATERIALS.gold([color[0] * 0.78, color[1] * 0.78, color[2] * 0.7]);
    const spin = Math.cos(phase * PI2 * 2) * amp;
    const rxScale = 0.6 + 0.4 * Math.abs(spin);
    pushEllipse2(parts, goldDim, cx + s * 0.05, cy + s * 0.06, s * 0.2 * rxScale, s * 0.16, 1);
    pushEllipse2(parts, gold, cx, cy, s * 0.21 * rxScale, s * 0.17, 1);
    pushEllipse2(parts, goldDim, cx, cy, s * 0.13 * rxScale, s * 0.1, 1);
    const glintX = cx + s * 0.12 * spin;
    pushCircle2(parts, MATERIALS.gold([255, 240, 190]), glintX, cy - s * 0.05, Math.max(1, s * 0.03), 0.7);
    return parts;
  }
  function buildRune(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5, cy = s * 0.52;
    const stone = MATERIALS.bone([70, 66, 74]);
    pushBox(parts, stone, cx, cy, s * 0.18, s * 0.24, s * 0.05, 0.85);
    const strokes = 3 + Math.floor(rng.float() * 3);
    for (let i = 0; i < strokes; i++) {
      const ax = cx + rng.jitter(s * 0.09), ay = cy + rng.jitter(s * 0.14);
      const bx = cx + rng.jitter(s * 0.09), by = cy + rng.jitter(s * 0.14);
      const strokePhase = (phase + i / strokes) % 1;
      const bright = 0.5 + 0.5 * wave(strokePhase, 1) * amp;
      const glowColor = [
        Math.min(255, color[0] * (0.6 + 0.6 * bright)),
        Math.min(255, color[1] * (0.6 + 0.6 * bright)),
        Math.min(255, color[2] * (0.6 + 0.6 * bright))
      ];
      pushCapsule2(parts, MATERIALS.ember(glowColor), ax, ay, bx, by, Math.max(1, s * 0.014), 0.7);
    }
    return parts;
  }
  function buildChest(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const wood = MATERIALS.leather(color);
    const band = MATERIALS.metal([115, 105, 88]);
    const clasp = MATERIALS.gold([220, 190, 80]);
    const open = (0.5 + 0.5 * wave(phase, 0.5)) * amp;
    const lidLift = open * s * 0.08;
    pushBox(parts, wood, cx, s * 0.58, s * 0.24, s * 0.18, s * 0.03, 0.3);
    pushBox(parts, wood, cx, s * 0.38 - lidLift, s * 0.24, s * 0.08, s * 0.04, 0.4);
    pushBox(parts, band, cx, s * 0.45 - lidLift, s * 0.26, s * 0.014, s * 7e-3, 0.35);
    pushBox(parts, band, cx, s * 0.68, s * 0.26, s * 0.014, s * 7e-3, 0.35);
    if (open > 0.3) {
      const glowAmt = (open - 0.3) / 0.7;
      pushEllipse2(parts, MATERIALS.ember([255, 220, 100]), cx, s * 0.48, s * 0.16 * glowAmt, s * 0.04, 1);
    }
    pushCircle2(parts, clasp, cx, s * 0.52, s * 0.024, 0.6);
    return parts;
  }
  function buildKey(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const gold = MATERIALS.gold(color);
    const sway = wave(phase, 1) * s * 0.015 * amp;
    pushCircle2(parts, gold, cx + sway * 0.3, s * 0.3, s * 0.08, 0.7);
    pushCircle2(parts, MATERIALS.bone([30, 28, 26]), cx + sway * 0.3, s * 0.3, s * 0.04, 0.5);
    pushCapsule2(parts, gold, cx + sway * 0.3, s * 0.38, cx + sway, s * 0.72, s * 0.02, 0.6);
    pushBox(parts, gold, cx + s * 0.04 + sway, s * 0.67, s * 0.035, s * 0.018, s * 6e-3, 0.5);
    pushBox(parts, gold, cx + s * 0.04 + sway, s * 0.74, s * 0.028, s * 0.018, s * 6e-3, 0.5);
    const glintY = s * (0.38 + 0.3 * ((phase * amp + 0.5) % 1));
    pushCircle2(parts, MATERIALS.gold([255, 248, 210]), cx + sway * 0.6, glintY, Math.max(1, s * 0.012), 0.6);
    return parts;
  }
  function buildScroll(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const parch = MATERIALS.bone(color);
    const breathe = 1 + wave(phase, 1) * 0.02 * amp;
    pushBox(parts, parch, cx, s * 0.52, s * 0.14 * breathe, s * 0.22, s * 0.025, 0.35);
    pushCapsule2(parts, parch, cx - s * 0.15 * breathe, s * 0.3, cx + s * 0.15 * breathe, s * 0.3, s * 0.032, 0.7);
    pushCapsule2(parts, parch, cx - s * 0.15 * breathe, s * 0.74, cx + s * 0.15 * breathe, s * 0.74, s * 0.032, 0.7);
    const sealPulse = 0.5 + 0.5 * wave(phase, 1.5) * amp;
    const sealColor = [
      Math.min(255, 180 + 60 * sealPulse),
      Math.min(255, 50 + 30 * sealPulse),
      Math.min(255, 40 + 20 * sealPulse)
    ];
    pushCircle2(parts, MATERIALS.ember(sealColor), cx, s * 0.52, s * (0.028 + 6e-3 * sealPulse), 0.6);
    return parts;
  }
  function buildMeat(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const flesh = MATERIALS.flesh(color);
    const bone = MATERIALS.bone([210, 200, 180]);
    const wobble = wave(phase, 1) * s * 8e-3 * amp;
    pushEllipse2(parts, flesh, cx + wobble, s * 0.56, s * 0.2, s * 0.14, 0.9);
    pushEllipse2(parts, flesh, cx + wobble * 0.5, s * 0.48, s * 0.14, s * 0.1, 0.85);
    pushCapsule2(parts, bone, cx - s * 0.08 + wobble, s * 0.42, cx - s * 0.16, s * 0.32, Math.max(1, s * 0.02), 0.7);
    pushCircle2(parts, bone, cx - s * 0.16, s * 0.32, s * 0.028, 0.8);
    return parts;
  }
  function buildLantern(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const metal = MATERIALS.metal([120, 115, 105]);
    const glass = MATERIALS.glass([200, 210, 220]);
    const flame = MATERIALS.ember(color);
    const sway = wave(phase, 0.8) * s * 0.01 * amp;
    pushCapsule2(parts, metal, cx + sway * 0.3, s * 0.2, cx + sway * 0.5, s * 0.28, Math.max(1, s * 0.012), 0.5);
    pushBox(parts, metal, cx + sway, s * 0.5, s * 0.1, s * 0.18, s * 0.02, 0.4);
    pushBox(parts, glass, cx + sway, s * 0.5, s * 0.07, s * 0.14, s * 0.015, 0.6);
    const flick = wave(phase, 3) * s * 8e-3 * amp;
    const breathe = 1 + wave(phase, 2) * 0.1 * amp;
    pushEllipse2(parts, flame, cx + sway + flick, s * 0.48, s * 0.03 * breathe, s * 0.06 * breathe, 1);
    pushEllipse2(parts, MATERIALS.ember([255, 240, 160]), cx + sway + flick * 0.3, s * 0.49, s * 0.015, s * 0.035 * breathe, 1);
    pushBox(parts, metal, cx + sway, s * 0.68, s * 0.09, s * 0.02, s * 8e-3, 0.4);
    return parts;
  }
  function buildOre(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const rock = MATERIALS.bone([80, 75, 70]);
    pushEllipse2(parts, rock, cx, s * 0.55, s * 0.22, s * 0.18, 0.6);
    pushEllipse2(parts, rock, cx - s * 0.06, s * 0.48, s * 0.14, s * 0.12, 0.5);
    const glint = 0.5 + 0.5 * wave(phase, 1) * amp;
    const veinColor = [
      Math.min(255, color[0] + 30 * glint),
      Math.min(255, color[1] + 30 * glint),
      Math.min(255, color[2] + 30 * glint)
    ];
    pushCapsule2(
      parts,
      MATERIALS.metal(veinColor),
      cx - s * 0.1,
      s * 0.46,
      cx + s * 0.08,
      s * 0.58,
      Math.max(1, s * 0.018),
      0.4
    );
    pushCapsule2(
      parts,
      MATERIALS.metal(veinColor),
      cx + s * 0.05,
      s * 0.42,
      cx + s * 0.12,
      s * 0.55,
      Math.max(1, s * 0.012),
      0.35
    );
    return parts;
  }
  function buildFirestone(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const rock = MATERIALS.bone([50, 35, 30]);
    pushEllipse2(parts, rock, cx, s * 0.56, s * 0.2, s * 0.17, 0.55);
    const pulse2 = 0.5 + 0.5 * wave(phase, 1.5) * amp;
    const glowColor = [
      Math.min(255, color[0] * (0.6 + 0.6 * pulse2)),
      Math.min(255, color[1] * (0.4 + 0.4 * pulse2)),
      Math.min(255, color[2] * (0.3 + 0.3 * pulse2))
    ];
    for (let i = 0; i < 3; i++) {
      const ax = cx + rng.jitter(s * 0.12), ay = s * 0.45 + rng.jitter(s * 0.1);
      const bx = cx + rng.jitter(s * 0.12), by = s * 0.6 + rng.jitter(s * 0.08);
      pushCapsule2(parts, MATERIALS.ember(glowColor), ax, ay, bx, by, Math.max(1, s * 0.012), 0.35);
    }
    pushCircle2(parts, MATERIALS.ember([...glowColor]), cx, s * 0.5, s * (0.06 + 0.015 * pulse2), 0.9);
    return parts;
  }
  function buildBoneShard(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const bone = MATERIALS.bone(color);
    const tilt = wave(phase, 0.5) * 0.04 * amp;
    pushCapsule2(parts, bone, cx - s * 0.12, s * 0.68 + tilt * s, cx + s * 0.08, s * 0.34 - tilt * s, s * 0.035, 0.7);
    pushCircle2(parts, bone, cx + s * 0.08, s * 0.32, s * 0.04, 0.8);
    pushCapsule2(
      parts,
      MATERIALS.bone([color[0] * 0.7, color[1] * 0.7, color[2] * 0.7]),
      cx - s * 0.04,
      s * 0.55,
      cx + s * 0.02,
      s * 0.48,
      Math.max(1, s * 6e-3),
      0.3
    );
    return parts;
  }
  function buildFish(rng, s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5;
    const flesh = MATERIALS.flesh(color);
    const fin = MATERIALS.flesh([color[0] * 0.85, color[1] * 0.8, color[2] * 0.8]);
    const eyeColor = MATERIALS.bone([40, 35, 35]);
    const wobble = wave(phase, 1) * s * 0.01 * amp;
    pushEllipse2(parts, flesh, cx + wobble, s * 0.52, s * 0.22, s * 0.1, 0.9);
    const tailFlap = wave(phase, 2) * s * 0.04 * amp;
    pushCapsule2(
      parts,
      flesh,
      cx - s * 0.18 + wobble,
      s * 0.52,
      cx - s * 0.3 + wobble,
      s * 0.48 + tailFlap,
      s * 0.04,
      0.8
    );
    pushCapsule2(
      parts,
      fin,
      cx + s * 0.02 + wobble,
      s * 0.44,
      cx + s * 0.08 + wobble,
      s * 0.38,
      Math.max(1, s * 0.02),
      0.7
    );
    pushCircle2(parts, eyeColor, cx + s * 0.14 + wobble, s * 0.5, Math.max(1, s * 0.018), 0.6);
    return parts;
  }
  function buildItem(config, s, phase = 0, amp = 1) {
    const rng = new RNG(config.seed ?? 0);
    const kind = config.kind ?? "mushroom";
    const color = config.color ?? defaultColor3(rng, kind);
    switch (kind) {
      case "crystal":
        return buildCrystal(rng, s, color, phase, amp);
      case "dagger":
        return buildDagger(rng, s, color, phase, amp);
      case "torch":
        return buildTorch(rng, s, color, phase, amp);
      case "potion":
        return buildPotion(rng, s, color, phase, amp);
      case "coin":
        return buildCoin(rng, s, color, phase, amp);
      case "rune":
        return buildRune(rng, s, color, phase, amp);
      case "chest":
        return buildChest(rng, s, color, phase, amp);
      case "key":
        return buildKey(rng, s, color, phase, amp);
      case "scroll":
        return buildScroll(rng, s, color, phase, amp);
      case "meat":
        return buildMeat(rng, s, color, phase, amp);
      case "lantern":
        return buildLantern(rng, s, color, phase, amp);
      case "ore":
        return buildOre(rng, s, color, phase, amp);
      case "firestone":
        return buildFirestone(rng, s, color, phase, amp);
      case "bone_shard":
        return buildBoneShard(rng, s, color, phase, amp);
      case "fish":
        return buildFish(rng, s, color, phase, amp);
      case "mushroom":
      default:
        return buildMushroom(rng, s, color, phase, amp);
    }
  }
  var ITEM_KINDS = ["mushroom", "crystal", "dagger", "torch", "potion", "coin", "rune", "chest", "key", "scroll", "meat", "lantern", "ore", "firestone", "bone_shard", "fish"];

  // src/tiles.ts
  function pushBox2(parts, mat, cx, cy, hx, hy, corner, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: roundedBox(cx, cy, hx, hy, corner),
      bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)]
    });
  }
  function pushCircle3(parts, mat, cx, cy, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: circle(cx, cy, r),
      bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)]
    });
  }
  function pushCapsule3(parts, mat, ax, ay, bx, by, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: capsule(ax, ay, bx, by, r),
      bbox: [
        Math.floor(Math.min(ax, bx) - r - 2),
        Math.floor(Math.min(ay, by) - r - 2),
        Math.ceil(Math.max(ax, bx) + r + 2),
        Math.ceil(Math.max(ay, by) + r + 2)
      ]
    });
  }
  function pushEllipse3(parts, mat, cx, cy, rx, ry, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: ellipse(cx, cy, rx, ry),
      bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)]
    });
  }
  function wallTopAndFront(parts, rng, s, topCol, frontCol) {
    pushBox2(parts, MATERIALS.bone(topCol), s * 0.5, s * 0.13, s * 0.48, s * 0.12, s * 0.01, 0.2);
    const lipCol = [topCol[0] + 25, topCol[1] + 22, topCol[2] + 20];
    pushBox2(parts, MATERIALS.bone(lipCol), s * 0.5, s * 0.255, s * 0.48, s * 6e-3, s * 2e-3, 0.15);
    pushBox2(parts, MATERIALS.bone(frontCol), s * 0.5, s * 0.625, s * 0.48, s * 0.355, s * 0.01, 0.18);
  }
  function wallBricks(parts, rng, s, frontCol) {
    const mortarCol = [frontCol[0] * 0.55, frontCol[1] * 0.55, frontCol[2] * 0.52];
    const mortarMat = MATERIALS.bone(mortarCol);
    for (let i = 0; i < 3; i++) {
      const my = s * (0.36 + i * 0.185);
      pushCapsule3(parts, mortarMat, s * 0.03, my, s * 0.97, my, Math.max(1, s * 5e-3), 0.06);
    }
    for (let row = 0; row < 4; row++) {
      const ry0 = s * (0.27 + row * 0.185);
      const ry1 = ry0 + s * 0.185;
      const offset = row % 2 * 0.165;
      for (let v = 0; v < 3; v++) {
        const vx = s * (0.165 + offset + v * 0.33);
        if (vx > s * 0.04 && vx < s * 0.96) {
          pushCapsule3(parts, mortarMat, vx, ry0 + s * 0.01, vx, ry1 - s * 0.01, Math.max(1, s * 4e-3), 0.05);
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      const j = rng.jitter(10);
      const bx = s * (0.15 + rng.float() * 0.7);
      const by = s * (0.3 + rng.float() * 0.56);
      pushBox2(
        parts,
        MATERIALS.bone([frontCol[0] + 10 + j, frontCol[1] + 8 + j, frontCol[2] + 6 + j]),
        bx,
        by,
        s * 0.06,
        s * 0.04,
        s * 5e-3,
        0.12
      );
    }
  }
  function wallBaseShadow(parts, s, frontCol) {
    pushBox2(
      parts,
      MATERIALS.bone([frontCol[0] * 0.35, frontCol[1] * 0.35, frontCol[2] * 0.32]),
      s * 0.5,
      s * 0.975,
      s * 0.48,
      s * 0.015,
      s * 4e-3,
      0.08
    );
  }
  function floorBase(parts, rng, s) {
    const j = rng.jitter(5);
    const col = [82 + j, 76 + j, 70 + j];
    pushBox2(parts, MATERIALS.bone(col), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.01, 0.1);
    return col;
  }
  function buildStoneFloor(rng, s) {
    const parts = [];
    pushBox2(
      parts,
      MATERIALS.bone([42 + rng.jitter(4), 38 + rng.jitter(3), 35 + rng.jitter(3)]),
      s * 0.5,
      s * 0.5,
      s * 0.48,
      s * 0.48,
      s * 0.01,
      0.08
    );
    const gap = s * 0.04;
    const bw = (s - gap * 3) / 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const j = rng.jitter(8);
        const base = [95 + j, 88 + j, 80 + j];
        const cx = gap + bw / 2 + col * (bw + gap);
        const cy = gap + bw / 2 + row * (bw + gap);
        pushBox2(parts, MATERIALS.bone(base), cx, cy, bw / 2 - 1, bw / 2 - 1, s * 0.015, 0.18);
        if (rng.float() > 0.5) {
          pushCircle3(
            parts,
            MATERIALS.bone([base[0] + 10, base[1] + 8, base[2] + 6]),
            cx + rng.jitter(bw * 0.15),
            cy + rng.jitter(bw * 0.15),
            s * 0.035,
            0.1
          );
        }
      }
    }
    if (rng.float() > 0.5) {
      const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
      pushCapsule3(
        parts,
        MATERIALS.bone([35, 32, 28]),
        ax,
        ay,
        ax + rng.jitter(s * 0.22),
        ay + rng.jitter(s * 0.22),
        Math.max(1, s * 8e-3),
        0.1
      );
    }
    return parts;
  }
  function buildDirtFloor(rng, s) {
    const parts = [];
    const base = [105 + rng.jitter(12), 78 + rng.jitter(8), 52 + rng.jitter(8)];
    pushBox2(parts, MATERIALS.flesh(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.08);
    for (let i = 0; i < 2; i++) {
      const px = s * (0.2 + rng.float() * 0.6), py = s * (0.2 + rng.float() * 0.6);
      pushCircle3(
        parts,
        MATERIALS.flesh([base[0] * 0.82, base[1] * 0.82, base[2] * 0.8]),
        px,
        py,
        s * (0.06 + rng.float() * 0.04),
        0.06
      );
    }
    for (let i = 0; i < 4; i++) {
      const px = s * (0.1 + rng.float() * 0.8), py = s * (0.1 + rng.float() * 0.8);
      const pr = s * (0.018 + rng.float() * 0.015);
      const j = rng.jitter(10);
      pushCircle3(
        parts,
        MATERIALS.bone([base[0] * 0.65 + j, base[1] * 0.65 + j, base[2] * 0.65 + j]),
        px,
        py,
        pr,
        0.2
      );
    }
    if (rng.float() > 0.6) {
      const ax = s * (0.2 + rng.float() * 0.5), ay = s * (0.3 + rng.float() * 0.4);
      pushCapsule3(
        parts,
        MATERIALS.leather([72, 52, 32]),
        ax,
        ay,
        ax + rng.jitter(s * 0.15),
        ay + rng.jitter(s * 0.08),
        Math.max(1, s * 6e-3),
        0.15
      );
    }
    return parts;
  }
  function buildStoneWall(rng, s) {
    const parts = [];
    const topCol = [52 + rng.jitter(6), 48 + rng.jitter(5), 45 + rng.jitter(5)];
    const frontCol = [78 + rng.jitter(8), 72 + rng.jitter(6), 66 + rng.jitter(6)];
    wallTopAndFront(parts, rng, s, topCol, frontCol);
    wallBricks(parts, rng, s, frontCol);
    wallBaseShadow(parts, s, frontCol);
    return parts;
  }
  function buildCrystalFloor(rng, s) {
    const parts = [];
    const base = [35 + rng.jitter(6), 30 + rng.jitter(5), 45 + rng.jitter(6)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.12);
    const veins = 3 + Math.floor(rng.float() * 2);
    for (let i = 0; i < veins; i++) {
      const ax = s * (0.08 + rng.float() * 0.84), ay = s * (0.08 + rng.float() * 0.84);
      const bx = s * (0.08 + rng.float() * 0.84), by = s * (0.08 + rng.float() * 0.84);
      const color = [65 + rng.jitter(20), 140 + rng.jitter(30), 195 + rng.jitter(20)];
      pushCapsule3(parts, MATERIALS.gem(color), ax, ay, bx, by, Math.max(1, s * 0.014), 0.5);
    }
    for (let i = 0; i < 2; i++) {
      const nx = s * (0.2 + rng.float() * 0.6), ny = s * (0.2 + rng.float() * 0.6);
      pushCircle3(
        parts,
        MATERIALS.gem([120 + rng.jitter(20), 200 + rng.jitter(20), 240]),
        nx,
        ny,
        s * (0.02 + rng.float() * 0.015),
        0.7
      );
    }
    return parts;
  }
  function buildWoodDoor(rng, s) {
    const parts = [];
    const frameCol = [58 + rng.jitter(6), 54 + rng.jitter(5), 50 + rng.jitter(5)];
    pushBox2(parts, MATERIALS.bone(frameCol), s * 0.12, s * 0.13, s * 0.11, s * 0.12, s * 0.01, 0.22);
    pushBox2(parts, MATERIALS.bone(frameCol), s * 0.88, s * 0.13, s * 0.11, s * 0.12, s * 0.01, 0.22);
    pushBox2(
      parts,
      MATERIALS.bone([frameCol[0] + 8, frameCol[1] + 6, frameCol[2] + 5]),
      s * 0.5,
      s * 0.06,
      s * 0.3,
      s * 0.05,
      s * 0.02,
      0.2
    );
    const frameFront = [frameCol[0] + 12, frameCol[1] + 10, frameCol[2] + 8];
    pushBox2(parts, MATERIALS.bone(frameFront), s * 0.12, s * 0.6, s * 0.11, s * 0.36, s * 0.01, 0.2);
    pushBox2(parts, MATERIALS.bone(frameFront), s * 0.88, s * 0.6, s * 0.11, s * 0.36, s * 0.01, 0.2);
    pushBox2(
      parts,
      MATERIALS.bone([75 + rng.jitter(5), 70 + rng.jitter(4), 65 + rng.jitter(4)]),
      s * 0.5,
      s * 0.8,
      s * 0.28,
      s * 0.18,
      s * 0.01,
      0.1
    );
    const wood = [125 + rng.jitter(10), 82 + rng.jitter(8), 48 + rng.jitter(6)];
    pushBox2(parts, MATERIALS.leather(wood), s * 0.5, s * 0.52, s * 0.26, s * 0.32, s * 0.015, 0.25);
    const seam = [wood[0] * 0.72, wood[1] * 0.72, wood[2] * 0.72];
    for (let i = -1; i <= 1; i++) {
      const px = s * 0.5 + i * s * 0.12;
      pushCapsule3(
        parts,
        MATERIALS.leather(seam),
        px,
        s * 0.25,
        px,
        s * 0.8,
        Math.max(1, s * 5e-3),
        0.1
      );
    }
    const bandMat = MATERIALS.metal([100, 98, 95]);
    pushBox2(parts, bandMat, s * 0.5, s * 0.34, s * 0.27, s * 0.015, s * 6e-3, 0.35);
    pushBox2(parts, bandMat, s * 0.5, s * 0.58, s * 0.27, s * 0.015, s * 6e-3, 0.35);
    pushBox2(parts, bandMat, s * 0.5, s * 0.78, s * 0.27, s * 0.015, s * 6e-3, 0.35);
    pushCircle3(parts, MATERIALS.metal([155, 145, 105]), s * 0.58, s * 0.54, s * 0.025, 0.5);
    pushBox2(parts, MATERIALS.bone([30, 28, 25]), s * 0.5, s * 0.96, s * 0.28, s * 0.012, s * 4e-3, 0.06);
    return parts;
  }
  function buildLavaFloor(rng, s) {
    const parts = [];
    const base = [35 + rng.jitter(4), 24 + rng.jitter(3), 20 + rng.jitter(3)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.1);
    for (let i = 0; i < 3; i++) {
      const ax = s * (0.05 + rng.float() * 0.9), ay = s * (0.05 + rng.float() * 0.9);
      const bx = s * (0.05 + rng.float() * 0.9), by = s * (0.05 + rng.float() * 0.9);
      pushCapsule3(parts, MATERIALS.bone([20, 15, 12]), ax, ay, bx, by, Math.max(1, s * 6e-3), 0.08);
    }
    const veins = 2 + Math.floor(rng.float() * 2);
    for (let i = 0; i < veins; i++) {
      const ax = s * (0.08 + rng.float() * 0.84), ay = s * (0.08 + rng.float() * 0.84);
      const bx = s * (0.08 + rng.float() * 0.84), by = s * (0.08 + rng.float() * 0.84);
      const color = [255, 95 + rng.jitter(35), 25 + rng.jitter(15)];
      pushCapsule3(parts, MATERIALS.ember(color), ax, ay, bx, by, Math.max(1.2, s * 0.018), 0.4);
    }
    for (let i = 0; i < 2; i++) {
      const gx = s * (0.2 + rng.float() * 0.6), gy = s * (0.2 + rng.float() * 0.6);
      pushCircle3(parts, MATERIALS.ember([255, 180, 60]), gx, gy, s * (0.025 + rng.float() * 0.02), 0.6);
    }
    return parts;
  }
  function buildIceFloor(rng, s) {
    const parts = [];
    const base = [170 + rng.jitter(8), 200 + rng.jitter(6), 220 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.glass(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.15);
    for (let i = 0; i < 3; i++) {
      const ax = s * (0.15 + rng.float() * 0.7), ay = s * (0.15 + rng.float() * 0.7);
      const bx = ax + rng.jitter(s * 0.3), by = ay + rng.jitter(s * 0.3);
      pushCapsule3(parts, MATERIALS.glass([210, 230, 245]), ax, ay, bx, by, Math.max(1, s * 6e-3), 0.15);
    }
    pushCircle3(
      parts,
      MATERIALS.glass([235, 245, 255]),
      s * (0.3 + rng.float() * 0.3),
      s * (0.3 + rng.float() * 0.3),
      s * 0.04,
      0.3
    );
    return parts;
  }
  function buildMossFloor(rng, s) {
    const parts = [];
    const base = [82 + rng.jitter(6), 76 + rng.jitter(5), 70 + rng.jitter(5)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.1);
    for (let i = 0; i < 4; i++) {
      const px = s * (0.12 + rng.float() * 0.76), py = s * (0.12 + rng.float() * 0.76);
      const pr = s * (0.04 + rng.float() * 0.035);
      const color = [42 + rng.jitter(12), 88 + rng.jitter(18), 35 + rng.jitter(10)];
      pushCircle3(parts, MATERIALS.flesh(color), px, py, pr, 0.1);
    }
    for (let i = 0; i < 2; i++) {
      const tx = s * (0.2 + rng.float() * 0.6), ty = s * (0.2 + rng.float() * 0.5);
      pushCapsule3(
        parts,
        MATERIALS.flesh([55 + rng.jitter(10), 105 + rng.jitter(15), 45 + rng.jitter(8)]),
        tx,
        ty + s * 0.04,
        tx + rng.jitter(s * 0.02),
        ty - s * 0.03,
        Math.max(1, s * 8e-3),
        0.15
      );
    }
    return parts;
  }
  function buildSpikeTrap(rng, s) {
    const parts = [];
    const base = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.12);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const sx = s * (0.22 + c * 0.28) + rng.jitter(s * 0.015);
        const sy = s * (0.22 + r * 0.28) + rng.jitter(s * 0.015);
        pushCircle3(parts, MATERIALS.bone([25, 22, 18]), sx, sy, s * 0.04, 0.08);
        pushCircle3(parts, MATERIALS.metal([165, 160, 152]), sx, sy, s * 0.018, 0.6);
        pushCircle3(parts, MATERIALS.metal([210, 205, 195]), sx - s * 5e-3, sy - s * 5e-3, s * 6e-3, 0.5);
      }
    }
    return parts;
  }
  function buildStairsDown(rng, s) {
    const parts = [];
    const base = [72 + rng.jitter(5), 68 + rng.jitter(4), 64 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.15);
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const sy = s * (0.15 + i * 0.145);
      const sw = s * (0.4 - i * 0.025);
      const brightness = 1 - t * 0.5;
      const stepCol = [base[0] * brightness, base[1] * brightness, base[2] * brightness];
      pushBox2(parts, MATERIALS.bone(stepCol), s * 0.5, sy, sw / 2, s * 0.035, s * 8e-3, 0.18);
      pushBox2(
        parts,
        MATERIALS.bone([stepCol[0] + 8, stepCol[1] + 6, stepCol[2] + 5]),
        s * 0.5,
        sy + s * 0.04,
        sw / 2,
        s * 0.015,
        s * 5e-3,
        0.12
      );
    }
    pushBox2(parts, MATERIALS.bone([15, 12, 10]), s * 0.5, s * 0.88, s * 0.16, s * 0.08, s * 0.015, 0.06);
    return parts;
  }
  function buildStairsUp(rng, s) {
    const parts = [];
    const base = [72 + rng.jitter(5), 68 + rng.jitter(4), 64 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(base), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.15);
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const sy = s * (0.78 - i * 0.145);
      const sw = s * (0.4 - i * 0.025);
      const brightness = 1 + t * 0.25;
      const stepCol = [
        Math.min(255, base[0] * brightness),
        Math.min(255, base[1] * brightness),
        Math.min(255, base[2] * brightness)
      ];
      pushBox2(parts, MATERIALS.bone(stepCol), s * 0.5, sy, sw / 2, s * 0.035, s * 8e-3, 0.18);
      pushBox2(
        parts,
        MATERIALS.bone([stepCol[0] + 8, stepCol[1] + 6, stepCol[2] + 5]),
        s * 0.5,
        sy + s * 0.04,
        sw / 2,
        s * 0.015,
        s * 5e-3,
        0.12
      );
    }
    pushCircle3(parts, MATERIALS.ember([210, 200, 150]), s * 0.5, s * 0.12, s * 0.065, 0.8);
    return parts;
  }
  function buildCrackedWall(rng, s) {
    const parts = [];
    const topCol = [50 + rng.jitter(6), 46 + rng.jitter(5), 44 + rng.jitter(5)];
    const frontCol = [72 + rng.jitter(8), 66 + rng.jitter(6), 62 + rng.jitter(6)];
    wallTopAndFront(parts, rng, s, topCol, frontCol);
    wallBricks(parts, rng, s, frontCol);
    const crackCol = MATERIALS.bone([frontCol[0] * 0.3, frontCol[1] * 0.3, frontCol[2] * 0.28]);
    const cracks = 3 + Math.floor(rng.float() * 3);
    for (let i = 0; i < cracks; i++) {
      const ax = s * (0.1 + rng.float() * 0.8), ay = s * (0.28 + rng.float() * 0.55);
      const bx = ax + rng.jitter(s * 0.3), by = ay + rng.jitter(s * 0.25);
      pushCapsule3(parts, crackCol, ax, ay, bx, by, Math.max(1, s * 0.012), 0.08);
    }
    pushBox2(
      parts,
      MATERIALS.bone([25, 22, 20]),
      s * (0.3 + rng.float() * 0.4),
      s * (0.4 + rng.float() * 0.3),
      s * 0.06,
      s * 0.04,
      s * 8e-3,
      0.06
    );
    wallBaseShadow(parts, s, frontCol);
    return parts;
  }
  function buildPit(rng, s) {
    const parts = [];
    const edge = [72 + rng.jitter(5), 66 + rng.jitter(4), 62 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(edge), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.12);
    pushCircle3(
      parts,
      MATERIALS.bone([edge[0] * 0.6, edge[1] * 0.6, edge[2] * 0.58]),
      s * 0.5,
      s * 0.5,
      s * 0.34,
      0.12
    );
    pushCircle3(parts, MATERIALS.bone([12, 10, 8]), s * 0.5, s * 0.5, s * 0.28, 0.06);
    pushCapsule3(
      parts,
      MATERIALS.bone([edge[0] + 18, edge[1] + 15, edge[2] + 12]),
      s * 0.25,
      s * 0.36,
      s * 0.75,
      s * 0.36,
      Math.max(1, s * 8e-3),
      0.15
    );
    return parts;
  }
  function buildWaterPool(rng, s) {
    const parts = [];
    const j = rng.jitter(5);
    const rimCol = [82 + j, 76 + j, 70 + j];
    pushBox2(parts, MATERIALS.bone(rimCol), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.12);
    const waterCol = [28 + j, 52 + j, 68 + j];
    pushCircle3(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.5, s * 0.36, 0.15);
    const ripples = 2 + (rng.float() > 0.5 ? 1 : 0);
    for (let i = 0; i < ripples; i++) {
      const cx = s * (0.35 + rng.float() * 0.3);
      const cy = s * (0.35 + rng.float() * 0.3);
      const r = s * (0.06 + rng.float() * 0.05);
      const rippleCol = [waterCol[0] + 30, waterCol[1] + 35, waterCol[2] + 28];
      const t = Math.max(1.2, s * 0.01);
      pushCapsule3(parts, MATERIALS.glass(rippleCol), cx - r, cy, cx, cy - r * 0.6, t, 0.18);
      pushCapsule3(parts, MATERIALS.glass(rippleCol), cx, cy - r * 0.6, cx + r, cy, t, 0.18);
      pushCapsule3(parts, MATERIALS.glass(rippleCol), cx + r, cy, cx, cy + r * 0.6, t, 0.18);
      pushCapsule3(parts, MATERIALS.glass(rippleCol), cx, cy + r * 0.6, cx - r, cy, t, 0.18);
    }
    pushCircle3(
      parts,
      MATERIALS.glass([waterCol[0] + 50, waterCol[1] + 55, waterCol[2] + 50]),
      s * (0.35 + rng.float() * 0.15),
      s * (0.35 + rng.float() * 0.15),
      s * 0.025,
      0.25
    );
    return parts;
  }
  function buildUndergroundRiver(rng, s) {
    const parts = [];
    const bankCol = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.1, s * 0.48, s * 0.1, s * 0.015, 0.18);
    pushBox2(
      parts,
      MATERIALS.bone([bankCol[0] + 10, bankCol[1] + 8, bankCol[2] + 6]),
      s * 0.5,
      s * 0.21,
      s * 0.48,
      s * 0.015,
      s * 5e-3,
      0.12
    );
    pushBox2(parts, MATERIALS.bone(bankCol), s * 0.5, s * 0.9, s * 0.48, s * 0.1, s * 0.015, 0.18);
    const j = rng.jitter(5);
    const waterCol = [24 + j, 48 + j, 62 + j];
    pushBox2(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.52, s * 0.48, s * 0.28, s * 0.015, 0.12);
    const ripples = 4 + Math.floor(rng.float() * 2);
    for (let i = 0; i < ripples; i++) {
      const ry = s * (0.3 + rng.float() * 0.4);
      const ax = s * (0.06 + rng.float() * 0.15);
      const bx = s * (0.7 + rng.float() * 0.22);
      pushCapsule3(
        parts,
        MATERIALS.glass([waterCol[0] + 25, waterCol[1] + 30, waterCol[2] + 25]),
        ax,
        ry,
        bx,
        ry + rng.jitter(s * 0.015),
        Math.max(1.2, s * 8e-3),
        0.15
      );
    }
    return parts;
  }
  function buildStalagmite(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const pillars = 2 + (rng.float() > 0.5 ? 1 : 0);
    for (let i = 0; i < pillars; i++) {
      const j = rng.jitter(10);
      const col = [95 + j, 85 + j, 75 + j];
      const cx = s * (0.25 + i * 0.25) + rng.jitter(s * 0.04);
      const baseY = s * 0.82;
      const tipY = s * (0.22 + rng.float() * 0.15);
      const baseW = s * (0.06 + rng.float() * 0.03);
      pushEllipse3(
        parts,
        MATERIALS.bone([floorCol[0] * 0.5, floorCol[1] * 0.5, floorCol[2] * 0.5]),
        cx,
        baseY + s * 0.02,
        baseW * 1.3,
        s * 0.025,
        0.06
      );
      pushCapsule3(parts, MATERIALS.bone(col), cx, baseY, cx, tipY, baseW, 0.3);
      pushEllipse3(
        parts,
        MATERIALS.bone([col[0] - 8, col[1] - 6, col[2] - 5]),
        cx,
        baseY - s * 0.02,
        baseW * 1.2,
        s * 0.04,
        0.2
      );
      pushCircle3(
        parts,
        MATERIALS.bone([col[0] + 22, col[1] + 18, col[2] + 15]),
        cx,
        tipY + s * 0.02,
        baseW * 0.4,
        0.35
      );
    }
    return parts;
  }
  function buildCobweb(rng, s) {
    const parts = [];
    const baseCol = [78 + rng.jitter(5), 72 + rng.jitter(4), 68 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.bone(baseCol), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.1);
    const webCol = [185, 182, 178];
    const ox = s * 0.04, oy = s * 0.04;
    const strands = 6 + Math.floor(rng.float() * 3);
    for (let i = 0; i < strands; i++) {
      const angle = i / strands * (Math.PI * 0.5);
      const len = s * (0.35 + rng.float() * 0.4);
      const ex = ox + Math.cos(angle) * len;
      const ey = oy + Math.sin(angle) * len;
      pushCapsule3(parts, MATERIALS.bone(webCol), ox, oy, ex, ey, Math.max(1.2, s * 6e-3), 0.06);
    }
    for (let ring = 0; ring < 3; ring++) {
      const dist = s * (0.12 + ring * 0.15);
      for (let seg = 0; seg < 3; seg++) {
        const a1 = seg / 4 * (Math.PI * 0.5) + rng.jitter(0.1);
        const a2 = (seg + 1) / 4 * (Math.PI * 0.5) + rng.jitter(0.1);
        const ax = ox + Math.cos(a1) * dist, ay = oy + Math.sin(a1) * dist;
        const bx = ox + Math.cos(a2) * dist, by = oy + Math.sin(a2) * dist;
        pushCapsule3(parts, MATERIALS.bone(webCol), ax, ay, bx, by, Math.max(1, s * 4e-3), 0.04);
      }
    }
    return parts;
  }
  function buildBarrel(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const woodCol = [120 + rng.jitter(10), 80 + rng.jitter(8), 48 + rng.jitter(6)];
    pushEllipse3(
      parts,
      MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42]),
      s * 0.52,
      s * 0.88,
      s * 0.22,
      s * 0.06,
      0.05
    );
    pushBox2(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.62, s * 0.18, s * 0.26, s * 0.04, 0.3);
    const staveDark = [woodCol[0] * 0.78, woodCol[1] * 0.78, woodCol[2] * 0.75];
    for (let i = -2; i <= 2; i++) {
      const sx = s * 0.5 + i * s * 0.065;
      pushCapsule3(
        parts,
        MATERIALS.leather(staveDark),
        sx,
        s * 0.4,
        sx,
        s * 0.84,
        Math.max(1, s * 4e-3),
        0.12
      );
    }
    const bandMat = MATERIALS.metal([140, 135, 128]);
    pushBox2(parts, bandMat, s * 0.5, s * 0.45, s * 0.19, s * 0.012, s * 5e-3, 0.4);
    pushBox2(parts, bandMat, s * 0.5, s * 0.62, s * 0.2, s * 0.012, s * 5e-3, 0.4);
    pushBox2(parts, bandMat, s * 0.5, s * 0.79, s * 0.19, s * 0.012, s * 5e-3, 0.4);
    pushEllipse3(
      parts,
      MATERIALS.leather([woodCol[0] * 0.88, woodCol[1] * 0.88, woodCol[2] * 0.85]),
      s * 0.5,
      s * 0.35,
      s * 0.17,
      s * 0.07,
      0.25
    );
    pushEllipse3(parts, bandMat, s * 0.5, s * 0.35, s * 0.18, s * 0.075, 0.35);
    pushEllipse3(
      parts,
      MATERIALS.leather([woodCol[0] * 0.85, woodCol[1] * 0.85, woodCol[2] * 0.82]),
      s * 0.5,
      s * 0.35,
      s * 0.155,
      s * 0.06,
      0.22
    );
    return parts;
  }
  function buildChain(rng, s) {
    const parts = [];
    pushBox2(parts, MATERIALS.bone([22, 20, 18]), s * 0.5, s * 0.5, s * 0.48, s * 0.48, s * 0.015, 0.06);
    const chainMat = MATERIALS.metal([162 + rng.jitter(8), 156 + rng.jitter(6), 148 + rng.jitter(6)]);
    const links = 5 + Math.floor(rng.float() * 2);
    const cx = s * 0.5 + rng.jitter(s * 0.04);
    for (let i = 0; i < links; i++) {
      const ly = s * (0.08 + i * 0.15);
      const linkR = Math.max(1.2, s * 0.032);
      if (i % 2 === 0) {
        pushCircle3(parts, chainMat, cx, ly, linkR, 0.5);
        pushCircle3(parts, MATERIALS.bone([25, 22, 20]), cx, ly, linkR * 0.45, 0.3);
      } else {
        pushCapsule3(
          parts,
          chainMat,
          cx,
          ly - linkR * 0.5,
          cx,
          ly + linkR * 0.5,
          Math.max(1.2, s * 0.016),
          0.45
        );
      }
    }
    return parts;
  }
  function buildBonePile(rng, s) {
    const parts = [];
    floorBase(parts, rng, s);
    const boneMat = MATERIALS.bone([205, 196, 178]);
    const bones = 6 + Math.floor(rng.float() * 3);
    for (let i = 0; i < bones; i++) {
      const cx = s * (0.18 + rng.float() * 0.64);
      const cy = s * (0.35 + rng.float() * 0.45);
      const angle = rng.float() * Math.PI;
      const len = s * (0.05 + rng.float() * 0.08);
      const ax = cx - Math.cos(angle) * len, ay = cy - Math.sin(angle) * len;
      const bx = cx + Math.cos(angle) * len, by = cy + Math.sin(angle) * len;
      pushCapsule3(
        parts,
        boneMat,
        ax,
        ay,
        bx,
        by,
        Math.max(1.2, s * (0.012 + rng.float() * 8e-3)),
        0.3
      );
    }
    pushCircle3(
      parts,
      boneMat,
      s * (0.42 + rng.jitter(0.06)),
      s * (0.48 + rng.jitter(0.05)),
      s * 0.042,
      0.35
    );
    const skullX = s * (0.42 + rng.jitter(0.06));
    const skullY = s * (0.48 + rng.jitter(0.05));
    pushCircle3(parts, MATERIALS.bone([35, 30, 28]), skullX - s * 0.015, skullY - s * 8e-3, s * 8e-3, 0.2);
    pushCircle3(parts, MATERIALS.bone([35, 30, 28]), skullX + s * 0.015, skullY - s * 8e-3, s * 8e-3, 0.2);
    return parts;
  }
  function buildShopCounter(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const woodCol = [108 + rng.jitter(8), 70 + rng.jitter(6), 42 + rng.jitter(5)];
    pushBox2(
      parts,
      MATERIALS.bone([floorCol[0] * 0.5, floorCol[1] * 0.5, floorCol[2] * 0.48]),
      s * 0.52,
      s * 0.88,
      s * 0.36,
      s * 0.06,
      s * 0.01,
      0.06
    );
    pushBox2(parts, MATERIALS.leather(woodCol), s * 0.5, s * 0.7, s * 0.38, s * 0.14, s * 0.02, 0.22);
    const plankDark = [woodCol[0] * 0.8, woodCol[1] * 0.8, woodCol[2] * 0.78];
    pushCapsule3(
      parts,
      MATERIALS.leather(plankDark),
      s * 0.14,
      s * 0.62,
      s * 0.86,
      s * 0.62,
      Math.max(1, s * 4e-3),
      0.08
    );
    pushCapsule3(
      parts,
      MATERIALS.leather(plankDark),
      s * 0.14,
      s * 0.72,
      s * 0.86,
      s * 0.72,
      Math.max(1, s * 4e-3),
      0.08
    );
    pushBox2(
      parts,
      MATERIALS.leather([woodCol[0] + 12, woodCol[1] + 8, woodCol[2] + 5]),
      s * 0.5,
      s * 0.54,
      s * 0.38,
      s * 0.05,
      s * 0.015,
      0.2
    );
    pushBox2(
      parts,
      MATERIALS.leather([woodCol[0] + 22, woodCol[1] + 15, woodCol[2] + 10]),
      s * 0.5,
      s * 0.5,
      s * 0.37,
      s * 8e-3,
      s * 3e-3,
      0.15
    );
    pushCircle3(parts, MATERIALS.gold([215, 188, 82]), s * 0.6, s * 0.53, s * 0.022, 0.5);
    pushCircle3(parts, MATERIALS.gold([200, 175, 72]), s * 0.4, s * 0.54, s * 0.018, 0.45);
    pushBox2(
      parts,
      MATERIALS.leather([woodCol[0] * 0.85, woodCol[1] * 0.85, woodCol[2] * 0.82]),
      s * 0.72,
      s * 0.53,
      s * 0.035,
      s * 0.025,
      s * 8e-3,
      0.2
    );
    return parts;
  }
  function buildIronGate(rng, s) {
    const parts = [];
    const frameCol = [55 + rng.jitter(6), 50 + rng.jitter(5), 48 + rng.jitter(5)];
    pushBox2(parts, MATERIALS.bone(frameCol), s * 0.1, s * 0.13, s * 0.09, s * 0.12, s * 0.01, 0.22);
    pushBox2(parts, MATERIALS.bone(frameCol), s * 0.9, s * 0.13, s * 0.09, s * 0.12, s * 0.01, 0.22);
    const frameFront = [frameCol[0] + 12, frameCol[1] + 10, frameCol[2] + 8];
    pushBox2(parts, MATERIALS.bone(frameFront), s * 0.1, s * 0.6, s * 0.09, s * 0.36, s * 0.01, 0.2);
    pushBox2(parts, MATERIALS.bone(frameFront), s * 0.9, s * 0.6, s * 0.09, s * 0.36, s * 0.01, 0.2);
    pushBox2(parts, MATERIALS.bone([72, 66, 62]), s * 0.5, s * 0.6, s * 0.32, s * 0.38, s * 0.01, 0.08);
    const barMat = MATERIALS.metal([122 + rng.jitter(6), 118 + rng.jitter(5), 115 + rng.jitter(5)]);
    pushBox2(parts, barMat, s * 0.5, s * 0.26, s * 0.32, s * 0.018, s * 6e-3, 0.4);
    const bars = 5;
    for (let i = 0; i < bars; i++) {
      const bx = s * (0.25 + i * 0.125);
      pushCapsule3(parts, barMat, bx, s * 0.28, bx, s * 0.92, Math.max(1.2, s * 0.016), 0.42);
    }
    pushCapsule3(parts, barMat, s * 0.22, s * 0.58, s * 0.78, s * 0.58, Math.max(1.2, s * 0.014), 0.38);
    return parts;
  }
  function buildTorchBracket(rng, s) {
    const parts = [];
    const wallCol = [68 + rng.jitter(6), 62 + rng.jitter(5), 58 + rng.jitter(5)];
    const topCol = [wallCol[0] - 15, wallCol[1] - 14, wallCol[2] - 13];
    wallTopAndFront(parts, rng, s, topCol, wallCol);
    const mortarCol = [wallCol[0] * 0.6, wallCol[1] * 0.6, wallCol[2] * 0.58];
    pushCapsule3(
      parts,
      MATERIALS.bone(mortarCol),
      s * 0.04,
      s * 0.48,
      s * 0.96,
      s * 0.48,
      Math.max(1, s * 4e-3),
      0.06
    );
    pushCapsule3(
      parts,
      MATERIALS.bone(mortarCol),
      s * 0.04,
      s * 0.68,
      s * 0.96,
      s * 0.68,
      Math.max(1, s * 4e-3),
      0.06
    );
    const bracketMat = MATERIALS.metal([135, 128, 122]);
    pushBox2(parts, bracketMat, s * 0.5, s * 0.68, s * 0.035, s * 0.06, s * 8e-3, 0.4);
    pushCapsule3(parts, bracketMat, s * 0.5, s * 0.68, s * 0.5, s * 0.78, Math.max(1.2, s * 0.02), 0.35);
    pushCapsule3(
      parts,
      MATERIALS.leather([105, 65, 38]),
      s * 0.5,
      s * 0.6,
      s * 0.5,
      s * 0.42,
      Math.max(1.2, s * 0.025),
      0.25
    );
    pushEllipse3(parts, MATERIALS.ember([255, 150, 40]), s * 0.5, s * 0.32, s * 0.06, s * 0.1, 0.7);
    pushEllipse3(parts, MATERIALS.ember([255, 230, 120]), s * 0.5, s * 0.34, s * 0.03, s * 0.06, 0.8);
    pushCircle3(parts, MATERIALS.ember([255, 200, 80]), s * 0.5, s * 0.5, s * 0.12, 0.15);
    return parts;
  }
  function buildAltar(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const stoneCol = [80 + rng.jitter(5), 74 + rng.jitter(4), 84 + rng.jitter(5)];
    pushEllipse3(
      parts,
      MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42]),
      s * 0.52,
      s * 0.88,
      s * 0.24,
      s * 0.06,
      0.06
    );
    pushBox2(parts, MATERIALS.bone(stoneCol), s * 0.5, s * 0.68, s * 0.22, s * 0.18, s * 0.02, 0.22);
    pushBox2(
      parts,
      MATERIALS.bone([stoneCol[0] * 0.8, stoneCol[1] * 0.8, stoneCol[2] * 0.82]),
      s * 0.5,
      s * 0.7,
      s * 0.14,
      s * 0.06,
      s * 0.015,
      0.18
    );
    pushBox2(
      parts,
      MATERIALS.bone([stoneCol[0] + 15, stoneCol[1] + 12, stoneCol[2] + 16]),
      s * 0.5,
      s * 0.48,
      s * 0.24,
      s * 0.06,
      s * 0.02,
      0.2
    );
    pushBox2(
      parts,
      MATERIALS.bone([stoneCol[0] + 28, stoneCol[1] + 24, stoneCol[2] + 30]),
      s * 0.5,
      s * 0.43,
      s * 0.22,
      s * 6e-3,
      s * 3e-3,
      0.15
    );
    const runeCol = [135 + rng.jitter(20), 75 + rng.jitter(15), 195 + rng.jitter(20)];
    pushCircle3(parts, MATERIALS.gem(runeCol), s * 0.5, s * 0.48, s * 0.06, 0.6);
    pushCircle3(parts, MATERIALS.ember([175, 115, 248]), s * 0.5, s * 0.48, s * 0.03, 0.8);
    return parts;
  }
  function buildAnvil(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const anvilCol = [58 + rng.jitter(5), 55 + rng.jitter(4), 52 + rng.jitter(4)];
    pushEllipse3(
      parts,
      MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42]),
      s * 0.48,
      s * 0.86,
      s * 0.2,
      s * 0.05,
      0.06
    );
    pushBox2(
      parts,
      MATERIALS.metal([anvilCol[0] - 5, anvilCol[1] - 4, anvilCol[2] - 3]),
      s * 0.5,
      s * 0.76,
      s * 0.08,
      s * 0.1,
      s * 0.015,
      0.3
    );
    pushBox2(parts, MATERIALS.metal(anvilCol), s * 0.5, s * 0.6, s * 0.06, s * 0.08, s * 0.012, 0.32);
    const topCol = [anvilCol[0] + 20, anvilCol[1] + 16, anvilCol[2] + 13];
    pushBox2(parts, MATERIALS.metal(topCol), s * 0.5, s * 0.48, s * 0.17, s * 0.05, s * 0.02, 0.38);
    pushCapsule3(
      parts,
      MATERIALS.metal(anvilCol),
      s * 0.67,
      s * 0.5,
      s * 0.78,
      s * 0.52,
      Math.max(1.2, s * 0.025),
      0.35
    );
    const hammerHead = [105, 100, 95];
    pushBox2(parts, MATERIALS.metal(hammerHead), s * 0.28, s * 0.74, s * 0.035, s * 0.022, s * 8e-3, 0.38);
    pushCapsule3(
      parts,
      MATERIALS.leather([92, 60, 38]),
      s * 0.28,
      s * 0.76,
      s * 0.28,
      s * 0.9,
      Math.max(1.2, s * 0.01),
      0.2
    );
    return parts;
  }
  function buildBed(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const frameCol = [98 + rng.jitter(8), 64 + rng.jitter(6), 40 + rng.jitter(5)];
    pushBox2(
      parts,
      MATERIALS.bone([floorCol[0] * 0.48, floorCol[1] * 0.48, floorCol[2] * 0.45]),
      s * 0.52,
      s * 0.9,
      s * 0.22,
      s * 0.05,
      s * 0.01,
      0.05
    );
    pushBox2(
      parts,
      MATERIALS.leather([frameCol[0] * 0.8, frameCol[1] * 0.8, frameCol[2] * 0.78]),
      s * 0.3,
      s * 0.88,
      s * 0.02,
      s * 0.04,
      s * 8e-3,
      0.2
    );
    pushBox2(
      parts,
      MATERIALS.leather([frameCol[0] * 0.8, frameCol[1] * 0.8, frameCol[2] * 0.78]),
      s * 0.7,
      s * 0.88,
      s * 0.02,
      s * 0.04,
      s * 8e-3,
      0.2
    );
    pushBox2(parts, MATERIALS.leather(frameCol), s * 0.5, s * 0.78, s * 0.22, s * 0.04, s * 0.015, 0.22);
    pushBox2(
      parts,
      MATERIALS.leather([frameCol[0] * 0.88, frameCol[1] * 0.88, frameCol[2] * 0.86]),
      s * 0.5,
      s * 0.3,
      s * 0.24,
      s * 0.06,
      s * 0.02,
      0.25
    );
    const blanketCol = [62 + rng.jitter(15), 52 + rng.jitter(10), 78 + rng.jitter(15)];
    pushBox2(parts, MATERIALS.cloth(blanketCol), s * 0.5, s * 0.55, s * 0.2, s * 0.18, s * 0.02, 0.15);
    pushCapsule3(
      parts,
      MATERIALS.cloth([blanketCol[0] * 0.85, blanketCol[1] * 0.85, blanketCol[2] * 0.88]),
      s * 0.32,
      s * 0.62,
      s * 0.68,
      s * 0.6,
      Math.max(1, s * 6e-3),
      0.08
    );
    const pillowCol = [162 + rng.jitter(8), 158 + rng.jitter(6), 148 + rng.jitter(6)];
    pushEllipse3(parts, MATERIALS.cloth(pillowCol), s * 0.5, s * 0.4, s * 0.1, s * 0.04, 0.2);
    return parts;
  }
  function buildTable(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const topCol = [112 + rng.jitter(8), 74 + rng.jitter(6), 46 + rng.jitter(5)];
    pushBox2(
      parts,
      MATERIALS.bone([floorCol[0] * 0.48, floorCol[1] * 0.48, floorCol[2] * 0.45]),
      s * 0.52,
      s * 0.88,
      s * 0.28,
      s * 0.05,
      s * 0.01,
      0.05
    );
    const legCol = [topCol[0] * 0.8, topCol[1] * 0.8, topCol[2] * 0.78];
    pushCapsule3(
      parts,
      MATERIALS.leather(legCol),
      s * 0.26,
      s * 0.6,
      s * 0.26,
      s * 0.88,
      Math.max(1.2, s * 0.016),
      0.2
    );
    pushCapsule3(
      parts,
      MATERIALS.leather(legCol),
      s * 0.74,
      s * 0.6,
      s * 0.74,
      s * 0.88,
      Math.max(1.2, s * 0.016),
      0.2
    );
    pushBox2(
      parts,
      MATERIALS.leather([topCol[0] - 8, topCol[1] - 5, topCol[2] - 4]),
      s * 0.5,
      s * 0.6,
      s * 0.26,
      s * 0.03,
      s * 0.01,
      0.2
    );
    pushBox2(parts, MATERIALS.leather(topCol), s * 0.5, s * 0.5, s * 0.28, s * 0.08, s * 0.02, 0.25);
    pushBox2(
      parts,
      MATERIALS.leather([topCol[0] + 15, topCol[1] + 10, topCol[2] + 8]),
      s * 0.5,
      s * 0.43,
      s * 0.26,
      s * 6e-3,
      s * 3e-3,
      0.18
    );
    pushCircle3(parts, MATERIALS.bone([142, 132, 118]), s * 0.62, s * 0.48, s * 0.025, 0.3);
    pushCircle3(parts, MATERIALS.bone([88, 72, 58]), s * 0.62, s * 0.48, s * 0.014, 0.15);
    pushCircle3(parts, MATERIALS.bone([168, 162, 150]), s * 0.38, s * 0.5, s * 0.035, 0.18);
    return parts;
  }
  function buildBookshelf(rng, s) {
    const parts = [];
    const wallCol = [65 + rng.jitter(6), 60 + rng.jitter(5), 56 + rng.jitter(5)];
    const topCol = [wallCol[0] - 12, wallCol[1] - 11, wallCol[2] - 10];
    wallTopAndFront(parts, rng, s, topCol, wallCol);
    const shelfCol = [102 + rng.jitter(6), 68 + rng.jitter(5), 40 + rng.jitter(4)];
    pushBox2(parts, MATERIALS.leather(shelfCol), s * 0.5, s * 0.62, s * 0.38, s * 0.28, s * 0.015, 0.2);
    const shelfDark = [shelfCol[0] * 0.75, shelfCol[1] * 0.75, shelfCol[2] * 0.72];
    pushCapsule3(
      parts,
      MATERIALS.leather(shelfDark),
      s * 0.14,
      s * 0.5,
      s * 0.86,
      s * 0.5,
      Math.max(1, s * 6e-3),
      0.12
    );
    pushCapsule3(
      parts,
      MATERIALS.leather(shelfDark),
      s * 0.14,
      s * 0.68,
      s * 0.86,
      s * 0.68,
      Math.max(1, s * 6e-3),
      0.12
    );
    const bookColors = [
      [138 + rng.jitter(18), 42 + rng.jitter(12), 42 + rng.jitter(12)],
      [42 + rng.jitter(12), 62 + rng.jitter(12), 128 + rng.jitter(18)],
      [52 + rng.jitter(12), 108 + rng.jitter(18), 52 + rng.jitter(12)],
      [128 + rng.jitter(18), 108 + rng.jitter(12), 40 + rng.jitter(10)],
      [90 + rng.jitter(15), 45 + rng.jitter(10), 110 + rng.jitter(15)],
      [120 + rng.jitter(15), 75 + rng.jitter(10), 45 + rng.jitter(10)]
    ];
    for (let i = 0; i < 3; i++) {
      const bx = s * (0.2 + i * 0.2) + rng.jitter(s * 0.015);
      const bh = s * (0.04 + rng.float() * 0.025);
      pushBox2(parts, MATERIALS.cloth(bookColors[i]), bx, s * 0.42, s * 0.04, bh, s * 5e-3, 0.15);
    }
    for (let i = 0; i < 3; i++) {
      const bx = s * (0.22 + i * 0.2) + rng.jitter(s * 0.015);
      const bh = s * (0.04 + rng.float() * 0.025);
      pushBox2(parts, MATERIALS.cloth(bookColors[i + 3]), bx, s * 0.6, s * 0.04, bh, s * 5e-3, 0.15);
    }
    pushBox2(
      parts,
      MATERIALS.leather([shelfCol[0] + 10, shelfCol[1] + 7, shelfCol[2] + 5]),
      s * 0.5,
      s * 0.33,
      s * 0.38,
      s * 0.02,
      s * 8e-3,
      0.18
    );
    return parts;
  }
  function buildPillar(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const pillarCol = [108 + rng.jitter(8), 100 + rng.jitter(6), 92 + rng.jitter(6)];
    pushEllipse3(
      parts,
      MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42]),
      s * 0.52,
      s * 0.88,
      s * 0.18,
      s * 0.05,
      0.06
    );
    pushBox2(
      parts,
      MATERIALS.bone([pillarCol[0] - 8, pillarCol[1] - 6, pillarCol[2] - 5]),
      s * 0.5,
      s * 0.82,
      s * 0.16,
      s * 0.05,
      s * 0.02,
      0.22
    );
    pushBox2(parts, MATERIALS.bone(pillarCol), s * 0.5, s * 0.52, s * 0.1, s * 0.28, s * 0.06, 0.3);
    pushBox2(
      parts,
      MATERIALS.bone([pillarCol[0] - 5, pillarCol[1] - 4, pillarCol[2] - 3]),
      s * 0.5,
      s * 0.23,
      s * 0.14,
      s * 0.04,
      s * 0.02,
      0.25
    );
    pushEllipse3(
      parts,
      MATERIALS.bone([pillarCol[0] + 18, pillarCol[1] + 15, pillarCol[2] + 12]),
      s * 0.5,
      s * 0.19,
      s * 0.13,
      s * 0.04,
      0.22
    );
    pushBox2(
      parts,
      MATERIALS.bone([pillarCol[0] + 12, pillarCol[1] + 10, pillarCol[2] + 8]),
      s * 0.45,
      s * 0.52,
      s * 0.03,
      s * 0.22,
      s * 0.02,
      0.2
    );
    return parts;
  }
  function buildFountain(rng, s) {
    const parts = [];
    const floorCol = floorBase(parts, rng, s);
    const basinCol = [90 + rng.jitter(5), 84 + rng.jitter(4), 80 + rng.jitter(4)];
    pushEllipse3(
      parts,
      MATERIALS.bone([floorCol[0] * 0.45, floorCol[1] * 0.45, floorCol[2] * 0.42]),
      s * 0.52,
      s * 0.9,
      s * 0.28,
      s * 0.06,
      0.05
    );
    pushBox2(parts, MATERIALS.bone(basinCol), s * 0.5, s * 0.72, s * 0.28, s * 0.14, s * 0.03, 0.2);
    pushBox2(
      parts,
      MATERIALS.bone([basinCol[0] + 18, basinCol[1] + 15, basinCol[2] + 12]),
      s * 0.5,
      s * 0.58,
      s * 0.29,
      s * 0.012,
      s * 5e-3,
      0.18
    );
    const waterCol = [38 + rng.jitter(6), 72 + rng.jitter(8), 108 + rng.jitter(8)];
    pushEllipse3(parts, MATERIALS.glass(waterCol), s * 0.5, s * 0.52, s * 0.22, s * 0.1, 0.18);
    pushCapsule3(
      parts,
      MATERIALS.bone([basinCol[0] + 10, basinCol[1] + 8, basinCol[2] + 6]),
      s * 0.5,
      s * 0.52,
      s * 0.5,
      s * 0.3,
      Math.max(1.2, s * 0.025),
      0.25
    );
    pushCircle3(
      parts,
      MATERIALS.glass([waterCol[0] + 40, waterCol[1] + 45, waterCol[2] + 40]),
      s * 0.5,
      s * 0.28,
      s * 0.035,
      0.3
    );
    const rippleCol = [waterCol[0] + 28, waterCol[1] + 32, waterCol[2] + 25];
    const t = Math.max(1.2, s * 8e-3);
    const r1 = s * 0.08;
    pushCapsule3(parts, MATERIALS.glass(rippleCol), s * 0.5 - r1, s * 0.52, s * 0.5, s * 0.52 - r1 * 0.5, t, 0.15);
    pushCapsule3(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.52 - r1 * 0.5, s * 0.5 + r1, s * 0.52, t, 0.15);
    pushCapsule3(parts, MATERIALS.glass(rippleCol), s * 0.5 + r1, s * 0.52, s * 0.5, s * 0.52 + r1 * 0.5, t, 0.15);
    pushCapsule3(parts, MATERIALS.glass(rippleCol), s * 0.5, s * 0.52 + r1 * 0.5, s * 0.5 - r1, s * 0.52, t, 0.15);
    return parts;
  }
  function buildTile(config, s) {
    const rng = new RNG(config.seed ?? 0);
    switch (config.kind ?? "stone_floor") {
      case "dirt_floor":
        return buildDirtFloor(rng, s);
      case "stone_wall":
        return buildStoneWall(rng, s);
      case "crystal_floor":
        return buildCrystalFloor(rng, s);
      case "wood_door":
        return buildWoodDoor(rng, s);
      case "lava_floor":
        return buildLavaFloor(rng, s);
      case "ice_floor":
        return buildIceFloor(rng, s);
      case "moss_floor":
        return buildMossFloor(rng, s);
      case "spike_trap":
        return buildSpikeTrap(rng, s);
      case "stairs_down":
        return buildStairsDown(rng, s);
      case "stairs_up":
        return buildStairsUp(rng, s);
      case "cracked_wall":
        return buildCrackedWall(rng, s);
      case "pit":
        return buildPit(rng, s);
      case "water_pool":
        return buildWaterPool(rng, s);
      case "underground_river":
        return buildUndergroundRiver(rng, s);
      case "stalagmite":
        return buildStalagmite(rng, s);
      case "cobweb":
        return buildCobweb(rng, s);
      case "barrel":
        return buildBarrel(rng, s);
      case "chain":
        return buildChain(rng, s);
      case "bone_pile":
        return buildBonePile(rng, s);
      case "shop_counter":
        return buildShopCounter(rng, s);
      case "iron_gate":
        return buildIronGate(rng, s);
      case "torch_bracket":
        return buildTorchBracket(rng, s);
      case "altar":
        return buildAltar(rng, s);
      case "anvil":
        return buildAnvil(rng, s);
      case "bed":
        return buildBed(rng, s);
      case "table":
        return buildTable(rng, s);
      case "bookshelf":
        return buildBookshelf(rng, s);
      case "pillar":
        return buildPillar(rng, s);
      case "fountain":
        return buildFountain(rng, s);
      case "stone_floor":
      default:
        return buildStoneFloor(rng, s);
    }
  }
  var TILE_KINDS = ["stone_floor", "dirt_floor", "stone_wall", "crystal_floor", "wood_door", "lava_floor", "ice_floor", "moss_floor", "spike_trap", "stairs_down", "stairs_up", "cracked_wall", "pit", "water_pool", "underground_river", "stalagmite", "cobweb", "barrel", "chain", "bone_pile", "shop_counter", "iron_gate", "torch_bracket", "altar", "anvil", "bed", "table", "bookshelf", "pillar", "fountain"];

  // src/field.ts
  function edt1d(f, n, out) {
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const d = q - v[k];
      out[q] = d * d + f[v[k]];
    }
  }
  function distanceField(mask, w, h) {
    const INF = 1e12;
    const g = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = mask[i] ? INF : 0;
    const colIn = new Float64Array(h);
    const colOut = new Float64Array(h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) colIn[y] = g[y * w + x];
      edt1d(colIn, h, colOut);
      for (let y = 0; y < h; y++) g[y * w + x] = colOut[y];
    }
    const rowIn = new Float64Array(w);
    const rowOut = new Float64Array(w);
    for (let y = 0; y < h; y++) {
      const base = y * w;
      for (let x = 0; x < w; x++) rowIn[x] = g[base + x];
      edt1d(rowIn, w, rowOut);
      for (let x = 0; x < w; x++) g[base + x] = rowOut[x];
    }
    const dist = new Float32Array(w * h);
    let maxDist = 0;
    for (let i = 0; i < w * h; i++) {
      const d = mask[i] ? Math.sqrt(g[i]) : 0;
      dist[i] = d;
      if (d > maxDist) maxDist = d;
    }
    return { dist, maxDist };
  }
  function fieldToNormals(dist, mask, w, h, bevel) {
    const nx = new Float32Array(w * h);
    const ny = new Float32Array(w * h);
    const nz = new Float32Array(w * h);
    const HALF_PI = Math.PI / 2;
    const inv = bevel > 1e-3 ? 1 / bevel : 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const xm = x > 0 ? dist[i - 1] : dist[i];
        const xp = x < w - 1 ? dist[i + 1] : dist[i];
        const ym = y > 0 ? dist[i - w] : dist[i];
        const yp = y < h - 1 ? dist[i + w] : dist[i];
        let gx = (xp - xm) * 0.5;
        let gy = (yp - ym) * 0.5;
        const glen = Math.hypot(gx, gy) || 1e-6;
        gx /= glen;
        gy /= glen;
        const t = dist[i] * inv;
        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
        const theta = HALF_PI * (1 - tc);
        const s = Math.sin(theta);
        nx[i] = -gx * s;
        ny[i] = -gy * s;
        nz[i] = Math.cos(theta);
      }
    }
    return { nx, ny, nz };
  }

  // src/color.ts
  var clamp = (v, lo = 0, hi = 1) => v < lo ? lo : v > hi ? hi : v;
  var clamp255 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function scale(c, k) {
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6));
    return t * t * (3 - 2 * t);
  }
  var WHITE = [255, 255, 255];
  function buildRamp(base, coolShift) {
    const cool = (c, amt) => [
      c[0] * (1 - 0.12 * amt),
      c[1] * (1 - 0.04 * amt),
      c[2] * (1 + 0.08 * amt)
    ];
    const warm = (c, amt) => [
      c[0] + (255 - c[0]) * 0.12 * amt,
      c[1] + (255 - c[1]) * 0.08 * amt,
      c[2] + (255 - c[2]) * 0.02 * amt
    ];
    return {
      core: cool(scale(base, 0.38), coolShift),
      shadow: cool(scale(base, 0.65), coolShift),
      mid: base,
      light: warm(scale(base, 1.14), 1),
      hi: warm(mix(scale(base, 1.2), WHITE, 0.22), 1)
    };
  }
  function sampleRamp(r, x) {
    if (x < 0.35) return mix(r.core, r.shadow, smoothstep(0, 0.35, x));
    if (x < 0.48) return mix(r.shadow, r.mid, smoothstep(0.35, 0.48, x));
    if (x < 0.74) return mix(r.mid, r.light, smoothstep(0.48, 0.74, x));
    return mix(r.light, r.hi, smoothstep(0.74, 1, x));
  }
  function quantizeChannel(v, levels) {
    if (levels <= 1) return v;
    const step = 255 / (levels - 1);
    return Math.round(v / step) * step;
  }

  // src/lighting.ts
  function normalize(v) {
    const l = Math.hypot(v.x, v.y, v.z) || 1e-6;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }
  var VIEW = { x: 0, y: 0, z: 1 };
  function makeShadeContext(mat, light) {
    const L = normalize(light.dir);
    const H = normalize({ x: L.x + VIEW.x, y: L.y + VIEW.y, z: L.z + VIEW.z });
    const shininess = 8 + (1 - mat.roughness) * (1 - mat.roughness) * 132;
    const specColor = mat.metallic ? [
      // tint white toward the base color for a metallic highlight
      255 * 0.35 + mat.base[0] * 0.65,
      255 * 0.35 + mat.base[1] * 0.65,
      255 * 0.35 + mat.base[2] * 0.65
    ] : [255, 255, 255];
    return {
      ramp: buildRamp(mat.base, mat.shadowCoolShift),
      L,
      H,
      ambient: light.ambient,
      shininess,
      specStrength: mat.specStrength,
      specColor
    };
  }
  function shade(ctx, nx, ny, nz, out) {
    const ndotl = nx * ctx.L.x + ny * ctx.L.y + nz * ctx.L.z;
    const x = clamp(ctx.ambient + (1 - ctx.ambient) * (ndotl * 0.5 + 0.5));
    const diff = sampleRamp(ctx.ramp, x);
    const ndoth = nx * ctx.H.x + ny * ctx.H.y + nz * ctx.H.z;
    let spec = 0;
    if (ndoth > 0 && ctx.specStrength > 0) {
      spec = Math.pow(ndoth, ctx.shininess) * ctx.specStrength;
    }
    out[0] = diff[0] + ctx.specColor[0] * spec;
    out[1] = diff[1] + ctx.specColor[1] * spec;
    out[2] = diff[2] + ctx.specColor[2] * spec;
  }

  // src/engine.ts
  var DEFAULT_LIGHT = {
    // toward upper-left-front (remember: +y is down, so -y is up)
    dir: { x: -0.5, y: -0.78, z: 0.62 },
    ambient: 0.22
  };
  function resolveRenderOpts(config = {}) {
    const size = config.size ?? 48;
    const ss = Math.max(1, Math.floor(config.supersample ?? 1));
    const light = {
      dir: { ...DEFAULT_LIGHT.dir, ...config.light ?? {} },
      ambient: config.ambient ?? DEFAULT_LIGHT.ambient
    };
    const outlineColor = config.outline === false ? null : config.outline && config.outline.color || [22, 18, 28];
    const quantize = config.quantize === false ? 0 : config.quantize ?? 5;
    return { size, ss, W: size * ss, H: size * ss, roundness: config.roundness ?? 0.55, light, outlineColor, quantize };
  }
  function renderParts(parts, opts) {
    const { size, ss, W, H, roundness, light } = opts;
    const acc = new Float32Array(W * H * 4);
    const out = [0, 0, 0];
    for (const part of parts) {
      const [bx0, by0, bx1, by1] = part.bbox;
      const cx0 = Math.max(0, (bx0 | 0) - 1);
      const cy0 = Math.max(0, (by0 | 0) - 1);
      const cx1 = Math.min(W, (bx1 | 0) + 2);
      const cy1 = Math.min(H, (by1 | 0) + 2);
      const cw = cx1 - cx0, ch = cy1 - cy0;
      if (cw <= 0 || ch <= 0) continue;
      const mask = new Uint8Array(cw * ch);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (part.sdf(cx0 + x + 0.5, cy0 + y + 0.5) < 0) mask[y * cw + x] = 1;
        }
      }
      const { dist, maxDist } = distanceField(mask, cw, ch);
      if (maxDist <= 0) continue;
      const pr = part.roundness ?? roundness;
      const bevel = Math.max(1.5, pr * maxDist);
      const { nx, ny, nz } = fieldToNormals(dist, mask, cw, ch, bevel);
      const ctx = makeShadeContext(part.material, light);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const li = y * cw + x;
          if (!mask[li]) continue;
          shade(ctx, nx[li], ny[li], nz[li], out);
          const j = ((cy0 + y) * W + (cx0 + x)) * 4;
          acc[j] = out[0];
          acc[j + 1] = out[1];
          acc[j + 2] = out[2];
          acc[j + 3] = 255;
        }
      }
    }
    const data = new Uint8ClampedArray(size * size * 4);
    const area = ss * ss;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < ss; sy++) {
          for (let sx = 0; sx < ss; sx++) {
            const si = ((y * ss + sy) * W + (x * ss + sx)) * 4;
            const sa = acc[si + 3];
            const w = sa / 255;
            r += acc[si] * w;
            g += acc[si + 1] * w;
            b += acc[si + 2] * w;
            a += sa;
          }
        }
        const di = (y * size + x) * 4;
        const aw = a > 0 ? a / 255 : 1;
        data[di] = clamp255(r / aw);
        data[di + 1] = clamp255(g / aw);
        data[di + 2] = clamp255(b / aw);
        data[di + 3] = clamp255(a / area);
      }
    }
    if (opts.outlineColor) applyOutline(data, size, size, opts.outlineColor);
    if (opts.quantize > 1) {
      const levels = opts.quantize;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;
        data[i] = quantizeChannel(data[i], levels);
        data[i + 1] = quantizeChannel(data[i + 1], levels);
        data[i + 2] = quantizeChannel(data[i + 2], levels);
      }
    }
    return { width: size, height: size, data };
  }
  function generateSprite(config = {}, pose) {
    const opts = resolveRenderOpts(config);
    const parts = buildSkeleton(config, opts.W, pose);
    return renderParts(parts, opts);
  }
  function generateEnemy(config = {}) {
    const opts = resolveRenderOpts(config);
    const parts = buildCreature(config, opts.W);
    return renderParts(parts, opts);
  }
  function generateItem(config = {}) {
    const opts = resolveRenderOpts(config);
    const parts = buildItem(config, opts.W);
    return renderParts(parts, opts);
  }
  function generateTile(config = {}) {
    const opts = resolveRenderOpts(config);
    const parts = buildTile(config, opts.W);
    return renderParts(parts, opts);
  }
  function applyOutline(data, w, h, color) {
    const isSolid = (x, y) => x >= 0 && x < w && y >= 0 && y < h && data[(y * w + x) * 4 + 3] > 128;
    const snapshotAlpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) snapshotAlpha[i] = data[i * 4 + 3] > 128 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (snapshotAlpha[i]) continue;
        if (isSolid(x - 1, y) || isSolid(x + 1, y) || isSolid(x, y - 1) || isSolid(x, y + 1)) {
          const j = i * 4;
          data[j] = color[0];
          data[j + 1] = color[1];
          data[j + 2] = color[2];
          data[j + 3] = 255;
        }
      }
    }
  }

  // src/effects.ts
  function generateShadow(size, opacity = 0.4) {
    const w = size;
    const h = Math.max(1, Math.ceil(size * 0.3));
    const data = new Uint8ClampedArray(w * h * 4);
    const cx = w * 0.5, cy = h * 0.5;
    const rx = w * 0.42, ry = h * 0.42;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d < 1) {
          const i = (y * w + x) * 4;
          data[i + 3] = clamp255((1 - d) * opacity * 255);
        }
      }
    }
    return { width: w, height: h, data };
  }
  function generateSlashEffect(config = {}) {
    const size = config.size ?? 32;
    const color = config.color ?? [255, 240, 200];
    const ss = config.supersample ?? 2;
    const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const mat = MATERIALS.glass(color);
    const core = MATERIALS.ember([255, 255, 240]);
    const cx = s * 0.45, cy = s * 0.5;
    const r = s * 0.35;
    const segs = 5;
    const a0 = -Math.PI * 0.65, a1 = Math.PI * 0.25;
    for (let i = 0; i < segs; i++) {
      const t0 = a0 + (a1 - a0) * (i / segs);
      const t1 = a0 + (a1 - a0) * ((i + 1) / segs);
      const ax = cx + Math.cos(t0) * r, ay = cy + Math.sin(t0) * r;
      const bx = cx + Math.cos(t1) * r, by = cy + Math.sin(t1) * r;
      const w = s * 0.03;
      parts.push({
        material: mat,
        roundness: 0.9,
        sdf: capsule(ax, ay, bx, by, w),
        bbox: [
          Math.floor(Math.min(ax, bx) - w - 2),
          Math.floor(Math.min(ay, by) - w - 2),
          Math.ceil(Math.max(ax, bx) + w + 2),
          Math.ceil(Math.max(ay, by) + w + 2)
        ]
      });
      const wc = s * 0.014;
      parts.push({
        material: core,
        roundness: 0.9,
        sdf: capsule(ax, ay, bx, by, wc),
        bbox: [
          Math.floor(Math.min(ax, bx) - wc - 2),
          Math.floor(Math.min(ay, by) - wc - 2),
          Math.ceil(Math.max(ax, bx) + wc + 2),
          Math.ceil(Math.max(ay, by) + wc + 2)
        ]
      });
    }
    return renderParts(parts, opts);
  }
  function generateImpactEffect(config = {}) {
    const size = config.size ?? 24;
    const color = config.color ?? [255, 220, 100];
    const ss = config.supersample ?? 2;
    const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const mat = MATERIALS.ember(color);
    const cx = s * 0.5, cy = s * 0.5;
    const rays = 6;
    for (let i = 0; i < rays; i++) {
      const a = i / rays * Math.PI * 2 + 0.2;
      const len = s * (0.24 + i % 2 * 0.1);
      const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
      const r = s * 0.022;
      parts.push({
        material: mat,
        roundness: 0.8,
        sdf: capsule(cx, cy, bx, by, r),
        bbox: [
          Math.floor(Math.min(cx, bx) - r - 2),
          Math.floor(Math.min(cy, by) - r - 2),
          Math.ceil(Math.max(cx, bx) + r + 2),
          Math.ceil(Math.max(cy, by) + r + 2)
        ]
      });
    }
    const cr = s * 0.055;
    parts.push({
      material: MATERIALS.ember([255, 255, 230]),
      roundness: 1,
      sdf: circle(cx, cy, cr),
      bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)]
    });
    return renderParts(parts, opts);
  }
  function generateProjectile(config = {}) {
    const kind = config.kind ?? "arrow";
    const size = config.size ?? 16;
    const ss = config.supersample ?? 2;
    const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    switch (kind) {
      case "arrow": {
        const color = config.color ?? [180, 160, 130];
        const shaft = MATERIALS.leather(color);
        const head = MATERIALS.metal([160, 165, 175]);
        const fletch = MATERIALS.cloth([180, 60, 50]);
        const r1 = Math.max(1.2, s * 0.025), r2 = Math.max(1.5, s * 0.04), rf = Math.max(1, s * 0.018);
        parts.push({
          material: shaft,
          roundness: 0.7,
          sdf: capsule(cx - s * 0.28, cy, cx + s * 0.18, cy, r1),
          bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - r1 - 2), Math.ceil(cx + s * 0.2), Math.ceil(cy + r1 + 2)]
        });
        parts.push({
          material: head,
          roundness: 0.5,
          sdf: capsule(cx + s * 0.18, cy, cx + s * 0.34, cy, r2),
          bbox: [Math.floor(cx + s * 0.15), Math.floor(cy - r2 - 2), Math.ceil(cx + s * 0.37), Math.ceil(cy + r2 + 2)]
        });
        parts.push({
          material: fletch,
          roundness: 0.4,
          sdf: capsule(cx - s * 0.28, cy - s * 0.04, cx - s * 0.18, cy, rf),
          bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - s * 0.06), Math.ceil(cx - s * 0.16), Math.ceil(cy + rf + 2)]
        });
        parts.push({
          material: fletch,
          roundness: 0.4,
          sdf: capsule(cx - s * 0.28, cy + s * 0.04, cx - s * 0.18, cy, rf),
          bbox: [Math.floor(cx - s * 0.3), Math.floor(cy - rf - 2), Math.ceil(cx - s * 0.16), Math.ceil(cy + s * 0.06)]
        });
        break;
      }
      case "fireball": {
        const color = config.color ?? [255, 140, 40];
        const r = s * 0.14, ri = s * 0.07;
        parts.push({
          material: MATERIALS.ember(color),
          roundness: 1,
          sdf: circle(cx, cy, r),
          bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)]
        });
        parts.push({
          material: MATERIALS.ember([255, 240, 180]),
          roundness: 1,
          sdf: circle(cx, cy, ri),
          bbox: [Math.floor(cx - ri - 2), Math.floor(cy - ri - 2), Math.ceil(cx + ri + 2), Math.ceil(cy + ri + 2)]
        });
        break;
      }
      case "magic_bolt": {
        const color = config.color ?? [120, 80, 255];
        const ro = Math.max(1.5, s * 0.05), ri = Math.max(1, s * 0.025);
        parts.push({
          material: MATERIALS.ember(color),
          roundness: 0.8,
          sdf: capsule(cx - s * 0.2, cy, cx + s * 0.2, cy, ro),
          bbox: [Math.floor(cx - s * 0.24), Math.floor(cy - ro - 2), Math.ceil(cx + s * 0.24), Math.ceil(cy + ro + 2)]
        });
        parts.push({
          material: MATERIALS.ember([200, 180, 255]),
          roundness: 0.8,
          sdf: capsule(cx - s * 0.1, cy, cx + s * 0.1, cy, ri),
          bbox: [Math.floor(cx - s * 0.12), Math.floor(cy - ri - 2), Math.ceil(cx + s * 0.12), Math.ceil(cy + ri + 2)]
        });
        break;
      }
    }
    return renderParts(parts, opts);
  }
  function generateSparkle(config = {}) {
    const size = config.size ?? 16;
    const color = config.color ?? [255, 255, 200];
    const ss = config.supersample ?? 2;
    const opts = resolveRenderOpts({ size, supersample: ss, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const mat = MATERIALS.ember(color);
    const cx = s * 0.5, cy = s * 0.5;
    const r = s * 0.025;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI + Math.PI / 8;
      const len = s * (i % 2 === 0 ? 0.3 : 0.18);
      const ax = cx + Math.cos(a) * len, ay = cy + Math.sin(a) * len;
      const bx = cx - Math.cos(a) * len, by = cy - Math.sin(a) * len;
      parts.push({
        material: mat,
        roundness: 0.8,
        sdf: capsule(ax, ay, bx, by, r),
        bbox: [
          Math.floor(Math.min(ax, bx) - r - 2),
          Math.floor(Math.min(ay, by) - r - 2),
          Math.ceil(Math.max(ax, bx) + r + 2),
          Math.ceil(Math.max(ay, by) + r + 2)
        ]
      });
    }
    const cr = s * 0.045;
    parts.push({
      material: MATERIALS.ember([255, 255, 255]),
      roundness: 1,
      sdf: circle(cx, cy, cr),
      bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)]
    });
    return renderParts(parts, opts);
  }
  function buildSlashEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.glass(color);
    const core = MATERIALS.ember([255, 255, 240]);
    const cx = s * 0.45, cy = s * 0.5;
    const r = s * 0.35;
    const segs = 5;
    const a0 = -Math.PI * 0.65, a1 = Math.PI * 0.25;
    const visibleSegs = Math.ceil(segs * phase * amp + (1 - amp) * segs);
    for (let i = 0; i < visibleSegs && i < segs; i++) {
      const t0 = a0 + (a1 - a0) * (i / segs);
      const t1 = a0 + (a1 - a0) * ((i + 1) / segs);
      const ax = cx + Math.cos(t0) * r, ay = cy + Math.sin(t0) * r;
      const bx = cx + Math.cos(t1) * r, by = cy + Math.sin(t1) * r;
      const fade = 1 - i / segs * 0.3;
      const w = s * 0.03 * fade;
      parts.push({
        material: mat,
        roundness: 0.9,
        sdf: capsule(ax, ay, bx, by, w),
        bbox: [
          Math.floor(Math.min(ax, bx) - w - 2),
          Math.floor(Math.min(ay, by) - w - 2),
          Math.ceil(Math.max(ax, bx) + w + 2),
          Math.ceil(Math.max(ay, by) + w + 2)
        ]
      });
      const wc = s * 0.014 * fade;
      parts.push({
        material: core,
        roundness: 0.9,
        sdf: capsule(ax, ay, bx, by, wc),
        bbox: [
          Math.floor(Math.min(ax, bx) - wc - 2),
          Math.floor(Math.min(ay, by) - wc - 2),
          Math.ceil(Math.max(ax, bx) + wc + 2),
          Math.ceil(Math.max(ay, by) + wc + 2)
        ]
      });
    }
    return parts;
  }
  function buildImpactEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.ember(color);
    const cx = s * 0.5, cy = s * 0.5;
    const rays = 6;
    const expand = (0.3 + 0.7 * phase) * amp + (1 - amp);
    const fade = 1 - phase * 0.6;
    for (let i = 0; i < rays; i++) {
      const a = i / rays * Math.PI * 2 + 0.2;
      const len = s * (0.24 + i % 2 * 0.1) * expand;
      const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
      const r = Math.max(1, s * 0.022 * fade);
      parts.push({
        material: mat,
        roundness: 0.8,
        sdf: capsule(cx, cy, bx, by, r),
        bbox: [
          Math.floor(Math.min(cx, bx) - r - 2),
          Math.floor(Math.min(cy, by) - r - 2),
          Math.ceil(Math.max(cx, bx) + r + 2),
          Math.ceil(Math.max(cy, by) + r + 2)
        ]
      });
    }
    const cr = Math.max(1, s * 0.055 * fade);
    parts.push({
      material: MATERIALS.ember([255, 255, 230]),
      roundness: 1,
      sdf: circle(cx, cy, cr),
      bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)]
    });
    return parts;
  }
  function buildSparkleEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.ember(color);
    const cx = s * 0.5, cy = s * 0.5;
    const rot = phase * Math.PI * 0.5 * amp;
    const pulse2 = 1 + 0.2 * wave(phase, 2) * amp;
    const r = Math.max(1, s * 0.025 * pulse2);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI + Math.PI / 8 + rot;
      const len = s * (i % 2 === 0 ? 0.3 : 0.18) * pulse2;
      const ax = cx + Math.cos(a) * len, ay = cy + Math.sin(a) * len;
      const bx = cx - Math.cos(a) * len, by = cy - Math.sin(a) * len;
      parts.push({
        material: mat,
        roundness: 0.8,
        sdf: capsule(ax, ay, bx, by, r),
        bbox: [
          Math.floor(Math.min(ax, bx) - r - 2),
          Math.floor(Math.min(ay, by) - r - 2),
          Math.ceil(Math.max(ax, bx) + r + 2),
          Math.ceil(Math.max(ay, by) + r + 2)
        ]
      });
    }
    const cr = Math.max(1, s * 0.045 * pulse2);
    parts.push({
      material: MATERIALS.ember([255, 255, 255]),
      roundness: 1,
      sdf: circle(cx, cy, cr),
      bbox: [Math.floor(cx - cr - 2), Math.floor(cy - cr - 2), Math.ceil(cx + cr + 2), Math.ceil(cy + cr + 2)]
    });
    return parts;
  }
  function buildFireballEffect(s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    const breathe = 1 + wave(phase, 3) * 0.12 * amp;
    const flick = wave(phase, 5) * s * 0.015 * amp;
    const r = s * 0.14 * breathe, ri = s * 0.07 * breathe;
    parts.push({
      material: MATERIALS.ember(color),
      roundness: 1,
      sdf: circle(cx + flick, cy, r),
      bbox: [Math.floor(cx + flick - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + flick + r + 2), Math.ceil(cy + r + 2)]
    });
    parts.push({
      material: MATERIALS.ember([255, 240, 180]),
      roundness: 1,
      sdf: circle(cx + flick * 0.3, cy, ri),
      bbox: [Math.floor(cx + flick * 0.3 - ri - 2), Math.floor(cy - ri - 2), Math.ceil(cx + flick * 0.3 + ri + 2), Math.ceil(cy + ri + 2)]
    });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + phase * Math.PI * 2;
      const wr = s * 0.04;
      const wx = cx + Math.cos(a) * r * 0.85, wy = cy + Math.sin(a) * r * 0.85;
      parts.push({
        material: MATERIALS.ember([255, 200, 80]),
        roundness: 1,
        sdf: circle(wx, wy, Math.max(1, wr)),
        bbox: [Math.floor(wx - wr - 2), Math.floor(wy - wr - 2), Math.ceil(wx + wr + 2), Math.ceil(wy + wr + 2)]
      });
    }
    return parts;
  }
  function buildMagicBoltEffect(s, color, phase, amp) {
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    const pulse2 = 1 + wave(phase, 2) * 0.15 * amp;
    const ro = Math.max(1.5, s * 0.05 * pulse2), ri = Math.max(1, s * 0.025 * pulse2);
    parts.push({
      material: MATERIALS.ember(color),
      roundness: 0.8,
      sdf: capsule(cx - s * 0.2, cy, cx + s * 0.2, cy, ro),
      bbox: [Math.floor(cx - s * 0.24), Math.floor(cy - ro - 2), Math.ceil(cx + s * 0.24), Math.ceil(cy + ro + 2)]
    });
    parts.push({
      material: MATERIALS.ember([200, 180, 255]),
      roundness: 0.8,
      sdf: capsule(cx - s * 0.1, cy, cx + s * 0.1, cy, ri),
      bbox: [Math.floor(cx - s * 0.12), Math.floor(cy - ri - 2), Math.ceil(cx + s * 0.12), Math.ceil(cy + ri + 2)]
    });
    for (let i = 0; i < 2; i++) {
      const offset = wave(phase, 3, i * 0.5) * s * 0.06 * amp;
      const cr = Math.max(1, s * 0.015);
      const ex = cx + (i === 0 ? -s * 0.12 : s * 0.12);
      parts.push({
        material: MATERIALS.ember([230, 220, 255]),
        roundness: 0.9,
        sdf: capsule(ex, cy + offset, ex + s * 0.06, cy - offset, cr),
        bbox: [
          Math.floor(ex - cr - 2),
          Math.floor(cy - Math.abs(offset) - cr - 2),
          Math.ceil(ex + s * 0.06 + cr + 2),
          Math.ceil(cy + Math.abs(offset) + cr + 2)
        ]
      });
    }
    return parts;
  }
  function buildWaterRippleEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.glass([150, 200, 220]);
    const cx = s * 0.5, cy = s * 0.5;
    const maxR = s * 0.4;
    for (let i = 0; i < 3; i++) {
      const ringPhase = (phase * amp + i * 0.33) % 1;
      const radius = ringPhase * maxR;
      const thickness = Math.max(1, s * 0.02 * (1 - ringPhase));
      if (radius < 1) continue;
      const segs = 8;
      for (let j = 0; j < segs; j++) {
        const a0 = j / segs * Math.PI * 2;
        const a1 = (j + 1) / segs * Math.PI * 2;
        const ax = cx + Math.cos(a0) * radius, ay = cy + Math.sin(a0) * radius;
        const bx = cx + Math.cos(a1) * radius, by = cy + Math.sin(a1) * radius;
        parts.push({
          material: mat,
          roundness: 0.9,
          sdf: capsule(ax, ay, bx, by, thickness),
          bbox: [
            Math.floor(Math.min(ax, bx) - thickness - 2),
            Math.floor(Math.min(ay, by) - thickness - 2),
            Math.ceil(Math.max(ax, bx) + thickness + 2),
            Math.ceil(Math.max(ay, by) + thickness + 2)
          ]
        });
      }
    }
    return parts;
  }
  function buildSmokeEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.bone([120, 115, 110]);
    const cx = s * 0.5, baseY = s * 0.7;
    const rise = phase * amp * s * 0.4;
    const expand = 1 + phase * amp * 0.8;
    for (let i = 0; i < 4; i++) {
      const spread = (i - 1.5) * s * 0.06 * expand;
      const puffCy = baseY - rise - i * s * 0.04;
      const r = Math.max(1.2, s * (0.04 + i * 0.015) * expand);
      parts.push({
        material: mat,
        roundness: 0.8,
        sdf: circle(cx + spread, puffCy, r),
        bbox: [
          Math.floor(cx + spread - r - 2),
          Math.floor(puffCy - r - 2),
          Math.ceil(cx + spread + r + 2),
          Math.ceil(puffCy + r + 2)
        ]
      });
    }
    return parts;
  }
  function buildDripEffect(s, color, phase, amp) {
    const parts = [];
    const mat = MATERIALS.glass([140, 180, 210]);
    const cx = s * 0.5;
    const topY = s * 0.15;
    const botY = s * 0.8;
    const dropY = topY + (botY - topY) * phase * amp;
    const rx = Math.max(1.2, s * 0.025);
    const ry = Math.max(1.5, s * 0.04);
    if (phase * amp < 0.85) {
      parts.push({
        material: mat,
        roundness: 0.9,
        sdf: ellipse(cx, dropY, rx, ry),
        bbox: [
          Math.floor(cx - rx - 2),
          Math.floor(dropY - ry - 2),
          Math.ceil(cx + rx + 2),
          Math.ceil(dropY + ry + 2)
        ]
      });
    }
    if (phase * amp > 0.8) {
      const splashPhase = (phase * amp - 0.8) / 0.2;
      for (let i = -1; i <= 1; i++) {
        const sr = Math.max(1, s * 0.015 * (1 - splashPhase * 0.5));
        const sx = cx + i * s * 0.05 * splashPhase;
        const sy = botY - s * 0.02 * splashPhase;
        parts.push({
          material: mat,
          roundness: 0.9,
          sdf: circle(sx, sy, sr),
          bbox: [
            Math.floor(sx - sr - 2),
            Math.floor(sy - sr - 2),
            Math.ceil(sx + sr + 2),
            Math.ceil(sy + sr + 2)
          ]
        });
      }
    }
    return parts;
  }
  function buildEffect(kind, s, color, phase, amp) {
    switch (kind) {
      case "slash":
        return buildSlashEffect(s, color, phase, amp);
      case "impact":
        return buildImpactEffect(s, color, phase, amp);
      case "sparkle":
        return buildSparkleEffect(s, color, phase, amp);
      case "fireball":
        return buildFireballEffect(s, color, phase, amp);
      case "magic_bolt":
        return buildMagicBoltEffect(s, color, phase, amp);
      case "water_ripple":
        return buildWaterRippleEffect(s, color, phase, amp);
      case "smoke":
        return buildSmokeEffect(s, color, phase, amp);
      case "drip":
        return buildDripEffect(s, color, phase, amp);
    }
  }
  function flashSprite(sprite) {
    const data = new Uint8ClampedArray(sprite.data);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    return { width: sprite.width, height: sprite.height, data };
  }
  function tintSprite(sprite, color, amount) {
    const data = new Uint8ClampedArray(sprite.data);
    const inv = 1 - amount;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8) {
        data[i] = clamp255(data[i] * inv + color[0] * amount);
        data[i + 1] = clamp255(data[i + 1] * inv + color[1] * amount);
        data[i + 2] = clamp255(data[i + 2] * inv + color[2] * amount);
      }
    }
    return { width: sprite.width, height: sprite.height, data };
  }
  function applyStatusEffect(sprite, effect, phase = 0) {
    switch (effect) {
      case "poison":
        return tintSprite(sprite, [50, 210, 70], 0.22 + 0.1 * Math.sin(phase * Math.PI * 2));
      case "frozen":
        return tintSprite(sprite, [130, 200, 255], 0.35);
      case "burning":
        return tintSprite(sprite, [255, 110, 30], 0.18 + 0.14 * Math.sin(phase * Math.PI * 2));
    }
  }

  // src/animation.ts
  function generateAnimation(config, animationName) {
    const clip = CLIPS[animationName];
    if (!clip) {
      throw new Error(`Unknown animation "${animationName}". Available: ${Object.keys(CLIPS).join(", ")}`);
    }
    const opts = resolveRenderOpts(config);
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const phase = clip.loop ? i / clip.frames : clip.frames > 1 ? i / (clip.frames - 1) : 0;
      const pose = samplePose(clip, phase);
      const parts = buildSkeleton(config, opts.W, pose);
      frames.push(renderParts(parts, opts));
    }
    return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
  }
  function listAnimations() {
    return Object.keys(CLIPS);
  }
  var ENEMY_CLIPS = {
    idle: { name: "idle", fps: 8, loop: true, frames: 8, amp: 0.4 },
    move: { name: "move", fps: 12, loop: true, frames: 8, amp: 1 },
    death: { name: "death", fps: 10, loop: false, frames: 6, amp: 1 },
    hit: { name: "hit", fps: 14, loop: false, frames: 4, amp: 1 },
    emerge: { name: "emerge", fps: 10, loop: false, frames: 6, amp: 1 }
  };
  function generateEnemyAnimation(config, animationName) {
    const clip = ENEMY_CLIPS[animationName];
    if (!clip) {
      throw new Error(`Unknown enemy animation "${animationName}". Available: ${Object.keys(ENEMY_CLIPS).join(", ")}`);
    }
    const opts = resolveRenderOpts(config);
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const phase = i / clip.frames;
      const parts = buildCreature(config, opts.W, phase, clip.amp);
      frames.push(renderParts(parts, opts));
    }
    return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
  }
  function listEnemyAnimations() {
    return Object.keys(ENEMY_CLIPS);
  }
  var ITEM_CLIPS = {
    idle: { name: "idle", fps: 8, loop: true, frames: 8, amp: 0.4 },
    active: { name: "active", fps: 10, loop: true, frames: 8, amp: 1 },
    pickup: { name: "pickup", fps: 12, loop: false, frames: 6, amp: 1 }
  };
  function generateItemAnimation(config, animationName) {
    const clip = ITEM_CLIPS[animationName];
    if (!clip) {
      throw new Error(`Unknown item animation "${animationName}". Available: ${Object.keys(ITEM_CLIPS).join(", ")}`);
    }
    const opts = resolveRenderOpts(config);
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const phase = clip.loop ? i / clip.frames : clip.frames > 1 ? i / (clip.frames - 1) : 0;
      const parts = buildItem(config, opts.W, phase, clip.amp);
      frames.push(renderParts(parts, opts));
    }
    return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
  }
  function listItemAnimations() {
    return Object.keys(ITEM_CLIPS);
  }
  var EFFECT_CLIPS = {
    slash: { name: "slash", fps: 16, loop: false, frames: 6, amp: 1 },
    impact: { name: "impact", fps: 16, loop: false, frames: 5, amp: 1 },
    sparkle: { name: "sparkle", fps: 10, loop: true, frames: 8, amp: 1 },
    fireball: { name: "fireball", fps: 12, loop: true, frames: 8, amp: 1 },
    magic_bolt: { name: "magic_bolt", fps: 12, loop: true, frames: 8, amp: 1 },
    water_ripple: { name: "water_ripple", fps: 10, loop: true, frames: 8, amp: 1 },
    smoke: { name: "smoke", fps: 10, loop: false, frames: 8, amp: 1 },
    drip: { name: "drip", fps: 12, loop: false, frames: 6, amp: 1 }
  };
  var DEFAULT_EFFECT_COLORS = {
    slash: [255, 240, 200],
    impact: [255, 220, 100],
    sparkle: [255, 255, 200],
    fireball: [255, 140, 40],
    magic_bolt: [120, 80, 255],
    water_ripple: [150, 200, 220],
    smoke: [120, 115, 110],
    drip: [140, 180, 210]
  };
  function generateEffectAnimation(config, animationName) {
    const kind = config.kind ?? "slash";
    const clipName = animationName ?? kind;
    const clip = EFFECT_CLIPS[clipName];
    if (!clip) {
      throw new Error(`Unknown effect animation "${clipName}". Available: ${Object.keys(EFFECT_CLIPS).join(", ")}`);
    }
    const color = config.color ?? DEFAULT_EFFECT_COLORS[kind];
    const opts = resolveRenderOpts({ size: config.size ?? 32, supersample: config.supersample ?? 2, outline: false, quantize: false });
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const phase = clip.loop ? i / clip.frames : clip.frames > 1 ? i / (clip.frames - 1) : 0;
      const parts = buildEffect(kind, opts.W, color, phase, clip.amp);
      frames.push(renderParts(parts, opts));
    }
    return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
  }
  function listEffectAnimations() {
    return Object.keys(EFFECT_CLIPS);
  }
  function packSpriteSheet(frames) {
    if (frames.length === 0) return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    const fw = frames[0].width, fh = frames[0].height, n = frames.length;
    const W = fw * n;
    const data = new Uint8ClampedArray(W * fh * 4);
    for (let i = 0; i < n; i++) {
      const f = frames[i];
      for (let y = 0; y < fh; y++) {
        const srcRow = y * fw * 4;
        const dstRow = (y * W + i * fw) * 4;
        data.set(f.data.subarray(srcRow, srcRow + fw * 4), dstRow);
      }
    }
    return { width: W, height: fh, data };
  }

  // src/loot.ts
  function pushCircle4(parts, mat, cx, cy, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: circle(cx, cy, r),
      bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)]
    });
  }
  function pushEllipse4(parts, mat, cx, cy, rx, ry, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: ellipse(cx, cy, rx, ry),
      bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)]
    });
  }
  function pushBox3(parts, mat, cx, cy, hx, hy, corner, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: roundedBox(cx, cy, hx, hy, corner),
      bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)]
    });
  }
  function pushCapsule4(parts, mat, ax, ay, bx, by, r, roundness) {
    parts.push({
      material: mat,
      roundness,
      sdf: capsule(ax, ay, bx, by, r),
      bbox: [
        Math.floor(Math.min(ax, bx) - r - 2),
        Math.floor(Math.min(ay, by) - r - 2),
        Math.ceil(Math.max(ax, bx) + r + 2),
        Math.ceil(Math.max(ay, by) + r + 2)
      ]
    });
  }
  function buildLootBag(rng, s, color) {
    const parts = [];
    const cx = s * 0.5;
    const sack = MATERIALS.leather(color);
    const tie = MATERIALS.leather([color[0] * 0.6, color[1] * 0.55, color[2] * 0.5]);
    pushEllipse4(parts, MATERIALS.bone([40, 36, 32]), cx + s * 0.02, s * 0.76, s * 0.18, s * 0.05, 0.05);
    pushEllipse4(parts, sack, cx, s * 0.6, s * 0.2, s * 0.16, 0.9);
    pushEllipse4(parts, sack, cx, s * 0.44, s * 0.1, s * 0.08, 0.8);
    pushCapsule4(
      parts,
      MATERIALS.leather([color[0] * 0.82, color[1] * 0.78, color[2] * 0.75]),
      cx - s * 0.1,
      s * 0.56,
      cx + s * 0.06,
      s * 0.62,
      Math.max(1, s * 6e-3),
      0.3
    );
    pushCapsule4(parts, tie, cx - s * 0.06, s * 0.4, cx + s * 0.06, s * 0.4, Math.max(1, s * 0.015), 0.5);
    pushCircle4(parts, tie, cx, s * 0.38, s * 0.025, 0.7);
    return parts;
  }
  function buildSkull(rng, s) {
    const parts = [];
    const cx = s * 0.5;
    const bone = MATERIALS.bone([210, 200, 185]);
    const dark = MATERIALS.bone([40, 35, 30]);
    pushEllipse4(parts, bone, cx, s * 0.42, s * 0.18, s * 0.2, 0.9);
    pushEllipse4(parts, bone, cx, s * 0.62, s * 0.14, s * 0.08, 0.7);
    for (const dir of [-1, 1])
      pushCircle4(parts, dark, cx + dir * s * 0.07, s * 0.4, s * 0.04, 0.5);
    pushCircle4(parts, dark, cx, s * 0.5, s * 0.02, 0.4);
    for (let i = -2; i <= 2; i++) {
      pushBox3(parts, bone, cx + i * s * 0.03, s * 0.56, s * 0.012, s * 0.02, s * 4e-3, 0.5);
    }
    return parts;
  }
  function buildGravestone(rng, s) {
    const parts = [];
    const cx = s * 0.5;
    const stone = MATERIALS.bone([82, 78, 74]);
    const dark = MATERIALS.bone([48, 44, 40]);
    pushEllipse4(parts, MATERIALS.flesh([68, 54, 36]), cx, s * 0.82, s * 0.26, s * 0.08, 0.15);
    pushBox3(parts, MATERIALS.bone([35, 32, 28]), cx + s * 0.02, s * 0.52, s * 0.16, s * 0.22, s * 0.02, 0.06);
    pushBox3(parts, stone, cx, s * 0.5, s * 0.16, s * 0.26, s * 0.03, 0.32);
    pushCircle4(parts, stone, cx, s * 0.26, s * 0.16, 0.38);
    pushCapsule4(parts, dark, cx, s * 0.35, cx, s * 0.55, Math.max(1, s * 8e-3), 0.15);
    pushCapsule4(parts, dark, cx - s * 0.06, s * 0.42, cx + s * 0.06, s * 0.42, Math.max(1, s * 8e-3), 0.15);
    pushCapsule4(
      parts,
      dark,
      cx + rng.jitter(s * 0.04),
      s * 0.32,
      cx + rng.jitter(s * 0.06),
      s * 0.56,
      Math.max(1, s * 7e-3),
      0.12
    );
    return parts;
  }
  function buildBloodStain(rng, s) {
    const parts = [];
    const cx = s * 0.5, cy = s * 0.55;
    const blood = MATERIALS.flesh([120, 20, 18]);
    pushEllipse4(parts, blood, cx, cy, s * 0.2, s * 0.1, 0.15);
    for (let i = 0; i < 3; i++) {
      const px = cx + rng.jitter(s * 0.18);
      const py = cy + rng.jitter(s * 0.08);
      pushCircle4(parts, blood, px, py, s * (0.03 + rng.float() * 0.025), 0.1);
    }
    return parts;
  }
  function buildLootMarker(config, s) {
    const rng = new RNG(config.seed ?? 0);
    const kind = config.kind ?? "loot_bag";
    switch (kind) {
      case "skull":
        return buildSkull(rng, s);
      case "gravestone":
        return buildGravestone(rng, s);
      case "blood_stain":
        return buildBloodStain(rng, s);
      case "loot_bag":
      default:
        return buildLootBag(rng, s, config.color ?? [140, 100, 60]);
    }
  }
  function generateLootMarker(config = {}) {
    const opts = resolveRenderOpts(config);
    const parts = buildLootMarker(config, opts.W);
    return renderParts(parts, opts);
  }
  var LOOT_MARKER_KINDS = ["loot_bag", "skull", "gravestone", "blood_stain"];

  // src/minimap.ts
  var ICON_COLORS = {
    player: [80, 220, 110],
    enemy: [220, 60, 60],
    item: [240, 210, 70],
    door: [160, 120, 70],
    stairs: [200, 200, 220],
    loot: [180, 140, 60],
    trap: [255, 80, 80],
    boss: [200, 40, 200]
  };
  function generateMinimapIcon(config = {}) {
    const icon = config.icon ?? "player";
    const size = config.size ?? 6;
    const color = config.color ?? ICON_COLORS[icon];
    const data = new Uint8ClampedArray(size * size * 4);
    const cx = size / 2, cy = size / 2;
    const put = (x, y) => {
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      const i = (y * size + x) * 4;
      data[i] = clamp255(color[0]);
      data[i + 1] = clamp255(color[1]);
      data[i + 2] = clamp255(color[2]);
      data[i + 3] = 255;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        switch (icon) {
          case "player":
            inside = Math.hypot(px - cx, py - cy) < size * 0.45;
            break;
          case "enemy":
            inside = Math.abs(px - cx) + Math.abs(py - cy) < size * 0.45;
            break;
          case "item":
            inside = Math.abs(px - cx) < size * 0.3 && Math.abs(py - cy) < size * 0.3;
            break;
          case "door":
            inside = Math.abs(px - cx) < size * 0.4 && Math.abs(py - cy) < size * 0.22;
            break;
          case "stairs":
            inside = py > size * 0.2 && py < size * 0.8 && Math.abs(px - cx) < py / size * size * 0.45;
            break;
          case "loot":
            inside = (Math.abs(px - cx - (py - cy)) < size * 0.15 || Math.abs(px - cx + (py - cy)) < size * 0.15) && Math.hypot(px - cx, py - cy) < size * 0.42;
            break;
          case "trap":
            inside = Math.abs(px - cx) < size * 0.12 && py > size * 0.15 && py < size * 0.55 || Math.hypot(px - cx, py - size * 0.72) < size * 0.12;
            break;
          case "boss":
            inside = Math.abs(px - cx) + Math.abs(py - cy) < size * 0.48;
            break;
        }
        if (inside) put(x, y);
      }
    }
    return { width: size, height: size, data };
  }
  var MINIMAP_ICONS = ["player", "enemy", "item", "door", "stairs", "loot", "trap", "boss"];

  // src/scene.ts
  function blitOver(dst, src, ox, oy) {
    const sw = src.width, sh = src.height;
    const dw = dst.width, dh = dst.height;
    const x0 = Math.max(0, ox) | 0;
    const y0 = Math.max(0, oy) | 0;
    const x1 = Math.min(dw, ox + sw) | 0;
    const y1 = Math.min(dh, oy + sh) | 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const si = ((y - oy) * sw + (x - ox)) * 4;
        const sa = src.data[si + 3];
        if (sa === 0) continue;
        const di = (y * dw + x) * 4;
        if (sa === 255) {
          dst.data[di] = src.data[si];
          dst.data[di + 1] = src.data[si + 1];
          dst.data[di + 2] = src.data[si + 2];
          dst.data[di + 3] = 255;
        } else {
          const a = sa / 255;
          const inv = 1 - a;
          const da = dst.data[di + 3] / 255;
          const outA = a + da * inv;
          if (outA > 0) {
            dst.data[di] = clamp255((src.data[si] * a + dst.data[di] * da * inv) / outA);
            dst.data[di + 1] = clamp255((src.data[si + 1] * a + dst.data[di + 1] * da * inv) / outA);
            dst.data[di + 2] = clamp255((src.data[si + 2] * a + dst.data[di + 2] * da * inv) / outA);
            dst.data[di + 3] = clamp255(outA * 255);
          }
        }
      }
    }
  }
  function renderScene(width, height, layer, cameraX = 0, cameraY = 0) {
    const data = new Uint8ClampedArray(width * height * 4);
    const output = { width, height, data };
    if (layer.tiles && layer.tileSize && layer.tilesPerRow) {
      const ts = layer.tileSize;
      const cols = layer.tilesPerRow;
      const rows = layer.tilesPerCol ?? Math.ceil(layer.tiles.length / cols);
      const startCol = Math.max(0, Math.floor(cameraX / ts));
      const startRow = Math.max(0, Math.floor(cameraY / ts));
      const endCol = Math.min(cols, Math.ceil((cameraX + width) / ts));
      const endRow = Math.min(rows, Math.ceil((cameraY + height) / ts));
      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const tile = layer.tiles[row * cols + col];
          if (!tile) continue;
          blitOver(output, tile, col * ts - cameraX, row * ts - cameraY);
        }
      }
    }
    if (layer.shadows) {
      for (const s of layer.shadows) {
        blitOver(output, s.sprite, s.x - cameraX, s.y - cameraY);
      }
    }
    if (layer.entities) {
      const sorted = [...layer.entities].sort(
        (a, b) => (a.z ?? a.y + a.sprite.height) - (b.z ?? b.y + b.sprite.height)
      );
      for (const e of sorted) {
        blitOver(output, e.sprite, e.x - cameraX, e.y - cameraY);
      }
    }
    if (layer.effects) {
      for (const e of layer.effects) {
        blitOver(output, e.sprite, e.x - cameraX, e.y - cameraY);
      }
    }
    if (layer.darkness) {
      blitOver(output, layer.darkness, 0, 0);
    }
    return output;
  }
  function createBuffer(width, height) {
    return { width, height, data: new Uint8ClampedArray(width * height * 4) };
  }
  function isVisible(entity, cameraX, cameraY, viewW, viewH) {
    const ex = entity.x, ey = entity.y;
    const ew = entity.sprite.width, eh = entity.sprite.height;
    return ex + ew > cameraX && ex < cameraX + viewW && ey + eh > cameraY && ey < cameraY + viewH;
  }

  // src/darkness.ts
  function generateDarknessOverlay(width, height, lights, ambientLight = 0) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let illumination = ambientLight;
        for (const light of lights) {
          const dx = x + 0.5 - light.x;
          const dy = y + 0.5 - light.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const r = light.radius;
          const intensity = light.intensity ?? 1;
          if (dist < r) {
            const t = dist / r;
            const falloff = 1 - t * t;
            illumination = Math.max(illumination, falloff * intensity);
          }
        }
        illumination = Math.min(1, illumination);
        const darkness = 1 - illumination;
        const i = (y * width + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = clamp255(darkness * 255);
      }
    }
    return { width, height, data };
  }
  function generateLightGlow(width, height, lights) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (const light of lights) {
          const color = light.color ?? [255, 220, 160];
          const dx = x + 0.5 - light.x;
          const dy = y + 0.5 - light.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = light.radius;
          const intensity = light.intensity ?? 1;
          if (dist < radius) {
            const t = dist / radius;
            const falloff = (1 - t * t) * intensity * 0.3;
            r += color[0] * falloff;
            g += color[1] * falloff;
            b += color[2] * falloff;
            a = Math.max(a, falloff * 255);
          }
        }
        const i = (y * width + x) * 4;
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = clamp255(a);
      }
    }
    return { width, height, data };
  }
  function isInDarkness(x, y, lights, ambientLight = 0, threshold = 0.02) {
    let illumination = ambientLight;
    for (const light of lights) {
      const dx = x - light.x;
      const dy = y - light.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = light.radius;
      if (dist < r) {
        const t = dist / r;
        illumination = Math.max(illumination, (1 - t * t) * (light.intensity ?? 1));
      }
      if (illumination >= threshold) return false;
    }
    return illumination < threshold;
  }
  function torchFlicker(phase, seed = 0) {
    const p1 = Math.sin(phase * Math.PI * 2 * 3.7 + seed) * 0.04;
    const p2 = Math.sin(phase * Math.PI * 2 * 7.1 + seed * 1.3) * 0.02;
    const p3 = Math.sin(phase * Math.PI * 2 * 1.3 + seed * 0.7) * 0.06;
    return 1 + p1 + p2 + p3;
  }

  // src/font.ts
  var GLYPH_W = 5;
  var GLYPH_H = 7;
  var DEFAULT_COLOR = [220, 215, 200];
  var DEFAULT_SHADOW_COLOR = [0, 0, 0];
  var GLYPHS = {
    // -- Space / punctuation ----------------------------------------------------
    " ": [0, 0, 0, 0, 0, 0, 0],
    "!": [4, 4, 4, 4, 4, 0, 4],
    '"': [10, 10, 10, 0, 0, 0, 0],
    "#": [10, 10, 31, 10, 31, 10, 10],
    "$": [4, 15, 20, 14, 5, 30, 4],
    "%": [25, 25, 2, 4, 8, 19, 19],
    "&": [12, 18, 20, 8, 21, 18, 13],
    "'": [4, 4, 8, 0, 0, 0, 0],
    "(": [2, 4, 8, 8, 8, 4, 2],
    ")": [8, 4, 2, 2, 2, 4, 8],
    "*": [0, 4, 21, 14, 21, 4, 0],
    "+": [0, 4, 4, 31, 4, 4, 0],
    ",": [0, 0, 0, 0, 0, 4, 8],
    "-": [0, 0, 0, 31, 0, 0, 0],
    ".": [0, 0, 0, 0, 0, 0, 4],
    "/": [1, 2, 2, 4, 8, 8, 16],
    ":": [0, 0, 4, 0, 4, 0, 0],
    ";": [0, 0, 4, 0, 4, 4, 8],
    "<": [2, 4, 8, 16, 8, 4, 2],
    "=": [0, 0, 31, 0, 31, 0, 0],
    ">": [16, 8, 4, 2, 4, 8, 16],
    "?": [14, 17, 1, 2, 4, 0, 4],
    "@": [14, 17, 23, 21, 22, 16, 15],
    "[": [14, 8, 8, 8, 8, 8, 14],
    "\\": [16, 8, 8, 4, 2, 2, 1],
    "]": [14, 2, 2, 2, 2, 2, 14],
    "^": [4, 10, 17, 0, 0, 0, 0],
    "_": [0, 0, 0, 0, 0, 0, 31],
    "`": [8, 4, 2, 0, 0, 0, 0],
    "{": [6, 4, 4, 8, 4, 4, 6],
    "|": [4, 4, 4, 4, 4, 4, 4],
    "}": [12, 4, 4, 2, 4, 4, 12],
    "~": [0, 0, 8, 21, 2, 0, 0],
    // -- Digits 0-9 -------------------------------------------------------------
    "0": [14, 17, 19, 21, 25, 17, 14],
    "1": [4, 12, 4, 4, 4, 4, 14],
    "2": [14, 17, 1, 6, 8, 16, 31],
    "3": [14, 17, 1, 6, 1, 17, 14],
    "4": [2, 6, 10, 18, 31, 2, 2],
    "5": [31, 16, 30, 1, 1, 17, 14],
    "6": [6, 8, 16, 30, 17, 17, 14],
    "7": [31, 1, 2, 4, 8, 8, 8],
    "8": [14, 17, 17, 14, 17, 17, 14],
    "9": [14, 17, 17, 15, 1, 2, 12],
    // -- Uppercase A-Z ----------------------------------------------------------
    "A": [14, 17, 17, 31, 17, 17, 0],
    "B": [30, 17, 17, 30, 17, 17, 30],
    "C": [14, 17, 16, 16, 16, 17, 14],
    "D": [30, 17, 17, 17, 17, 17, 30],
    "E": [31, 16, 16, 30, 16, 16, 31],
    "F": [31, 16, 16, 30, 16, 16, 16],
    "G": [14, 17, 16, 23, 17, 17, 14],
    "H": [17, 17, 17, 31, 17, 17, 17],
    "I": [14, 4, 4, 4, 4, 4, 14],
    "J": [7, 2, 2, 2, 2, 18, 12],
    "K": [17, 18, 20, 24, 20, 18, 17],
    "L": [16, 16, 16, 16, 16, 16, 31],
    "M": [17, 27, 21, 21, 17, 17, 17],
    "N": [17, 25, 21, 19, 17, 17, 17],
    "O": [14, 17, 17, 17, 17, 17, 14],
    "P": [30, 17, 17, 30, 16, 16, 16],
    "Q": [14, 17, 17, 17, 21, 18, 13],
    "R": [30, 17, 17, 30, 20, 18, 17],
    "S": [14, 17, 16, 14, 1, 17, 14],
    "T": [31, 4, 4, 4, 4, 4, 4],
    "U": [17, 17, 17, 17, 17, 17, 14],
    "V": [17, 17, 17, 17, 17, 10, 4],
    "W": [17, 17, 17, 21, 21, 27, 17],
    "X": [17, 17, 10, 4, 10, 17, 17],
    "Y": [17, 17, 10, 4, 4, 4, 4],
    "Z": [31, 1, 2, 4, 8, 16, 31],
    // -- Lowercase a-z ----------------------------------------------------------
    "a": [0, 0, 14, 1, 15, 17, 15],
    "b": [16, 16, 22, 25, 17, 17, 30],
    "c": [0, 0, 14, 16, 16, 17, 14],
    "d": [1, 1, 13, 19, 17, 17, 15],
    "e": [0, 0, 14, 17, 31, 16, 14],
    "f": [6, 9, 8, 28, 8, 8, 8],
    "g": [0, 15, 17, 17, 15, 1, 14],
    "h": [16, 16, 22, 25, 17, 17, 17],
    "i": [4, 0, 12, 4, 4, 4, 14],
    "j": [2, 0, 6, 2, 2, 18, 12],
    "k": [16, 16, 18, 20, 24, 20, 18],
    "l": [12, 4, 4, 4, 4, 4, 14],
    "m": [0, 0, 26, 21, 21, 17, 17],
    "n": [0, 0, 22, 25, 17, 17, 17],
    "o": [0, 0, 14, 17, 17, 17, 14],
    "p": [0, 0, 30, 17, 30, 16, 16],
    "q": [0, 0, 13, 19, 15, 1, 1],
    "r": [0, 0, 22, 25, 16, 16, 16],
    "s": [0, 0, 14, 16, 14, 1, 30],
    "t": [8, 8, 28, 8, 8, 9, 6],
    "u": [0, 0, 17, 17, 17, 19, 13],
    "v": [0, 0, 17, 17, 17, 10, 4],
    "w": [0, 0, 17, 17, 21, 21, 10],
    "x": [0, 0, 17, 10, 4, 10, 17],
    "y": [0, 0, 17, 17, 15, 1, 14],
    "z": [0, 0, 31, 2, 4, 8, 31]
  };
  function resolveConfig(cfg) {
    const color = cfg?.color ?? DEFAULT_COLOR;
    const scale2 = cfg?.scale ?? 1;
    const spacing = cfg?.spacing ?? 1;
    const shadow = cfg?.shadow ?? false;
    const shadowColor = cfg?.shadowColor ?? DEFAULT_SHADOW_COLOR;
    return { color, scale: scale2, spacing, shadow, shadowColor };
  }
  function glyphFor(ch) {
    return GLYPHS[ch] ?? GLYPHS["?"];
  }
  function fillBlock(data, bufW, bx, by, scale2, color) {
    const [r, g, b] = color;
    for (let dy = 0; dy < scale2; dy++) {
      const row = by + dy;
      for (let dx = 0; dx < scale2; dx++) {
        const col = bx + dx;
        const idx = (row * bufW + col) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
  }
  function stampGlyph(data, bufW, glyph, ox, oy, scale2, color) {
    for (let row = 0; row < GLYPH_H; row++) {
      const bits = glyph[row];
      for (let col = 0; col < GLYPH_W; col++) {
        if (bits & 1 << GLYPH_W - 1 - col) {
          fillBlock(data, bufW, ox + col * scale2, oy + row * scale2, scale2, color);
        }
      }
    }
  }
  function measureText(text, config) {
    const { scale: scale2, spacing } = resolveConfig(config);
    const charW = GLYPH_W * scale2 + spacing;
    const len = text.length;
    const width = len > 0 ? charW * len - spacing : 0;
    const height = GLYPH_H * scale2;
    return { width, height };
  }
  function renderText(text, config) {
    const { color, scale: scale2, spacing, shadow, shadowColor } = resolveConfig(config);
    const charW = GLYPH_W * scale2 + spacing;
    const len = text.length;
    const textW = len > 0 ? charW * len - spacing : 0;
    const textH = GLYPH_H * scale2;
    const bufW = textW + (shadow ? 1 : 0);
    const bufH = textH + (shadow ? 1 : 0);
    if (bufW <= 0 || bufH <= 0) {
      return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    }
    const data = new Uint8ClampedArray(bufW * bufH * 4);
    if (shadow) {
      for (let i = 0; i < len; i++) {
        const glyph = glyphFor(text[i]);
        stampGlyph(data, bufW, glyph, i * charW + 1, 1, scale2, shadowColor);
      }
    }
    for (let i = 0; i < len; i++) {
      const glyph = glyphFor(text[i]);
      stampGlyph(data, bufW, glyph, i * charW, 0, scale2, color);
    }
    return { width: bufW, height: bufH, data };
  }
  function renderNumber(value, config) {
    return renderText(String(value), config);
  }

  // src/ui.ts
  function renderBar(width, height, fill, color, bgColor, borderColor) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        if (isBorder) {
          data[i] = borderColor[0];
          data[i + 1] = borderColor[1];
          data[i + 2] = borderColor[2];
          data[i + 3] = 255;
        } else {
          const innerX = x - 1;
          const innerWidth = width - 2;
          const fillWidth = Math.round(innerWidth * Math.max(0, Math.min(1, fill)));
          if (innerX < fillWidth) {
            const t = (y - 1) / Math.max(1, height - 3);
            const highlight = t < 0.35 ? 1.15 : t > 0.65 ? 0.85 : 1;
            data[i] = clamp255(color[0] * highlight);
            data[i + 1] = clamp255(color[1] * highlight);
            data[i + 2] = clamp255(color[2] * highlight);
            data[i + 3] = 255;
          } else {
            data[i] = bgColor[0];
            data[i + 1] = bgColor[1];
            data[i + 2] = bgColor[2];
            data[i + 3] = 255;
          }
        }
      }
    }
    return { width, height, data };
  }
  function generateHealthBar(config = {}) {
    const width = config.width ?? 64;
    const height = config.height ?? 8;
    const fill = config.fill ?? 1;
    const color = config.color ?? [220, 50, 40];
    const bgColor = config.bgColor ?? [30, 28, 26];
    const borderColor = config.borderColor ?? [80, 75, 70];
    return renderBar(width, height, fill, color, bgColor, borderColor);
  }
  function generateManaBar(config = {}) {
    const width = config.width ?? 64;
    const height = config.height ?? 8;
    const fill = config.fill ?? 1;
    const color = config.color ?? [40, 100, 220];
    const bgColor = config.bgColor ?? [30, 28, 26];
    const borderColor = config.borderColor ?? [80, 75, 70];
    return renderBar(width, height, fill, color, bgColor, borderColor);
  }
  function generateXPBar(config = {}) {
    const width = config.width ?? 64;
    const height = config.height ?? 6;
    const fill = config.fill ?? 1;
    const color = config.color ?? [180, 200, 40];
    const bgColor = config.bgColor ?? [30, 28, 26];
    const borderColor = config.borderColor ?? [80, 75, 70];
    return renderBar(width, height, fill, color, bgColor, borderColor);
  }
  function generateInventorySlot(config = {}) {
    const size = config.size ?? 24;
    const highlight = config.highlight ?? false;
    const bgColor = config.bgColor ?? [45, 40, 38];
    const borderColor = highlight ? [200, 180, 90] : config.borderColor ?? [90, 85, 78];
    const opts = resolveRenderOpts({ size, supersample: 2, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    const borderHx = s * 0.44, borderHy = s * 0.44;
    const borderR = s * 0.06;
    const bgHx = s * 0.38, bgHy = s * 0.38;
    const bgR = s * 0.04;
    parts.push({
      material: MATERIALS.metal(borderColor),
      roundness: 0.4,
      sdf: roundedBox(cx, cy, borderHx, borderHy, borderR),
      bbox: [
        Math.floor(cx - borderHx - 2),
        Math.floor(cy - borderHy - 2),
        Math.ceil(cx + borderHx + 2),
        Math.ceil(cy + borderHy + 2)
      ]
    });
    parts.push({
      material: MATERIALS.bone(bgColor),
      roundness: 0.3,
      sdf: roundedBox(cx, cy, bgHx, bgHy, bgR),
      bbox: [
        Math.floor(cx - bgHx - 2),
        Math.floor(cy - bgHy - 2),
        Math.ceil(cx + bgHx + 2),
        Math.ceil(cy + bgHy + 2)
      ]
    });
    return renderParts(parts, opts);
  }
  function generateDialogBox(config = {}) {
    const width = config.width ?? 128;
    const height = config.height ?? 48;
    const bgColor = config.bgColor ?? [25, 22, 20];
    const borderColor = config.borderColor ?? [120, 110, 90];
    const maxDim = Math.max(width, height);
    const opts = resolveRenderOpts({ size: maxDim, supersample: 1, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    const outerHx = width * 0.5 - 1;
    const outerHy = height * 0.5 - 1;
    const outerR = Math.min(outerHx, outerHy) * 0.15;
    const innerHx = outerHx - 3;
    const innerHy = outerHy - 3;
    const innerR = Math.max(1, outerR - 2);
    parts.push({
      material: MATERIALS.metal(borderColor),
      roundness: 0.35,
      sdf: roundedBox(cx, cy, outerHx, outerHy, outerR),
      bbox: [
        Math.floor(cx - outerHx - 2),
        Math.floor(cy - outerHy - 2),
        Math.ceil(cx + outerHx + 2),
        Math.ceil(cy + outerHy + 2)
      ]
    });
    parts.push({
      material: MATERIALS.bone(bgColor),
      roundness: 0.25,
      sdf: roundedBox(cx, cy, innerHx, innerHy, innerR),
      bbox: [
        Math.floor(cx - innerHx - 2),
        Math.floor(cy - innerHy - 2),
        Math.ceil(cx + innerHx + 2),
        Math.ceil(cy + innerHy + 2)
      ]
    });
    const squareBuf = renderParts(parts, opts);
    if (width === height) return squareBuf;
    const data = new Uint8ClampedArray(width * height * 4);
    const offX = Math.floor((maxDim - width) / 2);
    const offY = Math.floor((maxDim - height) / 2);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcI = ((offY + y) * maxDim + (offX + x)) * 4;
        const dstI = (y * width + x) * 4;
        data[dstI] = squareBuf.data[srcI];
        data[dstI + 1] = squareBuf.data[srcI + 1];
        data[dstI + 2] = squareBuf.data[srcI + 2];
        data[dstI + 3] = squareBuf.data[srcI + 3];
      }
    }
    return { width, height, data };
  }
  function generateDamageNumber(config = {}) {
    const size = config.size ?? 16;
    const crit = config.crit ?? false;
    const color = config.color ?? (crit ? [255, 220, 60] : [255, 60, 40]);
    const opts = resolveRenderOpts({ size, supersample: 2, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const cx = s * 0.5, cy = s * 0.5;
    const outerR = s * 0.38;
    parts.push({
      material: MATERIALS.ember(color),
      roundness: 1,
      sdf: circle(cx, cy, outerR),
      bbox: [
        Math.floor(cx - outerR - 2),
        Math.floor(cy - outerR - 2),
        Math.ceil(cx + outerR + 2),
        Math.ceil(cy + outerR + 2)
      ]
    });
    const innerR = s * 0.18;
    const coreColor = crit ? [255, 255, 180] : [255, 200, 180];
    parts.push({
      material: MATERIALS.ember(coreColor),
      roundness: 1,
      sdf: circle(cx, cy, innerR),
      bbox: [
        Math.floor(cx - innerR - 2),
        Math.floor(cy - innerR - 2),
        Math.ceil(cx + innerR + 2),
        Math.ceil(cy + innerR + 2)
      ]
    });
    return renderParts(parts, opts);
  }
  function generateButton(config = {}) {
    const width = config.width ?? 48;
    const height = config.height ?? 16;
    const pressed = config.pressed ?? false;
    const baseColor = config.color ?? [100, 85, 65];
    const color = pressed ? [clamp255(baseColor[0] * 0.7), clamp255(baseColor[1] * 0.7), clamp255(baseColor[2] * 0.7)] : baseColor;
    const topColor = pressed ? color : [clamp255(baseColor[0] * 1.3), clamp255(baseColor[1] * 1.3), clamp255(baseColor[2] * 1.3)];
    const maxDim = Math.max(width, height);
    const opts = resolveRenderOpts({ size: maxDim, supersample: 1, outline: false, quantize: false });
    const s = opts.W;
    const parts = [];
    const cx = s * 0.5;
    const cy = pressed ? s * 0.5 : s * 0.5 + 1;
    const hx = width * 0.5 - 1;
    const hy = height * 0.5 - 1;
    const r = Math.min(hx, hy) * 0.25;
    if (!pressed) {
      const shadowColor = [clamp255(baseColor[0] * 0.45), clamp255(baseColor[1] * 0.45), clamp255(baseColor[2] * 0.45)];
      parts.push({
        material: MATERIALS.leather(shadowColor),
        roundness: 0.35,
        sdf: roundedBox(cx, cy + 1, hx, hy, r),
        bbox: [
          Math.floor(cx - hx - 2),
          Math.floor(cy + 1 - hy - 2),
          Math.ceil(cx + hx + 2),
          Math.ceil(cy + 1 + hy + 2)
        ]
      });
    }
    parts.push({
      material: MATERIALS.leather(color),
      roundness: 0.45,
      sdf: roundedBox(cx, cy, hx, hy, r),
      bbox: [
        Math.floor(cx - hx - 2),
        Math.floor(cy - hy - 2),
        Math.ceil(cx + hx + 2),
        Math.ceil(cy + hy + 2)
      ]
    });
    if (!pressed) {
      const stripHy = hy * 0.25;
      const stripCy = cy - hy + stripHy + 1;
      parts.push({
        material: MATERIALS.bone(topColor),
        roundness: 0.3,
        sdf: roundedBox(cx, stripCy, hx - 2, stripHy, Math.max(1, r * 0.5)),
        bbox: [
          Math.floor(cx - hx),
          Math.floor(stripCy - stripHy - 2),
          Math.ceil(cx + hx),
          Math.ceil(stripCy + stripHy + 2)
        ]
      });
    }
    const squareBuf = renderParts(parts, opts);
    if (width === height) return squareBuf;
    const data = new Uint8ClampedArray(width * height * 4);
    const offX = Math.floor((maxDim - width) / 2);
    const offY = Math.floor((maxDim - height) / 2);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcI = ((offY + y) * maxDim + (offX + x)) * 4;
        const dstI = (y * width + x) * 4;
        data[dstI] = squareBuf.data[srcI];
        data[dstI + 1] = squareBuf.data[srcI + 1];
        data[dstI + 2] = squareBuf.data[srcI + 2];
        data[dstI + 3] = squareBuf.data[srcI + 3];
      }
    }
    return { width, height, data };
  }

  // src/gpu.ts
  var WGSL_JFA_INIT = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> mask: array<u32>;
@group(0) @binding(1) var<storage, read_write> jfa: array<vec2<i32>>;
@group(0) @binding(2) var<uniform> dims: vec4<u32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = dims.x; let h = dims.y;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) {
    jfa[idx] = vec2<i32>(i32(gid.x), i32(gid.y));
  } else {
    jfa[idx] = vec2<i32>(-9999, -9999);
  }
}
`
  );
  var WGSL_JFA_STEP = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> jfa_in: array<vec2<i32>>;
@group(0) @binding(1) var<storage, read_write> jfa_out: array<vec2<i32>>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // w, h, step, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = i32(params.x); let h = i32(params.y); let step = i32(params.z);
  let ix = i32(gid.x); let iy = i32(gid.y);
  if (ix >= w || iy >= h) { return; }
  let idx = u32(iy * w + ix);
  var best = jfa_in[idx];
  var bestDist = 1e12;
  if (best.x >= 0) { bestDist = f32((ix - best.x) * (ix - best.x) + (iy - best.y) * (iy - best.y)); }
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let nx = ix + dx * step; let ny = iy + dy * step;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) { continue; }
      let cand = jfa_in[u32(ny * w + nx)];
      if (cand.x < 0) { continue; }
      let d = f32((ix - cand.x) * (ix - cand.x) + (iy - cand.y) * (iy - cand.y));
      if (d < bestDist) { bestDist = d; best = cand; }
    }
  }
  jfa_out[idx] = best;
}
`
  );
  var WGSL_DISTANCE = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> jfa: array<vec2<i32>>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> dist: array<f32>;
@group(0) @binding(3) var<storage, read_write> max_dist: array<atomic<u32>>;
@group(0) @binding(4) var<uniform> dims: vec4<u32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = dims.x; let h = dims.y;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { dist[idx] = 0.0; return; }
  let seed = jfa[idx];
  if (seed.x < 0) { dist[idx] = 0.0; return; }
  let dx = i32(gid.x) - seed.x; let dy = i32(gid.y) - seed.y;
  let d = sqrt(f32(dx * dx + dy * dy));
  dist[idx] = d;
  atomicMax(&max_dist[0], u32(d * 256.0));
}
`
  );
  var WGSL_NORMALS = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> dist: array<f32>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> normals: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: vec4<f32>; // w, h, bevel, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = u32(params.x); let h = u32(params.y); let bevel = params.z;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { normals[idx] = vec4(0.0); return; }
  let x = gid.x; let y = gid.y;
  let xm = select(dist[idx - 1u], dist[idx], x == 0u);
  let xp = select(dist[idx + 1u], dist[idx], x >= w - 1u);
  let ym = select(dist[(y - 1u) * w + x], dist[idx], y == 0u);
  let yp = select(dist[(y + 1u) * w + x], dist[idx], y >= h - 1u);
  var gx = (xp - xm) * 0.5;
  var gy = (yp - ym) * 0.5;
  let glen = max(length(vec2(gx, gy)), 1e-6);
  gx /= glen; gy /= glen;
  let t = clamp(dist[idx] / max(bevel, 1e-3), 0.0, 1.0);
  let HALF_PI = 1.5707963;
  let theta = HALF_PI * (1.0 - t);
  let s = sin(theta);
  normals[idx] = vec4(-gx * s, -gy * s, cos(theta), 1.0);
}
`
  );
  var WGSL_SHADE_COMBINED = (
    /* wgsl */
    `
struct MaterialGPU {
  base_r: f32, base_g: f32, base_b: f32,
  spec_strength: f32,
  roughness: f32,
  metallic: f32,
  shadow_cool_shift: f32,
  _pad: f32,
}

struct LightUni {
  lx: f32, ly: f32, lz: f32, ambient: f32,
  hx: f32, hy: f32, hz: f32, _pad: f32,
  w: u32, h: u32, _p2: u32, _p3: u32,
}

@group(0) @binding(0) var<storage, read> normals: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> accum: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> mat: MaterialGPU;
@group(0) @binding(4) var<uniform> light: LightUni;

fn ss(e0: f32, e1: f32, v: f32) -> f32 {
  let t = clamp((v - e0) / max(e1 - e0, 1e-6), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = light.w; let h = light.h;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { return; }
  let n = normals[idx];
  if (n.w == 0.0) { return; }

  let base = vec3(mat.base_r, mat.base_g, mat.base_b);
  let cs = mat.shadow_cool_shift;
  let cool = vec3(base.x * (1.0 - 0.12 * cs), base.y * (1.0 - 0.04 * cs), base.z * (1.0 + 0.08 * cs));
  let warm = vec3(base.x + (255.0 - base.x) * 0.12, base.y + (255.0 - base.y) * 0.08, base.z + (255.0 - base.z) * 0.02);
  let core   = cool * 0.38;
  let shadow = cool * 0.65;
  let mid    = base;
  let lt     = warm * 1.14;
  let hi     = mix(warm * 1.20, vec3(255.0), vec3(0.22));

  let ndotl = n.x * light.lx + n.y * light.ly + n.z * light.lz;
  let x = clamp(light.ambient + (1.0 - light.ambient) * (ndotl * 0.5 + 0.5), 0.0, 1.0);

  var diff: vec3<f32>;
  if (x < 0.35) { let t = ss(0.0, 0.35, x); diff = mix(core, shadow, vec3(t)); }
  else if (x < 0.48) { let t = ss(0.35, 0.48, x); diff = mix(shadow, mid, vec3(t)); }
  else if (x < 0.74) { let t = ss(0.48, 0.74, x); diff = mix(mid, lt, vec3(t)); }
  else { let t = ss(0.74, 1.0, x); diff = mix(lt, hi, vec3(t)); }

  let ndoth = n.x * light.hx + n.y * light.hy + n.z * light.hz;
  let shininess = 8.0 + (1.0 - mat.roughness) * (1.0 - mat.roughness) * 132.0;
  var spec = 0.0;
  if (ndoth > 0.0 && mat.spec_strength > 0.0) {
    spec = pow(ndoth, shininess) * mat.spec_strength;
  }

  var spec_col: vec3<f32>;
  if (mat.metallic > 0.5) {
    spec_col = vec3(255.0 * 0.35 + base.x * 0.65, 255.0 * 0.35 + base.y * 0.65, 255.0 * 0.35 + base.z * 0.65);
  } else {
    spec_col = vec3(255.0);
  }

  let color = diff + spec_col * spec;
  accum[idx] = vec4(color, 255.0);
}
`
  );
  var WGSL_BLIT = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> crop: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> accum: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // cropW, cropH, offsetX, offsetY
@group(0) @binding(3) var<uniform> dims: vec4<u32>;   // fullW, fullH, _, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cw = params.x; let ch = params.y;
  let ox = params.z; let oy = params.w;
  let fw = dims.x;
  if (gid.x >= cw || gid.y >= ch) { return; }
  let ci = gid.y * cw + gid.x;
  let pixel = crop[ci];
  if (pixel.w <= 0.0) { return; }
  let fi = (oy + gid.y) * fw + (ox + gid.x);
  accum[fi] = pixel;
}
`
  );
  var WGSL_DOWNSAMPLE = (
    /* wgsl */
    `
@group(0) @binding(0) var<storage, read> accum: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // outW, outH, ss, quantizeLevels

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let outW = params.x; let outH = params.y; let ss = params.z; let quant = params.w;
  if (gid.x >= outW || gid.y >= outH) { return; }
  let W = outW * ss;
  let area = f32(ss * ss);
  var r = 0.0; var g = 0.0; var b = 0.0; var a = 0.0;
  for (var sy = 0u; sy < ss; sy++) {
    for (var sx = 0u; sx < ss; sx++) {
      let si = (gid.y * ss + sy) * W + (gid.x * ss + sx);
      let sa = accum[si].w;
      let w = sa / 255.0;
      r += accum[si].x * w; g += accum[si].y * w; b += accum[si].z * w; a += sa;
    }
  }
  let aw = select(a / 255.0, 1.0, a == 0.0);
  var cr = clamp(r / aw, 0.0, 255.0);
  var cg = clamp(g / aw, 0.0, 255.0);
  var cb = clamp(b / aw, 0.0, 255.0);
  let ca = clamp(a / area, 0.0, 255.0);

  if (quant > 1u) {
    let step = 255.0 / f32(quant - 1u);
    if (ca >= 8.0) {
      cr = round(cr / step) * step;
      cg = round(cg / step) * step;
      cb = round(cb / step) * step;
    }
  }

  let oi = gid.y * outW + gid.x;
  output[oi] = (u32(ca) << 24u) | (u32(cb) << 16u) | (u32(cg) << 8u) | u32(cr);
}
`
  );
  function encodePartsForGPU(parts) {
    const result = [];
    for (const p of parts) {
      const desc = extractSDFDesc(p.sdf);
      if (!desc) return null;
      result.push({
        sdfType: desc.type,
        params: desc.params,
        bbox: p.bbox,
        material: p.material,
        roundness: p.roundness ?? 0.55
      });
    }
    return result;
  }
  function alignTo(n, alignment) {
    return Math.ceil(n / alignment) * alignment;
  }
  function normalizeVec3(v) {
    const l = Math.hypot(v.x, v.y, v.z) || 1e-6;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }
  var GPURenderer = class {
    constructor() {
      this.device = null;
      this.jfaInitPipeline = null;
      this.jfaStepPipeline = null;
      this.distPipeline = null;
      this.normalsPipeline = null;
      this.shadePipeline = null;
      this.blitPipeline = null;
      this.downsamplePipeline = null;
      this._ready = false;
    }
    get ready() {
      return this._ready;
    }
    async init() {
      if (typeof navigator === "undefined" || !navigator.gpu) return false;
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return false;
        this.device = await adapter.requestDevice();
        this.jfaInitPipeline = this.createPipeline(WGSL_JFA_INIT);
        this.jfaStepPipeline = this.createPipeline(WGSL_JFA_STEP);
        this.distPipeline = this.createPipeline(WGSL_DISTANCE);
        this.normalsPipeline = this.createPipeline(WGSL_NORMALS);
        this.shadePipeline = this.createPipeline(WGSL_SHADE_COMBINED);
        this.blitPipeline = this.createPipeline(WGSL_BLIT);
        this.downsamplePipeline = this.createPipeline(WGSL_DOWNSAMPLE);
        this._ready = true;
        return true;
      } catch {
        return false;
      }
    }
    createPipeline(wgsl) {
      const module = this.device.createShaderModule({ code: wgsl });
      return this.device.createComputePipeline({
        layout: "auto",
        compute: { module, entryPoint: "main" }
      });
    }
    buf(size, usage) {
      return this.device.createBuffer({ size: alignTo(Math.max(size, 4), 4), usage });
    }
    uniform(data) {
      const b = this.buf(data.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      this.device.queue.writeBuffer(b, 0, data);
      return b;
    }
    uniformRaw(data) {
      const b = this.buf(data.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      this.device.queue.writeBuffer(b, 0, new Uint8Array(data));
      return b;
    }
    async renderParts(parts, opts) {
      const gpuParts = encodePartsForGPU(parts);
      if (!this._ready || !gpuParts) return renderParts(parts, opts);
      const device = this.device;
      const { size, ss, W, H } = opts;
      const pixels = W * H;
      const STORAGE = GPUBufferUsage.STORAGE;
      const RW = STORAGE | GPUBufferUsage.COPY_SRC;
      const accumBuf = this.buf(pixels * 16, RW | GPUBufferUsage.COPY_DST);
      device.queue.writeBuffer(accumBuf, 0, new Float32Array(pixels * 4));
      const L = normalizeVec3(opts.light.dir);
      const V = { x: 0, y: 0, z: 1 };
      const rawH = { x: L.x + V.x, y: L.y + V.y, z: L.z + V.z };
      const H_v = normalizeVec3(rawH);
      const lightData = new ArrayBuffer(48);
      const lightFloats = new Float32Array(lightData, 0, 8);
      lightFloats[0] = L.x;
      lightFloats[1] = L.y;
      lightFloats[2] = L.z;
      lightFloats[3] = opts.light.ambient;
      lightFloats[4] = H_v.x;
      lightFloats[5] = H_v.y;
      lightFloats[6] = H_v.z;
      lightFloats[7] = 0;
      const fullDimsU = this.uniform(new Uint32Array([W, H, 0, 0]));
      const partBuffers = [accumBuf, fullDimsU];
      try {
        for (let pi = 0; pi < gpuParts.length; pi++) {
          const gp = gpuParts[pi];
          const [bx0, by0, bx1, by1] = gp.bbox;
          const cx0 = Math.max(0, (bx0 | 0) - 1);
          const cy0 = Math.max(0, (by0 | 0) - 1);
          const cx1 = Math.min(W, (bx1 | 0) + 2);
          const cy1 = Math.min(H, (by1 | 0) + 2);
          const cw = cx1 - cx0, ch = cy1 - cy0;
          if (cw <= 0 || ch <= 0) continue;
          const cpx = cw * ch;
          const wgX = Math.ceil(cw / 16), wgY = Math.ceil(ch / 16);
          const buffers = [];
          try {
            const maskData = new Uint32Array(cpx);
            for (let y = 0; y < ch; y++) {
              for (let x = 0; x < cw; x++) {
                if (parts[pi].sdf(cx0 + x + 0.5, cy0 + y + 0.5) < 0) maskData[y * cw + x] = 1;
              }
            }
            const maskBuf = this.buf(cpx * 4, RW | GPUBufferUsage.COPY_DST);
            device.queue.writeBuffer(maskBuf, 0, maskData);
            buffers.push(maskBuf);
            const jfaA = this.buf(cpx * 8, RW | GPUBufferUsage.COPY_DST);
            const jfaB = this.buf(cpx * 8, RW);
            const jfaDims = this.uniform(new Uint32Array([cw, ch, 0, 0]));
            buffers.push(jfaA, jfaB, jfaDims);
            let enc2 = device.createCommandEncoder();
            {
              const bg = device.createBindGroup({
                layout: this.jfaInitPipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: maskBuf } },
                  { binding: 1, resource: { buffer: jfaA } },
                  { binding: 2, resource: { buffer: jfaDims } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.jfaInitPipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
            }
            const maxDim = Math.max(cw, ch);
            let step = 1;
            while (step < maxDim) step *= 2;
            let src = jfaA, dst = jfaB;
            const jfaStepUniforms = [];
            while (step >= 1) {
              const stepU = this.uniform(new Uint32Array([cw, ch, step, 0]));
              jfaStepUniforms.push(stepU);
              const bg = device.createBindGroup({
                layout: this.jfaStepPipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: src } },
                  { binding: 1, resource: { buffer: dst } },
                  { binding: 2, resource: { buffer: stepU } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.jfaStepPipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
              [src, dst] = [dst, src];
              step = step >> 1;
            }
            buffers.push(...jfaStepUniforms);
            device.queue.submit([enc2.finish()]);
            const distBuf = this.buf(cpx * 4, RW);
            const maxDistBuf = this.buf(4, RW | GPUBufferUsage.COPY_DST);
            device.queue.writeBuffer(maxDistBuf, 0, new Uint32Array([0]));
            const distDims = this.uniform(new Uint32Array([cw, ch, 0, 0]));
            buffers.push(distBuf, maxDistBuf, distDims);
            enc2 = device.createCommandEncoder();
            {
              const bg = device.createBindGroup({
                layout: this.distPipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: src } },
                  { binding: 1, resource: { buffer: maskBuf } },
                  { binding: 2, resource: { buffer: distBuf } },
                  { binding: 3, resource: { buffer: maxDistBuf } },
                  { binding: 4, resource: { buffer: distDims } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.distPipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
            }
            const maxDistRead = this.buf(4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
            buffers.push(maxDistRead);
            enc2.copyBufferToBuffer(maxDistBuf, 0, maxDistRead, 0, 4);
            device.queue.submit([enc2.finish()]);
            await maxDistRead.mapAsync(GPUMapMode.READ);
            const maxDistVal = new Uint32Array(maxDistRead.getMappedRange())[0] / 256;
            maxDistRead.unmap();
            if (maxDistVal <= 0) continue;
            const normalsBuf = this.buf(cpx * 16, RW);
            const bevel = Math.max(1.5, gp.roundness * maxDistVal);
            const normParams = this.uniform(new Float32Array([cw, ch, bevel, 0]));
            buffers.push(normalsBuf, normParams);
            enc2 = device.createCommandEncoder();
            {
              const bg = device.createBindGroup({
                layout: this.normalsPipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: distBuf } },
                  { binding: 1, resource: { buffer: maskBuf } },
                  { binding: 2, resource: { buffer: normalsBuf } },
                  { binding: 3, resource: { buffer: normParams } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.normalsPipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
            }
            const cropAccum = this.buf(cpx * 16, RW | GPUBufferUsage.COPY_DST);
            device.queue.writeBuffer(cropAccum, 0, new Float32Array(cpx * 4));
            buffers.push(cropAccum);
            const mat = gp.material;
            const matData = new Float32Array([
              mat.base[0],
              mat.base[1],
              mat.base[2],
              mat.specStrength,
              mat.roughness,
              mat.metallic ? 1 : 0,
              mat.shadowCoolShift,
              0
            ]);
            const matBuf = this.uniform(matData);
            buffers.push(matBuf);
            const perPartLight = new ArrayBuffer(48);
            new Float32Array(perPartLight, 0, 8).set(lightFloats);
            new Uint32Array(perPartLight, 32, 4).set(new Uint32Array([cw, ch, 0, 0]));
            const lightBuf = this.uniformRaw(perPartLight);
            buffers.push(lightBuf);
            {
              const bg = device.createBindGroup({
                layout: this.shadePipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: normalsBuf } },
                  { binding: 1, resource: { buffer: maskBuf } },
                  { binding: 2, resource: { buffer: cropAccum } },
                  { binding: 3, resource: { buffer: matBuf } },
                  { binding: 4, resource: { buffer: lightBuf } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.shadePipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
            }
            const blitParams = this.uniform(new Uint32Array([cw, ch, cx0, cy0]));
            buffers.push(blitParams);
            {
              const bg = device.createBindGroup({
                layout: this.blitPipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: { buffer: cropAccum } },
                  { binding: 1, resource: { buffer: accumBuf } },
                  { binding: 2, resource: { buffer: blitParams } },
                  { binding: 3, resource: { buffer: fullDimsU } }
                ]
              });
              const pass = enc2.beginComputePass();
              pass.setPipeline(this.blitPipeline);
              pass.setBindGroup(0, bg);
              pass.dispatchWorkgroups(wgX, wgY);
              pass.end();
            }
            device.queue.submit([enc2.finish()]);
          } finally {
            for (const b of buffers) b.destroy();
          }
        }
        const outPixels = size * size;
        const outBuf = this.buf(outPixels * 4, RW);
        const dsParams = this.uniform(new Uint32Array([size, size, ss, opts.quantize || 0]));
        const enc = device.createCommandEncoder();
        {
          const bg = device.createBindGroup({
            layout: this.downsamplePipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: accumBuf } },
              { binding: 1, resource: { buffer: outBuf } },
              { binding: 2, resource: { buffer: dsParams } }
            ]
          });
          const pass = enc.beginComputePass();
          pass.setPipeline(this.downsamplePipeline);
          pass.setBindGroup(0, bg);
          pass.dispatchWorkgroups(Math.ceil(size / 16), Math.ceil(size / 16));
          pass.end();
        }
        const readBuf = this.buf(outPixels * 4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
        enc.copyBufferToBuffer(outBuf, 0, readBuf, 0, outPixels * 4);
        device.queue.submit([enc.finish()]);
        await readBuf.mapAsync(GPUMapMode.READ);
        const raw = new Uint32Array(readBuf.getMappedRange());
        const data = new Uint8ClampedArray(outPixels * 4);
        for (let i = 0; i < outPixels; i++) {
          const v = raw[i];
          data[i * 4] = v & 255;
          data[i * 4 + 1] = v >> 8 & 255;
          data[i * 4 + 2] = v >> 16 & 255;
          data[i * 4 + 3] = v >> 24 & 255;
        }
        readBuf.unmap();
        outBuf.destroy();
        dsParams.destroy();
        readBuf.destroy();
        if (opts.outlineColor) applyOutlineGPU(data, size, size, opts.outlineColor);
        return { width: size, height: size, data };
      } finally {
        for (const b of partBuffers) b.destroy();
      }
    }
    async renderBatch(partSets, opts) {
      const results = [];
      for (const parts of partSets) {
        results.push(await this.renderParts(parts, opts));
      }
      return results;
    }
    dispose() {
      this.device?.destroy();
      this.device = null;
      this._ready = false;
    }
  };
  function applyOutlineGPU(data, w, h, color) {
    const snap = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) snap[i] = data[i * 4 + 3] > 128 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (snap[i]) continue;
        const hasNeighbor = x > 0 && snap[i - 1] || x < w - 1 && snap[i + 1] || y > 0 && snap[i - w] || y < h - 1 && snap[i + w];
        if (hasNeighbor) {
          const j = i * 4;
          data[j] = color[0];
          data[j + 1] = color[1];
          data[j + 2] = color[2];
          data[j + 3] = 255;
        }
      }
    }
  }
  var _gpuRenderer = null;
  async function getGPURenderer() {
    if (_gpuRenderer?.ready) return _gpuRenderer;
    _gpuRenderer = new GPURenderer();
    const ok = await _gpuRenderer.init();
    if (!ok) {
      _gpuRenderer = null;
      return null;
    }
    return _gpuRenderer;
  }
  async function renderPartsGPU(parts, opts) {
    const gpu = await getGPURenderer();
    if (!gpu) return renderParts(parts, opts);
    return gpu.renderParts(parts, opts);
  }
  async function renderBatchGPU(partSets, opts) {
    const gpu = await getGPURenderer();
    if (!gpu) return partSets.map((p) => renderParts(p, opts));
    return gpu.renderBatch(partSets, opts);
  }

  // src/cache.ts
  function hashConfig(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
  var SpriteCache = class {
    constructor(maxSize = 512) {
      this.sprites = /* @__PURE__ */ new Map();
      this.animations = /* @__PURE__ */ new Map();
      this.accessOrder = [];
      this.maxSize = maxSize;
    }
    makeKey(prefix, config) {
      return prefix + ":" + hashConfig(config);
    }
    touch(key) {
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
    }
    evictIfNeeded() {
      while (this.sprites.size + this.animations.size > this.maxSize && this.accessOrder.length > 0) {
        const oldest = this.accessOrder.shift();
        this.sprites.delete(oldest);
        this.animations.delete(oldest);
      }
    }
    getSprite(prefix, config) {
      const key = this.makeKey(prefix, config);
      const cached = this.sprites.get(key);
      if (cached) this.touch(key);
      return cached;
    }
    setSprite(prefix, config, sprite) {
      const key = this.makeKey(prefix, config);
      this.evictIfNeeded();
      this.sprites.set(key, sprite);
      this.touch(key);
    }
    getAnimation(prefix, config, animName) {
      const key = this.makeKey(prefix + "/" + animName, config);
      const cached = this.animations.get(key);
      if (cached) this.touch(key);
      return cached;
    }
    setAnimation(prefix, config, animName, result) {
      const key = this.makeKey(prefix + "/" + animName, config);
      this.evictIfNeeded();
      this.animations.set(key, result);
      this.touch(key);
    }
    clear() {
      this.sprites.clear();
      this.animations.clear();
      this.accessOrder = [];
    }
    get size() {
      return this.sprites.size + this.animations.size;
    }
  };
  var globalCache = new SpriteCache();
  function cachedSprite(config = {}) {
    const cached = globalCache.getSprite("sprite", config);
    if (cached) return cached;
    const result = generateSprite(config);
    globalCache.setSprite("sprite", config, result);
    return result;
  }
  function cachedEnemy(config = {}) {
    const cached = globalCache.getSprite("enemy", config);
    if (cached) return cached;
    const result = generateEnemy(config);
    globalCache.setSprite("enemy", config, result);
    return result;
  }
  function cachedItem(config = {}) {
    const cached = globalCache.getSprite("item", config);
    if (cached) return cached;
    const result = generateItem(config);
    globalCache.setSprite("item", config, result);
    return result;
  }
  function cachedTile(config = {}) {
    const cached = globalCache.getSprite("tile", config);
    if (cached) return cached;
    const result = generateTile(config);
    globalCache.setSprite("tile", config, result);
    return result;
  }
  function cachedAnimation(config, animName) {
    const cached = globalCache.getAnimation("anim", config, animName);
    if (cached) return cached;
    const result = generateAnimation(config, animName);
    globalCache.setAnimation("anim", config, animName, result);
    return result;
  }
  function cachedEnemyAnimation(config, animName) {
    const cached = globalCache.getAnimation("enemyAnim", config, animName);
    if (cached) return cached;
    const result = generateEnemyAnimation(config, animName);
    globalCache.setAnimation("enemyAnim", config, animName, result);
    return result;
  }
  function cachedItemAnimation(config, animName) {
    const cached = globalCache.getAnimation("itemAnim", config, animName);
    if (cached) return cached;
    const result = generateItemAnimation(config, animName);
    globalCache.setAnimation("itemAnim", config, animName, result);
    return result;
  }
  function cachedEffectAnimation(config, animName) {
    const cached = globalCache.getAnimation("effectAnim", config, animName ?? config.kind ?? "slash");
    if (cached) return cached;
    const result = generateEffectAnimation(config, animName);
    globalCache.setAnimation("effectAnim", config, animName ?? config.kind ?? "slash", result);
    return result;
  }

  // src/index.ts
  function asImageDataArray(d) {
    return d;
  }
  function toImageData(sprite) {
    if (typeof ImageData === "undefined") {
      throw new Error("ImageData is not available in this environment.");
    }
    return new ImageData(asImageDataArray(sprite.data), sprite.width, sprite.height);
  }
  function toCanvas(sprite) {
    const { width, height } = sprite;
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      canvas = c;
    } else {
      throw new Error("No canvas available; use sprite.data or toImageData() in Node.");
    }
    const ctx = canvas.getContext("2d");
    ctx.putImageData(toImageData(sprite), 0, 0);
    return canvas;
  }
  function generateSpriteCanvas(config = {}) {
    return toCanvas(generateSprite(config));
  }
  function animationToCanvases(result) {
    return result.frames.map(toCanvas);
  }
  function generateSpriteSheetCanvas(config, animationName) {
    const result = generateAnimation(config, animationName);
    const sheet = packSpriteSheet(result.frames);
    return {
      canvas: toCanvas(sheet),
      frameWidth: result.frames[0]?.width ?? 0,
      frameCount: result.frameCount,
      fps: result.fps
    };
  }
  return __toCommonJS(index_exports);
})();
