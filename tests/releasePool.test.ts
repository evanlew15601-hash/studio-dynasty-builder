import { describe, expect, it } from 'vitest';
import { dedupeReleasePoolPreferLatest } from '@/utils/releasePool';

describe('releasePool', () => {
  it('prefers the latest project entry when ids collide', () => {
    const older = { id: 'p1', title: 'Movie', status: 'scheduled-for-release', script: { id: 's', title: 'Movie' } } as any;
    const newer = { ...older, status: 'released', releaseWeek: 10, releaseYear: 2026, metrics: { boxOfficeTotal: 123 } } as any;

    const out = dedupeReleasePoolPreferLatest([older, newer] as any);

    expect(out).toHaveLength(1);
    expect((out[0] as any).status).toBe('released');
    expect((out[0] as any).metrics?.boxOfficeTotal).toBe(123);
  });

  it('dedupes BoxOfficeRelease entries by projectId and prefers the latest', () => {
    const older = { projectId: 'p1', title: 'Movie', studio: 'You', weeklyRevenue: 10, totalRevenue: 10, theaters: 100, weekInRelease: 1 } as any;
    const newer = { ...older, totalRevenue: 25 } as any;

    const out = dedupeReleasePoolPreferLatest([older, newer] as any);

    expect(out).toHaveLength(1);
    expect((out[0] as any).totalRevenue).toBe(25);
  });

  it('keeps the relative order of last-occurrence winners', () => {
    const a1 = { id: 'a', title: 'A', status: 'planned', script: {} } as any;
    const b1 = { id: 'b', title: 'B', status: 'released', script: {} } as any;
    const a2 = { ...a1, status: 'released' } as any;

    const out = dedupeReleasePoolPreferLatest([a1, b1, a2] as any);
    expect(out.map((x: any) => x.id)).toEqual(['b', 'a']);
  });
});
