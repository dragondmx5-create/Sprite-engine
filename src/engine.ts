// =============================================================================
// engine.ts — the render pipeline.
//   skeleton → (per part) rasterize → distance field → normals → lighting
//   → composite over → downsample (AA) → optional outline → optional quantize
// Pure logic on typed arrays; no DOM. Output is an RGBA SpriteBuffer.
//
// The pipeline is split into `resolveRenderOpts` + `renderParts` so that BOTH
// static sprites (generateSprite) and animation frames run the EXACT same
// shading code. That shared path is what keeps an animated frame visually
// identical in style to a static one — no separate, drifting code path.
// =============================================================================

import type { RGB, SpriteConfig, SpriteBuffer, Light } from './types';
import { buildSkeleton } from './skeleton';
import type { Pose } from './pose';
import { distanceField, fieldToNormals } from './field';
import { makeShadeContext, shade } from './lighting';
import { clamp255, quantizeChannel } from './color';
import type { Part } from './shapes';

const DEFAULT_LIGHT: Light = {
  // toward upper-left-front (remember: +y is down, so -y is up)
  dir: { x: -0.5, y: -0.78, z: 0.62 },
  ambient: 0.22,
};

/** Everything the render loop needs, resolved from a SpriteConfig once. */
export interface RenderOpts {
  size: number;
  ss: number;
  W: number;
  H: number;
  roundness: number;
  light: Light;
  outlineColor: RGB | null;
  quantize: number; // 0 = off
}

/**
 * Resolve a SpriteConfig into concrete render options. Crucially this is
 * computed ONCE per animation (light, size, quantize, etc. are frame-invariant)
 * and reused for every frame, so the light stays fixed in world space and the
 * look never changes between frames.
 */
export function resolveRenderOpts(config: SpriteConfig = {}): RenderOpts {
  const size = config.size ?? 48;
  const ss = Math.max(1, Math.floor(config.supersample ?? 1));
  const light: Light = {
    dir: { ...DEFAULT_LIGHT.dir, ...(config.light ?? {}) },
    ambient: config.ambient ?? DEFAULT_LIGHT.ambient,
  };
  const outlineColor: RGB | null =
    config.outline === false ? null : ((config.outline && config.outline.color) || [22, 18, 28]);
  const quantize = config.quantize === false ? 0 : (config.quantize ?? 5);
  return { size, ss, W: size * ss, H: size * ss, roundness: config.roundness ?? 0.45, light, outlineColor, quantize };
}

/**
 * Render an already-built list of parts to an RGBA SpriteBuffer.
 * This is the single source of truth for shading; static and animated frames
 * both call it.
 */
export function renderParts(parts: Part[], opts: RenderOpts): SpriteBuffer {
  const { size, ss, W, H, roundness, light } = opts;
  const acc = new Float32Array(W * H * 4);
  const out: RGB = [0, 0, 0];

  // ---- Per-part: build form, light it, composite OVER -------------------
  // Crop every part to its bbox (+1px border) so the distance field runs over
  // a few hundred pixels, not the whole buffer.
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

    // Bevel scales with the part's own thickness — proportional roundness.
    const pr = part.roundness ?? roundness;
    const bevel = Math.max(1.5, pr * maxDist);
    const { nx, ny, nz } = fieldToNormals(dist, mask, cw, ch, bevel);

    // Shade context depends only on material + (fixed) light => identical
    // shading for the same part in every frame.
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

  // ---- Downsample (box filter) → output resolution. Free AA. ------------
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
          r += acc[si] * w; g += acc[si + 1] * w; b += acc[si + 2] * w; a += sa;
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

  // ---- Optional exterior outline ---------------------------------------
  if (opts.outlineColor) applyOutline(data, size, size, opts.outlineColor);

  // ---- Optional posterize (deterministic => no temporal "boiling") ------
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

/** Static sprite: build the (optionally posed) skeleton, then render it. */
export function generateSprite(config: SpriteConfig = {}, pose?: Pose): SpriteBuffer {
  const opts = resolveRenderOpts(config);
  const parts = buildSkeleton(config, opts.W, pose);
  return renderParts(parts, opts);
}

/** Paint a dark border on transparent pixels that touch the silhouette. */
function applyOutline(data: Uint8ClampedArray, w: number, h: number, color: RGB): void {
  const isSolid = (x: number, y: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < h && data[(y * w + x) * 4 + 3] > 128;
  const snapshotAlpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) snapshotAlpha[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (snapshotAlpha[i]) continue;
      if (isSolid(x - 1, y) || isSolid(x + 1, y) || isSolid(x, y - 1) || isSolid(x, y + 1)) {
        const j = i * 4;
        data[j] = color[0]; data[j + 1] = color[1]; data[j + 2] = color[2]; data[j + 3] = 255;
      }
    }
  }
}
