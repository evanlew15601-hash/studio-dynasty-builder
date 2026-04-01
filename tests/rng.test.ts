import { describe, expect, it } from 'vitest';
import { createRng, seedFromString, generateGameSeed } from '@/game/core/rng';

describe('Seeded PRNG (mulberry32)', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);

    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(42);
    const b = createRng(99);

    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it('nextInt returns values in [min, max]', () => {
    const rng = createRng(123);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(777);
    for (let i = 0; i < 200; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('pick selects from an array deterministically', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const rng1 = createRng(50);
    const rng2 = createRng(50);

    const picks1 = Array.from({ length: 10 }, () => rng1.pick(items));
    const picks2 = Array.from({ length: 10 }, () => rng2.pick(items));

    expect(picks1).toEqual(picks2);
  });

  it('shuffle is deterministic', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng1 = createRng(999);
    const rng2 = createRng(999);

    expect(rng1.shuffle(items)).toEqual(rng2.shuffle(items));
  });

  it('chance respects probability', () => {
    const rng = createRng(12345);
    let trueCount = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      if (rng.chance(0.3)) trueCount++;
    }
    // With 1000 trials at 30%, expect ~300, allow wide margin
    expect(trueCount).toBeGreaterThan(200);
    expect(trueCount).toBeLessThan(400);
  });

  it('seedFromString produces consistent seeds', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
    expect(seedFromString('hello')).not.toBe(seedFromString('world'));
  });

  it('generateGameSeed returns a number', () => {
    const seed = generateGameSeed();
    expect(typeof seed).toBe('number');
    expect(Number.isFinite(seed)).toBe(true);
  });
});
