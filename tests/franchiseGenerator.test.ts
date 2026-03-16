import { describe, expect, it } from 'vitest';
import { getWorldFranchiseCatalog } from '@/data/FranchiseCatalog';

describe('FranchiseCatalog', () => {
  it('getWorldFranchiseCatalog returns a fixed catalog (seed-independent)', () => {
    const a = getWorldFranchiseCatalog(30);
    const b = getWorldFranchiseCatalog(30);
    expect(a).toEqual(b);
  });

  it('getWorldFranchiseCatalog does not produce duplicate ids or sources', () => {
    const list = getWorldFranchiseCatalog(999);

    const ids = list.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);

    const sources = list.map(f => f.parodySource).filter(Boolean) as string[];
    expect(new Set(sources).size).toBe(sources.length);
  });
});
