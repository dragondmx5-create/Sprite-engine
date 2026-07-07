// =============================================================================
// ui.ts — procedural UI/HUD element generators for the UNDRAL game.
//
// Produces SpriteBuffers for health/mana/XP bars, inventory slots, dialog boxes,
// damage number backgrounds, and buttons. All DOM-free, same typed-array output
// as every other generator in the engine.
//
// Bars use direct pixel manipulation (like generateShadow in effects.ts) since
// they are simple rectangles and don't benefit from the full SDF pipeline.
// Structured elements (slots, dialogs, buttons) use the SDF + renderParts path
// for consistent shading with the rest of the engine.
// =============================================================================

import type { RGB, SpriteBuffer } from './types';
import type { Part } from './shapes';
import { roundedBox, circle } from './shapes';
import { MATERIALS } from './materials';
import { resolveRenderOpts, renderParts } from './engine';
import { clamp255 } from './color';

// =============================================================================
// Config interfaces
// =============================================================================

export interface HealthBarConfig {
  width?: number;       // default 64
  height?: number;      // default 8
  fill?: number;        // 0..1, how full the bar is. default 1
  color?: RGB;          // bar fill color, default red [220, 50, 40]
  bgColor?: RGB;        // background, default dark [30, 28, 26]
  borderColor?: RGB;    // border, default [80, 75, 70]
}

export interface ManaBarConfig {
  width?: number;       // default 64
  height?: number;      // default 8
  fill?: number;        // 0..1, how full the bar is. default 1
  color?: RGB;          // bar fill color, default blue [40, 100, 220]
  bgColor?: RGB;        // background, default dark [30, 28, 26]
  borderColor?: RGB;    // border, default [80, 75, 70]
}

export interface XPBarConfig {
  width?: number;       // default 64
  height?: number;      // default 6
  fill?: number;        // 0..1, how full the bar is. default 1
  color?: RGB;          // bar fill color, default green/yellow [180, 200, 40]
  bgColor?: RGB;        // background, default dark [30, 28, 26]
  borderColor?: RGB;    // border, default [80, 75, 70]
}

export interface InventorySlotConfig {
  size?: number;        // default 24
  empty?: boolean;      // default true
  highlight?: boolean;  // selected slot glow, default false
  bgColor?: RGB;        // default [45, 40, 38]
  borderColor?: RGB;    // default [90, 85, 78]
}

export interface DialogBoxConfig {
  width?: number;       // default 128
  height?: number;      // default 48
  bgColor?: RGB;        // default [25, 22, 20]
  borderColor?: RGB;    // default [120, 110, 90]
}

export interface DamageNumberConfig {
  size?: number;        // default 16
  color?: RGB;          // default red [255, 60, 40]
  crit?: boolean;       // if true, use gold [255, 220, 60], default false
}

export interface ButtonConfig {
  width?: number;       // default 48
  height?: number;      // default 16
  color?: RGB;          // default [100, 85, 65]
  pressed?: boolean;    // if true, darker shade + slight vertical offset feel
}

// =============================================================================
// Internal: bar renderer (direct pixel manipulation)
// =============================================================================

/**
 * Shared bar renderer. Draws a 1px border, background fill, and a colored fill
 * portion. Works directly on pixel data for simplicity and efficiency — bars
 * are axis-aligned rectangles that don't need SDF beveling.
 */
