/**
 * Save-game migrations — upgrade old snapshots to current schema.
 *
 * Each migration is a function that takes a raw snapshot and returns
 * an upgraded version. Migrations are applied in order.
 */

import { CURRENT_SAVE_VERSION } from '@/utils/saveVersion';
import type { SaveGameSnapshot } from '@/utils/saveLoad';

export type MigrationFn = (snapshot: SaveGameSnapshot) => SaveGameSnapshot;

interface MigrationEntry {
  /** Version string this migration upgrades FROM */
  from: string;
  /** Version string this migration upgrades TO */
  to: string;
  /** Migration function */
  migrate: MigrationFn;
}

const CURRENT_VERSION = CURRENT_SAVE_VERSION;

const migrations: MigrationEntry[] = [
  {
    from: 'alpha-0',
    to: 'alpha-1',
    migrate: (snapshot) => {
      return {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          projects: snapshot.gameState.projects ?? [],
          talent: snapshot.gameState.talent ?? [],
          scripts: snapshot.gameState.scripts ?? [],
          competitorStudios: snapshot.gameState.competitorStudios ?? [],
          franchises: snapshot.gameState.franchises ?? [],
          publicDomainIPs: snapshot.gameState.publicDomainIPs ?? [],
          aiStudioProjects: snapshot.gameState.aiStudioProjects ?? [],
          aiStudioState: snapshot.gameState.aiStudioState ?? { aiFilms: [], talentCommitments: [], nextFilmId: 1 },
          mediaState:
            snapshot.gameState.mediaState ??
            {
              engine: { history: [], memories: [], eventQueue: [] },
              response: { campaigns: [], reactions: [], nextCampaignId: 1 },
            },
        } as any,
        meta: {
          ...snapshot.meta,
          version: 'alpha-1',
        },
      };
    },
  },
  {
    from: 'alpha-1',
    to: 'alpha-2',
    migrate: (snapshot) => {
      return {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          worldHistory: snapshot.gameState.worldHistory ?? [],
          worldYearbooks: snapshot.gameState.worldYearbooks ?? [],
          playerLegacy: snapshot.gameState.playerLegacy ?? undefined,
        } as any,
        meta: {
          ...snapshot.meta,
          version: 'alpha-2',
        },
      };
    },
  },
  {
    from: 'alpha-2',
    to: 'alpha-3',
    migrate: (snapshot) => {
      const projects = (snapshot.gameState.projects ?? []).map((project: any) => {
        const contract = project.streamingContract;
        const streamingContract = contract
          ? {
              ...contract,
              platformId: contract.platformId ?? contract.platform ?? 'unknown',
            }
          : undefined;

        const dist = project.distributionStrategy;
        const distributionStrategy = dist
          ? {
              ...dist,
              primary: dist.primary
                ? {
                    ...dist.primary,
                    platformId: dist.primary.platformId ?? undefined,
                  }
                : dist.primary,
              international: (dist.international ?? []).map((c: any) => ({
                ...c,
                platformId: c.platformId ?? undefined,
              })),
              windows: (dist.windows ?? []).map((w: any) => ({
                ...w,
                platformId: w.platformId ?? undefined,
              })),
            }
          : dist;

        const rel = project.releaseStrategy;
        const releaseStrategy = rel
          ? {
              ...rel,
              streamingPlatformId: rel.streamingPlatformId ?? undefined,
              streamingExclusive: rel.streamingExclusive ?? undefined,
              streamingExclusivityWeeks: rel.streamingExclusivityWeeks ?? undefined,
            }
          : rel;

        const postTheatricalReleases = project.postTheatricalReleases
          ? project.postTheatricalReleases.map((r: any) => ({
              ...r,
              platformId: r.platformId ?? undefined,
            }))
          : project.postTheatricalReleases;

        return {
          ...project,
          streamingContract,
          distributionStrategy,
          releaseStrategy,
          postTheatricalReleases,
        };
      });

      const rawGameState = snapshot.gameState as any;

      const legacyExpansionFlag = rawGameState?.expansions?.enableStreamingWars;

      const rawStreamingWars = rawGameState?.dlc?.streamingWars;
      const normalizedFromDlc =
        typeof rawStreamingWars === 'boolean'
          ? rawStreamingWars
          : rawStreamingWars && typeof rawStreamingWars === 'object' && 'enabled' in rawStreamingWars
            ? Boolean((rawStreamingWars as any).enabled)
            : undefined;

      const streamingWars =
        typeof normalizedFromDlc === 'boolean'
          ? normalizedFromDlc
          : typeof legacyExpansionFlag === 'boolean'
            ? legacyExpansionFlag
            : undefined;

      const dlc = typeof streamingWars === 'boolean' ? { streamingWars } : undefined;

      const { expansions: _expansions, dlc: _legacyDlc, ...restGameState } = rawGameState;

      return {
        ...snapshot,
        gameState: {
          ...restGameState,
          dlc,
          platformMarket: rawGameState.platformMarket ?? undefined,
          projects,
        } as any,
        meta: {
          ...snapshot.meta,
          version: 'alpha-3',
        },
      };
    },
  },
];

/**
 * Apply all necessary migrations to bring a snapshot up to the current version.
 * Returns the migrated snapshot (or the original if already current).
 */
export function migrateSnapshot(snapshot: SaveGameSnapshot): SaveGameSnapshot {
  let current = snapshot;
  let version = current.meta?.version ?? 'alpha-0';

  const maxIterations = migrations.length + 1; // safety
  let iterations = 0;

  while (version !== CURRENT_VERSION && iterations < maxIterations) {
    const migration = migrations.find((m) => m.from === version);
    if (!migration) {
      // No migration path — assume compatible or unknown old version
      console.warn(`No migration from version "${version}" to "${CURRENT_VERSION}". Loading as-is.`);
      break;
    }

    current = migration.migrate(current);
    version = migration.to;
    iterations++;
  }

  return current;
}

/**
 * Validate a snapshot has the minimum required shape.
 * Returns null if invalid, the snapshot if valid.
 */
export function validateSnapshot(raw: unknown): SaveGameSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<SaveGameSnapshot>;

  if (!candidate.gameState || typeof candidate.gameState !== 'object') return null;
  if (!candidate.meta || typeof candidate.meta !== 'object') return null;

  // Check critical GameState fields
  const gs = candidate.gameState as any;
  if (!gs.studio || typeof gs.studio !== 'object') return null;
  if (typeof gs.currentWeek !== 'number') return null;
  if (typeof gs.currentYear !== 'number') return null;

  return candidate as SaveGameSnapshot;
}

export { CURRENT_VERSION };
