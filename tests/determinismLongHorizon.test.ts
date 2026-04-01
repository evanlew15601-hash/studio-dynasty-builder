import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { validateGameState } from '@/game/core/coreLoopChecks';

function stableSerialize(value: any): string {
  const normalize = (v: any): any => {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(normalize);
    if (!v || typeof v !== 'object') return v;

    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = normalize(v[k]);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 75,
      budget: 500_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
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
    universeSeed: 2222,
    rngState: 2222 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

function runSim(seed: number, weeks: number): GameState {
  useGameStore.getState().initGame(
    makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 15_000_000,
          cash: 1_000_000_000,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 5_000_000,
          priceIndex: 1.0,
          adLoadIndex: 50,
          freshness: 65,
          catalogValue: 60,
          distressWeeks: 0,
          maxExclusiveWindows: 2,
          lastExclusiveWindowWeek: 0,
          lastExclusiveWindowYear: 0,
        },
        rivals: [],
      } as any,
    }),
    seed
  );

  for (let i = 0; i < weeks; i++) {
    useGameStore.getState().advanceWeek({ suppressRecap: true });

    let guard = 0;
    while ((useGameStore.getState().game!.eventQueue || []).length > 0) {
      guard++;
      if (guard > 200) throw new Error('Event queue did not drain');

      const evt = useGameStore.getState().game!.eventQueue[0] as any;
      const choiceId = evt?.choices?.[0]?.id;
      if (!choiceId) throw new Error(`Event ${evt?.id ?? 'unknown'} has no choices`);
      useGameStore.getState().resolveGameEvent(evt.id, choiceId);
    }
  }

  return useGameStore.getState().game!;
}

describe('determinism (long horizon)', () => {
  beforeEach(() => {
    // Ensures store has a consistent baseline even if another test left state behind.
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('produces identical final states when run twice with the same seed', () => {
    const a = runSim(424242, 26);
    const b = runSim(424242, 26);

    expect(validateGameState(a)).toEqual([]);
    expect(validateGameState(b)).toEqual([]);

    expect(stableSerialize(a)).toBe(stableSerialize(b));
  });
});
