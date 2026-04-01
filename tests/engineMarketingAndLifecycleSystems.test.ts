import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { MarketingCampaignSystem } from '@/game/systems/marketingCampaignSystem';
import { ProjectLifecycleSystem } from '@/game/systems/projectLifecycleSystem';
import { ScheduledReleaseSystem } from '@/game/systems/scheduledReleaseSystem';

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

describe('Engine marketing + lifecycle systems', () => {
  it('advances marketing campaigns weekly and moves project to release when complete', () => {
    const project: Project = {
      id: 'p1',
      title: 'Campaign Film',
      script: {
        id: 's1',
        title: 'Campaign Film',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
      },
      type: 'feature',
      currentPhase: 'marketing' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'marketing' as any,
      metrics: {},
      phaseDuration: 2,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      marketingData: { currentBuzz: 20, totalSpent: 0, campaigns: [] } as any,
      marketingCampaign: {
        id: 'campaign-1',
        strategy: { type: 'digital', channels: [], targeting: { demographic: [], psychographic: [], geographic: [], platforms: [] } } as any,
        budgetAllocated: 1_000_000,
        budgetSpent: 0,
        duration: 2,
        weeksRemaining: 2,
        activities: [],
        buzz: 20,
        targetAudience: [],
        effectiveness: 60,
      },
    };

    const state = makeBaseState({ projects: [project] });

    const week1 = advanceWeek(state, createRng(1), [MarketingCampaignSystem]);
    expect(week1.nextState.currentWeek).toBe(10);

    const pAfter1 = week1.nextState.projects[0];
    expect(pAfter1.marketingCampaign?.weeksRemaining).toBe(1);
    expect(pAfter1.phaseDuration).toBe(1);
    expect((pAfter1.marketingData as any)?.currentBuzz).toBeGreaterThan(20);

    const week2 = advanceWeek(week1.nextState, createRng(1), [MarketingCampaignSystem]);
    const pAfter2 = week2.nextState.projects[0];

    expect(pAfter2.marketingCampaign?.weeksRemaining).toBe(0);
    expect(pAfter2.currentPhase).toBe('release');
    expect(pAfter2.status).toBe('ready-for-release');
  });

  it('marketing completion can trigger scheduled release in the same tick (compat path)', () => {
    const project: Project = {
      id: 'p2',
      title: 'Campaign Into Release',
      script: {
        id: 's2',
        title: 'Campaign Into Release',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
      },
      type: 'feature',
      currentPhase: 'marketing' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'scheduled-for-release',
      metrics: {},
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      marketingCampaign: {
        id: 'campaign-2',
        strategy: { type: 'digital', channels: [], targeting: { demographic: [], psychographic: [], geographic: [], platforms: [] } } as any,
        budgetAllocated: 1_000_000,
        budgetSpent: 0,
        duration: 1,
        weeksRemaining: 1,
        activities: [],
        buzz: 20,
        targetAudience: [],
        effectiveness: 60,
      },
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
    };

    const state = makeBaseState({ projects: [project] });

    const result = advanceWeek(state, createRng(1), [MarketingCampaignSystem, ScheduledReleaseSystem]);
    const updated = result.nextState.projects[0];

    expect(result.nextState.currentWeek).toBe(10);
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);
  });

  it('counts down phaseDuration and marks post-production as ready-for-marketing', () => {
    const project: Project = {
      id: 'p3',
      title: 'Post Film',
      script: {
        id: 's3',
        title: 'Post Film',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
      },
      type: 'feature',
      currentPhase: 'post-production' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'post-production' as any,
      metrics: {},
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
    };

    const state = makeBaseState({ projects: [project] });

    const result = advanceWeek(state, createRng(1), [ProjectLifecycleSystem]);
    const updated = result.nextState.projects[0];

    expect(result.nextState.currentWeek).toBe(10);
    expect(updated.currentPhase).toBe('post-production');
    expect(updated.status).toBe('ready-for-marketing');
    expect((updated as any).readyForMarketing).toBe(true);
    expect(updated.phaseDuration).toBe(0);

    expect(result.recap.some((c) => c.title.includes('Post-production'))).toBe(true);
  });

  it('gates pre-production -> production when mandatory roles are missing', () => {
    const project: Project = {
      id: 'p4',
      title: 'Prep Film',
      script: {
        id: 's4',
        title: 'Prep Film',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
        characters: [
          { name: 'Director', role: 'Director', importance: 'lead', requiredType: 'director' },
          { name: 'Lead', role: 'Lead', importance: 'lead', requiredType: 'actor' },
        ] as any,
      },
      type: 'feature',
      currentPhase: 'pre-production' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'pre-production' as any,
      metrics: {},
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
    };

    const state = makeBaseState({ projects: [project] });

    const result = advanceWeek(state, createRng(1), [ProjectLifecycleSystem]);
    const updated = result.nextState.projects[0];

    expect(result.nextState.currentWeek).toBe(10);
    expect(updated.currentPhase).toBe('pre-production');
    expect(updated.phaseDuration).toBe(2);
  });
});
