// =============================================================================
// field.ts — THE CORE TRICK.
//
// We never store hand-authored normals. Instead we light each 2D shape as if
// it were a 3D object, derived purely from its silhouette:
//
//   1. Compute an INWARD distance field: for every interior pixel, how far is
//      it from the nearest silhouette edge.
//   2. The GRADIENT of that field points inward, toward the shape's spine.
//   3. We reinterpret distance as "how far the surface has rotated to face the
//      viewer": at the edge the surface is rolling away (normal points
//      sideways, out of the silhouette); deep inside it faces us (normal = +z).
//   4. Sweep that rotation with a quarter-circle (sphere) profile → a smooth,
//      believable surface normal at every pixel, for free.
//
// Dot that normal with a light direction and you get true volume: a strap or
// pauldron automatically catches light on the lit edge and falls into shadow
// on the far edge.
// =============================================================================

/**
 * Exact squared Euclidean distance transform of a 1D sampled function `f`
 * (Felzenszwalb & Huttenlocher, 2004). Lower envelope of parabolas, O(n).
 * `f[i]` is the cost at column i; result is min over j of (i-j)^2 + f[j].
 */
function edt1d(f: Float64Array, n: number, out: Float64Array): void {
  const v = new Int32Array(n);     // locations of parabolas in lower envelope
  const z = new Float64Array(n + 1); // boundaries between parabolas
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
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

/**
 * Inward Euclidean distance for a binary mask (1 = inside the shape).
 * Returns a Float32Array of distances (in pixels). Outside pixels are 0.
 * Also returns the maximum distance found (the shape's "core thickness").
 */
export function distanceField(
  mask: Uint8Array,
  w: number,
  h: number,
): { dist: Float32Array; maxDist: number } {
  const INF = 1e12;
  const g = new Float64Array(w * h); // squared distance, transformed in place
  // Seed: inside pixels start at +INF, outside (the boundary we measure to) at 0.
  for (let i = 0; i < w * h; i++) g[i] = mask[i] ? INF : 0;

  // Pass 1: transform each column.
  const colIn = new Float64Array(h);
  const colOut = new Float64Array(h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) colIn[y] = g[y * w + x];
    edt1d(colIn, h, colOut);
    for (let y = 0; y < h; y++) g[y * w + x] = colOut[y];
  }
  // Pass 2: transform each row.
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

export interface NormalField {
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
}

/**
 * Convert an inward distance field into per-pixel fake surface normals.
 *
 * @param bevel  How many pixels inward the surface takes to roll from
 *               edge-on to facing the viewer. Larger = rounder/ball-like.
 */
export function fieldToNormals(
  dist: Float32Array,
  mask: Uint8Array,
  w: number,
  h: number,
  bevel: number,
): NormalField {
  const nx = new Float32Array(w * h);
  const ny = new Float32Array(w * h);
  const nz = new Float32Array(w * h);
  const HALF_PI = Math.PI / 2;
  const inv = bevel > 1e-3 ? 1 / bevel : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;

      // Central differences on the distance field → inward gradient.
      // (Clamp neighbours to the current pixel at the buffer border.)
      const xm = x > 0 ? dist[i - 1] : dist[i];
      const xp = x < w - 1 ? dist[i + 1] : dist[i];
      const ym = y > 0 ? dist[i - w] : dist[i];
      const yp = y < h - 1 ? dist[i + w] : dist[i];
      let gx = (xp - xm) * 0.5;
      let gy = (yp - ym) * 0.5;

      // Normalize the inward gradient direction. Its NEGATIVE points outward,
      // which is where the rim normal tilts.
      const glen = Math.hypot(gx, gy) || 1e-6;
      gx /= glen;
      gy /= glen;

      // t: 0 at the silhouette edge, 1 once we're `bevel` px inside.
      const t = dist[i] * inv;
      const tc = t < 0 ? 0 : t > 1 ? 1 : t;
      // theta: tilt of the surface from the view axis. Quarter-circle sweep:
      // edge (t=0) → 90° (rolling away), interior (t>=1) → 0° (faces viewer).
      const theta = HALF_PI * (1 - tc);
      const s = Math.sin(theta);
      // Rim normal points OUTWARD (-gradient) in xy; nz rises toward the core.
      nx[i] = -gx * s;
      ny[i] = -gy * s;
      nz[i] = Math.cos(theta);
    }
  }
  return { nx, ny, nz };
}
