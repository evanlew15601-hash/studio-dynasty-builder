import { describe, expect, it } from 'vitest';
import { TimeSystem, type TimeState } from '@/components/game/TimeSystem';
import { createTickReport } from '@/utils/tickReport';
import type { GameState } from '@/types/game';
import type { TickSystemReport } from '@/types/tickReport';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTime(week: number, year: number): TimeState {
  return { currentWeek: week, currentYear: year, currentQuarter: Math.ceil(week / 13) };
}

function makeMinimalGameState(overrides?: Partial<GameState>): GameState {
  return {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
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
    ...overrides,
  } as GameState;
}

// ---------------------------------------------------------------------------
// 1. TimeSystem.advanceWeek – normal mid-year advance
// ---------------------------------------------------------------------------
describe('TimeSystem.advanceWeek', () => {
  it('advances from week 10 to 11 within the same year', () => {
    const next = TimeSystem.advanceWeek(makeTime(10, 2027));
    expect(next.currentWeek).toBe(11);
    expect(next.currentYear).toBe(2027);
    expect(next.currentQuarter).toBe(1);
  });

  // 2. Year rollover
  it('rolls over from week 52 to week 1 of the next year', () => {
    const next = TimeSystem.advanceWeek(makeTime(52, 2027));
    expect(next.currentWeek).toBe(1);
    expect(next.currentYear).toBe(2028);
    expect(next.currentQuarter).toBe(1);
  });

  // 3. Quarter boundaries
  it.each([
    [13, 2, 'Q1→Q2'],
    [26, 3, 'Q2→Q3'],
    [39, 4, 'Q3→Q4'],
  ])('crossing quarter boundary at week %i produces quarter %i (%s)', (fromWeek, expectedQ) => {
    const next = TimeSystem.advanceWeek(makeTime(fromWeek, 2027));
    expect(next.currentQuarter).toBe(expectedQ);
  });

  // 4. Multiple consecutive advances stay consistent
  it('advancing 52 times from week 1 lands back at week 1 of the next year', () => {
    let state = makeTime(1, 2027);
    for (let i = 0; i < 52; i++) {
      state = TimeSystem.advanceWeek(state);
    }
    expect(state.currentWeek).toBe(1);
    expect(state.currentYear).toBe(2028);
  });
});

// ---------------------------------------------------------------------------
// 5. TimeSystem.calculateWeeksSince
// ---------------------------------------------------------------------------
describe('TimeSystem.calculateWeeksSince', () => {
  it('returns 0 when current equals release', () => {
    expect(TimeSystem.calculateWeeksSince(10, 2027, 10, 2027)).toBe(0);
  });

  it('calculates correctly within the same year', () => {
    expect(TimeSystem.calculateWeeksSince(5, 2027, 15, 2027)).toBe(10);
  });

  it('calculates correctly across year boundaries', () => {
    expect(TimeSystem.calculateWeeksSince(50, 2027, 5, 2028)).toBe(7);
  });

  it('returns 0 for future releases (not yet happened)', () => {
    expect(TimeSystem.calculateWeeksSince(20, 2028, 10, 2027)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6-7. Deterministic tick report – invariants
// ---------------------------------------------------------------------------
describe('Deterministic tick invariants', () => {
  it('tick report always produces a non-empty recap array', () => {
    const prev = makeMinimalGameState({ currentWeek: 10 });
    const next = makeMinimalGameState({ currentWeek: 11 });

    const report = createTickReport({
      prev,
      next,
      systems: [],
      recap: [],
      startedAtIso: new Date().toISOString(),
      finishedAtIso: new Date().toISOString(),
      totalMs: 5,
    });

    expect(report.recap.length).toBeGreaterThanOrEqual(1);
    expect(report.week).toBe(11);
    expect(report.year).toBe(2027);
  });

  it('budget and reputation deltas are computed as (next - prev)', () => {
    const prev = makeMinimalGameState({ currentWeek: 10 });
    const next = makeMinimalGameState({
      currentWeek: 11,
      studio: { ...prev.studio, budget: 1_500_000, reputation: 45 },
    });

    const report = createTickReport({
      prev,
      next,
      systems: [],
      recap: [],
      startedAtIso: 's',
      finishedAtIso: 'f',
      totalMs: 1,
    });

    expect(report.summary?.budgetDelta).toBe(500_000);
    expect(report.summary?.reputationDelta).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// 8. Same input → same output (determinism proof)
// ---------------------------------------------------------------------------
describe('Determinism', () => {
  it('calling advanceWeek twice with the same input produces identical output', () => {
    const input = makeTime(25, 2030);
    const a = TimeSystem.advanceWeek(input);
    const b = TimeSystem.advanceWeek(input);
    expect(a).toEqual(b);
  });

  it('createTickReport is deterministic for the same inputs', () => {
    const prev = makeMinimalGameState({ currentWeek: 20 });
    const next = makeMinimalGameState({ currentWeek: 21 });
    const systems: TickSystemReport[] = [{ id: 'time', label: 'Time', ms: 0.5 }];
    const params = { prev, next, systems, recap: [], startedAtIso: 'x', finishedAtIso: 'y', totalMs: 1 };

    const r1 = createTickReport(params);
    const r2 = createTickReport(params);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// 9. Boundary: week clamping via getWeekOfYear
// ---------------------------------------------------------------------------
describe('TimeSystem.getWeekOfYear', () => {
  it('clamps negative values to 1', () => {
    expect(TimeSystem.getWeekOfYear(-5)).toBe(1);
  });

  it('clamps values above 52 to 52', () => {
    expect(TimeSystem.getWeekOfYear(100)).toBe(52);
  });

  it('returns valid weeks unchanged', () => {
    expect(TimeSystem.getWeekOfYear(26)).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// 10. Budget never NaN after tick report
// ---------------------------------------------------------------------------
describe('Invariant safety', () => {
  it('budget delta is never NaN even with undefined budgets', () => {
    const prev = makeMinimalGameState();
    const next = makeMinimalGameState({ currentWeek: 2 });

    const report = createTickReport({
      prev,
      next,
      systems: [],
      recap: [],
      startedAtIso: 's',
      finishedAtIso: 'f',
      totalMs: 0,
    });

    expect(Number.isNaN(report.summary?.budgetDelta)).toBe(false);
    expect(Number.isNaN(report.summary?.reputationDelta)).toBe(false);
  });
});
