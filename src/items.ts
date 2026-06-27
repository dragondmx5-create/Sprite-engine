// =============================================================================
// items.ts — procedural LOOT builders for UNDRAL.
//
// Same contract as skeleton.ts / creatures.ts: build an ordered `Part[]` and
// let the shared `renderParts` pass light it. Three kinds matching the sim's
// ITEM_TEMPLATES:
//   • mushroom (قارچ)            — common; edible, restores food
//   • crystal  (کریستال)         — rare; a faceted gem cluster
//   • dagger   (Shadowfang)      — legendary; a dark steel blade
//
// Items are drawn small (≈ one tile), so silhouettes are kept bold and the
// detail count low — they must still read at 16–20 px.
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, circle, ellipse, capsule, roundedBox, rotatedAround, transformedAABB, type SDF } from './shapes';
import { wave } from './anim/spring';

const PI = Math.PI;

export type ItemKind = 'mushroom' | 'crystal' | 'dagger' | 'torch' | 'potion' | 'coin' | 'rune' | 'chest' | 'key' | 'scroll' | 'meat' | 'lantern' | 'ore' | 'firestone' | 'bone_shard' | 'fish';

export interface ItemConfig {
  seed?: number | string;
  kind?: ItemKind;
  /** Override the primary color; otherwise chosen deterministically. */
  color?: RGB;
}

// ---- bbox helpers (mirror creatures.ts) -------------------------------------

function pushEllipse(parts: Part[], mat: Part['material'], cx: number, cy: number, rx: number, ry: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: ellipse(cx, cy, rx, ry),
    bbox: [Math.floor(cx - rx - 2), Math.floor(cy - ry - 2), Math.ceil(cx + rx + 2), Math.ceil(cy + ry + 2)],
  });
}
function pushCircle(parts: Part[], mat: Part['material'], cx: number, cy: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: circle(cx, cy, r),
    bbox: [Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(cx + r + 2), Math.ceil(cy + r + 2)],
  });
}
function pushCapsule(parts: Part[], mat: Part['material'], ax: number, ay: number, bx: number, by: number, r: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: capsule(ax, ay, bx, by, r),
    bbox: [Math.floor(Math.min(ax, bx) - r - 2), Math.floor(Math.min(ay, by) - r - 2), Math.ceil(Math.max(ax, bx) + r + 2), Math.ceil(Math.max(ay, by) + r + 2)],
  });
}
function pushBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, roundness: number) {
  parts.push({
    material: mat, roundness, sdf: roundedBox(cx, cy, hx, hy, corner),
    bbox: [Math.floor(cx - hx - 2), Math.floor(cy - hy - 2), Math.ceil(cx + hx + 2), Math.ceil(cy + hy + 2)],
  });
}
/** A rounded box rotated about its own center — used for crystal shards. */
function pushRotBox(parts: Part[], mat: Part['material'], cx: number, cy: number, hx: number, hy: number, corner: number, angle: number, roundness: number) {
  const base: SDF = roundedBox(cx, cy, hx, hy, corner);
  const sdf = rotatedAround(base, angle, cx, cy);
  parts.push({
    material: mat, roundness, sdf,
    bbox: transformedAABB(cx - hx, cy - hy, cx + hx, cy + hy, angle, cx, cy, 0, 0),
  });
}

// ---- deterministic default colors -------------------------------------------

function defaultColor(rng: RNG, kind: ItemKind): RGB {
  const j = (c: RGB, amt: number): RGB => [
    c[0] * (1 + rng.jitter(amt)), c[1] * (1 + rng.jitter(amt)), c[2] * (1 + rng.jitter(amt)),
  ];
  switch (kind) {
    case 'mushroom': return j([176, 58, 52], 0.16);  // red cap
    case 'crystal':  return j([96, 178, 214], 0.14);  // cyan gem
    case 'dagger':   return j([122, 132, 150], 0.10);  // cold steel
    case 'torch':    return j([255, 150, 50], 0.10);  // flame
    case 'potion':   return j([90, 210, 130], 0.18);  // liquid
    case 'coin':     return j([220, 180, 70], 0.08);  // gold
    case 'rune':     return j([150, 110, 230], 0.16);  // arcane glyph
    case 'chest':    return j([140, 95, 55], 0.12);   // wood
    case 'key':      return j([220, 190, 80], 0.08);  // gold
    case 'scroll':     return j([230, 215, 180], 0.06); // parchment
    case 'meat':       return j([160, 60, 50], 0.14);  // raw meat
    case 'lantern':    return j([220, 200, 120], 0.10); // warm light
    case 'ore':        return j([140, 145, 155], 0.08); // iron ore
    case 'firestone':  return j([255, 100, 30], 0.12);  // fire stone
    case 'bone_shard': return j([200, 192, 175], 0.08); // bone fragment
    case 'fish':       return j([210, 185, 175], 0.10); // pale cave fish
    default:           return j([180, 180, 180], 0.10);
  }
}

