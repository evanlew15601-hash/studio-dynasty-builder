// Centralized, data-driven awards schedule and helpers
import type { Genre, Gender, Project } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

export type AwardShowMedium = 'film' | 'tv';

export type AwardCategoryAwardKind = 'studio' | 'talent';

export interface AwardCategoryEligibility {
  projectTypes?: Project['type'][];
  genres?: Genre[];
  requireAnimation?: boolean;
}

export interface AwardCategoryDefinition {
  id: string;
  name: string;
  awardKind: AwardCategoryAwardKind;
  eligibility?: AwardCategoryEligibility;
  /** Extra additive bias applied during nomination scoring. */
  bias?: number;
  /** For talent awards, declares how to pick a recipient even if the name doesn't include "actor"/"director". */
  talent?: {
    type: 'actor' | 'director';
    gender?: Gender;
    supporting?: boolean;
  };
}

export interface AwardShowDefinition {
  id: string;
  name: string;
  medium: AwardShowMedium;
  nominationWeek: number; // week nominations are announced
  ceremonyWeek: number;   // week ceremony occurs
  cooldownWeeks: number;  // no-show/cooldown period following ceremony
  eligibilityCutoffWeek: number; // latest week a release can occur to qualify for this show
  prestige: number;
  momentumBonus: number;
  categories: AwardCategoryDefinition[];
}

const cat = (c: AwardCategoryDefinition): AwardCategoryDefinition => c;

