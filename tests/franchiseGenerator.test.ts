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
});
