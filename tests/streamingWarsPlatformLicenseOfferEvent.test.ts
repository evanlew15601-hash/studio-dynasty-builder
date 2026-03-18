import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
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
    currentWeek: 12,
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

describe('Streaming Wars: licensing offer event', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 9001, rngState: 9001 }), 123);
  });

  it('enqueues a deterministic licensing offer at week 13 when a released title exists on the player platform', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 9001,
        rngState: 9001,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: -50_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 40_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
          ],
        },
        projects: [
          {
            id: 'p1',
            title: 'Big Original',
            type: 'series',
            status: 'released',
            currentPhase: 'release',
            script: { id: 's1', title: 'Big Original', genre: 'drama', logline: '', writer: '', pages: 60, quality: 80, budget: 0, developmentStage: 'concept', themes: [], targetAudience: '', estimatedRuntime: 50, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 6, criticalPotential: 6, cgiIntensity: 'minimal' } },
            budget: { total: 1, allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 } },
            cast: [],
            crew: [],
            timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] },
            locations: [],
            distributionStrategy: {
              primary: {
                type: 'streaming',
                platform: 'TestFlix',
                platformId: 'player-platform:studio-1',
                revenue: { type: 'subscription-share', studioShare: 1 },
              },
              international: [],
              windows: [],
              marketingBudget: 0,
            },
            releaseStrategy: {
              type: 'streaming',
              streamingPlatformId: 'player-platform:studio-1',
              streamingExclusive: true,
              premiereDate: new Date(),
              rolloutPlan: [],
              specialEvents: [],
              pressStrategy: {
                reviewScreenings: 0,
                pressJunkets: 0,
                interviews: 0,
                expectedCriticalReception: 0,
              },
            },
            metrics: {},
            phaseDuration: 0,
            contractedTalent: [],
            developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 60, issues: [] },
          } as any,
        ],
      }),
      123
    );

    useGameStore.getState().advanceWeek(); // to week 13

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(13);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:license-offer');
  });

  it('also triggers for exclusive streaming-contract Originals (no releaseStrategy needed)', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 9002,
        rngState: 9002,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: -50_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 40_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
          ],
        },
        projects: [
          {
            id: 'p1',
            title: 'Big Original (Contract)',
            type: 'series',
            status: 'released',
            currentPhase: 'release',
            script: { id: 's1', title: 'Big Original', genre: 'drama', logline: '', writer: '', pages: 60, quality: 80, budget: 0, developmentStage: 'concept', themes: [], targetAudience: '', estimatedRuntime: 50, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 6, criticalPotential: 6, cgiIntensity: 'minimal' } },
            budget: { total: 1, allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }, overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 } },
            cast: [],
            crew: [],
            timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] },
            locations: [],
            distributionStrategy: {
              primary: {
                type: 'streaming',
                platform: 'TestFlix',
                platformId: 'player-platform:studio-1',
                revenue: { type: 'subscription-share', studioShare: 1 },
              },
              international: [],
              windows: [],
              marketingBudget: 0,
            },
            streamingContract: {
              id: 'c1',
              dealKind: 'streaming',
              platformId: 'player-platform:studio-1',
              name: 'TestFlix Original - Big Original',
              type: 'series',
              duration: 52,
              startWeek: 1,
              startYear: 2027,
              endWeek: 1,
              endYear: 2028,
              upfrontPayment: 0,
              episodeRate: 0,
              performanceBonus: [],
              expectedViewers: 0,
              expectedCompletionRate: 0.7,
              expectedSubscriberGrowth: 0,
              status: 'active',
              performanceScore: 0,
              exclusivityClause: true,
              marketingSupport: 0,
            },
            releaseWeek: 1,
            releaseYear: 2027,
            metrics: {},
            phaseDuration: 0,
            contractedTalent: [],
            developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 60, issues: [] },
          } as any,
        ],
      }),
      123
    );

    useGameStore.getState().advanceWeek(); // to week 13

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(13);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:license-offer');
  });
});
