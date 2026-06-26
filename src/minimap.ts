// =============================================================================
// minimap.ts — tiny colored icons for the minimap overlay.
// These are 4-8 px, too small for the full SDF→lighting pipeline to add
// anything useful, so they're filled directly as simple geometric shapes.
// =============================================================================

import type { RGB, SpriteBuffer } from './types';
import { clamp255 } from './color';

export type MinimapIcon = 'player' | 'enemy' | 'item' | 'door' | 'stairs';

export interface MinimapConfig {
  icon?: MinimapIcon;
  size?: number;
  color?: RGB;
}

const ICON_COLORS: Record<MinimapIcon, RGB> = {
  player: [80, 220, 110],
  enemy:  [220, 60, 60],
  item:   [240, 210, 70],
  door:   [160, 120, 70],
  stairs: [200, 200, 220],
};

export function generateMinimapIcon(config: MinimapConfig = {}): SpriteBuffer {
  const icon = config.icon ?? 'player';
  const size = config.size ?? 6;
  const color = config.color ?? ICON_COLORS[icon];
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2, cy = size / 2;

  const put = (x: number, y: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = clamp255(color[0]); data[i + 1] = clamp255(color[1]);
    data[i + 2] = clamp255(color[2]); data[i + 3] = 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      switch (icon) {
        case 'player': // filled circle
          inside = Math.hypot(px - cx, py - cy) < size * 0.45;
          break;
        case 'enemy': // diamond (Manhattan ball)
          inside = Math.abs(px - cx) + Math.abs(py - cy) < size * 0.45;
          break;
        case 'item': // small square (inset)
          inside = Math.abs(px - cx) < size * 0.3 && Math.abs(py - cy) < size * 0.3;
          break;
        case 'door': // horizontal bar
          inside = Math.abs(px - cx) < size * 0.4 && Math.abs(py - cy) < size * 0.22;
          break;
        case 'stairs': // downward-pointing triangle
          inside = py > size * 0.2 && py < size * 0.8 && Math.abs(px - cx) < (py / size) * size * 0.45;
          break;
      }
      if (inside) put(x, y);
    }
  }
  return { width: size, height: size, data };
}

export const MINIMAP_ICONS: MinimapIcon[] = ['player', 'enemy', 'item', 'door', 'stairs'];
