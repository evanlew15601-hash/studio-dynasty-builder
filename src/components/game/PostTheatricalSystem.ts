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

      const scheduledAbs =
        release.status === 'planned' && typeof release.releaseWeek === 'number' && typeof release.releaseYear === 'number'
          ? release.releaseYear * 52 + release.releaseWeek
          : null;

      const currentAbs = currentYear * 52 + currentWeek;
      const notStartedYet = scheduledAbs != null && scheduledAbs > currentAbs;

      const earnedThisWeek = !notStartedYet && isActiveStatus(release.status)
        ? Math.round(release.weeklyRevenue || 0)
        : 0;

      if (earnedThisWeek > 0) {
        earnedByPlatform[release.platform] = (earnedByPlatform[release.platform] || 0) + earnedThisWeek;
      }

      if (release.status === 'planned') {
        if (notStartedYet) {
          return {
            ...release,
            lastProcessedWeek: currentWeek,
            lastProcessedYear: currentYear,
          };
        }

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

    return {
      project: {
        ...project,
        postTheatricalReleases: updatedReleases,
      },
      revenueDelta,
    };
  }
}
