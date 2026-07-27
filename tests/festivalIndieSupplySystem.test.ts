import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { FestivalIndieSupplySystem, seedFestivalIndieProjectsForWeek } from '@/game/systems/festivalIndieSupplySystem';
import { createPurchasePatch, createPurchasedFestivalProject, listAvailableFestivalIndieProjects } from '@/utils/festivalMarketplace';
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

  it('marks festival-acquired projects as ready for standard distribution', () => {
    const project = {
      id: 'festival-acquired-1',
      title: 'Acquired Indie',
      status: 'draft',
      budget: { total: 5_000_000 },
      script: { quality: 60, genre: 'drama', characteristics: { commercialAppeal: 5 } },
    } as any;

    const patch = createPurchasePatch(project, 'studio-1', 'Test Studio', 1_000_000, 10, 2025);

    expect(patch.status).toBe('ready-for-marketing');
    expect(patch.currentPhase).toBe('marketing');
    expect((patch as any).releaseStrategy?.type).toBe('wide');
    expect((patch as any).metrics?.acquiredFromFestival).toBe(true);
  });


  it('creates a player-owned project copy for festival auction acquisitions', () => {
    const project = {
      id: 'festival-ai-1',
      title: 'Acquired Festival Film',
      studioId: 'ai-studio',
      studioName: 'Rival Indie',
      status: 'draft',
      currentPhase: 'development',
      budget: { total: 5_000_000 },
      script: { quality: 60, genre: 'drama', characteristics: { commercialAppeal: 5 } },
      releaseStrategy: { type: 'festival', festivalId: 'cannes-like' },
    } as any;

    const purchased = createPurchasedFestivalProject(project, 'studio-1', 'Test Studio', 1_000_000, 10, 2025) as any;

    expect(purchased.id).toBe(project.id);
    expect(purchased.studioId).toBe('studio-1');
    expect(purchased.studioName).toBe('Test Studio');
    expect(purchased.status).toBe('ready-for-marketing');
    expect(purchased.currentPhase).toBe('marketing');
    expect(purchased.releaseStrategy.type).toBe('wide');
    expect(purchased.metrics.acquiredFromFestival).toBe(true);
  });

  it('does not duplicate projects when run again for the same festival year', () => {
    const gameState = makeBaseGameState({ currentWeek: 4, currentYear: 2025, universeSeed: 12345, aiStudioProjects: [] });
    const first = FestivalIndieSupplySystem.onTick(gameState, makeTickContext(gameState));
    const second = FestivalIndieSupplySystem.onTick(first, makeTickContext(first));

    expect(first.aiStudioProjects?.length).toEqual(second.aiStudioProjects?.length);
  });
});
