import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameState, Project } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';
import type { SeasonData } from '@/types/streamingTypes';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(clamp(n, min, max));
}

type OriginalPhase = 'development' | 'production' | 'post-production';

type SeasonProductionStatus = 'planning' | 'filming' | 'post-production' | 'complete';

function seasonStatusForPhase(phase: OriginalPhase): SeasonProductionStatus {
  switch (phase) {
    case 'development':
      return 'planning';
    case 'production':
      return 'filming';
    case 'post-production':
      return 'post-production';
  }
}

function defaultPhaseWeeks(phase: OriginalPhase): number {
  switch (phase) {
    case 'development':
      return 8;
    case 'production':
      return 12;
    case 'post-production':
      return 6;
  }
}

function nextPhase(phase: OriginalPhase): OriginalPhase | null {
  switch (phase) {
    case 'development':
      return 'production';
    case 'production':
      return 'post-production';
    case 'post-production':
      return null;
  }
}

function isStreamingWarsOriginal(project: Project, playerPlatformId: string): boolean {
  if (!project?.id?.startsWith('project:original:')) return false;
  const pid = project.streamingContract?.platformId || (project.streamingContract as any)?.platform;
  return pid === playerPlatformId;
}

function normalizePhase(project: Project): OriginalPhase | null {
  const phase = project.currentPhase;
  if (phase === 'development' || phase === 'production' || phase === 'post-production') return phase;

  // Old/legacy shapes sometimes use status as the phase.
  const status = project.status;
  if (status === 'development' || status === 'production' || status === 'post-production') return status;

  return null;
}

export const PlatformOriginalsPipelineSystem: TickSystem = {
  id: 'platformOriginalsPipeline',
  label: 'Platform Originals pipeline (Streaming Wars)',
  dependsOn: ['platformMarketBootstrap'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const playerPlatformId = market?.player?.id;
    if (!playerPlatformId) return state;

    const projectsIn = (state.projects ?? []) as Project[];
    if (projectsIn.length === 0) return state;

    let changed = false;

    const updatedById = new Map<string, Project>();

    const projectsOut: Project[] = projectsIn.map((p): Project => {
      if (!isStreamingWarsOriginal(p, playerPlatformId)) return p;
      if (p.status === 'released' || p.status === 'archived') return p;

      const phase = normalizePhase(p);
      if (!phase) return p;

      const baseDuration = defaultPhaseWeeks(phase);
      const prevRemainingRaw = typeof p.phaseDuration === 'number' ? p.phaseDuration : baseDuration;
      const prevRemaining = prevRemainingRaw > 0 ? Math.floor(prevRemainingRaw) : baseDuration;

      const nextRemaining = Math.max(0, prevRemaining - 1);

      const seasonsIn = Array.isArray(p.seasons) ? (p.seasons as SeasonData[]) : null;

      if (nextRemaining > 0) {
        if (nextRemaining !== prevRemaining) changed = true;

        const seasonsOut = seasonsIn && seasonsIn.length > 0
          ? [
              {
                ...seasonsIn[0],
                productionStatus: seasonStatusForPhase(phase),
              },
              ...seasonsIn.slice(1),
            ]
          : seasonsIn;

        const out: Project = {
          ...p,
          currentPhase: phase,
          status: phase,
          phaseDuration: nextRemaining,
          ...(seasonsOut ? { seasons: seasonsOut } : {}),
        };

        if (out !== p) updatedById.set(p.id, out);

        return out;
      }

      const phaseAfter = nextPhase(phase);

      if (phaseAfter) {
        changed = true;

        const seasonsOut = seasonsIn && seasonsIn.length > 0
          ? [
              {
                ...seasonsIn[0],
                productionStatus: seasonStatusForPhase(phaseAfter),
              },
              ...seasonsIn.slice(1),
            ]
          : seasonsIn;

        const out: Project = {
          ...p,
          currentPhase: phaseAfter,
          status: phaseAfter,
          phaseDuration: defaultPhaseWeeks(phaseAfter),
          ...(seasonsOut ? { seasons: seasonsOut } : {}),
        };

        if (out !== p) updatedById.set(p.id, out);

        return out;
      }

      // Release.
      changed = true;
      const quality = p.script?.quality ?? 60;
      const criticsScore = clampInt(quality + ctx.rng.nextFloat(-10, 8), 20, 98);
      const audienceScore = clampInt(quality + ctx.rng.nextFloat(-8, 12), 20, 99);

      ctx.recap.push({
        type: 'release',
        title: 'Original premiered',
        body: `"${p.title}" premiered on ${market?.player?.name ?? 'your platform'}.`,
        severity: 'good',
        relatedIds: {
          projectId: p.id,
        },
      });

      const seasonsOut: SeasonData[] | null = seasonsIn && seasonsIn.length > 0
        ? (() => {
            const season0: SeasonData = {
              ...seasonsIn[0],
              productionStatus: 'complete',
              airingStatus: 'airing',
              premiereDate: seasonsIn[0]?.premiereDate ?? { week: ctx.week, year: ctx.year },
            };

            return [season0, ...seasonsIn.slice(1)];
          })()
        : seasonsIn;

      const out: Project = {
        ...p,
        status: 'released',
        currentPhase: 'distribution',
        phaseDuration: 0,
        releaseWeek: ctx.week,
        releaseYear: ctx.year,
        ...(seasonsOut ? { seasons: seasonsOut } : {}),
        metrics: {
          ...(p.metrics ?? {}),
          criticsScore,
          audienceScore,
        },
      };

      if (out !== p) updatedById.set(p.id, out);

      return out;
    });

    if (!changed) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...(state as GameState),
      projects: projectsOut,
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };
  },
};
