# UNDRAL Sprite Engine

Procedural, deterministic chibi sprite engine for the UNDRAL dark underground MMO.
All output is DOM-free `SpriteBuffer` (Uint8ClampedArray RGBA). Browser helpers optional.

## Architecture

```
SpriteConfig/CreatureConfig/ItemConfig/TileConfig
        |
        v
  Builder (skeleton.ts / creatures.ts / items.ts / tiles.ts)
        |  produces ordered Part[] (back-to-front paint order)
        v
  renderParts() — engine.ts   (the SINGLE shading path)
        |  per part: rasterize SDF -> distance field (EDT) -> fake normals -> Blinn-Phong
        v
  SpriteBuffer { width, height, data: Uint8ClampedArray }
```

One pipeline for everything: characters, enemies, items, tiles, effects.

## Key invariants

- **Determinism**: FNV-1a seed -> mulberry32 PRNG. Same seed+config = byte-identical output, always.
- **Temporal stability**: RNG seeded from config.seed only, never frame index. Animations don't boil.
- **No DOM in core**: all rendering is pure typed-array math. `toCanvas()`/`toImageData()` are optional adapters.
- **Paint order**: Part[] is back-to-front. Later parts fully overwrite earlier ones (all opaque).

## Source layout

```
src/
  types.ts      — SpriteConfig, SpriteBuffer, Material, RGB, Vec3, Light
  rng.ts        — deterministic PRNG (FNV-1a + mulberry32)
  shapes.ts     — SDF primitives: circle, ellipse, capsule, roundedBox, union, transforms + GPU SDF descriptors
  field.ts      — Felzenszwalb-Huttenlocher EDT -> inward distance -> fake normals
  color.ts      — tone ramp (5-stop warm/cool), quantize, smoothstep
  lighting.ts   — Blinn-Phong shading with painterly diffuse ramp
  materials.ts  — 12 preset materials: skin, cloth, leather, metal, hair, chitin, flesh, gem, bone, ember, gold, glass
  engine.ts     — resolveRenderOpts + renderParts + generateSprite/Enemy/Item/Tile
  skeleton.ts   — character body builder (head, torso, arms, legs, hair, outfit, weapons, shield)
  creatures.ts  — enemy builders: 8 kinds (insect, worm, crawler, fire_elemental, shadow, burrower, bat, slime)
  items.ts      — loot builders: 15 kinds (mushroom, crystal, dagger, torch, potion, coin, rune, chest, key, scroll, meat, lantern, ore, firestone, bone_shard)
  tiles.ts      — dungeon tile builders: 13 kinds (+ spike_trap, stairs_down, stairs_up, cracked_wall, pit)
  effects.ts    — VFX: slash, impact, projectiles, sparkle, shadow, flash, tint, status effects + phase-driven builders
  loot.ts       — death markers: loot_bag, skull, gravestone, blood_stain
  minimap.ts    — tiny colored icons (4-8px): player, enemy, item, door, stairs, loot, trap, boss
  darkness.ts   — fog-of-war / lighting system: darkness overlay, light glow, torch flicker, darkness check
  scene.ts      — scene composition: alpha blitting, z-sorted entity rendering, tile grid, camera viewport
  gpu.ts        — WebGPU compute-shader renderer: JFA EDT, normals, Blinn-Phong, downsample (auto-fallback to CPU)
  cache.ts      — LRU sprite cache: cached wrappers for all generate* functions
  pose.ts       — keyframe animation clips (idle, walk, attack, hit, death) + pose interpolation
  animation.ts  — frame generation, enemy/item/effect procedural animation (+ enemy death/hit/emerge), spritesheet packing
  anim/ik.ts    — solveTwoBone (analytic) + FABRIK (iterative N-link)
  anim/spring.ts — secondary motion: damp, lag, squash, wave, pulse, smooth
  index.ts      — public API surface + DOM helpers (toCanvas, toImageData, etc.)

test/
  content.ts    — 102 checks: determinism, back-compat, item/effect animations, perf, PNG previews
  driver.ts     — basic determinism + perf + character previews
  anim.ts       — animation determinism, stability, spritesheet output
```

## Build & test

```bash
npm run typecheck    # tsc --noEmit
npm run test         # esbuild + node (runs test/content.ts, 64 checks)
npm run bundle       # ESM bundle -> dist/sprite-engine.js
npx tsx test/content.ts   # direct run with tsx
npx tsx test/anim.ts      # animation tests + preview spritesheets
```

IIFE bundle for demo:
```bash
npx esbuild src/index.ts --bundle --format=iife --global-name=SpriteEngine --outfile=sprite-engine.iife.js
```

## Style guidelines

