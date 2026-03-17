import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import type { GameState, Gender, Project, TalentPerson } from '@/types/game';
import { stablePick } from '@/utils/stablePick';

export function findRelevantTalentForAwardCategory(
  gameState: GameState,
  project: Project,
  categoryName: string,
  categoryDef?: AwardCategoryDefinition
): TalentPerson | undefined {
  const categoryLower = categoryName.toLowerCase();

  // Prefer explicit cast/crew lists first
  const castEntries = project.cast || [];
  const crewEntries = project.crew || [];
  const characters = project.script?.characters || [];

  const getTalentById = (id?: string) => gameState.talent.find(t => t.id === id);
  const pick = <T,>(items: T[], suffix: string) => stablePick(items, `${project.id}|${categoryLower}|${suffix}`);

  const desiredTalentType = categoryDef?.talent?.type;
  const desiredGender = categoryDef?.talent?.gender;
  const desiredSupporting = categoryDef?.talent?.supporting;

  // Director category
  const directorCategory = desiredTalentType === 'director' || categoryLower.includes('director') || categoryLower.includes('directing');

  if (directorCategory) {
    const directorEntries = crewEntries.filter(c => (c.role || '').toLowerCase().includes('director'));
    const chosenEntry = directorEntries.length > 1 ? pick(directorEntries, 'director') : directorEntries[0];
    const t1 = getTalentById((chosenEntry as any)?.talentId);
    if (t1 && t1.type === 'director') return t1;

    const directorChars = characters.filter(c => c.requiredType === 'director' && !!c.assignedTalentId);
    const chosenChar = directorChars.length > 1 ? pick(directorChars, 'director-char') : directorChars[0];
    const t2 = getTalentById(chosenChar?.assignedTalentId);
    if (t2 && t2.type === 'director') return t2;

    return undefined;
  }

  // Actor categories: be strict about both gender (when specified) and role tier (lead vs supporting).
  const isSupporting = desiredSupporting ?? categoryLower.includes('supporting');

  const genderRequirement: Gender | undefined =
    desiredGender ||
    (categoryLower.includes('actress')
      ? 'Female'
      : (categoryLower.includes('actor') && !categoryLower.includes('actress'))
        ? 'Male'
        : undefined);

  const genderOk = (talent: TalentPerson | undefined): talent is TalentPerson => {
    if (!talent || talent.type !== 'actor') return false;
    if (!genderRequirement) return true;
    return talent.gender === genderRequirement;
  };

  const importanceOk = (importance: string | undefined) => {
    if (!importance) return false;
    if (!isSupporting) return importance === 'lead';
    return importance === 'supporting' || importance === 'minor';
  };

  const roleMatch = (role: string) => {
    const r = role.toLowerCase();
    if (!isSupporting) return r.includes('lead') && !r.includes('supporting');
    return r.includes('supporting') || r.includes('minor');
  };

  // Prefer canonical script character assignments.
  const charCandidates = characters
    .filter((ch) => {
      if (!ch.assignedTalentId) return false;
      if (ch.requiredType === 'director') return false;
      if (!importanceOk(ch.importance)) return false;

      const t = getTalentById(ch.assignedTalentId);
      return genderOk(t);
    });

  if (charCandidates.length > 0) {
    const chosen = charCandidates.length > 1
      ? pick(charCandidates, isSupporting ? 'supporting-char' : 'lead-char')
      : charCandidates[0];
    return getTalentById(chosen.assignedTalentId);
  }

  // Next, try credited cast entries.
  const castCandidates = castEntries
    .filter((c) => roleMatch(c.role || ''))
    .map((c) => getTalentById((c as any).talentId))
    .filter(genderOk);

  if (castCandidates.length > 0) {
    return castCandidates.length > 1
      ? pick(castCandidates, isSupporting ? 'supporting' : 'lead')
      : castCandidates[0];
  }

  return undefined;
}
