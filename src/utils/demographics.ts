import type { GameState, Gender, Race, Script, ScriptCharacter, TalentPerson } from '@/types/game';
import { stablePick } from '@/utils/stablePick';

export const GENDER_OPTIONS: Gender[] = ['Male', 'Female'];

export const RACE_OPTIONS: Race[] = [
  'White',
  'Black',
  'Asian',
  'Latino',
  'Middle Eastern',
  'Indigenous',
  'Mixed',
  'Other',
];

// Intentionally small, game-friendly set.
export const NATIONALITY_OPTIONS: string[] = [
  'American',
  'British',
  'Canadian',
  'Australian',
  'Irish',
  'French',
  'German',
  'Italian',
  'Spanish',
  'Brazilian',
  'Mexican',
  'Argentinian',
  'Nigerian',
  'South African',
  'Egyptian',
  'Indian',
  'Pakistani',
  'Chinese',
  'Japanese',
  'Korean',
  'Filipino',
  'Thai',
  'Vietnamese',
  'Russian',
  'Polish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Turkish',
  'Israeli',
];

export function ensureTalentDemographics(talent: TalentPerson[]): TalentPerson[] {
  return talent.map((t) => {
    const gender = t.gender ?? stablePick(GENDER_OPTIONS, `${t.id}|gender`);
    const race = t.race ?? stablePick(RACE_OPTIONS, `${t.id}|race`);
    const nationality = t.nationality ?? stablePick(NATIONALITY_OPTIONS, `${t.id}|nationality`);

    // stablePick can return undefined for empty arrays (should never happen).
    return {
      ...t,
      gender: gender ?? t.gender,
      race: race ?? t.race,
      nationality: nationality ?? t.nationality,
    };
  });
}

function ensureCharacterGendersForScript(scriptId: string, characters: ScriptCharacter[] | undefined): ScriptCharacter[] | undefined {
  if (!characters) return characters;

  return characters.map((c) => {
    const requiredType = c.requiredType || (c.importance === 'crew' ? 'director' : 'actor');
    if (requiredType !== 'director' && !c.requiredGender) {
      return {
        ...c,
        requiredType: 'actor',
        requiredGender: stablePick(GENDER_OPTIONS, `${scriptId}|${c.id || c.name}|roleGender`),
      };
    }

    return {
      ...c,
      requiredType,
    };
  });
}

export function ensureScriptRoleGenders(script: Script): Script {
  return {
    ...script,
    characters: ensureCharacterGendersForScript(script.id, script.characters),
  };
}

export function ensureGameStateRoleGenders(gameState: GameState): GameState {
  return {
    ...gameState,
    scripts: (gameState.scripts || []).map(ensureScriptRoleGenders),
    projects: (gameState.projects || []).map((p) =>
      p.script
        ? {
          ...p,
          script: ensureScriptRoleGenders(p.script),
        }
        : p
    ),
  };
}
