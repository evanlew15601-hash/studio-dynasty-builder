import type { GameState, Project, TalentPerson } from '@/types/game';

function isProjectActiveForAttachments(project: Project): boolean {
  return project.status !== 'released' && project.status !== 'archived';
}

function hasActiveContract(project: Project, talentId: string): boolean {
  return (project.contractedTalent || []).some((ct: any) => {
    if (!ct || ct.talentId !== talentId) return false;
    const remaining = typeof ct.weeksRemaining === 'number' ? ct.weeksRemaining : 1;
    return remaining > 0;
  });
}

function isTalentBusy(state: GameState, talent: TalentPerson): boolean {
  const absWeek = (state.currentYear * 52) + state.currentWeek;

  if (typeof talent.busyUntilWeek === 'number') {
    if (talent.busyUntilWeek > absWeek) return true;
  }

  return talent.contractStatus === 'busy';
}

function isTalentAttachedToProject(state: GameState, talentId: string, projectId: string): boolean {
  const project = (state.projects || []).find((p) => p.id === projectId);
  if (!project) return false;

  if (hasActiveContract(project, talentId)) return true;
  if ((project.cast || []).some((c: any) => c?.talentId === talentId)) return true;
  if ((project.crew || []).some((c: any) => c?.talentId === talentId)) return true;

  const chars = project.script?.characters || [];
  return chars.some((c: any) => c?.assignedTalentId === talentId);
}

export function isTalentTaken(
  state: GameState,
  talentId: string,
  options?: { excludeProjectId?: string }
): boolean {
  const excludeProjectId = options?.excludeProjectId;

  for (const project of state.projects || []) {
    if (!project) continue;
    if (excludeProjectId && project.id === excludeProjectId) continue;

    if (hasActiveContract(project, talentId)) return true;

    if (!isProjectActiveForAttachments(project)) continue;

    if ((project.cast || []).some((c: any) => c?.talentId === talentId)) return true;
    if ((project.crew || []).some((c: any) => c?.talentId === talentId)) return true;

    const chars = project.script?.characters || [];
    if (chars.some((c: any) => c?.assignedTalentId === talentId)) return true;
  }

  return false;
}

export function isTalentAvailable(
  state: GameState,
  talent: TalentPerson,
  options?: { excludeProjectId?: string }
): boolean {
  if (talent.contractStatus === 'retired') return false;
  if (isTalentBusy(state, talent)) return false;

  const excludeProjectId = options?.excludeProjectId;
  if (talent.contractStatus === 'contracted' || talent.contractStatus === 'exclusive') {
    if (!excludeProjectId || !isTalentAttachedToProject(state, talent.id, excludeProjectId)) return false;
  }

  return !isTalentTaken(state, talent.id, options);
}

export function isTalentAvailableForProject(state: GameState, talent: TalentPerson, projectId: string): boolean {
  return isTalentAvailable(state, talent, { excludeProjectId: projectId });
}

export function getUnavailableTalentIds(state: GameState): Set<string> {
  return new Set((state.talent || []).filter((t) => !isTalentAvailable(state, t)).map((t) => t.id));
}
