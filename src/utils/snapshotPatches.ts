import { ensureGameStateRoleGenders, ensureTalentDemographics } from '@/utils/demographics';
import { ensureGameStateFictionalAwardNames } from '@/utils/awardsNaming';
import { ensureCompetitorStudiosLore } from '@/utils/competitorStudiosPatches';
import { ensureTalentLore } from '@/utils/talentLorePatches';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { normalizeFranchises } from '@/utils/franchiseNormalization';
import { getModBundle } from '@/utils/moddingStore';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import type { SaveGameSnapshot } from '@/utils/saveLoad';

export function patchLoadedSnapshot(
  snapshot: SaveGameSnapshot,
  opts: { mode: 'single' | 'online' }
): SaveGameSnapshot {
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
          franchises: normalizeFranchises(
            applyPatchesByKey(
              snapshot.gameState.franchises || [],
              getPatchesForEntity(mods, 'franchise'),
              (f) => f.id
            )
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

  if (opts.mode === 'single') {
    return {
      ...snapshot,
      gameState: {
        ...primeCompetitorTelevision(patchedGameStateRaw),
        mode: 'single',
      },
    };
  }

  // Online mode should only include player-controlled studios.
  const playerStudioName = patchedGameStateRaw.studio?.name;

  return {
    ...snapshot,
    gameState: {
      ...patchedGameStateRaw,
      mode: 'online',
      competitorStudios: [],
      aiStudioProjects: [],
      allReleases: (patchedGameStateRaw.allReleases || []).filter((r: any) => {
        const studioName = r?.studioName;
        if (!studioName) return true;
        return studioName === playerStudioName;
      }),
    },
  };
}
