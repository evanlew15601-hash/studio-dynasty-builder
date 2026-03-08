import type { GameState, Studio } from '@/types/game';
import { StudioGenerator } from '@/data/StudioGenerator';

export function ensureCompetitorStudiosLore(gameState: GameState): GameState {
  const sg = new StudioGenerator();

  const patchStudio = (s: Studio): Studio => {
    const profile = sg.getStudioProfile(s.name);
    if (!profile) return s;

    const currentYear = gameState.currentYear || new Date().getFullYear();

    // Older saves (or earlier generator versions) seeded competitor studios as newly founded.
    // Keep modded/hand-authored values, but move obviously-too-recent studios back in time.
    const foundedIsValid = typeof s.founded === 'number' && s.founded >= 1850 && s.founded <= currentYear;
    const foundedIsTooRecent = foundedIsValid && s.founded >= currentYear - 25;

    const founded = foundedIsValid && !foundedIsTooRecent ? s.founded : profile.founded;

    const next: Studio = {
      ...s,
      founded,
      personality: profile.personality,
      businessTendency: profile.businessTendency,
      brandIdentity: profile.brandIdentity,
      riskTolerance: profile.riskTolerance,
      releaseFrequency: profile.releaseFrequency,
    };

    const same =
      s.founded === next.founded &&
      s.personality === next.personality &&
      s.businessTendency === next.businessTendency &&
      s.brandIdentity === next.brandIdentity &&
      s.riskTolerance === next.riskTolerance &&
      s.releaseFrequency === next.releaseFrequency;

    return same ? s : next;
  };

  const prevStudios = gameState.competitorStudios || [];
  let changed = false;
  const nextStudios = prevStudios.map((s) => {
    const patched = patchStudio(s);
    if (patched !== s) changed = true;
    return patched;
  });

  if (!changed) return gameState;

  return {
    ...gameState,
    competitorStudios: nextStudios,
  };
}