- Shapes use analytic SDFs. Minimum radius clamp (`Math.max(1.2, s * factor)`) for sub-pixel shapes.
- Weapon/shield follow arm rotation via `xArm(pose.armR/armL, jointX, shoulderY)`.
- Cape z-order flips for `facing='back'` (drawn after body, not before).
- Materials: low `shadowCoolShift` (0.2-0.45) to avoid watercolor look. Higher for metals/gems only.
- Default palette saturation: cloth 0.62-0.92, hair 0.55-0.90. Vivid, not washed.
- Head uses high corner radius (0.72 * headHw) for round pixel-art look, not boxy.
- All content builders (creatures, items, tiles) need a `default` case in `defaultColor()`.
- Item/enemy/effect builders take `(phase: 0..1, amp: 0..1)` for animation. Pure function of phase — no state.
- Item animations: mushroom sways, crystal pulses, dagger glint slides, torch flame flickers, potion glows, coin spins, rune strokes pulse in sequence, chest lid opens, key pendulums, scroll seal pulses.
- Effect animations: slash arc sweeps in, impact rays expand, sparkle rotates+pulses, fireball breathes+corona, magic bolt crackles.

## API quick reference

```ts
// Character
generateSprite({ seed, size, supersample, weapon, shield, facing, outfit, hairStyle, palette })
//   outfit: { torso:'cloth'|'leather'|'robe'|'chainmail'|'vest', armor, belt,
//             hat:'none'|'cap'|'hat'|'hood'|'wizard'|'crown'|'helmet'|'bandana',
//             cape, coat, boots, gloves, scarf, shoulderpad }
//   weapon: 'none'|'dagger'|'sword'|'axe'|'staff'|'bow'|'mace'|'wand'|'hammer'
//   hairStyle: 'short'|'long'|'spiky'|'bun'|'bald'|'flowing'|'ponytail'
//   palette: { skin, hair, cloth, leather, metal, hat, cape, pants, accent }
generateAnimation(config, 'walk'|'idle'|'attack'|'hit'|'death')

// Enemies (8 kinds — UNDRAL layer creatures + ambush types)
generateEnemy({ seed, size, kind: 'insect'|'worm'|'crawler'|'fire_elemental'|'shadow'|'burrower'|'bat'|'slime', alerted })
generateEnemyAnimation(config, 'move'|'idle'|'death'|'hit'|'emerge')

// Items (15 kinds — all phase-animated: sway, spin, glow, flicker, etc.)
generateItem({ seed, size, kind: 'mushroom'|'crystal'|'dagger'|'torch'|'potion'|'coin'|'rune'|'chest'|'key'|'scroll'|'meat'|'lantern'|'ore'|'firestone'|'bone_shard' })
generateItemAnimation(config, 'idle'|'active'|'pickup')

// Tiles (13 kinds — dungeon floors, walls, doors, traps, navigation)
generateTile({ seed, size, kind: 'stone_floor'|'dirt_floor'|'stone_wall'|'crystal_floor'|'wood_door'|'lava_floor'|'ice_floor'|'moss_floor'|'spike_trap'|'stairs_down'|'stairs_up'|'cracked_wall'|'pit' })

// Loot / death markers (UNDRAL permadeath drops)
generateLootMarker({ kind: 'loot_bag'|'skull'|'gravestone'|'blood_stain', seed, size, color })

// Effects (static one-shot + animated)
generateSlashEffect({ size, color }), generateImpactEffect(), generateProjectile({ kind }), generateSparkle()
generateShadow(size, opacity), flashSprite(buf), tintSprite(buf, color, amount), applyStatusEffect(buf, effect, phase)
generateEffectAnimation({ kind: 'slash'|'impact'|'sparkle'|'fireball'|'magic_bolt', size, color })

// Minimap (8 icon types)
generateMinimapIcon({ icon: 'player'|'enemy'|'item'|'door'|'stairs'|'loot'|'trap'|'boss', size })

// Scene composition + z-sorting
renderScene(width, height, { tiles?, entities?, shadows?, effects?, darkness? }, cameraX, cameraY)
blitOver(dst, src, offsetX, offsetY)   // alpha composite
createBuffer(width, height)            // empty transparent SpriteBuffer
isVisible(entity, cameraX, cameraY, viewW, viewH)  // viewport culling

// Darkness / fog-of-war (UNDRAL "darkness = death" mechanic)
generateDarknessOverlay(width, height, lights, ambientLight)  // black overlay with light holes
generateLightGlow(width, height, lights)                      // colored light tint layer
isInDarkness(x, y, lights, ambientLight, threshold)           // point-in-darkness check
torchFlicker(phase, seed)                                     // deterministic radius wobble

// Sprite caching (LRU, default 512 entries)
cachedSprite(config), cachedEnemy(config), cachedItem(config), cachedTile(config)
cachedAnimation(config, name), cachedEnemyAnimation(config, name)
cachedItemAnimation(config, name), cachedEffectAnimation(config, name)
globalCache.clear(), globalCache.size

// GPU accelerated rendering (WebGPU, auto-fallback to CPU)
const gpu = new GPURenderer(); await gpu.init();  // returns false if WebGPU unavailable
await gpu.renderParts(parts, opts)                 // single sprite on GPU
await gpu.renderBatch(partSets, opts)              // N sprites in parallel
await renderPartsGPU(parts, opts)                  // convenience (auto-init singleton)
await renderBatchGPU(partSets, opts)               // convenience batch
gpu.dispose()                                      // release GPU resources

// Helpers
toCanvas(buf), toImageData(buf), packSpriteSheet(frames), generateSpriteSheetCanvas(config, animName)
```
