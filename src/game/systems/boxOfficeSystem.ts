import type { BoxOfficeRelease, BoxOfficeWeek, GameState, Project, TopFilmEntry, TopFilmsWeek } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import type { TickSystem } from '../core/types';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}



function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function isTheatricalProject(project: Project): boolean {
  const kind = (project.type as any) as string;
  if (kind === 'series' || kind === 'limited-series') return false;

  const releaseType = project.releaseStrategy?.type;
  if (releaseType === 'streaming') return false;

  return true;
}

function getReleaseWeekYear(project: Project): { week: number; year: number } | null {
  const w = typeof project.releaseWeek === 'number' ? project.releaseWeek : null;
  const y = typeof project.releaseYear === 'number' ? project.releaseYear : null;
  if (w && y) return { week: w, year: y };

  const sw = typeof project.scheduledReleaseWeek === 'number' ? project.scheduledReleaseWeek : null;
  const sy = typeof project.scheduledReleaseYear === 'number' ? project.scheduledReleaseYear : null;
  if (sw && sy) return { week: sw, year: sy };

  return null;
}

function ensureReleaseScores(project: Project, releaseWeek: number, releaseYear: number): Project {
  const criticsScore =
    project.metrics?.criticsScore ?? stableInt(`${project.id}|critics|${releaseYear}|${releaseWeek}`, 50, 90);
  const audienceScore =
    project.metrics?.audienceScore ?? stableInt(`${project.id}|audience|${releaseYear}|${releaseWeek}`, 50, 90);

  return {
    ...project,
    metrics: {
      ...(project.metrics || {}),
      criticsScore,
      audienceScore,
    },
  };
}

function getInitialTheaterCount(project: Project): number {
  const releaseType = project.releaseStrategy?.type || 'wide';
  switch (releaseType) {
    case 'wide':
      return 3200;
    case 'limited':
      return 600;
    case 'platform':
      return 150;
    case 'festival':
      return 80;
    default:
      return 3200;
  }
}

function getReleaseMultiplier(releaseType: string): number {
  switch (releaseType) {
    case 'wide':
      return 1.0;
    case 'limited':
      return 0.4;
    case 'platform':
      return 0.6;
    case 'festival':
      return 0.25;
    default:
      return 1.0;
  }
}

function getRealisticWeeklyMultiplier(weekIndex: number): number {
  const curve = [
    1.0,
    0.55,
    0.35,
    0.25,
    0.2,
    0.16,
    0.13,
    0.11,
    0.09,
    0.07,
    0.06,
    0.05,
    0.04,
    0.03,
    0.025,
    0.02,
    0.015,
    0.01,
    0.008,
    0.005,
  ];

  return curve[weekIndex] || 0.001;
}

function calculateWeeklyRevenue(project: Project, weekIndex: number): number {
  const budgetTotal = Math.max(0, Math.floor((project as any)?.budget?.total ?? 0));

  const baseRevenue = Math.max(budgetTotal * 0.3, 500_000);

  const criticsMultiplier = Math.max(0.3, (project.metrics?.criticsScore || 50) / 100);
  const audienceMultiplier = Math.max(0.3, (project.metrics?.audienceScore || 50) / 100);

  let marketingMultiplier = 1.0;
  const campaign = (project as any)?.marketingCampaign;
  if (campaign) {
    const buzzBonus = Math.max(0, (campaign.buzz || 0) / 100);
    const budgetBonus = Math.max(0, (campaign.budgetSpent || 0) / 1_000_000) * 0.1;
    marketingMultiplier = 1 + buzzBonus + budgetBonus;
  }

  const starPowerMultiplier = 1 + Math.min(0.5, (project as any)?.starPowerBonus || 0);

  const releaseMultiplier = getReleaseMultiplier(project.releaseStrategy?.type || 'wide');
  const weeklyMultiplier = getRealisticWeeklyMultiplier(weekIndex);

  const totalRevenue =
    baseRevenue * criticsMultiplier * audienceMultiplier * marketingMultiplier * starPowerMultiplier * releaseMultiplier * weeklyMultiplier;

  return Math.max(100_000, Math.floor(totalRevenue));
}