// Default annual schedule (weeks within the year)
export const AWARD_SHOWS: AwardShowDefinition[] = [
  {
    id: 'crystal-ring',
    name: 'Crystal Ring',
    medium: 'film',
    nominationWeek: 2,
    ceremonyWeek: 6,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 5,
    prestige: 6,
    momentumBonus: 8,
    categories: [
      cat({ id: 'best-picture-drama', name: 'Best Picture - Drama', awardKind: 'studio' }),
      cat({ id: 'best-picture-comedy', name: 'Best Picture - Comedy/Musical', awardKind: 'studio' }),
      cat({ id: 'best-director', name: 'Best Director', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-actor-drama', name: 'Best Actor - Drama', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress-drama', name: 'Best Actress - Drama', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-actor-comedy', name: 'Best Actor - Comedy/Musical', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress-comedy', name: 'Best Actress - Comedy/Musical', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-supporting-actor', name: 'Best Supporting Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male', supporting: true } }),
      cat({ id: 'best-supporting-actress', name: 'Best Supporting Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female', supporting: true } }),
      cat({ id: 'best-screenplay', name: 'Best Screenplay', awardKind: 'studio' }),
      cat({ id: 'best-original-score', name: 'Best Original Score', awardKind: 'studio' }),
    ],
  },
  {
    id: 'critics-circle',
    name: 'Critics Circle',
    medium: 'film',
    nominationWeek: 3,
    ceremonyWeek: 8,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 7,
    prestige: 5,
    momentumBonus: 6,
    categories: [
      cat({ id: 'best-film', name: 'Best Film', awardKind: 'studio' }),
      cat({ id: 'best-director', name: 'Best Director', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-actor', name: 'Best Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress', name: 'Best Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-supporting-actor', name: 'Best Supporting Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male', supporting: true } }),
      cat({ id: 'best-supporting-actress', name: 'Best Supporting Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female', supporting: true } }),
      cat({ id: 'best-original-screenplay', name: 'Best Original Screenplay', awardKind: 'studio' }),
      cat({ id: 'best-cinematography', name: 'Best Cinematography', awardKind: 'studio' }),
      cat({ id: 'best-visual-effects', name: 'Best Visual Effects', awardKind: 'studio', bias: 2 }),
      cat({ id: 'best-editing', name: 'Best Editing', awardKind: 'studio' }),
      cat({ id: 'best-production-design', name: 'Best Production Design', awardKind: 'studio' }),
    ],
  },
  {
    id: 'crown',
    name: 'Crown',
    medium: 'film',
    nominationWeek: 4,
    ceremonyWeek: 10,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 9,
    prestige: 10,
    momentumBonus: 12,
    categories: [
      cat({ id: 'best-picture', name: 'Best Picture', awardKind: 'studio' }),
      cat({ id: 'best-director', name: 'Best Director', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-actor', name: 'Best Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress', name: 'Best Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-supporting-actor', name: 'Best Supporting Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male', supporting: true } }),
      cat({ id: 'best-supporting-actress', name: 'Best Supporting Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female', supporting: true } }),
      cat({ id: 'best-original-screenplay', name: 'Best Original Screenplay', awardKind: 'studio' }),
      cat({ id: 'best-cinematography', name: 'Best Cinematography', awardKind: 'studio' }),
      cat({ id: 'best-film-editing', name: 'Best Film Editing', awardKind: 'studio' }),
      cat({ id: 'best-visual-effects', name: 'Best Visual Effects', awardKind: 'studio', bias: 2 }),
      cat({ id: 'best-production-design', name: 'Best Production Design', awardKind: 'studio' }),
      cat({ id: 'best-costume-design', name: 'Best Costume Design', awardKind: 'studio' }),
      cat({ id: 'best-makeup', name: 'Best Makeup and Hairstyling', awardKind: 'studio' }),
      cat({ id: 'best-original-score', name: 'Best Original Score', awardKind: 'studio' }),
      cat({ id: 'best-original-song', name: 'Best Original Song', awardKind: 'studio' }),
      cat({ id: 'best-sound', name: 'Best Sound', awardKind: 'studio' }),
      cat({ id: 'best-animated', name: 'Best Animated Feature', awardKind: 'studio', eligibility: { requireAnimation: true } }),
    ],
  },
  {
    id: 'performers-guild',
    name: 'Performers Guild',
    medium: 'film',
    nominationWeek: 5,
    ceremonyWeek: 12,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 11,
    prestige: 6,
    momentumBonus: 6,
    categories: [
      cat({ id: 'outstanding-ensemble', name: 'Outstanding Ensemble', awardKind: 'studio' }),
      cat({ id: 'best-actor', name: 'Best Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress', name: 'Best Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-supporting-actor', name: 'Best Supporting Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male', supporting: true } }),
      cat({ id: 'best-supporting-actress', name: 'Best Supporting Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female', supporting: true } }),
      cat({ id: 'outstanding-stunt-ensemble', name: 'Outstanding Stunt Ensemble', awardKind: 'studio' }),
    ],
  },
  {
    id: 'directors-circle',
    name: 'Directors Circle',
    medium: 'film',
    nominationWeek: 6,
    ceremonyWeek: 13,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 12,
    prestige: 7,
    momentumBonus: 7,
    categories: [
      cat({ id: 'directing-achievement', name: 'Directing Achievement', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'first-time-feature-director', name: 'First-Time Feature Director', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-director-genre', name: 'Best Director - Genre', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-director-drama', name: 'Best Director - Drama', awardKind: 'talent', talent: { type: 'director' } }),
    ],
  },
  {
    id: 'writers-circle',
    name: 'Writers Circle',
    medium: 'film',
    nominationWeek: 7,
    ceremonyWeek: 14,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 13,
    prestige: 7,
    momentumBonus: 7,
    categories: [
      cat({ id: 'best-original-screenplay', name: 'Best Original Screenplay', awardKind: 'studio' }),
      cat({ id: 'best-adapted-screenplay', name: 'Best Adapted Screenplay', awardKind: 'studio' }),
      cat({ id: 'breakthrough-screenplay', name: 'Breakthrough Screenplay', awardKind: 'studio' }),
    ],
  },
  {
    id: 'britannia-screen',
    name: 'Britannia Screen',
    medium: 'film',
    nominationWeek: 8,
    ceremonyWeek: 15,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 14,
    prestige: 8,
    momentumBonus: 8,
    categories: [
      cat({ id: 'best-film', name: 'Best Film', awardKind: 'studio' }),
      cat({ id: 'best-director', name: 'Best Director', awardKind: 'talent', talent: { type: 'director' } }),
      cat({ id: 'best-actor', name: 'Best Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress', name: 'Best Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-screenplay', name: 'Best Screenplay', awardKind: 'studio' }),
      cat({ id: 'best-cinematography', name: 'Best Cinematography', awardKind: 'studio' }),
      cat({ id: 'best-debut', name: 'Best Debut', awardKind: 'studio' }),
    ],
  },
  {
    id: 'beacon-tv',
    name: 'Beacon TV',
    medium: 'tv',
    nominationWeek: 34,
    ceremonyWeek: 38,
    cooldownWeeks: 1,
    eligibilityCutoffWeek: 33,
    prestige: 8,
    momentumBonus: 10,
    categories: [
      cat({ id: 'best-drama-series', name: 'Best Drama Series', awardKind: 'studio' }),
      cat({ id: 'best-comedy-series', name: 'Best Comedy Series', awardKind: 'studio' }),
      cat({ id: 'best-limited-series', name: 'Best Limited Series', awardKind: 'studio', eligibility: { projectTypes: ['limited-series'] } }),
      cat({ id: 'best-actor-drama-series', name: 'Best Actor - Drama Series', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress-drama-series', name: 'Best Actress - Drama Series', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-actor-comedy-series', name: 'Best Actor - Comedy Series', awardKind: 'talent', talent: { type: 'actor', gender: 'Male' } }),
      cat({ id: 'best-actress-comedy-series', name: 'Best Actress - Comedy Series', awardKind: 'talent', talent: { type: 'actor', gender: 'Female' } }),
      cat({ id: 'best-supporting-actor', name: 'Best Supporting Actor', awardKind: 'talent', talent: { type: 'actor', gender: 'Male', supporting: true } }),
      cat({ id: 'best-supporting-actress', name: 'Best Supporting Actress', awardKind: 'talent', talent: { type: 'actor', gender: 'Female', supporting: true } }),
      cat({ id: 'best-writing', name: 'Best Writing', awardKind: 'studio' }),
      cat({ id: 'best-directing', name: 'Best Directing', awardKind: 'talent', talent: { type: 'director' } }),
    ],
  },
];

export const getAwardShowsForYear = (_year: number, mods?: ModBundle): AwardShowDefinition[] => {
  const bundle = mods ?? getModBundle();
  const patched = applyPatchesByKey(AWARD_SHOWS, getPatchesForEntity(bundle, 'awardShow'), (s) => s.id);
  return patched;
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
