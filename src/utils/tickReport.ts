import type { GameState, Project } from '@/types/game';
import type { TickRecapCard, TickReport, TickSystemReport } from '@/types/tickReport';

function isProjectReleased(p: Project): boolean {
  return p.status === 'released' || p.status === ('distribution' as any) || p.status === ('archived' as any);
}

function countAwards(state: GameState): number {
  const studioAwards = state.studio.awards?.length ?? 0;
  const talentAwards = (state.talent || []).reduce((sum, t) => sum + ((t as any).awards?.length ?? 0), 0);
  return studioAwards + talentAwards;
}

function newlyReleasedProjects(prev: GameState, next: GameState): Project[] {
  const prevById = new Map(prev.projects.map((p) => [p.id, p] as const));
  const released: Project[] = [];

  for (const p of next.projects) {
    const before = prevById.get(p.id);
    if (!before) continue;
    if (!isProjectReleased(before) && isProjectReleased(p)) {
      released.push(p);
    }
  }

  // AI releases: detect newly added releases by id (best-effort)
  const prevIds = new Set(prev.allReleases?.map((r: any) => r?.id).filter(Boolean));
  const nextAi = (next.allReleases || []).filter((r: any) => r && r.id && !prevIds.has(r.id));
  const nextAiProjects = nextAi.filter((r: any): r is Project => 'script' in r) as Project[];

  return [...released, ...nextAiProjects.filter(isProjectReleased)];
}

export function createTickReport(params: {
  prev: GameState;
  next: GameState;
  systems: TickSystemReport[];
  recap: TickRecapCard[];
  startedAtIso: string;
  finishedAtIso: string;
  totalMs: number;
}): TickReport {
  const { prev, next, systems, recap, startedAtIso, finishedAtIso, totalMs } = params;

  const budgetDelta = (next.studio.budget ?? 0) - (prev.studio.budget ?? 0);
  const reputationDelta = (next.studio.reputation ?? 0) - (prev.studio.reputation ?? 0);

  const releases = newlyReleasedProjects(prev, next);
  const awardsWon = Math.max(0, countAwards(next) - countAwards(prev));

  return {
    week: next.currentWeek,
    year: next.currentYear,
    startedAtIso,
    finishedAtIso,
    totalMs,
    systems,
    recap: recap.length
      ? recap
      : [
          {
            type: 'system',
            title: 'Week advanced',
            body: `Simulation progressed to Week ${next.currentWeek}, ${next.currentYear}.`,
            severity: 'info',
          },
        ],
    summary: {
      budgetDelta,
      reputationDelta,
      newReleases: releases.length,
      awardsWon,
    },
  };
}
