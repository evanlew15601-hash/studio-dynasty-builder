import { describe, expect, it } from 'vitest';
import { getAwardShowsForYear, getEarliestEligibleShowForRelease } from '@/data/AwardsSchedule';

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
});
