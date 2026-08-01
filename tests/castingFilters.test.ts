import { describe, expect, it } from 'vitest';
import type { ScriptCharacter, TalentPerson } from '@/types/game';
import { filterAndSortTalentForRole, filterTalentByPrice } from '@/utils/castingFilters';

function makeTalent(overrides: Partial<TalentPerson> = {}): TalentPerson {
  return {
    id: `talent-${overrides.marketValue ?? 4_000_000}`,
    name: `Talent ${overrides.marketValue ?? 4_000_000}`,
    type: 'actor',
    marketValue: overrides.marketValue ?? 4_000_000,
    age: 30,
    reputation: 80,
    experience: 10,
    genres: ['drama'],
    awards: [],
    contractStatus: 'available',
    ...overrides,
  } as TalentPerson;
}

function makeRole(): ScriptCharacter {
  return {
    id: 'role-1',
    name: 'Lead',
    importance: 'lead',
    requiredType: 'actor',
    ageRange: [28, 35],
    requiredGender: 'Female',
    requiredRace: 'White/Caucasian',
    requiredNationality: 'USA',
  } as ScriptCharacter;
}

describe('filterTalentByPrice', () => {
  it('keeps only talents at or below the provided max price', () => {
    const talent = [makeTalent({ marketValue: 4_000_000 }), makeTalent({ marketValue: 8_000_000 }), makeTalent({ marketValue: 12_000_000 })];

    const filtered = filterTalentByPrice(talent, 8_000_000);

    expect(filtered.map((person) => person.marketValue)).toEqual([4_000_000, 8_000_000]);
  });

  it('returns all talent when no max price is provided', () => {
    const talent = [makeTalent({ marketValue: 4_000_000 }), makeTalent({ marketValue: 8_000_000 })];

    expect(filterTalentByPrice(talent, null)).toEqual(talent);
  });
});

describe('filterAndSortTalentForRole', () => {
  it('prioritizes genre fit, role fit, and lower price for casting candidates', () => {
    const role = makeRole();
    const match = makeTalent({ id: 'match', name: 'Match', marketValue: 3_000_000, reputation: 85, age: 30, gender: 'Female', race: 'White/Caucasian', nationality: 'USA', genres: ['drama'] });
    const genreOnly = makeTalent({ id: 'genre', name: 'Genre', marketValue: 2_500_000, reputation: 70, age: 32, gender: 'Female', race: 'White/Caucasian', nationality: 'USA', genres: ['drama'] });
    const lowerReputation = makeTalent({ id: 'budget', name: 'Budget', marketValue: 1_500_000, reputation: 60, age: 31, gender: 'Female', race: 'White/Caucasian', nationality: 'USA', genres: ['comedy'] });

    const result = filterAndSortTalentForRole([genreOnly, match, lowerReputation], role, { projectGenre: 'drama' });

    expect(result.map((talent) => talent.id)).toEqual(['match', 'genre', 'budget']);
  });
});
