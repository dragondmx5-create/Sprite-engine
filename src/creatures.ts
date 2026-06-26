// =============================================================================
// creatures.ts — procedural ENEMY builders for UNDRAL, now PHASE-DRIVEN.
//
// Like skeleton.ts, each builder turns a seed + config into an ordered list of
// `Part`s (back-to-front = paint order) run through the SAME distance-field +
// lighting pass (`renderParts`) as the player character.
//
// ANIMATION (the cool part): each builder takes an optional `phase` (0..1) and
// animates procedurally — no authored frames:
//   • worm    — a traveling sine UNDULATES the spine; the maw opens/closes
//   • insect  — six legs walk via two-bone IK in an alternating tripod gait;
//               the body bobs and the antennae lag behind (follow-through)
//   • crawler — eight legs scuttle via IK; claws snap; the carapace bobs
// Everything is a pure function of (seed, phase), so frames are deterministic
// and never "boil". phase = 0 is the resting pose (the static sprite).
// =============================================================================

import type { RGB } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, circle, ellipse, capsule } from './shapes';
import { solveTwoBone, type Pt } from './anim/ik';
import { wave, lag, squash } from './anim/spring';

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

/**
 * A two-segment IK leg with a walking gait. The foot cycles back→front along
 * the body's travel axis (y), lifting and tucking inward during the swing half;
 * the knee is solved analytically so it always buckles outward (`bend`).
 */
function ikLeg(
  parts: Part[], mat: Part['material'],
  hip: Pt, restFoot: Pt, l1: number, l2: number, bend: number, legR: number,
  phase: number, stride: number, tuck: number,
) {
  let gp = phase % 1; if (gp < 0) gp += 1;
  let fy: number, fx: number;
  if (gp < 0.5) {
    // STANCE: foot planted, sweeping front → back (propels the body forward).
    const u = gp / 0.5;
    fy = restFoot.y + (0.5 - u) * stride;
    fx = restFoot.x;
  } else {
    // SWING: foot lifts off, snapping back → front, tucked toward the body.
    const u = (gp - 0.5) / 0.5;
    fy = restFoot.y + (-0.5 + u) * stride;
    fx = restFoot.x + Math.sin(u * PI) * tuck * Math.sign(restFoot.x - hip.x || 1) * -1;
  }
  const { knee, foot } = solveTwoBone(hip, { x: fx, y: fy }, l1, l2, bend);
  pushCapsule(parts, mat, hip.x, hip.y, knee.x, knee.y, legR, 0.9);
  pushCapsule(parts, mat, knee.x, knee.y, foot.x, foot.y, legR * 0.85, 0.9);
}

// ---- shared eye part ---------------------------------------------------------

function eyeMaterial(alerted: boolean) {
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
    case 'insect':  return j([44, 50, 40], 0.18);
    case 'worm':    return j([122, 138, 70], 0.16);
    case 'crawler': return j([138, 46, 44], 0.16);
    default:        return j([80, 80, 80], 0.15);
  }
}

// =============================================================================
// Builders. `s` = working buffer size (size * supersample). `phase` ∈ [0,1).
// =============================================================================

