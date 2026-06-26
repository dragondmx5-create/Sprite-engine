// =============================================================================
// skeleton.ts — turn a high-level config (+ optional Pose) into an ordered
// list of body parts. Parts are emitted BACK-TO-FRONT (z = paint order).
//
// STYLE: blocky pixel-art chibi — parts are rounded BOXES with small corners.
//
// POSING: every part is placed through `placeSDF`, which applies up to two
// rotations and a translate:
//     world ← translate(root) ∘ rotate(pelvis, lean) ∘ rotate(joint, swing)
// Limbs rotate about their joint (shoulder/hip); upper-body parts additionally
// rotate about the pelvis (torso lean); the whole body translates (bounce).
// With NEUTRAL_POSE all of these are identity, so the output is byte-identical
// to the original static sprite — the static API is unchanged.
//
// TEMPORAL STABILITY: the RNG is seeded ONLY from config.seed (never the frame
// index), so proportions and colors are identical on every frame; only the
// deterministic pose numbers differ. Pose application performs no RNG calls.
// =============================================================================

import type { RGB, SpriteConfig } from './types';
import { RNG } from './rng';
import { MATERIALS } from './materials';
import { Part, SDF, roundedBox, capsule, circle, union, rotatedAround, translated } from './shapes';
import { Pose, NEUTRAL_POSE } from './pose';

/** Pick a deterministic default color (HSV-ish) when the user didn't specify one. */
function defaultColor(rng: RNG, kind: string): RGB {
  const hsv = (h: number, s: number, v: number): RGB => {
    const c = v * s, hp = (h % 1) * 6, xx = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, xx, 0];
    else if (hp < 2) [r, g, b] = [xx, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, xx];
    else if (hp < 4) [r, g, b] = [0, xx, c];
    else if (hp < 5) [r, g, b] = [xx, 0, c];
    else [r, g, b] = [c, 0, xx];
    const m = v - c;
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  switch (kind) {
    case 'skin':    return hsv(rng.range(0.03, 0.09), rng.range(0.35, 0.52), rng.range(0.80, 0.93));
    case 'hair':    return hsv(rng.range(0.0, 1.0), rng.range(0.45, 0.85), rng.range(0.28, 0.7));
    case 'cloth':   return hsv(rng.range(0.0, 1.0), rng.range(0.5, 0.85), rng.range(0.5, 0.82));
    case 'leather': return hsv(rng.range(0.05, 0.10), rng.range(0.5, 0.7), rng.range(0.3, 0.5));
    case 'metal':   return hsv(rng.range(0.55, 0.62), rng.range(0.06, 0.14), rng.range(0.52, 0.64));
    case 'hat':     return hsv(rng.range(0.0, 1.0), rng.range(0.45, 0.8), rng.range(0.4, 0.7));
    default:        return [200, 200, 200];
  }
}

/** Transform spec for a part: joint rotation, then pelvis rotation, then translate. */
interface Xform {
  jointAngle?: number; jx?: number; jy?: number;
  pelvisRot?: number; px?: number; py?: number;
  tx?: number; ty?: number;
}

/** Forward-transform a point through an Xform (used to compute the crop AABB). */
function fwd(x: number, y: number, xf: Xform): [number, number] {
  if (xf.jointAngle) {
    const c = Math.cos(xf.jointAngle), s = Math.sin(xf.jointAngle);
    const dx = x - xf.jx!, dy = y - xf.jy!;
    x = xf.jx! + dx * c - dy * s; y = xf.jy! + dx * s + dy * c;
  }
  if (xf.pelvisRot) {
    const c = Math.cos(xf.pelvisRot), s = Math.sin(xf.pelvisRot);
    const dx = x - xf.px!, dy = y - xf.py!;
    x = xf.px! + dx * c - dy * s; y = xf.py! + dx * s + dy * c;
  }
  return [x + (xf.tx || 0), y + (xf.ty || 0)];
}

