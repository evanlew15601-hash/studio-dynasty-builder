import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameState, PostTheatricalRelease, Project } from '@/types/game';
import { getAllKnownProjects, getPlayerProjectIds, isPlayerOwnedProject } from '@/utils/playerProjects';
import { getPostTheatricalPlatformId } from '@/utils/platformIds';
import { getTheatricalEndAbs, getReleaseAbs } from '@/utils/postTheatrical';
import { isPrimaryStreamingFilm, isTheatricalFilm, isTvProject } from '@/utils/projectMedium';
import type { TickSystem } from '../core/types';

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
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

function dateForWeekYear(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + Math.max(0, week - 1) * 7));
}



function isReleasedLike(project: Project): boolean {
  const status = project.status;
  return status === 'released' || status === 'distribution' || status === 'archived' || status === 'completed';
}

function computeWindowWeeklyRevenue(project: Project, durationWeeks: number): number {
  const boxOffice = Math.max(0, Math.floor(project.metrics?.boxOfficeTotal ?? 0));
  const budget = Math.max(0, Math.floor(project.budget?.total ?? 0));

  const critics = clampInt(Math.floor(project.metrics?.criticsScore ?? project.script?.quality ?? 60), 20, 95);
  const audience = clampInt(Math.floor(project.metrics?.audienceScore ?? critics), 20, 95);
  const avgScore = (critics + audience) / 2;

  const performanceBase = boxOffice > 0 ? boxOffice : Math.floor(budget * 1.1);
  const licenseTotal = Math.max(100_000, Math.floor(performanceBase * (0.07 + avgScore / 1400)));

  return Math.max(10_000, Math.floor(licenseTotal / Math.max(1, durationWeeks)));
}

function pickRivalPlatformId(params: {
  market: PlatformMarketState;
  excludeIds?: Set<string>;
  rngFloat: () => number;
}): string | null {
  const { market, excludeIds, rngFloat } = params;

  const candidates = (market.rivals ?? [])
    .filter((r) => r && r.status !== 'collapsed')
    .filter((r) => !excludeIds || !excludeIds.has(r.id));

  if (candidates.length === 0) return null;

  const weights = candidates.map((r) => Math.max(1, Math.floor(r.subscribers ?? 0)));
  const total = weights.reduce((a, b) => a + b, 0);

  let roll = rngFloat() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i].id;
  }

  return candidates[candidates.length - 1].id;
}

function normalizeStreamingReleaseProvider(params: {
  release: PostTheatricalRelease;
  market: PlatformMarketState;
  rngFloat: () => number;
  playerPlatformId: string | null;
}): PostTheatricalRelease {
  const { release, market, rngFloat, playerPlatformId } = params;

  if (!release || release.platform !== 'streaming') return release;

  const currentPlatformId = getPostTheatricalPlatformId(release);
  if (currentPlatformId) return release;

  const providerId = pickRivalPlatformId({
    market,
    excludeIds: playerPlatformId ? new Set([playerPlatformId]) : undefined,
    rngFloat,
  });

  if (!providerId) return release;

  return {
    ...release,
    providerId,
  } as any;
}

