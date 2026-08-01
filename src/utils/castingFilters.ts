import type { ScriptCharacter, TalentPerson } from '@/types/game';
import { talentMatchesRole, getTalentRoleFitScore } from '@/utils/castingEligibility';

export interface CastingCandidateFilters {
  projectGenre?: string;
  maxPrice?: number | null;
  availabilityOnly?: boolean;
  requireAwards?: boolean;
  minReputation?: number;
  maxAge?: number;
}

export function filterTalentByPrice(talent: TalentPerson[], maxPrice?: number | null): TalentPerson[] {
  if (!maxPrice || maxPrice <= 0) return talent;
  return talent.filter((person) => (person.marketValue ?? 0) <= maxPrice);
}

export function filterAndSortTalentForRole(
  talent: TalentPerson[],
  role: ScriptCharacter,
  filters: CastingCandidateFilters = {}
): TalentPerson[] {
  const projectGenre = filters.projectGenre?.toLowerCase();
  const maxPrice = filters.maxPrice;
  const availabilityOnly = filters.availabilityOnly ?? true;
  const requireAwards = filters.requireAwards ?? false;
  const minReputation = filters.minReputation ?? 0;
  const maxAge = filters.maxAge;

  return talent
    .filter((person) => {
      if (availabilityOnly && person.contractStatus !== 'available') return false;
      if (!talentMatchesRole(person, role)) return false;
      if (maxPrice && (person.marketValue ?? 0) > maxPrice) return false;
      if (requireAwards && !(person.awards?.length ?? 0)) return false;
      if ((person.reputation ?? 0) < minReputation) return false;
      if (maxAge !== undefined && (person.age ?? 0) > maxAge) return false;
      return true;
    })
    .sort((a, b) => {
      const aGenreMatch = projectGenre ? Number((a.genres || []).map((g) => g.toLowerCase()).includes(projectGenre)) : 0;
      const bGenreMatch = projectGenre ? Number((b.genres || []).map((g) => g.toLowerCase()).includes(projectGenre)) : 0;
      if (aGenreMatch !== bGenreMatch) return bGenreMatch - aGenreMatch;

      const aFit = getTalentRoleFitScore(a, role);
      const bFit = getTalentRoleFitScore(b, role);
      if (aFit !== bFit) return bFit - aFit;

      if ((b.reputation ?? 0) !== (a.reputation ?? 0)) return (b.reputation ?? 0) - (a.reputation ?? 0);

      const aAwards = a.awards?.length ?? 0;
      const bAwards = b.awards?.length ?? 0;
      if (aAwards !== bAwards) return bAwards - aAwards;

      const aPrice = a.marketValue ?? 0;
      const bPrice = b.marketValue ?? 0;
      if (aPrice !== bPrice) return aPrice - bPrice;

      return (a.name || '').localeCompare(b.name || '');
    });
}
