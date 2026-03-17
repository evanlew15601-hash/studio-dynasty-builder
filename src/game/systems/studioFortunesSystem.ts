import type { GameState, Genre, Studio, WorldHistoryEntry } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function applyFortuneDrift(params: {
  studio: Studio;
  seed: string;
  trendingGenre?: Genre;
}): Studio {
  const { studio, seed, trendingGenre } = params;

  const rep0 = studio.reputation ?? 50;
  const bud0 = studio.budget ?? 0;

  const trendBoost = trendingGenre && (studio.specialties || []).includes(trendingGenre) ? 1 : 0;
  const repDelta = stableInt(`${seed}|rep`, -4, 4) + trendBoost;

  // -6% to +10% budget drift per year.
  const budPct = stableInt(`${seed}|budPct`, -6, 10) / 100;

  return {
    ...studio,
    reputation: clamp(rep0 + repDelta, 0, 100),
    budget: Math.max(0, Math.round(bud0 * (1 + budPct))),
  };
}

function maybeMilestones(params: {
  previous: Studio;
  next: Studio;
  year: number;
}): WorldHistoryEntry[] {
  const { previous, next, year } = params;

  const out: WorldHistoryEntry[] = [];

  const prevRep = previous.reputation ?? 50;
  const nextRep = next.reputation ?? 50;

  if (prevRep < 90 && nextRep >= 90) {
    out.push({
      id: `hist:studio_milestone:elite:${year}:${next.id}`,
      kind: 'studio_milestone',
      year,
      week: 52,
      title: `${next.name} enters the elite`,
      body: `${next.name} reached top-tier industry reputation in ${year}.`,
      entityIds: { studioIds: [next.id] },
      importance: 4,
    });
  }

  if (prevRep >= 35 && nextRep < 35) {
    out.push({
      id: `hist:studio_milestone:slump:${year}:${next.id}`,
      kind: 'studio_milestone',
      year,
      week: 52,
      title: `${next.name} hits a slump`,
      body: `${next.name} saw reputation slide sharply in ${year}.`,
      entityIds: { studioIds: [next.id] },
      importance: 3,
    });
  }

  return out;
}

export const StudioFortunesSystem: TickSystem = {
  id: 'studioFortunes',
  label: 'Studio fortunes',
  dependsOn: ['worldMilestones'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;
    const studios = state.competitorStudios || [];
    if (studios.length === 0) return state;

    const topTrend = state.marketConditions?.trendingGenres?.[0];

    let worldHistory = state.worldHistory || [];
    let changed = false;

    const deltas: Array<{ name: string; repDelta: number }> = [];

    const nextStudios = studios.map((s) => {
      const seed = `${state.universeSeed ?? 0}|studioFortunes|${previousYear}|${s.id}`;
      const next = applyFortuneDrift({ studio: s, seed, trendingGenre: topTrend });

      const repDelta = (next.reputation ?? 0) - (s.reputation ?? 0);
      if (repDelta !== 0) deltas.push({ name: s.name, repDelta });

      if (next.reputation !== s.reputation || next.budget !== s.budget) changed = true;

      for (const e of maybeMilestones({ previous: s, next, year: previousYear })) {
        worldHistory = pushWorldHistory(worldHistory, e);
      }

      return next;
    });

    if (!changed && worldHistory === (state.worldHistory || [])) return state;

    if (deltas.length > 0) {
      const top = deltas
        .slice()
        .sort((a, b) => Math.abs(b.repDelta) - Math.abs(a.repDelta) || a.name.localeCompare(b.name))
        .slice(0, 3);

      ctx.recap.push({
        type: 'market',
        title: 'Studio fortunes shift',
        body: top
          .map((d) => {
            const sign = d.repDelta >= 0 ? '+' : '';
            return `• ${d.name}: ${sign}${d.repDelta} reputation`;
          })
          .join('\n'),
        severity: 'info',
      });
    }

    return {
      ...state,
      competitorStudios: nextStudios,
      worldHistory,
    };
  },
};
