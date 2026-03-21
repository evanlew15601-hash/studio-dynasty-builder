import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { validateGameState, validateTickDelta } from '@/game/core/coreLoopChecks';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 10,
    currentQuarter: 2,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 1,
    rngState: 1 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

describe('core loop additional checks', () => {
  it('flags scheduled releases stuck past their scheduled date', () => {
    const project: Project = {
      id: 'p1',
      title: 'Scheduled Film',
      type: 'feature',
      status: 'scheduled-for-release',
      currentPhase: 'release' as any,
      scheduledReleaseWeek: 1,
      scheduledReleaseYear: 2027,
      script: { id: 's', title: 'S', genre: 'drama', quality: 60, characters: [] } as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      locations: [],
      timeline: {} as any,
      distributionStrategy: {} as any,
      metrics: {} as any,
      phaseDuration: -1,
      contractedTalent: [],
      developmentProgress: {} as any,
    } as any;

    const state = makeBaseState({ currentWeek: 5, currentYear: 2027, projects: [project] });

    const issues = validateGameState(state);
    expect(issues.some((i) => i.code === 'project.scheduled_release.stuck_past_date')).toBe(true);
  });

  it('flags post-theatrical releases that appear double-processed in one tick', () => {
    const prev = makeBaseState({
      currentWeek: 10,
      currentYear: 2027,
      projects: [
        {
          id: 'p1',
          title: 'Film',
          type: 'feature',
          status: 'released',
          currentPhase: 'distribution' as any,
          script: { id: 's', title: 'S', genre: 'drama', quality: 60, characters: [] } as any,
          budget: { total: 10_000_000 } as any,
          cast: [],
          crew: [],
          locations: [],
          timeline: {} as any,
          distributionStrategy: {} as any,
          metrics: {} as any,
          phaseDuration: -1,
          contractedTalent: [],
          developmentProgress: {} as any,
          postTheatricalReleases: [
            {
              id: 'r1',
              projectId: 'p1',
              platform: 'streaming',
              status: 'active',
              weeklyRevenue: 100,
              revenue: 1000,
              weeksActive: 2,
              lastProcessedWeek: 10,
              lastProcessedYear: 2027,
              durationWeeks: 26,
            },
          ],
        } as any,
      ],
    });

    const next = makeBaseState({
      currentWeek: 10,
      currentYear: 2027,
      projects: [
        {
          ...(prev.projects[0] as any),
          postTheatricalReleases: [
            {
              ...((prev.projects[0] as any).postTheatricalReleases[0] as any),
              revenue: 1100,
              weeksActive: 3,
              lastProcessedWeek: 10,
              lastProcessedYear: 2027,
            },
          ],
        } as any,
      ],
    });

    const issues = validateTickDelta(prev, next);
    expect(issues.some((i) => i.code === 'postTheatrical.double_processed_revenue_delta')).toBe(true);
    expect(issues.some((i) => i.code === 'postTheatrical.double_processed_weeksActive_delta')).toBe(true);
  });
});
