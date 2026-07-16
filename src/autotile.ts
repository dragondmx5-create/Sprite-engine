// =============================================================================
// autotile.ts — grid-level terrain blending helpers.
//
// Tile builders (tiles.ts) already know how to *paint* a soft edge once told
// which sides/corners touch a different terrain (TileConfig.edges). What was
// missing was a single, reusable way to *compute* those flags from a map
// grid — every caller (village-demo, worldmap) was hand-rolling its own
// neighbor lookup. This module is that one place.
//
// Classic blob/Wang autotiling: each tile's 4-directional neighbors (N/E/S/W)
// pack into a 4-bit mask (0-15) — the "16-tile" bitmask. `autotileMask` gives
// you that raw number (useful for picking pre-drawn edge sprites in other
// engines); `autotileEdges` gives you the richer 8-flag shape tiles.ts's
// `edges` painters already consume, including inner-corner tufts for path
// bends where only a diagonal neighbor matches.
// =============================================================================

export interface EdgeFlags {
  n: boolean; e: boolean; s: boolean; w: boolean;
  ne: boolean; nw: boolean; se: boolean; sw: boolean;
}

/** A grid cell predicate: does the cell at (row, col) belong to the terrain we're blending into? Out-of-bounds cells are queried too, so implementations decide the outside default. */
export type CellMatcher = (row: number, col: number) => boolean;

/**
 * Classic 4-bit blob-autotile bitmask (N=1, E=2, S=4, W=8), 0-15, for the
 * tile at (row, col). Same 16 combinations used by standard tileset editors.
 */
export function autotileMask(row: number, col: number, matches: CellMatcher): number {
  let mask = 0;
  if (matches(row - 1, col)) mask |= 1;
  if (matches(row, col + 1)) mask |= 2;
  if (matches(row + 1, col)) mask |= 4;
  if (matches(row, col - 1)) mask |= 8;
  return mask;
}

/**
 * Full edge+corner flags for TileConfig.edges, derived from `matches`.
 * Diagonal flags only fire when neither adjacent side already matches —
 * that's what makes an inner corner (a path bend) get a small tuft instead
 * of a redundant double-blob.
 */
export function autotileEdges(row: number, col: number, matches: CellMatcher): EdgeFlags {
  const n = matches(row - 1, col);
  const s = matches(row + 1, col);
  const w = matches(row, col - 1);
  const e = matches(row, col + 1);
  return {
    n, s, w, e,
    nw: !n && !w && matches(row - 1, col - 1),
    ne: !n && !e && matches(row - 1, col + 1),
    sw: !s && !w && matches(row + 1, col - 1),
    se: !s && !e && matches(row + 1, col + 1),
  };
}

/**
 * Bind a `CellMatcher` to a flat row-major grid array. `outside` is what to
 * report for coordinates off the edge of the map (default: not a match, so
 * map borders don't grow a fringe pointing into the void).
 */
export function gridMatcher<T>(
  grid: readonly T[],
  cols: number,
  rows: number,
  isMatch: (cell: T) => boolean,
  outside = false,
): CellMatcher {
  return (row, col) => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return outside;
    return isMatch(grid[row * cols + col]);
  };
}
