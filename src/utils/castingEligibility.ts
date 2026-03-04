import type { ScriptCharacter, TalentPerson } from '@/types/game';

export function talentMatchesRole(talent: TalentPerson, role: ScriptCharacter): boolean {
  const requiredType = role.requiredType || (role.importance === 'crew' ? 'director' : 'actor');

  if (talent.type !== requiredType) return false;

  if (role.ageRange) {
    const [minAge, maxAge] = role.ageRange;
    if (talent.age < minAge || talent.age > maxAge) return false;
  }

  // Gender is mandatory for actor roles (used for actor/actress-style casting).
  if (requiredType !== 'director') {
    if (!role.requiredGender) return false;
    if (!talent.gender) return false;
    if (talent.gender !== role.requiredGender) return false;
  }

  if (role.requiredRace) {
    if (!talent.race) return false;
    if (talent.race !== role.requiredRace) return false;
  }

  if (role.requiredNationality) {
    if (!talent.nationality) return false;
    if (talent.nationality !== role.requiredNationality) return false;
  }

  return true;
}
