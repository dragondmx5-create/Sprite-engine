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
  noise.ts      — deterministic smooth value noise (valueNoise2D) + fractal sum (fbm2D), source for the 'bump' texture layer
  lighting.ts   — Blinn-Phong shading with painterly diffuse ramp
  materials.ts  — 13 preset materials: skin, cloth, leather, metal, hair, chitin, flesh, gem, bone, ember, gold, glass, matteMetal
  engine.ts     — resolveRenderOpts + renderParts + generateSprite/Enemy/Item/Tile
  skeleton.ts   — character body builder (head, torso, arms, legs, hair, outfit, weapons, shield)
  creatures.ts  — enemy builders: 11 kinds (insect, worm, crawler, fire_elemental, shadow, burrower, bat, slime, undead, golem, ghost)
  items.ts      — loot builders: 16 kinds (+ fish)
  tiles.ts      — dungeon tile builders: 62 kinds (+ shop_counter, iron_gate, torch_bracket, altar, anvil, bed, table, bookshelf, pillar, fountain, lantern, crate, banner, statue, shelf, cauldron, chest, well, bench, planter, firewood, signpost, bucket, gravestone, pebbles, root, interior_wall, rug, grass_dirt_mix)
  autotile.ts   — grid-level terrain edge blending: 4-bit N/E/S/W bitmask + 8-flag edge/corner computation from a neighbor predicate
  effects.ts    — VFX: slash, impact, projectiles, sparkle, shadow, flash, tint, status effects, water_ripple, smoke, drip + phase-driven builders
  ui.ts         — HUD generators: health/mana/XP bars, inventory slot, dialog box, damage number, button
  font.ts       — 5x7 bitmap pixel font: renderText, renderNumber, measureText (ASCII 32-126, no external files)
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
- Texture layers: `'grain'`/`'speckle'` only dither color post-shading — a surface stays perfectly flat-lit no matter how much is piled on. Add a `'bump'` layer (noise.ts's fbm2D perturbs the shading normal pre-shade) whenever a surface should read as having real relief instead of a flat plane with dots painted on — grass/dirt/stone floors, water, and any flowing cloth (cape, banner, rug, robe) all carry one. `amount` ~0.15-0.4; low `scale` (1.5-3) reads as soft creases/wrinkles, higher `scale` (6+) as fine roughness.

## API quick reference

```ts
// Character
generateSprite({ seed, size, supersample, weapon, shield, facing, outfit, hairStyle, palette })
//   outfit: { torso:'cloth'|'leather'|'robe'|'chainmail'|'vest', armor, belt,
//             hat:'none'|'cap'|'hat'|'hood'|'wizard'|'crown'|'helmet'|'bandana',
//             cape, coat, boots, gloves, scarf, shoulderpad }
//   weapon: 'none'|'dagger'|'sword'|'axe'|'staff'|'bow'|'mace'|'wand'|'hammer'|'fishing_rod'
//   hairStyle: 'short'|'long'|'spiky'|'bun'|'bald'|'flowing'|'ponytail'
//   palette: { skin, hair, cloth, leather, metal, hat, cape, pants, accent }
//   facing: 'front'|'back'|'left'|'right'|'front-left'|'front-right'|'back-left'|'back-right'
//     8-way compass. A per-facing torso-lean bias (skeleton.ts's FACING_INFO)
//     feeds the same pelvisRot channel torso-lean animation uses, so helmet/
//     cape/shield/weapon — anything riding xUpper/xHead/xArm — turns with
//     the body automatically; no separate rotation per equipment piece.
generateAnimation(config, 'walk'|'idle'|'attack'|'hit'|'death'|'cast'|'dodge')

// Enemies (11 kinds — UNDRAL layer creatures + ambush types + undead)
generateEnemy({ seed, size, kind: 'insect'|'worm'|'crawler'|'fire_elemental'|'shadow'|'burrower'|'bat'|'slime'|'undead'|'golem'|'ghost', alerted })
generateEnemyAnimation(config, 'move'|'idle'|'death'|'hit'|'emerge')

// Items (16 kinds — all phase-animated: sway, spin, glow, flicker, etc.)
generateItem({ seed, size, kind: 'mushroom'|'crystal'|'dagger'|'torch'|'potion'|'coin'|'rune'|'chest'|'key'|'scroll'|'meat'|'lantern'|'ore'|'firestone'|'bone_shard'|'fish' })
generateItemAnimation(config, 'idle'|'active'|'pickup')

// Tiles (62 kinds — dungeon floors, walls, doors, traps, props, interiors, overworld)
generateTile({ seed, size, kind: 'stone_floor'|'dirt_floor'|'grass_floor'|'wood_floor'|'wood_wall'|'stone_wall'|'crystal_floor'|'wood_door'
  |'lava_floor'|'ice_floor'|'moss_floor'|'spike_trap'|'stairs_down'|'stairs_up'|'cracked_wall'|'pit'
  |'water_pool'|'underground_river'|'stalagmite'|'cobweb'|'barrel'|'chain'|'bone_pile'
  |'shop_counter'|'iron_gate'|'torch_bracket'|'altar'|'anvil'|'bed'|'table'|'bookshelf'|'pillar'|'fountain'
  |'tree'|'pine_tree'|'dead_tree'|'house'|'ruins'|'fence'|'water'|'bush'|'flowers'|'rock'
  |'lantern'|'crate'|'banner'|'statue'|'shelf'|'cauldron'|'chest'|'well'|'bench'|'planter'|'firewood'|'signpost'|'bucket'|'gravestone'
  |'interior_wall'|'rug'|'pebbles'|'root'|'grass_dirt_mix' })
// grass_dirt_mix is ONE tile that's genuinely half grass, half dirt (an
// fbm-wobbled internal boundary with each side's own detail pass) — distinct
// from edgeFringe's blob blending, which softens the border between two
// separate whole tiles. Use it for the rim of dirt cells that touch grass
// instead of a hard dirt_floor there, so a path/clearing edge dissolves
// gradually instead of stepping straight from full dirt to full grass.
// dirt_floor/water take edges: {n,e,s,w,ne,nw,se,sw} — flag sides/corners that
// touch grass to draw an organic grass fringe (soft path/shore transitions).
// stone_floor takes the same edges shape blending against dirt instead.
// Compute edges per grid cell with autotile.ts instead of hand-rolled lookups:
//   autotileEdges(row, col, gridMatcher(kindsGrid, cols, rows, k => k === 'grass_floor'))
// grass_floor picks one of 6 deterministic decor variants (bare/tuft/flowers/
// pebbles/leaves/clover) from its own seed, plus randomized patch/blade counts
// and an occasional (~18%) oversized dry/lush feature patch so tiles differ in
// density and silhouette, not just dot position — seed grass tiles by grid
// coordinate (e.g. `grass-${row}-${col}`) for stable, non-repeating variety
// across a lawn.
// Props (bed/table/bookshelf/barrel/shop_counter/...) take bare: true to skip
// their built-in stone slab when composited over an interior floor.
// Cambria-style buildings: compose wood_wall perimeter + wood_floor interior
// + bare furniture props in the scene tile grid (leave a wall gap as a door).
// tiles.ts's chest/gravestone are static dressing props — distinct from
// items.ts's animated openable `chest` ItemKind and loot.ts's named-plaque
// `gravestone` LootMarkerKind (same word, different module, different job).
// banner/shelf are wall-mounted (paint their own wall backdrop, like
// bookshelf/torch_bracket); lantern/well/statue/signpost are freestanding
// and take a `height` for their post/roof/pedestal, like tree/pillar.
// interior_wall is a flat plaster wall (no brick/plank pattern) with a soft
// ambient-occlusion gradient at its base — distinct from stone_wall/wood_wall.
// rug has no floor slab of its own (composites over wood_floor/stone_floor,
// same convention as bush/flowers/fence). Give every grid cell — including
// walls — the SAME height as a normal tile; renderScene's tile loop blits
// each at a fixed col*TS,row*TS with no per-cell height allowance, so an
// oversized wall sprite bleeds into the row below it.
// pebbles/root are loose ground-scatter decor (no slab, like bush/flowers) —
// scatter them across dirt/stone/grass tiles at low per-cell chance with a
// small random offset and size jitter for non-repeating texture density,
// same technique grass_floor's own decor variants use, just tile-external.

// Autotiling (grid-level terrain blending, consumed by tiles.ts's edges)
autotileMask(row, col, matches)   // classic 4-bit N/E/S/W bitmask, 0-15
autotileEdges(row, col, matches)  // full {n,e,s,w,ne,nw,se,sw} edge/corner flags
gridMatcher(grid, cols, rows, isMatch, outside?)  // bind a predicate to a flat row-major grid

// Loot / death markers (UNDRAL permadeath drops)
generateLootMarker({ kind: 'loot_bag'|'skull'|'gravestone'|'blood_stain', seed, size, color })

// Effects (static one-shot + animated)
generateSlashEffect({ size, color }), generateImpactEffect(), generateProjectile({ kind }), generateSparkle()
generateShadow(size, opacity), flashSprite(buf), tintSprite(buf, color, amount), applyStatusEffect(buf, effect, phase)
generateEffectAnimation({ kind: 'slash'|'impact'|'sparkle'|'fireball'|'magic_bolt'|'water_ripple'|'smoke'|'drip', size, color })

// UI / HUD elements
generateHealthBar({ width, height, fill, color, bgColor, borderColor })
generateManaBar({ width, height, fill, color, bgColor, borderColor })
generateXPBar({ width, height, fill, color, bgColor, borderColor })
generateInventorySlot({ size, empty, highlight, bgColor, borderColor })
generateDialogBox({ width, height, bgColor, borderColor })
generateDamageNumber({ size, color, crit })
generateButton({ width, height, color, pressed })

// Pixel font / text rendering (5x7 bitmap, ASCII 32-126, no external files)
renderText('Hello World', { color, scale, spacing, shadow, shadowColor })
renderNumber(42, { color, scale })
measureText('text', config)  // => { width, height }

// Minimap (8 icon types)
generateMinimapIcon({ icon: 'player'|'enemy'|'item'|'door'|'stairs'|'loot'|'trap'|'boss', size })

// Scene composition + z-sorting
renderScene(width, height, { tiles?, entities?, shadows?, effects?, darkness? }, cameraX, cameraY)
blitOver(dst, src, offsetX, offsetY)   // alpha composite
createBuffer(width, height)            // empty transparent SpriteBuffer
isVisible(entity, cameraX, cameraY, viewW, viewH)  // viewport culling

// Darkness / fog-of-war (UNDRAL "darkness = death" mechanic)
generateDarknessOverlay(width, height, lights, ambientLight)  // black overlay with light holes
generateLightGlow(width, height, lights, strength?)           // colored light tint layer (strength default 0.3; go lower, ~0.12-0.18, for a daytime/dusk tint with no darkness overlay)
isInDarkness(x, y, lights, ambientLight, threshold)           // point-in-darkness check
torchFlicker(phase, seed)                                     // deterministic radius wobble
lanternLight(x, y, { radius?, intensity?, color?, phase?, seed? })  // warm small-radius LightSource for a lit lantern prop; feeds both the overlay and the glow from one call

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
