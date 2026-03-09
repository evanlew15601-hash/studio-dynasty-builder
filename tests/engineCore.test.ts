import { describe, expect, it } from 'vitest';
import { advanceWeek } from '@/game/core/tick';
import { createRng } from '@/game/core/rng';
import { SystemRegistry } from '@/game/core/registry';
import type { TickSystem } from '@/game/core/types';
import type { GameState } from '@/types/game';
import { validateSnapshot, migrateSnapshot } from '@/game/persistence/migrations';
import { validateModBundle } from '@/game/modding/validation';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
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
    currentWeek: 10,
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
  } as GameState;
}

// ---------------------------------------------------------------------------
// Tick pipeline
// ---------------------------------------------------------------------------

describe('advanceWeek tick pipeline', () => {
  it('advances time and returns a tick result', () => {
    const state = makeMinimalState();
    const rng = createRng(42);
    const result = advanceWeek(state, rng, []);

    expect(result.nextState.currentWeek).toBe(11);
    expect(result.nextState.currentYear).toBe(2027);
    expect(result.systems.length).toBeGreaterThanOrEqual(1); // at least "time"
    expect(result.recap.length).toBeGreaterThanOrEqual(1);
    expect(result.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('runs registered systems in order', () => {
    const executionOrder: string[] = [];

    const systems: TickSystem[] = [
      {
        id: 'first',
        label: 'First',
        onTick: (state, ctx) => {
          executionOrder.push('first');
          return state;
        },
      },
      {
        id: 'second',
        label: 'Second',
        dependsOn: ['first'],
        onTick: (state, ctx) => {
          executionOrder.push('second');
          return state;
        },
      },
      {
        id: 'third',
        label: 'Third',
        dependsOn: ['second'],
        onTick: (state, ctx) => {
          executionOrder.push('third');
          return state;
        },
      },
    ];

    const registry = new SystemRegistry();
    registry.registerAll(systems);

    const state = makeMinimalState();
    const rng = createRng(42);
    advanceWeek(state, rng, registry.getOrdered());

    expect(executionOrder).toEqual(['first', 'second', 'third']);
  });

  it('is deterministic: same seed + state = same result', () => {
    const budgetSystem: TickSystem = {
      id: 'budget',
      label: 'Budget test',
      onTick: (state, ctx) => ({
        ...state,
        studio: {
          ...state.studio,
          budget: state.studio.budget + ctx.rng.nextInt(1000, 5000),
        },
      }),
    };

    const state = makeMinimalState();
    const r1 = advanceWeek(state, createRng(42), [budgetSystem]);
    const r2 = advanceWeek(state, createRng(42), [budgetSystem]);

    expect(r1.nextState.studio.budget).toBe(r2.nextState.studio.budget);
    expect(r1.nextState.currentWeek).toBe(r2.nextState.currentWeek);
  });

  it('handles system errors gracefully', () => {
    const crashingSystem: TickSystem = {
      id: 'crasher',
      label: 'Crasher',
      onTick: () => {
        throw new Error('boom');
      },
    };

    const state = makeMinimalState();
    const rng = createRng(42);

    // Should not throw
    const result = advanceWeek(state, rng, [crashingSystem]);
    expect(result.nextState.currentWeek).toBe(11); // time still advanced
    expect(result.systems.some((s) => s.warnings?.length)).toBe(true);
  });

  it('systems can push recap cards', () => {
    const recapSystem: TickSystem = {
      id: 'recap',
      label: 'Recap test',
      onTick: (state, ctx) => {
        ctx.recap.push({
          type: 'financial',
          title: 'Revenue earned',
          body: '$100,000 from box office',
          severity: 'good',
        });
        return state;
      },
    };

    const state = makeMinimalState();
    const rng = createRng(42);
    const result = advanceWeek(state, rng, [recapSystem]);

    expect(result.recap.some((r) => r.title === 'Revenue earned')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// System registry
// ---------------------------------------------------------------------------

describe('SystemRegistry', () => {
  it('resolves dependencies via topological sort', () => {
    const registry = new SystemRegistry();
    registry.registerAll([
      { id: 'c', label: 'C', dependsOn: ['b'], onTick: (s) => s },
      { id: 'a', label: 'A', onTick: (s) => s },
      { id: 'b', label: 'B', dependsOn: ['a'], onTick: (s) => s },
    ]);

    const ordered = registry.getOrdered().map((s) => s.id);
    expect(ordered.indexOf('a')).toBeLessThan(ordered.indexOf('b'));
    expect(ordered.indexOf('b')).toBeLessThan(ordered.indexOf('c'));
  });

  it('prevents duplicate registrations', () => {
    const registry = new SystemRegistry();
    registry.register({ id: 'x', label: 'X', onTick: (s) => s });
    registry.register({ id: 'x', label: 'X2', onTick: (s) => s });
    expect(registry.ids()).toEqual(['x']);
  });
});

// ---------------------------------------------------------------------------
// Save migrations
// ---------------------------------------------------------------------------

describe('Save migrations', () => {
  it('validateSnapshot returns null for invalid data', () => {
    expect(validateSnapshot(null)).toBeNull();
    expect(validateSnapshot({})).toBeNull();
    expect(validateSnapshot({ gameState: {} })).toBeNull();
    expect(validateSnapshot({ gameState: {}, meta: {} })).toBeNull();
  });

  it('validateSnapshot accepts valid snapshots', () => {
    const valid = {
      gameState: {
        studio: { id: 's1', name: 'Test', reputation: 50, budget: 1000000 },
        currentWeek: 5,
        currentYear: 2027,
      },
      meta: { savedAt: '2027-01-01', version: 'alpha-1' },
    };
    expect(validateSnapshot(valid)).not.toBeNull();
  });

  it('migrateSnapshot returns snapshot as-is for current version', () => {
    const snapshot = {
      gameState: makeMinimalState(),
      meta: { savedAt: '2027-01-01', version: 'alpha-1' },
    };
    const migrated = migrateSnapshot(snapshot as any);
    expect(migrated).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Mod validation
// ---------------------------------------------------------------------------

describe('Mod validation', () => {
  it('validates an empty bundle as valid', () => {
    const result = validateModBundle({ version: 1, mods: [], patches: [] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects patches with invalid ops', () => {
    const result = validateModBundle({
      version: 1,
      mods: [{ id: 'm1', name: 'Test', version: '1.0', enabled: true }],
      patches: [
        { id: 'p1', modId: 'm1', entityType: 'talent', op: 'explode', target: 't1' },
      ],
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warns about patches referencing unknown mods', () => {
    const result = validateModBundle({
      version: 1,
      mods: [{ id: 'm1', name: 'Test', version: '1.0', enabled: true }],
      patches: [
        { id: 'p1', modId: 'nonexistent', entityType: 'talent', op: 'update', target: 't1', payload: {} },
      ],
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.bundle.patches).toHaveLength(0); // filtered out
  });

  it('returns sanitized bundle even with errors', () => {
    const result = validateModBundle({ version: 1, mods: [null as any], patches: [] });
    expect(result.bundle).toBeTruthy();
    expect(result.bundle.version).toBe(1);
  });

  it('treats missing bundle version as v1 (more forgiving for hand-written mods)', () => {
    const result = validateModBundle({
      mods: [{ id: 'm1', name: 'Test', enabled: true }],
      patches: [],
    });
    expect(result.valid).toBe(true);
    expect(result.bundle.version).toBe(1);
    expect(result.bundle.mods[0].version).toBe('1.0.0');
  });
});
