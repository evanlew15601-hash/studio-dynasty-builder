import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
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
    currentWeek: 10,
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

describe('Streaming Wars: rival collapse transfers streaming windows to buyer', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 777, rngState: 777 }), 123);
  });

  it('moves collapsed rival catalog windows onto the player platform when the player buys', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const licensedTitle: Project = {
      id: 'title-1',
      title: 'Title 1',
      type: 'feature',
      status: 'released',
      currentPhase: 'distribution',
      releaseWeek: 1,
      releaseYear: 2027,
      script: { id: 's1', title: 'Title 1', genre: 'drama', quality: 80 } as any,
      budget: { total: 1 } as any,
      postTheatricalReleases: [
        {
          id: 'release:title-1:orchardstream:2027:W10',
          projectId: 'title-1',
          platform: 'streaming',
          providerId: 'orchardstream',
          releaseDate: new Date('2027-01-01'),
          releaseWeek: 10,
          releaseYear: 2027,
          delayWeeks: 0,
          revenue: 0,
          weeklyRevenue: 0,
          weeksActive: 0,
          status: 'active',
          cost: 0,
          durationWeeks: 26,
        } as any,
      ],
      metrics: { inTheaters: false, theatricalRunLocked: true } as any,
      cast: [],
      crew: [],
      contractedTalent: [],
      timeline: {} as any,
      locations: [],
      phaseDuration: 0,
      developmentProgress: {} as any,
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 777,
        rngState: 777,
        projects: [licensedTitle],
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: -50_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 45,
            catalogValue: 30,
            distressWeeks: 0,
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
            {
              id: 'orchardstream',
              name: 'Orchard Stream',
              subscribers: 8_000_000,
              cash: -300_000_000,
              status: 'distress',
              distressWeeks: 11,
              tierMix: { adSupportedPct: 20, adFreePct: 80 },
              priceIndex: 1.2,
              catalogValue: 55,
              freshness: 40,
            },
          ],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const withEvent = useGameStore.getState().game!;
    const event = withEvent.eventQueue[0];

    useGameStore.getState().resolveGameEvent(event.id, 'buy');

    const after = useGameStore.getState().game!;
    const updated = after.projects.find((p) => p.id === 'title-1')!;

    const window = (updated.postTheatricalReleases ?? []).find((r: any) => r.platform === 'streaming' && r.platformId === playerPlatformId);
    expect(window).toBeTruthy();
    expect((window as any).providerId).toBeUndefined();
  });
});