export const PlatformAutoStreamingWindowsSystem: TickSystem = {
  id: 'platformAutoStreamingWindows',
  label: 'Platform auto streaming windows (Streaming Wars)',
  dependsOn: ['boxOffice', 'platformMarketBootstrap'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const currentAbs = ctx.year * 52 + ctx.week;

    const playerPlatformId = market.player && market.player.status === 'active' ? market.player.id : null;

    const playerProjectIds = getPlayerProjectIds(state);
    const unique = getAllKnownProjects(state);

    const updatedById = new Map<string, Project>();

    const DEFAULT_RIVAL_WINDOW_DELAY_WEEKS = 8;
    const DEFAULT_PLAYER_PLATFORM_DELAY_WEEKS = 16;
    const DEFAULT_RIVAL_WINDOW_DURATION_WEEKS = 104;
    const DEFAULT_OWNED_LIBRARY_DURATION_WEEKS = 260;

    for (const project0 of unique) {
      if (!project0) continue;
      if (!isReleasedLike(project0)) continue;
      if (isTvProject(project0)) continue;

      let changed = false;

      const releases0 = Array.isArray(project0.postTheatricalReleases) ? project0.postTheatricalReleases : [];
      const normalizedReleases = releases0.map((r) => {
        const next = normalizeStreamingReleaseProvider({
          release: r,
          market,
          rngFloat: () => ctx.rng.nextFloat(0, 1),
          playerPlatformId,
        });
        if (next !== r) changed = true;
        return next;
      });

      const hasAnyStreamingWindow = normalizedReleases.some(
        (r) => r && r.platform === 'streaming' && !!getPostTheatricalPlatformId(r)
      );

      const hasOwnedPlayerPlatformWindow =
        !!playerPlatformId &&
        normalizedReleases.some((r) => r && r.platform === 'streaming' && r.platformId === playerPlatformId);

      const isPlayerOwned = isPlayerOwnedProject({ project: project0, state, playerProjectIds });

      // If the player has a platform, ensure player-owned theatrical films always land there (even if
      // they also have rival windows).
      if (
        isPlayerOwned &&
        playerPlatformId &&
        !hasOwnedPlayerPlatformWindow &&
        isTheatricalFilm(project0) &&
        !isPrimaryStreamingFilm(project0)
      ) {
        const endAbs = getTheatricalEndAbs(project0, currentAbs);
        if (endAbs != null) {
          const delayWeeks = DEFAULT_PLAYER_PLATFORM_DELAY_WEEKS;
          const startAbs = endAbs + delayWeeks;
          const start = weekYearForAbsWeek(startAbs);

          const releaseAbs = getReleaseAbs(project0);
          const implicitDelay = releaseAbs != null ? Math.max(0, startAbs - releaseAbs) : delayWeeks;

          const durationWeeks = DEFAULT_OWNED_LIBRARY_DURATION_WEEKS;

          const newRelease: PostTheatricalRelease = {
            id: `release:${project0.id}:${playerPlatformId}:${start.year}:W${start.week}`,
            projectId: project0.id,
            platform: 'streaming',
            platformId: playerPlatformId,
            providerId: undefined,
            releaseDate: dateForWeekYear(start.year, start.week),
            releaseWeek: start.week,
            releaseYear: start.year,
            delayWeeks: clampInt(implicitDelay, 0, 260),
            revenue: 0,
            weeklyRevenue: 0,
            weeksActive: 0,
            status: 'planned',
            cost: 0,
            durationWeeks,
          };

          normalizedReleases.push(newRelease);
          changed = true;
        }
      }

      // For titles without any streaming presence, create a rival window (or route player-owned titles
      // to rivals if the player platform is not active yet).
      if (!hasAnyStreamingWindow && isTheatricalFilm(project0) && !isPrimaryStreamingFilm(project0)) {
        const endAbs = getTheatricalEndAbs(project0, currentAbs);
        if (endAbs != null) {
          // Player-owned titles should not be auto-licensed away once the player platform exists.
          if (isPlayerOwned && playerPlatformId) {
            // noop
          } else {
            const destinationId = pickRivalPlatformId({
              market,
              excludeIds: playerPlatformId ? new Set([playerPlatformId]) : undefined,
              rngFloat: () => ctx.rng.nextFloat(0, 1),
            });

            if (destinationId) {
              const delayWeeks = DEFAULT_RIVAL_WINDOW_DELAY_WEEKS;
              const startAbs = endAbs + delayWeeks;
              const start = weekYearForAbsWeek(startAbs);

              const releaseAbs = getReleaseAbs(project0);
              const implicitDelay = releaseAbs != null ? Math.max(0, startAbs - releaseAbs) : delayWeeks;

              const durationWeeks = DEFAULT_RIVAL_WINDOW_DURATION_WEEKS;
              const weeklyRevenue = computeWindowWeeklyRevenue(project0, durationWeeks);

              const newRelease: PostTheatricalRelease = {
                id: `release:${project0.id}:${destinationId}:${start.year}:W${start.week}`,
                projectId: project0.id,
                platform: 'streaming',
                providerId: destinationId,
                platformId: undefined,
                releaseDate: dateForWeekYear(start.year, start.week),
                releaseWeek: start.week,
                releaseYear: start.year,
                delayWeeks: clampInt(implicitDelay, 0, 260),
                revenue: 0,
                weeklyRevenue,
                weeksActive: 0,
                status: 'planned',
                cost: 0,
                durationWeeks,
              };

              normalizedReleases.push(newRelease);
              changed = true;
            }
          }
        }
      }

      if (!changed) continue;

      updatedById.set(project0.id, {
        ...project0,
        postTheatricalReleases: normalizedReleases,
      });
    }

    if (updatedById.size === 0) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...(state as GameState),
      projects: (state.projects || []).map(patch) as Project[],
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };
  },
};
