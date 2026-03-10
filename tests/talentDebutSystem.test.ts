import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentDebutSystem } from '@/game/systems/talentDebutSystem';

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
  };

  return { ...base, ...(overrides || {}) };
}

describe('TalentDebutSystem', () => {
  it('adds handcrafted + rookie debuts on year rollover (week 52 -> week 1)', () => {
    const state = makeBaseState({ universeSeed: 111, currentYear: 2026, currentWeek: 52, currentQuarter: 4 });
    const rng = createRng(123);

    const result = advanceWeek(state, rng, [TalentDebutSystem]);

    expect(result.nextState.currentYear).toBe(2027);
    expect(result.nextState.currentWeek).toBe(1);

    // Includes at least the procedural rookie class.
    expect(result.nextState.talent.length).toBeGreaterThanOrEqual(10);

    // Includes a known handcrafted 2027 debut from the world bible.
    expect(result.nextState.talent.some((t) => t.name === 'Rani Sundar')).toBe(true);

    // Emits a recap card.
    expect(result.recap.some((c) => c.type === 'talent')).toBe(true);
  });

  it('produces different rookie classes for different universe seeds', () => {
    const a = advanceWeek(makeBaseState({ universeSeed: 111, currentYear: 2026, currentWeek: 52, currentQuarter: 4 }), createRng(1), [TalentDebutSystem]);
    const b = advanceWeek(makeBaseState({ universeSeed: 222, currentYear: 2026, currentWeek: 52, currentQuarter: 4 }), createRng(1), [TalentDebutSystem]);

    const aRookies = (a.nextState.talent || []).filter((t) => t.id.startsWith('rookie:2027:'));
    const bRookies = (b.nextState.talent || []).filter((t) => t.id.startsWith('rookie:2027:'));

    expect(aRookies.length).toBeGreaterThan(0);
    expect(bRookies.length).toBeGreaterThan(0);

    expect(aRookies.slice(0, 2).map((t) => t.name)).not.toEqual(bRookies.slice(0, 2).map((t) => t.name));
  });
});
