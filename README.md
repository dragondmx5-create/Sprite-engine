# Procedural Chibi Sprite Engine

A deterministic, DOM-free TypeScript engine that generates chibi character
sprites and lights them like 3D objects projected into 2D. One call,
`generateSprite(config)`, returns an RGBA buffer you can draw straight to a
Canvas 2D context. No flat fills — every pixel is shaded from a fake surface
normal derived from the shape itself.

## Install / build

```
npm install
npx tsc            # emit dist/  (declarations included)
# or bundle for the browser:
npx esbuild src/index.ts --bundle --format=esm --outfile=sprite-engine.js
```

## API

```ts
import { generateSprite, toCanvas, toImageData } from './src/index';

const sprite = generateSprite({ seed: 'hero', size: 64 });
// sprite: { width, height, data: Uint8ClampedArray /* RGBA */ }

ctx.drawImage(toCanvas(sprite), x, y);   // browser / OffscreenCanvas
ctx.putImageData(toImageData(sprite), x, y);
// In Node: just use sprite.data (no DOM needed).
```

### `SpriteConfig`

| field | default | meaning |
|---|---|---|
| `seed` | `0` | string or number; same seed+config ⇒ identical pixels |
| `size` | `64` | logical output px (square) |
| `supersample` | `2` | internal AA factor |
| `light` | upper-left-front | `{x,y,z}` direction **toward** the light (`+y` is down) |
| `ambient` | `0.18` | shadow floor, 0..1 |
| `roundness` | `0.85` | 0 = flat-topped, 1 = fully spherical volume |
| `outline` | `{}` | 1px exterior outline; `false` to disable; `{color}` to tint |
| `quantize` | `false` | posterize level count (e.g. `6`) for crunchy-pixel look |
| `body` | — | `headScale`, `bodyWidth`, `limbLength`, `pose.{armSwing,stance}` |
| `palette` | seed-chosen | `{skin,hair,cloth,leather,metal}` as `[r,g,b]` |
| `outfit` | — | `torso:'cloth'\|'leather'`, `armor:boolean`, `belt:boolean` |
| `face` | `true` | draw eyes |

## Architecture (strict layers)

```
skeleton.ts   config + seed   → ordered list of body parts (z = paint order)
shapes.ts     SDF primitives  → crisp silhouette masks
field.ts      mask            → inward distance field → fake surface normals   ← the trick
lighting.ts   normal+material → diffuse tone ramp + Blinn-Phong specular
engine.ts     per part: rasterize→field→light→composite, then downsample→outline→quantize
materials.ts  skin/cloth/leather/metal/hair response presets
color.ts      tone ramps, blends, posterize
rng.ts        deterministic PRNG (FNV-1a seed + mulberry32)
index.ts      public API + canvas/ImageData adapters
```

Everything except the `toCanvas`/`toImageData` adapters is pure logic on typed
arrays, so the engine is fully unit-testable in Node.

## The lighting trick (the important part)

We never author normals by hand. For each body part:

1. **Inward distance field.** For every interior pixel, compute the exact
   Euclidean distance to the nearest silhouette edge (Felzenszwalb–Huttenlocher
   transform, O(n)). Edge pixels ≈ 0, the core is large.
2. **Gradient → fake normal.** The gradient of that field points inward toward
   the part's spine. We reinterpret distance as *how far the surface has rolled
   to face the viewer*: at the edge the surface is edge-on (normal points
   sideways, out of the silhouette); deep inside it faces us (normal = `+z`). A
   quarter-circle (sphere) sweep between those gives a smooth normal at every
   pixel.
3. **Shade.** Dot the normal with the light direction for diffuse, run a
   painterly highlight→midtone→shadow→core-shadow ramp, and add Blinn-Phong
   specular whose tightness comes from the material's roughness (metals tint the
   highlight by their base color).

Result: a strap, pauldron, or limb automatically catches light on the lit edge
and falls into shadow on the far edge — real volume, from one system, with no
per-asset art.

## Performance

~5–8 ms for an 80px sprite (supersample 2) in Node. Sprites are meant to be
generated once and cached; `drawImage` from the cached canvas each frame is
free. Distance fields run per-part over each part's bounding box, not the whole
canvas.

## Determinism

Seeded via FNV-1a → mulberry32. `generateSprite(cfg)` called twice with the same
config produces byte-identical output (covered by `test/driver.ts`).

---

## Skeletal animation

Animation is built **on top of** the static engine: each frame poses the same
skeleton and runs the same distance-field + lighting pass. There is no separate
render path, so animated frames match static sprites exactly.

