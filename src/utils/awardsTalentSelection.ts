import type { Project, TalentPerson } from '@/types/game';
import { hasExplicitScriptCharacters, shouldUseLegacyCastFallback } from '@/utils/scriptCharacters';

export function findRelevantTalentForAwardsCategory({
  project,
  category,
  talentPool,
  random = Math.random,
}: {
  project: Project;
  category: string;
  talentPool: TalentPerson[];
  random?: () => number;
}): TalentPerson | undefined {
  const categoryLower = category.toLowerCase();

  const hasCharacters = hasExplicitScriptCharacters(project.script);
  const characters = hasCharacters ? project.script.characters : [];

  const activeCharacters = characters.filter(c => !c.excluded);

  // Canonical rule: when script.characters is present and non-empty, it is the source of truth
  // (even if all roles are excluded). Only fall back to legacy cast arrays when characters are
  // missing or empty.
  const castEntries = shouldUseLegacyCastFallback(project.script) ? (project.cast || []) : [];

  const getTalentById = (id?: string) => talentPool.find(t => t.id === id);

  if (categoryLower.includes('director')) {
    const castDir = castEntries.find(c => (c.role || '').toLowerCase().includes('director'));
    if (castDir) {
      const t = getTalentById(castDir.talentId);
      if (t && t.type === 'director') return t;
    }

    const charDir = activeCharacters.find(c => c.requiredType === 'director');
    const t = getTalentById(charDir?.assignedTalentId);
    if (t && t.type === 'director') return t;

    return undefined;
  }

  const isActress = categoryLower.includes('actress');
  const isSupporting = categoryLower.includes('supporting');

  const matchesActingCategory = (talent?: TalentPerson) => {
    if (!talent || talent.type !== 'actor') return false;
    if (isActress) return talent.gender === 'Female';
    return talent.gender !== 'Female';
  };

  if (isSupporting) {
    const supportingCast = castEntries.filter(c => {
      const role = (c.role || '').toLowerCase();
      if (!role.includes('supporting')) return false;
      return matchesActingCategory(getTalentById(c.talentId));
    });

    if (supportingCast.length > 0) {
      const idx = Math.floor(random() * supportingCast.length);
      return getTalentById(supportingCast[idx].talentId);
    }
  } else {
    const leadCast = castEntries.filter(c => {
      const role = (c.role || '').toLowerCase();
      if (!(role.includes('lead') || role.includes('actor') || role.includes('actress'))) return false;
      if (role.includes('supporting')) return false;
      return matchesActingCategory(getTalentById(c.talentId));
    });

    if (leadCast.length > 0) {
      const idx = Math.floor(random() * leadCast.length);
      return getTalentById(leadCast[idx].talentId);
    }
  }

  const anyActorCast = castEntries.filter(c => matchesActingCategory(getTalentById(c.talentId)));

  if (anyActorCast.length > 0) {
    const idx = Math.floor(random() * anyActorCast.length);
    const talent = getTalentById(anyActorCast[idx].talentId);
    if (talent && talent.type === 'actor') return talent;
  }

  const char = activeCharacters.find(ch => {
    if (ch.requiredType === 'director') return false;
    const talent = getTalentById(ch.assignedTalentId);
    if (!talent || talent.type !== 'actor') return false;

    if (isActress && talent.gender !== 'Female') return false;
    if (!isActress && talent.gender === 'Female') return false;

    if (isSupporting) return ch.importance === 'supporting';
    return ch.importance === 'lead';
  });

  if (!char) return undefined;

  const talent = getTalentById(char.assignedTalentId);
  if (talent && talent.type === 'actor') return talent;

  return undefined;
}
