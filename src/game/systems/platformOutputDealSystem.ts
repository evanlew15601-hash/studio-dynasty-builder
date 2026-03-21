import type { GameState, PostTheatricalRelease, Project } from '@/types/game';
import type { PlatformMarketState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';
import { isTheatricalFilm } from '@/utils/projectMedium';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function weekYearForAbsWeek(abs: number): { week: number; year: number } {
  let year = Math.floor(abs / 52);
  let week = abs % 52;

  if (week === 0) {
    week = 52;
    year -= 1;
  }

  return { week, year };
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function computeWindowWeeklyRevenue(project: Project, durationWeeks: number): number {
  const boxOffice = Math.max(0, Math.floor(project.metrics?.boxOfficeTotal ?? 0));
  const budget = Math.max(0, Math.floor(project.budget?.total ?? 0));

  const critics = clampInt(Math.floor(project.metrics?.criticsScore ?? 60), 20, 95);
  const audience = clampInt(Math.floor(project.metrics?.audienceScore ?? 60), 20, 95);
  const avgScore = (critics + audience) / 2;

  const performanceBase = boxOffice > 0 ? boxOffice : Math.floor(budget * 1.1);
  const licenseTotal = Math.max(100_000, Math.floor(performanceBase * (0.08 + avgScore / 1200)));

  return Math.max(10_000, Math.floor(licenseTotal / Math.max(1, durationWeeks)));
}

export const PlatformOutputDealSystem: TickSystem = {
  id: 'platformOutputDeal',
  label: 'Platform output deals (Streaming Wars)',
  dependsOn: ['scheduledReleases'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;
    if (!market || !player || player.status !== 'active') return state;

    const deal = player.outputDeal;
    if (!deal) return state;

    const currentAbs = absWeek(ctx.week, ctx.year);
    const endAbs = absWeek(deal.endWeek, deal.endYear);

    // Expired deal.
    if (currentAbs > endAbs) {
      ctx.recap.push({
        type: 'market',
        title: 'Output deal expired',
        body: `${player.name}'s output deal with ${deal.partnerName} has expired.`,
        severity: 'info',
      });

      return {
        ...(state as GameState),
        platformMarket: {
          ...market,
          player: {
            ...player,
            outputDeal: undefined,
          },
        },
      };
    }

    const partnerId = deal.partnerId;

    const candidates: Project[] = [];
    for (const p of state.projects || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    if (candidates.length === 0) return state;

    const updatedById = new Map<string, Project>();

    for (const project0 of candidates) {
      if (!project0 || project0.status !== 'released') continue;

      // Player-only: skip AI studio releases.
      if (project0.studioName && project0.studioName !== state.studio.name) continue;

      if (!isTheatricalFilm(project0)) continue;

      if (project0.releaseWeek !== ctx.week || project0.releaseYear !== ctx.year) continue;

      const already = (project0.postTheatricalReleases || []).some((r) => {
        const id = (r as any)?.providerId ?? (r as any)?.platformId;
        return r && r.platform === 'streaming' && id === partnerId;
      });
      if (already) continue;

      const releaseAbs = absWeek(ctx.week, ctx.year);
      const startAbs = releaseAbs + Math.max(0, Math.floor(deal.windowDelayWeeks));
      const start = weekYearForAbsWeek(startAbs);

      const windowDurationWeeks = Math.max(8, Math.floor(deal.windowDurationWeeks || 26));
      const weeklyRevenue = computeWindowWeeklyRevenue(project0, windowDurationWeeks);

      const releaseId = `release:${project0.id}:${partnerId}:${start.year}:W${start.week}`;

      const newRelease: PostTheatricalRelease = {
        id: releaseId,
        projectId: project0.id,
        platform: 'streaming',
        providerId: partnerId,
        releaseDate: new Date(Date.UTC(start.year, 0, 1 + Math.max(0, start.week - 1) * 7)),
        releaseWeek: start.week,
        releaseYear: start.year,
        delayWeeks: deal.windowDelayWeeks,
        revenue: 0,
        weeklyRevenue,
        weeksActive: 0,
        status: 'planned',
        cost: 0,
        durationWeeks: windowDurationWeeks,
      } as any;

      const next: Project = {
        ...project0,
        releaseStrategy: project0.releaseStrategy
          ? {
              ...project0.releaseStrategy,
              streamingExclusive: false,
            }
          : project0.releaseStrategy,
        postTheatricalReleases: [...(project0.postTheatricalReleases || []), newRelease],
      };

      updatedById.set(project0.id, next);
    }

    if (updatedById.size === 0) return state;

    return {
      ...(state as GameState),
      projects: (state.projects || []).map((p) => (isProjectLike(p) ? updatedById.get(p.id) || p : p)) as Project[],
    };
  },
};
