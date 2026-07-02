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

## Phase 2 — Prop library ✅ done

15 new props on the existing SDF pipeline: lantern, barrel, crate, cloth
banner, stone statue, shelf, cauldron, chest, well, bench, planter, firewood
stack, wooden signpost, bucket, gravestone. Two new materials: matte metal,
cloth. Test output: all props in one sprite sheet with shadows.

- [x] 14 new `TileKind`s in `tiles.ts` (`barrel` already existed — 15 total
      as requested), all `bare`-compatible so they composite over any floor.
      `chest`/`gravestone` are static dressing props, distinct from
      items.ts's animated `chest` and loot.ts's plaque `gravestone`.
- [x] `matteMetal` material added to `materials.ts` (dull ironwork —
      cauldron, bucket, lantern cage, chest bands). `cloth` was already a
      preset from Phase 0, reused as-is for the banner/planter blossoms.
- [x] `examples/props-demo.ts` — sprite-sheet test render with drop shadows,
      `preview/props-sheet.png`.
- [x] `npm run typecheck` and `npm run test` pass (123 checks — the new
      kinds are picked up automatically by `TILE_KINDS`).
- [x] Fixed a latent bug found while building the sheet: `blitOver`
      (`src/scene.ts`) corrupted output when given non-integer pixel
      offsets (fractional `y` from the sheet's row-centering math silently
      zeroed every composited pixel). Now rounds to the nearest whole pixel
      before compositing. Existing call sites all happened to pass integers
      so this was invisible until now; `village-demo.ts` re-rendered
      byte-for-byte identical after the fix.

## Phase 3 — Lighting ✅ done

Extend `darkness.ts`: lanterns become warm-colored light sources (small
radius, orange tint) that also cast a soft daytime tint onto nearby grass.
Test output: dusk village scene with 3 lit lanterns.

- [x] `lanternLight(x, y, opts)` added to `darkness.ts` — warm, small-radius
      `LightSource` factory (default orange `[255,176,86]`, radius 46,
      optional deterministic `torchFlicker`-driven wobble via `phase`/`seed`).
      One call feeds both the night darkness overlay and a standalone glow.
- [x] `generateLightGlow` gained an optional `strength` param (default 0.3,
      unchanged/back-compat) so the same glow function that punches torch
      holes at night can also lay a gentle ~0.2-strength warm tint on a
      daytime/dusk scene with no darkness overlay at all.
- [x] Phase 2's `lantern` prop wired as an actual light source: its screen
      position feeds `lanternLight`, and the resulting `LightSource` drives
      both `generateLightGlow` (bloom) and `generateDarknessOverlay` (dusk
      gloom) composited on top of the rendered scene.
- [x] `npm run typecheck` and `npm run test` pass; `village-demo.ts` and
      `props-demo.ts` re-render unchanged (no regressions from the
      `darkness.ts`/`index.ts` additions).
- [x] Test render: `examples/dusk-demo.ts` → `preview/dusk-village.png` —
      small village at dusk, 3 lit lanterns (by the door, at a path bend,
      by a bench) each visibly pushing back the gloom with a warm halo.

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
