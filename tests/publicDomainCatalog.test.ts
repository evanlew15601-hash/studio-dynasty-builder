import { describe, expect, it } from 'vitest';
import { getPublicDomainCatalog } from '@/data/PublicDomainCatalog';

describe('PublicDomainCatalog', () => {
  it('getPublicDomainCatalog returns a fixed catalog', () => {
    const a = getPublicDomainCatalog(20);
    const b = getPublicDomainCatalog(20);
    expect(a).toEqual(b);
  });

  it('getPublicDomainCatalog does not produce duplicate ids', () => {
    const list = getPublicDomainCatalog();
    const ids = list.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
