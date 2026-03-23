import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import type { TickContext } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { PlatformAutoStreamingWindowsSystem } from '@/game/systems/platformAutoStreamingWindowsSystem';

function makeCtx(seed: number, week: number, year: number): TickContext {
  return {
    rng: createRng(seed),
    week,
    year,
    quarter: Math.max(1, Math.min(4, Math.ceil(week / 13))),
    recap: [],
    debug: false,
    prevState: {} as any,
  };
}

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
    currentYear: 2027,
    currentWeek: 20,
    currentQuarter: 2,
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

function makeTheatricalFilm(id: string, releaseWeek: number, releaseYear: number): Project {
  return {
    id,
    title: id,
    type: 'feature',
    status: 'released',
    currentPhase: 'distribution',
    releaseWeek,
    releaseYear,
    script: { id: `${id}-script`, title: id, genre: 'drama', quality: 70 } as any,
    budget: { total: 10_000_000 } as any,
    distributionStrategy: {
      primary: {
        type: 'theatrical',
        platform: 'Theaters',
        revenue: { type: 'box-office', studioShare: 0.5 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    } as any,
    postTheatricalReleases: [],
    metrics: {
      inTheaters: false,
      theatricalRunLocked: true,
    } as any,
    cast: [],
    crew: [],
    contractedTalent: [],
    timeline: {} as any,
    locations: [],
    phaseDuration: 0,
    developmentProgress: {} as any,
  } as any;
}

describe('Streaming Wars: auto streaming windows system', () => {
  it('schedules player-owned theatrical films to arrive on the player platform when active', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const project = makeTheatricalFilm('film-1', 1, 2027);

    const state = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: playerPlatformId,
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
        },
        rivals: [
          { id: 'streamflix', name: 'StreamFlix', subscribers: 30_000_000, cash: 0, status: 'healthy' },
        ],
      } as any,
      projects: [project],
    });

    const next = PlatformAutoStreamingWindowsSystem.onTick(state as any, makeCtx(123, 20, 2027)) as any;

    const updated = next.projects[0] as Project;
    const ownedWindow = (updated.postTheatricalReleases ?? []).find((r: any) => r.platform === 'streaming' && r.platformId === playerPlatformId);

    expect(ownedWindow).toBeTruthy();
  });

  it('treats player studio releases in allReleases as player-owned when studioName matches, scheduling to the player platform', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const project = makeTheatricalFilm('legacy-player-film', 1, 2027);
    (project as any).studioName = 'Test Studio';

    const state = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: playerPlatformId,
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
        },
        rivals: [
          { id: 'streamflix', name: 'StreamFlix', subscribers: 30_000_000, cash: 0, status: 'healthy' },
        ],
      } as any,
      allReleases: [project],
    });

    const next = PlatformAutoStreamingWindowsSystem.onTick(state as any, makeCtx(456, 20, 2027)) as any;

    const updated = next.allReleases[0] as Project;
    const ownedWindow = (updated.postTheatricalReleases ?? []).find((r: any) => r.platform === 'streaming' && r.platformId === playerPlatformId);

    expect(ownedWindow).toBeTruthy();
  });

  it('schedules competitor theatrical films to a rival provider when the player platform is not the owner', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const competitor = makeTheatricalFilm('comp-1', 1, 2027);

    const state = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: playerPlatformId,
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
        },
        rivals: [
          { id: 'streamflix', name: 'StreamFlix', subscribers: 30_000_000, cash: 0, status: 'healthy' },
          { id: 'orchardstream', name: 'Orchard Stream', subscribers: 10_000_000, cash: 0, status: 'healthy' },
        ],
      } as any,
      allReleases: [competitor],
    });

    const next = PlatformAutoStreamingWindowsSystem.onTick(state as any, makeCtx(321, 20, 2027)) as any;

    const updated = next.allReleases[0] as Project;
    const window = (updated.postTheatricalReleases ?? []).find((r: any) => r.platform === 'streaming' && typeof r.providerId === 'string');

    expect(window).toBeTruthy();
    expect(['streamflix', 'orchardstream']).toContain((window as any).providerId);
    expect((window as any).providerId).not.toBe(playerPlatformId);
  });

  it('assigns a concrete providerId to legacy streaming windows missing a platform id', () => {
    const project = makeTheatricalFilm('film-legacy', 1, 2027);
    project.postTheatricalReleases = [
      {
        id: 'release:film-legacy:streaming:2027:W20',
        projectId: 'film-legacy',
        platform: 'streaming',
        releaseDate: new Date('2027-01-01'),
        releaseWeek: 20,
        releaseYear: 2027,
        delayWeeks: 0,
        revenue: 0,
        weeklyRevenue: 0,
        weeksActive: 0,
        status: 'planned',
        cost: 0,
        durationWeeks: 26,
      } as any,
    ];

    const state = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        rivals: [
          { id: 'streamflix', name: 'StreamFlix', subscribers: 30_000_000, cash: 0, status: 'healthy' },
        ],
      } as any,
      projects: [project],
    });

    const next = PlatformAutoStreamingWindowsSystem.onTick(state as any, makeCtx(999, 20, 2027)) as any;

    const updated = next.projects[0] as Project;
    const fixed = (updated.postTheatricalReleases ?? [])[0] as any;

    expect(fixed.providerId).toBe('streamflix');
  });
});
