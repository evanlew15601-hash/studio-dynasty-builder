import type { PlatformMarketState } from '@/types/platformEconomy';
import type { Project } from '@/types/game';
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

    const projectsOut = projectsIn.map((p) => {
      if (!p) return p;
      if (!isStreamingWarsOriginal(p, playerPlatformId)) return p;
      if (p.status === 'released' || p.status === 'archived') return p;

      const phase = normalizePhase(p);
      if (!phase) return p;

      const baseDuration = defaultPhaseWeeks(phase);
      const prevRemainingRaw = typeof p.phaseDuration === 'number' ? p.phaseDuration : baseDuration;
      const prevRemaining = prevRemainingRaw > 0 ? Math.floor(prevRemainingRaw) : baseDuration;

      const nextRemaining = Math.max(0, prevRemaining - 1);

      if (nextRemaining > 0) {
        if (nextRemaining !== prevRemaining) changed = true;

        const seasons = Array.isArray((p as any).seasons) ? ((p as any).seasons as any[]) : null;
        const nextSeasons = seasons && seasons.length > 0
          ? [
              {
                ...seasons[0],
                productionStatus: seasonStatusForPhase(phase),
              },
              ...seasons.slice(1),
            ]
          : seasons;

        return {
          ...p,
          currentPhase: phase,
          status: phase,
          phaseDuration: nextRemaining,
          ...(nextSeasons ? { seasons: nextSeasons as any } : {}),
        };
      }

      const phaseAfter = nextPhase(phase);

      if (phaseAfter) {
        changed = true;

        const seasons = Array.isArray((p as any).seasons) ? ((p as any).seasons as any[]) : null;
        const nextSeasons = seasons && seasons.length > 0
          ? [
              {
                ...seasons[0],
                productionStatus: seasonStatusForPhase(phaseAfter),
              },
              ...seasons.slice(1),
            ]
          : seasons;

        return {
          ...p,
          currentPhase: phaseAfter,
          status: phaseAfter,
          phaseDuration: defaultPhaseWeeks(phaseAfter),
          ...(nextSeasons ? { seasons: nextSeasons as any } : {}),
        };
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

      const seasons = Array.isArray((p as any).seasons) ? ((p as any).seasons as any[]) : null;
      const nextSeasons = seasons && seasons.length > 0
        ? [
            {
              ...seasons[0],
              productionStatus: 'complete',
              airingStatus: 'airing',
              premiereDate: seasons[0]?.premiereDate ?? { week: ctx.week, year: ctx.year },
            },
            ...seasons.slice(1),
          ]
        : seasons;

      return {
        ...p,
        status: 'released',
        currentPhase: 'distribution',
        phaseDuration: 0,
        releaseWeek: ctx.week,
        releaseYear: ctx.year,
        ...(nextSeasons ? { seasons: nextSeasons as any } : {}),
        metrics: {
          ...(p.metrics ?? {}),
          criticsScore,
          audienceScore,
        },
      };
    });

    if (!changed) return state;

    return {
      ...state,
      projects: projectsOut,
    };
  },
};
