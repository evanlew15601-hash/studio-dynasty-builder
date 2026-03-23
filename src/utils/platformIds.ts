import type {
  DistributionChannel,
  PostTheatricalRelease,
  Project,
  ReleaseStrategy,
  ReleaseWindow,
} from '@/types/game';
import type { StreamingContract } from '@/types/streamingTypes';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

export function isPlayerPlatformId(platformId: string | null | undefined): boolean {
  return typeof platformId === 'string' && platformId.startsWith('player-platform:');
}

export function getContractPlatformId(contract: StreamingContract | null | undefined): string | null {
  if (!contract) return null;

  const persistentRights = (contract as any).persistentRights === true;
  const status = (contract as any).status as string | undefined;

  // Non-persistent contracts (licensing windows) should stop implying a platform once they end.
  if (!persistentRights && status && status !== 'active') return null;

  return contract.platformId || contract.platform || null;
}

export function getReleaseStrategyPlatformId(strategy: ReleaseStrategy | null | undefined): string | null {
  if (!strategy) return null;
  return strategy.streamingPlatformId || strategy.streamingProviderId || null;
}

export function getDistributionChannelPlatformId(channel: DistributionChannel | null | undefined): string | null {
  if (!channel) return null;
  return channel.platformId || null;
}

export function getReleaseWindowPlatformId(window: ReleaseWindow | null | undefined): string | null {
  if (!window) return null;
  return window.platformId || null;
}

export function getPostTheatricalPlatformId(release: PostTheatricalRelease | null | undefined): string | null {
  if (!release) return null;
  return release.platformId || release.providerId || null;
}

function isPostTheatricalAvailableAtTime(
  release: PostTheatricalRelease,
  currentWeek: number,
  currentYear: number
): boolean {
  if (release.status === 'active' || release.status === 'declining') return true;

  if (release.status === 'ended') {
    const id = getPostTheatricalPlatformId(release);
    return isPlayerPlatformId(id);
  }

  if (release.status !== 'planned') return false;

  if (typeof release.releaseWeek === 'number' && typeof release.releaseYear === 'number') {
    return absWeek(release.releaseWeek, release.releaseYear) <= absWeek(currentWeek, currentYear);
  }

  return false;
}

export function getActivePostTheatricalReleaseForPlatformAtTime(
  project: Project,
  platformId: string,
  currentWeek: number,
  currentYear: number
): PostTheatricalRelease | null {
  const post = project.postTheatricalReleases ?? [];

  const streaming = post
    .filter((r) => r && r.platform === 'streaming')
    .filter((r) => getPostTheatricalPlatformId(r) === platformId)
    .filter((r) => isPostTheatricalAvailableAtTime(r, currentWeek, currentYear))
    .sort((a, b) => (absWeek(b.releaseWeek ?? 0, b.releaseYear ?? 0) - absWeek(a.releaseWeek ?? 0, a.releaseYear ?? 0)));

  return streaming[0] ?? null;
}

export function getPlatformIdForProject(project: Project): string | null {
  const direct =
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]);

  if (direct) return direct;

  const post = project.postTheatricalReleases ?? [];
  const streaming = post.find((r) => r && r.platform === 'streaming' && (r.platformId || r.providerId));
  if (streaming) return getPostTheatricalPlatformId(streaming);

  const any = post.find((r) => r && (r.platformId || r.providerId));
  if (any) return getPostTheatricalPlatformId(any);

  return null;
}

export function getPlatformIdForProjectAtTime(project: Project, currentWeek: number, currentYear: number): string | null {
  if (project.status !== 'released') return null;

  const curAbs = absWeek(currentWeek, currentYear);

  if (typeof project.releaseWeek === 'number' && typeof project.releaseYear === 'number') {
    if (absWeek(project.releaseWeek, project.releaseYear) > curAbs) return null;
  }

  const direct =
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]);

  if (direct) return direct;

  const post = project.postTheatricalReleases ?? [];

  const streaming = post
    .filter((r) => r && r.platform === 'streaming' && (r.platformId || r.providerId))
    .filter((r) => isPostTheatricalAvailableAtTime(r, currentWeek, currentYear))
    .sort((a, b) => (absWeek(b.releaseWeek ?? 0, b.releaseYear ?? 0) - absWeek(a.releaseWeek ?? 0, a.releaseYear ?? 0)));

  if (streaming[0]) return getPostTheatricalPlatformId(streaming[0]);

  const any = post
    .filter((r) => r && (r.platformId || r.providerId))
    .filter((r) => isPostTheatricalAvailableAtTime(r, currentWeek, currentYear))
    .sort((a, b) => (absWeek(b.releaseWeek ?? 0, b.releaseYear ?? 0) - absWeek(a.releaseWeek ?? 0, a.releaseYear ?? 0)));

  if (any[0]) return getPostTheatricalPlatformId(any[0]);

  return null;
}

export function isProjectOnPlatformAtTime(
  project: Project,
  platformId: string,
  currentWeek: number,
  currentYear: number
): boolean {
  if (project.status !== 'released') return false;

  const curAbs = absWeek(currentWeek, currentYear);

  if (typeof project.releaseWeek === 'number' && typeof project.releaseYear === 'number') {
    if (absWeek(project.releaseWeek, project.releaseYear) > curAbs) return false;
  }

  const direct =
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]);

  if (direct === platformId) return true;

  const postRelease = getActivePostTheatricalReleaseForPlatformAtTime(project, platformId, currentWeek, currentYear);
  return !!postRelease;
}
