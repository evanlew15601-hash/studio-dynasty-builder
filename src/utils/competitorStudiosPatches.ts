import type { GameState, Studio } from '@/types/game';
import { StudioGenerator } from '@/data/StudioGenerator';
import { stableInt } from '@/utils/stableRandom';

export function ensureCompetitorStudiosLore(gameState: GameState): GameState {
  const sg = new StudioGenerator();

  const patchStudio = (s: Studio): Studio => {
    const profile = sg.getStudioProfile(s.name);
    if (!profile) return s;

    const currentYear = gameState.currentYear || new Date().getFullYear();
    const maxFounded = Math.max(1920, currentYear - 15);

    // Older saves (or earlier generator versions) seeded competitor studios as newly founded.
    // Keep modded/hand-authored values, but move obviously-too-recent studios back in time.
    const foundedIsValid = typeof s.founded === 'number' && s.founded >= 1850 && s.founded <= currentYear;
    const foundedIsTooRecent = foundedIsValid && s.founded >= currentYear - 10;

    const founded = foundedIsValid && !foundedIsTooRecent
      ? s.founded
      : stableInt(`studio-founded|${s.name}`, 1920, maxFounded);

    return {
      ...s,
      founded,
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
