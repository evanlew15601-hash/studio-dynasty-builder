import { describe, expect, it } from 'vitest';
import type { TalentPerson } from '@/types/game';
import { filterTalentByPrice } from '@/utils/castingFilters';

function makeTalent(marketValue: number): TalentPerson {
  return {
    id: `talent-${marketValue}`,
    name: `Talent ${marketValue}`,
    type: 'actor',
    marketValue,
    age: 30,
    reputation: 80,
    experience: 10,
    genres: ['drama'],
    awards: [],
    contractStatus: 'available',
  } as TalentPerson;
}

describe('filterTalentByPrice', () => {
  it('keeps only talents at or below the provided max price', () => {
    const talent = [makeTalent(4_000_000), makeTalent(8_000_000), makeTalent(12_000_000)];

    const filtered = filterTalentByPrice(talent, 8_000_000);

    expect(filtered.map((person) => person.marketValue)).toEqual([4_000_000, 8_000_000]);
  });

  it('returns all talent when no max price is provided', () => {
    const talent = [makeTalent(4_000_000), makeTalent(8_000_000)];

    expect(filterTalentByPrice(talent, null)).toEqual(talent);
  });
});
