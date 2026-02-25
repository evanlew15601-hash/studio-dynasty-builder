import type { ScriptCharacter } from '@/types/game';

export function getMandatoryCastingStatus(characters: ScriptCharacter[]) {
  const active = characters.filter(c => !c.excluded);

  const hasDirector = active.some(
    c => c.requiredType === 'director' && !!c.assignedTalentId
  );

  const hasLead = active.some(
    c => c.importance === 'lead' && c.requiredType !== 'director' && !!c.assignedTalentId
  );

  return { hasDirector, hasLead };
}

export function getCastingProgressStatus(characters: ScriptCharacter[]) {
  const active = characters.filter(c => !c.excluded);

  const required = active.filter(
    c =>
      c.traits?.includes('mandatory') ||
      c.importance === 'lead' ||
      c.requiredType === 'director'
  );

  const requiredCast = required.filter(c => !!c.assignedTalentId).length;
  const totalCast = active.filter(c => !!c.assignedTalentId).length;

  const { hasDirector, hasLead } = getMandatoryCastingStatus(characters);

  return {
    requiredCast,
    requiredTotal: required.length,
    totalCast,
    totalSlots: active.length,
    hasDirector,
    hasLead,
    canProceed: hasDirector && hasLead && requiredCast === required.length,
  };
}
