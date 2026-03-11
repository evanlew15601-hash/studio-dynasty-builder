import { describe, expect, it } from 'vitest';
import { FranchiseGenerator } from '@/data/FranchiseGenerator';

describe('FranchiseGenerator', () => {
  it('generateInitialFranchises is deterministic for the same inputs', () => {
    const a = FranchiseGenerator.generateInitialFranchises(30);
    const b = FranchiseGenerator.generateInitialFranchises(30);
    expect(a).toEqual(b);

    const c = FranchiseGenerator.generateInitialFranchises(12, 'seed:test');
    const d = FranchiseGenerator.generateInitialFranchises(12, 'seed:test');
    expect(c).toEqual(d);
  });

  it('generateInitialFranchises does not depend on this binding', () => {
    const fn = FranchiseGenerator.generateInitialFranchises;

    expect(() => fn.call({}, 5, 'seed:unbind')).not.toThrow();
    expect(fn.call({}, 5, 'seed:unbind')).toHaveLength(5);
  });
});