function shouldExitTheatersPermanently(project: Project, weeksSinceRelease: number): boolean {
  if (weeksSinceRelease >= 20) return true;

  const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;

  if (weeksSinceRelease >= 8 && avgScore < 40) return true;
  if (weeksSinceRelease >= 14 && avgScore < 60) return true;

  return false;
}

function calculateTheaterCount(project: Project, weeksSinceRelease: number): number {
  const initialCount = getInitialTheaterCount(project);
  const releaseType = project.releaseStrategy?.type || 'wide';

  if (releaseType === 'platform') {
    const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
    if (avgScore > 80 && weeksSinceRelease >= 3) {
      const expansionMultiplier = Math.min(4, weeksSinceRelease / 2);
      return Math.min(3200, Math.floor(initialCount * expansionMultiplier));
    }
  }

  if (weeksSinceRelease <= 2) return initialCount;
  if (weeksSinceRelease <= 4) return Math.floor(initialCount * 0.95);
  if (weeksSinceRelease <= 8) return Math.floor(initialCount * 0.85);
  if (weeksSinceRelease <= 12) return Math.floor(initialCount * 0.65);
  if (weeksSinceRelease <= 16) return Math.floor(initialCount * 0.35);
  return Math.floor(initialCount * 0.15);
}

function mergeBoxOfficeWeek(history: BoxOfficeWeek[], week: number, year: number, releases: BoxOfficeRelease[]): BoxOfficeWeek[] {
  if (releases.length === 0) return history;

  const idx = history.findIndex((w) => w.week === week && w.year === year);

  const base: BoxOfficeWeek =
    idx >= 0
      ? {
          ...history[idx],
          releases: Array.isArray(history[idx]?.releases) ? history[idx].releases.slice() : [],
        }
      : { week, year, releases: [], totalRevenue: 0 };

  const byId = new Map<string, BoxOfficeRelease>();
  for (const r of base.releases || []) byId.set(r.projectId, r);
  for (const r of releases) byId.set(r.projectId, r);

  const merged = [...byId.values()].sort((a, b) => (b.weeklyRevenue ?? 0) - (a.weeklyRevenue ?? 0) || a.projectId.localeCompare(b.projectId));

  const next: BoxOfficeWeek = {
    ...base,
    releases: merged,
    totalRevenue: merged.reduce((acc, r) => acc + (r.weeklyRevenue || 0), 0),
  };

  const out = history.slice();
  if (idx >= 0) out[idx] = next;
  else out.push(next);

  return out;
}

function mergeTopFilmsWeek(history: TopFilmsWeek[], week: number, year: number, boxOffice: BoxOfficeWeek): TopFilmsWeek[] {
  const releases = Array.isArray(boxOffice.releases) ? boxOffice.releases : [];
  if (releases.length === 0) return history;

  const prevWeek = history.length > 0 ? history[history.length - 1] : null;
  const prevPos = new Map<string, number>();
  for (const e of prevWeek?.topFilms || []) prevPos.set(e.projectId, e.position);

  const topFilms: TopFilmEntry[] = releases
    .slice()
    .sort((a, b) => (b.weeklyRevenue ?? 0) - (a.weeklyRevenue ?? 0) || a.projectId.localeCompare(b.projectId))
    .slice(0, 10)
    .map((r, i) => {
      const previous = prevPos.get(r.projectId);
      const position = i + 1;
      const trend: TopFilmEntry['trend'] =
        previous == null ? 'new' : previous > position ? 'rising' : previous < position ? 'falling' : 'stable';

      return {
        projectId: r.projectId,
        title: r.title,
        studioName: r.studio,
        weeklyGross: r.weeklyRevenue,
        totalGross: r.totalRevenue,
        position,
        trend,
        receptionTags: [],
      };
    });

  const idx = history.findIndex((w) => w.week === week && w.year === year);

  const next: TopFilmsWeek = {
    week,
    year,
    topFilms,
  };

  const out = history.slice();
  if (idx >= 0) out[idx] = next;
  else out.push(next);

  return out;
}

