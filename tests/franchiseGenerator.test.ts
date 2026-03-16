import { describe, expect, it } from 'vitest';
import { FranchiseGenerator } from '@/data/FranchiseGenerator';

describe('FranchiseGenerator', () => {
  it('generateInitialFranchises returns a fixed catalog (seed-independent)', () => {
    const a = FranchiseGenerator.generateInitialFranchises(30, 'seed:a');
    const b = FranchiseGenerator.generateInitialFranchises(30, 'seed:b');
    expect(a).toEqual(b);
  });

  it('generateInitialFranchises does not produce duplicates', () => {
    const list = FranchiseGenerator.generateInitialFranchises(30);

    const ids = list.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);

    const sources = list.map(f => f.parodySource);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('generateInitialFranchises does not depend on this binding', () => {
    const fn = FranchiseGenerator.generateInitialFranchises;

    expect(() => fn.call({}, 5, 'seed:unbind')).not.toThrow();
    expect(fn.call({}, 5, 'seed:unbind')).toHaveLength(5);
  });
});
