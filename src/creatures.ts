// =============================================================================
// creatures.ts — procedural ENEMY builders for UNDRAL.
//
// Like skeleton.ts, each builder turns a seed + config into an ordered list of
// `Part`s (back-to-front = paint order). It then runs through the EXACT same
// distance-field + lighting pass (`renderParts`) as the player character, so
// enemies are lit and styled identically — no separate render path.
//
// Three kinds, matching the sim's ENEMY_TEMPLATES:
//   • insect  (حشره دیواری) — small, hard, many-legged, glossy black chitin
//   • worm    (کرم غول)     — segmented soft body with a toothed maw
//   • crawler (خزنده)       — low, wide, red, clawed, glowing eyes
//
// DETERMINISM: all variation flows through one RNG seeded ONLY from config.seed,
// exactly like the character builder, so a given enemy id renders identically
// every frame.
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, circle, ellipse, capsule } from './shapes';

export type CreatureKind = 'insect' | 'worm' | 'crawler';

export interface CreatureConfig {
  seed?: number | string;
  kind?: CreatureKind;
  /** Override the base body color; otherwise chosen deterministically. */
  color?: RGB;
  /** Glowing red eyes + a more aggressive read (the sim's `alerted` flag). */
  alerted?: boolean;
}

const PI = Math.PI;

// ---- bbox helpers: push a primitive Part with a tight integer crop box -------

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
// ---- shared eye part ---------------------------------------------------------

function eyeMaterial(alerted: boolean) {
  // Alerted eyes glow hot (ember); idle eyes are dark and beady (gem-dark).
  return alerted
    ? MATERIALS.ember([255, 70, 40])
    : { ...MATERIALS.gem([60, 12, 14]), name: 'eye' };
}

// ---- deterministic default body colors --------------------------------------

function defaultColor(rng: RNG, kind: CreatureKind): RGB {
  const j = (c: RGB, amt: number): RGB => [
    c[0] * (1 + rng.jitter(amt)), c[1] * (1 + rng.jitter(amt)), c[2] * (1 + rng.jitter(amt)),
  ];
  switch (kind) {
    case 'insect':  return j([44, 50, 40], 0.18);   // greenish-black shell
    case 'worm':    return j([122, 138, 70], 0.16);  // sickly chartreuse flesh
    case 'crawler': return j([138, 46, 44], 0.16);   // dark blood red
  }
}

// =============================================================================
// Builders. `s` = working buffer size (size * supersample), as in skeleton.ts.
// =============================================================================

/** INSECT — hard glossy beetle/spider, splayed legs, antennae, mandibles. */
function buildInsect(rng: RNG, s: number, color: RGB, alerted: boolean): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const shell = MATERIALS.chitin(color);
  const eye = eyeMaterial(alerted);

  const bodyR = s * 0.17;
  const abdomenCy = s * 0.62;
  const thoraxCy = s * 0.44;
  const headCy = s * 0.30;
  const legR = Math.max(1, s * 0.022);

  // 1) LEGS — three pairs, behind the body. Each bends out then down.
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ay = thoraxCy + (i - 1) * s * 0.10;
      const jointX = cx + dir * bodyR * 0.7;
      const kneeX = cx + dir * s * (0.30 + i * 0.02);
      const kneeY = ay - s * 0.04 + i * s * 0.03;
      const footX = cx + dir * s * (0.40 + i * 0.015);
      const footY = ay + s * (0.10 + i * 0.03);
      pushCapsule(parts, shell, jointX, ay, kneeX, kneeY, legR, 0.9);
      pushCapsule(parts, shell, kneeX, kneeY, footX, footY, legR * 0.85, 0.9);
    }
  }

  // 2) ANTENNAE — thin, forward off the head.
  for (const dir of [-1, 1]) {
    pushCapsule(parts, shell, cx + dir * bodyR * 0.4, headCy - s * 0.02,
      cx + dir * s * 0.16, headCy - s * 0.18, Math.max(1, s * 0.012), 0.9);
  }

  // 3) BODY — abdomen (big) + thorax (mid), bulbous.
  pushEllipse(parts, shell, cx, abdomenCy, bodyR * 1.18, bodyR * 1.4, 1.0);
  pushEllipse(parts, shell, cx, thoraxCy, bodyR, bodyR * 0.95, 1.0);

  // 4) HEAD.
  pushCircle(parts, shell, cx, headCy, bodyR * 0.72, 1.0);

  // 5) MANDIBLES — short hooks at the head front.
  for (const dir of [-1, 1]) {
    pushCapsule(parts, shell, cx + dir * bodyR * 0.4, headCy + bodyR * 0.4,
      cx + dir * bodyR * 0.85, headCy + bodyR * 0.8, legR * 0.9, 0.85);
  }

  // 6) EYES — two beads on the head.
  const eyeDx = bodyR * 0.42, eyeR = bodyR * 0.2;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, headCy - bodyR * 0.05, eyeR, 0.7);

  return parts;
}

