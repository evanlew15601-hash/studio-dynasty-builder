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

  it('allows legacy actor roles with missing requiredGender (treats as any gender)', () => {
    const role: ScriptCharacter = {
      id: 'role-1',
      name: 'Lead',
      importance: 'lead',
      requiredType: 'actor',
    };

    const actor: TalentPerson = {
      id: 't-1',
      name: 'Test Actor',
      type: 'actor',
      age: 30,
      gender: 'Female',
      experience: 5,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    expect(talentMatchesRole(actor, role)).toBe(true);
    expect(talentMatchesRole(actor, { ...role, requiredGender: 'Male' })).toBe(false);
    expect(talentMatchesRole(actor, { ...role, requiredGender: 'Female' })).toBe(true);
  });

  it('does not require gender for director roles', () => {
    const role: ScriptCharacter = {
      id: 'role-1',
      name: 'Director',
      importance: 'crew',
      requiredType: 'director',
    };

    const director: TalentPerson = {
      id: 't-1',
      name: 'Test Director',
      type: 'director',
      age: 45,
      experience: 10,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    expect(talentMatchesRole(director, role)).toBe(true);
  });

  it('does not apply ageRange locks to director roles', () => {
    const role: ScriptCharacter = {
      id: 'role-1',
      name: 'Director',
      importance: 'crew',
      requiredType: 'director',
      ageRange: [60, 80],
    };

    const director: TalentPerson = {
      id: 't-1',
      name: 'Test Director',
      type: 'director',
      age: 45,
      experience: 10,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    expect(talentMatchesRole(director, role)).toBe(true);
  });

  it('treats crew roles as director roles even if requiredType is wrong (legacy data)', () => {
    const role: ScriptCharacter = {
      id: 'role-1',
      name: 'Director',
      importance: 'crew',
      requiredType: 'actor',
    };

    const director: TalentPerson = {
      id: 't-1',
      name: 'Test Director',
      type: 'director',
      age: 45,
      experience: 10,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    const actor: TalentPerson = {
      id: 't-2',
      name: 'Test Actor',
      type: 'actor',
      age: 30,
      gender: 'Male',
      experience: 5,
      reputation: 50,
      marketValue: 1_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date(), end: new Date() },
    };

    expect(talentMatchesRole(director, role)).toBe(true);
    expect(talentMatchesRole(actor, role)).toBe(false);
  });
});
