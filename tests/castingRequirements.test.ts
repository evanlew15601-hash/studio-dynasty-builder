import { describe, expect, it } from 'vitest';
import type { ScriptCharacter } from '@/types/game';
import { getCastingProgressStatus } from '@/utils/castingRequirements';

describe('getCastingProgressStatus - excluded roles', () => {
  it('ignores excluded roles and does not allow proceeding when only excluded mandatory roles are cast', () => {
    const characters: ScriptCharacter[] = [
      { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 't1', excluded: true },
      { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', assignedTalentId: 't2', excluded: true },
    ];

    const res = getCastingProgressStatus(characters);

    expect(res.totalSlots).toBe(0);
    expect(res.requiredTotal).toBe(0);
    expect(res.hasDirector).toBe(false);
    expect(res.hasLead).toBe(false);
    expect(res.canProceed).toBe(false);
  });

  it('allows proceeding when required active roles are cast even if excluded roles exist', () => {
    const characters: ScriptCharacter[] = [
      { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 't1' },
      { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', assignedTalentId: 't2' },
      { id: 'x1', name: 'Cut Character', importance: 'supporting', requiredType: 'actor', excluded: true },
    ];

    const res = getCastingProgressStatus(characters);

    expect(res.totalSlots).toBe(2);
    expect(res.requiredTotal).toBe(2);
    expect(res.requiredCast).toBe(2);
    expect(res.hasDirector).toBe(true);
    expect(res.hasLead).toBe(true);
    expect(res.canProceed).toBe(true);
  });

  it('blocks proceeding when active required roles exist but are not cast', () => {
    const characters: ScriptCharacter[] = [
      { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director' },
      { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor' },
    ];

    const res = getCastingProgressStatus(characters);

    expect(res.totalSlots).toBe(2);
    expect(res.requiredTotal).toBe(2);
    expect(res.requiredCast).toBe(0);
    expect(res.canProceed).toBe(false);
  });
});
