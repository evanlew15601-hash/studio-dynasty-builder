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

  it('SeasonAiringStatusSystem patches allReleases entries when ids overlap', async () => {
    const { SeasonAiringStatusSystem } = await import('@/game/systems/seasonAiringStatusSystem');

    const project: Project = {
      id: 'project:original:p3',
      title: 'Original Series',
      script: { id: 's3', title: 'Original Series', genre: 'drama', pages: 60, quality: 50 } as any,
      type: 'series',
      status: 'released',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      metrics: {},
      releaseWeek: 1,
      releaseYear: 2024,
      seasons: [
        {
          seasonNumber: 1,
          totalEpisodes: 10,
          episodesAired: 0,
          productionStatus: 'complete',
          premiereDate: { week: 1, year: 2024 },
          episodes: [],
        } as any,
      ],
    } as any;

    const state = makeBaseState({
      dlc: { streamingWars: true },
      currentWeek: 9,
      currentYear: 2024,
      projects: [project],
      allReleases: [project as any],
    });

    const week1 = advanceWeek(state, createRng(1), [SeasonAiringStatusSystem]);

    const pProjects = week1.nextState.projects[0] as any;
    const pAll = (week1.nextState.allReleases as any[])[0] as any;

    expect(pProjects.seasons[0].airingStatus).toBe('airing');
    expect(pAll.seasons[0].airingStatus).toBe('airing');
  });

  it('PlatformOutputDealSystem patches allReleases entries when ids overlap', async () => {
    const { PlatformOutputDealSystem } = await import('@/game/systems/platformOutputDealSystem');

    const project: Project = {
      id: 'p4',
      title: 'Theatrical Film',
      studioId: 'studio-1',
      studioName: 'Player Studio',
      script: { id: 's4', title: 'Theatrical Film', genre: 'drama', pages: 100, quality: 50 } as any,
      type: 'feature',
      status: 'released',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      metrics: { boxOfficeTotal: 10_000_000, criticsScore: 70, audienceScore: 70 },
      releaseWeek: 10,
      releaseYear: 2024,
      releaseStrategy: { type: 'wide' } as any,
      postTheatricalReleases: [],
    } as any;

    const state = makeBaseState({
      dlc: { streamingWars: true },
      currentWeek: 9,
      currentYear: 2024,
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'PlayerFlix',
          launchedWeek: 1,
          launchedYear: 2023,
          subscribers: 1_000_000,
          cash: 0,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1,
          freshness: 50,
          catalogValue: 50,
          outputDeal: {
            partnerId: 'streamflix',
            partnerName: 'StreamFlix',
            startWeek: 1,
            startYear: 2024,
            endWeek: 52,
            endYear: 2024,
            upfrontPayment: 0,
            windowDelayWeeks: 0,
            windowDurationWeeks: 26,
          } as any,
        },
        rivals: [{ id: 'streamflix', name: 'StreamFlix', subscribers: 10_000_000, cash: 0, status: 'healthy', tierMix: { adSupportedPct: 50, adFreePct: 50 }, priceIndex: 1, catalogValue: 50, freshness: 50, distressWeeks: 0 }],
      } as any,
      projects: [project],
      allReleases: [project as any],
    });

    const week1 = advanceWeek(state, createRng(1), [PlatformOutputDealSystem]);

    const pProjects = week1.nextState.projects[0] as any;
    const pAll = (week1.nextState.allReleases as any[])[0] as any;

    expect((pProjects.postTheatricalReleases || []).length).toBe(1);
    expect((pAll.postTheatricalReleases || []).length).toBe(1);
    expect(pProjects.postTheatricalReleases[0].providerId).toBe('streamflix');
    expect(pAll.postTheatricalReleases[0].providerId).toBe('streamflix');
  });
});
