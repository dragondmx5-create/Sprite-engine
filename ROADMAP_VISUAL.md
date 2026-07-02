# Visual Roadmap

Five phases toward a fuller UNDRAL overworld/interior visual set. Reference
style is the current `examples/village-demo.ts` render (`preview/village.png`)
— same palette, same tile/character proportions, every phase below must keep
matching it. Each phase ends with a rendered test PNG and its checkbox here
gets ticked before moving to the next one. Stop after Phase 1 for review.

## Phase 1 — Autotiling ✅ done

16-tile bitmask system for terrain transitions (grass↔dirt, grass↔water,
dirt↔stone) plus deterministic per-tile grass variation.

- [x] `src/autotile.ts` — `autotileMask` (4-bit N/E/S/W bitmask, 0-15),
      `autotileEdges` (8-flag edge/corner set consumed by `TileConfig.edges`),
      `gridMatcher` (binds a predicate to a flat row-major grid). Replaces the
      ad-hoc neighbor lookups every scene script used to hand-roll.
- [x] `stone_floor` now takes `edges` and blends a dirt-colored crumble fringe
      where it borders `dirt_floor` (third transition pair, was missing).
      `grassFringe` generalized to `edgeFringe(..., terrain)` so any pair of
      floors can blend without hardcoding grass green.
- [x] `grass_floor` picks one of 5 deterministic decor variants per tile —
      `bare`, `tuft`, `flowers`, `pebbles`, `leaves` — from its own RNG
      stream. Seeding a grass tile by grid coordinate (`t${row}_${col}`, as
      `examples/village-demo.ts` and `worldmap.ts` already do) makes the
      variant a stable hash of that coordinate: same map, same look, every
      render.
- [x] `examples/village-demo.ts` rewritten to use `autotileEdges`/`gridMatcher`
      instead of inline `isG` lookups, and extended with a small stone plaza
      + dirt spur to exercise the dirt↔stone transition alongside the
      existing road (grass↔dirt) and river (grass↔water).
- [x] `npm run typecheck` and `npm run test` pass (109 checks).
- [x] Test render: `npx tsx examples/village-demo.ts` → `preview/village.png`
      — dirt road with soft grass edges cuts through the lawn, stone plaza
      with a dirt fringe bottom-right, visibly varied grass texture across
      the whole field.

## Phase 2 — Prop library

15 new props on the existing SDF pipeline: lantern, barrel, crate, cloth
banner, stone statue, shelf, cauldron, chest, well, bench, planter, firewood
stack, wooden signpost, bucket, gravestone. Two new materials: matte metal,
cloth. Test output: all props in one sprite sheet with shadows.

- [ ] Props implemented in `tiles.ts` (or a new `props.ts`) with `bare`
      support so they composite over any floor.
- [ ] Two new material presets added to `materials.ts`.
- [ ] Sprite-sheet test render.

## Phase 3 — Lighting

Extend `darkness.ts`: lanterns become warm-colored light sources (small
radius, orange tint) that also cast a soft daytime tint onto nearby grass.
Test output: dusk village scene with 3 lit lanterns.

- [ ] `darkness.ts` light-source model extended for daytime tint blending.
- [ ] Lantern prop (Phase 2) wired as a light source.
- [ ] Test render: dusk scene, 3 lanterns lit.

## Phase 4 — Interior tiles

Stone + wood interior floors (already partly present), interior wall with
cast shadow, and a rug/carpet tile. Test output: inside a house.

- [ ] Interior wall variant with contact shadow.
- [ ] Rug/carpet tile.
- [ ] Test render: house interior.

## Phase 5 — Equipment layers

Extend the character `Part[]` system so helmet, cape, shield render as
separate layers over the body and rotate correctly across all 8 facing
directions. Test output: one character with/without helmet in 8 directions.

- [ ] Equipment layer system in `skeleton.ts`.
- [ ] Test render: 8-direction with/without helmet comparison sheet.
