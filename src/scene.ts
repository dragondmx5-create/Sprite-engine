// =============================================================================
// scene.ts — scene composition with z-sorting for UNDRAL.
//
// The game world is a grid of tiles with entities (player, enemies, items,
// effects) on top. This module composites them in the correct order:
//   1. Tiles (floor layer)
//   2. Shadows (under entities)
//   3. Entities sorted by Y position (back-to-front, "painter's algorithm")
//   4. Effects (on top of entities)
//   5. Darkness overlay (on top of everything)
//
// All input and output is SpriteBuffer — no DOM dependency.
// =============================================================================

import type { SpriteBuffer } from './types';
import { clamp255 } from './color';

/** A thing to draw: a sprite at a position with a depth key. */
export interface SceneEntity {
  sprite: SpriteBuffer;
  x: number;
  y: number;
  /** Y-sorting key. Higher = drawn later (in front). Defaults to y + sprite.height. */
  z?: number;
}

export interface SceneLayer {
  /** Tile grid: row-major, each element is a pre-rendered tile sprite or null. */
  tiles?: (SpriteBuffer | null)[];
  tileSize?: number;
  tilesPerRow?: number;
  tilesPerCol?: number;

  /** Entities to draw (player, enemies, items). Z-sorted automatically. */
  entities?: SceneEntity[];

  /** Shadows drawn under entities. */
  shadows?: SceneEntity[];

  /** Effects drawn on top (slash, impact, sparkle). */
  effects?: SceneEntity[];

  /** Darkness overlay (drawn last, on top of everything). */
  darkness?: SpriteBuffer;
}

/**
 * Alpha-composite `src` onto `dst` at position (ox, oy).
 * Standard "source over" blending. Mutates `dst.data` in place.
 */
export function blitOver(dst: SpriteBuffer, src: SpriteBuffer, ox: number, oy: number): void {
  const sw = src.width, sh = src.height;
  const dw = dst.width, dh = dst.height;
  // Snap to whole pixels first. Using the raw fractional offset in the
  // source-index math below produces negative/non-integer indices (reads
  // undefined -> NaN -> every written pixel clamps to 0), silently blitting
  // nothing whenever a caller passes a non-integer position.
  const iox = Math.round(ox), ioy = Math.round(oy);

  const x0 = Math.max(0, iox);
  const y0 = Math.max(0, ioy);
  const x1 = Math.min(dw, iox + sw);
  const y1 = Math.min(dh, ioy + sh);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const si = ((y - ioy) * sw + (x - iox)) * 4;
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

/**
 * Render a complete scene to a single SpriteBuffer.
 *
 * @param width   Output width in pixels.
 * @param height  Output height in pixels.
 * @param layer   Scene data (tiles, entities, effects, darkness).
 * @param cameraX Viewport offset X (scroll position).
 * @param cameraY Viewport offset Y (scroll position).
 */
export function renderScene(
  width: number,
  height: number,
  layer: SceneLayer,
  cameraX = 0,
  cameraY = 0,
): SpriteBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  const output: SpriteBuffer = { width, height, data };

  // 1) TILES — draw the visible portion of the tile grid.
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

  // 2) SHADOWS — drawn under all entities.
  if (layer.shadows) {
    for (const s of layer.shadows) {
      blitOver(output, s.sprite, s.x - cameraX, s.y - cameraY);
    }
  }

  // 3) ENTITIES — z-sorted back-to-front.
  if (layer.entities) {
    const sorted = [...layer.entities].sort(
      (a, b) => (a.z ?? a.y + a.sprite.height) - (b.z ?? b.y + b.sprite.height)
    );
    for (const e of sorted) {
      blitOver(output, e.sprite, e.x - cameraX, e.y - cameraY);
    }
  }

  // 4) EFFECTS — always on top of entities.
  if (layer.effects) {
    for (const e of layer.effects) {
      blitOver(output, e.sprite, e.x - cameraX, e.y - cameraY);
    }
  }

  // 5) DARKNESS — on top of everything.
  if (layer.darkness) {
    blitOver(output, layer.darkness, 0, 0);
  }

  return output;
}

/**
 * Create an empty (transparent) buffer to use as a render target.
 */
export function createBuffer(width: number, height: number): SpriteBuffer {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/**
 * Simple viewport culling: returns true if the entity is visible.
 */
export function isVisible(
  entity: SceneEntity,
  cameraX: number, cameraY: number,
  viewW: number, viewH: number,
): boolean {
  const ex = entity.x, ey = entity.y;
  const ew = entity.sprite.width, eh = entity.sprite.height;
  return ex + ew > cameraX && ex < cameraX + viewW &&
         ey + eh > cameraY && ey < cameraY + viewH;
}
