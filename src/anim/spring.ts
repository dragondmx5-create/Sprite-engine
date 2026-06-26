// =============================================================================
// anim/spring.ts — "juice": secondary motion as PURE functions of phase.
//
// Nothing here integrates state over time. Every helper is a closed-form
// function of the animation phase, so frame N is reproducible from phase alone
// and animated frames never "boil" (same guarantee as the static engine).
//
// The tricks that make pixel motion feel alive rather than robotic:
//   • follow-through / lag — a trailing part arrives a beat after the lead one
//   • overshoot & settle   — a damped wiggle so motion lands with weight
//   • squash & stretch      — volume-preserving deform on impact / extension
// =============================================================================

const TAU = Math.PI * 2;

/** Smooth 0..1 → 0..1 ease (smoothstep). */
export function smooth(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/**
 * Damped oscillation evaluated at normalized time `t` (0..1). Starts at 0,
 * swings with `freq` cycles, amplitude decaying by `decay`. Use for antennae
 * flicking, a tail settling, hair bouncing after a stop.
 */
export function damp(t: number, freq = 2, decay = 4): number {
  return Math.sin(t * TAU * freq) * Math.exp(-t * decay);
}

/**
 * A looping follow-through: the value of `lead` sampled a little earlier in the
 * cycle, so a trailing element repeats the lead's motion `lag` phase later.
 * `lead` must be periodic over phase∈[0,1).
 */
export function lag(lead: (phase: number) => number, phase: number, amount: number): number {
  let p = (phase - amount) % 1;
  if (p < 0) p += 1;
  return lead(p);
}

/**
 * Squash & stretch scale factors from a signed `amount`:
 *   amount > 0 → stretch tall+thin (e.g. mid-jump, reaching up)
 *   amount < 0 → squash short+wide (e.g. landing, impact)
 * Volume is roughly preserved (sx*sy ≈ 1), which is what sells the deform.
 */
export function squash(amount: number): { sx: number; sy: number } {
  const a = Math.max(-0.6, Math.min(0.6, amount));
  const sy = 1 + a;
  const sx = 1 / Math.sqrt(sy); // preserve area
  return { sx, sy };
}

/** A smooth 0→1→0 pulse peaking at `center`, width `w`. For one-shot accents. */
export function pulse(phase: number, center: number, w: number): number {
  const d = Math.abs(phase - center);
  if (d > w) return 0;
  return smooth(1 - d / w);
}

/** A clean looping sine in [-1,1], phase in cycles. */
export function wave(phase: number, cycles = 1, offset = 0): number {
  return Math.sin((phase * cycles + offset) * TAU);
}