// =============================================================================
// Builders. `s` = working px (size * supersample).
// =============================================================================

/** MUSHROOM — gentle sway. */
function buildMushroom(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const sway = wave(phase, 1) * s * 0.012 * amp;
  const stem = MATERIALS.flesh([224, 212, 190]);
  const cap = MATERIALS.flesh(color);
  const spot = MATERIALS.bone([238, 232, 214]);

  pushCapsule(parts, stem, cx - s * 0.02, s * 0.78, cx + sway, s * 0.52, s * 0.07, 1.0);
  const capCy = s * 0.46, capRx = s * 0.26, capRy = s * 0.18;
  pushEllipse(parts, cap, cx + sway, capCy, capRx, capRy, 1.0);
  pushEllipse(parts, cap, cx + sway, capCy + capRy * 0.55, capRx * 0.92, capRy * 0.4, 1.0);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = rng.range(-1, 1) * 0.9;
    const sx = cx + sway + a * capRx * 0.7;
    const sy = capCy - capRy * 0.2 + rng.jitter(capRy * 0.3);
    pushCircle(parts, spot, sx, sy, s * (0.03 + rng.range(0, 0.015)), 0.8);
  }
  return parts;
}

/** CRYSTAL — pulsing glow on the tip highlight. */
function buildCrystal(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, baseY = s * 0.74;
  const pulse = 0.5 + 0.5 * wave(phase, 1);
  const glow = pulse * amp;
  const hiColor: RGB = [
    Math.min(255, color[0] + 60 + 40 * glow),
    Math.min(255, color[1] + 60 + 40 * glow),
    Math.min(255, color[2] + 60 + 40 * glow),
  ];
  const gem = MATERIALS.gem(color);
  const gemDim = MATERIALS.gem([color[0] * 0.7, color[1] * 0.72, color[2] * 0.78]);

  pushRotBox(parts, gemDim, cx - s * 0.13, baseY - s * 0.12, s * 0.05, s * 0.16, s * 0.02, -0.35 + rng.jitter(0.1), 0.9);
  pushRotBox(parts, gemDim, cx + s * 0.14, baseY - s * 0.10, s * 0.045, s * 0.14, s * 0.02, 0.4 + rng.jitter(0.1), 0.9);
  pushRotBox(parts, gem, cx + s * 0.01, baseY - s * 0.18, s * 0.07, s * 0.24, s * 0.025, rng.jitter(0.12), 0.9);
  pushCircle(parts, MATERIALS.gem(hiColor), cx + s * 0.01, baseY - s * 0.36, s * (0.03 + 0.01 * glow), 0.8);
  return parts;
}

/** DAGGER (Shadowfang) — glint slides along the blade edge. */
function buildDagger(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const steel = MATERIALS.metal(color);
  const guard = MATERIALS.metal([150, 120, 70]);
  const grip = MATERIALS.leather([70, 50, 44]);
  const pommel = MATERIALS.gem([150, 70, 190]);

  pushEllipse(parts, steel, cx, s * 0.36, s * 0.055, s * 0.28, 0.7);
  pushCapsule(parts, MATERIALS.metal([170, 178, 196]), cx, s * 0.20, cx, s * 0.52, Math.max(1, s * 0.012), 0.6);
  pushBox(parts, guard, cx, s * 0.66, s * 0.16, s * 0.03, s * 0.015, 0.6);
  pushCapsule(parts, grip, cx, s * 0.70, cx, s * 0.84, s * 0.035, 1.0);
  pushCircle(parts, pommel, cx, s * 0.87, s * 0.045, 0.85);
  // sliding glint along the blade
  const glintY = s * (0.14 + 0.40 * ((phase * amp + 0.5) % 1));
  pushCircle(parts, MATERIALS.metal([230, 240, 255]), cx + s * 0.03, glintY, Math.max(1, s * 0.014), 0.5);
  return parts;
}

