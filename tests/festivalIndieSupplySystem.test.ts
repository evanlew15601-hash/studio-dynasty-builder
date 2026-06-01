import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { FestivalIndieSupplySystem, seedFestivalIndieProjectsForWeek } from '@/game/systems/festivalIndieSupplySystem';
import { listAvailableFestivalIndieProjects } from '@/utils/festivalMarketplace';
import { createRng } from '@/game/core/rng';
import type { TickContext } from '@/game/core/types';

function makeBaseGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 100_000_000,
      founded: 2000,
      specialties: ['drama'],
    },
    currentYear: 2025,
    currentWeek: 4,
    currentQuarter: 1,
    projects: [],
    talent: [] as TalentPerson[],
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
    ...overrides,
  } as GameState;
}

function makeTickContext(state: GameState): TickContext {
  return {
    rng: createRng(state.universeSeed ?? 1),
    week: state.currentWeek,
    year: state.currentYear,
    quarter: state.currentQuarter,
    recap: [],
    debug: false,
    prevState: state,
  };
}

describe('FestivalIndieSupplySystem', () => {
  it('adds new festival indie projects on the festival week', () => {
    const gameState = makeBaseGameState({ currentWeek: 4, currentYear: 2025, universeSeed: 12345, aiStudioProjects: [] });
    const next = FestivalIndieSupplySystem.onTick(gameState, makeTickContext(gameState));

    expect(next.aiStudioProjects).toBeDefined();
    expect(next.aiStudioProjects?.length).toBeGreaterThan(0);
    expect(next.aiStudioProjects?.every((project) => project.releaseStrategy?.type === 'festival')).toBe(true);
    expect((next.aiStudioProjects?.[0].releaseStrategy as any)?.festivalId).toBe('sundance-like');
  });

  it('seeds festival indie projects on load if current week is a festival week', () => {
    const gameState = makeBaseGameState({ currentWeek: 4, currentYear: 2025, universeSeed: 12345, aiStudioProjects: [] });
    const loaded = seedFestivalIndieProjectsForWeek(gameState, gameState.currentWeek, gameState.currentYear);

    expect(loaded.aiStudioProjects?.length).toBeGreaterThan(0);
    expect((loaded.aiStudioProjects?.[0].releaseStrategy as any)?.festivalId).toBe('sundance-like');
  });

  it('returns fallback festival projects when none are present in state', () => {
    const gameState = makeBaseGameState({ currentWeek: 20, currentYear: 2025, universeSeed: 12345, aiStudioProjects: [], projects: [], allReleases: [] });
    const available = listAvailableFestivalIndieProjects(gameState, 'cannes-like');

    expect(available.length).toBeGreaterThan(0);
    expect(available.every((project) => project.releaseStrategy?.type === 'festival')).toBe(true);
    expect((available[0].releaseStrategy as any)?.festivalId).toBe('cannes-like');
  });

  it('does not duplicate projects when run again for the same festival year', () => {
    const gameState = makeBaseGameState({ currentWeek: 4, currentYear: 2025, universeSeed: 12345, aiStudioProjects: [] });
    const first = FestivalIndieSupplySystem.onTick(gameState, makeTickContext(gameState));
    const second = FestivalIndieSupplySystem.onTick(first, makeTickContext(first));

    expect(first.aiStudioProjects?.length).toEqual(second.aiStudioProjects?.length);
  });
});
