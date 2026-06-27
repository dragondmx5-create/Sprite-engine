// =============================================================================
// animation.ts — generate frame-by-frame animations by posing the existing
// skeleton and running the existing render pipeline once per frame.
//
// Nothing here re-implements shading. Each frame is:
//     samplePose(clip, phase) → buildSkeleton(config, W, pose) → renderParts()
// i.e. the SAME path as a static sprite, just with a non-neutral pose.
//
// DETERMINISM / TEMPORAL STABILITY (explicit):
//   • resolveRenderOpts(config) is computed ONCE and reused for every frame, so
//     the light direction, size, and quantization are identical frame to frame
//     (light is fixed in world space).
//   • buildSkeleton re-seeds its RNG from config.seed on every call — the frame
//     index is NEVER mixed in — so proportions and colors are byte-identical
//     across frames. Only the deterministic pose changes.
//   • The render path uses deterministic posterize (no stochastic dither), so
//     there is no per-frame noise to "boil".
// Result: same seed + config + animation ⇒ identical frames, every run.
// =============================================================================

import type { SpriteBuffer, SpriteConfig } from './types';
import type { RGB } from './types';
import { resolveRenderOpts, renderParts } from './engine';
import { buildSkeleton } from './skeleton';
import { buildCreature, type CreatureConfig } from './creatures';
import { buildItem, type ItemConfig } from './items';
import { buildEffect, type EffectKind, type EffectConfig } from './effects';
import { CLIPS, samplePose } from './pose';

export interface AnimationResult {
  name: string;
  frames: SpriteBuffer[];
  frameCount: number;
  /** Suggested playback rate. */
  fps: number;
  loop: boolean;
}

/** Generate all frames of a named animation ('idle' | 'walk' | 'attack'). */
export function generateAnimation(config: SpriteConfig, animationName: string): AnimationResult {
  const clip = CLIPS[animationName];
  if (!clip) {
    throw new Error(`Unknown animation "${animationName}". Available: ${Object.keys(CLIPS).join(', ')}`);
  }

  // Resolved once → frame-invariant light/size/quantize.
  const opts = resolveRenderOpts(config);

  const frames: SpriteBuffer[] = [];
  for (let i = 0; i < clip.frames; i++) {
    // Looping clips sample [0,1) so frame N would equal frame 0 (skipped);
    // one-shot clips sample the closed range [0,1].
    const phase = clip.loop
      ? i / clip.frames
      : (clip.frames > 1 ? i / (clip.frames - 1) : 0);

    const pose = samplePose(clip, phase);
    const parts = buildSkeleton(config, opts.W, pose); // same seed every frame
    frames.push(renderParts(parts, opts));             // same shading path
  }

  return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
}

/** List the built-in character animation names. */
export function listAnimations(): string[] {
  return Object.keys(CLIPS);
}

// =============================================================================
// Enemy animation. Creatures animate PROCEDURALLY (IK + springs) from a single
// phase, so a "clip" is just a frame count + playback rate — there are no
// authored keyframes. `amp` scales the motion so the same cycle serves a calm
// idle and a full-speed move.
// =============================================================================

export interface EnemyClip { name: string; fps: number; loop: boolean; frames: number; amp: number; }

export const ENEMY_CLIPS: Record<string, EnemyClip> = {
  idle:   { name: 'idle',   fps: 8,  loop: true,  frames: 8, amp: 0.4 },
  move:   { name: 'move',   fps: 12, loop: true,  frames: 8, amp: 1.0 },
  death:  { name: 'death',  fps: 10, loop: false, frames: 6, amp: 1.0 },
  hit:    { name: 'hit',    fps: 14, loop: false, frames: 4, amp: 1.0 },
  emerge: { name: 'emerge', fps: 10, loop: false, frames: 6, amp: 1.0 },
};

/** Generate a procedural enemy animation ('move' | 'idle'). */
export function generateEnemyAnimation(
  config: SpriteConfig & CreatureConfig, animationName: string,
): AnimationResult {
  const clip = ENEMY_CLIPS[animationName];
  if (!clip) {
    throw new Error(`Unknown enemy animation "${animationName}". Available: ${Object.keys(ENEMY_CLIPS).join(', ')}`);
  }
  const opts = resolveRenderOpts(config);
  const frames: SpriteBuffer[] = [];
  for (let i = 0; i < clip.frames; i++) {
    const phase = i / clip.frames;                 // looping cycle
    const parts = buildCreature(config, opts.W, phase, clip.amp);
    frames.push(renderParts(parts, opts));
  }
  return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
}

