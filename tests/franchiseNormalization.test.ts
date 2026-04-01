import { describe, expect, it } from 'vitest';
import { normalizeFranchises, normalizeFranchisesState } from '@/utils/franchiseNormalization';

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

describe('normalizeFranchisesState', () => {
  it('merges player-owned duplicate franchises by title and rewrites project references', () => {
    const base = {
      universeSeed: 1,
      rngState: 1,
      studio: { id: 'studio-1', name: 'You' },
      currentYear: 2000,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [
        { id: 'p1', franchiseId: 'f-a', script: { id: 's1', title: 'A', franchiseId: 'f-a' } },
        { id: 'p2', franchiseId: 'f-b', script: { id: 's2', title: 'B', franchiseId: 'f-b' } },
      ],
      scripts: [
        { id: 's1', title: 'A', franchiseId: 'f-a' },
        { id: 's2', title: 'B', franchiseId: 'f-b' },
      ],
      franchises: [
        { id: 'f-a', title: 'My Universe', creatorStudioId: 'studio-1', entries: ['p1'] },
        { id: 'f-b', title: 'My Universe', creatorStudioId: 'studio-1', entries: ['p2'] },
      ],
    } as any;

    const normalized = normalizeFranchisesState(base);

    expect(normalized.franchises).toHaveLength(1);
    expect(normalized.franchises[0].id).toBe('f-a');
    expect(normalized.franchises[0].entries).toEqual(['p1', 'p2']);

    expect(normalized.projects[0].script.franchiseId).toBe('f-a');
    expect(normalized.projects[1].script.franchiseId).toBe('f-a');
    expect(normalized.projects[0].franchiseId).toBe('f-a');
    expect(normalized.projects[1].franchiseId).toBe('f-a');

    expect(normalized.scripts[0].franchiseId).toBe('f-a');
    expect(normalized.scripts[1].franchiseId).toBe('f-a');
  });

  it('merges duplicate world franchises by parodySource and rewrites references', () => {
    const base = {
      universeSeed: 1,
      rngState: 1,
      studio: { id: 'studio-1', name: 'You' },
      currentYear: 2000,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [
        { id: 'p1', franchiseId: 'w-1', script: { id: 's1', title: 'A', franchiseId: 'w-1' } },
        { id: 'p2', franchiseId: 'w-2', script: { id: 's2', title: 'B', franchiseId: 'w-2' } },
      ],
      scripts: [
        { id: 's1', title: 'A', franchiseId: 'w-1' },
        { id: 's2', title: 'B', franchiseId: 'w-2' },
      ],
      franchises: [
        { id: 'w-1', title: 'Star Enforcers', creatorStudioId: 'world', parodySource: 'Star Saga', entries: ['p1'] },
        { id: 'w-2', title: 'Galactic Guardians', creatorStudioId: 'world', parodySource: 'Star Saga', entries: ['p2'] },
      ],
    } as any;

    const normalized = normalizeFranchisesState(base);

    expect(normalized.franchises).toHaveLength(1);
    expect(normalized.franchises[0].id).toBe('w-1');
    expect(normalized.franchises[0].entries).toEqual(['p1', 'p2']);

    expect(normalized.projects[0].script.franchiseId).toBe('w-1');
    expect(normalized.projects[1].script.franchiseId).toBe('w-1');
    expect(normalized.projects[0].franchiseId).toBe('w-1');
    expect(normalized.projects[1].franchiseId).toBe('w-1');

    expect(normalized.scripts[0].franchiseId).toBe('w-1');
    expect(normalized.scripts[1].franchiseId).toBe('w-1');
  });

  it('canonicalizes legacy parodySource keys on world franchises', () => {
    const base = {
      universeSeed: 1,
      rngState: 1,
      studio: { id: 'studio-1', name: 'You' },
      currentYear: 2000,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      scripts: [],
      franchises: [
        { id: 'w-1', title: 'Voidborne', creatorStudioId: 'world', parodySource: 'Deep Space Horror', entries: [] },
      ],
    } as any;

    const normalized = normalizeFranchisesState(base);

    expect(normalized.franchises).toHaveLength(1);
    expect(normalized.franchises[0].parodySource).toBe('Voidborne');
  });
});
