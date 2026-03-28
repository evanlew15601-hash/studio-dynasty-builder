import type { ScriptCharacter, TalentPerson } from '@/types/game';
import { getRoleRequiredType } from '@/utils/scriptRoles';

export interface RoleFitBreakdown {
  typeMatch: boolean;
  ageMatch: boolean;
  ageDiff: number;
  genderMatch: boolean;
  raceMatch: boolean;
  nationalityMatch: boolean;
  totalScore: number;
  isPerfect: boolean;
}

export function getTalentRoleFitScore(talent: TalentPerson, role: ScriptCharacter): number {
  let score = 0;

  // Type match (20 points)
  const requiredType = getRoleRequiredType(role);
  const typeMatch = talent.type === requiredType;
  if (typeMatch) score += 20;

  // Age match (20 points, fuzzy ±4 years = full, linear falloff)
  if (requiredType !== 'director' && role.ageRange && talent.age !== undefined) {
    const [minAge, maxAge] = role.ageRange;
    const ageDiff = Math.max(0, Math.min(talent.age - minAge, maxAge - talent.age));
    const ageFlex = 4; // ±4 years full score
    const ageScore = Math.max(0, 20 * (1 - ageDiff / ageFlex));
    score += ageScore;
  } else {
    score += 20; // Directors ignore age
  }

  // Gender (20 points)
  if (requiredType !== 'director') {
    if (!role.requiredGender || !talent.gender || talent.gender === role.requiredGender) {
      score += 20;
    }
  } else {
    score += 20; // Directors ignore gender
  }

  // Race (20 points, partial for similar groups)
  if (role.requiredRace) {
    if (talent.race === role.requiredRace) {
      score += 20;
    } else if (talent.race && similarRaces(talent.race, role.requiredRace)) {
      score += 10; // Partial credit
    }
  } else {
    score += 20;
  }

  // Nationality (20 points, partial for similar regions)
  if (role.requiredNationality) {
    if (talent.nationality === role.requiredNationality) {
      score += 20;
    } else if (talent.nationality && similarNationalities(talent.nationality, role.requiredNationality)) {
      score += 10;
    }
  } else {
    score += 20;
  }

  return Math.floor(score);
}

function similarRaces(r1: string, r2: string): boolean {
  const groups: Record<string, string[]> = {
    'White/Caucasian': ['White', 'Caucasian', 'European'],
    'Black/African': ['Black', 'African American', 'African'],
    'Asian': ['Chinese', 'Japanese', 'Korean', 'Indian', 'Asian', 'East Asian', 'South Asian'],
    'Hispanic/Latino': ['Hispanic', 'Latino', 'Mexican'],
    'Middle Eastern': ['Middle Eastern', 'Arab', 'Persian'],
  };
  const norm1 = r1.toLowerCase();
  const norm2 = r2.toLowerCase();
  for (const [group, races] of Object.entries(groups)) {
    if (races.some(r => r.toLowerCase() === norm1) && races.some(r => r.toLowerCase() === norm2)) {
      return true;
    }
  }
  return false;
}

function similarNationalities(n1: string, n2: string): boolean {
  const regions: Record<string, string[]> = {
    'North America': ['USA', 'Canada', 'American', 'Canadian'],
    'Western Europe': ['UK', 'France', 'Germany', 'British', 'French', 'German'],
    'East Asia': ['China', 'Japan', 'Korea', 'Chinese', 'Japanese', 'Korean'],
    'South Asia': ['India', 'Pakistan', 'Indian'],
    'Latin America': ['Mexico', 'Brazil', 'Mexican', 'Brazilian'],
  };
  const norm1 = n1.toLowerCase();
  const norm2 = n2.toLowerCase();
  for (const [region, nats] of Object.entries(regions)) {
    if (nats.some(n => n.toLowerCase() === norm1) && nats.some(n => n.toLowerCase() === norm2)) {
      return true;
    }
  }
  return false;
}

export function talentSortsRole(t1: TalentPerson, t2: TalentPerson, role: ScriptCharacter): -1 | 0 | 1 {
  const score1 = getTalentRoleFitScore(t1, role);
  const score2 = getTalentRoleFitScore(t2, role);
  return score1 === score2 ? 0 : score1 > score2 ? 1 : -1;
}

// Backward-compatible strict matcher
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

export function getTalentRoleFitBreakdown(talent: TalentPerson, role: ScriptCharacter): RoleFitBreakdown {
  const requiredType = getRoleRequiredType(role);
  const typeMatch = talent.type === requiredType;

  let ageMatch = true;
  let ageDiff = 0;
  if (requiredType !== 'director' && role.ageRange && talent.age !== undefined) {
    const [minAge, maxAge] = role.ageRange;
    ageDiff = Math.max(0, Math.min(talent.age - minAge, maxAge - talent.age));
    ageMatch = ageDiff === 0;
  }

  let genderMatch = true;
  if (requiredType !== 'director') {
    genderMatch = !role.requiredGender || !talent.gender || talent.gender === role.requiredGender;
  }

  const raceMatch = !role.requiredRace || !talent.race || talent.race === role.requiredRace;
  const nationalityMatch = !role.requiredNationality || !talent.nationality || talent.nationality === role.requiredNationality;

  const totalScore = getTalentRoleFitScore(talent, role);
  const isPerfect = totalScore === 100;

  return {
    typeMatch,
    ageMatch,
    ageDiff,
    genderMatch,
    raceMatch,
    nationalityMatch,
    totalScore,
    isPerfect
  };
}