/** WORM — vertical stack of soft segments rising from the floor, toothed maw. */
function buildWorm(rng: RNG, s: number, color: RGB, alerted: boolean): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const segs = 5;
  const baseY = s * 0.86, topY = s * 0.22;

  // Slight deterministic S-curve so it doesn't read as a stiff cone.
  const sway = rng.range(0.04, 0.09) * s;
  const phase = rng.range(0, PI * 2);

  let topCx = cx, topR = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const cy = baseY + (topY - baseY) * t;
    const segCx = cx + Math.sin(phase + t * PI * 1.4) * sway * t;
    const r = s * (0.16 - 0.085 * t); // taper toward the head
    pushEllipse(parts, flesh, segCx, cy, r * 1.02, r * 1.18, 1.0);
    if (i === segs - 1) { topCx = segCx; topR = r; }
  }

  // MAW — a dark sphincter ring at the top, ringed by pale bone teeth.
  const bone = MATERIALS.bone([200, 196, 176]);
  const maw = { ...MATERIALS.flesh([46, 30, 34]), name: 'maw' };
  pushCircle(parts, maw, topCx, topY, topR * 0.85, 1.0);
  const teeth = 7;
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * PI * 2 + phase;
    const tx = topCx + Math.cos(a) * topR * 0.7;
    const ty = topY + Math.sin(a) * topR * 0.7;
    const ix = topCx + Math.cos(a) * topR * 0.3;
    const iy = topY + Math.sin(a) * topR * 0.3;
    pushCapsule(parts, bone, tx, ty, ix, iy, Math.max(1, topR * 0.12), 0.85);
  }

  // A pair of small eyes just below the maw if alerted, else faint specks.
  if (alerted) {
    const eye = eyeMaterial(true);
    for (const dir of [-1, 1]) pushCircle(parts, eye, topCx + dir * topR * 0.5, topY + topR * 1.2, topR * 0.22, 0.7);
  }

  return parts;
}

/** CRAWLER — low, wide, red, many splayed legs, front claws, glowing eyes. */
function buildCrawler(rng: RNG, s: number, color: RGB, alerted: boolean): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const shell = MATERIALS.chitin([color[0] * 0.5, color[1] * 0.4, color[2] * 0.4]);
  const eye = eyeMaterial(alerted);

  const bodyCy = s * 0.56;
  const bodyHx = s * 0.30, bodyHy = s * 0.17;
  const legR = Math.max(1, s * 0.024);

  // 1) LEGS — four pairs, wide and low, behind the body.
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ax = cx + dir * bodyHx * 0.55;
      const ay = bodyCy - bodyHy * 0.4 + (i - 1.5) * s * 0.055;
      const footX = cx + dir * s * (0.40 + (i % 2) * 0.04);
      const footY = bodyCy + s * 0.16 + (i - 1.5) * s * 0.02;
      const kneeX = (ax + footX) / 2 + dir * s * 0.04;
      const kneeY = ay - s * 0.05;
      pushCapsule(parts, shell, ax, ay, kneeX, kneeY, legR, 0.9);
      pushCapsule(parts, shell, kneeX, kneeY, footX, footY, legR * 0.85, 0.9);
    }
  }

  // 2) CLAWS — two forward pincers.
  for (const dir of [-1, 1]) {
    const baseX = cx + dir * bodyHx * 0.5;
    const baseY = bodyCy + bodyHy * 0.5;
    pushCapsule(parts, shell, baseX, baseY, cx + dir * s * 0.20, bodyCy + s * 0.20, legR * 1.3, 0.9);
    pushCapsule(parts, shell, cx + dir * s * 0.20, bodyCy + s * 0.20, cx + dir * s * 0.13, bodyCy + s * 0.28, legR, 0.85);
  }

  // 3) BODY — flat wide carapace + a raised back hump.
  pushEllipse(parts, flesh, cx, bodyCy, bodyHx, bodyHy, 1.0);
  pushEllipse(parts, shell, cx, bodyCy - bodyHy * 0.35, bodyHx * 0.7, bodyHy * 0.8, 1.0);

  // 4) BACK SPIKES — a deterministic row of small ridges.
  const spikes = 3;
  for (let k = 0; k < spikes; k++) {
    const sx = cx + (k - (spikes - 1) / 2) * s * 0.11;
    pushCapsule(parts, shell, sx, bodyCy - bodyHy * 0.5, sx, bodyCy - bodyHy * 1.15, Math.max(1, s * 0.02), 0.8);
  }

  // 5) EYES — a wide pair near the front.
  const eyeDx = bodyHx * 0.4, eyeY = bodyCy + bodyHy * 0.55, eyeR = s * 0.03;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, eyeY, eyeR, 0.7);

  return parts;
}

/** Build a creature's part list. `s` = working px (size * supersample). */
export function buildCreature(config: CreatureConfig, s: number): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const kind = config.kind ?? 'insect';
  const color = config.color ?? defaultColor(rng, kind);
  const alerted = config.alerted ?? false;
  switch (kind) {
    case 'worm':    return buildWorm(rng, s, color, alerted);
    case 'crawler': return buildCrawler(rng, s, color, alerted);
    case 'insect':
    default:        return buildInsect(rng, s, color, alerted);
  }
}

/** Names of the built-in creature kinds. */
export const CREATURE_KINDS: CreatureKind[] = ['insect', 'worm', 'crawler'];
