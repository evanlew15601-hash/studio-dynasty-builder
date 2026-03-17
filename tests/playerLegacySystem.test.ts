import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { WorldMilestonesSystem } from '@/game/systems/worldMilestonesSystem';
import { WorldYearbookSystem } from '@/game/systems/worldYearbookSystem';
import { PlayerLegacySystem } from '@/game/systems/playerLegacySystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [
        { id: 'a1', projectId: 'p1', category: 'Best Picture', ceremony: 'Crown', year: 2025, prestige: 10, reputationBoost: 5 },
        { id: 'a2', projectId: 'p1', category: 'Best Director', ceremony: 'Crown', year: 2026, prestige: 10, reputationBoost: 5 },
      ],
    },
    currentYear: 2026,
    currentWeek: 52,
    currentQuarter: 4,
    projects: [
      {
        id: 'p1',
        title: 'Player Hit',
        script: { id: 's1', title: 'Player Hit', genre: 'drama', logline: 'x', writer: 'x', pages: 100, quality: 70, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 110, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 6, criticalPotential: 6, cgiIntensity: 'minimal' } },
        type: 'feature',
        currentPhase: 'release',
        budget: { total: 10_000_000, allocated: {}, spent: {}, overages: {} } as any,
        cast: [],
        crew: [],
        timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] } as any,
        locations: [],
        distributionStrategy: { primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } }, windows: [], marketingBudget: 0 } as any,
        status: 'released',
        metrics: { boxOfficeTotal: 800 } as any,
        phaseDuration: 0,
        contractedTalent: [],
        developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
        releaseWeek: 11,
        releaseYear: 2026,
      } as any,
    ],
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
    universeSeed: 123,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('PlayerLegacySystem', () => {
  it('computes totals and biggest hit on year rollover', () => {
    const state = makeBaseState();
    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem, PlayerLegacySystem, WorldYearbookSystem]);

    const legacy = result.nextState.playerLegacy;
    expect(legacy?.studioId).toBe('studio-1');
    expect(legacy?.totalAwards).toBe(2);
    expect(legacy?.totalReleases).toBe(1);
    expect(legacy?.totalBoxOffice).toBe(800);

    expect(legacy?.biggestHit?.projectId).toBe('p1');
    expect(legacy?.biggestHit?.boxOffice).toBe(800);

    expect(legacy?.bestYearByAwards).toEqual({ year: 2025, awards: 1 });
  });

  it('logs milestone history entries when thresholds are crossed', () => {
    const state = makeBaseState({
      projects: [
        {
          id: 'p1',
          title: 'Player Hit',
          script: { id: 's1', title: 'Player Hit', genre: 'drama', logline: 'x', writer: 'x', pages: 100, quality: 70, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 110, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 6, criticalPotential: 6, cgiIntensity: 'minimal' } },
          type: 'feature',
          currentPhase: 'release',
          budget: { total: 10_000_000, allocated: {}, spent: {}, overages: {} } as any,
          cast: [],
          crew: [],
          timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] } as any,
          locations: [],
          distributionStrategy: { primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } }, windows: [], marketingBudget: 0 } as any,
          status: 'released',
          metrics: { boxOfficeTotal: 100_000_001 } as any,
          phaseDuration: 0,
          contractedTalent: [],
          developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
          releaseWeek: 10,
          releaseYear: 2026,
        } as any,
      ],
      boxOfficeHistory: [],
    });

    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem, PlayerLegacySystem, WorldYearbookSystem]);

    const history = result.nextState.worldHistory || [];
    expect(history.some((e) => e.id === 'hist:studio_milestone:studio-1:boxoffice:100000000')).toBe(true);
  });
});
