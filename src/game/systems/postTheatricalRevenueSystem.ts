import type { GameState, PostTheatricalRelease, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { getTheatricalEndAbs, getReleaseAbs } from '@/utils/postTheatrical';
import { getPostTheatricalPlatformId, isPlayerPlatformId } from '@/utils/platformIds';

const DEFAULT_DURATIONS: Record<PostTheatricalRelease['platform'], number> = {
  streaming: 26,
  digital: 104,
  physical: 52,
  'tv-licensing': 156,
};

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function isActiveStatus(s: PostTheatricalRelease['status']): boolean {
  return s === 'planned' || s === 'active' || s === 'declining';
}

function scheduledAbsForRelease(params: {
  project: Project;
  release: PostTheatricalRelease;
  currentAbs: number;
}): number | null {
  const { project, release, currentAbs } = params;

  const explicit =
    typeof release.releaseWeek === 'number' && typeof release.releaseYear === 'number'
      ? release.releaseYear * 52 + release.releaseWeek
      : null;

  const platformId = getPostTheatricalPlatformId(release);
  const isPlayer = isPlayerPlatformId(platformId);

  if (isPlayer) {
    const endAbs = getTheatricalEndAbs(project, currentAbs);
    if (endAbs == null) return null;

    const delay = Math.max(0, Math.floor(release.delayWeeks ?? 0));
    const desired = endAbs + delay;

    // Guard against malformed saves that scheduled the window before theatrical ended.
    return explicit != null ? Math.max(explicit, desired) : desired;
  }

  if (explicit != null) return explicit;

  if (typeof release.delayWeeks === 'number') {
    const releaseAbs = getReleaseAbs(project);
    if (releaseAbs != null) return releaseAbs + Math.max(0, Math.floor(release.delayWeeks));
  }

  return null;
}

function processRelease(params: {
  project: Project;
  release: PostTheatricalRelease;
  week: number;
  year: number;
}): PostTheatricalRelease {
  const { project, release, week, year } = params;

  if (release.status === 'ended') return release;

  if (release.lastProcessedWeek === week && release.lastProcessedYear === year) {
    return release;
  }

  const durationWeeks = release.durationWeeks || DEFAULT_DURATIONS[release.platform] || 52;

  const currentAbs = year * 52 + week;

  const platformId = getPostTheatricalPlatformId(release);
  const isPlayer = isPlayerPlatformId(platformId);

  const scheduledAbs = release.status === 'planned' ? scheduledAbsForRelease({ project, release, currentAbs }) : null;

  const notStartedYet =
    (scheduledAbs != null && scheduledAbs > currentAbs) ||
    // Player-owned platform windows must wait until theatrical end is known.
    (release.status === 'planned' && isPlayer && scheduledAbs == null);

  const weeklyRevenue = Math.max(0, Math.round((release.weeklyRevenue as any) || 0));
  const earnedThisWeek = !notStartedYet && isActiveStatus(release.status) ? weeklyRevenue : 0;

  if (release.status === 'planned') {
    if (notStartedYet) {
      return {
        ...release,
        lastProcessedWeek: week,
        lastProcessedYear: year,
      };
    }

    const weeksActive = 1;
    const revenue = Math.max(0, Math.round(((release.revenue as any) || 0) + earnedThisWeek));

    const ended = weeksActive > durationWeeks;
    const status: PostTheatricalRelease['status'] = ended
      ? 'ended'
      : weeksActive >= durationWeeks * 0.8
        ? 'declining'
        : 'active';

    return {
      ...release,
      status,
      weeksActive: ended ? durationWeeks : weeksActive,
      revenue,
      lastProcessedWeek: week,
      lastProcessedYear: year,
    };
  }

  if (release.status === 'active' || release.status === 'declining') {
    const nextWeeksActive = (release.weeksActive || 0) + 1;
    const revenue = Math.max(0, Math.round(((release.revenue as any) || 0) + earnedThisWeek));

    const ended = nextWeeksActive > durationWeeks;
    const status: PostTheatricalRelease['status'] = ended
      ? 'ended'
      : nextWeeksActive >= durationWeeks * 0.8
        ? 'declining'
        : 'active';

    return {
      ...release,
      status,
      weeksActive: ended ? durationWeeks : nextWeeksActive,
      revenue,
      lastProcessedWeek: week,
      lastProcessedYear: year,
    };
  }

  return {
    ...release,
    lastProcessedWeek: week,
    lastProcessedYear: year,
  };
}

export const PostTheatricalRevenueSystem: TickSystem = {
  id: 'postTheatricalRevenue',
  label: 'Post-theatrical revenue',
  dependsOn: ['boxOffice'],
  onTick: (state, ctx) => {
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

    for (const project of unique) {
      const releases = project.postTheatricalReleases;
      if (!Array.isArray(releases) || releases.length === 0) continue;

      let changed = false;

      const updatedReleases = releases.map((r) => {
        const next = processRelease({ project, release: r, week: ctx.week, year: ctx.year });
        if (next !== r) changed = true;
        return next;
      });

      if (!changed) continue;

      updatedById.set(project.id, {
        ...project,
        postTheatricalReleases: updatedReleases,
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
