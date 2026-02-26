import type { Project, ProductionRole, ScriptCharacter } from '@/types/game';

export type CastingSource = 'script' | 'legacy';

export interface ProjectRoleAssignment {
  talentId: string;
  role: string;
  requiredType: 'actor' | 'director';
  importance?: ScriptCharacter['importance'];
  characterId?: string;
  excluded?: boolean;
  source: CastingSource;
}

function inferRequiredTypeFromRoleName(role: string): 'actor' | 'director' {
  const r = (role || '').toLowerCase();
  if (r.includes('director')) return 'director';
  return 'actor';
}

function inferImportanceFromRoleName(role: string): ScriptCharacter['importance'] {
  const r = (role || '').toLowerCase();
  if (r.includes('director')) return 'crew';
  if (r.includes('lead') || r.includes('protagonist')) return 'lead';
  if (r.includes('support')) return 'supporting';
  if (r.includes('minor') || r.includes('cameo')) return 'minor';
  return 'supporting';
}

function normalizeCharacterRequiredType(character: ScriptCharacter): 'actor' | 'director' {
  if (character.requiredType) return character.requiredType;
  if (character.importance === 'crew') return 'director';
  return 'actor';
}

export function getProjectCastingSource(project: Project): CastingSource {
  const chars = project.script?.characters;
  // Treat excluded roles as non-participating: scripts with only excluded characters should fall back
  // to legacy cast arrays for back-compat.
  return chars && chars.some(c => !c.excluded) ? 'script' : 'legacy';
}

export function getProjectActiveCharacters(project: Project): ScriptCharacter[] {
  if (getProjectCastingSource(project) !== 'script') return [];
  return (project.script.characters || []).filter(c => !c.excluded);
}

export function getProjectRoleAssignments(project: Project): ProjectRoleAssignment[] {
  const source = getProjectCastingSource(project);

  if (source === 'script') {
    return (project.script.characters || [])
      .filter(c => !c.excluded && !!c.assignedTalentId)
      .map(c => ({
        talentId: c.assignedTalentId!,
        role: c.name,
        requiredType: normalizeCharacterRequiredType(c),
        importance: c.importance,
        characterId: c.id,
        excluded: c.excluded,
        source,
      }));
  }

  // Legacy fallback (older saves / alternate UI flows)
  const legacyRoles: ProductionRole[] = [
    ...(project.cast || []),
    ...(project.crew || []),
  ];

  return legacyRoles
    .filter(r => !!r.talentId)
    .map(r => ({
      talentId: r.talentId,
      role: r.role,
      requiredType: inferRequiredTypeFromRoleName(r.role),
      importance: inferImportanceFromRoleName(r.role),
      source,
    }));
}

export function getProjectRoleAssignmentsForDisplay(project: Project): ProjectRoleAssignment[] {
  const source = getProjectCastingSource(project);

  if (source === 'script') {
    return (project.script.characters || [])
      .filter(c => !!c.assignedTalentId)
      .map(c => ({
        talentId: c.assignedTalentId!,
        role: c.name,
        requiredType: normalizeCharacterRequiredType(c),
        importance: c.importance,
        characterId: c.id,
        excluded: c.excluded,
        source,
      }));
  }

  return getProjectRoleAssignments(project);
}

export function getProjectAssignedTalentIds(project: Project): string[] {
  const ids = getProjectRoleAssignments(project).map(a => a.talentId);
  return Array.from(new Set(ids));
}

export function getProjectCastingSummary(project: Project): {
  source: CastingSource;
  assignedCount: number;
  assignedTalentIds: Set<string>;
  hasDirector: boolean;
  hasLead: boolean;
  assignments: ProjectRoleAssignment[];
} {
  const assignments = getProjectRoleAssignments(project);
  const assignedTalentIds = new Set(assignments.map(a => a.talentId));

  const hasDirector = assignments.some(a => a.requiredType === 'director');
  const hasLead = assignments.some(a => a.importance === 'lead' && a.requiredType !== 'director');

  return {
    source: getProjectCastingSource(project),
    assignedCount: assignments.length,
    assignedTalentIds,
    hasDirector,
    hasLead,
    assignments,
  };
}
