// =============================================================================
// pose.ts — the keyframe pose system that sits ON TOP of the static skeleton.
//
// A Pose is a flat set of numeric "joint channels". An animation is a list of
// keyframes (each a partial Pose at a normalized time t in [0,1]); sampling
// interpolates between the surrounding keyframes with easing to produce a full
// Pose for any phase. skeleton.ts consumes a Pose to place/rotate parts; the
// existing distance-field + lighting pass then renders that posed skeleton.
//
// TEMPORAL STABILITY: a Pose contains NO randomness. All per-character
// variation (proportions, colors) comes from config.seed inside skeleton.ts,
// which is identical for every frame. Only these deterministic joint numbers
// change frame to frame, so nothing "boils" between frames.
// =============================================================================

/**
 * Joint channels. Angles in radians; offsets in *logical* pixels (they are
 * scaled to the working buffer inside skeleton.ts). All default to 0 = the
 * neutral standing pose, which reproduces the original static sprite exactly.
 */
export interface Pose {
  rootX: number;   // whole-body horizontal translate
  rootY: number;   // whole-body vertical translate (bounce)
  headBob: number; // head vertical offset relative to body (breathing)
  headTilt: number;// head rotation about the neck
  armL: number;    // left shoulder swing (0 = arm hanging down, + = forward)
  armR: number;    // right shoulder swing
  legL: number;    // left hip swing (0 = leg down, + = steps that way)
  legR: number;    // right hip swing
  torsoLean: number; // torso rotation about the pelvis
}

export const NEUTRAL_POSE: Pose = {
  rootX: 0, rootY: 0, headBob: 0, headTilt: 0,
  armL: 0, armR: 0, legL: 0, legR: 0, torsoLean: 0,
};

const POSE_KEYS = Object.keys(NEUTRAL_POSE) as (keyof Pose)[];

export type Easing = 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';

/** A keyframe: a partial pose at normalized time t. Missing channels = 0. */
export interface Keyframe {
  t: number;          // 0..1 within the clip
  pose: Partial<Pose>;
  /** Easing used when interpolating FROM this keyframe to the next. */
  ease?: Easing;
}

export interface AnimationClip {
  name: string;
  fps: number;        // suggested playback rate
  loop: boolean;      // walk/idle loop; attack plays once
  frames: number;     // how many frames to bake
  keyframes: Keyframe[]; // must be sorted by t and span 0..1
}

// --- easing ----------------------------------------------------------------
function applyEase(e: Easing | undefined, x: number): number {
  switch (e) {
    case 'easeIn':  return x * x;
    case 'easeOut': return 1 - (1 - x) * (1 - x);
    case 'linear':  return x;
    case 'easeInOut':
    default:        return x * x * (3 - 2 * x); // smoothstep
  }
}

/** Resolve a keyframe's partial pose into a full Pose (missing = neutral 0). */
function fullPose(p: Partial<Pose>): Pose {
  return { ...NEUTRAL_POSE, ...p };
}

/**
 * Sample a full Pose at `phase` (0..1) from a clip.
 * Finds the bracketing keyframes, eases the local t, and lerps every channel.
 * Deterministic: same clip + same phase => same Pose.
 */
export function samplePose(clip: AnimationClip, phase: number): Pose {
  const ks = clip.keyframes;
  // wrap/clamp phase into [0,1]
  let ph = phase;
  if (clip.loop) ph = ((ph % 1) + 1) % 1;
  else ph = ph < 0 ? 0 : ph > 1 ? 1 : ph;

  // before first / after last keyframe → clamp to ends
  if (ph <= ks[0].t) return fullPose(ks[0].pose);
  if (ph >= ks[ks.length - 1].t) return fullPose(ks[ks.length - 1].pose);

  // find segment [a,b] with a.t <= ph <= b.t
  let a = ks[0], b = ks[ks.length - 1];
  for (let i = 0; i < ks.length - 1; i++) {
    if (ph >= ks[i].t && ph <= ks[i + 1].t) { a = ks[i]; b = ks[i + 1]; break; }
  }
  const span = b.t - a.t || 1e-6;
  const local = applyEase(a.ease, (ph - a.t) / span);

  const pa = fullPose(a.pose);
  const pb = fullPose(b.pose);
  const out = { ...NEUTRAL_POSE };
  for (const k of POSE_KEYS) out[k] = pa[k] + (pb[k] - pa[k]) * local;
  return out;
}

// =============================================================================
// Built-in clips. Authored as a few key poses; the sampler fills the in-betweens.
// =============================================================================

const D = Math.PI / 180; // degrees → radians helper

/** IDLE: gentle breathing — body sinks and rises, head bobs slightly. */
export const IDLE: AnimationClip = {
  name: 'idle', fps: 8, loop: true, frames: 4,
  keyframes: [
    { t: 0.0, pose: { rootY: 0.0, headBob: 0.0, armL: 3 * D, armR: -3 * D } },
    { t: 0.5, pose: { rootY: -0.8, headBob: -0.5, armL: 1 * D, armR: -1 * D } },
    { t: 1.0, pose: { rootY: 0.0, headBob: 0.0, armL: 3 * D, armR: -3 * D } },
  ],
};

/**
 * WALK: a 4-key cycle (contact-left, passing, contact-right, passing).
 * Legs swing in anti-phase, arms counter-swing, body bounces twice per loop.
 * In a front-facing chibi this reads as a stepping bob.
 */
