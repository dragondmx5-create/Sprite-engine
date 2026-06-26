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
import { resolveRenderOpts, renderParts } from './engine';
import { buildSkeleton } from './skeleton';
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

/** List the built-in animation names. */
export function listAnimations(): string[] {
  return Object.keys(CLIPS);
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
