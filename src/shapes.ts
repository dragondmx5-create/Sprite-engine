// =============================================================================
// shapes.ts — analytic signed-distance shapes, rasterized into per-part masks.
// Using SDFs keeps silhouettes crisp at any scale and gives clean edges for
// the distance-field pass to bevel.
// =============================================================================

import type { Material } from './types';

/** A body part: a material + a function that returns signed distance (<0 inside). */
export interface Part {
  material: Material;
  sdf: (x: number, y: number) => number;
  /** Tight integer bounding box [x0,y0,x1,y1] in working-buffer pixels. */
  bbox: [number, number, number, number];
  /** 0..1; how rounded this part's volume reads (overrides global roundness). */
  roundness?: number;
}

const min = Math.min, max = Math.max, hypot = Math.hypot;

// --- SDF primitives (all centered/explicit; +y is down) --------------------

/** Circle of radius r at (cx,cy). */
export function circle(cx: number, cy: number, r: number) {
  return (x: number, y: number) => hypot(x - cx, y - cy) - r;
}

/** Axis-aligned ellipse via space-scaling (exact inside test). */
export function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return (x: number, y: number) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    // Scaled distance; multiply back by min radius to keep units ~pixels.
    return (hypot(dx, dy) - 1) * min(rx, ry);
  };
}

/** Capsule: segment (ax,ay)-(bx,by) inflated by radius r. Great for limbs. */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number) {
  const ex = bx - ax, ey = by - ay;
  const ee = ex * ex + ey * ey || 1e-6;
  return (x: number, y: number) => {
    const px = x - ax, py = y - ay;
    let t = (px * ex + py * ey) / ee;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return hypot(px - ex * t, py - ey * t) - r;
  };
}

/** Rounded box centered at (cx,cy), half-extents (hx,hy), corner radius r. */
export function roundedBox(cx: number, cy: number, hx: number, hy: number, r: number) {
  return (x: number, y: number) => {
    const dx = Math.abs(x - cx) - hx + r;
    const dy = Math.abs(y - cy) - hy + r;
    const outside = hypot(max(dx, 0), max(dy, 0));
    const inside = min(max(dx, dy), 0);
    return outside + inside - r;
  };
}

/** Union of two SDFs (min). Lets a part be built from several primitives. */
export function union(a: (x: number, y: number) => number, b: (x: number, y: number) => number) {
  return (x: number, y: number) => min(a(x, y), b(x, y));
}

/**
 * Rasterize a part's SDF into a binary mask over the working buffer.
 * Only the part's bbox is touched, so this stays cheap.
 */
export function rasterize(part: Part, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const [x0, y0, x1, y1] = part.bbox;
  const cx0 = max(0, x0 | 0), cy0 = max(0, y0 | 0);
  const cx1 = min(w, (x1 | 0) + 1), cy1 = min(h, (y1 | 0) + 1);
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      // Sample at pixel center.
      if (part.sdf(x + 0.5, y + 0.5) < 0) mask[y * w + x] = 1;
    }
  }
  return mask;
}

// --- Transforms for posing (used by the animation layer) -------------------
// We pose by transforming the SAMPLE coordinate before evaluating an SDF:
// to "move" a shape by (dx,dy) we evaluate it at (x-dx, y-dy); to rotate it
// by `angle` around a pivot we rotate the sample point by -angle about the
// pivot. This keeps shapes resolution-independent and avoids re-rasterizing
// into intermediate buffers.

export type SDF = (x: number, y: number) => number;

/** Translate an SDF by (dx,dy). */
export function translated(sdf: SDF, dx: number, dy: number): SDF {
  return (x, y) => sdf(x - dx, y - dy);
}

/** Rotate an SDF by `angle` (radians) around pivot (px,py). */
export function rotatedAround(sdf: SDF, angle: number, px: number, py: number): SDF {
  if (angle === 0) return sdf;
  const c = Math.cos(-angle), s = Math.sin(-angle);
  return (x, y) => {
    const dx = x - px, dy = y - py;
    return sdf(px + dx * c - dy * s, py + dx * s + dy * c);
  };
}

/**
 * Compute the integer AABB of an axis-aligned local box after rotating it by
 * `angle` around (px,py) and translating by (dx,dy). Used so a posed part's
 * crop box always contains the transformed shape (no clipping, tight perf).
 */
export function transformedAABB(
  x0: number, y0: number, x1: number, y1: number,
  angle: number, px: number, py: number, dx: number, dy: number,
): [number, number, number, number] {
  const c = Math.cos(angle), s = Math.sin(angle);
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of corners) {
    const rx = px + (x - px) * c - (y - py) * s + dx;
    const ry = py + (x - px) * s + (y - py) * c + dy;
    if (rx < minx) minx = rx; if (rx > maxx) maxx = rx;
    if (ry < miny) miny = ry; if (ry > maxy) maxy = ry;
  }
  return [Math.floor(minx - 2), Math.floor(miny - 2), Math.ceil(maxx + 2), Math.ceil(maxy + 2)];
}