function renderBar(
  width: number, height: number, fill: number,
  color: RGB, bgColor: RGB, borderColor: RGB,
): SpriteBuffer {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;

      if (isBorder) {
        // Border pixel
        data[i]     = borderColor[0];
        data[i + 1] = borderColor[1];
        data[i + 2] = borderColor[2];
        data[i + 3] = 255;
      } else {
        // Inner area
        const innerX = x - 1;
        const innerWidth = width - 2;
        const fillWidth = Math.round(innerWidth * Math.max(0, Math.min(1, fill)));

        if (innerX < fillWidth) {
          // Filled portion — add subtle shading for depth
          const t = (y - 1) / Math.max(1, height - 3); // 0 at top, 1 at bottom
          const highlight = t < 0.35 ? 1.15 : t > 0.65 ? 0.85 : 1.0;
          data[i]     = clamp255(color[0] * highlight);
          data[i + 1] = clamp255(color[1] * highlight);
          data[i + 2] = clamp255(color[2] * highlight);
          data[i + 3] = 255;
        } else {
          // Background portion
          data[i]     = bgColor[0];
          data[i + 1] = bgColor[1];
          data[i + 2] = bgColor[2];
          data[i + 3] = 255;
        }
      }
    }
  }

  return { width, height, data };
}

// =============================================================================
// Health Bar
// =============================================================================

export function generateHealthBar(config: HealthBarConfig = {}): SpriteBuffer {
  const width      = config.width       ?? 64;
  const height     = config.height      ?? 8;
  const fill       = config.fill        ?? 1;
  const color      = config.color       ?? [220, 50, 40];
  const bgColor    = config.bgColor     ?? [30, 28, 26];
  const borderColor = config.borderColor ?? [80, 75, 70];
  return renderBar(width, height, fill, color, bgColor, borderColor);
}

// =============================================================================
// Mana Bar
// =============================================================================

export function generateManaBar(config: ManaBarConfig = {}): SpriteBuffer {
  const width      = config.width       ?? 64;
  const height     = config.height      ?? 8;
  const fill       = config.fill        ?? 1;
  const color      = config.color       ?? [40, 100, 220];
  const bgColor    = config.bgColor     ?? [30, 28, 26];
  const borderColor = config.borderColor ?? [80, 75, 70];
  return renderBar(width, height, fill, color, bgColor, borderColor);
}

// =============================================================================
// XP Bar
// =============================================================================

export function generateXPBar(config: XPBarConfig = {}): SpriteBuffer {
  const width      = config.width       ?? 64;
  const height     = config.height      ?? 6;
  const fill       = config.fill        ?? 1;
  const color      = config.color       ?? [180, 200, 40];
  const bgColor    = config.bgColor     ?? [30, 28, 26];
  const borderColor = config.borderColor ?? [80, 75, 70];
  return renderBar(width, height, fill, color, bgColor, borderColor);
}

// =============================================================================
// Inventory Slot
// =============================================================================

