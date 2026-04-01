/**
 * Seeded PRNG — mulberry32 algorithm.
 * Deterministic: same seed always produces the same sequence.
 * Must be used for ALL simulation randomness (never Math.random() in engine code).
 */

export interface SeededRng {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] (inclusive) */
  nextInt(min: number, max: number): number;
  /** Pick a random element from an array (returns undefined if empty) */
  pick<T>(arr: readonly T[]): T | undefined;
  /** Shuffle an array (returns a new array) */
  shuffle<T>(arr: readonly T[]): T[];
  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number;
  /** Returns true with the given probability (0–1) */
  chance(probability: number): boolean;
  /** Current seed state (for serialization) */
  readonly state: number;
}

/**
 * Create a seeded PRNG using the mulberry32 algorithm.
 * Produces identical sequences across all JS engines for the same seed.
 */
export function createRng(seed: number): SeededRng {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,

    nextInt(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    pick<T>(arr: readonly T[]): T | undefined {
      if (arr.length === 0) return undefined;
      return arr[Math.floor(next() * arr.length)];
    },

    shuffle<T>(arr: readonly T[]): T[] {
      const result = arr.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },

    nextFloat(min: number, max: number): number {
      return next() * (max - min) + min;
    },

    chance(probability: number): boolean {
      return next() < probability;
    },

    get state() {
      return state;
    },
  };
}

/**
 * Derive a numeric seed from a string (e.g., save file seed).
 */
export function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

/**
 * Generate a fresh random seed for a new game.
 * Uses Math.random() ONLY here — never in simulation code.
 */
export function generateGameSeed(): number {
  return (Math.random() * 4294967296) | 0;
}
