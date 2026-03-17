import { describe, expect, it } from 'vitest';
import type { GameState, Studio } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { CompetitorStudioLifecycleSystem } from '@/game/systems/competitorStudioLifecycleSystem';

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
    universeSeed: 999,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('CompetitorStudioLifecycleSystem', () => {
  it('can retire a weak competitor and spawn a replacement deterministically', () => {
    const weak: Studio = {
      id: 'weak-1',
      name: 'Weak Studio',
      reputation: 10,
      budget: 5_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    } as any;

    const strong: Studio = {
      id: 'strong-1',
      name: 'Strong Studio',
      reputation: 80,
      budget: 120_000_000,
      founded: 2000,
      specialties: ['action'],
      awards: [],
    } as any;

    const state = makeBaseState({ competitorStudios: [weak, strong] });

    const result1 = advanceWeek(state, createRng(1), [CompetitorStudioLifecycleSystem]);
    const result2 = advanceWeek(state, createRng(1), [CompetitorStudioLifecycleSystem]);

    expect(result1.nextState.competitorStudios).toEqual(result2.nextState.competitorStudios);

    // Roster remains stable.
    expect(result1.nextState.competitorStudios.length).toBe(2);

    // If an exit happened, there should be a matching history entry.
    const exited = (result1.nextState.worldHistory || []).filter((e) => e.id.startsWith('hist:studio_exit:'));
    const entered = (result1.nextState.worldHistory || []).filter((e) => e.id.startsWith('hist:studio_entry:'));

    // Exit and entry are coupled (replace one exit with one entrant).
    expect(exited.length).toBe(entered.length);
  });

  it('does nothing when there are no competitor studios', () => {
    const state = makeBaseState({ competitorStudios: [] });
    const result = advanceWeek(state, createRng(1), [CompetitorStudioLifecycleSystem]);

    expect(result.nextState.competitorStudios).toEqual([]);
    expect(result.nextState.worldHistory || []).toEqual([]);
  });
});
