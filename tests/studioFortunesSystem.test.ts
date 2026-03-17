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
});
