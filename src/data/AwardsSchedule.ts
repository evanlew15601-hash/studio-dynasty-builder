// Centralized, data-driven awards schedule and helpers
export interface AwardShowDefinition {
  id: string;
  name: string;
  nominationWeek: number; // week nominations are announced
  ceremonyWeek: number;   // week ceremony occurs
  cooldownWeeks: number;  // no-show/cooldown period following ceremony
  eligibilityCutoffWeek: number; // latest week a release can occur to qualify for this show
}

// Default annual schedule (weeks within the year)
const AWARD_SHOWS: AwardShowDefinition[] = [
  {
    id: 'golden-globe',
    name: 'Golden Globe',
    nominationWeek: 2,
    ceremonyWeek: 6,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 5,
  },
  {
    id: 'critics-choice',
    name: 'Critics Choice',
    nominationWeek: 3,
    ceremonyWeek: 8,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 7,
  },
  {
    id: 'oscar',
    name: 'Oscar',
    nominationWeek: 4,
    ceremonyWeek: 10,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 9,
  },
];

export const getAwardShowsForYear = (_year: number): AwardShowDefinition[] => {
  // Currently the schedule is static per-year by week, but this function allows
  // future variation by year if needed.
  return AWARD_SHOWS;
};

export const isWithinAwardCooldown = (
  week: number,
  year: number
): { within: boolean; show?: AwardShowDefinition } => {
  const shows = getAwardShowsForYear(year);
  for (const show of shows) {
    const start = show.ceremonyWeek; // cooldown starts at ceremony week
    const end = Math.min(52, show.ceremonyWeek + show.cooldownWeeks - 1);
    if (week >= start && week <= end) {
      return { within: true, show };
    }
  }
  return { within: false };
};

export const getEarliestEligibleShowForRelease = (
  week: number,
  year: number
): AwardShowDefinition | undefined => {
  const shows = getAwardShowsForYear(year).slice().sort((a, b) => a.ceremonyWeek - b.ceremonyWeek);
  return shows.find((s) => week <= s.eligibilityCutoffWeek);
};

export const validateAwardShowSpacing = (
  year: number,
  minGapWeeks = 1
): { ok: boolean; conflict?: { a: AwardShowDefinition; b: AwardShowDefinition } } => {
  const shows = getAwardShowsForYear(year).slice().sort((a, b) => a.ceremonyWeek - b.ceremonyWeek);
  for (let i = 0; i < shows.length - 1; i++) {
    const a = shows[i];
    const b = shows[i + 1];
    if (b.ceremonyWeek - a.ceremonyWeek < minGapWeeks) {
      return { ok: false, conflict: { a, b } };
    }
  }
  return { ok: true };
};
