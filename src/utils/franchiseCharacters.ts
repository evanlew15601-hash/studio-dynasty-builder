import type { Franchise, FranchiseCharacterState, GameState, Project, ScriptCharacter } from '@/types/game';
import { FRANCHISE_CHARACTER_DB } from '@/data/FranchiseCharacterDB';
import { RoleDatabase } from '@/data/RoleDatabase';
import { PARODY_CHARACTER_NAME_MAP } from '@/data/ParodyCharacterNames';

export function makeFallbackFranchiseCharacterId(franchise: Franchise, roleId: string): string {
  // Prefer parodySource for stability across saves; fall back to franchiseId.
  const base = franchise.parodySource || franchise.id;
  return `${base}:${roleId}`;
}

export function ensureFranchiseCharacterStates(franchise: Franchise, gameState: GameState): FranchiseCharacterState[] {
  if (franchise.characterStates && franchise.characterStates.length > 0) return franchise.characterStates;

  // Prefer explicit character DB keyed by franchiseId, then parodySource.
  const defs = FRANCHISE_CHARACTER_DB[franchise.id] || (franchise.parodySource ? FRANCHISE_CHARACTER_DB[franchise.parodySource] : undefined);

  if (defs && defs.length > 0) {
    return defs.map(def => {
      const parodyName = franchise.parodySource
        ? PARODY_CHARACTER_NAME_MAP[franchise.parodySource]?.byCharacterId?.[def.character_id]
        : undefined;

      return {
        franchiseCharacterId: def.character_id,
        name: parodyName || def.name,
        roleTemplateId: def.role_template_id,
        importance: def.importance,
        requiredType: def.requiredType,
        description: def.description,
        traits: def.traits,
        ageRange: def.ageRange,
        popularity: 0,
        popularitySamples: 0,
      };
    });
  }

  // Fallback: curated RoleDatabase roles.
  const fallbackRoles = RoleDatabase.getRolesForSource('franchise', franchise.id, gameState);
  return fallbackRoles.map(role => ({
    franchiseCharacterId: makeFallbackFranchiseCharacterId(franchise, role.id),
    name: role.name,
    roleTemplateId: role.roleTemplateId || role.id,
    importance: role.importance,
    requiredType: role.requiredType,
    description: role.description,
    traits: role.traits,
    ageRange: role.ageRange,
    popularity: 0,
    popularitySamples: 0,
  }));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeCharacterPopularity(franchiseId: string, franchiseCharacterId: string, projects: Project[]): number {
  const appearances = projects.filter(
    p => p.script?.franchiseId === franchiseId &&
      p.status === 'released' &&
      (p.script?.characters || []).some(c => c.franchiseCharacterId === franchiseCharacterId)
  );

  if (appearances.length === 0) return 0;

  const avg = appearances.reduce((sum, p) => {
    const critics = p.metrics?.criticsScore ?? 50;
    const audience = p.metrics?.audienceScore ?? 50;

    // Rough studio-performance proxy: compare total gross vs (2x budget) with diminishing returns.
    const budget = p.budget?.total ?? 10_000_000;
    const gross = p.metrics?.boxOfficeTotal ?? 0;
    const boxOfficeRatio = budget > 0 ? gross / (budget * 2) : 0;
    const boxOfficeScore = clamp01(boxOfficeRatio) * 100;

    return sum + (critics * 0.35 + audience * 0.35 + boxOfficeScore * 0.30);
  }, 0) / appearances.length;

  return Math.round(avg);
}

function absWeek(week: number, year: number): number {
  return (year * 52) + week;
}

function absToWeekYear(abs: number): { week: number; year: number } {
  const year = Math.floor((abs - 1) / 52);
  const week = ((abs - 1) % 52) + 1;
  return { week, year };
}

export function recomputeFranchiseCharacterStates(gameState: GameState): Franchise[] {
  const currentAbsWeek = absWeek(gameState.currentWeek, gameState.currentYear);

  return (gameState.franchises || []).map(franchise => {
    const states = ensureFranchiseCharacterStates(franchise, gameState);

    const updated = states.map(state => {
      const popularity = computeCharacterPopularity(franchise.id, state.franchiseCharacterId, gameState.projects);

      // If a signature contract exists, it controls whether signature casting is active.
      const contract = state.signatureContract;
      let nextContract = contract;
      let signatureTalentId: string | undefined = undefined;

      if (contract) {
        const endAbs = absWeek(contract.endWeek, contract.endYear);
        let status = contract.status;
        if (status === 'active' && currentAbsWeek > endAbs) status = 'expired';

        if (status !== contract.status) {
          nextContract = { ...contract, status };
        }

        if (status === 'active') {
          signatureTalentId = contract.talentId;
        }
      } else {
        // Back-compat: if signature casting isn't set yet, infer it from the most recent project portrayal.
        signatureTalentId = state.signatureTalentId;
        if (!signatureTalentId) {
          const mostRecent = [...gameState.projects]
            .filter(p => p.script?.franchiseId === franchise.id)
            .sort((a, b) => ((b.releaseYear || 0) * 52 + (b.releaseWeek || 0)) - ((a.releaseYear || 0) * 52 + (a.releaseWeek || 0)))
            .find(p => (p.script?.characters || []).some(c => c.franchiseCharacterId === state.franchiseCharacterId && !!c.assignedTalentId));

          const talentId = mostRecent?.script?.characters?.find(c => c.franchiseCharacterId === state.franchiseCharacterId)?.assignedTalentId;
          if (talentId) signatureTalentId = talentId;
        }
      }

      // Keep end date coherent on older saves that may have been written before helper existed.
      if (nextContract && (!nextContract.endWeek || !nextContract.endYear)) {
        const startAbs = absWeek(nextContract.startWeek, nextContract.startYear);
        const termWeeks = Math.max(1, absWeek(nextContract.endWeek || nextContract.startWeek, nextContract.endYear || nextContract.startYear) - startAbs + 1);
        const end = absToWeekYear(startAbs + termWeeks - 1);
        nextContract = { ...nextContract, endWeek: end.week, endYear: end.year };
      }

      return {
        ...state,
        popularity,
        signatureTalentId,
        signatureContract: nextContract,
      };
    });

    return {
      ...franchise,
      characterStates: updated,
    };
  });
}

export function applySignatureCastingToCharacters(
  franchise: Franchise,
  characters: ScriptCharacter[]
): ScriptCharacter[] {
  const map = new Map((franchise.characterStates || []).map(c => [c.franchiseCharacterId, c.signatureTalentId] as const));

  if (map.size === 0) return characters;

  return characters.map(c => {
    if (!c.franchiseCharacterId) return c;
    const signature = map.get(c.franchiseCharacterId);
    if (!signature) return c;
    return { ...c, assignedTalentId: c.assignedTalentId || signature };
  });
}

export function updateFranchiseSignatureFromProject(franchise: Franchise, project: Project, gameState: GameState): Franchise {
  if (!project.script?.franchiseId || project.script.franchiseId !== franchise.id) return franchise;

  const existingStates = ensureFranchiseCharacterStates(franchise, gameState);
  const byId = new Map(existingStates.map(s => [s.franchiseCharacterId, { ...s }] as const));

  for (const c of project.script.characters || []) {
    if (!c.franchiseCharacterId) continue;
    const prev = byId.get(c.franchiseCharacterId);
    const base: FranchiseCharacterState = prev || {
      franchiseCharacterId: c.franchiseCharacterId,
      name: c.name,
      roleTemplateId: c.roleTemplateId,
      importance: c.importance,
      requiredType: c.requiredType,
      description: c.description,
      traits: c.traits,
      ageRange: c.ageRange,
      popularity: 0,
      popularitySamples: 0,
    };

    // Keep roster text in sync with latest script edits.
    base.name = c.name || base.name;
    base.description = c.description ?? base.description;
    base.traits = c.traits ?? base.traits;
    base.ageRange = c.ageRange ?? base.ageRange;

    // Signature casting: only for non-minor on-screen roles.
    // If a signature contract exists, keep it authoritative (don't overwrite via project casting).
    if (!base.signatureContract && c.assignedTalentId && c.requiredType !== 'director' && c.importance !== 'minor') {
      base.signatureTalentId = c.assignedTalentId;
    }

    byId.set(c.franchiseCharacterId, base);
  }

  return {
    ...franchise,
    characterStates: Array.from(byId.values()),
  };
}