/** TORCH — flame flickers and dances. */
function buildTorch(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const grip = MATERIALS.leather([86, 58, 40]);
  const head = MATERIALS.bone([60, 50, 46]);
  const flame = MATERIALS.ember(color);
  const flameHi = MATERIALS.ember([255, 235, 140]);

  pushCapsule(parts, grip, cx, s * 0.86, cx, s * 0.48, s * 0.04, 1.0);
  pushCircle(parts, head, cx, s * 0.46, s * 0.07, 0.9);
  const seedFlick = rng.jitter(s * 0.02);
  const flick = seedFlick + wave(phase, 3) * s * 0.025 * amp;
  const breathe = 1 + wave(phase, 2) * 0.12 * amp;
  const fy = s * 0.30 + wave(phase, 1.5) * s * 0.015 * amp;
  pushEllipse(parts, flame, cx + flick, fy, s * 0.10 * breathe, s * 0.16 * breathe, 1.0);
  pushEllipse(parts, flameHi, cx + flick * 0.4, fy + s * 0.02, s * 0.05, s * 0.10 * breathe, 1.0);
  return parts;
}

/** POTION — liquid bobs, bubbles rise, surface glint pulses. */
function buildPotion(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const glass = MATERIALS.glass([200, 220, 230]);
  const liquid = MATERIALS.ember(color);
  const cork = MATERIALS.leather([150, 110, 70]);

  pushEllipse(parts, liquid, cx, s * 0.62, s * 0.18, s * 0.16, 1.0);
  pushCircle(parts, glass, cx, s * 0.60, s * 0.21, 1.0);
  pushBox(parts, glass, cx, s * 0.36, s * 0.07, s * 0.10, s * 0.03, 0.8);
  // liquid glow drawn ON TOP of glass so it's visible through the bulb
  const glow = 0.5 + 0.5 * wave(phase, 1.5);
  const glowAmt = 0.5 + 0.5 * glow * amp;
  const liqGlow: RGB = [
    Math.min(255, color[0] * glowAmt),
    Math.min(255, color[1] * glowAmt),
    Math.min(255, color[2] * glowAmt),
  ];
  pushEllipse(parts, MATERIALS.ember(liqGlow), cx, s * 0.64, s * 0.14, s * 0.10, 1.0);
  // glint slides along the glass surface
  const glintAngle = phase * PI * 2;
  const glintX = cx + Math.cos(glintAngle) * s * 0.10;
  const glintY = s * 0.52 + Math.sin(glintAngle) * s * 0.06;
  pushCircle(parts, MATERIALS.glass([255, 255, 255]), glintX, glintY, Math.max(1, s * 0.025), 0.7);
  pushBox(parts, cork, cx, s * 0.26, s * 0.06, s * 0.05, s * 0.02, 0.9);
  return parts;
}

/** COIN — fake 3D spin by squashing X, sliding glint. */
function buildCoin(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.54;
  const gold = MATERIALS.gold(color);
  const goldDim = MATERIALS.gold([color[0] * 0.78, color[1] * 0.78, color[2] * 0.7]);
  // spin: squash the X radius with a cosine to fake rotation
  const spin = Math.cos(phase * PI * 2) * amp;
  const rxScale = 0.6 + 0.4 * Math.abs(spin);
  pushEllipse(parts, goldDim, cx + s * 0.05, cy + s * 0.06, s * 0.2 * rxScale, s * 0.16, 1.0);
  pushEllipse(parts, gold, cx, cy, s * 0.21 * rxScale, s * 0.17, 1.0);
  pushEllipse(parts, goldDim, cx, cy, s * 0.13 * rxScale, s * 0.10, 1.0);
  // glint slides across during spin
  const glintX = cx + s * 0.12 * spin;
  pushCircle(parts, MATERIALS.gold([255, 240, 190]), glintX, cy - s * 0.05, Math.max(1, s * 0.03), 0.7);
  return parts;
}