export function generateInventorySlot(config: InventorySlotConfig = {}): SpriteBuffer {
  const size        = config.size        ?? 24;
  const highlight   = config.highlight   ?? false;
  const bgColor     = config.bgColor     ?? [45, 40, 38];
  const borderColor = highlight ? [200, 180, 90] as RGB : (config.borderColor ?? [90, 85, 78]);

  const opts = resolveRenderOpts({ size, supersample: 2, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];

  const cx = s * 0.5, cy = s * 0.5;
  const borderHx = s * 0.44, borderHy = s * 0.44;
  const borderR = s * 0.06;
  const bgHx = s * 0.38, bgHy = s * 0.38;
  const bgR = s * 0.04;

  // Border (outer frame)
  parts.push({
    material: MATERIALS.metal(borderColor),
    roundness: 0.4,
    sdf: roundedBox(cx, cy, borderHx, borderHy, borderR),
    bbox: [Math.floor(cx - borderHx - 2), Math.floor(cy - borderHy - 2),
           Math.ceil(cx + borderHx + 2), Math.ceil(cy + borderHy + 2)],
  });

  // Background (inner panel)
  parts.push({
    material: MATERIALS.bone(bgColor),
    roundness: 0.3,
    sdf: roundedBox(cx, cy, bgHx, bgHy, bgR),
    bbox: [Math.floor(cx - bgHx - 2), Math.floor(cy - bgHy - 2),
           Math.ceil(cx + bgHx + 2), Math.ceil(cy + bgHy + 2)],
  });

  return renderParts(parts, opts);
}

// =============================================================================
// Dialog Box
// =============================================================================

export function generateDialogBox(config: DialogBoxConfig = {}): SpriteBuffer {
  const width       = config.width       ?? 128;
  const height      = config.height      ?? 48;
  const bgColor     = config.bgColor     ?? [25, 22, 20];
  const borderColor = config.borderColor ?? [120, 110, 90];

  // Use the larger dimension as the logical "size" for resolveRenderOpts,
  // but we need a non-square buffer. We'll render at the larger dimension
  // and crop, or use a square buffer. Since renderParts always outputs
  // square buffers (size x size), we render into a square of max(w,h)
  // and then crop to the desired rectangle.
  const maxDim = Math.max(width, height);
  const opts = resolveRenderOpts({ size: maxDim, supersample: 1, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];

  // Center the dialog within the square buffer
  const cx = s * 0.5, cy = s * 0.5;
  const outerHx = width * 0.5 - 1;
  const outerHy = height * 0.5 - 1;
  const outerR = Math.min(outerHx, outerHy) * 0.15;

  const innerHx = outerHx - 3;
  const innerHy = outerHy - 3;
  const innerR = Math.max(1, outerR - 2);

  // Outer border
  parts.push({
    material: MATERIALS.metal(borderColor),
    roundness: 0.35,
    sdf: roundedBox(cx, cy, outerHx, outerHy, outerR),
    bbox: [Math.floor(cx - outerHx - 2), Math.floor(cy - outerHy - 2),
           Math.ceil(cx + outerHx + 2), Math.ceil(cy + outerHy + 2)],
  });

  // Inner panel
  parts.push({
    material: MATERIALS.bone(bgColor),
    roundness: 0.25,
    sdf: roundedBox(cx, cy, innerHx, innerHy, innerR),
    bbox: [Math.floor(cx - innerHx - 2), Math.floor(cy - innerHy - 2),
           Math.ceil(cx + innerHx + 2), Math.ceil(cy + innerHy + 2)],
  });

  const squareBuf = renderParts(parts, opts);

  // Crop the square buffer to the desired width x height, centered
  if (width === height) return squareBuf;

  const data = new Uint8ClampedArray(width * height * 4);
  const offX = Math.floor((maxDim - width) / 2);
  const offY = Math.floor((maxDim - height) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcI = ((offY + y) * maxDim + (offX + x)) * 4;
      const dstI = (y * width + x) * 4;
      data[dstI]     = squareBuf.data[srcI];
      data[dstI + 1] = squareBuf.data[srcI + 1];
      data[dstI + 2] = squareBuf.data[srcI + 2];
      data[dstI + 3] = squareBuf.data[srcI + 3];
    }
  }

  return { width, height, data };
}

// =============================================================================
// Damage Number Background
// =============================================================================

export function generateDamageNumber(config: DamageNumberConfig = {}): SpriteBuffer {
  const size  = config.size  ?? 16;
  const crit  = config.crit  ?? false;
  const color = config.color ?? (crit ? [255, 220, 60] as RGB : [255, 60, 40] as RGB);

  const opts = resolveRenderOpts({ size, supersample: 2, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];

  const cx = s * 0.5, cy = s * 0.5;

  // Outer glow circle
  const outerR = s * 0.38;
  parts.push({
    material: MATERIALS.ember(color),
    roundness: 1.0,
    sdf: circle(cx, cy, outerR),
    bbox: [Math.floor(cx - outerR - 2), Math.floor(cy - outerR - 2),
           Math.ceil(cx + outerR + 2), Math.ceil(cy + outerR + 2)],
  });

  // Bright inner core
  const innerR = s * 0.18;
  const coreColor: RGB = crit ? [255, 255, 180] : [255, 200, 180];
  parts.push({
    material: MATERIALS.ember(coreColor),
    roundness: 1.0,
    sdf: circle(cx, cy, innerR),
    bbox: [Math.floor(cx - innerR - 2), Math.floor(cy - innerR - 2),
           Math.ceil(cx + innerR + 2), Math.ceil(cy + innerR + 2)],
  });

  return renderParts(parts, opts);
}

// =============================================================================
// Button
// =============================================================================

export function generateButton(config: ButtonConfig = {}): SpriteBuffer {
  const width   = config.width   ?? 48;
  const height  = config.height  ?? 16;
  const pressed = config.pressed ?? false;
  const baseColor = config.color ?? [100, 85, 65];

  // Darken the color when pressed
  const color: RGB = pressed
    ? [clamp255(baseColor[0] * 0.7), clamp255(baseColor[1] * 0.7), clamp255(baseColor[2] * 0.7)]
    : baseColor;

  // Highlight for the top bevel (lighter shade)
  const topColor: RGB = pressed
    ? color  // no highlight when pressed
    : [clamp255(baseColor[0] * 1.3), clamp255(baseColor[1] * 1.3), clamp255(baseColor[2] * 1.3)];

  // Use square buffer and crop like dialog box
  const maxDim = Math.max(width, height);
  const opts = resolveRenderOpts({ size: maxDim, supersample: 1, outline: false, quantize: false });
  const s = opts.W;
  const parts: Part[] = [];

  const cx = s * 0.5;
  // Shift button body down slightly when not pressed (to leave room for bevel top)
  const cy = pressed ? s * 0.5 : s * 0.5 + 1;
  const hx = width * 0.5 - 1;
  const hy = height * 0.5 - 1;
  const r = Math.min(hx, hy) * 0.25;

  if (!pressed) {
    // Bottom shadow/bevel — slightly offset down and darker
    const shadowColor: RGB = [clamp255(baseColor[0] * 0.45), clamp255(baseColor[1] * 0.45), clamp255(baseColor[2] * 0.45)];
    parts.push({
      material: MATERIALS.leather(shadowColor),
      roundness: 0.35,
      sdf: roundedBox(cx, cy + 1, hx, hy, r),
      bbox: [Math.floor(cx - hx - 2), Math.floor(cy + 1 - hy - 2),
             Math.ceil(cx + hx + 2), Math.ceil(cy + 1 + hy + 2)],
    });
  }

  // Main button body
  parts.push({
    material: MATERIALS.leather(color),
    roundness: 0.45,
    sdf: roundedBox(cx, cy, hx, hy, r),
    bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2),
           Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)],
  });

  // Top highlight strip (bevel effect) — a thin box across the upper portion
  if (!pressed) {
    const stripHy = hy * 0.25;
    const stripCy = cy - hy + stripHy + 1;
    parts.push({
      material: MATERIALS.bone(topColor),
      roundness: 0.3,
      sdf: roundedBox(cx, stripCy, hx - 2, stripHy, Math.max(1, r * 0.5)),
      bbox: [Math.floor(cx - hx), Math.floor(stripCy - stripHy - 2),
             Math.ceil(cx + hx), Math.ceil(stripCy + stripHy + 2)],
    });
  }

  const squareBuf = renderParts(parts, opts);

  // Crop to desired dimensions
  if (width === height) return squareBuf;

  const data = new Uint8ClampedArray(width * height * 4);
  const offX = Math.floor((maxDim - width) / 2);
  const offY = Math.floor((maxDim - height) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcI = ((offY + y) * maxDim + (offX + x)) * 4;
      const dstI = (y * width + x) * 4;
      data[dstI]     = squareBuf.data[srcI];
      data[dstI + 1] = squareBuf.data[srcI + 1];
      data[dstI + 2] = squareBuf.data[srcI + 2];
      data[dstI + 3] = squareBuf.data[srcI + 3];
    }
  }

  return { width, height, data };
}
