import type { TalentPerson } from '@/types/game';

export function filterTalentByPrice(talent: TalentPerson[], maxPrice?: number | null): TalentPerson[] {
  if (!maxPrice || maxPrice <= 0) return talent;
  return talent.filter((person) => (person.marketValue ?? 0) <= maxPrice);
}
