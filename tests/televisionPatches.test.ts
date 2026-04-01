import { describe, expect, it } from 'vitest';
import type { GameState, Project, Studio } from '@/types/game';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
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

  return { ...base, ...(overrides || {}) };
}

function makeFilmRelease(year: number, week: number): Project {
  return {
    id: `ai-film-${year}-W${week}`,
    title: 'AI Film',
    type: 'feature',
    status: 'released' as any,
    currentPhase: 'release' as any,
    phaseDuration: 0,
    studioName: 'Some Studio',
    script: {
      id: 'script-ai-film',
      title: 'AI Film',
      genre: 'drama' as any,
      logline: 'A film release used for tests.',
      writer: 'Writer',
      pages: 100,
      quality: 60,
      budget: 10_000_000,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 110,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    budget: {
      total: 10_000_000,
      allocated: {
        aboveTheLine: 2_000_000,
        belowTheLine: 3_000_000,
        postProduction: 1_500_000,
        marketing: 2_500_000,
        distribution: 1_000_000,
        contingency: 0,
      },
      spent: {
        aboveTheLine: 2_000_000,
        belowTheLine: 3_000_000,
        postProduction: 1_500_000,
        marketing: 2_500_000,
        distribution: 1_000_000,
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
        platform: 'Theatrical',
        type: 'theatrical',
        revenue: { type: 'box-office', studioShare: 50 },
      },
      international: [],
      windows: [],
      marketingBudget: 2_500_000,
    },
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    },
    metrics: {
      weeksSinceRelease: 0,
    } as any,
    releaseWeek: week,
    releaseYear: year,
  } as any;
}

describe('televisionPatches.primeCompetitorTelevision', () => {
  it('seeds at least two already-airing competitor TV shows when missing', () => {
    const studios: Studio[] = [
      {
        id: 'studio-a',
        name: 'Crimson Peak Entertainment',
        reputation: 70,
        budget: 50_000_000,
        founded: 1990,
        specialties: ['horror'] as any,
        awards: [],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      } as any,
      {
        id: 'studio-b',
        name: 'Golden Horizon Studios',
        reputation: 75,
        budget: 70_000_000,
        founded: 1980,
        specialties: ['drama'] as any,
        awards: [],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      } as any,
    ];

    const state = makeBaseState({
      universeSeed: 111,
      competitorStudios: studios,
      talent: [
        { id: 't-dir-1', name: 'Director One', type: 'director', gender: 'Male', marketValue: 10_000_000, reputation: 70 } as any,
        { id: 't-act-1', name: 'Actor One', type: 'actor', gender: 'Female', marketValue: 8_000_000, reputation: 65 } as any,
        { id: 't-act-2', name: 'Actor Two', type: 'actor', gender: 'Male', marketValue: 6_000_000, reputation: 60 } as any,
        { id: 't-act-3', name: 'Actor Three', type: 'actor', gender: 'Male', marketValue: 5_000_000, reputation: 55 } as any,
      ],
      allReleases: [makeFilmRelease(2026, 1)],
    });

    const next = primeCompetitorTelevision(state, { minAiring: 2 });

    const competitorNames = new Set(studios.map((s) => s.name));

    const airing = (next.allReleases as any[])
      .filter((p: any) => (p.type === 'series' || p.type === 'limited-series'))
      .filter((p: any) => competitorNames.has(p.studioName))
      .filter((p: any) => {
        const season = p.seasons?.[0];
        const aired = season?.episodesAired || 0;
        const total = season?.totalEpisodes || p.episodeCount || 0;
        return aired > 0 && total > 0 && aired < total;
      });

    expect(airing.length).toBeGreaterThanOrEqual(2);

    // Seeded competitor TV should have credited talent so awards/filmographies can reference real people.
    for (const p of airing) {
      const creditedCharacterIds = (p.script?.characters || []).map((c: any) => c.assignedTalentId).filter(Boolean);
      const creditedCastIds = (p.cast || []).map((c: any) => c.talentId).filter(Boolean);
      const creditedCrewIds = (p.crew || []).map((c: any) => c.talentId).filter(Boolean);

      expect([...creditedCharacterIds, ...creditedCastIds, ...creditedCrewIds].length).toBeGreaterThan(0);
    }
  });

  it('seeds even when allReleases is empty', () => {
    const studios: Studio[] = [
      {
        id: 'studio-a',
        name: 'Crimson Peak Entertainment',
        reputation: 70,
        budget: 50_000_000,
        founded: 1990,
        specialties: ['horror'] as any,
        awards: [],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      } as any,
      {
        id: 'studio-b',
        name: 'Golden Horizon Studios',
        reputation: 75,
        budget: 70_000_000,
        founded: 1980,
        specialties: ['drama'] as any,
        awards: [],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      } as any,
    ];

    const state = makeBaseState({
      universeSeed: 111,
      competitorStudios: studios,
      talent: [
        { id: 't-dir-1', name: 'Director One', type: 'director', gender: 'Male', marketValue: 10_000_000, reputation: 70 } as any,
        { id: 't-act-1', name: 'Actor One', type: 'actor', gender: 'Female', marketValue: 8_000_000, reputation: 65 } as any,
        { id: 't-act-2', name: 'Actor Two', type: 'actor', gender: 'Male', marketValue: 6_000_000, reputation: 60 } as any,
      ],
    });

    const next = primeCompetitorTelevision(state, { minAiring: 2 });

    const competitorNames = new Set(studios.map((s) => s.name));

    const airing = (next.allReleases as any[])
      .filter((p: any) => (p.type === 'series' || p.type === 'limited-series'))
      .filter((p: any) => competitorNames.has(p.studioName))
      .filter((p: any) => {
        const season = p.seasons?.[0];
        const aired = season?.episodesAired || 0;
        const total = season?.totalEpisodes || p.episodeCount || 0;
        return aired > 0 && total > 0 && aired < total;
      });

    expect(airing.length).toBeGreaterThanOrEqual(2);
  });

  it('is idempotent once the minimum airing shows exist', () => {
    const studios: Studio[] = [
      {
        id: 'studio-a',
        name: 'Crimson Peak Entertainment',
        reputation: 70,
        budget: 50_000_000,
        founded: 1990,
        specialties: ['horror'] as any,
        awards: [],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      } as any,
    ];

    const base = makeBaseState({
      universeSeed: 111,
      competitorStudios: studios,
      talent: [
        { id: 't-dir-1', name: 'Director One', type: 'director', gender: 'Male', marketValue: 10_000_000, reputation: 70 } as any,
        { id: 't-act-1', name: 'Actor One', type: 'actor', gender: 'Female', marketValue: 8_000_000, reputation: 65 } as any,
        { id: 't-act-2', name: 'Actor Two', type: 'actor', gender: 'Male', marketValue: 6_000_000, reputation: 60 } as any,
      ],
      allReleases: [makeFilmRelease(2026, 1)],
    });

    const first = primeCompetitorTelevision(base, { minAiring: 2 });
    const second = primeCompetitorTelevision(first, { minAiring: 2 });

    const ids1 = (first.allReleases as any[])
      .filter((p: any) => (p.type === 'series' || p.type === 'limited-series'))
      .map((p: any) => p.id)
      .sort();

    const ids2 = (second.allReleases as any[])
      .filter((p: any) => (p.type === 'series' || p.type === 'limited-series'))
      .map((p: any) => p.id)
      .sort();

    expect(ids2).toEqual(ids1);
  });
});
