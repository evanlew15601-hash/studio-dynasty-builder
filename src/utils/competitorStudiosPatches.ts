import type { GameState, Studio } from '@/types/game';
import { StudioGenerator } from '@/data/StudioGenerator';

export function ensureCompetitorStudiosLore(gameState: GameState): GameState {
  const sg = new StudioGenerator();

  const patchStudio = (s: Studio): Studio => {
    const profile = sg.getStudioProfile(s.name);
    if (!profile) return s;

    return {
      ...s,
      budget: profile.budget,
      reputation: profile.reputation,
      specialties: profile.specialties,
      founded: profile.foundedYear ?? s.founded,
      personality: profile.personality,
      businessTendency: profile.businessTendency,
      brandIdentity: profile.brandIdentity,
      riskTolerance: profile.riskTolerance,
      releaseFrequency: profile.releaseFrequency,
    };
  };

  return {
    ...gameState,
    competitorStudios: (gameState.competitorStudios || []).map(patchStudio),
  };
}
