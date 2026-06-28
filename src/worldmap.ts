// =============================================================================
// worldmap.ts — world map renderer for the Telegram territory game.
//
// Renders a high-quality world map using the Sprite engine tile system.
// Each territory is a region of biome-appropriate tiles with ownership markers.
// Output is a raw RGBA SpriteBuffer (PNG encoding done by the CLI wrapper).
// =============================================================================

import type { SpriteBuffer, RGB } from './types';
import { generateTile } from './engine';
import type { TileKind } from './tiles';
import { renderText, measureText } from './font';
import { blitOver, createBuffer } from './scene';
import { RNG } from './rng';
import { clamp255 } from './color';

// -- Biome → tile mapping ----------------------------------------------------

export interface BiomeTileSet {
  floor: TileKind;
  accent: TileKind[];
  props: TileKind[];
  floorColor: RGB;
}

const BIOME_TILES: Record<string, BiomeTileSet> = {
  forest: {
    floor: 'grass_floor',
    accent: ['moss_floor', 'dirt_floor'],
    props: ['tree', 'pine_tree'],
    floorColor: [45, 120, 45],
  },
  volcano: {
    floor: 'stone_floor',
    accent: ['lava_floor', 'dirt_floor'],
    props: ['stalagmite', 'torch_bracket'],
    floorColor: [140, 50, 20],
  },
  ice: {
    floor: 'ice_floor',
    accent: ['stone_floor', 'crystal_floor'],
    props: ['pillar', 'stalagmite'],
    floorColor: [160, 200, 230],
  },
  desert: {
    floor: 'dirt_floor',
    accent: ['stone_floor', 'dirt_floor'],
    props: ['ruins', 'barrel'],
    floorColor: [190, 160, 80],
  },
  ocean: {
    floor: 'water_pool',
    accent: ['ice_floor', 'stone_floor'],
    props: ['pillar', 'fountain'],
    floorColor: [30, 55, 130],
  },
  shadow: {
    floor: 'stone_floor',
    accent: ['dirt_floor', 'moss_floor'],
    props: ['cobweb', 'bone_pile'],
    floorColor: [35, 30, 45],
  },
  swamp: {
    floor: 'moss_floor',
    accent: ['water_pool', 'dirt_floor'],
    props: ['dead_tree', 'cobweb'],
    floorColor: [60, 90, 40],
  },
  dragon: {
    floor: 'stone_floor',
    accent: ['lava_floor', 'crystal_floor'],
    props: ['stalagmite', 'torch_bracket'],
    floorColor: [100, 25, 15],
  },
  holy: {
    floor: 'crystal_floor',
    accent: ['stone_floor', 'ice_floor'],
    props: ['altar', 'pillar'],
    floorColor: [200, 185, 100],
  },
  underground: {
    floor: 'stone_floor',
    accent: ['dirt_floor', 'crystal_floor'],
    props: ['stalagmite', 'barrel'],
    floorColor: [70, 65, 58],
  },
};

// -- Territory data ----------------------------------------------------------

export interface TerritoryData {
  key: string;
  name: string;
  biome: string;
  owner?: string;
  level?: number;
  population?: number;
  atWar?: boolean;
  allianceName?: string;
}

// -- Map layout (hex-inspired grid, 2 rows of 5) ----------------------------

const MAP_COLS = 4;
const MAP_ROWS = 3;

interface CellPos {
  col: number;
  row: number;
}

function getCellPositions(count: number): CellPos[] {
  const positions: CellPos[] = [];
  for (let i = 0; i < count && i < MAP_COLS * MAP_ROWS; i++) {
    positions.push({ col: i % MAP_COLS, row: Math.floor(i / MAP_COLS) });
  }
  return positions;
}

// -- Render a biome region (tile grid for one territory) ---------------------