/** RUNE — glyph strokes pulse in sequence. */
function buildRune(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5, cy = s * 0.52;
  const stone = MATERIALS.bone([70, 66, 74]);
  pushBox(parts, stone, cx, cy, s * 0.18, s * 0.24, s * 0.05, 0.85);
  const strokes = 3 + (Math.floor(rng.float() * 3));
  for (let i = 0; i < strokes; i++) {
    const ax = cx + rng.jitter(s * 0.09), ay = cy + rng.jitter(s * 0.14);
    const bx = cx + rng.jitter(s * 0.09), by = cy + rng.jitter(s * 0.14);
    // each stroke pulses at a phase offset so they light up in sequence
    const strokePhase = (phase + i / strokes) % 1;
    const bright = 0.5 + 0.5 * wave(strokePhase, 1) * amp;
    const glowColor: RGB = [
      Math.min(255, color[0] * (0.6 + 0.6 * bright)),
      Math.min(255, color[1] * (0.6 + 0.6 * bright)),
      Math.min(255, color[2] * (0.6 + 0.6 * bright)),
    ];
    pushCapsule(parts, MATERIALS.ember(glowColor), ax, ay, bx, by, Math.max(1, s * 0.014), 0.7);
  }
  return parts;
}

/** CHEST — lid opens, clasp glints. */
function buildChest(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const wood = MATERIALS.leather(color);
  const band = MATERIALS.metal([115, 105, 88]);
  const clasp = MATERIALS.gold([220, 190, 80]);
  // lid opens: rises and tilts back via Y offset
  const open = (0.5 + 0.5 * wave(phase, 0.5)) * amp;
  const lidLift = open * s * 0.08;
  pushBox(parts, wood, cx, s * 0.58, s * 0.24, s * 0.18, s * 0.03, 0.3);
  pushBox(parts, wood, cx, s * 0.38 - lidLift, s * 0.24, s * 0.08, s * 0.04, 0.4);
  pushBox(parts, band, cx, s * 0.45 - lidLift, s * 0.26, s * 0.014, s * 0.007, 0.35);
  pushBox(parts, band, cx, s * 0.68, s * 0.26, s * 0.014, s * 0.007, 0.35);
  // inner glow visible when open
  if (open > 0.3) {
    const glowAmt = (open - 0.3) / 0.7;
    pushEllipse(parts, MATERIALS.ember([255, 220, 100]), cx, s * 0.48, s * 0.16 * glowAmt, s * 0.04, 1.0);
  }
  pushCircle(parts, clasp, cx, s * 0.52, s * 0.024, 0.6);
  return parts;
}

/** KEY — gentle pendulum sway, glint slides along shaft. */
function buildKey(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const gold = MATERIALS.gold(color);
  const sway = wave(phase, 1) * s * 0.015 * amp;
  pushCircle(parts, gold, cx + sway * 0.3, s * 0.30, s * 0.08, 0.7);
  pushCircle(parts, MATERIALS.bone([30, 28, 26]), cx + sway * 0.3, s * 0.30, s * 0.04, 0.5);
  pushCapsule(parts, gold, cx + sway * 0.3, s * 0.38, cx + sway, s * 0.72, s * 0.02, 0.6);
  pushBox(parts, gold, cx + s * 0.04 + sway, s * 0.67, s * 0.035, s * 0.018, s * 0.006, 0.5);
  pushBox(parts, gold, cx + s * 0.04 + sway, s * 0.74, s * 0.028, s * 0.018, s * 0.006, 0.5);
  // glint travels along the shaft
  const glintY = s * (0.38 + 0.30 * ((phase * amp + 0.5) % 1));
  pushCircle(parts, MATERIALS.gold([255, 248, 210]), cx + sway * 0.6, glintY, Math.max(1, s * 0.012), 0.6);
  return parts;
}

/** SCROLL — seal glows and pulses, parchment breathes. */
function buildScroll(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const parch = MATERIALS.bone(color);
  // gentle breathing — parchment width pulses subtly
  const breathe = 1 + wave(phase, 1) * 0.02 * amp;
  pushBox(parts, parch, cx, s * 0.52, s * 0.14 * breathe, s * 0.22, s * 0.025, 0.35);
  pushCapsule(parts, parch, cx - s * 0.15 * breathe, s * 0.30, cx + s * 0.15 * breathe, s * 0.30, s * 0.032, 0.7);
  pushCapsule(parts, parch, cx - s * 0.15 * breathe, s * 0.74, cx + s * 0.15 * breathe, s * 0.74, s * 0.032, 0.7);
  // seal glows with pulsing brightness
  const sealPulse = 0.5 + 0.5 * wave(phase, 1.5) * amp;
  const sealColor: RGB = [
    Math.min(255, 180 + 60 * sealPulse),
    Math.min(255, 50 + 30 * sealPulse),
    Math.min(255, 40 + 20 * sealPulse),
  ];
  pushCircle(parts, MATERIALS.ember(sealColor), cx, s * 0.52, s * (0.028 + 0.006 * sealPulse), 0.6);
  return parts;
}

