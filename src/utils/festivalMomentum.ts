import type { Project } from '@/types/game';

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function isFestivalPremiered(project: Project): boolean {
  if (project.metrics?.festivalPremiered === true) return true;
  if (typeof project.metrics?.expandedFromFestivalAbs === 'number') return true;
  if (project.releaseStrategy?.type === 'festival') return true;

  const status = String(project.metrics?.boxOfficeStatus ?? '');
  if (/festival/i.test(status)) return true;

  return false;
}

export function getFestivalCriticsBonus(project: Project): number {
  // Only applies when the *release strategy* is festival at premiere.
  if (project.releaseStrategy?.type !== 'festival') return 0;

  const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;
  const shaped = 4 + Math.round((criticalPotential - 5) * 1.5);
  return Math.max(2, Math.min(8, shaped));
}

export function getFestivalMaxRunWeeks(avgScore: number): number {
  return avgScore >= 80 ? 10 : avgScore >= 65 ? 8 : 6;
}

export function hasFestivalMarketing(project: Project): boolean {
  if (project.marketingCampaign?.strategy?.type === 'festival') return true;
  return (project.marketingCampaign?.activities || []).some((a) => /festival/i.test(String(a?.name ?? '')));
}

export function getFestivalAwardsProbabilityBonus(project: Project): number {
  if (isFestivalPremiered(project)) return 6;
  if (hasFestivalMarketing(project)) return 2;
  return 0;
}

export function getFestivalPostTheatricalShiftWeeks(params: {
  project: Project;
  platform: string;
}): number {
  const { project, platform } = params;
  if (!isFestivalPremiered(project)) return 0;
  if (platform === 'tv-licensing') return 0;
  return 4;
}

export function shouldShowPlatformExpansionStatus(params: {
  project: Project;
  currentAbsWeek: number;
}): boolean {
  const { project, currentAbsWeek } = params;

  if (project.releaseStrategy?.type !== 'platform') return false;
  if (!isFestivalPremiered(project)) return false;

  const expandedAtAbs = project.metrics?.expandedFromFestivalAbs;
  if (typeof expandedAtAbs !== 'number') return false;

  return currentAbsWeek - expandedAtAbs <= 1;
}
