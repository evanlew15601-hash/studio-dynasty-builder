import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentLifecycleSystem } from '@/game/systems/talentLifecycleSystem';
import { TalentBurnoutSystem } from '@/game/systems/talentBurnoutSystem';

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
    universeSeed: 12,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('TalentBurnoutSystem', () => {
  it('increases burnout for recently credited talent and decreases for inactive talent', () => {
    const active: TalentPerson = {
      id: 't1',
      name: 'Active Actor',
      type: 'actor',
      age: 30,
      experience: 5,
      reputation: 50,
      marketValue: 1,
      contractStatus: 'available',
      burnoutLevel: 10,
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
      filmography: [{ projectId: 'p1', title: 'Hit', role: 'Lead', year: 2026, boxOffice: 1 }],
    } as any;

    const inactive: TalentPerson = {
      id: 't2',
      name: 'Inactive Actor',
      type: 'actor',
      age: 30,
      experience: 5,
      reputation: 50,
      marketValue: 1,
      contractStatus: 'available',
      burnoutLevel: 10,
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
      filmography: [{ projectId: 'p0', title: 'Old', role: 'Lead', year: 2020, boxOffice: 1 }],
    } as any;

    const state = makeBaseState({ talent: [active, inactive] });
    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem, TalentBurnoutSystem]);

    const t1 = result.nextState.talent.find((t) => t.id === 't1')!;
    const t2 = result.nextState.talent.find((t) => t.id === 't2')!;

    expect(t1.burnoutLevel).toBeGreaterThan(active.burnoutLevel!);
    expect(t2.burnoutLevel).toBeLessThan(inactive.burnoutLevel!);
  });
});
