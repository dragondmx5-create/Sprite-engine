// =============================================================================
// example.ts — how you'd use the engine inside an existing Canvas 2D game.
// This is NOT a standalone page; it's the integration pattern.
// =============================================================================

import { generateSprite, toCanvas, type SpriteConfig } from './src/index';

// --- 1) Build a sprite once (e.g. at load) and cache the canvas. -----------
// generateSprite is the only call you need. It returns a DOM-free RGBA buffer.
const heroConfig: SpriteConfig = {
  seed: 'hero-01',          // deterministic: same seed+config => same pixels
  size: 64,                 // logical output size (square)
  supersample: 2,           // internal AA; 2 is a good default
  light: { x: -0.5, y: -0.78, z: 0.62 }, // toward upper-left-front
  ambient: 0.18,
  roundness: 0.85,
  outfit: { torso: 'cloth', armor: true, belt: true },
  // quantize: 6,           // uncomment for a crunchy, posterized look
  // outline: false,        // disable the 1px exterior outline
};

const heroCanvas = toCanvas(generateSprite(heroConfig)); // ready to drawImage()

// --- 2) Draw it every frame. drawImage from a cached canvas is essentially free.
export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 4): void {
  ctx.imageSmoothingEnabled = false; // keep pixels crisp when scaling up
  ctx.drawImage(
    heroCanvas as CanvasImageSource,
    x, y,
    heroCanvas.width * scale,
    heroCanvas.height * scale,
  );
}

// --- 3) Generate a whole roster deterministically from seeds. --------------
export function buildRoster(seeds: string[]): (HTMLCanvasElement | OffscreenCanvas)[] {
  return seeds.map((seed) => toCanvas(generateSprite({ ...heroConfig, seed })));
}

// --- 4) Node / headless: skip the canvas, use the raw buffer. --------------
// const { data, width, height } = generateSprite(heroConfig);
// `data` is a Uint8ClampedArray (RGBA) you can hash, snapshot-test, or encode.
