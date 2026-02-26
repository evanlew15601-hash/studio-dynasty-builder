import type { GameState, Project } from '@/types/game';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';

function normalizeProject(project: Project, base: GameState): Project {
  return {
    ...project,
    script: finalizeScriptForSave(project.script, base),
  };
}

function normalizeAllReleases(allReleases: GameState['allReleases'], base: GameState): GameState['allReleases'] {
  return (allReleases || []).map(item => {
    if (item && typeof item === 'object' && 'script' in item && (item as any).script) {
      return normalizeProject(item as Project, base);
    }
    return item;
  });
}

/**
 * Normalize a loaded/saved GameState to the current in-memory shape.
 *
 * This is intentionally opinionated:
 * - ensures arrays exist (franchises, publicDomainIPs, aiStudioProjects)
 * - runs finalizeScriptForSave on all scripts and any project.script instances
 */
export function normalizeGameStateForLoad(raw: GameState): GameState {
  const base: GameState = {
    ...raw,
    franchises: (raw as any).franchises ?? [],
    publicDomainIPs: (raw as any).publicDomainIPs ?? (raw as any).publicDomainSources ?? [],
    scripts: (raw as any).scripts ?? [],
    projects: (raw as any).projects ?? [],
    competitorStudios: (raw as any).competitorStudios ?? [],
    allReleases: (raw as any).allReleases ?? [],
    topFilmsHistory: (raw as any).topFilmsHistory ?? [],
    boxOfficeHistory: (raw as any).boxOfficeHistory ?? [],
    awardsCalendar: (raw as any).awardsCalendar ?? [],
    industryTrends: (raw as any).industryTrends ?? [],
    eventQueue: (raw as any).eventQueue ?? [],
    aiStudioProjects: (raw as any).aiStudioProjects ?? [],
  };

  const scripts = (base.scripts || []).map(s => finalizeScriptForSave(s, base));
  const projects = (base.projects || []).map(p => normalizeProject(p, base));
  const aiStudioProjects = (base.aiStudioProjects || []).map(p => normalizeProject(p, base));
  const allReleases = normalizeAllReleases(base.allReleases, base);

  return {
    ...base,
    scripts,
    projects,
    aiStudioProjects,
    allReleases,
  };
}

export const normalizeGameStateForSave = normalizeGameStateForLoad;
