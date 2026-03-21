import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { ScheduledReleaseSystem } from '@/game/systems/scheduledReleaseSystem';
import { TelevisionPerformanceSystem } from '@/game/systems/televisionPerformanceSystem';
import { StreamingPerformanceSystem } from '@/game/systems/streamingPerformanceSystem';
import { BoxOfficeSystem } from '@/game/systems/boxOfficeSystem';
import { PostTheatricalRevenueSystem } from '@/game/systems/postTheatricalRevenueSystem';

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

describe('Engine scheduled release system', () => {
  it('releases scheduled theatrical projects and allows box office to run opening week in the same tick', () => {
    const project: Project = {
      id: 'p1',
      title: 'Scheduled Release',
      script: {
        id: 's1',
        title: 'Scheduled Release',
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
        premiereDate: new Date(2024, 0, 1),
        rolloutPlan: [],
        specialEvents: [],
        pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
      } as any,
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
    };

    const state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, BoxOfficeSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);

    expect(updated.metrics?.boxOfficeTotal || 0).toBeGreaterThan(0);
    expect(next.boxOfficeHistory.some((w) => w.week === 10 && w.year === 2024)).toBe(true);
  });

  it('releases legacy release-phase projects that have a scheduled week/year but no scheduled-for-release status', () => {
    const project: Project = {
      id: 'p1-legacy',
      title: 'Legacy Planned Release',
      script: {
        id: 's1-legacy',
        title: 'Legacy Planned Release',
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
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'ready-for-release' as any,
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
        premiereDate: new Date(2024, 0, 1),
        rolloutPlan: [],
        specialEvents: [],
        pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
      } as any,
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
    };

    const state = makeBaseState({ projects: [project], allReleases: [project] });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);
  });

  it('releases scheduled streaming films and creates a streaming window for post-theatrical revenue', () => {
    const project: Project = {
      id: 'p-stream',
      title: 'Streaming Premiere',
      script: {
        id: 's-stream',
        title: 'Streaming Premiere',
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
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'StreamFlix',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 60 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      } as any,
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
        type: 'streaming',
        streamingProviderId: 'streamflix',
      } as any,
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
    };

    const state = makeBaseState({
      projects: [project],
    });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, BoxOfficeSystem, PostTheatricalRevenueSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);

    expect(updated.metrics?.streaming?.viewsFirstWeek || 0).toBeGreaterThan(0);

    const streamingWindow = (updated.postTheatricalReleases || []).find((r) => r.platform === 'streaming');
    expect(streamingWindow).toBeTruthy();
    expect(streamingWindow?.weeklyRevenue || 0).toBeGreaterThan(0);
    // PostTheatricalRevenueSystem should have processed this window in the same tick.
    expect(streamingWindow?.revenue || 0).toBeGreaterThan(0);
    expect(streamingWindow?.lastProcessedWeek).toBe(10);
    expect(streamingWindow?.lastProcessedYear).toBe(2024);
  });

  it('releases scheduled streaming films when releaseStrategy is missing but distributionStrategy is streaming', () => {
    const project: Project = {
      id: 'p-stream-legacy',
      title: 'Streaming Premiere (Legacy)',
      script: {
        id: 's-stream-legacy',
        title: 'Streaming Premiere (Legacy)',
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
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'StreamFlix',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 60 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      } as any,
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
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
      // releaseStrategy intentionally omitted (legacy saves/mods)
    };

    const state = makeBaseState({ projects: [project] });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, BoxOfficeSystem, PostTheatricalRevenueSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);

    expect(updated.metrics?.streaming?.viewsFirstWeek || 0).toBeGreaterThan(0);

    // Should not be treated as a theatrical release.
    const boxOfficeWeek = next.boxOfficeHistory.find((w) => w.week === 10 && w.year === 2024);
    const containsProject = (boxOfficeWeek?.releases || []).some((r) => r.projectId === project.id);
    expect(containsProject).toBe(false);

    const streamingWindow = (updated.postTheatricalReleases || []).find((r) => r.platform === 'streaming');
    expect(streamingWindow).toBeTruthy();
  });

  it('releases scheduled TV projects and advances episode airing + ratings in the same tick', () => {
    const project: Project = {
      id: 'p-tv',
      title: 'TV Premiere',
      script: {
        id: 's-tv',
        title: 'TV Premiere',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 60,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 45,
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
      type: 'series',
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'StreamFlix',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 60 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      } as any,
      status: 'scheduled-for-release',
      metrics: {
        criticsScore: 70,
        audienceScore: 75,
      } as any,
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
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
      episodeCount: 8,
      releaseFormat: 'weekly' as any,
    };

    const state = makeBaseState({
      projects: [project],
    });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, TelevisionPerformanceSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);

    expect(updated.seasons && updated.seasons.length).toBeGreaterThan(0);
    expect(updated.seasons?.[0]?.episodesAired || 0).toBeGreaterThan(0);
    expect(updated.metrics?.streaming?.viewsFirstWeek || 0).toBeGreaterThan(0);
  });

  it('streaming performance tick advances weeksSinceRelease and totalViews deterministically', () => {
    const project: Project = {
      id: 'p-stream-2',
      title: 'Streaming Long Tail',
      script: {
        id: 's-stream-2',
        title: 'Streaming Long Tail',
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
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'StreamFlix',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 60 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      } as any,
      status: 'released',
      metrics: {
        criticsScore: 70,
        audienceScore: 75,
        streaming: {
          viewsFirstWeek: 500_000,
          totalViews: 500_000,
          completionRate: 60,
          audienceShare: 10,
          watchTimeHours: 0,
          subscriberGrowth: 0,
        },
        weeksSinceRelease: 0,
      } as any,
      releaseWeek: 8,
      releaseYear: 2024,
      releaseStrategy: {
        type: 'streaming',
        streamingProviderId: 'streamflix',
      } as any,
    };

    const state = makeBaseState({
      currentWeek: 10,
      currentYear: 2024,
      projects: [project],
    });

    const result = advanceWeek(state, createRng(1), [StreamingPerformanceSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(11);

    const updated = next.projects[0];
    expect(updated.metrics?.weeksSinceRelease || 0).toBeGreaterThan(0);
    expect(updated.metrics?.streaming?.totalViews || 0).toBeGreaterThan(500_000);
  });
});
