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

export type CreatureKind = 'insect' | 'worm' | 'crawler' | 'fire_elemental' | 'shadow' | 'burrower' | 'bat' | 'slime';

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
    case 'insect':        return j([44, 50, 40], 0.18);
    case 'worm':          return j([122, 138, 70], 0.16);
    case 'crawler':       return j([138, 46, 44], 0.16);
    case 'fire_elemental': return j([255, 120, 40], 0.12);
    case 'shadow':        return j([30, 25, 45], 0.10);
    case 'burrower':      return j([95, 75, 50], 0.14);
    case 'bat':           return j([60, 50, 70], 0.16);
    case 'slime':         return j([70, 180, 80], 0.20);
    default:              return j([80, 80, 80], 0.15);
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

/** FIRE ELEMENTAL (Emberscar layer 4) — pulsing flame body, ember corona. */
function buildFireElemental(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const flame = MATERIALS.ember(color);
  const core = MATERIALS.ember([255, 240, 160]);
  const eye = eyeMaterial(alerted);

  const breathe = 1 + wave(phase, 2) * 0.08 * amp;
  const flick = wave(phase, 3.7) * s * 0.02 * amp;
  const bob = wave(phase, 1.5) * s * 0.015 * amp;

  const bodyCy = s * 0.52 + bob;
  const bodyRx = s * 0.18 * breathe;
  const bodyRy = s * 0.22 * breathe;

  pushEllipse(parts, flame, cx + flick * 0.5, bodyCy + s * 0.08, bodyRx * 1.1, bodyRy * 0.6, 1.0);
  pushEllipse(parts, flame, cx + flick, bodyCy, bodyRx, bodyRy, 1.0);
  pushEllipse(parts, core, cx + flick * 0.3, bodyCy + s * 0.02, bodyRx * 0.5, bodyRy * 0.55, 1.0);

  const topY = bodyCy - bodyRy * 0.7;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + phase * Math.PI * 2;
    const wr = s * (0.04 + 0.015 * wave(phase, 4, i * 0.33));
    const wx = cx + Math.cos(a) * bodyRx * 0.8 + flick;
    const wy = topY + Math.sin(a) * bodyRy * 0.3;
    pushCircle(parts, flame, wx, wy, Math.max(1.5, wr * amp + wr * 0.5), 1.0);
  }

  const eyeDx = bodyRx * 0.35;
  const eyeR = s * 0.03;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx + flick, bodyCy - bodyRy * 0.1, eyeR, 0.7);

  return parts;
}

/** SHADOW (The Hollow layer 5) — amorphous dark form, glowing eyes, wisps. */
function buildShadow(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const dark = MATERIALS.cloth(color);
  const wisp = MATERIALS.gem([80, 60, 140]);
  const eye = alerted ? MATERIALS.ember([255, 40, 40]) : MATERIALS.gem([140, 100, 255]);

  const drift = wave(phase, 0.7) * s * 0.02 * amp;
  const pulse = 1 + wave(phase, 1.3) * 0.06 * amp;
  const bodyCy = s * 0.5 + drift;

  pushEllipse(parts, dark, cx, bodyCy + s * 0.1, s * 0.24 * pulse, s * 0.12, 0.8);
  pushEllipse(parts, dark, cx, bodyCy, s * 0.2 * pulse, s * 0.25 * pulse, 1.0);
  pushEllipse(parts, { ...dark, base: [color[0] * 0.6, color[1] * 0.6, color[2] * 0.7] as RGB },
    cx, bodyCy - s * 0.05, s * 0.14 * pulse, s * 0.18 * pulse, 1.0);

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + phase * Math.PI;
    const wr = s * 0.025;
    const wx = cx + Math.cos(a) * s * 0.22;
    const wy = bodyCy + Math.sin(a) * s * 0.15;
    const wampPhase = (phase + i * 0.33) % 1;
    const wamp = 0.3 + 0.7 * (0.5 + 0.5 * wave(wampPhase, 1));
    pushCircle(parts, wisp, wx, wy, Math.max(1, wr * wamp * amp), 0.9);
  }

  const eyeDx = s * 0.06;
  const eyeR = s * 0.025;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, bodyCy - s * 0.06, eyeR, 0.8);

  return parts;
}

