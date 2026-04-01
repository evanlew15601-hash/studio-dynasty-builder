import type { Gender, ScriptCharacter } from '@/types/game';
import { stablePick } from '@/utils/stablePick';

export function getRoleRequiredType(role: ScriptCharacter): 'actor' | 'director' {
  return role.importance === 'crew' ? 'director' : (role.requiredType || 'actor');
}

export function isDirectorRole(role: ScriptCharacter): boolean {
  return getRoleRequiredType(role) === 'director';
}

export function normalizeScriptRole(role: ScriptCharacter): ScriptCharacter {
  const requiredType = getRoleRequiredType(role);

  if (requiredType === 'director') {
    return {
      ...role,
      requiredType: 'director',
      requiredGender: undefined,
      requiredRace: undefined,
      requiredNationality: undefined,
    };
  }

  if (role.requiredGender) {
    return { ...role, requiredType: 'actor' };
  }

  return {
    ...role,
    requiredType: 'actor',
    requiredGender: stablePick<Gender>(['Male', 'Female'], `${role.id || role.name}|gender`),
  };
}
