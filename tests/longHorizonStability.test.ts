import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import { TalentLifecycleSystem } from '@/game/systems/talentLifecycleSystem';
import { TalentBurnoutSystem } from '@/game/systems/talentBurnoutSystem';
import { TalentRetirementSystem } from '@/game/systems/talentRetirementSystem';
import { WorldMilestonesSystem } from '@/game/systems/worldMilestonesSystem';
import { WorldErasSystem } from '@/game/systems/worldErasSystem';
import { GenreTrendsSystem } from '@/game/systems/genreTrendsSystem';
import { StudioFortunesSystem } from '@/game/systems/studioFortunesSystem';
import { PlayerLegacySystem } from '@/game/systems/playerLegacySystem';
import { WorldYearbookSystem } from '@/game/systems/worldYearbookSystem';
import { WorldArchiveSystem } from '@/game/systems/worldArchiveSystem';
import { TalentDebutSystem } from '@/game/systems/talentDebutSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 5_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: generateInitialTalentPool({ currentYear: 2026 }) as any,
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama', 'comedy', 'action'],
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
    universeSeed: 222,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

function activeTalentCount(state: GameState): number {
  return (state.talent || []).filter((t) => (t.type === 'actor' || t.type === 'director') && t.contractStatus !== 'retired').length;
}

function retiredInYear(state: GameState, year: number): number {
  return (state.talent || []).filter((t) => (t.type === 'actor' || t.type === 'director') && t.retired?.year === year).length;
}

describe('long-horizon stability (100+ years)', () => {
  it('keeps roster size bounded and remains deterministic over long runs', () => {
    const systems = [
      TalentLifecycleSystem,
      TalentBurnoutSystem,
      TalentRetirementSystem,
      WorldMilestonesSystem,
      WorldErasSystem,
      GenreTrendsSystem,
      StudioFortunesSystem,
      PlayerLegacySystem,
      WorldYearbookSystem,
      WorldArchiveSystem,
      TalentDebutSystem,
    ];

    const simulate = () => {
      let state = makeBaseState();
      const rng = createRng(123);

      const years = 120;
      const totalTicks = years * 52;

      const activeCounts: number[] = [];
      const churn: number[] = [];

      for (let i = 0; i < totalTicks; i++) {
        const beforeYear = state.currentYear;
        const beforeWeek = state.currentWeek;

        const result = advanceWeek(state, rng, systems);
        state = result.nextState;

        const rollover = beforeWeek === 52 && state.currentWeek === 1 && state.currentYear === beforeYear + 1;
        if (rollover) {
          const prevYear = state.currentYear - 1;
          const active = activeTalentCount(state);
          const retiredPrev = retiredInYear(state, prevYear);

          activeCounts.push(active);
          churn.push(active > 0 ? retiredPrev / active : 0);
        }
      }

      return { state, activeCounts, churn };
    };

    const run1 = simulate();
    const run2 = simulate();

    expect(run1.activeCounts).toEqual(run2.activeCounts);
    expect(run1.churn).toEqual(run2.churn);

    const warmup = 20;
    const windowCounts = run1.activeCounts.slice(warmup);
    const windowChurn = run1.churn.slice(warmup);

    const avgActive = windowCounts.reduce((s, n) => s + n, 0) / Math.max(1, windowCounts.length);
    const avgChurn = windowChurn.reduce((s, n) => s + n, 0) / Math.max(1, windowChurn.length);

    // Loose invariants (tuning targets are 240–320 active; ~4–7% churn).
    expect(avgActive).toBeGreaterThanOrEqual(240);
    expect(avgActive).toBeLessThanOrEqual(330);

    expect(avgChurn).toBeGreaterThanOrEqual(0.03);
    expect(avgChurn).toBeLessThanOrEqual(0.09);

    // Hard cap: timeline entries should remain bounded by pruning.
    expect((run1.state.worldHistory || []).length).toBeLessThanOrEqual(280);

    // Yearbooks should grow linearly: one per simulated year.
    expect((run1.state.worldYearbooks || []).length).toBeGreaterThanOrEqual(100);
  });
});