/** List the built-in enemy animation names. */
export function listEnemyAnimations(): string[] {
  return Object.keys(ENEMY_CLIPS);
}

// =============================================================================
// Item animation. Same phase-driven pattern as enemies.
// =============================================================================

export interface ItemClip { name: string; fps: number; loop: boolean; frames: number; amp: number; }

export const ITEM_CLIPS: Record<string, ItemClip> = {
  idle:   { name: 'idle',   fps: 8,  loop: true,  frames: 8,  amp: 0.4 },
  active: { name: 'active', fps: 10, loop: true,  frames: 8,  amp: 1.0 },
  pickup: { name: 'pickup', fps: 12, loop: false, frames: 6,  amp: 1.0 },
};

/** Generate a procedural item animation ('idle' | 'active' | 'pickup'). */
export function generateItemAnimation(
  config: SpriteConfig & ItemConfig, animationName: string,
): AnimationResult {
  const clip = ITEM_CLIPS[animationName];
  if (!clip) {
    throw new Error(`Unknown item animation "${animationName}". Available: ${Object.keys(ITEM_CLIPS).join(', ')}`);
  }
  const opts = resolveRenderOpts(config);
  const frames: SpriteBuffer[] = [];
  for (let i = 0; i < clip.frames; i++) {
    const phase = clip.loop
      ? i / clip.frames
      : (clip.frames > 1 ? i / (clip.frames - 1) : 0);
    const parts = buildItem(config, opts.W, phase, clip.amp);
    frames.push(renderParts(parts, opts));
  }
  return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
}

/** List the built-in item animation names. */
export function listItemAnimations(): string[] {
  return Object.keys(ITEM_CLIPS);
}

// =============================================================================
// Effect animation. One-shot VFX (slash, impact, sparkle, fireball, magic_bolt).
// =============================================================================

export interface EffectClip { name: string; fps: number; loop: boolean; frames: number; amp: number; }

export const EFFECT_CLIPS: Record<string, EffectClip> = {
  slash:      { name: 'slash',      fps: 16, loop: false, frames: 6,  amp: 1.0 },
  impact:     { name: 'impact',     fps: 16, loop: false, frames: 5,  amp: 1.0 },
  sparkle:    { name: 'sparkle',    fps: 10, loop: true,  frames: 8,  amp: 1.0 },
  fireball:   { name: 'fireball',   fps: 12, loop: true,  frames: 8,  amp: 1.0 },
  magic_bolt: { name: 'magic_bolt', fps: 12, loop: true,  frames: 8,  amp: 1.0 },
};

const DEFAULT_EFFECT_COLORS: Record<EffectKind, RGB> = {
  slash:      [255, 240, 200],
  impact:     [255, 220, 100],
  sparkle:    [255, 255, 200],
  fireball:   [255, 140, 40],
  magic_bolt: [120, 80, 255],
};

/** Generate a VFX animation. */
export function generateEffectAnimation(config: EffectConfig & { size?: number; supersample?: number }, animationName?: string): AnimationResult {
  const kind = config.kind ?? 'slash';
  const clipName = animationName ?? kind;
  const clip = EFFECT_CLIPS[clipName];
  if (!clip) {
    throw new Error(`Unknown effect animation "${clipName}". Available: ${Object.keys(EFFECT_CLIPS).join(', ')}`);
  }
  const color = config.color ?? DEFAULT_EFFECT_COLORS[kind];
  const opts = resolveRenderOpts({ size: config.size ?? 32, supersample: config.supersample ?? 2, outline: false, quantize: false });
  const frames: SpriteBuffer[] = [];
  for (let i = 0; i < clip.frames; i++) {
    const phase = clip.loop
      ? i / clip.frames
      : (clip.frames > 1 ? i / (clip.frames - 1) : 0);
    const parts = buildEffect(kind, opts.W, color, phase, clip.amp);
    frames.push(renderParts(parts, opts));
  }
  return { name: clip.name, frames, frameCount: clip.frames, fps: clip.fps, loop: clip.loop };
}

/** List the built-in effect animation names. */
export function listEffectAnimations(): string[] {
  return Object.keys(EFFECT_CLIPS);
}

/**
 * Pack frames left-to-right into a single horizontal spritesheet buffer.
 * Standard layout: frame i occupies columns [i*frameW, (i+1)*frameW).
 */
export function packSpriteSheet(frames: SpriteBuffer[]): SpriteBuffer {
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