/** INSECT — six IK legs (alternating tripod), bobbing body, lagging antennae. */
function buildInsect(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const shell = MATERIALS.chitin(color);
  const eye = eyeMaterial(alerted);

  const bodyR = s * 0.17;
  // Body bobs twice per stride (legs push the body up each half-cycle).
  const bob = wave(phase, 2) * s * 0.012 * amp;
  const abdomenCy = s * 0.62 + bob;
  const thoraxCy = s * 0.44 + bob;
  const headCy = s * 0.30 + bob;
  const legR = Math.max(1, s * 0.022);
  const l1 = s * 0.13, l2 = s * 0.13;

  // 1) LEGS — three pairs. Tripod gait: a leg's phase depends on side+row so
  //    diagonal legs move together (the classic insect alternating tripod).
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const hip: Pt = { x: cx + dir * bodyR * 0.7, y: thoraxCy + (i - 1) * s * 0.10 };
      const restFoot: Pt = { x: cx + dir * s * (0.36 + i * 0.015), y: thoraxCy + (i - 1) * s * 0.12 + s * 0.06 };
      // tripod grouping → 0.5 phase offset between the two tripods
      const tripod = ((i + (dir < 0 ? 0 : 1)) % 2) * 0.5;
      ikLeg(parts, shell, hip, restFoot, l1, l2, dir < 0 ? 1 : -1, legR, phase + tripod, s * 0.07 * amp, s * 0.05 * amp);
    }
  }

  // 2) ANTENNAE — lag the body bob for follow-through.
  const antLag = lag((p) => wave(p, 2), phase, 0.12) * amp;
  for (const dir of [-1, 1]) {
    pushCapsule(parts, shell, cx + dir * bodyR * 0.4, headCy - s * 0.02,
      cx + dir * s * 0.16 + dir * antLag * s * 0.03, headCy - s * 0.18 + antLag * s * 0.02,
      Math.max(1, s * 0.012), 0.9);
  }

  // 3) BODY — abdomen + thorax, with a faint breathing squash.
  const sq = squash(wave(phase, 2) * 0.05 * amp);
  pushEllipse(parts, shell, cx, abdomenCy, bodyR * 1.18 * sq.sx, bodyR * 1.4 * sq.sy, 1.0);
  pushEllipse(parts, shell, cx, thoraxCy, bodyR * sq.sx, bodyR * 0.95 * sq.sy, 1.0);

  // 4) HEAD.
  pushCircle(parts, shell, cx, headCy, bodyR * 0.72, 1.0);

  // 5) MANDIBLES — twitch open/closed.
  const mand = (0.5 + 0.5 * wave(phase, 4)) * bodyR * 0.18 * amp;
  for (const dir of [-1, 1]) {
    pushCapsule(parts, shell, cx + dir * bodyR * 0.4, headCy + bodyR * 0.4,
      cx + dir * (bodyR * 0.85 + mand), headCy + bodyR * 0.8, legR * 0.9, 0.85);
  }

  // 6) EYES.
  const eyeDx = bodyR * 0.42, eyeR = bodyR * 0.2;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, headCy - bodyR * 0.05, eyeR, 0.7);

  return parts;
}

/** WORM — a traveling sine undulates the spine; the maw breathes open/closed. */
function buildWorm(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const segs = 6;
  const baseY = s * 0.86, topY = s * 0.22;

  const lateral = rng.range(0.05, 0.085) * s * amp;
  const seedPhase = rng.range(0, PI * 2);
  // A wave that TRAVELS up the body as phase advances → real slither.
  const travel = phase * PI * 2;

  let topCx = cx, topR = 0, topCy = topY;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const cy = baseY + (topY - baseY) * t - wave(phase, 1) * s * 0.02 * amp * t; // gentle rise/sink
    // lateral offset grows toward the free head end; phase makes it travel.
    const segCx = cx + Math.sin(seedPhase + t * PI * 1.6 - travel) * lateral * (0.2 + t);
    const r = s * (0.16 - 0.085 * t);
    pushEllipse(parts, flesh, segCx, cy, r * 1.02, r * 1.18, 1.0);
    if (i === segs - 1) { topCx = segCx; topR = r; topCy = cy; }
  }

  // MAW — opens and closes; teeth ride the opening.
  const open = 0.5 + 0.5 * wave(phase, 2) * amp; // 0..1
  const bone = MATERIALS.bone([200, 196, 176]);
  const maw = { ...MATERIALS.flesh([46, 30, 34]), name: 'maw' };
  pushCircle(parts, maw, topCx, topCy, topR * (0.6 + 0.35 * open), 1.0);
  const teeth = 7;
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * PI * 2 + seedPhase;
    const ringR = topR * (0.55 + 0.25 * open);
    const tx = topCx + Math.cos(a) * ringR;
    const ty = topCy + Math.sin(a) * ringR;
    const ix = topCx + Math.cos(a) * topR * 0.25;
    const iy = topCy + Math.sin(a) * topR * 0.25;
    pushCapsule(parts, bone, tx, ty, ix, iy, Math.max(1, topR * 0.12), 0.85);
  }

  if (alerted) {
    const eye = eyeMaterial(true);
    for (const dir of [-1, 1]) pushCircle(parts, eye, topCx + dir * topR * 0.5, topCy + topR * 1.2, topR * 0.22, 0.7);
  }

  return parts;
}

