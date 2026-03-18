import type {
  DistributionChannel,
  PostTheatricalRelease,
  Project,
  ReleaseStrategy,
  ReleaseWindow,
} from '@/types/game';
import type { StreamingContract } from '@/types/streamingTypes';

export function getContractPlatformId(contract: StreamingContract | null | undefined): string | null {
  if (!contract) return null;
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

export function getPlatformIdForProject(project: Project): string | null {
  return (
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]) ||
    getPostTheatricalPlatformId(project.postTheatricalReleases?.[0]) ||
    null
  );
}