/** Build the ordered part list. `s` = working px. `pose` defaults to neutral. */
export function buildSkeleton(config: SpriteConfig, s: number, pose: Pose = NEUTRAL_POSE): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const body = config.body ?? {};
  const ipose = body.pose ?? {};
  const outfit = config.outfit ?? {};
  const torsoMat = outfit.torso ?? 'cloth';
  const hasArmor = outfit.armor ?? false;
  const hasBelt = outfit.belt ?? true;
  const hat = outfit.hat ?? 'none';

  const headScale = (body.headScale ?? 1) * (1 + rng.jitter(0.04));
  const bodyWidth = (body.bodyWidth ?? 1) * (1 + rng.jitter(0.05));
  const limbLen = (body.limbLength ?? 1) * (1 + rng.jitter(0.05));
  const stanceBase = ipose.stance ?? 1;
  const facing = config.facing ?? 'front';

  const hairStyle = config.hairStyle ?? 'short';
  const hasCape = outfit.cape ?? false;

  const pal = config.palette ?? {};
  // Keep this defaultColor() call order unchanged — it fixes the seed→color
  // mapping. `cape`/`pants` derive from existing colors (no extra RNG draws)
  // so adding them doesn't shift any existing sprite.
  const col = {
    skin: pal.skin ?? defaultColor(rng, 'skin'),
    hair: pal.hair ?? defaultColor(rng, 'hair'),
    cloth: pal.cloth ?? defaultColor(rng, 'cloth'),
    leather: pal.leather ?? defaultColor(rng, 'leather'),
    metal: pal.metal ?? defaultColor(rng, 'metal'),
    hat: pal.hat ?? defaultColor(rng, 'hat'),
  };
  const capeCol = pal.cape ?? col.cloth;
  const pantsCol = pal.pants ?? col.leather; // default legs unchanged
  const M = {
    skin: MATERIALS.skin(col.skin),
    hair: MATERIALS.hair(col.hair),
    torso: MATERIALS[torsoMat](torsoMat === 'leather' ? col.leather : col.cloth),
    legs: MATERIALS.cloth(pantsCol),
    leather: MATERIALS.leather(col.leather),
    metal: MATERIALS.metal(col.metal),
    hat: MATERIALS[hat === 'hat' ? 'leather' : 'cloth'](col.hat),
    cape: MATERIALS.cloth(capeCol),
  };

  // --- Base layout (neutral pose), in working px. -------------------------
  const cx = s * 0.5;
  const headHw = s * 0.205 * headScale;
  const headHh = s * 0.185 * headScale;
  const headCy = s * 0.275;
  const headCorner = headHw * 0.55;

  const torsoTop = headCy + headHh * 0.86;
  const torsoBot = s * 0.66;
  const torsoCy = (torsoTop + torsoBot) / 2;
  const torsoHw = s * 0.125 * bodyWidth;
  const torsoHh = (torsoBot - torsoTop) / 2;

  const shoulderY = torsoTop + s * 0.01;
  const armHw = s * 0.036 * bodyWidth;
  const armHh = torsoHh * 0.7 * limbLen;
  const armCy = shoulderY + armHh;
  const armX = torsoHw + armHw * 0.55;

  const legHw = s * 0.05 * bodyWidth;
  const legHh = s * 0.06 * limbLen;
  const legCy = torsoBot + legHh - s * 0.005;
  const hipY = legCy - legHh;            // hip joint (top of leg)
  const legSpread = s * 0.058 * stanceBase;

  // --- Pose channels scaled to the working buffer. ------------------------
  const unit = s / 48;                    // offsets are authored at size 48
  const rootX = pose.rootX * unit;
  const rootY = pose.rootY * unit;
  const headBob = pose.headBob * unit;
  const lean = pose.torsoLean;
  const neckY = headCy + headHh;          // neck pivot (for head tilt)
  const pelX = cx, pelY = torsoBot;       // pelvis pivot (for torso lean)

  // Reusable transform groups ------------------------------------------------
  const xUpper: Xform = { pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY };
  const xHead = (): Xform => ({ jointAngle: pose.headTilt, jx: cx, jy: neckY, pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY + headBob });
  const xArm = (a: number, jx: number, jy: number): Xform => ({ jointAngle: a, jx, jy, pelvisRot: lean, px: pelX, py: pelY, tx: rootX, ty: rootY });
  const xLeg = (a: number, jx: number, jy: number): Xform => ({ jointAngle: a, jx, jy, tx: rootX, ty: rootY }); // legs ignore torso lean

  const parts: Part[] = [];

  /** Place an arbitrary SDF (with known local AABB) through an Xform. */
  const place = (mat: Part['material'], base: SDF, lx0: number, ly0: number, lx1: number, ly1: number, roundness: number, xf: Xform) => {
    let f = base;
    if (xf.jointAngle) f = rotatedAround(f, xf.jointAngle, xf.jx!, xf.jy!);
    if (xf.pelvisRot)  f = rotatedAround(f, xf.pelvisRot, xf.px!, xf.py!);
    if (xf.tx || xf.ty) f = translated(f, xf.tx || 0, xf.ty || 0);
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [cxn, cyn] of [[lx0, ly0], [lx1, ly0], [lx1, ly1], [lx0, ly1]]) {
      const [px2, py2] = fwd(cxn, cyn, xf);
      if (px2 < minx) minx = px2; if (px2 > maxx) maxx = px2;
      if (py2 < miny) miny = py2; if (py2 > maxy) maxy = py2;
    }
    parts.push({ material: mat, roundness, sdf: f, bbox: [Math.floor(minx - 2), Math.floor(miny - 2), Math.ceil(maxx + 2), Math.ceil(maxy + 2)] });
  };

  /** Convenience: place a rounded box centered at (bx,by). */
  const box = (mat: Part['material'], bx: number, by: number, hw: number, hh: number, r: number, roundness: number, xf: Xform) =>
    place(mat, roundedBox(bx, by, hw, hh, r), bx - hw, by - hh, bx + hw, by + hh, roundness, xf);

  // 0) CAPE — a flowing cloak behind the whole body. Drawn first so everything
  // overlaps it; leans with the torso. Flares slightly toward the hem.
  if (hasCape) {
    const capeTop = shoulderY + s * 0.01;
    const capeBot = legCy + legHh * 0.4;
    box(M.cape, cx, (capeTop + capeBot) / 2, torsoHw * 1.45, (capeBot - capeTop) / 2, s * 0.03, 0.5, xUpper);
  }

  // 1) HAIR BACK — crowns the head (behind it). Part of the head group.
  if (hairStyle !== 'bald' && (hat === 'none' || hat === 'cap')) {
    const back = hairStyle === 'long' ? headHh * 1.35 : headHh * 0.95;
    box(M.hair, cx, headCy - headHh * 0.18 + (hairStyle === 'long' ? headHh * 0.2 : 0), headHw * 1.06, back, headCorner * 0.9, 0.45, xHead());
  }

  // 2) LEGS / trousers + boots — swing about the hip.
  for (const dir of [-1, 1]) {
    const lx = cx + dir * legSpread;
    const ang = dir < 0 ? pose.legL : pose.legR;
    box(M.legs, lx, legCy, legHw, legHh, legHw * 0.45, 0.4, xLeg(ang, lx, hipY));
    box(M.leather, lx + dir * legHw * 0.15, legCy + legHh + s * 0.012, legHw * 1.05, s * 0.022, s * 0.012, 0.45, xLeg(ang, lx, hipY));
  }

  // 3) ARMS + hands — swing about the shoulder; follow torso lean.
  for (const dir of [-1, 1]) {
    const ax = cx + dir * armX;
    const ang = dir < 0 ? pose.armL : pose.armR;
    box(M.torso, ax, armCy, armHw, armHh, armHw * 0.5, 0.4, xArm(ang, ax, shoulderY));
    box(M.skin, ax, armCy + armHh + armHw * 0.2, armHw * 0.95, armHw * 0.9, armHw * 0.6, 0.5, xArm(ang, ax, shoulderY));
  }

  // 4) TORSO (upper-body: leans about the pelvis).
  box(M.torso, cx, torsoCy, torsoHw, torsoHh, s * 0.028, 0.4, xUpper);

  // 5) BELT.
  if (hasBelt) box(M.leather, cx, torsoBot - s * 0.03, torsoHw * 1.02, s * 0.02, s * 0.01, 0.4, xUpper);

  // 6) CHESTPLATE + pauldrons (optional). Pauldrons stay on the shoulders.
  if (hasArmor) {
    box(M.metal, cx, torsoTop + torsoHh * 0.62, torsoHw * 0.95, torsoHh * 0.6, s * 0.03, 0.55, xUpper);
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      box(M.metal, ax, shoulderY + armHw * 0.4, armHw * 1.25, armHw * 0.95, armHw * 0.7, 0.55, xUpper);
    }
  }

  // 7) HEAD.
  box(M.skin, cx, headCy, headHw, headHh, headCorner, 0.36, xHead());

  // 8) EYES — small dark blocks, low on the face. Skipped when facing away;
  // shifted toward the look direction for a 3/4 profile (geometry only, so
  // animation frames inherit the facing for free).
  if (config.face !== false && facing !== 'back') {
    const eyeY = headCy + headHh * 0.2;
    const lookSign = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    const eyeDx = lookSign === 0 ? headHw * 0.42 : headHw * 0.26; // closer together in profile
    const shift = lookSign * headHw * 0.3;                        // whole pair leans that way
    const ew = headHw * 0.13, eh = headHh * 0.2;
    const eyeMat = { ...M.skin, name: 'eye', base: [40, 34, 44] as RGB, specStrength: 0.7, roughness: 0.3 };
    for (const dir of [-1, 1]) box(eyeMat, cx + shift + dir * eyeDx, eyeY, ew, eh, ew * 0.5, 0.4, xHead());
  }

  // 9) HAIR FRONT — chunky fringe across the forehead. When facing away, the
  // back of the head reads as a full hair mass covering the (hidden) face.
  const showHair = hairStyle !== 'bald' && (hat === 'none' || hat === 'cap');
  if (showHair && facing === 'back') {
    box(M.hair, cx, headCy + headHh * 0.04, headHw * 0.96, headHh * 0.9, headCorner * 0.85, 0.42, xHead());
  } else if (showHair) {
    const fy = headCy - headHh * 0.52;
    const fr: SDF = union(
      roundedBox(cx, fy, headHw * 0.98, headHh * 0.34, headHw * 0.2),
      union(
        roundedBox(cx - headHw * 0.74, headCy - headHh * 0.12, headHw * 0.28, headHh * 0.5, headHw * 0.18),
        roundedBox(cx + headHw * 0.74, headCy - headHh * 0.12, headHw * 0.28, headHh * 0.5, headHw * 0.18),
      ),
    );
    place(M.hair, fr, cx - headHw * 1.05, headCy - headHh * 1.0, cx + headHw * 1.05, headCy + headHh * 0.45, 0.4, xHead());

    // Style extras (layered over the fringe).
    if (hairStyle === 'spiky') {
      // a row of upward spikes along the crown
      for (let k = -2; k <= 2; k++) {
        const sx = cx + k * headHw * 0.42;
        place(M.hair, capsule(sx, headCy - headHh * 0.7, sx + k * headHw * 0.08, headCy - headHh * 1.25, headHw * 0.13),
          sx - headHw * 0.3, headCy - headHh * 1.4, sx + headHw * 0.3, headCy - headHh * 0.5, 0.5, xHead());
      }
    } else if (hairStyle === 'bun') {
      // a tied bun on top
      box(M.hair, cx, headCy - headHh * 0.95, headHw * 0.42, headHh * 0.4, headHw * 0.4, 0.7, xHead());
    } else if (hairStyle === 'long') {
      // two long locks falling past the cheeks
      for (const dir of [-1, 1]) {
        box(M.hair, cx + dir * headHw * 0.92, headCy + headHh * 0.55, headHw * 0.22, headHh * 0.95, headHw * 0.18, 0.45, xHead());
      }
    }
  }

  // 10) HATS (head group).
  if (hat === 'cap') {
    box(M.hat, cx, headCy - headHh * 0.62, headHw * 1.02, headHh * 0.5, headHw * 0.5, 0.5, xHead());
    box(M.hat, cx, headCy - headHh * 0.32, headHw * 1.18, headHh * 0.12, s * 0.01, 0.4, xHead());
  } else if (hat === 'hat') {
    box(M.hat, cx, headCy - headHh * 0.78, headHw * 0.72, headHh * 0.5, headHw * 0.3, 0.45, xHead());
    box(M.hat, cx, headCy - headHh * 0.42, headHw * 1.55, headHh * 0.16, headHh * 0.12, 0.4, xHead());
  }

  // 11) HELD WEAPON — drawn last (on top) so it stays visible during attack
  // swings. Uses the same shoulder rotation transform as the right arm, so the
  // weapon swings with the arm automatically in every animation frame.
  const weapon = config.weapon ?? 'none';
  if (weapon !== 'none') {
    const ax = cx + armX;
    const handY = armCy + armHh + armHw * 1.1;
    const xf = xArm(pose.armR, ax, shoulderY);
    const guard = MATERIALS.metal([160, 140, 80]);

    if (weapon === 'dagger') {
      const bLen = s * 0.10;
      box(guard, ax, handY, s * 0.04, s * 0.008, s * 0.004, 0.5, xf);
      place(M.metal, capsule(ax, handY + s * 0.008, ax, handY + bLen, s * 0.016),
        ax - s * 0.03, handY - s * 0.01, ax + s * 0.03, handY + bLen + s * 0.02, 0.6, xf);
    } else if (weapon === 'sword') {
      const bLen = s * 0.20;
      box(guard, ax, handY, s * 0.06, s * 0.01, s * 0.006, 0.5, xf);
      place(M.metal, capsule(ax, handY + s * 0.01, ax, handY + bLen, s * 0.02),
        ax - s * 0.04, handY - s * 0.01, ax + s * 0.04, handY + bLen + s * 0.02, 0.6, xf);
      place(MATERIALS.metal([200, 210, 230]),
        capsule(ax + s * 0.008, handY + s * 0.04, ax + s * 0.008, handY + bLen - s * 0.02, Math.max(1, s * 0.004)),
        ax - s * 0.02, handY + s * 0.02, ax + s * 0.03, handY + bLen, 0.5, xf);
    } else if (weapon === 'axe') {
      const shaftLen = s * 0.18;
      place(M.leather, capsule(ax, handY - s * 0.02, ax, handY + shaftLen, s * 0.014),
        ax - s * 0.03, handY - s * 0.04, ax + s * 0.03, handY + shaftLen + s * 0.02, 0.7, xf);
      box(M.metal, ax + s * 0.04, handY + shaftLen * 0.15, s * 0.048, s * 0.058, s * 0.012, 0.5, xf);
    } else if (weapon === 'staff') {
      const staffLen = s * 0.28;
      place(M.leather, capsule(ax, handY - staffLen * 0.45, ax, handY + staffLen * 0.55, s * 0.012),
        ax - s * 0.025, handY - staffLen * 0.5, ax + s * 0.025, handY + staffLen * 0.6, 0.8, xf);
      const orbR = s * 0.026;
      const orbY = handY - staffLen * 0.45 - orbR;
      place(MATERIALS.gem([150, 70, 210]), circle(ax, orbY, orbR),
        ax - orbR - 2, orbY - orbR - 2, ax + orbR + 2, orbY + orbR + 2, 0.9, xf);
    }
  }

  // 12) SHIELD — round buckler on the left arm; follows left arm rotation.
  if (config.shield) {
    const shX = cx - armX;
    const shY = armCy;
    const xf = xArm(pose.armL, shX, shoulderY);
    const shR = s * 0.055;
    place(M.metal, circle(shX - s * 0.012, shY, shR),
      shX - shR - s * 0.02, shY - shR - 2, shX + shR + 2, shY + shR + 2, 0.55, xf);
    place(MATERIALS.metal([188, 183, 168]), circle(shX - s * 0.012, shY, shR * 0.35),
      shX - shR * 0.4 - s * 0.02, shY - shR * 0.4 - 2, shX + shR * 0.4 + 2, shY + shR * 0.4 + 2, 0.7, xf);
  }

  return parts;
}
