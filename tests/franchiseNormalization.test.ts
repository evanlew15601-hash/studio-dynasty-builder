import { describe, expect, it } from 'vitest';
import { normalizeFranchises } from '@/utils/franchiseNormalization';

describe('normalizeFranchises', () => {
  it('dedupes franchise ids and unions entries (stable order)', () => {
    const input = [
      {
        id: 'f-1',
        title: 'First',
        entries: ['p1', 'p2', 'p2'],
      },
      {
        id: 'f-2',
        title: 'Second',
        entries: ['x', 'x'],
      },
      {
        id: 'f-1',
        title: 'First (updated)',
        entries: ['p2', 'p3'],
      },
    ] as any;

    const out = normalizeFranchises(input);

    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('f-1');
    expect(out[1].id).toBe('f-2');

    expect(out[0].title).toBe('First (updated)');
    expect(out[0].entries).toEqual(['p1', 'p2', 'p3']);

    expect(out[1].entries).toEqual(['x']);
  });

  it('handles null/undefined input', () => {
    expect(normalizeFranchises(undefined)).toEqual([]);
    expect(normalizeFranchises(null)).toEqual([]);
  });
});