```ts
import { generateAnimation, packSpriteSheet, toCanvas } from './src/index';

const anim = generateAnimation({ seed: 'hero', size: 48 }, 'walk');
// anim: { name, frames: SpriteBuffer[], frameCount, fps, loop }

// play it:
const canvases = anim.frames.map(toCanvas);
let i = 0;
setInterval(() => { ctx.clearRect(0,0,W,H); ctx.drawImage(canvases[i], x, y); i = (i+1) % canvases.length; }, 1000 / anim.fps);

// or export a horizontal spritesheet:
const sheet = packSpriteSheet(anim.frames);   // SpriteBuffer, width = frameW * frameCount
ctx.drawImage(toCanvas(sheet), 0, 0);
```

Built-in clips: `idle` (4f, breathing bob), `walk` (8f, stepping cycle),
`attack` (6f, one-shot wind-up + strike). `listAnimations()` returns the names.

### Pose system

A `Pose` is a flat set of numeric joint channels (`rootX/Y`, `headBob`,
`headTilt`, `armL/R`, `legL/R`, `torsoLean`); all-zero = the neutral standing
pose = the original static sprite. A clip is a list of `Keyframe`s (a partial
pose at normalized time `t∈[0,1]` plus an easing); `samplePose(clip, phase)`
brackets the keyframes, eases the local `t`, and lerps every channel. Author
your own:

```ts
import { generateAnimation, CLIPS } from './src/index';
CLIPS.wave = { name:'wave', fps:10, loop:true, frames:6, keyframes:[
  { t:0, pose:{ armR: -150*Math.PI/180 } },
  { t:0.5, pose:{ armR: -110*Math.PI/180, headTilt: 4*Math.PI/180 } },
  { t:1, pose:{ armR: -150*Math.PI/180 } },
]};
const wave = generateAnimation({ seed:'hero' }, 'wave');
```

In the skeleton, each part is placed through up to two rotations + a translate:
`translate(root) ∘ rotate(pelvis, lean) ∘ rotate(joint, swing)`. Limbs rotate
about their joint (shoulder/hip); upper-body parts also rotate about the pelvis
(lean); everything translates (bounce). Crop boxes are recomputed from the
rotated corners so nothing clips.

### Temporal stability (no boiling)

The usual failure mode of procedural animation — pixels shimmering between
frames — is prevented structurally:

* **One seed for the whole animation.** `buildSkeleton` seeds its RNG from
  `config.seed` only; the frame index is never mixed in, so proportions and
  colors are byte-identical on every frame. Only the deterministic pose changes.
* **Light fixed in world space.** `resolveRenderOpts` is computed once and
  reused for all frames.
* **Deterministic posterize** (no stochastic dither), so there is no per-frame
  noise to flicker.

`test/anim.ts` asserts this: same seed+config+animation ⇒ identical frames, and
the dominant body color is constant across all walk/idle frames.

## Skeletal animation

Animation is built *on top of* the static engine — frames are produced by posing
the existing skeleton and re-running the exact same distance-field + lighting
pass (`renderParts`). No shading code is duplicated, so animated frames look
identical in style to static sprites.

```ts
import { generateAnimation, packSpriteSheet, animationToCanvases } from './src/index';

const anim = generateAnimation({ seed: 'hero', size: 48 }, 'walk');
// anim => { name, frames: SpriteBuffer[], frameCount, fps, loop }

const canvases = animationToCanvases(anim);      // ready to drawImage()
const sheet = packSpriteSheet(anim.frames);      // one horizontal SpriteBuffer
```

Built-in clips: `idle` (4f @ 8fps, loop), `walk` (8f @ 12fps, loop),
`attack` (6f @ 14fps, one-shot). List them with `listAnimations()`.

### Pose / keyframe system (`pose.ts`)

A `Pose` is a flat set of joint channels (`rootX/Y`, `headBob`, `headTilt`,
`armL/R`, `legL/R`, `torsoLean`); all default to 0 = the neutral standing pose,
which reproduces the static sprite byte-for-byte. An `AnimationClip` is a list
of `Keyframe`s (a partial pose at normalized time `t∈[0,1]`, with per-segment
easing). `samplePose(clip, phase)` brackets the surrounding keyframes, eases the
local `t`, and lerps every channel. `skeleton.ts` consumes a `Pose` and rotates
limbs about their joints (shoulder/hip), tilts the head about the neck, leans
the upper body about the pelvis, and translates the whole body — then the normal
pipeline renders it.

### Temporal stability (why frames don't "boil")

- The RNG is seeded **only** from `config.seed`, never the frame index, so
  proportions and colors are identical on every frame.
- A `Pose` contains **no** randomness — only deterministic joint numbers change.
- `resolveRenderOpts(config)` is computed once and reused, so the light stays
  **fixed in world space** and quantization is frame-invariant.
- Posterize is deterministic (no stochastic dither), so there's no per-frame
  noise to shimmer.

Result: `same seed + config + animation ⇒ identical frames, every run` (covered
by `test/anim_driver.ts`).
