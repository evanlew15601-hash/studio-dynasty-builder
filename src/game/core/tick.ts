/**
 * Deterministic weekly tick pipeline.
 *
 * Hard rules:
 * - This is the ONLY place GameState changes due to time passing.
 * - Every system receives (state, ctx) and returns a new state.
 * - Systems run in a fixed, deterministic order.
 * - No Math.random() — all randomness comes from ctx.rng.
 */

import type { GameState } from '@/types/game';
import type { TickRecapCard, TickSystemReport } from '@/types/tickReport';
import type { TickContext, TickResult, TickSystem } from './types';
import type { SeededRng } from './rng';
import { TimeSystem } from '@/components/game/TimeSystem';

/**
 * Run a single weekly tick on the game state.
 *
 * @param state     Current game state (pre-tick)
 * @param rng       Seeded PRNG (state is mutated as numbers are drawn)
 * @param systems   Ordered list of tick systems to execute
 * @param options   Optional overrides
 */
export function advanceWeek(
  state: GameState,
  rng: SeededRng,
  systems: readonly TickSystem[],
  options?: { debug?: boolean }
): TickResult {
  const debug = options?.debug ?? false;
  const startedAtIso = new Date().toISOString();
  const tickStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // Step 1: advance time
  const newTime = TimeSystem.advanceWeek({
    currentWeek: state.currentWeek,
    currentYear: state.currentYear,
    currentQuarter: state.currentQuarter,
  });

  let current: GameState = {
    ...state,
    currentWeek: newTime.currentWeek,
    currentYear: newTime.currentYear,
    currentQuarter: newTime.currentQuarter,
  };

  const ctx: TickContext = {
    rng,
    week: newTime.currentWeek,
    year: newTime.currentYear,
    quarter: newTime.currentQuarter,
    recap: [],
    debug,
  };

  const systemReports: TickSystemReport[] = [
    {
      id: 'time',
      label: 'Advance time',
      ms: 0, // negligible
    },
  ];

  // Step 2: run each system in order
  for (const sys of systems) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      current = sys.onTick(current, ctx);
    } catch (err) {
      console.error(`[Engine] System "${sys.id}" threw:`, err);
      systemReports.push({
        id: sys.id,
        label: sys.label,
        ms: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
        warnings: [`System "${sys.id}" threw an error: ${(err as Error).message}`],
      });
      continue;
    }
    const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    systemReports.push({ id: sys.id, label: sys.label, ms });
  }

  const finishedAtIso = new Date().toISOString();
  const totalMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - tickStart;

  // Fallback recap if none generated
  const recap: TickRecapCard[] =
    ctx.recap.length > 0
      ? ctx.recap
      : [
          {
            type: 'system',
            title: 'Week advanced',
            body: `Simulation progressed to Week ${newTime.currentWeek}, ${newTime.currentYear}.`,
            severity: 'info',
          },
        ];

  return {
    nextState: current,
    systems: systemReports,
    recap,
    totalMs,
    startedAtIso,
    finishedAtIso,
  };
}
