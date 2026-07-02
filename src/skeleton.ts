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
import { Part, SDF, roundedBox, capsule, circle, ellipse, union, rotatedAround, translated } from './shapes';
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
    case 'skin':    return hsv(rng.range(0.03, 0.09), rng.range(0.40, 0.58), rng.range(0.78, 0.92));
    case 'hair':    return hsv(rng.range(0.0, 1.0), rng.range(0.55, 0.90), rng.range(0.30, 0.72));
    case 'cloth':   return hsv(rng.range(0.0, 1.0), rng.range(0.62, 0.92), rng.range(0.52, 0.80));
    case 'leather': return hsv(rng.range(0.05, 0.10), rng.range(0.55, 0.75), rng.range(0.32, 0.52));
    case 'metal':   return hsv(rng.range(0.55, 0.62), rng.range(0.08, 0.16), rng.range(0.54, 0.68));
    case 'hat':     return hsv(rng.range(0.0, 1.0), rng.range(0.55, 0.88), rng.range(0.42, 0.72));
    default:        return [200, 200, 200];
  }
}

/**
 * Per-facing static lean bias + eye-look direction + front/back family, for
 * the 8-way compass. `lean` feeds the SAME `pelvisRot` channel torso lean
 * animation already uses, so every part that rotates with the upper body
 * (torso, arms, head, cape, shield, weapon) turns together automatically —
 * no separate rotation math needed per equipment piece.
 */
