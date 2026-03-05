import { describe, expect, it } from 'vitest';
import { getAwardShowsForYear, getEarliestEligibleShowForRelease } from '@/data/AwardsSchedule';

describe('AwardsSchedule', () => {
  it('includes a TV awards show (Beacon TV) in the schedule', () => {
    const shows = getAwardShowsForYear(2024);
    const beaconTv = shows.find(s => s.name === 'Beacon TV');

    expect(beaconTv).toBeTruthy();
    expect(beaconTv?.medium).toBe('tv');
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
