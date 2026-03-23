import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { MarketingCampaignSystem } from '@/game/systems/marketingCampaignSystem';
import { ProjectLifecycleSystem } from '@/game/systems/projectLifecycleSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2024,
    currentWeek: 9,
    currentQuarter: 1,
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
    universeSeed: 123,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Project patch propagation across legacy arrays', () => {
  it('MarketingCampaignSystem patches allReleases entries when ids overlap', () => {
    const project: Project = {
      id: 'p1',
      title: 'Campaign Film',
      script: { id: 's1', title: 'Campaign Film', genre: 'drama', pages: 100, quality: 50 } as any,
      type: 'feature',
      currentPhase: 'marketing' as any,
      budget: { total: 10_000_000 } as any,
      status: 'marketing' as any,
      metrics: {},
      phaseDuration: 2,
      marketingData: { currentBuzz: 20, totalSpent: 0, campaigns: [] } as any,
      marketingCampaign: {
        id: 'campaign-1',
        strategy: { type: 'digital' } as any,
        budgetAllocated: 1_000_000,
        budgetSpent: 0,
        duration: 2,
        weeksRemaining: 2,
        activities: [],
        buzz: 20,
        targetAudience: [],
        effectiveness: 60,
      } as any,
    } as any;

    const state = makeBaseState({ projects: [project], allReleases: [project as any] });

    const week1 = advanceWeek(state, createRng(1), [MarketingCampaignSystem]);

    expect((week1.nextState.projects[0] as any).marketingCampaign.weeksRemaining).toBe(1);
    expect(((week1.nextState.allReleases as any[])[0] as any).marketingCampaign.weeksRemaining).toBe(1);
  });

  it('ProjectLifecycleSystem patches allReleases entries when ids overlap', () => {
    const project: Project = {
      id: 'p2',
      title: 'Dev Film',
      script: { id: 's2', title: 'Dev Film', genre: 'drama', pages: 100, quality: 50, characters: [] } as any,
      type: 'feature',
      currentPhase: 'production' as any,
      budget: { total: 10_000_000 } as any,
      status: 'production' as any,
      metrics: {},
      phaseDuration: 2,
      cast: [],
      crew: [],
    } as any;

    const state = makeBaseState({ projects: [project], allReleases: [project as any] });

    const week1 = advanceWeek(state, createRng(1), [ProjectLifecycleSystem]);

    expect((week1.nextState.projects[0] as any).phaseDuration).toBe(1);
    expect(((week1.nextState.allReleases as any[])[0] as any).phaseDuration).toBe(1);
  });
});
