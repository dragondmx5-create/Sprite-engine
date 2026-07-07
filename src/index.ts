// =============================================================================
// index.ts — public API surface.
//
//   import { generateSprite, toCanvas } from './sprite-engine';
//   const sprite = generateSprite({ seed: 'hero', size: 64 });
//   ctx.drawImage(toCanvas(sprite), x, y);
//
// The core (generateSprite) is DOM-free and Node-testable. The helpers below
// are thin adapters that only touch the DOM when you actually call them.
// =============================================================================

import { generateSprite, generateEnemy, generateItem, generateTile } from './engine';
import type { SpriteBuffer, SpriteConfig } from './types';
import {
  generateAnimation, packSpriteSheet, listAnimations,
  generateEnemyAnimation, listEnemyAnimations, ENEMY_CLIPS,
  generateItemAnimation, listItemAnimations, ITEM_CLIPS,
  generateEffectAnimation, listEffectAnimations, EFFECT_CLIPS,
  type AnimationResult,
} from './animation';

export { generateSprite, generateEnemy, generateItem, generateTile };
export type { SpriteBuffer, SpriteConfig, Material, RGB, Vec3, TextureLayer } from './types';
export { MATERIALS } from './materials';
export { valueNoise2D, fbm2D } from './noise';

// ---- Enemy / loot API (UNDRAL) ---------------------------------------------
export { buildCreature, CREATURE_KINDS } from './creatures';
export type { CreatureConfig, CreatureKind } from './creatures';
export { buildItem, ITEM_KINDS } from './items';
export type { ItemConfig, ItemKind } from './items';

// ---- Tiles (dungeon) -------------------------------------------------------
export { buildTile, TILE_KINDS } from './tiles';
export type { TileConfig, TileKind } from './tiles';

// ---- Autotiling (grid-level terrain edge blending) --------------------------
export { autotileMask, autotileEdges, gridMatcher } from './autotile';
export type { EdgeFlags, CellMatcher } from './autotile';

// ---- Effects (combat / status) ---------------------------------------------
export {
  generateShadow, generateSlashEffect, generateImpactEffect,
  generateProjectile, generateSparkle,
  flashSprite, tintSprite, applyStatusEffect,
  buildSlashEffect, buildImpactEffect, buildSparkleEffect,
  buildFireballEffect, buildMagicBoltEffect,
  buildWaterRippleEffect, buildSmokeEffect, buildDripEffect,
  buildEffect,
} from './effects';
export type { StatusEffect, VFXConfig, ProjectileKind, ProjectileConfig, EffectKind, EffectConfig } from './effects';

// ---- Loot / death markers (UNDRAL) -----------------------------------------
export { generateLootMarker, buildLootMarker, LOOT_MARKER_KINDS } from './loot';
export type { LootMarkerConfig, LootMarkerKind } from './loot';

// ---- Minimap ---------------------------------------------------------------
export { generateMinimapIcon, MINIMAP_ICONS } from './minimap';
export type { MinimapConfig, MinimapIcon } from './minimap';

// ---- Scene composition + z-sorting -----------------------------------------
export { renderScene, blitOver, createBuffer, isVisible } from './scene';
export type { SceneEntity, SceneLayer } from './scene';

// ---- Darkness / lighting system (UNDRAL) -----------------------------------
export { generateDarknessOverlay, generateLightGlow, isInDarkness, torchFlicker, lanternLight } from './darkness';
export type { LightSource, LanternLightOptions } from './darkness';

// ---- Pixel font / text rendering ----------------------------------------
export { renderText, renderNumber, measureText } from './font';
export type { TextConfig } from './font';

// ---- UI / HUD elements -----------------------------------------------
export {
  generateHealthBar, generateManaBar, generateXPBar,
  generateInventorySlot, generateDialogBox, generateDamageNumber, generateButton,
} from './ui';
export type { HealthBarConfig, ManaBarConfig, XPBarConfig, InventorySlotConfig, DialogBoxConfig, DamageNumberConfig, ButtonConfig } from './ui';

// ---- GPU accelerated rendering (WebGPU) ------------------------------------
export { GPURenderer, getGPURenderer, renderPartsGPU, renderBatchGPU } from './gpu';

