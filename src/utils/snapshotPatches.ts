import { ensureGameStateRoleGenders, ensureTalentDemographics } from '@/utils/demographics';
import { ensureGameStateFictionalAwardNames } from '@/utils/awardsNaming';
import { ensureCompetitorStudiosLore } from '@/utils/competitorStudiosPatches';
import { ensureTalentLore } from '@/utils/talentLorePatches';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { normalizeFranchisesState } from '@/utils/franchiseNormalization';
import { normalizePublicDomainState } from '@/utils/publicDomainNormalization';
import { getModBundle } from '@/utils/moddingStore';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { reviveIsoDates } from '@/utils/reviveIsoDates';
import type { SaveGameSnapshot } from '@/utils/saveLoad';

export function patchLoadedSnapshot(
  snapshot: SaveGameSnapshot,
  opts: { mode: 'single' | 'online' }
): SaveGameSnapshot {
  reviveIsoDates(snapshot.gameState);

  const mods = getModBundle();

  const patchedTalent = applyPatchesByKey(
    snapshot.gameState.talent || [],
    getPatchesForEntity(mods, 'talent'),
    (t) => t.id
  );

  const patchedGameStateRaw = ensureCompetitorStudiosLore(
    ensureTalentLore(
      ensureGameStateFictionalAwardNames(
        ensureGameStateRoleGenders({
          ...snapshot.gameState,
          talent: ensureTalentDemographics(patchedTalent),
          franchises: applyPatchesByKey(
            snapshot.gameState.franchises || [],
            getPatchesForEntity(mods, 'franchise'),
            (f) => f.id
          ),
          publicDomainIPs: applyPatchesByKey(
            snapshot.gameState.publicDomainIPs || [],
            getPatchesForEntity(mods, 'publicDomainIP'),
            (p) => p.id
          ),
        })
      )
    )
  );

  const patchedGameState = normalizePublicDomainState(normalizeFranchisesState(patchedGameStateRaw as any) as any);

  if (opts.mode === 'single') {
    return {
      ...snapshot,
      gameState: {
        ...primeCompetitorTelevision(patchedGameState),
        mode: 'single',
      },
    };
  }

  // Online mode should only include player-controlled studios.
  return {
    ...snapshot,
    gameState: {
      ...patchedGameState,
      mode: 'online',
      competitorStudios: [],
      aiStudioProjects: [],
    },
  };
}
