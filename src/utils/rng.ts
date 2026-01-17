export class RNG {
  private seed: number | null = null;
  private state: number = 0;

  /**
   * Seed the RNG. When not seeded, it delegates to Math.random() for values.
   */
  seed(value: number) {
    const normalized = value >>> 0;
    this.seed = normalized;
    // Avoid a zero state which would make the LCG degenerate
    this.state = normalized === 0 ? 1 : normalized;
  }

  /**
   * Get the current seed, or null if using Math.random().
   */
  getSeed(): number | null {
    return this.seed;
  }

  /**
   * Clear the current seed and return to Math.random()-backed behavior.
   */
  clearSeed(): void {
    this.seed = null;
    this.state = 0;
  }

  /**
   * Core random generator.
   * If a seed has been set, uses a simple LCG for deterministic values.
   * Otherwise, delegates to Math.random().
   */
  next(): number {
    if (this.seed == null) {
      return Math.random();
    }

    // 32-bit LCG parameters (Numerical Recipes)
    const A = 1664525;
    const C = 1013904223;

    this.state = (A * this.state + C) >>> 0;
    // 0xFFFFFFFF ~= 2^32-1, keep in (0,1)
    return this.state / 0xffffffff;
  }

  /**
   * Integer in [0, max)
   */
  int(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.next() * max);
  }

  /**
   * Pick a single element from an array.
   */
  pick<T>(items: T[]): T {
    if (!items.length) {
      throw new Error('rng.pick called with empty array');
    }
    return items[this.int(items.length)];
  }

  /**
   * Convenience helper for booleans with given probability (0-1).
   */
  chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }
}

/**
 * Global RNG instance used by simulation systems.
 * In normal gameplay it uses Math.random() semantics.
 * Tests or debug tools can call rng.seed(...) to make behavior deterministic.
 */
export const rng = new RNG();