import type { GameState, PlayerLegacy } from '@/types/game';
import type { TickSystem } from '../core/types';

function computePlayerReleaseGrossByProject(state: GameState): Map<string, { projectId: string; title: string; year: number; totalRevenue: number }> {
  const best = new Map<string, { projectId: string; title: string; year: number; totalRevenue: number }>();

  for (const week of state.boxOfficeHistory || []) {
    for (const r of week.releases || []) {
      if (r.studio !== state.studio.name) continue;

      const existing = best.get(r.projectId);
      const total = r.totalRevenue ?? 0;
      if (!existing || total > existing.totalRevenue) {
        best.set(r.projectId, {
          projectId: r.projectId,
          title: r.title,
          year: week.year,
          totalRevenue: total,
        });
      }
    }
  }

  return best;
}

export const PlayerLegacySystem: TickSystem = {
  id: 'playerLegacy',
  label: 'Player legacy',
  dependsOn: ['worldYearbook'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const grossByProject = computePlayerReleaseGrossByProject(state);
    const releases = [...grossByProject.values()];

    const totalBoxOffice = releases.reduce((sum, r) => sum + (r.totalRevenue ?? 0), 0);
    const totalReleases = releases.length;

    const studioAwards = state.studio.awards || [];
    const totalAwards = studioAwards.length;

    const byYear = new Map<number, number>();
    for (const a of studioAwards) {
      byYear.set(a.year, (byYear.get(a.year) || 0) + 1);
    }

    let bestYearByAwards: PlayerLegacy['bestYearByAwards'] | undefined;
    for (const [year, count] of byYear.entries()) {
      if (!bestYearByAwards || count > bestYearByAwards.awards) {
        bestYearByAwards = { year, awards: count };
      }
    }

    const biggestHit = releases.slice().sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

    const legacy: PlayerLegacy = {
      studioId: state.studio.id,
      totalAwards,
      totalBoxOffice,
      totalReleases,
      bestYearByAwards,
      biggestHit: biggestHit
        ? {
            projectId: biggestHit.projectId,
            title: biggestHit.title,
            boxOffice: biggestHit.totalRevenue,
            year: biggestHit.year,
          }
        : undefined,
    };

    return {
      ...state,
      playerLegacy: legacy,
    };
  },
};