/** MEAT — raw flesh chunk, slight wobble. Food item for The Rot layer. */
function buildMeat(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const bone = MATERIALS.bone([210, 200, 180]);
  const wobble = wave(phase, 1) * s * 0.008 * amp;

  pushEllipse(parts, flesh, cx + wobble, s * 0.56, s * 0.20, s * 0.14, 0.9);
  pushEllipse(parts, flesh, cx + wobble * 0.5, s * 0.48, s * 0.14, s * 0.10, 0.85);
  // bone sticking out
  pushCapsule(parts, bone, cx - s * 0.08 + wobble, s * 0.42, cx - s * 0.16, s * 0.32, Math.max(1, s * 0.02), 0.7);
  pushCircle(parts, bone, cx - s * 0.16, s * 0.32, s * 0.028, 0.8);
  return parts;
}

/** LANTERN — hanging light source, flame flickers inside. */
function buildLantern(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const metal = MATERIALS.metal([120, 115, 105]);
  const glass = MATERIALS.glass([200, 210, 220]);
  const flame = MATERIALS.ember(color);

  const sway = wave(phase, 0.8) * s * 0.01 * amp;
  // hook
  pushCapsule(parts, metal, cx + sway * 0.3, s * 0.20, cx + sway * 0.5, s * 0.28, Math.max(1, s * 0.012), 0.5);
  // frame
  pushBox(parts, metal, cx + sway, s * 0.50, s * 0.10, s * 0.18, s * 0.02, 0.4);
  // glass body
  pushBox(parts, glass, cx + sway, s * 0.50, s * 0.07, s * 0.14, s * 0.015, 0.6);
  // flame inside
  const flick = wave(phase, 3) * s * 0.008 * amp;
  const breathe = 1 + wave(phase, 2) * 0.1 * amp;
  pushEllipse(parts, flame, cx + sway + flick, s * 0.48, s * 0.03 * breathe, s * 0.06 * breathe, 1.0);
  pushEllipse(parts, MATERIALS.ember([255, 240, 160]), cx + sway + flick * 0.3, s * 0.49, s * 0.015, s * 0.035 * breathe, 1.0);
  // bottom cap
  pushBox(parts, metal, cx + sway, s * 0.68, s * 0.09, s * 0.02, s * 0.008, 0.4);
  return parts;
}

/** ORE — rough metallic rock chunk. Irondeep resource. */
function buildOre(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const rock = MATERIALS.bone([80, 75, 70]);

  pushEllipse(parts, rock, cx, s * 0.55, s * 0.22, s * 0.18, 0.6);
  pushEllipse(parts, rock, cx - s * 0.06, s * 0.48, s * 0.14, s * 0.12, 0.5);
  // metal veins
  const glint = 0.5 + 0.5 * wave(phase, 1) * amp;
  const veinColor: RGB = [
    Math.min(255, color[0] + 30 * glint),
    Math.min(255, color[1] + 30 * glint),
    Math.min(255, color[2] + 30 * glint),
  ];
  pushCapsule(parts, MATERIALS.metal(veinColor), cx - s * 0.10, s * 0.46, cx + s * 0.08, s * 0.58,
    Math.max(1, s * 0.018), 0.4);
  pushCapsule(parts, MATERIALS.metal(veinColor), cx + s * 0.05, s * 0.42, cx + s * 0.12, s * 0.55,
    Math.max(1, s * 0.012), 0.35);
  return parts;
}

/** FIRESTONE — glowing ember rock from Emberscar. */
function buildFirestone(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const rock = MATERIALS.bone([50, 35, 30]);

  pushEllipse(parts, rock, cx, s * 0.56, s * 0.20, s * 0.17, 0.55);
  // glowing cracks
  const pulse = 0.5 + 0.5 * wave(phase, 1.5) * amp;
  const glowColor: RGB = [
    Math.min(255, color[0] * (0.6 + 0.6 * pulse)),
    Math.min(255, color[1] * (0.4 + 0.4 * pulse)),
    Math.min(255, color[2] * (0.3 + 0.3 * pulse)),
  ];
  for (let i = 0; i < 3; i++) {
    const ax = cx + rng.jitter(s * 0.12), ay = s * 0.45 + rng.jitter(s * 0.10);
    const bx = cx + rng.jitter(s * 0.12), by = s * 0.60 + rng.jitter(s * 0.08);
    pushCapsule(parts, MATERIALS.ember(glowColor), ax, ay, bx, by, Math.max(1, s * 0.012), 0.35);
  }
  // glow halo
  pushCircle(parts, MATERIALS.ember([...glowColor] as RGB), cx, s * 0.50, s * (0.06 + 0.015 * pulse), 0.9);
  return parts;
}

