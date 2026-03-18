import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 85,
      budget: 5_000_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
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

function makeExclusiveStreamingHit(params: { projectId: string; platformId: string }): Project {
  return {
    id: params.projectId,
    title: 'Anchor Hit',
    type: 'feature',
    status: 'released',
    currentPhase: 'released',
    script: {
      id: 'script-1',
      title: 'Anchor Hit',
      genre: 'drama',
      logline: 'Test',
      writer: 'Test',
      pages: 110,
      quality: 84,
      budget: 30_000_000,
      developmentStage: 'final',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 120,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 7,
        criticalPotential: 7,
        cgiIntensity: 'minimal',
      },
    },
    releaseWeek: 1,
    releaseYear: 2027,
    budget: { total: 30_000_000, allocated: {}, spent: {}, overages: {} } as any,
    distributionStrategy: {
      primary: {
        platform: 'TestFlix',
        platformId: params.platformId,
        type: 'streaming',
        revenue: { type: 'subscription-share', studioShare: 1 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    releaseStrategy: {
      type: 'streaming',
      premiereDate: new Date(2027, 0, 1),
      rolloutPlan: [],
      specialEvents: [],
      pressStrategy: { expectedCriticalReception: 60 },
      streamingPlatformId: params.platformId,
      streamingExclusive: true,
      streamingExclusivityWeeks: 999,
    },
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    metrics: {},
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 60, issues: [] },
    postTheatricalReleases: [],
  } as any;
}

function resolveBlockingEventSafe(event: any) {
  const kind = event?.data?.kind as string | undefined;

  if (kind === 'platform:license-offer') return { choice: 'decline' };
  if (kind === 'platform:bidding-war') return { choice: 'decline' };
  if (kind === 'platform:overall-deal') return { choice: 'let-go' };
  if (kind === 'platform:mna-offer') return { choice: 'pass' };
  if (kind === 'platform:rival-collapse') return { choice: 'pass' };
  if (kind === 'platform:churn-spike') return { choice: 'retention-campaign' };
  if (kind === 'platform:outage') return { choice: 'refunds' };
  if (kind === 'platform:forced-sale') return { choice: 'emergency-funding' };

  return { choice: event?.choices?.[0]?.id ?? 'hold-course' };
}

function expectFinite(n: number) {
  expect(Number.isFinite(n)).toBe(true);
}

describe('Streaming Wars: long-horizon stability (no NaNs, no negative subs)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 9001, rngState: 9001 }), 123);
  });

  it('runs 5 years with deterministic platform systems and stays stable', () => {
    const playerPlatformId = 'player-platform:studio-1';

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 9001,
        rngState: 9001,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 20_000_000,
            cash: 1_500_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 55, adFreePct: 45 },
            promotionBudgetPerWeek: 5_000_000,
            priceIndex: 0.85,
            adLoadIndex: 55,
            freshness: 70,
            catalogValue: 70,
            distressWeeks: 0,
            originalsQualityBonus: 0,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 35_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
            {
              id: 'primewave',
              name: 'PrimeWave',
              subscribers: 25_000_000,
              cash: 1_250_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 55, adFreePct: 45 },
              priceIndex: 1.0,
              catalogValue: 62,
              freshness: 58,
            },
          ],
        },
        projects: [makeExclusiveStreamingHit({ projectId: 'p-1', platformId: playerPlatformId })],
      }),
      123
    );

    // 5 years
    for (let i = 0; i < 52 * 5; i++) {
      useGameStore.getState().advanceWeek();

      let s = useGameStore.getState().game!;

      while ((s.eventQueue || []).length > 0) {
        const evt = s.eventQueue[0];
        const { choice } = resolveBlockingEventSafe(evt as any);
        useGameStore.getState().resolveGameEvent(evt.id, choice);
        s = useGameStore.getState().game!;
      }

      const market = s.platformMarket;
      expect(market).toBeTruthy();

      const player = market?.player;
      expect(player?.status).toBe('active');
      expect((player?.subscribers ?? 0) >= 0).toBe(true);

      if (player) {
        expectFinite(player.cash ?? 0);
        expectFinite(player.subscribers ?? 0);
        expectFinite(player.freshness ?? 0);
        expectFinite(player.catalogValue ?? 0);
      }

      for (const r of market?.rivals ?? []) {
        if (!r) continue;
        expect((r.subscribers ?? 0) >= 0).toBe(true);
        expectFinite(r.cash ?? 0);
        expectFinite(r.subscribers ?? 0);
      }

      const k = market?.lastWeek?.player;
      if (k) {
        expectFinite(k.churnRate);
        expectFinite(k.revenue);
        expectFinite(k.opsCost);
        expectFinite(k.profit);
      }
    }

    const final = useGameStore.getState().game!;
    expect(final.platformMarket?.player?.status).toBe('active');
  });
});
