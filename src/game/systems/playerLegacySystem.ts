import type { GameState, PlayerLegacy, WorldHistoryEntry } from '@/types/game';
import { pushWorldHistory } from '@/utils/worldHistory';
import { formatMoneyCompact } from '@/utils/money';
import type { TickSystem } from '../core/types';

function getProjectTotalRevenue(p: any): number {
  const m = p?.metrics;
  const box = m?.boxOfficeTotal ?? m?.totalRevenue ?? m?.boxOffice?.total ?? 0;
  return Number.isFinite(box) ? box : 0;
}

function collectPlayerReleases(state: GameState, maxYear: number): Array<{ projectId: string; title: string; year: number; totalRevenue: number }> {
  const out: Array<{ projectId: string; title: string; year: number; totalRevenue: number }> = [];

  const bestFromHistory = new Map<string, number>();
  for (const week of state.boxOfficeHistory || []) {
    if (week.year > maxYear) continue;
    for (const r of week.releases || []) {
      if (r.studio !== state.studio.name) continue;
      const total = r.totalRevenue ?? 0;
      const existing = bestFromHistory.get(r.projectId) ?? 0;
      if (total > existing) bestFromHistory.set(r.projectId, total);
    }
  }

  for (const p of state.projects || []) {
    if (!p) continue;
    if (p.status !== 'released') continue;
    const year = p.releaseYear ?? (p as any).scheduledReleaseYear;
    if (typeof year !== 'number') continue;
    if (year > maxYear) continue;

    const direct = getProjectTotalRevenue(p);
    const fromHistory = bestFromHistory.get(p.id) ?? 0;

    out.push({
      projectId: p.id,
      title: p.title,
      year,
      totalRevenue: direct > 0 ? direct : fromHistory,
    });
  }

  // Optional: in case player releases are mirrored into allReleases.
  for (const r of state.allReleases || []) {
    const p = r as any;
    if (!p || typeof p !== 'object') continue;
    if (!('script' in p)) continue;
    if (p.status !== 'released') continue;
    if (p.studioName !== state.studio.name) continue;

    const year = p.releaseYear;
    if (typeof year !== 'number') continue;
    if (year > maxYear) continue;

    const direct = getProjectTotalRevenue(p);
    const fromHistory = bestFromHistory.get(p.id) ?? 0;

    out.push({
      projectId: p.id,
      title: p.title,
      year,
      totalRevenue: direct > 0 ? direct : fromHistory,
    });
  }

  // De-dupe by projectId, keep the max total.
  const best = new Map<string, { projectId: string; title: string; year: number; totalRevenue: number }>();
  for (const rel of out) {
    const existing = best.get(rel.projectId);
    if (!existing || rel.totalRevenue > existing.totalRevenue) best.set(rel.projectId, rel);
  }

  return [...best.values()];
}

function buildMilestones(params: {
  studioId: string;
  studioName: string;
  year: number;
  totalReleases: number;
  totalAwards: number;
  totalBoxOffice: number;
}): Array<{ id: string; entry: WorldHistoryEntry }> {
  const { studioId, studioName, year, totalReleases, totalAwards, totalBoxOffice } = params;

  const out: Array<{ id: string; entry: WorldHistoryEntry }> = [];

  const releaseTargets = [10, 25, 50];
  for (const n of releaseTargets) {
    if (totalReleases < n) continue;
    const id = `hist:studio_milestone:${studioId}:releases:${n}`;
    out.push({
      id,
      entry: {
        id,
        kind: 'studio_milestone',
        year,
        week: 52,
        title: `${studioName} reaches ${n} releases`,
        body: `${studioName} has released ${n} projects.`,
        entityIds: { studioIds: [studioId] },
        importance: n >= 50 ? 4 : 3,
      },
    });
  }

  const awardTargets = [5, 10, 25];
  for (const n of awardTargets) {
    if (totalAwards < n) continue;
    const id = `hist:studio_milestone:${studioId}:awards:${n}`;
    out.push({
      id,
      entry: {
        id,
        kind: 'studio_milestone',
        year,
        week: 52,
        title: `${studioName} reaches ${n} awards`,
        body: `${studioName} has won ${n} awards.`,
        entityIds: { studioIds: [studioId] },
        importance: n >= 25 ? 4 : 3,
      },
    });
  }

  const boxTargets = [100_000_000, 500_000_000, 1_000_000_000];
  for (const amt of boxTargets) {
    if (totalBoxOffice < amt) continue;
    const id = `hist:studio_milestone:${studioId}:boxoffice:${amt}`;
    const label = amt >= 1_000_000_000 ? '1B' : amt >= 500_000_000 ? '500M' : '100M';
    out.push({
      id,
      entry: {
        id,
        kind: 'studio_milestone',
        year,
        week: 52,
        title: `${studioName} crosses ${label} box office`,
        body: `${studioName}'s total box office surpassed ${formatMoneyCompact(amt)}.`,
        entityIds: { studioIds: [studioId] },
        importance: amt >= 1_000_000_000 ? 5 : 4,
      },
    });
  }

  return out;
}

export const PlayerLegacySystem: TickSystem = {
  id: 'playerLegacy',
  label: 'Player legacy',
  dependsOn: ['studioFortunes'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;

    const releases = collectPlayerReleases(state, previousYear);

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

    const existingHistory = state.worldHistory || [];
    let worldHistory = existingHistory;
    const unlocked: string[] = [];

    for (const m of buildMilestones({
      studioId: state.studio.id,
      studioName: state.studio.name,
      year: previousYear,
      totalReleases,
      totalAwards,
      totalBoxOffice,
    })) {
      if (existingHistory.some((e) => e.id === m.id)) continue;

      const next = pushWorldHistory(worldHistory, m.entry);
      if (next !== worldHistory) {
        worldHistory = next;
        unlocked.push(m.entry.title);
      }
    }

    if (unlocked.length > 0) {
      ctx.recap.push({
        type: 'system',
        title: 'Milestones',
        body: unlocked.slice(0, 8).map((s) => `• ${s}`).join('\n') + (unlocked.length > 8 ? `\n…and ${unlocked.length - 8} more` : ''),
        severity: 'info',
      });
    }

    return {
      ...state,
      playerLegacy: legacy,
      worldHistory,
    };
  },
};
