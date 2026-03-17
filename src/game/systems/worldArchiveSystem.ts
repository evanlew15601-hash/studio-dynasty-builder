import type { GameState, BoxOfficeWeek, TopFilmsWeek } from '@/types/game';
import type { TickSystem } from '../core/types';

function pruneBoxOfficeHistory(entries: BoxOfficeWeek[], minYear: number): BoxOfficeWeek[] {
  return entries.filter((w) => w.year >= minYear);
}

function pruneTopFilmsHistory(entries: TopFilmsWeek[], minYear: number): TopFilmsWeek[] {
  return entries.filter((w) => w.year >= minYear);
}

/**
 * Annual archival/pruning of high-volume timelines.
 *
 * Rationale:
 * - `worldYearbooks` + `worldHistory` keep the long-horizon memory.
 * - `boxOfficeHistory` and `topFilmsHistory` are high-volume and should stay bounded.
 */
export const WorldArchiveSystem: TickSystem = {
  id: 'worldArchive',
  label: 'World archive',
  dependsOn: ['worldYearbook'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    // Keep enough history to support decade summaries + recent UI charts.
    // Example: year 2030 rollover keeps 2018+ (12-year window), which fully covers 2020–2029 decade.
    const keepYears = 12;
    const minYear = ctx.year - keepYears;

    const currentBox = state.boxOfficeHistory || [];
    const nextBox = pruneBoxOfficeHistory(currentBox, minYear);

    const currentTop = state.topFilmsHistory || [];
    const nextTop = pruneTopFilmsHistory(currentTop, minYear);

    if (nextBox.length === currentBox.length && nextTop.length === currentTop.length) return state;

    return {
      ...state,
      boxOfficeHistory: nextBox,
      topFilmsHistory: nextTop,
    };
  },
};
