import { ScriptCharacter, TalentPerson } from '@/types/game';

export interface CastingFilterConfig {
  minReputationByImportance: Partial<Record<ScriptCharacter['importance'], number>>;
  minExperienceByTalentType: Partial<Record<TalentPerson['type'], number>>;
}

/**
 * Default thresholds for filtering eligible talent for a given role.
 * These can be tuned to make casting stricter or more permissive.
 */
export const defaultCastingFilterConfig: CastingFilterConfig = {
  minReputationByImportance: {
    lead: 55,
    supporting: 35,
    minor: 0,
    crew: 40,
  },
  minExperienceByTalentType: {
    director: 5,
    actor: 0,
  },
};

/**
 * Filters a pool of candidate talent for a specific scripted character.
 * If the strict filters would remove everyone, the original candidate pool is returned
 * so the game never becomes impossible to cast.
 */
export function filterTalentForRole(
  candidates: TalentPerson[],
  character: ScriptCharacter,
  config: CastingFilterConfig = defaultCastingFilterConfig
): TalentPerson[] {
  const { minReputationByImportance, minExperienceByTalentType } = config;

  const strictMatches = candidates.filter((talent) => {
    const importance = character.importance;
    const minRep = minReputationByImportance[importance];
    if (typeof minRep === 'number' && talent.reputation < minRep) {
      return false;
    }

    const minExp = minExperienceByTalentType[talent.type];
    if (typeof minExp === 'number' && talent.experience < minExp) {
      return false;
    }

    return true;
  });

  return strictMatches.length > 0 ? strictMatches : candidates;
}