export const BoxOfficeSystem: TickSystem = {
  id: 'boxOffice',
  label: 'Box office (theatrical)',
  dependsOn: ['scheduledReleases', 'competitorReleases'],
  onTick: (state, ctx) => {
    const currentAbs = absWeek(ctx.week, ctx.year);

    const candidates: Project[] = [];

    for (const p of state.projects || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of (state.aiStudioProjects as any) || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const r of state.allReleases || []) {
      if (isProjectLike(r)) candidates.push(r);
    }

    // De-dupe by id.
    const seen = new Set<string>();
    const unique = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const updatedById = new Map<string, Project>();
    const weeklyReleases: BoxOfficeRelease[] = [];
    const historyPatches: Array<{ week: number; year: number; releases: BoxOfficeRelease[] }> = [];

    const hasLoggedOpeningWeek = (projectId: string, week: number, year: number): boolean => {
      const entry = (state.boxOfficeHistory || []).find((w) => w.week === week && w.year === year);
      if (!entry) return false;
      return (entry.releases || []).some((r) => r.projectId === projectId);
    };

    for (const project0 of unique) {
      if (!project0 || project0.status !== 'released') continue;
      if (!isTheatricalProject(project0)) continue;

      const rel = getReleaseWeekYear(project0);
      if (!rel) continue;

      const releaseAbs = absWeek(rel.week, rel.year);
      if (currentAbs < releaseAbs) continue;

      const expectedWeeksSinceRelease = Math.max(0, currentAbs - releaseAbs);

      let project = ensureReleaseScores(project0, rel.week, rel.year);

      const hasExistingTotal = typeof project.metrics?.boxOfficeTotal === 'number' && project.metrics.boxOfficeTotal > 0;
      const prevWeeks = typeof project.metrics?.weeksSinceRelease === 'number' ? project.metrics.weeksSinceRelease : null;

      // Migration safety: if a save already has totals but not week counters, assume it has been simulated up to now.
      const migratedPrevWeeks = prevWeeks == null && hasExistingTotal ? expectedWeeksSinceRelease : prevWeeks;

      // If already processed for this week index, just ensure the counter exists.
      if (migratedPrevWeeks != null && migratedPrevWeeks >= expectedWeeksSinceRelease) {
        if (prevWeeks == null && migratedPrevWeeks != null) {
          project = {
            ...project,
            metrics: {
              ...(project.metrics || {}),
              weeksSinceRelease: migratedPrevWeeks,
            },
          };
          updatedById.set(project.id, project);
        }
        continue;
      }

      const theaterCount = calculateTheaterCount(project, expectedWeeksSinceRelease);
      const studio = project.studioName || state.studio.name;

      // Opening week: set baseline if missing.
      if (expectedWeeksSinceRelease === 0) {
        const opening = calculateWeeklyRevenue(project, 0);
        const total = hasExistingTotal ? (project.metrics.boxOfficeTotal as number) : opening;
        const weeklyRevenue = typeof project.metrics?.lastWeeklyRevenue === 'number' ? project.metrics.lastWeeklyRevenue : opening;

        project = {
          ...project,
          releaseWeek: rel.week,
          releaseYear: rel.year,
          metrics: {
            ...(project.metrics || {}),
            inTheaters: true,
            theatricalRunLocked: false,
            theaterCount: getInitialTheaterCount(project),
            boxOfficeStatus: 'Opening',
            boxOfficeTotal: total,
            weeksSinceRelease: 0,
            lastWeeklyRevenue: weeklyRevenue,
          },
        };

        weeklyReleases.push({
          projectId: project.id,
          title: project.title,
          studio,
          weeklyRevenue,
          totalRevenue: total,
          theaters: getInitialTheaterCount(project),
          weekInRelease: 1,
        });

        updatedById.set(project.id, project);
        continue;
      }

      // If the release week was processed outside the engine (legacy/UI path), backfill the opening entry once.
      if (expectedWeeksSinceRelease > 0 && !hasLoggedOpeningWeek(project.id, rel.week, rel.year)) {
        const opening = calculateWeeklyRevenue(project, 0);
        historyPatches.push({
          week: rel.week,
          year: rel.year,
          releases: [
            {
              projectId: project.id,
              title: project.title,
              studio,
              weeklyRevenue: opening,
              totalRevenue: opening,
              theaters: getInitialTheaterCount(project),
              weekInRelease: 1,
            },
          ],
        });
      }

      // Post-opening weeks.
      const locked = project.metrics?.theatricalRunLocked === true;
      if (locked) {
        updatedById.set(project.id, {
          ...project,
          metrics: {
            ...(project.metrics || {}),
            weeksSinceRelease: expectedWeeksSinceRelease,
          },
        });
        continue;
      }

      // If the run should end now, lock it (no revenue for this week).
      if (shouldExitTheatersPermanently(project, expectedWeeksSinceRelease)) {
        project = {
          ...project,
          metrics: {
            ...(project.metrics || {}),
            inTheaters: false,
            theaterCount: 0,
            boxOfficeStatus: 'Ended',
            theatricalRunLocked: true,
            weeksSinceRelease: expectedWeeksSinceRelease,
          },
          postTheatricalEligible: true,
          theatricalEndDate: triggerDateFromWeekYear(ctx.year, ctx.week),
        };

        updatedById.set(project.id, project);
        continue;
      }

      const weeklyRevenue = calculateWeeklyRevenue(project, expectedWeeksSinceRelease);
      const prevTotal = typeof project.metrics?.boxOfficeTotal === 'number' ? project.metrics.boxOfficeTotal : 0;
      const total = prevTotal + weeklyRevenue;

      project = {
        ...project,
        metrics: {
          ...(project.metrics || {}),
          inTheaters: true,
          theaterCount,
          boxOfficeStatus: theaterCount === 0 ? 'Ended' : 'Limited Release',
          boxOfficeTotal: total,
          weeksSinceRelease: expectedWeeksSinceRelease,
          lastWeeklyRevenue: weeklyRevenue,
        },
      };

      weeklyReleases.push({
        projectId: project.id,
        title: project.title,
        studio,
        weeklyRevenue,
        totalRevenue: total,
        theaters: theaterCount,
        weekInRelease: expectedWeeksSinceRelease + 1,
      });

      updatedById.set(project.id, project);
    }

    if (updatedById.size === 0 && weeklyReleases.length === 0 && historyPatches.length === 0) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    const nextProjects = (state.projects || []).map(patch) as Project[];
    const nextAiStudioProjects = (state.aiStudioProjects || []).map(patch) as Project[];
    const nextAllReleases = (state.allReleases || []).map(patch) as Array<Project | any>;

    let nextBoxOfficeHistory = state.boxOfficeHistory || [];
    for (const p of historyPatches) {
      nextBoxOfficeHistory = mergeBoxOfficeWeek(nextBoxOfficeHistory, p.week, p.year, p.releases);
    }
    nextBoxOfficeHistory = mergeBoxOfficeWeek(nextBoxOfficeHistory, ctx.week, ctx.year, weeklyReleases);

    let nextTopFilmsHistory = state.topFilmsHistory || [];
    for (const p of historyPatches) {
      const entry = nextBoxOfficeHistory.find((w) => w.week === p.week && w.year === p.year);
      if (entry) nextTopFilmsHistory = mergeTopFilmsWeek(nextTopFilmsHistory, p.week, p.year, entry);
    }
    const currentBoxOfficeWeek = nextBoxOfficeHistory.find((w) => w.week === ctx.week && w.year === ctx.year);
    if (currentBoxOfficeWeek) {
      nextTopFilmsHistory = mergeTopFilmsWeek(nextTopFilmsHistory, ctx.week, ctx.year, currentBoxOfficeWeek);
    }

    return {
      ...state,
      projects: nextProjects,
      aiStudioProjects: nextAiStudioProjects,
      allReleases: nextAllReleases,
      boxOfficeHistory: nextBoxOfficeHistory,
      topFilmsHistory: nextTopFilmsHistory,
    } as GameState;
  },
};
