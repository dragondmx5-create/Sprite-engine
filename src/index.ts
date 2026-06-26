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

import { generateSprite } from './engine';
import type { SpriteBuffer, SpriteConfig } from './types';
import { generateAnimation, packSpriteSheet, listAnimations, type AnimationResult } from './animation';

export { generateSprite };
export type { SpriteBuffer, SpriteConfig, Material, RGB, Vec3 } from './types';
export { MATERIALS } from './materials';

// ---- Animation API ---------------------------------------------------------
export { generateAnimation, packSpriteSheet, listAnimations };
export type { AnimationResult };
// Pose system (for authoring custom clips):
export { CLIPS, IDLE, WALK, ATTACK, samplePose, NEUTRAL_POSE } from './pose';
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
