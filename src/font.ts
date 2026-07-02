// =============================================================================
// font.ts — procedural pixel font renderer.
//
// 5x7 bitmap font covering ASCII 32-126 (printable characters).
// Each glyph is 7 rows of 5-bit bitmasks (MSB = leftmost pixel).
// No external font files — all glyphs defined inline.
// =============================================================================

import type { RGB, SpriteBuffer } from './types';

/** Configuration for text rendering. */
export interface TextConfig {
  /** Text color. Default [220, 215, 200] (parchment white). */
  color?: RGB;
  /** Pixel scale multiplier. Default 1. */
  scale?: number;
  /** Extra pixels between characters. Default 1. */
  spacing?: number;
  /** Drop shadow behind text. Default false. */
  shadow?: boolean;
  /** Shadow color. Default [0, 0, 0]. */
  shadowColor?: RGB;
}

// -- Glyph width / height constants ------------------------------------------
const GLYPH_W = 5;
const GLYPH_H = 7;

// -- Default text style -------------------------------------------------------
const DEFAULT_COLOR: RGB = [220, 215, 200];
const DEFAULT_SHADOW_COLOR: RGB = [0, 0, 0];

// =============================================================================
// Glyph bitmaps — 5x7, stored as 7 numbers (each 5 bits, MSB = left).
// =============================================================================
const GLYPHS: Record<string, number[]> = {
  // -- Space / punctuation ----------------------------------------------------
  ' ':  [0, 0, 0, 0, 0, 0, 0],
  '!':  [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '"':  [0b01010, 0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000],
  '#':  [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  '$':  [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  '%':  [0b11001, 0b11001, 0b00010, 0b00100, 0b01000, 0b10011, 0b10011],
  '&':  [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "'":  [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  '(':  [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')':  [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '*':  [0b00000, 0b00100, 0b10101, 0b01110, 0b10101, 0b00100, 0b00000],
  '+':  [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  ',':  [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b01000],
  '-':  [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '.':  [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100],
  '/':  [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  ':':  [0b00000, 0b00000, 0b00100, 0b00000, 0b00100, 0b00000, 0b00000],
  ';':  [0b00000, 0b00000, 0b00100, 0b00000, 0b00100, 0b00100, 0b01000],
  '<':  [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  '=':  [0b00000, 0b00000, 0b11111, 0b00000, 0b11111, 0b00000, 0b00000],
  '>':  [0b10000, 0b01000, 0b00100, 0b00010, 0b00100, 0b01000, 0b10000],
  '?':  [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  '@':  [0b01110, 0b10001, 0b10111, 0b10101, 0b10110, 0b10000, 0b01111],
  '[':  [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  '\\': [0b10000, 0b01000, 0b01000, 0b00100, 0b00010, 0b00010, 0b00001],
  ']':  [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  '^':  [0b00100, 0b01010, 0b10001, 0b00000, 0b00000, 0b00000, 0b00000],
  '_':  [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111],
  '`':  [0b01000, 0b00100, 0b00010, 0b00000, 0b00000, 0b00000, 0b00000],
  '{':  [0b00110, 0b00100, 0b00100, 0b01000, 0b00100, 0b00100, 0b00110],
  '|':  [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  '}':  [0b01100, 0b00100, 0b00100, 0b00010, 0b00100, 0b00100, 0b01100],
  '~':  [0b00000, 0b00000, 0b01000, 0b10101, 0b00010, 0b00000, 0b00000],

  // -- Digits 0-9 -------------------------------------------------------------
  '0':  [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1':  [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2':  [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3':  [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  '4':  [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5':  [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6':  [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7':  [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8':  [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9':  [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],

  // -- Uppercase A-Z ----------------------------------------------------------
  'A':  [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b00000],
  'B':  [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  'C':  [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  'D':  [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  'E':  [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  'F':  [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  'G':  [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  'H':  [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'I':  [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'J':  [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  'K':  [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  'L':  [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  'M':  [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  'N':  [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  'O':  [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'P':  [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  'Q':  [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  'R':  [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  'S':  [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  'T':  [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  'U':  [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'V':  [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  'W':  [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  'X':  [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  'Y':  [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  'Z':  [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],

  // -- Lowercase a-z ----------------------------------------------------------
  'a':  [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  'b':  [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b11110],
  'c':  [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  'd':  [0b00001, 0b00001, 0b01101, 0b10011, 0b10001, 0b10001, 0b01111],
  'e':  [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  'f':  [0b00110, 0b01001, 0b01000, 0b11100, 0b01000, 0b01000, 0b01000],
  'g':  [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  'h':  [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  'i':  [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  'j':  [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  'k':  [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  'l':  [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'm':  [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10001, 0b10001],
  'n':  [0b00000, 0b00000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  'o':  [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  'p':  [0b00000, 0b00000, 0b11110, 0b10001, 0b11110, 0b10000, 0b10000],
  'q':  [0b00000, 0b00000, 0b01101, 0b10011, 0b01111, 0b00001, 0b00001],
  'r':  [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  's':  [0b00000, 0b00000, 0b01110, 0b10000, 0b01110, 0b00001, 0b11110],
  't':  [0b01000, 0b01000, 0b11100, 0b01000, 0b01000, 0b01001, 0b00110],
  'u':  [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  'v':  [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  'w':  [0b00000, 0b00000, 0b10001, 0b10001, 0b10101, 0b10101, 0b01010],
  'x':  [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  'y':  [0b00000, 0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  'z':  [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
};

// -- Helpers ------------------------------------------------------------------

function resolveConfig(cfg?: TextConfig) {
  const color: RGB     = cfg?.color       ?? DEFAULT_COLOR;
  const scale          = cfg?.scale       ?? 1;
  const spacing        = cfg?.spacing     ?? 1;
  const shadow         = cfg?.shadow      ?? false;
  const shadowColor: RGB = cfg?.shadowColor ?? DEFAULT_SHADOW_COLOR;
  return { color, scale, spacing, shadow, shadowColor };
}

/** Look up a glyph. Unknown chars fall back to '?'. */
function glyphFor(ch: string): number[] {
  return GLYPHS[ch] ?? GLYPHS['?']!;
}

/** Write a scale x scale block of a single color into an RGBA buffer. */
function fillBlock(
  data: Uint8ClampedArray,
  bufW: number,
  bx: number,
  by: number,
  scale: number,
  color: RGB,
): void {
  const [r, g, b] = color;
  for (let dy = 0; dy < scale; dy++) {
    const row = by + dy;
    for (let dx = 0; dx < scale; dx++) {
      const col = bx + dx;
      const idx = (row * bufW + col) * 4;
      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
}

/** Stamp a single glyph into the buffer at pixel position (ox, oy). */
function stampGlyph(
  data: Uint8ClampedArray,
  bufW: number,
  glyph: number[],
  ox: number,
  oy: number,
  scale: number,
  color: RGB,
): void {
  for (let row = 0; row < GLYPH_H; row++) {
    const bits = glyph[row];
    for (let col = 0; col < GLYPH_W; col++) {
      if (bits & (1 << (GLYPH_W - 1 - col))) {
        fillBlock(data, bufW, ox + col * scale, oy + row * scale, scale, color);
      }
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/** Measure text dimensions without rendering. */
export function measureText(
  text: string,
  config?: TextConfig,
): { width: number; height: number } {
  const { scale, spacing } = resolveConfig(config);
  const charW = GLYPH_W * scale + spacing;
  const len   = text.length;
  const width = len > 0 ? charW * len - spacing : 0;
  const height = GLYPH_H * scale;
  return { width, height };
}

/** Render a string into a SpriteBuffer. */
export function renderText(text: string, config?: TextConfig): SpriteBuffer {
  const { color, scale, spacing, shadow, shadowColor } = resolveConfig(config);

  // Compute buffer dimensions
  const charW  = GLYPH_W * scale + spacing;
  const len    = text.length;
  const textW  = len > 0 ? charW * len - spacing : 0;
  const textH  = GLYPH_H * scale;

  // Shadow adds 1 pixel offset on each axis
  const bufW = textW + (shadow ? 1 : 0);
  const bufH = textH + (shadow ? 1 : 0);

  if (bufW <= 0 || bufH <= 0) {
    return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
  }

  const data = new Uint8ClampedArray(bufW * bufH * 4); // initialised to 0 (transparent)

  // If shadow, render shadow pass first (offset +1,+1)
  if (shadow) {
    for (let i = 0; i < len; i++) {
      const glyph = glyphFor(text[i]);
      stampGlyph(data, bufW, glyph, i * charW + 1, 1, scale, shadowColor);
    }
  }

  // Main text pass
  for (let i = 0; i < len; i++) {
    const glyph = glyphFor(text[i]);
    stampGlyph(data, bufW, glyph, i * charW, 0, scale, color);
  }

  return { width: bufW, height: bufH, data };
}

/** Render a number (convenience for damage numbers etc). */
export function renderNumber(value: number, config?: TextConfig): SpriteBuffer {
  return renderText(String(value), config);
}
