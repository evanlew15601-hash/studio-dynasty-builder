import type { Project } from '@/types/game';
import { isPrimaryStreamingFilm, isTvProject } from '@/utils/projectMedium';

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

export function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

export function getReleaseAbs(project: Project): number | null {
  const week =
    typeof project.releaseWeek === 'number'
      ? project.releaseWeek
      : typeof project.scheduledReleaseWeek === 'number'
        ? project.scheduledReleaseWeek
        : null;

  const year =
    typeof project.releaseYear === 'number'
      ? project.releaseYear
      : typeof project.scheduledReleaseYear === 'number'
        ? project.scheduledReleaseYear
        : null;

  if (week == null || year == null) return null;
  return absWeek(week, year);
}

export function absWeekFromDateLike(value: unknown): number | null {
  if (!value) return null;

  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const days = Math.floor((date.getTime() - jan1) / (24 * 60 * 60 * 1000));
  const week = clampInt(1 + Math.floor(days / 7), 1, 52);

  return absWeek(week, year);
}

export function getTheatricalEndAbs(project: Project, currentAbs: number): number | null {
  const releaseAbs = getReleaseAbs(project);
  if (releaseAbs == null) return null;

  if (isTvProject(project)) return null;

  // Streaming-first films treat the premiere as the "end" for unlocking downstream windows.
  if (isPrimaryStreamingFilm(project)) return releaseAbs;

  const endAbsFromDate = absWeekFromDateLike(project.theatricalEndDate);
  if (endAbsFromDate != null) return endAbsFromDate;

  const age = Math.max(0, currentAbs - releaseAbs);

  const boxOfficeStatus = String(project.metrics?.boxOfficeStatus ?? '');

  const explicitEndedSignal =
    project.metrics?.theatricalRunLocked === true ||
    project.metrics?.inTheaters === false ||
    project.metrics?.theaterCount === 0 ||
    /ended/i.test(boxOfficeStatus);

  const endedFlag = explicitEndedSignal ||
    // Legacy/UI flows sometimes stop tracking inTheaters without writing theatricalEndDate.
    (project.metrics?.inTheaters !== true && age >= 12);

  if (!endedFlag) return null;

  // Legacy saves sometimes omit theatricalEndDate. Prefer a conservative "typical" run length,
  // but cap hard at 20 weeks to match the engine.
  const runWeeks = explicitEndedSignal ? Math.min(20, age) : 12;

  return releaseAbs + runWeeks;
}

export function getWeeksSinceTheatricalEnd(project: Project, currentAbs: number): number {
  const endAbs = getTheatricalEndAbs(project, currentAbs);
  if (endAbs == null) return 0;
  return Math.max(0, currentAbs - endAbs);
}

export function isPostTheatricalEligibleProject(project: Project, currentAbs: number): boolean {
  if (!project) return false;
  if (isTvProject(project)) return false;

  const status = project.status;
  const isReleasedLike =
    status === 'released' || status === 'distribution' || status === 'archived' || status === 'completed';
  if (!isReleasedLike) return false;

  const releaseAbs = getReleaseAbs(project);
  if (releaseAbs == null) return false;
  if (currentAbs < releaseAbs) return false;

  if (isPrimaryStreamingFilm(project)) return true;

  const endAbs = getTheatricalEndAbs(project, currentAbs);
  return endAbs != null && currentAbs >= endAbs;
}
