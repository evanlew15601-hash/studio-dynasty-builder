import type { Franchise, FranchiseCharacterLibraryEntry, FranchiseTalentLibraryEntry, GameState, Project, ScriptCharacter } from '@/types/game';
import { stablePick } from '@/utils/stablePick';
import { isDirectorRole } from '@/utils/scriptRoles';

const GENERIC_MAJOR_ROLE_NAMES = new Set([
  'hero', 'lead', 'lead character', 'main character', 'main protagonist', 'protagonist',
  'supporting character', 'supporting character #1', 'supporting character #2', 'friend',
  'best friend', 'sidekick', 'villain', 'main villain', 'antagonist', 'love interest',
  'mentor', 'director',
]);

export function isGenericMajorRoleName(character: Pick<ScriptCharacter, 'name' | 'importance' | 'requiredType'>): boolean {
  if (character.requiredType === 'director' || character.importance === 'crew' || character.importance === 'minor') return false;
  const name = (character.name || '').trim().toLowerCase();
  return GENERIC_MAJOR_ROLE_NAMES.has(name) || /^supporting character #?\d+$/i.test(name);
}

export function namedCharacterForRole(role: ScriptCharacter, seed: string): ScriptCharacter {
  if (!isGenericMajorRoleName(role)) return role;

  const first = stablePick(['Alex', 'Mara', 'Julian', 'Clara', 'Victor', 'Nora', 'Elias', 'Iris'], `${seed}|first|${role.id}`);
  const last = stablePick(['Vale', 'Cross', 'Sterling', 'Monroe', 'Hawke', 'Reed', 'Voss', 'Arden'], `${seed}|last|${role.id}`);
  return {
    ...role,
    name: `${first} ${last}`,
    description: role.description || `${role.importance === 'lead' ? 'Central' : 'Key recurring'} character in the franchise ensemble.`,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function projectAudienceSignal(project: Project): number {
  const metrics = project.metrics;
  const audienceScore = typeof metrics?.audienceScore === 'number' ? metrics.audienceScore : 50;
  const criticsScore = typeof metrics?.criticsScore === 'number' ? metrics.criticsScore : 50;
  const boxOfficeTotal = typeof metrics?.boxOfficeTotal === 'number' ? metrics.boxOfficeTotal : 0;
  const boxOfficeBonus = Math.min(12, boxOfficeTotal / 50_000_000);

  return ((audienceScore * 0.65) + (criticsScore * 0.35) + boxOfficeBonus) - 50;
}

function nextPopularity(
  prev: FranchiseCharacterLibraryEntry | undefined,
  character: ScriptCharacter,
  project: Project,
  appearances: string[],
): number {
  const baseline = prev?.popularity ?? (character.importance === 'lead' ? 62 : character.importance === 'supporting' ? 50 : 42);
  const importanceBonus = character.importance === 'lead' ? 8 : character.importance === 'supporting' ? 4 : 1;
  const recurrenceBonus = Math.min(10, appearances.length * 2);
  const audienceSignal = projectAudienceSignal(project) * (character.importance === 'lead' ? 0.35 : 0.2);

  return clampScore((baseline * 0.72) + importanceBonus + recurrenceBonus + audienceSignal);
}

function characterIdFor(c: ScriptCharacter): string {
  return c.franchiseCharacterId || c.roleTemplateId || c.id || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildCharacterLibrary(franchise: Franchise, projects: Project[] = []): FranchiseCharacterLibraryEntry[] {
  const existing = new Map((franchise.characterLibrary || []).map((c) => [c.characterId, c]));

  for (const project of projects) {
    for (const raw of project.script?.characters || []) {
      if (isDirectorRole(raw) || raw.importance === 'minor') continue;
      const c = namedCharacterForRole(raw, `${franchise.id}|${project.id}`);
      const id = characterIdFor(c);
      const prev = existing.get(id);
      const appearances = Array.from(new Set([...(prev?.appearances || []), project.id]));
      existing.set(id, {
        characterId: id,
        name: c.name,
        ageRange: c.ageRange || prev?.ageRange || [25, 45],
        gender: c.requiredGender || prev?.gender || stablePick(['Male', 'Female'], `${id}|gender`),
        description: c.description || prev?.description || 'Franchise character.',
        narrativeImportance: c.importance === 'lead' ? 'lead' : c.importance === 'supporting' ? 'supporting' : 'recurring',
        recurrencePotential: prev?.recurrencePotential ?? (c.importance === 'lead' ? 95 : 75),
        status: prev?.status || 'active',
        traits: c.traits || prev?.traits,
        relationships: c.relationships || prev?.relationships,
        firstAppearanceProjectId: prev?.firstAppearanceProjectId || project.id,
        appearances,
        popularity: nextPopularity(prev, c, project, appearances),
      });
    }
  }

  return Array.from(existing.values());
}

export function buildTalentLibrary(franchise: Franchise, projects: Project[] = [], gameState?: GameState): FranchiseTalentLibraryEntry[] {
  const existing = new Map((franchise.talentLibrary || []).map((t) => [`${t.talentId}:${t.characterId || t.role}`, t]));
  const talentById = new Map((gameState?.talent || []).map((t) => [t.id, t]));

  for (const project of projects) {
    for (const c of project.script?.characters || []) {
      if (!c.assignedTalentId) continue;
      const talent = talentById.get(c.assignedTalentId);
      const role = isDirectorRole(c) ? 'director' : 'actor';
      const key = `${c.assignedTalentId}:${role === 'actor' ? characterIdFor(c) : role}`;
      const prev = existing.get(key);
      const status = talent?.contractStatus === 'busy' ? 'busy' : talent?.contractStatus === 'retired' ? 'retired' : talent?.contractStatus === 'exclusive' ? 'contract-conflict' : 'available';
      existing.set(key, {
        talentId: c.assignedTalentId,
        name: talent?.name,
        role,
        characterId: role === 'actor' ? characterIdFor(c) : undefined,
        projectIds: Array.from(new Set([...(prev?.projectIds || []), project.id])),
        continuityPreference: prev?.continuityPreference || 'return',
        status,
        warning: status === 'busy' ? 'Scheduling conflict: returning talent is busy.' : status === 'contract-conflict' ? 'Contract conflict: buyout or replacement required.' : prev?.warning,
      });
    }
    for (const ct of project.contractedTalent || []) {
      if (!['Writer', 'Producer', 'Director'].includes(ct.role)) continue;
      const role = ct.role === 'Writer' ? 'writer' : ct.role === 'Producer' ? 'producer' : 'director';
      const key = `${ct.talentId}:${role}`;
      const prev = existing.get(key);
      existing.set(key, { talentId: ct.talentId, role, projectIds: Array.from(new Set([...(prev?.projectIds || []), project.id])), continuityPreference: 'return', status: 'unknown' });
    }
  }

  return Array.from(existing.values());
}