export const WALK: AnimationClip = {
  name: 'walk', fps: 12, loop: true, frames: 8,
  keyframes: [
    // contact: both legs swing the SAME way (weight-shift sway) — a
    // front-facing chibi reads stepping as side-to-side weight transfer;
    // opposite-sign pairs at higher angles cross the legs into one blob.
    { t: 0.0,  pose: { legL: -9 * D, legR: -9 * D, armL: -12 * D, armR: 12 * D, rootY: 1 } },
    // passing: legs together under body, body lifts
    { t: 0.25, pose: { legL: 0, legR: 0, armL: 0, armR: 0, rootY: -1 } },
    // contact: mirrored
    { t: 0.5,  pose: { legL: 9 * D, legR: 9 * D, armL: 12 * D, armR: -12 * D, rootY: 1 } },
    // passing
    { t: 0.75, pose: { legL: 0, legR: 0, armL: 0, armR: 0, rootY: -1 } },
    { t: 1.0,  pose: { legL: -9 * D, legR: -9 * D, armL: -12 * D, armR: 12 * D, rootY: 1 } },
  ],
};

/**
 * ATTACK: a one-shot wind-up then strike with the RIGHT arm.
 * Wind-up eases out (anticipation), the strike eases in (snap), then settle.
 */
export const ATTACK: AnimationClip = {
  name: 'attack', fps: 14, loop: false, frames: 6,
  keyframes: [
    { t: 0.0,  pose: { armR: 0, torsoLean: 0 },                         ease: 'easeOut' },
    { t: 0.35, pose: { armR: -120 * D, torsoLean: -5 * D, headTilt: -4 * D }, ease: 'easeIn' }, // wind up (arm raised back)
    { t: 0.55, pose: { armR: 70 * D, torsoLean: 8 * D, headTilt: 3 * D }, ease: 'easeOut' },    // strike (arm swung forward/down)
    { t: 1.0,  pose: { armR: 0, torsoLean: 0, headTilt: 0 } },                                   // settle
  ],
};

/**
 * HIT: a sharp one-shot recoil — the body jolts back, head snaps, then settles.
 * Fast anticipation-free flinch (easeOut into the jolt, easeIn back).
 */
export const HIT: AnimationClip = {
  name: 'hit', fps: 16, loop: false, frames: 5,
  keyframes: [
    { t: 0.0, pose: { rootX: 0, headTilt: 0, torsoLean: 0 }, ease: 'easeOut' },
    { t: 0.25, pose: { rootX: -2.2, headTilt: 9 * D, torsoLean: 7 * D }, ease: 'easeIn' }, // knocked back
    { t: 1.0, pose: { rootX: 0, headTilt: 0, torsoLean: 0 } },                              // settle
  ],
};

/**
 * DEATH: a one-shot collapse — the body buckles, topples about the pelvis, the
 * head lolls and the whole thing sinks. Ends folded on the ground (held last
 * frame), so a dead body can just freeze on the final frame.
 */
export const DEATH: AnimationClip = {
  name: 'death', fps: 12, loop: false, frames: 7,
  keyframes: [
    { t: 0.0, pose: { torsoLean: 0, rootY: 0, headTilt: 0 }, ease: 'easeIn' },
    { t: 0.2, pose: { torsoLean: -10 * D, headTilt: -8 * D, rootY: -1 }, ease: 'easeOut' }, // brief stagger up
    { t: 0.6, pose: { torsoLean: 62 * D, headTilt: 40 * D, rootY: 3, legL: 22 * D, legR: -16 * D, armL: 30 * D, armR: -24 * D }, ease: 'easeIn' },
    { t: 1.0, pose: { torsoLean: 80 * D, headTilt: 55 * D, rootY: 5, legL: 26 * D, legR: -20 * D, armL: 38 * D, armR: -30 * D } }, // collapsed
  ],
};

/**
 * CAST: a one-shot spell/fishing cast motion — wind-up, thrust forward, settle.
 */
export const CAST: AnimationClip = {
  name: 'cast', fps: 12, loop: false, frames: 6,
  keyframes: [
    { t: 0.0,  pose: {} },                                                                          // neutral
    { t: 0.25, pose: { armR: -90 * D, torsoLean: -8 * D },                        ease: 'easeOut' }, // wind-up
    { t: 0.5,  pose: { armR: 60 * D, torsoLean: 12 * D, headTilt: 5 * D },        ease: 'easeIn' },  // cast forward
    { t: 1.0,  pose: {} },                                                                          // settle
  ],
};

/**
 * DODGE: a quick sidestep — shift, crouch, lean, then snap back.
 */
export const DODGE: AnimationClip = {
  name: 'dodge', fps: 16, loop: false, frames: 5,
  keyframes: [
    { t: 0.0, pose: {} },                                                                           // neutral
    { t: 0.3, pose: { rootX: -3, rootY: 1.5, torsoLean: -12 * D },                ease: 'easeOut' }, // sidestep
    { t: 1.0, pose: {} },                                                                           // back to neutral
  ],
};

export const CLIPS: Record<string, AnimationClip> = {
  idle: IDLE,
  walk: WALK,
  attack: ATTACK,
  hit: HIT,
  death: DEATH,
  cast: CAST,
  dodge: DODGE,
};

export type AnimationName = keyof typeof CLIPS;
