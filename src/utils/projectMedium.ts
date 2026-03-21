import type { Project } from '@/types/game';

export function isTvProject(project: Project): boolean {
  const kind = (project.type as any) as string;
  return kind === 'series' || kind === 'limited-series';
}

/**
 * A "primary streaming film" is a feature/documentary project whose main release is direct-to-streaming.
 *
 * Note: older saves/mods may omit releaseStrategy while still having distributionStrategy.primary.type="streaming".
 */
export function isPrimaryStreamingFilm(project: Project): boolean {
  if (isTvProject(project)) return false;

  if (project.releaseStrategy?.type === 'streaming') return true;

  // Some saves store streaming premieres via a deal object.
  if (project.streamingPremiereDeal?.providerId) return true;

  // Compatibility: treat projects whose primary distribution channel is streaming as streaming premieres.
  const primaryType = project.distributionStrategy?.primary?.type;
  if (primaryType === 'streaming') return true;

  return false;
}

export function isTheatricalFilm(project: Project): boolean {
  return !isTvProject(project) && !isPrimaryStreamingFilm(project);
}
