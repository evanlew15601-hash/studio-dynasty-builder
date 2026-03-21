import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { ScheduledReleaseSystem } from '@/game/systems/scheduledReleaseSystem';
import { PlatformOutputDealSystem } from '@/game/systems/platformOutputDealSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 0,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    dlc: { streamingWars: true },
    currentYear: 2027,
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
    universeSeed: 777,
    rngState: 777 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: output deal', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('stores output deal details and applies cash injection on accept', () => {
    const upfrontPayment = 250_000_000;

    const event: GameEvent = {
      id: 'evt:output-deal',
      title: 'Output deal',
      description: 'Output deal.',
      type: 'market',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:output-deal',
        playerPlatformId: 'player-platform:studio-1',
        offers: [
          {
            buyerId: 'streamflix',
            buyerName: 'StreamFlix',
            upfrontPayment,
            termWeeks: 52,
            windowDelayWeeks: 14,
            windowDurationWeeks: 26,
          },
        ],
      },
      choices: [
        {
          id: 'output:streamflix',
          text: 'Sign',
          consequences: [{ type: 'budget', impact: upfrontPayment, description: 'MG' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        studio: { ...makeBaseState().studio, budget: 0 },
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: 0,
            status: 'active',
            freshness: 70,
            catalogValue: 65,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 45_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
            },
          ],
          brandRegistry: [],
        } as any,
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(event.id, 'output:streamflix');

    const after = useGameStore.getState().game!;

    expect(after.studio.budget).toBe(upfrontPayment);
    expect(after.platformMarket?.player?.outputDeal?.partnerId).toBe('streamflix');
    expect(after.platformMarket?.player?.cash).toBe(upfrontPayment);
  });

  it('automatically schedules a partner streaming window for new theatrical releases while deal is active', () => {
    const project: Project = {
      id: 'p1',
      title: 'Future Hit',
      script: {
        id: 's1',
        title: 'Future Hit',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 70,
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
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'scheduled-for-release',
      metrics: {},
      phaseDuration: -1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      releaseStrategy: {
        type: 'wide',
        premiereDate: new Date(2027, 0, 1),
        rolloutPlan: [],
        specialEvents: [],
        pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
      } as any,
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2027,
    };

    const state = makeBaseState({
      projects: [project],
      allReleases: [project],
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'TestFlix',
          subscribers: 3_000_000,
          cash: 0,
          status: 'active',
          freshness: 70,
          catalogValue: 65,
          outputDeal: {
            partnerId: 'streamflix',
            partnerName: 'StreamFlix',
            startWeek: 9,
            startYear: 2027,
            endWeek: 9,
            endYear: 2028,
            upfrontPayment: 0,
            windowDelayWeeks: 14,
            windowDurationWeeks: 26,
          },
        },
        rivals: [
          {
            id: 'streamflix',
            name: 'StreamFlix',
            subscribers: 45_000_000,
            cash: 2_000_000_000,
            status: 'healthy',
          },
        ],
      } as any,
    });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, PlatformOutputDealSystem]);
    const next = result.nextState;

    const released = next.projects[0];
    expect(released.status).toBe('released');

    const window = (released.postTheatricalReleases || []).find((r: any) => r.platform === 'streaming' && r.providerId === 'streamflix');
    expect(window).toBeTruthy();
    expect(window.releaseYear).toBe(2027);
    expect(window.releaseWeek).toBe(24);
  });
});
