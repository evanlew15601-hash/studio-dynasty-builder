import type { GameState, Genre, Project, Studio, WorldHistoryEntry } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getProjectTotalRevenue(p: any): number {
  const m = p?.metrics;
  const box = m?.boxOfficeTotal ?? m?.totalRevenue ?? m?.boxOffice?.total ?? 0;
  return Number.isFinite(box) ? box : 0;
}

function studioReleasesFromHistory(state: GameState, studioName: string, year: number): Map<string, number> {
  const best = new Map<string, number>();

  for (const week of state.boxOfficeHistory || []) {
    if (week.year !== year) continue;
    for (const r of week.releases || []) {
      if (r.studio !== studioName) continue;
      const total = r.totalRevenue ?? 0;
      const existing = best.get(r.projectId) ?? 0;
      if (total > existing) best.set(r.projectId, total);
    }
  }

  return best;
}

function studioProjectsForYear(state: GameState, studioName: string, year: number): Project[] {
  const out: Project[] = [];

  const pushIf = (p: any) => {
    if (!p || typeof p !== 'object') return;
    if (!('script' in p)) return;
    if (p.status !== 'released') return;
    if (p.studioName !== studioName) return;
    if (p.releaseYear !== year) return;
    out.push(p as Project);
  };

  for (const p of state.allReleases || []) pushIf(p);
  for (const p of state.aiStudioProjects || []) pushIf(p);

  return out;
}

function computePerformanceAdjustments(params: {
  studio: Studio;
  state: GameState;
  year: number;
}): { rep: number; budPct: number } {
  const { studio, state, year } = params;

  const projects = studioProjectsForYear(state, studio.name, year);
  const fromHistory = studioReleasesFromHistory(state, studio.name, year);

  if (projects.length === 0 && fromHistory.size === 0) return { rep: 0, budPct: 0 };

  // De-dupe by project id.
  const byId = new Map<string, { revenue: number; budget: number; critics: number | null; isTv: boolean; awards: number }>();

  for (const p of projects) {
    const rev = getProjectTotalRevenue(p);
    const bud = p.budget?.total ?? 0;
    const critics = typeof p.metrics?.criticsScore === 'number' ? p.metrics.criticsScore : null;
    const isTv = p.type === 'series' || p.type === 'limited-series';
    const awards = p.metrics?.awards?.length ?? 0;

    byId.set(p.id, { revenue: rev, budget: bud, critics, isTv, awards });
  }

  for (const [projectId, revenue] of fromHistory.entries()) {
    const existing = byId.get(projectId);
    if (!existing) {
      byId.set(projectId, { revenue, budget: 0, critics: null, isTv: false, awards: 0 });
      continue;
    }

    if (revenue > existing.revenue) {
      byId.set(projectId, { ...existing, revenue });
    }
  }

  const rows = [...byId.values()];
  const n = rows.length;

  let roiCount = 0;
  let roiSum = 0;
  let hitCount = 0;
  let flopCount = 0;

  let grossCount = 0;
  let grossSum = 0;

  let criticsSum = 0;
  let criticsCount = 0;

  let awardsCount = 0;

  let tvCount = 0;

  for (const r of rows) {
    if (r.revenue > 0) {
      grossSum += r.revenue;
      grossCount += 1;
    }

    if (r.critics !== null) {
      criticsSum += r.critics;
      criticsCount += 1;
    }

    awardsCount += r.awards || 0;

    if (r.isTv) tvCount += 1;

    if (r.budget > 0 && r.revenue > 0) {
      const roi = r.revenue / r.budget;
      roiSum += roi;
      roiCount += 1;

      if (roi >= 2) hitCount += 1;
      if (roi < 0.75) flopCount += 1;
    }
  }

  const avgRoi = roiCount > 0 ? roiSum / roiCount : 1;
  const avgGross = grossCount > 0 ? grossSum / grossCount : 0;
  const avgCritics = criticsCount > 0 ? criticsSum / criticsCount : null;

  // Reputation adjustments: kept modest and clamped.
  const roiRep = clamp(Math.round((avgRoi - 1) * 2), -4, 6);
  // If we only have gross totals (no budgets available), use a small gross-based proxy.
  const grossRep = roiCount > 0 || avgGross <= 0 ? 0 : clamp(Math.round((avgGross - 60_000_000) / 120_000_000), -2, 2);
  const volumeRep = n >= 3 ? 1 : 0;

  const criticsRep =
    avgCritics === null
      ? 0
      : avgCritics >= 85
        ? 2
        : avgCritics >= 75
          ? 1
          : avgCritics <= 55
            ? -1
            : 0;

  const hitFlopRep = clamp(hitCount - flopCount, -2, 2);
  const awardsRep = clamp(Math.floor(awardsCount / 2), 0, 2);

  const rep = clamp(roiRep + grossRep + criticsRep + volumeRep + hitFlopRep + awardsRep, -6, 6);

  // Budget drift: ROI-driven when budgets are known; TV/critics adds tiny signal.
  let budPct = clamp((avgRoi - 1) * 0.02, -0.06, 0.08);
  budPct += clamp(awardsCount * 0.003, 0, 0.01);

  if (avgCritics !== null) {
    if (avgCritics >= 85) budPct += 0.01;
    else if (avgCritics <= 55) budPct -= 0.01;
  }

  if (tvCount > 0 && avgCritics !== null && avgCritics >= 80) {
    budPct += 0.005;
  }

  budPct = clamp(budPct, -0.08, 0.10);

  return { rep, budPct };
}

function applyFortuneDrift(params: {
  studio: Studio;
  seed: string;
  trendingGenre?: Genre;
  state: GameState;
  year: number;
}): Studio {
  const { studio, seed, trendingGenre, state, year } = params;

  const rep0 = studio.reputation ?? 50;
  const bud0 = studio.budget ?? 0;

  const perf = computePerformanceAdjustments({ studio, state, year });

  const trendBoost = trendingGenre && (studio.specialties || []).includes(trendingGenre) ? 1 : 0;
  const repDelta = stableInt(`${seed}|rep`, -4, 4) + trendBoost + perf.rep;

  // -6% to +10% baseline drift per year, nudged by performance.
  const budPct = stableInt(`${seed}|budPct`, -6, 10) / 100 + perf.budPct;

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
      const next = applyFortuneDrift({ studio: s, seed, trendingGenre: topTrend, state, year: previousYear });

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
