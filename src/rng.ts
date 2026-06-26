// =============================================================================
// rng.ts — deterministic pseudo-randomness.
// All variation in the engine flows through here, so seed+config fully
// determines the output.
// =============================================================================

/** FNV-1a hash → 32-bit uint. Lets us seed from strings or numbers uniformly. */
export function hashSeed(seed: number | string): number {
  const s = typeof seed === 'number' ? seed.toString() : seed;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // h *= 16777619, kept in 32-bit via Math.imul
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: tiny, fast, well-distributed 32-bit PRNG. */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience wrapper with the helpers the builders need. */
export class RNG {
  private next: () => number;
  constructor(seed: number | string) {
    this.next = mulberry32(hashSeed(seed));
  }
  /** Uniform float in [0,1). */
  float(): number {
    return this.next();
  }
  /** Uniform float in [min,max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  /** Symmetric jitter in [-amt, +amt]. */
  jitter(amt: number): number {
    return (this.next() * 2 - 1) * amt;
  }
  /** Pick one element. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
