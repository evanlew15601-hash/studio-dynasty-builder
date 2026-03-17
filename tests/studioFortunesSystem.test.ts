import { describe, expect, it } from 'vitest';
import type { GameState, Studio } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { StudioFortunesSystem } from '@/game/systems/studioFortunesSystem';
import { stableInt } from '@/utils/stableRandom';

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
    currentYear: 2026,
    currentWeek: 52,
    currentQuarter: 4,
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
    universeSeed: 101,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

describe('StudioFortunesSystem', () => {
  it('applies deterministic yearly reputation/budget drift to competitor studios', () => {
    const studio: Studio = {
      id: 's2',
      name: 'Crimson Peak Entertainment',
      reputation: 70,
      budget: 50_000_000,
      founded: 1991,
      specialties: ['horror', 'thriller'] as any,
      awards: [],
    };

    const state = makeBaseState({ competitorStudios: [studio] });

    const result = advanceWeek(state, createRng(1), [StudioFortunesSystem]);

    const next = result.nextState.competitorStudios[0];
    const previousYear = 2026;
    const seed = `${state.universeSeed ?? 0}|studioFortunes|${previousYear}|${studio.id}`;

    const trendBoost = 0; // trending genre is drama
    const repDelta = stableInt(`${seed}|rep`, -4, 4) + trendBoost;
    const budPct = stableInt(`${seed}|budPct`, -6, 10) / 100;

    expect(next.reputation).toBe(Math.max(0, Math.min(100, studio.reputation + repDelta)));
    expect(next.budget).toBe(Math.max(0, Math.round(studio.budget * (1 + budPct))));
  });

  it('biases drift based on previous-year release performance when available', () => {
    const studio: Studio = {
      id: 's2',
      name: 'Crimson Peak Entertainment',
      reputation: 70,
      budget: 50_000_000,
      founded: 1991,
      specialties: ['horror', 'thriller'] as any,
      awards: [],
    };

    const hit = {
      id: 'ai-hit-1',
      title: 'Midnight Smash',
      type: 'feature',
      status: 'released',
      currentPhase: 'distribution',
      phaseDuration: 0,
      studioName: studio.name,
      script: {
        id: 's1',
        title: 'Midnight Smash',
        genre: 'horror',
        logline: 'x',
        writer: 'x',
        pages: 1,
        quality: 80,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {} as any,
        characters: [],
      },
      budget: { total: 10_000_000, allocated: {} as any, spent: {} as any, overages: {} as any },
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      contractedTalent: [],
      developmentProgress: {} as any,
      metrics: { boxOfficeTotal: 50_000_000, criticsScore: 90 } as any,
      releaseWeek: 20,
      releaseYear: 2026,
    } as any;

    const state = makeBaseState({ competitorStudios: [studio], allReleases: [hit] as any });

    const result = advanceWeek(state, createRng(1), [StudioFortunesSystem]);

    const next = result.nextState.competitorStudios[0];
    const previousYear = 2026;
    const seed = `${state.universeSeed ?? 0}|studioFortunes|${previousYear}|${studio.id}`;

    // Performance: ROI=5, critics=90 => capped rep +6; budget pct +0.09.
    const perfRep = 6;
    const perfBudPct = 0.09;

    const trendBoost = 0;
    const repDelta = stableInt(`${seed}|rep`, -4, 4) + trendBoost + perfRep;
    const budPct = stableInt(`${seed}|budPct`, -6, 10) / 100 + perfBudPct;

    expect(next.reputation).toBe(clamp(studio.reputation + repDelta, 0, 100));
    expect(next.budget).toBe(Math.max(0, Math.round(studio.budget * (1 + budPct))));
  });
});
