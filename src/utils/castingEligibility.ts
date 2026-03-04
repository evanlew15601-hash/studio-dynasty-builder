import type { ScriptCharacter, TalentPerson } from '@/types/game';

export function talentMatchesRole(talent: TalentPerson, role: ScriptCharacter): boolean {
  if (role.requiredType && talent.type !== role.requiredType) return false;

  if (role.ageRange) {
    const [minAge, maxAge] = role.ageRange;
    if (talent.age < minAge || talent.age > maxAge) return false;
  }

  if (role.requiredGender) {
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