function renderBiomeRegion(
  biome: string,
  seed: string,
  regionW: number,
  regionH: number,
  tileSize: number,
): SpriteBuffer {
  const tileset = BIOME_TILES[biome] || BIOME_TILES.forest;
  const rng = new RNG(seed);
  const buf = createBuffer(regionW, regionH);

  const cols = Math.ceil(regionW / tileSize);
  const rows = Math.ceil(regionH / tileSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let kind: TileKind = tileset.floor;
      const roll = rng.float();
      if (roll < 0.08 && tileset.props.length > 0) {
        kind = tileset.props[Math.floor(rng.float() * tileset.props.length)];
      } else if (roll < 0.25 && tileset.accent.length > 0) {
        kind = tileset.accent[Math.floor(rng.float() * tileset.accent.length)];
      }

      const tile = generateTile({
        kind,
        seed: `${seed}-${row}-${col}`,
        size: tileSize,
        outline: false,
        quantize: false,
        supersample: 3,
      });

      blitOver(buf, tile, col * tileSize, row * tileSize);
    }
  }

  return buf;
}

// -- Draw a colored marker dot -----------------------------------------------

function drawMarkerDot(
  buf: SpriteBuffer,
  cx: number,
  cy: number,
  radius: number,
  color: RGB,
  borderColor: RGB,
): void {
  const r2 = radius * radius;
  const br2 = (radius + 2) * (radius + 2);

  for (let y = cy - radius - 2; y <= cy + radius + 2; y++) {
    for (let x = cx - radius - 2; x <= cx + radius + 2; x++) {
      if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) continue;
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;

      if (d2 <= r2) {
        const idx = (y * buf.width + x) * 4;
        buf.data[idx] = color[0];
        buf.data[idx + 1] = color[1];
        buf.data[idx + 2] = color[2];
        buf.data[idx + 3] = 255;
      } else if (d2 <= br2) {
        const idx = (y * buf.width + x) * 4;
        buf.data[idx] = borderColor[0];
        buf.data[idx + 1] = borderColor[1];
        buf.data[idx + 2] = borderColor[2];
        buf.data[idx + 3] = 255;
      }
    }
  }
}

// -- Draw a filled rounded rectangle -----------------------------------------

function drawRoundedRect(
  buf: SpriteBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor: RGB,
  alpha: number,
): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px < 0 || px >= buf.width || py < 0 || py >= buf.height) continue;

      let inside = true;
      const corners = [
        [x + radius, y + radius],
        [x + w - radius, y + radius],
        [x + radius, y + h - radius],
        [x + w - radius, y + h - radius],
      ];
      for (const [cx, cy] of corners) {
        const inCornerX = (px < x + radius && cx === x + radius) || (px > x + w - radius && cx === x + w - radius);
        const inCornerY = (py < y + radius && cy === y + radius) || (py > y + h - radius && cy === y + h - radius);
        if (inCornerX && inCornerY) {
          const dx = px - cx;
          const dy = py - cy;
          if (dx * dx + dy * dy > radius * radius) {
            inside = false;
            break;
          }
        }
      }
      if (!inside) continue;

      const idx = (py * buf.width + px) * 4;
      const a = alpha / 255;
      const inv = 1 - a;
      buf.data[idx] = clamp255(fillColor[0] * a + buf.data[idx] * inv);
      buf.data[idx + 1] = clamp255(fillColor[1] * a + buf.data[idx + 1] * inv);
      buf.data[idx + 2] = clamp255(fillColor[2] * a + buf.data[idx + 2] * inv);
      buf.data[idx + 3] = clamp255(alpha + buf.data[idx + 3] * inv);
    }
  }
}

// -- Draw a border -----------------------------------------------------------

function drawBorder(
  buf: SpriteBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  color: RGB,
): void {
  for (let t = 0; t < thickness; t++) {
    for (let px = x + t; px < x + w - t; px++) {
      setPixel(buf, px, y + t, color);
      setPixel(buf, px, y + h - 1 - t, color);
    }
    for (let py = y + t; py < y + h - t; py++) {
      setPixel(buf, x + t, py, color);
      setPixel(buf, x + w - 1 - t, py, color);
    }
  }
}

function setPixel(buf: SpriteBuffer, x: number, y: number, color: RGB): void {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const idx = (y * buf.width + x) * 4;
  buf.data[idx] = color[0];
  buf.data[idx + 1] = color[1];
  buf.data[idx + 2] = color[2];
  buf.data[idx + 3] = 255;
}

// -- Main world map generator ------------------------------------------------

export interface WorldMapConfig {
  territories: TerritoryData[];
  title?: string;
  tileSize?: number;
  cellWidth?: number;
  cellHeight?: number;
  padding?: number;
}

