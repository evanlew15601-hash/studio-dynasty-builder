import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { advanceWeek } from '@/game/core/tick';
import { createRng } from '@/game/core/rng';
import { PlatformMarketBootstrapSystem } from '@/game/systems/platformMarketBootstrapSystem';
import { PlatformOriginalsPipelineSystem } from '@/game/systems/platformOriginalsPipelineSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 70,
      budget: 500_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 1,
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
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: Originals pipeline', () => {
  it('auto-advances commissioned Originals and releases them onto the platform', () => {
    const original: Project = {
      id: 'project:original:2026:W1:111111',
      title: 'Test Original',
      type: 'series',
      script: {
        id: 'script:original:2026:W1:111111',
        title: 'Test Original',
        genre: 'drama',
        logline: 'Test',
        writer: 'In-house',
        pages: 60,
        quality: 80,
        budget: 2_500_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 50,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 6,
          criticalPotential: 6,
          cgiIntensity: 'minimal',
        },
      },
      currentPhase: 'development',
      budget: {
        total: 25_000_000,
        allocated: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0,
        },
        spent: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0,
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0,
        },
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: { start: new Date(), end: new Date() },
        principalPhotography: { start: new Date(), end: new Date() },
        postProduction: { start: new Date(), end: new Date() },
        release: new Date(),
        milestones: [],
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'TestFlix',
          platformId: 'player-platform:studio-1',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 1 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      },
      status: 'development',
      metrics: {},
      phaseDuration: 8,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 0,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 60,
        issues: [],
      },
      releaseFormat: 'weekly',
      episodeCount: 10,
      streamingContract: {
        id: 'contract:original:2026:W1:111111',
        dealKind: 'streaming',
        platformId: 'player-platform:studio-1',
        name: 'TestFlix Original - Test Original',
        type: 'series',
        duration: 52,
        startWeek: 1,
        startYear: 2026,
        endWeek: 1,
        endYear: 2027,
        upfrontPayment: 0,
        episodeRate: 2_500_000,
        performanceBonus: [],
        expectedViewers: 0,
        expectedCompletionRate: 0.72,
        expectedSubscriberGrowth: 0,
        status: 'active',
        performanceScore: 0,
        exclusivityClause: true,
        marketingSupport: 0,
      },
    };

    const rng = createRng(123);

    let state = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1.0,
          adLoadIndex: 55,
          freshness: 70,
          catalogValue: 70,
        },
        rivals: [],
      },
      projects: [original],
    });

    const systems = [PlatformMarketBootstrapSystem, PlatformOriginalsPipelineSystem];

    for (let i = 0; i < 26; i += 1) {
      state = advanceWeek(state, rng, systems).nextState;
    }

    const out = (state.projects ?? [])[0] as any;
    expect(out.status).toBe('released');
    expect(out.releaseWeek).toBe(27);
    expect(out.releaseYear).toBe(2026);
    expect(typeof out.metrics?.criticsScore).toBe('number');
    expect(typeof out.metrics?.audienceScore).toBe('number');
  });
});
