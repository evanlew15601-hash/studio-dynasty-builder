import { describe, expect, it } from 'vitest';
import { getAwardShowsForYear, getEarliestEligibleShowForRelease } from '@/data/AwardsSchedule';
import { createEmptyModBundle } from '@/utils/modding';

describe('AwardsSchedule', () => {
  it('includes a TV awards show (Beacon TV) in the schedule', () => {
    const shows = getAwardShowsForYear(2024);
    const beaconTv = shows.find(s => s.name === 'Beacon TV');

    expect(beaconTv).toBeTruthy();
    expect(beaconTv?.medium).toBe('tv');
  });

  it('includes additional guild-style film ceremonies', () => {
    const shows = getAwardShowsForYear(2024);
    const names = shows.map(s => s.name);

    expect(names).toContain('Performers Guild');
    expect(names).toContain('Directors Circle');
    expect(names).toContain('Writers Circle');
    expect(names).toContain('Britannia Screen');

    expect(shows.find(s => s.name === 'Performers Guild')?.medium).toBe('film');
    expect(shows.find(s => s.name === 'Directors Circle')?.medium).toBe('film');
    expect(shows.find(s => s.name === 'Writers Circle')?.medium).toBe('film');
    expect(shows.find(s => s.name === 'Britannia Screen')?.medium).toBe('film');
  });

  it('defaults eligibility checks to film awards only', () => {
    // Week 20 should not qualify for any of the early-year film award shows.
    const filmEligible = getEarliestEligibleShowForRelease(20, 2024);
    expect(filmEligible).toBeUndefined();

    // Week 20 should qualify for the Beacon TV awards when asking for TV eligibility.
    const tvEligible = getEarliestEligibleShowForRelease(20, 2024, 'tv');
    expect(tvEligible?.name).toBe('Beacon TV');
  });

  it('exposes award show categories and supports mod patches for awardShow', () => {
    const base = getAwardShowsForYear(2024);
    const crown = base.find(s => s.id === 'crown');

    expect(crown?.categories?.length).toBeGreaterThan(0);

    const bundle = createEmptyModBundle();
    bundle.mods = [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }];
    bundle.patches = [
      {
        id: 'awardShow:test:crown',
        modId: 'test',
        entityType: 'awardShow',
        op: 'update',
        target: 'crown',
        payload: { name: 'Oscar' },
      },
    ];

    const patched = getAwardShowsForYear(2024, bundle);
    expect(patched.find(s => s.id === 'crown')?.name).toBe('Oscar');
  });

  it('supports insert and delete patches for awardShow', () => {
    const bundle = createEmptyModBundle();
    bundle.mods = [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }];
    bundle.patches = [
      {
        id: 'awardShow:test:crown',
        modId: 'test',
        entityType: 'awardShow',
        op: 'delete',
        target: 'crown',
      },
      {
        id: 'awardShow:test:custom-show-1',
        modId: 'test',
        entityType: 'awardShow',
        op: 'insert',
        target: 'custom-show-1',
        payload: {
          id: 'custom-show-1',
          name: 'Custom Awards',
          medium: 'film',
          nominationWeek: 1,
          ceremonyWeek: 10,
          cooldownWeeks: 1,
          eligibilityCutoffWeek: 9,
          prestige: 1,
          momentumBonus: 1,
          categories: [],
        },
      },
    ];

    const patched = getAwardShowsForYear(2024, bundle);
    expect(patched.find(s => s.id === 'crown')).toBeUndefined();
    expect(patched.find(s => s.id === 'custom-show-1')?.name).toBe('Custom Awards');
  });

  it('defines explicit gender requirements for gendered actor categories', () => {
    const shows = getAwardShowsForYear(2024);
    const categories = shows.flatMap(s => s.categories || []);

    const actorCategories = categories.filter(c => c.awardKind === 'talent' && c.talent?.type === 'actor');

    actorCategories.forEach((c) => {
      const name = c.name.toLowerCase();
      const gendered = name.includes('actor') || name.includes('actress');
      if (!gendered) return;

      expect(c.talent?.gender).toBeTruthy();
    });
  });
});