export function generateWorldMap(config: WorldMapConfig): SpriteBuffer {
  const {
    territories,
    title = 'TERRITORY WAR',
    tileSize = 48,
    cellWidth = 340,
    cellHeight = 260,
    padding = 10,
  } = config;

  const positions = getCellPositions(territories.length);
  const cols = Math.min(territories.length, MAP_COLS);
  const rows = Math.ceil(territories.length / MAP_COLS);

  const headerH = 70;
  const legendH = 40;
  const mapW = cols * (cellWidth + padding) + padding;
  const mapH = headerH + rows * (cellHeight + padding) + padding + legendH;

  const output = createBuffer(mapW, mapH);

  // dark background fill
  for (let i = 0; i < output.data.length; i += 4) {
    output.data[i] = 15;
    output.data[i + 1] = 14;
    output.data[i + 2] = 22;
    output.data[i + 3] = 255;
  }

  // title text
  const titleBuf = renderText(title, { color: [255, 215, 60], scale: 5, shadow: true });
  blitOver(output, titleBuf, Math.floor((mapW - titleBuf.width) / 2), 12);

  // render each territory cell
  for (let i = 0; i < territories.length; i++) {
    const t = territories[i];
    const pos = positions[i];

    const cellX = padding + pos.col * (cellWidth + padding);
    const cellY = headerH + padding + pos.row * (cellHeight + padding);

    // render biome tiles for this cell
    const biomeRegion = renderBiomeRegion(
      t.biome,
      `world-${t.key}`,
      cellWidth,
      cellHeight,
      tileSize,
    );
    blitOver(output, biomeRegion, cellX, cellY);

    // dark overlay for text readability
    drawRoundedRect(output, cellX, cellY, cellWidth, 36, 0, [0, 0, 0], 170);

    // territory name (truncate if needed)
    const maxNameChars = Math.floor((cellWidth - 40) / 18);
    const displayName = t.name.length > maxNameChars ? t.name.slice(0, maxNameChars - 1) + '..' : t.name;
    const nameBuf = renderText(displayName, { color: [255, 255, 255], scale: 3, shadow: true });
    blitOver(output, nameBuf, cellX + 8, cellY + 6);

    // border color based on status
    let borderCol: RGB = [80, 80, 100]; // unclaimed
    let borderW = 2;
    if (t.owner) {
      if (t.atWar) {
        borderCol = [255, 50, 50];
        borderW = 3;
      } else if ((t.level ?? 0) >= 5) {
        borderCol = [255, 215, 0];
      } else {
        borderCol = [80, 200, 80];
      }
    }
    drawBorder(output, cellX, cellY, cellWidth, cellHeight, borderW, borderCol);

    // ownership marker
    if (t.owner) {
      // owner info background
      drawRoundedRect(output, cellX + 4, cellY + cellHeight - 80, cellWidth - 8, 76, 6, [0, 0, 0], 190);

      // owner name
      const ownerName = t.owner.length > 24 ? t.owner.slice(0, 23) + '..' : t.owner;
      const ownerBuf = renderText(ownerName, { color: [140, 255, 140], scale: 2, shadow: true });
      blitOver(output, ownerBuf, cellX + 12, cellY + cellHeight - 74);

      // level + population
      const infoStr = `Lv.${t.level ?? 1}  Pop:${t.population ?? 0}`;
      const infoBuf = renderText(infoStr, { color: [180, 180, 220], scale: 2, shadow: true });
      blitOver(output, infoBuf, cellX + 12, cellY + cellHeight - 54);

      // alliance if any
      if (t.allianceName) {
        const allyBuf = renderText(`[${t.allianceName}]`, { color: [120, 180, 255], scale: 2, shadow: true });
        blitOver(output, allyBuf, cellX + 12, cellY + cellHeight - 34);
      }

      // war indicator
      if (t.atWar) {
        const warBuf = renderText('AT WAR', { color: [255, 60, 60], scale: 2, shadow: true });
        blitOver(output, warBuf, cellX + cellWidth - 90, cellY + cellHeight - 16);
      }

      // marker dot (ownership indicator)
      const dotColor: RGB = t.atWar ? [255, 50, 50] : [80, 220, 80];
      drawMarkerDot(output, cellX + cellWidth - 22, cellY + 18, 8, dotColor, [255, 255, 255]);
    } else {
      // unclaimed territory
      const unclaimedBuf = renderText('UNCLAIMED', { color: [100, 100, 100], scale: 3 });
      blitOver(output, unclaimedBuf,
        cellX + Math.floor((cellWidth - unclaimedBuf.width) / 2),
        cellY + Math.floor((cellHeight - unclaimedBuf.height) / 2),
      );
    }
  }

  // legend bar
  const legendY = mapH - legendH + 4;
  const legendItems: [string, RGB][] = [
    ['OWNED', [80, 200, 80]],
    ['Lv.5+', [255, 215, 0]],
    ['WAR', [255, 50, 50]],
    ['EMPTY', [80, 80, 100]],
  ];
  let lx = padding;
  for (const [label, col] of legendItems) {
    drawRoundedRect(output, lx, legendY, 16, 16, 3, col, 255);
    const lbl = renderText(label, { color: [160, 160, 180], scale: 2 });
    blitOver(output, lbl, lx + 22, legendY + 1);
    lx += 22 + lbl.width + 24;
  }

  return output;
}