/** BURROWER — emerges from the ground, armored segments. Ground ambush creature. */
function buildBurrower(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const shell = MATERIALS.chitin(color);
  const dirt = MATERIALS.bone([color[0] * 0.6, color[1] * 0.55, color[2] * 0.5]);
  const eye = eyeMaterial(alerted);

  const emerge = 0.3 + 0.7 * (0.5 + 0.5 * wave(phase, 0.5)) * amp;
  const segs = 4;
  const baseY = s * 0.85;
  const topY = baseY - s * 0.55 * emerge;

  pushEllipse(parts, dirt, cx, baseY, s * 0.22, s * 0.06, 0.3);

  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const segY = baseY + (topY - baseY) * t;
    if (segY > baseY - s * 0.02) continue;
    const segR = s * (0.14 - t * 0.04);
    const sway = wave(phase, 1.5) * s * 0.01 * amp * t;
    pushEllipse(parts, shell, cx + sway, segY, segR, segR * 0.8, 1.0);
  }

  if (emerge > 0.5) {
    const headY = topY;
    const headR = s * 0.12;
    pushCircle(parts, shell, cx, headY, headR, 1.0);
    const jawOpen = (0.5 + 0.5 * wave(phase, 2)) * s * 0.02 * amp;
    for (const dir of [-1, 1]) {
      pushCapsule(parts, shell, cx + dir * headR * 0.5, headY + headR * 0.6,
        cx + dir * (headR * 0.9 + jawOpen), headY + headR * 0.9, Math.max(1, s * 0.02), 0.85);
    }
    for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * headR * 0.35, headY - headR * 0.15, s * 0.02, 0.7);
  }

  return parts;
}

/** BAT — ceiling ambush, flapping wings. */
function buildBat(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const skin = MATERIALS.flesh(color);
  const eye = eyeMaterial(alerted);

  const flapAngle = wave(phase, 3) * 0.6 * amp;
  const bob = wave(phase, 3) * s * 0.02 * amp;
  const bodyCy = s * 0.5 + bob;
  const bodyR = s * 0.08;

  for (const dir of [-1, 1]) {
    const wingTip = flapAngle * dir;
    const wx = cx + dir * s * 0.28;
    const wy = bodyCy - s * 0.05 + Math.abs(wingTip) * s * 0.15;
    pushCapsule(parts, skin, cx + dir * bodyR * 0.6, bodyCy - s * 0.02, wx, wy, Math.max(1.5, s * 0.03), 0.7);
    pushCapsule(parts, skin, wx, wy, wx + dir * s * 0.08, wy + s * 0.1 + wingTip * s * 0.08,
      Math.max(1, s * 0.018), 0.6);
  }

  pushEllipse(parts, skin, cx, bodyCy, bodyR, bodyR * 1.1, 1.0);

  const earR = s * 0.03;
  for (const dir of [-1, 1]) {
    pushCapsule(parts, skin, cx + dir * bodyR * 0.5, bodyCy - bodyR, cx + dir * bodyR * 0.7,
      bodyCy - bodyR - s * 0.06, Math.max(1, earR), 0.8);
  }

  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * bodyR * 0.4, bodyCy - bodyR * 0.15, s * 0.015, 0.7);

  return parts;
}

/** SLIME — blobby, bouncing, corrosive. */
function buildSlime(rng: RNG, s: number, color: RGB, alerted: boolean, phase: number, amp: number): Part[] {
  const parts: Part[] = [];
  const cx = s * 0.5;
  const gel = MATERIALS.glass(color);
  const gelDark = MATERIALS.glass([color[0] * 0.6, color[1] * 0.65, color[2] * 0.6]);
  const eye = eyeMaterial(alerted);

  const bounce = Math.abs(wave(phase, 2)) * amp;
  const sq = squash(bounce * -0.3);
  const bodyCy = s * 0.58 - bounce * s * 0.06;
  const bodyRx = s * 0.22 * sq.sx;
  const bodyRy = s * 0.18 * sq.sy;

  pushEllipse(parts, gelDark, cx, bodyCy + bodyRy * 0.3, bodyRx * 0.9, bodyRy * 0.4, 0.8);
  pushEllipse(parts, gel, cx, bodyCy, bodyRx, bodyRy, 1.0);

  const highlightR = s * 0.04;
  pushCircle(parts, MATERIALS.glass([Math.min(255, color[0] + 80), Math.min(255, color[1] + 80),
    Math.min(255, color[2] + 60)] as RGB), cx - bodyRx * 0.3, bodyCy - bodyRy * 0.4, highlightR, 0.9);

  const eyeDx = bodyRx * 0.3;
  const eyeR = s * 0.022;
  for (const dir of [-1, 1]) pushCircle(parts, eye, cx + dir * eyeDx, bodyCy - bodyRy * 0.15, eyeR, 0.7);

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
    case 'worm':           return buildWorm(rng, s, color, alerted, phase, amp);
    case 'crawler':        return buildCrawler(rng, s, color, alerted, phase, amp);
    case 'fire_elemental': return buildFireElemental(rng, s, color, alerted, phase, amp);
    case 'shadow':         return buildShadow(rng, s, color, alerted, phase, amp);
    case 'burrower':       return buildBurrower(rng, s, color, alerted, phase, amp);
    case 'bat':            return buildBat(rng, s, color, alerted, phase, amp);
    case 'slime':          return buildSlime(rng, s, color, alerted, phase, amp);
    case 'insect':
    default:               return buildInsect(rng, s, color, alerted, phase, amp);
  }
}

/** Names of the built-in creature kinds. */
export const CREATURE_KINDS: CreatureKind[] = ['insect', 'worm', 'crawler', 'fire_elemental', 'shadow', 'burrower', 'bat', 'slime'];
