// =============================================================================
// anim/ik.ts — inverse kinematics, pure & deterministic.
//
// Two solvers, both side-effect free (no stored state → animation frames are a
// pure function of their inputs, so the engine's "no boiling" guarantee holds):
//
//   • solveTwoBone — analytic law-of-cosines IK for a single hip→knee→foot leg.
//     Fast, stable, no iteration. This is what plants a creature's foot on a
//     target and bends the knee the right way.
//   • fabrik       — Forward-And-Backward-Reaching IK for an N-link chain
//     (worm spine, a reaching arm). Iterative, converges in a few passes.
//
// All coordinates are in working-buffer pixels (+y down), matching shapes.ts.
// =============================================================================

export interface Pt { x: number; y: number; }

const hyp = Math.hypot;

/**
 * Analytic 2-bone IK. Given a fixed base, a desired foot target, and the two
 * bone lengths, return the knee (joint) and the reachable foot position.
 *
 * `bend` (+1 / -1) chooses which way the knee buckles — flip it per leg so legs
 * on opposite sides of the body bend outward, not into each other.
 *
 * If the target is out of reach the leg is straightened toward it (foot clamped
 * to max reach) rather than snapping, which reads naturally when a foot stretches
 * for far ground.
 */
export function solveTwoBone(
  base: Pt, target: Pt, l1: number, l2: number, bend: number,
): { knee: Pt; foot: Pt } {
  let dx = target.x - base.x;
  let dy = target.y - base.y;
  let dist = hyp(dx, dy) || 1e-6;

  const maxReach = l1 + l2;
  const minReach = Math.abs(l1 - l2);
  // Clamp the effective target distance into the leg's reachable annulus.
  const clamped = Math.max(minReach + 1e-4, Math.min(maxReach - 1e-4, dist));
  const ux = dx / dist, uy = dy / dist;
  const fx = base.x + ux * clamped;
  const fy = base.y + uy * clamped;

  // Law of cosines: angle at the base between bone 1 and the base→foot line.
  const cosA = (l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));

  // Direction base→foot, rotated by ±a, gives the knee.
  const baseAng = Math.atan2(fy - base.y, fx - base.x);
  const kneeAng = baseAng + bend * a;
  const knee: Pt = { x: base.x + Math.cos(kneeAng) * l1, y: base.y + Math.sin(kneeAng) * l1 };
  return { knee, foot: { x: fx, y: fy } };
}

/**
 * FABRIK for an N-link chain. `joints[0]` is pinned (the root); the chain tries
 * to touch `target` with its tip. Bone lengths are taken from the initial joint
 * spacing unless `lengths` is supplied. Returns a NEW array of joint positions
 * (input is not mutated), so it's safe to call per frame.
 *
 * Great for a worm spine following its head, or an arm reaching a strike point.
 */
export function fabrik(
  joints: Pt[], target: Pt, iterations = 8, lengths?: number[],
): Pt[] {
  const n = joints.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...joints[0] }];

  const L = lengths ?? joints.slice(1).map((p, i) => hyp(p.x - joints[i].x, p.y - joints[i].y) || 1e-6);
  const total = L.reduce((s, v) => s + v, 0);
  const root = { x: joints[0].x, y: joints[0].y };
  const p = joints.map((j) => ({ x: j.x, y: j.y }));

  // Target unreachable → stretch the whole chain straight toward it.
  const rootToTarget = hyp(target.x - root.x, target.y - root.y);
  if (rootToTarget > total) {
    const ux = (target.x - root.x) / (rootToTarget || 1e-6);
    const uy = (target.y - root.y) / (rootToTarget || 1e-6);
    p[0] = { ...root };
    for (let i = 1; i < n; i++) p[i] = { x: p[i - 1].x + ux * L[i - 1], y: p[i - 1].y + uy * L[i - 1] };
    return p;
  }

  for (let it = 0; it < iterations; it++) {
    // Backward: set tip to target, work toward root.
    p[n - 1] = { x: target.x, y: target.y };
    for (let i = n - 2; i >= 0; i--) {
      const dx = p[i].x - p[i + 1].x, dy = p[i].y - p[i + 1].y;
      const d = hyp(dx, dy) || 1e-6;
      const r = L[i] / d;
      p[i] = { x: p[i + 1].x + dx * r, y: p[i + 1].y + dy * r };
    }
    // Forward: pin root back, work toward tip.
    p[0] = { ...root };
    for (let i = 1; i < n; i++) {
      const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y;
      const d = hyp(dx, dy) || 1e-6;
      const r = L[i - 1] / d;
      p[i] = { x: p[i - 1].x + dx * r, y: p[i - 1].y + dy * r };
    }
    // Early out once the tip is essentially on target.
    if (hyp(p[n - 1].x - target.x, p[n - 1].y - target.y) < 1e-3) break;
  }
  return p;
}