// -- Territory card generator ------------------------------------------------

export function generateTerritoryCard(
  territory: TerritoryData,
  upgrades?: Record<string, number>,
  monsterCount?: number,
  treasury?: number,
): SpriteBuffer {
  const cardW = 500;
  const cardH = 350;
  const tileSize = 48;

  const output = createBuffer(cardW, cardH);

  // biome background (top half)
  const bgRegion = renderBiomeRegion(
    territory.biome,
    `card-${territory.key}`,
    cardW,
    140,
    tileSize,
  );
  blitOver(output, bgRegion, 0, 0);

  // dark overlay
  drawRoundedRect(output, 0, 0, cardW, 140, 0, [0, 0, 0], 100);

  // dark bottom section
  drawRoundedRect(output, 0, 140, cardW, cardH - 140, 0, [20, 20, 30], 255);

  // territory name
  const titleBuf = renderText(territory.name, { color: [255, 255, 255], scale: 4, shadow: true });
  blitOver(output, titleBuf, Math.floor((cardW - titleBuf.width) / 2), 16);

  // owner
  if (territory.owner) {
    const ownerBuf = renderText(territory.owner, { color: [140, 255, 140], scale: 3, shadow: true });
    blitOver(output, ownerBuf, Math.floor((cardW - ownerBuf.width) / 2), 60);

    const lvlBuf = renderText(`Level ${territory.level ?? 1}`, { color: [200, 200, 255], scale: 2, shadow: true });
    blitOver(output, lvlBuf, Math.floor((cardW - lvlBuf.width) / 2), 100);
  }

  // stats section
  let sy = 152;
  const stats: [string, string, RGB][] = [
    ['Population', `${territory.population ?? 0}`, [100, 200, 255]],
    ['Treasury', `${treasury ?? 0}`, [255, 215, 50]],
    ['Monsters', `${monsterCount ?? 0}`, [255, 100, 100]],
  ];
  for (const [label, val, col] of stats) {
    const labelBuf = renderText(`${label}:`, { color: [160, 160, 180], scale: 2 });
    const valBuf = renderText(val, { color: col, scale: 2 });
    blitOver(output, labelBuf, 16, sy);
    blitOver(output, valBuf, 170, sy);
    sy += 22;
  }

  // upgrades
  if (upgrades && Object.keys(upgrades).length > 0) {
    sy += 8;
    const upgTitle = renderText('Buildings:', { color: [200, 200, 200], scale: 2 });
    blitOver(output, upgTitle, 16, sy);
    sy += 22;
    for (const [key, lvl] of Object.entries(upgrades)) {
      if (lvl > 0) {
        const upgBuf = renderText(`${key} Lv.${lvl}`, { color: [150, 180, 200], scale: 2 });
        blitOver(output, upgBuf, 24, sy);
        sy += 18;
      }
    }
  }

  // border
  let borderCol: RGB = [80, 80, 100];
  if (territory.owner) {
    borderCol = territory.atWar ? [255, 50, 50] : (territory.level ?? 0) >= 5 ? [255, 215, 0] : [80, 200, 80];
  }
  drawBorder(output, 0, 0, cardW, cardH, 2, borderCol);

  return output;
}
