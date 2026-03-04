import { describe, expect, it } from 'vitest';
import { talentMatchesRole } from '@/utils/castingEligibility';
import type { ScriptCharacter, TalentPerson } from '@/types/game';

describe('talentMatchesRole', () => {
  it('filters by gender, race, and nationality when required', () => {
    const role: ScriptCharacter = {
      id: 'role-1',
      name: 'Lead',
      importance: 'lead',
      requiredType: 'actor',
      ageRange: [20, 40],
      requiredGender: 'Female',
      requiredRace: 'Asian',
      requiredNationality: 'Canadian',
    };

    const ok: TalentPerson = {
      id: 't-1',
      name: 'Test Actor',
      type: 'actor',
      age: 30,
      gender: 'Female',
      race: 'Asian',
      nationality: 'Canadian',
      experience: 5,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    const wrongGender = { ...ok, id: 't-2', gender: 'Male' as const };
    const wrongRace = { ...ok, id: 't-3', race: 'Black' as const };
    const wrongNation = { ...ok, id: 't-4', nationality: 'American' };

    expect(talentMatchesRole(ok, role)).toBe(true);
    expect(talentMatchesRole(wrongGender, role)).toBe(false);
    expect(talentMatchesRole(wrongRace, role)).toBe(false);
    expect(talentMatchesRole(wrongNation, role)).toBe(false);
  });
});