// ---- SDF descriptors (for GPU pipeline) ------------------------------------
export { SDF_CIRCLE, SDF_ELLIPSE, SDF_CAPSULE, SDF_ROUNDED_BOX, extractSDFDesc } from './shapes';
export type { SDFDesc } from './shapes';

// ---- World map rendering (Telegram territory game) -------------------------
export { generateWorldMap, generateTerritoryCard } from './worldmap';
export type { WorldMapConfig, TerritoryData, BiomeTileSet } from './worldmap';

// ---- Sprite caching --------------------------------------------------------
export {
  SpriteCache, globalCache,
  cachedSprite, cachedEnemy, cachedItem, cachedTile,
  cachedAnimation, cachedEnemyAnimation, cachedItemAnimation, cachedEffectAnimation,
} from './cache';

// ---- Animation API ---------------------------------------------------------
export { generateAnimation, packSpriteSheet, listAnimations };
export type { AnimationResult };
// Procedural enemy animation (IK + springs):
export { generateEnemyAnimation, listEnemyAnimations, ENEMY_CLIPS };
// Procedural item animation (phase-driven):
export { generateItemAnimation, listItemAnimations, ITEM_CLIPS };
// Procedural effect animation (VFX):
export { generateEffectAnimation, listEffectAnimations, EFFECT_CLIPS };
// IK + secondary-motion toolkit (for authoring custom procedural motion):
export { solveTwoBone, fabrik } from './anim/ik';
export type { Pt } from './anim/ik';
export { damp, lag, squash, wave, pulse, smooth } from './anim/spring';
// Pose system (for authoring custom clips):
export { CLIPS, IDLE, WALK, ATTACK, HIT, DEATH, samplePose, NEUTRAL_POSE } from './pose';
export type { Pose, Keyframe, AnimationClip, AnimationName, Easing } from './pose';

// Newer TS lib types ImageData's data as Uint8ClampedArray<ArrayBuffer>.
// Our buffer is plainly ArrayBuffer-backed at runtime; this narrows the type.
function asImageDataArray(d: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  return d as unknown as Uint8ClampedArray<ArrayBuffer>;
}

/** Wrap a SpriteBuffer as an ImageData (browser / OffscreenCanvas contexts). */
export function toImageData(sprite: SpriteBuffer): ImageData {
  if (typeof ImageData === 'undefined') {
    throw new Error('ImageData is not available in this environment.');
  }
  return new ImageData(asImageDataArray(sprite.data), sprite.width, sprite.height);
}

/**
 * Render a SpriteBuffer to a canvas you can drawImage() directly.
 * Uses OffscreenCanvas when available, else a DOM <canvas>.
 */
export function toCanvas(
  sprite: SpriteBuffer,
): HTMLCanvasElement | OffscreenCanvas {
  const { width, height } = sprite;
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    canvas = c;
  } else {
    throw new Error('No canvas available; use sprite.data or toImageData() in Node.');
  }
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  ctx.putImageData(toImageData(sprite), 0, 0);
  return canvas;
}

/** One-call convenience: config → ready-to-draw canvas. */
export function generateSpriteCanvas(
  config: SpriteConfig = {},
): HTMLCanvasElement | OffscreenCanvas {
  return toCanvas(generateSprite(config));
}

/** Map an animation result's frames to ready-to-draw canvases. */
export function animationToCanvases(
  result: AnimationResult,
): (HTMLCanvasElement | OffscreenCanvas)[] {
  return result.frames.map(toCanvas);
}

/** Generate an animation and pack it into one horizontal spritesheet canvas. */
export function generateSpriteSheetCanvas(
  config: SpriteConfig,
  animationName: string,
): { canvas: HTMLCanvasElement | OffscreenCanvas; frameWidth: number; frameCount: number; fps: number } {
  const result = generateAnimation(config, animationName);
  const sheet = packSpriteSheet(result.frames);
  return {
    canvas: toCanvas(sheet),
    frameWidth: result.frames[0]?.width ?? 0,
    frameCount: result.frameCount,
    fps: result.fps,
  };
}
