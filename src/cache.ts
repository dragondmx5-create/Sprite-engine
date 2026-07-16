// =============================================================================
// cache.ts — sprite caching layer.
// Rendering is expensive (SDF → EDT → normals → Blinn-Phong per part), so we
// cache the result keyed on (seed + config hash). Same inputs = same output
// (determinism guarantee), so the cache is always correct.
// =============================================================================

import type { SpriteBuffer } from './types';
import type { AnimationResult } from './animation';

type CacheKey = string;

function hashConfig(obj: unknown): string {
  // Recursively sort object keys for a stable hash. NOTE: passing a key array
  // as JSON.stringify's replacer would WHITELIST those keys at every nesting
  // level — nested config like outfit.hat would be dropped from the hash and
  // different configs would collide in the cache.
  return JSON.stringify(obj, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const src = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(src).sort()) sorted[k] = src[k];
      return sorted;
    }
    return value;
  });
}

export class SpriteCache {
  private sprites = new Map<CacheKey, SpriteBuffer>();
  private animations = new Map<CacheKey, AnimationResult>();
  private maxSize: number;
  private accessOrder: CacheKey[] = [];

  constructor(maxSize = 512) {
    this.maxSize = maxSize;
  }

  private makeKey(prefix: string, config: unknown): CacheKey {
    return prefix + ':' + hashConfig(config);
  }

  private touch(key: CacheKey): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(key);
  }

  private evictIfNeeded(): void {
    while (this.sprites.size + this.animations.size > this.maxSize && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift()!;
      this.sprites.delete(oldest);
      this.animations.delete(oldest);
    }
  }

  getSprite(prefix: string, config: unknown): SpriteBuffer | undefined {
    const key = this.makeKey(prefix, config);
    const cached = this.sprites.get(key);
    if (cached) this.touch(key);
    return cached;
  }

  setSprite(prefix: string, config: unknown, sprite: SpriteBuffer): void {
    const key = this.makeKey(prefix, config);
    this.evictIfNeeded();
    this.sprites.set(key, sprite);
    this.touch(key);
  }

  getAnimation(prefix: string, config: unknown, animName: string): AnimationResult | undefined {
    const key = this.makeKey(prefix + '/' + animName, config);
    const cached = this.animations.get(key);
    if (cached) this.touch(key);
    return cached;
  }

  setAnimation(prefix: string, config: unknown, animName: string, result: AnimationResult): void {
    const key = this.makeKey(prefix + '/' + animName, config);
    this.evictIfNeeded();
    this.animations.set(key, result);
    this.touch(key);
  }

  clear(): void {
    this.sprites.clear();
    this.animations.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.sprites.size + this.animations.size;
  }
}

export const globalCache = new SpriteCache();

// Cached wrappers for the generate* functions — imported and re-exported by index.ts
import { generateSprite, generateEnemy, generateItem, generateTile } from './engine';
import { generateAnimation, generateEnemyAnimation, generateItemAnimation, generateEffectAnimation } from './animation';
import type { SpriteConfig } from './types';
import type { CreatureConfig } from './creatures';
import type { ItemConfig } from './items';
import type { TileConfig } from './tiles';
import type { EffectConfig } from './effects';

export function cachedSprite(config: SpriteConfig = {}): SpriteBuffer {
  const cached = globalCache.getSprite('sprite', config);
  if (cached) return cached;
  const result = generateSprite(config);
  globalCache.setSprite('sprite', config, result);
  return result;
}

export function cachedEnemy(config: SpriteConfig & CreatureConfig = {}): SpriteBuffer {
  const cached = globalCache.getSprite('enemy', config);
  if (cached) return cached;
  const result = generateEnemy(config);
  globalCache.setSprite('enemy', config, result);
  return result;
}

export function cachedItem(config: SpriteConfig & ItemConfig = {}): SpriteBuffer {
  const cached = globalCache.getSprite('item', config);
  if (cached) return cached;
  const result = generateItem(config);
  globalCache.setSprite('item', config, result);
  return result;
}

export function cachedTile(config: SpriteConfig & TileConfig = {}): SpriteBuffer {
  const cached = globalCache.getSprite('tile', config);
  if (cached) return cached;
  const result = generateTile(config);
  globalCache.setSprite('tile', config, result);
  return result;
}

export function cachedAnimation(config: SpriteConfig, animName: string): AnimationResult {
  const cached = globalCache.getAnimation('anim', config, animName);
  if (cached) return cached;
  const result = generateAnimation(config, animName);
  globalCache.setAnimation('anim', config, animName, result);
  return result;
}

export function cachedEnemyAnimation(config: SpriteConfig & CreatureConfig, animName: string): AnimationResult {
  const cached = globalCache.getAnimation('enemyAnim', config, animName);
  if (cached) return cached;
  const result = generateEnemyAnimation(config, animName);
  globalCache.setAnimation('enemyAnim', config, animName, result);
  return result;
}

export function cachedItemAnimation(config: SpriteConfig & ItemConfig, animName: string): AnimationResult {
  const cached = globalCache.getAnimation('itemAnim', config, animName);
  if (cached) return cached;
  const result = generateItemAnimation(config, animName);
  globalCache.setAnimation('itemAnim', config, animName, result);
  return result;
}

export function cachedEffectAnimation(config: EffectConfig & { size?: number; supersample?: number }, animName?: string): AnimationResult {
  const cached = globalCache.getAnimation('effectAnim', config, animName ?? config.kind ?? 'slash');
  if (cached) return cached;
  const result = generateEffectAnimation(config, animName);
  globalCache.setAnimation('effectAnim', config, animName ?? config.kind ?? 'slash', result);
  return result;
}
