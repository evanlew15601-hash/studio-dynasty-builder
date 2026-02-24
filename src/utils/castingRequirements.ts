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