/** BONE_SHARD — a bone fragment. Crafting resource (tool handles). */
function buildBoneShard(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const bone = MATERIALS.bone(color);

  const tilt = wave(phase, 0.5) * 0.04 * amp;
  pushCapsule(parts, bone, cx - s * 0.12, s * 0.68 + tilt * s, cx + s * 0.08, s * 0.34 - tilt * s, s * 0.035, 0.7);
  pushCircle(parts, bone, cx + s * 0.08, s * 0.32, s * 0.04, 0.8);
  // crack detail
  pushCapsule(parts, MATERIALS.bone([color[0] * 0.7, color[1] * 0.7, color[2] * 0.7] as RGB),
    cx - s * 0.04, s * 0.55, cx + s * 0.02, s * 0.48, Math.max(1, s * 0.006), 0.3);
  return parts;
}

/** FISH — blind cave fish, pale and floppy. Wobbles/flops on idle. */
function buildFish(rng: RNG, s: number, color: RGB, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const fin = MATERIALS.flesh([color[0] * 0.85, color[1] * 0.8, color[2] * 0.8] as RGB);
  const eyeColor = MATERIALS.bone([40, 35, 35]);

  // whole fish wobbles/flops
  const wobble = wave(phase, 1) * s * 0.01 * amp;

  // body — horizontal ellipse
  pushEllipse(parts, flesh, cx + wobble, s * 0.52, s * 0.22, s * 0.10, 0.9);

  // tail — capsule that flaps with wave(phase, 2)
  const tailFlap = wave(phase, 2) * s * 0.04 * amp;
  pushCapsule(parts, flesh, cx - s * 0.18 + wobble, s * 0.52,
    cx - s * 0.30 + wobble, s * 0.48 + tailFlap, s * 0.04, 0.8);

  // dorsal fin on top — small capsule
  pushCapsule(parts, fin, cx + s * 0.02 + wobble, s * 0.44,
    cx + s * 0.08 + wobble, s * 0.38, Math.max(1, s * 0.02), 0.7);

  // eye — small dark dot (blind, but still has a vestigial eye spot)
  pushCircle(parts, eyeColor, cx + s * 0.14 + wobble, s * 0.50, Math.max(1, s * 0.018), 0.6);

  return parts;
}

/** Build an item's part list. `s` = working px (size * supersample). */
export function buildItem(config: ItemConfig, s: number, phase = 0, amp = 1): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const kind = config.kind ?? 'mushroom';
  const color = config.color ?? defaultColor(rng, kind);
  switch (kind) {
    case 'crystal':    return buildCrystal(rng, s, color, phase, amp);
    case 'dagger':     return buildDagger(rng, s, color, phase, amp);
    case 'torch':      return buildTorch(rng, s, color, phase, amp);
    case 'potion':     return buildPotion(rng, s, color, phase, amp);
    case 'coin':       return buildCoin(rng, s, color, phase, amp);
    case 'rune':       return buildRune(rng, s, color, phase, amp);
    case 'chest':      return buildChest(rng, s, color, phase, amp);
    case 'key':        return buildKey(rng, s, color, phase, amp);
    case 'scroll':     return buildScroll(rng, s, color, phase, amp);
    case 'meat':       return buildMeat(rng, s, color, phase, amp);
    case 'lantern':    return buildLantern(rng, s, color, phase, amp);
    case 'ore':        return buildOre(rng, s, color, phase, amp);
    case 'firestone':  return buildFirestone(rng, s, color, phase, amp);
    case 'bone_shard': return buildBoneShard(rng, s, color, phase, amp);
    case 'fish':       return buildFish(rng, s, color, phase, amp);
    case 'mushroom':
    default:           return buildMushroom(rng, s, color, phase, amp);
  }
}

/** Names of the built-in item kinds. */
export const ITEM_KINDS: ItemKind[] = ['mushroom', 'crystal', 'dagger', 'torch', 'potion', 'coin', 'rune', 'chest', 'key', 'scroll', 'meat', 'lantern', 'ore', 'firestone', 'bone_shard', 'fish'];