const FACING_INFO: Record<string, { lean: number; look: -1 | 0 | 1; back: boolean }> = {
  front:          { lean: 0,     look: 0,  back: false },
  'front-right':  { lean: 0.13,  look: 1,  back: false },
  right:          { lean: 0.22,  look: 1,  back: false },
  'back-right':   { lean: 0.13,  look: 1,  back: true },
  back:           { lean: 0,     look: 0,  back: true },
  'back-left':    { lean: -0.13, look: -1, back: true },
  left:           { lean: -0.22, look: -1, back: false },
  'front-left':   { lean: -0.13, look: -1, back: false },
};

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
export function buildSkeleton(config: SpriteConfig, s: number, pose: Pose = NEUTRAL_POSE, ss = 1): Part[] {
  const rng = new RNG(config.seed ?? 0);
  const body = config.body ?? {};
  const ipose = body.pose ?? {};
  const outfit = config.outfit ?? {};
  const torsoMat = outfit.torso ?? 'cloth';
  const hasArmor = outfit.armor ?? false;
  const hasBelt = outfit.belt ?? true;
  const hat = outfit.hat ?? 'none';
  const hasCoat = outfit.coat ?? false;
  const hasBoots = outfit.boots ?? false;

  const hasGloves = outfit.gloves ?? false;
  const hasScarf = outfit.scarf ?? false;
  const hasShoulderpads = outfit.shoulderpad ?? false;

  const headScale = (body.headScale ?? 1) * (1 + rng.jitter(0.04));
  const bodyWidth = (body.bodyWidth ?? 1) * (1 + rng.jitter(0.05));
  const limbLen = (body.limbLength ?? 1) * (1 + rng.jitter(0.05));
  const stanceBase = ipose.stance ?? 1;
  const facing = config.facing ?? 'front';
  const facingInfo = FACING_INFO[facing] ?? FACING_INFO.front;
  const isBackFacing = facingInfo.back;

  const hairStyle = config.hairStyle ?? 'short';
  const hasCape = outfit.cape ?? false;

  const pal = config.palette ?? {};
  const col = {
    skin: pal.skin ?? defaultColor(rng, 'skin'),
    hair: pal.hair ?? defaultColor(rng, 'hair'),
    cloth: pal.cloth ?? defaultColor(rng, 'cloth'),
    leather: pal.leather ?? defaultColor(rng, 'leather'),
    metal: pal.metal ?? defaultColor(rng, 'metal'),
    hat: pal.hat ?? defaultColor(rng, 'hat'),
  };
  const capeCol = pal.cape ?? col.cloth;
  const pantsCol = pal.pants ?? col.leather;
  const accentCol = pal.accent ?? [Math.min(255, col.cloth[0] + 50), Math.min(255, col.cloth[1] + 40), Math.min(255, col.cloth[2] + 30)] as RGB;

  const torsoMatName = (torsoMat === 'leather' || torsoMat === 'vest') ? 'leather'
    : torsoMat === 'chainmail' ? 'metal' : 'cloth';
  const torsoColor = torsoMatName === 'leather' ? col.leather
    : torsoMatName === 'metal' ? col.metal : col.cloth;
  const hatMatName = (hat === 'hat' || hat === 'helmet') ? 'leather'
    : hat === 'crown' ? 'metal' : 'cloth';

  const M = {
    skin: MATERIALS.skin(col.skin),
    hair: MATERIALS.hair(col.hair),
    torso: MATERIALS[torsoMatName](torsoColor),
    legs: MATERIALS.cloth(pantsCol),
    leather: MATERIALS.leather(col.leather),
    metal: MATERIALS.metal(col.metal),
    hat: MATERIALS[hatMatName](hat === 'crown' ? col.metal : col.hat),
    cape: MATERIALS.cloth(capeCol),
    accent: MATERIALS.cloth(accentCol),
    gold: MATERIALS.gold([220, 195, 80]),
    gem: MATERIALS.gem([150, 70, 210]),
  };

  // --- Base layout (neutral pose), in working px. -------------------------
  const cx = s * 0.5;
  const headHw = s * 0.21 * headScale;
  const headHh = s * 0.19 * headScale;
  const headCy = s * 0.27;
  const headCorner = headHw * 0.72;

  const torsoTop = headCy + headHh * 0.82;
  const torsoBot = s * 0.65;
  const torsoCy = (torsoTop + torsoBot) / 2;
  const torsoHw = s * 0.12 * bodyWidth;
  const torsoHh = (torsoBot - torsoTop) / 2;

  const shoulderY = torsoTop + s * 0.01;
  const armHw = s * 0.034 * bodyWidth;
  const armHh = torsoHh * 0.72 * limbLen;
  const armCy = shoulderY + armHh;
  const armX = torsoHw + armHw * 0.6;

  const legHw = s * 0.046 * bodyWidth;
  const legHh = s * 0.065 * limbLen;
  const legCy = torsoBot + legHh - s * 0.005;
  const hipY = legCy - legHh;            // hip joint (top of leg)
  const legSpread = s * 0.054 * stanceBase;

  // --- Pose channels scaled to the working buffer. ------------------------
  const unit = s / 48;                    // offsets are authored at size 48
  // Snap translations to whole output pixels (multiples of ss in the working
  // buffer): sub-pixel drift + downsample makes 2px features like eyes fade
  // out on some frames, which reads as the face "flickering" during walks.
  const snap = (v: number) => Math.round(v / ss) * ss;
  const rootX = snap(pose.rootX * unit);
  const rootY = snap(pose.rootY * unit);
  const headBob = snap(pose.headBob * unit);
  const lean = pose.torsoLean + facingInfo.lean;
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

  /** Convenience: place an ellipse centered at (ex,ey). */
  const placeEllipse = (mat: Part['material'], ex: number, ey: number, rx: number, ry: number, roundness: number, xf: Xform) =>
    place(mat, ellipse(ex, ey, rx, ry), ex - rx, ey - ry, ex + rx, ey + ry, roundness, xf);

  // -1) GROUND SHADOW — dark ellipse under the character's feet, gives 3/4 depth.
  const shadowY = legCy + legHh + s * 0.03;
  const shadowMat = MATERIALS.bone([30, 28, 24]);
  placeEllipse(shadowMat, cx, shadowY, s * 0.15, s * 0.04, 0.05,
    { tx: rootX, ty: rootY });

  // 0) CAPE — a flowing cloak behind the whole body. Drawn first so everything
  // overlaps it; leans with the torso. Flares slightly toward the hem.
  // Exception: back-facing family → the cape is nearest the viewer, drawn after the body.
  const drawCapeEarly = hasCape && !isBackFacing;
  const placeCape = () => {
    const capeTop = shoulderY + s * 0.01;
    const capeBot = legCy + legHh * 0.4;
    box(M.cape, cx, (capeTop + capeBot) / 2, torsoHw * 1.45, (capeBot - capeTop) / 2, s * 0.03, 0.5, xUpper);
  };
  if (drawCapeEarly) placeCape();

  // 1) HAIR BACK — crowns the head (behind it). Part of the head group.
  const hairHidden = hat === 'hat' || hat === 'hood';
  if (hairStyle !== 'bald' && !hairHidden) {
    const isLong = hairStyle === 'long' || hairStyle === 'flowing';
    const back = isLong ? headHh * 1.35 : headHh * 0.95;
    box(M.hair, cx, headCy - headHh * 0.18 + (isLong ? headHh * 0.2 : 0), headHw * 1.06, back, headCorner * 0.9, 0.45, xHead());
    // Long-style masses that fall BEHIND the head/body — drawn here (back
    // layer) so they never cover the face.
    if (hairStyle === 'flowing') {
      // wide curtain flowing past the shoulders
      box(M.hair, cx, headCy + headHh * 0.6, headHw * 1.12, headHh * 1.6, headHw * 0.3, 0.5, xHead());
    } else if (hairStyle === 'ponytail') {
      // the tail swings out past the side of the head and falls to the shoulder
      place(M.hair, capsule(cx + headHw * 0.45, headCy - headHh * 0.75, cx + headHw * 1.05, headCy + headHh * 0.95, headHw * 0.18),
        cx + headHw * 0.2, headCy - headHh * 1.0, cx + headHw * 1.3, headCy + headHh * 1.2, 0.5, xHead());
    }
  }

  // 2) LEGS / trousers + boots — swing about the hip.
  for (const dir of [-1, 1]) {
    const lx = cx + dir * legSpread;
    const ang = dir < 0 ? pose.legL : pose.legR;
    box(M.legs, lx, legCy, legHw, legHh, legHw * 0.45, 0.4, xLeg(ang, lx, hipY));
    if (hasBoots) {
      const bootTop = legCy + legHh * 0.15;
      const bootBot = legCy + legHh + s * 0.018;
      const bootHh = (bootBot - bootTop) / 2;
      box(M.leather, lx, (bootTop + bootBot) / 2, legHw * 1.08, bootHh, legHw * 0.4, 0.45, xLeg(ang, lx, hipY));
      // boot sole — wider & flatter for 3/4 footprint
      placeEllipse(M.leather, lx, bootBot + s * 0.005, legHw * 1.22, s * 0.014, 0.3, xLeg(ang, lx, hipY));
    } else {
      // shoe — wider ellipse for 3/4 footprint look
      placeEllipse(M.leather, lx + dir * legHw * 0.1, legCy + legHh + s * 0.012, legHw * 1.15, s * 0.022, 0.35, xLeg(ang, lx, hipY));
    }
  }

  // 3) ARMS + hands — swing about the shoulder; follow torso lean.
  for (const dir of [-1, 1]) {
    const ax = cx + dir * armX;
    const ang = dir < 0 ? pose.armL : pose.armR;
    const armMat = torsoMat === 'vest' ? M.skin : M.torso;
    box(armMat, ax, armCy, armHw, armHh, armHw * 0.5, 0.4, xArm(ang, ax, shoulderY));
    // hands (or gloves)
    if (hasGloves) {
      box(M.leather, ax, armCy + armHh + armHw * 0.2, armHw * 1.02, armHw * 1.0, armHw * 0.55, 0.5, xArm(ang, ax, shoulderY));
    } else {
      box(M.skin, ax, armCy + armHh + armHw * 0.2, armHw * 0.95, armHw * 0.9, armHw * 0.6, 0.5, xArm(ang, ax, shoulderY));
    }
  }

  // 4) TORSO (upper-body: leans about the pelvis).
  box(M.torso, cx, torsoCy, torsoHw, torsoHh, s * 0.028, 0.4, xUpper);
  // accent trim — neckline stripe
  box(M.accent, cx, torsoTop + s * 0.02, torsoHw * 0.7, s * 0.008, s * 0.005, 0.35, xUpper);

  // 4b) ROBE — full-length cloth garment for casters.
  if (torsoMat === 'robe') {
    const robeBot = legCy + legHh * 0.8;
    const robeHh = (robeBot - torsoTop) / 2;
    const robeCy = (torsoTop + robeBot) / 2;
    box(M.torso, cx, robeCy, torsoHw * 1.2, robeHh, s * 0.03, 0.4, xUpper);
    // robe hem accent
    box(M.accent, cx, robeBot - s * 0.005, torsoHw * 1.25, s * 0.01, s * 0.006, 0.35, xUpper);
    // center seam
    box(M.accent, cx, robeCy + robeHh * 0.3, s * 0.008, robeHh * 0.5, s * 0.004, 0.3, xUpper);
    // wide sleeves (drawn over arms)
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      const ang = dir < 0 ? pose.armL : pose.armR;
      box(M.torso, ax, armCy + armHh * 0.3, armHw * 1.5, armHh * 0.7, armHw * 0.4, 0.45, xArm(ang, ax, shoulderY));
    }
  }

  // 4c) CHAINMAIL texture — metal links over torso.
  if (torsoMat === 'chainmail') {
    const chainCol: RGB = [col.metal[0] * 0.8, col.metal[1] * 0.8, col.metal[2] * 0.85];
    const chainMat = MATERIALS.metal(chainCol);
    box(chainMat, cx, torsoCy + torsoHh * 0.1, torsoHw * 0.85, torsoHh * 0.7, s * 0.02, 0.5, xUpper);
  }

  // 4d) VEST — sleeveless, shorter, open front.
  if (torsoMat === 'vest') {
    box(M.accent, cx, torsoTop + torsoHh * 0.2, s * 0.01, torsoHh * 0.6, s * 0.004, 0.3, xUpper);
  }

  // 4e) SHOULDER TOPS — bright ellipse on top of each shoulder for 3/4 depth.
  {
    const shoulderTopCol: RGB = [
      Math.min(255, torsoColor[0] * 1.15),
      Math.min(255, torsoColor[1] * 1.15),
      Math.min(255, torsoColor[2] * 1.12),
    ];
    const shoulderTopMat = MATERIALS[torsoMatName](shoulderTopCol);
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      placeEllipse(shoulderTopMat, ax, shoulderY - s * 0.005, armHw * 1.2, armHw * 0.45, 0.35, xUpper);
    }
  }

  // 5) BELT.
  if (hasBelt) {
    box(M.leather, cx, torsoBot - s * 0.03, torsoHw * 1.02, s * 0.02, s * 0.01, 0.4, xUpper);
    // belt buckle
    box(M.gold, cx, torsoBot - s * 0.03, s * 0.015, s * 0.015, s * 0.006, 0.55, xUpper);
  }

  // 5b) COAT — extends the torso down over the upper legs, flared at the hem.
  if (hasCoat) {
    const coatTop = torsoTop;
    const coatBot = legCy + legHh * 0.35;
    const coatHh = (coatBot - coatTop) / 2;
    const coatCy = (coatTop + coatBot) / 2;
    box(M.torso, cx, coatCy, torsoHw * 1.15, coatHh, s * 0.03, 0.4, xUpper);
    // collar
    box(M.torso, cx, torsoTop + s * 0.01, torsoHw * 0.65, s * 0.025, s * 0.015, 0.5, xUpper);
    // coat hem flare + accent trim
    box(M.accent, cx, coatBot - s * 0.01, torsoHw * 1.28, s * 0.014, s * 0.008, 0.35, xUpper);
  }

  // 5c) SCARF — wrapped around the neck.
  if (hasScarf) {
    box(M.accent, cx, torsoTop - s * 0.01, torsoHw * 0.72, s * 0.028, s * 0.015, 0.55, xUpper);
    // dangling end
    box(M.accent, cx + torsoHw * 0.35, torsoTop + s * 0.03, s * 0.018, s * 0.04, s * 0.008, 0.45, xUpper);
  }

  // 5d) SHOULDER PADS — decorative pads (non-armor).
  if (hasShoulderpads && !hasArmor) {
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      box(M.accent, ax, shoulderY + armHw * 0.2, armHw * 1.3, armHw * 0.65, armHw * 0.5, 0.5, xUpper);
    }
  }

  // 6) CHESTPLATE + pauldrons (optional). Pauldrons stay on the shoulders.
  if (hasArmor) {
    box(M.metal, cx, torsoTop + torsoHh * 0.62, torsoHw * 0.95, torsoHh * 0.6, s * 0.03, 0.55, xUpper);
    for (const dir of [-1, 1]) {
      const ax = cx + dir * armX;
      box(M.metal, ax, shoulderY + armHw * 0.4, armHw * 1.25, armHw * 0.95, armHw * 0.7, 0.55, xUpper);
    }
  }

  // 7) HEAD.
  box(M.skin, cx, headCy, headHw, headHh, headCorner, 0.52, xHead());

  // 7b) HEAD TOP — bright ellipse on the crown for 3/4 top-down feel.
  {
    const headTopCol: RGB = [
      Math.min(255, col.skin[0] * 1.12),
      Math.min(255, col.skin[1] * 1.10),
      Math.min(255, col.skin[2] * 1.08),
    ];
    placeEllipse(MATERIALS.skin(headTopCol), cx, headCy - headHh * 0.55, headHw * 0.75, headHh * 0.25, 0.35, xHead());
  }

  // 8) EYES — small dark blocks, low on the face. Skipped when facing away;
  // shifted toward the look direction for a 3/4 profile (geometry only, so
  // animation frames inherit the facing for free). Kept as a closure so the
  // hood can re-draw them after it paints over the face.
  const drawEyes = () => {
    const eyeY = headCy + headHh * 0.30;
    const lookSign = facingInfo.look;
    const eyeDx = lookSign === 0 ? headHw * 0.42 : headHw * 0.26; // closer together in profile
    const shift = lookSign * headHw * 0.3;                        // whole pair leans that way
    const ew = headHw * 0.13, eh = headHh * 0.2;
    const eyeMat = { ...M.skin, name: 'eye', base: [40, 34, 44] as RGB, specStrength: 0.7, roughness: 0.3 };
    for (const dir of [-1, 1]) box(eyeMat, cx + shift + dir * eyeDx, eyeY, ew, eh, ew * 0.5, 0.4, xHead());
  };
  if (config.face !== false && !isBackFacing) drawEyes();

  // 9) HAIR FRONT — chunky fringe across the forehead. When facing away, the
  // back of the head reads as a full hair mass covering the (hidden) face.
  const showHair = hairStyle !== 'bald' && !hairHidden;
  if (showHair && isBackFacing) {
    box(M.hair, cx, headCy + headHh * 0.04, headHw * 0.96, headHh * 0.9, headCorner * 0.85, 0.42, xHead());
  } else if (showHair) {
    // 3/4 view: wider cap covers the crown visible from above, sideburns frame face
    const fy = headCy - headHh * 0.48;
    const fr: SDF = union(
      roundedBox(cx, fy, headHw * 1.04, headHh * 0.40, headHw * 0.22),
      union(
        // sideburns hug the skull and extend up under the fringe/cap so they
        // never read as detached blobs when headwear hides the top band
        roundedBox(cx - headHw * 0.70, headCy - headHh * 0.20, headHw * 0.26, headHh * 0.58, headHw * 0.16),
        roundedBox(cx + headHw * 0.70, headCy - headHh * 0.20, headHw * 0.26, headHh * 0.58, headHw * 0.16),
      ),
    );
    place(M.hair, fr, cx - headHw * 1.10, headCy - headHh * 1.0, cx + headHw * 1.10, headCy + headHh * 0.50, 0.4, xHead());

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
    } else if (hairStyle === 'flowing') {
      // long feminine hair — the wide curtain is drawn in the back layer
      // (step 1); here only the soft side locks framing the face
      for (const dir of [-1, 1]) {
        box(M.hair, cx + dir * headHw * 0.85, headCy + headHh * 0.3, headHw * 0.26, headHh * 1.1, headHw * 0.2, 0.5, xHead());
      }
    } else if (hairStyle === 'ponytail') {
      // high ponytail — a tied knot at the crown; the tail itself is drawn in
      // the back layer (step 1) so it never sweeps across the face
      box(M.hair, cx, headCy - headHh * 0.85, headHw * 0.34, headHh * 0.32, headHw * 0.3, 0.7, xHead());
    }
  }

  // 10) HATS (head group).
  if (hat === 'cap') {
    box(M.hat, cx, headCy - headHh * 0.62, headHw * 1.02, headHh * 0.5, headHw * 0.5, 0.5, xHead());
    box(M.hat, cx, headCy - headHh * 0.32, headHw * 1.18, headHh * 0.12, s * 0.01, 0.4, xHead());
  } else if (hat === 'hat') {
    box(M.hat, cx, headCy - headHh * 0.78, headHw * 0.72, headHh * 0.5, headHw * 0.3, 0.45, xHead());
    box(M.hat, cx, headCy - headHh * 0.42, headHw * 1.55, headHh * 0.16, headHh * 0.12, 0.4, xHead());
  } else if (hat === 'hood') {
    box(M.cape, cx, headCy - headHh * 0.3, headHw * 1.18, headHh * 0.9, headHw * 0.7, 0.6, xHead());
    for (const dir of [-1, 1]) {
      box(M.cape, cx + dir * headHw * 0.85, headCy + headHh * 0.2, headHw * 0.28, headHh * 0.65, headHw * 0.2, 0.5, xHead());
    }
    // face opening — the hood is opaque and covers the face drawn in steps 7-8,
    // so re-expose a skin window and the eyes inside the hood rim.
    if (!isBackFacing) {
      box(M.skin, cx, headCy + headHh * 0.18, headHw * 0.7, headHh * 0.52, headHw * 0.32, 0.52, xHead());
      if (config.face !== false) drawEyes();
    }
  } else if (hat === 'wizard') {
    // tall pointed wizard/mage hat with a bent tip
    box(M.hat, cx, headCy - headHh * 0.5, headHw * 1.06, headHh * 0.35, headHw * 0.4, 0.45, xHead());
    // cone
    place(M.hat, capsule(cx, headCy - headHh * 0.75, cx + headHw * 0.3, headCy - headHh * 2.0, headHw * 0.45),
      cx - headHw * 0.6, headCy - headHh * 2.3, cx + headHw * 0.9, headCy - headHh * 0.5, 0.55, xHead());
    // brim
    box(M.hat, cx, headCy - headHh * 0.3, headHw * 1.45, headHh * 0.1, headHh * 0.08, 0.4, xHead());
    // accent band
    box(M.accent, cx, headCy - headHh * 0.62, headHw * 0.9, s * 0.01, s * 0.005, 0.4, xHead());
    // star/gem on front
    place(M.gem, circle(cx, headCy - headHh * 0.75, s * 0.018),
      cx - s * 0.03, headCy - headHh * 0.8, cx + s * 0.03, headCy - headHh * 0.65, 0.9, xHead());
  } else if (hat === 'crown') {
    // royal crown with points and gems
    box(M.hat, cx, headCy - headHh * 0.55, headHw * 1.0, headHh * 0.25, headHw * 0.2, 0.4, xHead());
    // crown points
    for (let k = -1; k <= 1; k++) {
      const px = cx + k * headHw * 0.5;
      place(M.hat, capsule(px, headCy - headHh * 0.7, px, headCy - headHh * 1.1, headHw * 0.14),
        px - headHw * 0.2, headCy - headHh * 1.3, px + headHw * 0.2, headCy - headHh * 0.6, 0.55, xHead());
    }
    // gem in center point
    place(M.gem, circle(cx, headCy - headHh * 0.75, s * 0.015),
      cx - s * 0.025, headCy - headHh * 0.8, cx + s * 0.025, headCy - headHh * 0.68, 0.9, xHead());
  } else if (hat === 'helmet') {
    // full metal helmet (warrior)
    box(M.metal, cx, headCy - headHh * 0.15, headHw * 1.12, headHh * 0.95, headHw * 0.6, 0.55, xHead());
    // visor slit
    const visorMat = { ...M.metal, base: [30, 28, 25] as RGB };
    box(visorMat, cx, headCy + headHh * 0.15, headHw * 0.75, headHh * 0.1, s * 0.008, 0.3, xHead());
    // nose guard
    box(M.metal, cx, headCy + headHh * 0.05, s * 0.012, headHh * 0.3, s * 0.006, 0.4, xHead());
    // crest ridge
    box(M.metal, cx, headCy - headHh * 0.6, headHw * 0.15, headHh * 0.35, headHw * 0.12, 0.5, xHead());
  } else if (hat === 'bandana') {
    // rogue-style bandana tied at the back
    box(M.hat, cx, headCy - headHh * 0.45, headHw * 1.08, headHh * 0.35, headHw * 0.45, 0.5, xHead());
    // tied knot tails at back
    place(M.hat, capsule(cx + headHw * 0.7, headCy - headHh * 0.3, cx + headHw * 1.2, headCy + headHh * 0.1, headHw * 0.12),
      cx + headHw * 0.5, headCy - headHh * 0.5, cx + headHw * 1.4, headCy + headHh * 0.3, 0.5, xHead());
    place(M.hat, capsule(cx + headHw * 0.7, headCy - headHh * 0.25, cx + headHw * 1.1, headCy + headHh * 0.3, headHw * 0.1),
      cx + headHw * 0.5, headCy - headHh * 0.4, cx + headHw * 1.3, headCy + headHh * 0.5, 0.45, xHead());
  }

  // 10b) CAPE for back-facing family — drawn after hair/hat so it covers the body.
  if (hasCape && isBackFacing) placeCape();

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

    } else if (weapon === 'bow') {
      const bowH = s * 0.22;
      const bowCx = ax + s * 0.02;
      place(M.leather, capsule(bowCx, handY - bowH * 0.5, bowCx + s * 0.04, handY - bowH * 0.15, s * 0.010),
        bowCx - s * 0.02, handY - bowH * 0.55, bowCx + s * 0.07, handY - bowH * 0.1, 0.7, xf);
      place(M.leather, capsule(bowCx, handY + bowH * 0.5, bowCx + s * 0.04, handY + bowH * 0.15, s * 0.010),
        bowCx - s * 0.02, handY + bowH * 0.1, bowCx + s * 0.07, handY + bowH * 0.55, 0.7, xf);
      place(M.leather, capsule(bowCx + s * 0.04, handY - bowH * 0.15, bowCx + s * 0.05, handY + bowH * 0.15, s * 0.008),
        bowCx + s * 0.02, handY - bowH * 0.2, bowCx + s * 0.07, handY + bowH * 0.2, 0.7, xf);
      place(MATERIALS.cloth([220, 220, 210]), capsule(bowCx, handY - bowH * 0.48, bowCx, handY + bowH * 0.48, Math.max(1, s * 0.003)),
        bowCx - s * 0.01, handY - bowH * 0.52, bowCx + s * 0.01, handY + bowH * 0.52, 0.4, xf);

    } else if (weapon === 'mace') {
      const shaftLen = s * 0.16;
      place(M.leather, capsule(ax, handY - s * 0.01, ax, handY + shaftLen, s * 0.013),
        ax - s * 0.025, handY - s * 0.03, ax + s * 0.025, handY + shaftLen + s * 0.02, 0.7, xf);
      const headY = handY + shaftLen;
      const headR = s * 0.038;
      place(M.metal, circle(ax, headY, headR),
        ax - headR - 2, headY - headR - 2, ax + headR + 2, headY + headR + 2, 0.5, xf);
      const spikeLen = s * 0.018;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const sx = ax + Math.cos(a) * (headR + spikeLen * 0.3);
        const sy = headY + Math.sin(a) * (headR + spikeLen * 0.3);
        place(M.metal, circle(sx, sy, Math.max(1.2, spikeLen * 0.6)),
          sx - spikeLen, sy - spikeLen, sx + spikeLen, sy + spikeLen, 0.4, xf);
      }

    } else if (weapon === 'wand') {
      const wandLen = s * 0.16;
      place(M.leather, capsule(ax, handY - s * 0.01, ax, handY + wandLen, s * 0.009),
        ax - s * 0.02, handY - s * 0.03, ax + s * 0.02, handY + wandLen + s * 0.01, 0.7, xf);
      const tipR = s * 0.018;
      const tipY = handY + wandLen;
      place(MATERIALS.gem([100, 200, 255]), circle(ax, tipY, tipR),
        ax - tipR - 2, tipY - tipR - 2, ax + tipR + 2, tipY + tipR + 2, 0.85, xf);
      const starR = tipR * 0.5;
      place(MATERIALS.gem([200, 240, 255]), circle(ax, tipY, starR),
        ax - starR - 1, tipY - starR - 1, ax + starR + 1, tipY + starR + 1, 0.95, xf);

    } else if (weapon === 'hammer') {
      const shaftLen = s * 0.20;
      place(M.leather, capsule(ax, handY - s * 0.02, ax, handY + shaftLen, s * 0.014),
        ax - s * 0.03, handY - s * 0.04, ax + s * 0.03, handY + shaftLen + s * 0.02, 0.7, xf);
      const headW = s * 0.065;
      const headH = s * 0.040;
      const headY = handY + shaftLen * 0.05;
      box(M.metal, ax, headY, headW, headH, s * 0.012, 0.45, xf);

    } else if (weapon === 'fishing_rod') {
      // Long thin rod (longer than staff)
      const rodLen = s * 0.30;
      place(M.leather, capsule(ax, handY - rodLen * 0.35, ax, handY + rodLen * 0.65, s * 0.010),
        ax - s * 0.02, handY - rodLen * 0.4, ax + s * 0.02, handY + rodLen * 0.7, 0.8, xf);
      // Thin fishing line dangling from the tip
      const tipY = handY - rodLen * 0.35;
      const lineBot = tipY + s * 0.18;
      const lineMat = MATERIALS.cloth([200, 200, 190]);
      place(lineMat, capsule(ax, tipY, ax + s * 0.02, lineBot, Math.max(1, s * 0.003)),
        ax - s * 0.01, tipY - s * 0.01, ax + s * 0.04, lineBot + s * 0.01, 0.4, xf);
      // Small hook at end of line
      const hookR = Math.max(1.2, s * 0.008);
      place(M.metal, circle(ax + s * 0.02, lineBot, hookR),
        ax + s * 0.02 - hookR - 2, lineBot - hookR - 2, ax + s * 0.02 + hookR + 2, lineBot + hookR + 2, 0.6, xf);
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
