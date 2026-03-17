import type { PostTheatricalRelease, Project } from '@/types/game';
import { FinancialEngine } from './FinancialEngine';

const DEFAULT_DURATIONS: Record<PostTheatricalRelease['platform'], number> = {
  streaming: 26,
  digital: 104,
  physical: 52,
  'tv-licensing': 156,
};

const isActiveStatus = (s: PostTheatricalRelease['status']): boolean =>
  s === 'planned' || s === 'active' || s === 'declining';

const categoryForPlatform = (
  platform: PostTheatricalRelease['platform']
): 'streaming' | 'licensing' => {
  if (platform === 'streaming') return 'streaming';
  return 'licensing';
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function computeSecondaryStreamingViewsFirstWeek(project: Project): number {
  const boxOffice = project.metrics?.boxOfficeTotal ?? 0;
  const budget = project.budget?.total ?? 0;

  const critics = project.metrics?.criticsScore ?? 50;
  const audience = project.metrics?.audienceScore ?? 50;
  const avgScore = (critics + audience) / 2;

  const base = Math.max(250_000, Math.floor(budget * 0.015) + Math.floor(boxOffice * 0.004));
  const qualityMultiplier = clamp(avgScore / 70, 0.6, 1.35);

  return Math.max(80_000, Math.floor(base * qualityMultiplier));
}

function cumulativeDecayed(first: number, weeks: number, decay: number): { total: number; lastWeek: number } {
  if (weeks <= 0) return { total: 0, lastWeek: 0 };

  let total = 0;
  let lastWeek = 0;

  for (let i = 0; i < weeks; i += 1) {
    const v = Math.max(25_000, Math.floor(first * Math.pow(decay, i)));
    total += v;
    lastWeek = v;
  }

  return { total, lastWeek };
}

export class PostTheatricalSystem {
  static processWeeklyRevenue(
    project: Project,
    currentWeek: number,
    currentYear: number,
    diagnosticsEnabled: boolean
  ): { project: Project; revenueDelta: number } {
    if (!project.postTheatricalReleases || project.postTheatricalReleases.length === 0) {
      return { project, revenueDelta: 0 };
    }

    const earnedByPlatform: Partial<Record<PostTheatricalRelease['platform'], number>> = {};

    const updatedReleases = project.postTheatricalReleases.map((release) => {
      if (release.status === 'ended') return release;

      if (release.lastProcessedWeek === currentWeek && release.lastProcessedYear === currentYear) {
        return release;
      }

      const durationWeeks = release.durationWeeks || DEFAULT_DURATIONS[release.platform] || 52;

      const earnedThisWeek = isActiveStatus(release.status)
        ? Math.round(release.weeklyRevenue || 0)
        : 0;

      if (earnedThisWeek > 0) {
        earnedByPlatform[release.platform] = (earnedByPlatform[release.platform] || 0) + earnedThisWeek;
      }

      if (release.status === 'planned') {
        const weeksActive = 1;
        const revenue = (release.revenue || 0) + earnedThisWeek;

        const ended = weeksActive >= durationWeeks;
        const nextStatus: PostTheatricalRelease['status'] = ended
          ? 'ended'
          : weeksActive >= durationWeeks * 0.8
            ? 'declining'
            : 'active';

        if (diagnosticsEnabled) {
          console.log(`      STARTING: ${release.platform} release`);
        }

        return {
          ...release,
          status: nextStatus,
          weeksActive: ended ? durationWeeks : weeksActive,
          revenue,
          lastProcessedWeek: currentWeek,
          lastProcessedYear: currentYear,
        };
      }

      if (release.status === 'active' || release.status === 'declining') {
        const newWeeksActive = (release.weeksActive || 0) + 1;
        const newRevenue = (release.revenue || 0) + earnedThisWeek;

        const ended = newWeeksActive >= durationWeeks;
        const nextStatus: PostTheatricalRelease['status'] = ended
          ? 'ended'
          : newWeeksActive >= durationWeeks * 0.8
            ? 'declining'
            : 'active';

        if (diagnosticsEnabled) {
          console.log(
            `      ${release.platform}: Week ${newWeeksActive}/${durationWeeks}, +${earnedThisWeek.toLocaleString()}, Total: ${newRevenue.toLocaleString()} (${nextStatus})`
          );
        }

        return {
          ...release,
          weeksActive: ended ? durationWeeks : newWeeksActive,
          revenue: newRevenue,
          status: nextStatus,
          lastProcessedWeek: currentWeek,
          lastProcessedYear: currentYear,
        };
      }

      return {
        ...release,
        lastProcessedWeek: currentWeek,
        lastProcessedYear: currentYear,
      };
    });

    const revenueDelta = Object.values(earnedByPlatform).reduce((sum, v) => sum + (v || 0), 0);

    if (revenueDelta > 0) {
      const existing = FinancialEngine.getFilmFinancials(project.id).transactions;

      (Object.entries(earnedByPlatform) as Array<[PostTheatricalRelease['platform'], number]>).forEach(
        ([platform, amount]) => {
          if (!amount || amount <= 0) return;

          const category = categoryForPlatform(platform);
          const description = `Post-theatrical - ${platform}`;

          const alreadyRecorded = existing.some(
            (t) =>
              t.type === 'revenue' &&
              t.category === category &&
              t.week === currentWeek &&
              t.year === currentYear &&
              t.description === description
          );

          if (!alreadyRecorded) {
            FinancialEngine.recordTransaction(
              'revenue',
              category,
              amount,
              currentWeek,
              currentYear,
              description,
              project.id
            );
          }
        }
      );
    }

    // If a theatrical film goes to streaming post-theatrically, simulate viewership so streaming dashboards
    // and contract checks don't stay stuck at 0.
    const streamingWindow = updatedReleases.find(
      (r) => r.platform === 'streaming' && (r.status === 'planned' || r.status === 'active' || r.status === 'declining')
    );

    const isSecondaryStreaming =
      !!streamingWindow &&
      project.releaseStrategy?.type !== 'streaming' &&
      project.type !== 'series' &&
      project.type !== 'limited-series';

    let updatedProject: Project = {
      ...project,
      postTheatricalReleases: updatedReleases,
    };

    if (isSecondaryStreaming && streamingWindow) {
      const weeks = streamingWindow.weeksActive || 0;
      const decay = 0.78;

      const existingFirstWeek = updatedProject.metrics?.streaming?.viewsFirstWeek || 0;
      const viewsFirstWeek = existingFirstWeek > 0 ? existingFirstWeek : computeSecondaryStreamingViewsFirstWeek(updatedProject);

      const { total, lastWeek } = cumulativeDecayed(viewsFirstWeek, weeks, decay);

      const critics = updatedProject.metrics?.criticsScore ?? 50;
      const audience = updatedProject.metrics?.audienceScore ?? 50;
      const avgScore = (critics + audience) / 2;

      const completionRate = clamp(Math.floor(55 + (avgScore - 50) * 0.35 - weeks * 0.4), 30, 95);
      const audienceShare = clamp(Math.floor(4 + (avgScore - 50) * 0.08), 2, 25);
      const runtime = updatedProject.script?.estimatedRuntime || 110;

      updatedProject = {
        ...updatedProject,
        metrics: {
          ...(updatedProject.metrics || ({} as any)),
          streamingViews: total,
          streaming: {
            viewsFirstWeek,
            totalViews: total,
            completionRate,
            audienceShare,
            watchTimeHours: Math.max(1000, Math.floor((total * runtime) / 60)),
            subscriberGrowth: Math.max(500, Math.floor(lastWeek * 0.015)),
          },
        },
      };
    }

    return {
      project: updatedProject,
      revenueDelta,
    };
  }
}
