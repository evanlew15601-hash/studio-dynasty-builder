import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { StreamingFilmSystem } from '@/components/game/StreamingFilmSystem';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function isTvProject(project: Project): boolean {
  const kind = (project.type as any) as string;
  return kind === 'series' || kind === 'limited-series';
}

function isPrimaryStreamingFilm(project: Project): boolean {
  return !isTvProject(project) && project.releaseStrategy?.type === 'streaming';
}

function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + Math.max(0, week - 1) * 7));
}

function ensureStreamingPremiereWindow(project: Project, week: number, year: number): Project {
  const alreadyHasStreamingWindow = (project.postTheatricalReleases || []).some((r) => r && r.platform === 'streaming');
  if (alreadyHasStreamingWindow) return project;

  const critics = project.metrics?.criticsScore || 50;
  const audience = project.metrics?.audienceScore || 50;
  const avgScore = (critics + audience) / 2;

  const buzz = project.marketingData?.currentBuzz ?? project.marketingCampaign?.buzz ?? 0;
  const viewsFirstWeek = project.metrics?.streaming?.viewsFirstWeek || 0;

  const scoreMultiplier = Math.min(1.4, Math.max(0.6, avgScore / 70));
  const buzzMultiplier = 1 + Math.min(0.5, Math.max(0, buzz / 250));

  const estimatedTotalRevenue = Math.max(100_000, Math.floor(viewsFirstWeek * 0.35 * scoreMultiplier * buzzMultiplier));

  const durationWeeks = 26;
  const weeklyRevenue = Math.max(10_000, Math.round(estimatedTotalRevenue / durationWeeks));

  const releaseDate = triggerDateFromWeekYear(year, week);

  return {
    ...project,
    postTheatricalEligible: true,
    theatricalEndDate: releaseDate,
    postTheatricalReleases: [
      ...(project.postTheatricalReleases || []),
      {
        id: `release-${project.id}-${year}-${week}-streaming`,
        projectId: project.id,
        platform: 'streaming',
        providerId: project.releaseStrategy?.streamingProviderId || project.streamingPremiereDeal?.providerId || undefined,
        releaseDate,
        releaseWeek: week,
        releaseYear: year,
        delayWeeks: 0,
        revenue: 0,
        weeklyRevenue,
        weeksActive: 0,
        status: 'planned',
        cost: 0,
        durationWeeks,
      },
    ],
  };
}

export const ScheduledReleaseSystem: TickSystem = {
  id: 'scheduledReleases',
  label: 'Scheduled releases',
  dependsOn: ['marketingCampaigns'],
  onTick: (state, ctx) => {
    const currentAbs = ctx.year * 52 + ctx.week;

    const candidates: Project[] = [];

    for (const p of state.projects || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of (state.aiStudioProjects as any) || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of state.allReleases || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    const seen = new Set<string>();
    const unique = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const updatedById = new Map<string, Project>();

    for (const project0 of unique) {
      if (!project0) continue;

      const w = typeof project0.scheduledReleaseWeek === 'number' ? project0.scheduledReleaseWeek : null;
      const y = typeof project0.scheduledReleaseYear === 'number' ? project0.scheduledReleaseYear : null;
      if (!w || !y) continue;

      const isScheduledForRelease = project0.status === 'scheduled-for-release';
      const isLegacyReleasePhase = (project0.currentPhase as any) === 'release';

      // Compatibility: older saves sometimes stored projects in the "release" phase with a planned
      // scheduledReleaseWeek/Year but without setting status="scheduled-for-release".
      if (!isScheduledForRelease && !isLegacyReleasePhase) continue;

      const releaseAbs = y * 52 + w;
      if (currentAbs < releaseAbs) continue;

      // Theatrical projects: just advance status; BoxOfficeSystem handles revenue/metrics.
      if (!isTvProject(project0) && !isPrimaryStreamingFilm(project0)) {
        updatedById.set(project0.id, {
          ...project0,
          status: 'released',
          currentPhase: 'distribution' as any,
          phaseDuration: -1,
          releaseWeek: w,
          releaseYear: y,
          scheduledReleaseWeek: w,
          scheduledReleaseYear: y,
          readyForRelease: false,
        });
        continue;
      }

      // TV series: release unlocks the episode + ratings systems.
      if (isTvProject(project0)) {
        updatedById.set(project0.id, {
          ...project0,
          status: 'released',
          currentPhase: 'distribution' as any,
          phaseDuration: -1,
          releaseWeek: w,
          releaseYear: y,
          scheduledReleaseWeek: w,
          scheduledReleaseYear: y,
          readyForRelease: false,
        });
        continue;
      }

      // Primary streaming films: initialize streaming metrics and create a streaming window for post-theatrical revenue.
      if (isPrimaryStreamingFilm(project0)) {
        const premierePlatformLabel =
          project0.distributionStrategy?.primary?.type === 'streaming' ? project0.distributionStrategy.primary.platform : undefined;

        let project = StreamingFilmSystem.initializeRelease(project0, w, y, premierePlatformLabel);
        project = {
          ...project,
          scheduledReleaseWeek: w,
          scheduledReleaseYear: y,
          readyForRelease: false,
        };

        project = ensureStreamingPremiereWindow(project, w, y);

        updatedById.set(project0.id, project);
        continue;
      }
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
