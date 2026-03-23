import type { ScriptCharacter, TalentPerson } from '@/types/game';
import { getRoleRequiredType } from '@/utils/scriptRoles';

export function talentMatchesRole(talent: TalentPerson, role: ScriptCharacter): boolean {
  // Crew roles should always pull from the director pool, even if older/invalid data stored requiredType incorrectly.
  const requiredType = getRoleRequiredType(role);

  if (talent.type !== requiredType) return false;

  // Age ranges make sense for on-screen roles, but they create unnecessary friction
  // for director/crew slots (and some imported role templates mistakenly include them).
  if (requiredType !== 'director' && role.ageRange) {
    const [minAge, maxAge] = role.ageRange;
    if (talent.age < minAge || talent.age > maxAge) return false;
  }

  // Gender is mandatory for actor roles. We allow legacy roles with missing requiredGender
  // (older data/imports), treating them as "any gender".
  if (requiredType !== 'director') {
    if (role.requiredGender && talent.gender && talent.gender !== role.requiredGender) return false;
    if (role.requiredGender && !talent.gender) return false;
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
