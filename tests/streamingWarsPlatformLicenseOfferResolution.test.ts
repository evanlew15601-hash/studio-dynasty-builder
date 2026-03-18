import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 1_000_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 13,
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

describe('Streaming Wars: license offer resolution updates title exclusivity', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 500, rngState: 500 }), 123);
  });

  it('accepting a platform:license-offer marks a direct-to-platform title as non-exclusive', () => {
    const platformId = 'player-platform:studio-1';

    const event: GameEvent = {
      id: 'evt-license-1',
      title: 'Licensing offer',
      description: 'Test',
      type: 'opportunity',
      triggerDate: new Date(),
      data: {
        kind: 'platform:license-offer',
        titleProjectId: 'p1',
        titleName: 'Big Original',
        offer: 50_000_000,
        rivalName: 'StreamFlix',
        playerPlatformId: platformId,
      },
      choices: [
        {
          id: 'accept',
          text: 'Accept',
          consequences: [{ type: 'budget', impact: 50_000_000, description: '+50M' }],
        },
        {
          id: 'decline',
          text: 'Decline',
          consequences: [{ type: 'reputation', impact: 1, description: '+1 rep' }],
        },
      ],
    };

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 500,
        rngState: 500,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: platformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: 0,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
          },
          rivals: [],
        },
        projects: [
          {
            id: 'p1',
            title: 'Big Original',
            type: 'feature',
            status: 'released',
            currentPhase: 'release',
            script: { id: 's1', title: 'Big Original', genre: 'drama', logline: '', writer: '', pages: 60, quality: 80, budget: 0, developmentStage: 'concept', themes: [], targetAudience: '', estimatedRuntime: 50, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 6, criticalPotential: 6, cgiIntensity: 'minimal' } },
            budget: { total: 1, allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 } },
            cast: [],
            crew: [],
            timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] },
            locations: [],
            distributionStrategy: {
              primary: { type: 'streaming', platform: 'TestFlix', platformId, revenue: { type: 'subscription-share', studioShare: 1 } },
              international: [],
              windows: [],
              marketingBudget: 0,
            },
            releaseStrategy: {
              type: 'streaming',
              streamingProviderId: platformId,
              streamingPlatformId: platformId,
              streamingExclusive: true,
              premiereDate: new Date(),
              rolloutPlan: [],
              specialEvents: [],
              pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
            },
            metrics: {},
            phaseDuration: 0,
            contractedTalent: [],
            developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 60, issues: [] },
          } as any,
        ],
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent('evt-license-1', 'accept');

    const next = useGameStore.getState().game!;
    const updated = next.projects.find((p) => p.id === 'p1') as any;

    expect(updated.releaseStrategy.streamingExclusive).toBe(false);
  });
});
