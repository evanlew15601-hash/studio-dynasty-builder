import { describe, expect, it } from 'vitest';
import { hashStringToUint32, stablePick } from '@/utils/stablePick';

describe('stablePick', () => {
  it('hashStringToUint32 is deterministic', () => {
    expect(hashStringToUint32('abc')).toBe(hashStringToUint32('abc'));
    expect(hashStringToUint32('abc')).not.toBe(hashStringToUint32('abcd'));
  });

  it('stablePick is deterministic for a given seed', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(stablePick(items, 'seed-1')).toBe(stablePick(items, 'seed-1'));
  });

  it('stablePick can produce different picks for different seeds', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const pick1 = stablePick(items, 'seed-a');
    const pick2 = stablePick(items, 'seed-b');
    expect(pick1).toBeTruthy();
    expect(pick2).toBeTruthy();
    expect(pick1).not.toBeUndefined();
    expect(pick2).not.toBeUndefined();
    // Most seeds should differ with a reasonable list size; if they collide, change seeds.
    if (pick1 === pick2) {
      expect(stablePick(items, 'seed-c')).not.toBe(pick1);
    }
  });
});
