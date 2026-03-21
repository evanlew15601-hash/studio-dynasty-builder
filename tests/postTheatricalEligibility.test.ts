import { describe, expect, it } from 'vitest';
import type { Project } from '@/types/game';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import { getTheatricalEndAbs, getWeeksSinceTheatricalEnd, isPostTheatricalEligibleProject } from '@/utils/postTheatrical';

function makeTheatricalFilm(params: {
  id: string;
  releaseWeek: number;
  releaseYear: number;
  ended?: boolean;
  theatricalEndWeek?: number;
  theatricalEndYear?: number;
  hasEndDate?: boolean;
  weeksSinceRelease?: number;
}): Project {
  const hasEndDate = params.hasEndDate !== false;

  return {
    id: params.id,
    title: 'Film',
    script: { id: 's', title: 'Film', genre: 'drama', logline: '', writer: '', pages: 100, quality: 60, budget: 1, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: {} as any },
    type: 'feature',
    currentPhase: 'distribution' as any,
    budget: { total: 1 } as any,
    cast: [],
    crew: [],
    timeline: {} as any,
    locations: [],
    distributionStrategy: { primary: { platform: 'Theaters', type: 'theatrical', revenue: { type: 'box-office', studioShare: 1 } }, international: [], windows: [], marketingBudget: 0 } as any,
    status: 'released',
    releaseWeek: params.releaseWeek,
    releaseYear: params.releaseYear,
    theatricalEndDate:
      params.ended && hasEndDate && params.theatricalEndWeek && params.theatricalEndYear
        ? triggerDateFromWeekYear(params.theatricalEndYear, params.theatricalEndWeek)
        : undefined,
    postTheatricalEligible: params.ended ? true : undefined,
    metrics: {
      inTheaters: params.ended ? false : true,
      theatricalRunLocked: params.ended ? true : false,
      boxOfficeStatus: params.ended ? 'Ended' : 'Opening',
      weeksSinceRelease: params.weeksSinceRelease,
    },
    phaseDuration: -1,
    contractedTalent: [],
    developmentProgress: {} as any,
  } as any;
}

describe('postTheatrical eligibility helpers', () => {
  it('computes weeks since theatrical end using theatricalEndDate (not weeksSinceRelease)', () => {
    const film = makeTheatricalFilm({
      id: 'p1',
      releaseWeek: 1,
      releaseYear: 2027,
      ended: true,
      theatricalEndWeek: 12,
      theatricalEndYear: 2027,
      weeksSinceRelease: 30,
    });

    const currentAbs = 2027 * 52 + 20;

    expect(getTheatricalEndAbs(film, currentAbs)).toBe(2027 * 52 + 12);
    expect(getWeeksSinceTheatricalEnd(film, currentAbs)).toBe(8);
    expect(isPostTheatricalEligibleProject(film, currentAbs)).toBe(true);
  });

  it('falls back when theatricalEndDate is missing by assuming a max 20-week theatrical run', () => {
    const film = makeTheatricalFilm({
      id: 'p2',
      releaseWeek: 1,
      releaseYear: 2027,
      ended: true,
      hasEndDate: false,
      weeksSinceRelease: 30,
    });

    const currentAbs = 2027 * 52 + 31;

    // Age is 30 weeks; assume run ended at 20.
    expect(getTheatricalEndAbs(film, currentAbs)).toBe(2027 * 52 + 21);
    expect(getWeeksSinceTheatricalEnd(film, currentAbs)).toBe(10);
    expect(isPostTheatricalEligibleProject(film, currentAbs)).toBe(true);
  });
});
