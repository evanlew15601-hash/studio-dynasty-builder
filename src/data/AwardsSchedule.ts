// Centralized, data-driven awards schedule and helpers
export type AwardShowMedium = 'film' | 'tv';

export interface AwardShowDefinition {
  id: string;
  name: string;
  medium: AwardShowMedium;
  nominationWeek: number; // week nominations are announced
  ceremonyWeek: number;   // week ceremony occurs
  cooldownWeeks: number;  // no-show/cooldown period following ceremony
  eligibilityCutoffWeek: number; // latest week a release can occur to qualify for this show
}

// Default annual schedule (weeks within the year)
const AWARD_SHOWS: AwardShowDefinition[] = [
  {
    id: 'crystal-ring',
    name: 'Crystal Ring',
    medium: 'film',
    nominationWeek: 2,
    ceremonyWeek: 6,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 5,
  },
  {
    id: 'critics-circle',
    name: 'Critics Circle',
    medium: 'film',
    nominationWeek: 3,
    ceremonyWeek: 8,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 7,
  },
  {
    id: 'crown',
    name: 'Crown',
    medium: 'film',
    nominationWeek: 4,
    ceremonyWeek: 10,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 9,
  },
  {
    id: 'performers-guild',
    name: 'Performers Guild',
    medium: 'film',
    nominationWeek: 5,
    ceremonyWeek: 12,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 11,
  },
  {
    id: 'directors-circle',
    name: 'Directors Circle',
    medium: 'film',
    nominationWeek: 6,
    ceremonyWeek: 13,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 12,
  },
  {
    id: 'writers-circle',
    name: 'Writers Circle',
    medium: 'film',
    nominationWeek: 7,
    ceremonyWeek: 14,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 13,
  },
  {
    id: 'britannia-screen',
    name: 'Britannia Screen',
    medium: 'film',
    nominationWeek: 8,
    ceremonyWeek: 15,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 14,
  },
  {
    id: 'beacon-tv',
    name: 'Beacon TV',
    medium: 'tv',
    nominationWeek: 34,
    ceremonyWeek: 38,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 33,
  },
];

export const getAwardShowsForYear = (_year: number): AwardShowDefinition[] => {
  // Currently the schedule is static per-year by week, but this function allows
  // future variation by year if needed.
  return AWARD_SHOWS;
};

export const isWithinAwardCooldown = (
  week: number,
  year: number,
  medium: AwardShowMedium = 'film'
): { within: boolean; show?: AwardShowDefinition } => {
  const absWeek = (year * 52) + week;

  const checkYear = (y: number): AwardShowDefinition | undefined => {
    const shows = getAwardShowsForYear(y).filter(s => s.medium === medium);
    for (const show of shows) {
      const startAbs = (y * 52) + show.ceremonyWeek;
      const endAbs = startAbs + Math.max(0, show.cooldownWeeks - 1);
      if (absWeek >= startAbs && absWeek <= endAbs) {
        return show;
      }
    }
    return undefined;
  };

  // Check cooldowns in the current year, plus previous-year cooldowns that spill into this year.
  const show = checkYear(year) || checkYear(year - 1);
  if (show) {
    return { within: true, show };
  }

  return { within: false };
};

export const getEarliestEligibleShowForRelease = (
  week: number,
  year: number,
  medium: AwardShowMedium = 'film'
): AwardShowDefinition | undefined => {
  const shows = getAwardShowsForYear(year)
    .filter(s => s.medium === medium)
    .slice()
    .sort((a, b) => a.ceremonyWeek - b.ceremonyWeek);

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