/** CRAWLER — eight IK legs scuttle; claws snap; carapace bobs low and fast. */
function buildCrawler(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flesh = MATERIALS.flesh(color);
  const shell = MATERIALS.chitin([color[0] * 0.5, color[1] * 0.4, color[2] * 0.4]);
  const eye = eyeMaterial(alerted);

  const bob = wave(phase, 2) * s * 0.01 * amp;
  const bodyCy = s * 0.56 + bob;
  const bodyHx = s * 0.30, bodyHy = s * 0.17;
  const legR = Math.max(1, s * 0.024);
  const l1 = s * 0.12, l2 = s * 0.12;

  // 1) LEGS — four pairs, alternating gait (faster cycle than the insect).
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const hip: Pt = { x: cx + dir * bodyHx * 0.55, y: bodyCy - bodyHy * 0.4 + (i - 1.5) * s * 0.05 };
      const restFoot: Pt = { x: cx + dir * s * (0.40 + (i % 2) * 0.03), y: bodyCy + s * 0.14 + (i - 1.5) * s * 0.02 };
      const off = ((i + (dir < 0 ? 0 : 1)) % 2) * 0.5;
      ikLeg(parts, shell, hip, restFoot, l1, l2, dir < 0 ? 1 : -1, legR, phase * 1.5 + off, s * 0.06 * amp, s * 0.045 * amp);
    }
  }

  // 2) CLAWS — open/close pincers, snapping when alerted.
  const snap = (alerted ? 1 : 0.5) * (0.5 + 0.5 * wave(phase, alerted ? 3 : 1.5)) * s * 0.03 * amp;
  for (const dir of [-1, 1]) {
    const baseX = cx + dir * bodyHx * 0.5;
    const baseY = bodyCy + bodyHy * 0.5;
    const tipX = cx + dir * s * 0.20, tipY = bodyCy + s * 0.20;
    pushCapsule(parts, shell, baseX, baseY, tipX, tipY, legR * 1.3, 0.9);
    pushCapsule(parts, shell, tipX, tipY, cx + dir * (s * 0.13 - snap), tipY + s * 0.08 + snap, legR, 0.85);
  }

  // 3) BODY — wide carapace + raised hump, with a low breathing squash.
  const sq = squash(wave(phase, 2) * 0.04 * amp);
  pushEllipse(parts, flesh, cx, bodyCy, bodyHx * sq.sx, bodyHy * sq.sy, 1.0);
  pushEllipse(parts, shell, cx, bodyCy - bodyHy * 0.35, bodyHx * 0.7, bodyHy * 0.8, 1.0);

  // 4) BACK SPIKES.
  const spikes = 3;
  for (let k = 0; k < spikes; k++) {
    const sx = cx + (k - (spikes - 1) / 2) * s * 0.11;
    pushCapsule(parts, shell, sx, bodyCy - bodyHy * 0.5, sx, bodyCy - bodyHy * 1.15, Math.max(1, s * 0.02), 0.8);
  }

  // 5) EYES.
  const eyeDx = bodyHx * 0.4, eyeY = bodyCy + bodyHy * 0.55, eyeR = s * 0.03;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, eyeY, eyeR, 0.7);

  return parts;
}

/**
 * Build a creature's part list. `s` = working px; `phase` ∈ [0,1) (default rest);
 * `amp` ∈ [0,1] scales all motion (0 = frozen, 0.4 = idle, 1 = full move).
 */
export function buildCreature(config: CreatureConfig, s: number, phase = 0, amp = 1): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const kind = config.kind ?? 'insect';
  const color = config.color ?? defaultColor(rng, kind);
  const alerted = config.alerted ?? false;
  switch (kind) {
    case 'worm':    return buildWorm(rng, s, color, alerted, phase, amp);
    case 'crawler': return buildCrawler(rng, s, color, alerted, phase, amp);
    case 'insect':
    default:        return buildInsect(rng, s, color, alerted, phase, amp);
  }
}

/** Names of the built-in creature kinds. */
export const CREATURE_KINDS: CreatureKind[] = ['insect', 'worm', 'crawler'];
