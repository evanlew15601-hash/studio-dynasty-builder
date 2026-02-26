import type { Project, TalentPerson } from '@/types/game';
import { hasNonEmptyScriptCharacters } from '@/utils/scriptCharacters';

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

  const hasCharacters = hasNonEmptyScriptCharacters(project.script);
  const characters = hasCharacters ? project.script.characters : [];

  const activeCharacters = characters.filter(c => !c.excluded);

  // Canonical rule: when script.characters has at least one active (non-excluded) role, ignore legacy project.cast
  // and derive all acting/directing picks from character assignments.
  const castEntries = hasCharacters ? [] : (project.cast || []);

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

  if (isSupporting) {
    const supportingCast = castEntries.filter(c =>
      (c.role || '').toLowerCase().includes('supporting') &&
      (!isActress || getTalentById(c.talentId)?.gender === 'Female')
    );

    if (supportingCast.length > 0) {
      const idx = Math.floor(random() * supportingCast.length);
      const talent = getTalentById(supportingCast[idx].talentId);
      if (talent && talent.type === 'actor') return talent;
    }
  } else {
    const leadCast = castEntries.filter(c => {
      const role = (c.role || '').toLowerCase();
      return (
        (role.includes('lead') || role.includes('actor') || role.includes('actress')) &&
        !role.includes('supporting') &&
        (!isActress || getTalentById(c.talentId)?.gender === 'Female')
      );
    });

    if (leadCast.length > 0) {
      const idx = Math.floor(random() * leadCast.length);
      const talent = getTalentById(leadCast[idx].talentId);
      if (talent && talent.type === 'actor') return talent;
    }
  }

  const anyActorCast = castEntries.filter(c => {
    const talent = getTalentById(c.talentId);
    return (
      !!talent &&
      talent.type === 'actor' &&
      (!isActress || talent.gender === 'Female') &&
      (isActress || talent.gender !== 'Female')
    );
  });

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
