import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { validateGameState } from '@/game/core/coreLoopChecks';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 10,
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
    universeSeed: 1,
    rngState: 1 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

describe('core loop: awards + platform invariants', () => {
  it('flags awards processed ceremonies without ceremony history', () => {
    const state = makeBaseState({
      awardsSeason: {
        year: 2027,
        processedCeremonies: ['crystal-ring'],
        seasonMomentum: {},
        seasonNominations: {},
        ceremonyHistory: {},
      } as any,
    });

    const issues = validateGameState(state);
    expect(issues.some((i) => i.code === 'awardsSeason.processedCeremonies.missing_ceremonyHistory')).toBe(true);
  });

  it('flags negative platform subscribers and non-finite cash', () => {
    const state = makeBaseState({
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: { id: 'p', name: 'Player', status: 'active', subscribers: -10, cash: Number.NaN, priceIndex: 1, promotionBudgetPerWeek: 0 },
        rivals: [{ id: 'r', name: 'Rival', status: 'healthy', subscribers: 10_000_000, cash: 10_000_000_000, priceIndex: 1.2, promotionBudgetPerWeek: 5_000_000 }],
      } as any,
    });

    const issues = validateGameState(state);
    expect(issues.some((i) => i.code === 'platform.subscribers.invalid')).toBe(true);
    expect(issues.some((i) => i.code === 'platform.cash.non_finite')).toBe(true);
  });
});
