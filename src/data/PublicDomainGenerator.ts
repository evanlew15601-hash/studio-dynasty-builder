import type { PublicDomainIP } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';
import { getPublicDomainCatalog } from '@/data/PublicDomainCatalog';

// Compatibility generator to match existing imports in the game
export class PublicDomainGenerator {
  static getBasePublicDomainIPs(count: number = 20): PublicDomainIP[] {
    return getPublicDomainCatalog(count);
  }

  static generateInitialPublicDomainIPs(count: number = 20, mods?: ModBundle): PublicDomainIP[] {
    const bundle = mods ?? getModBundle();

    const catalogOverride = getPatchesForEntity(bundle, 'publicDomainCatalog').find(
      (p) => p.op === 'insert' && Array.isArray(p.payload)
    );

    const base = catalogOverride
      ? (catalogOverride.payload as PublicDomainIP[]).slice(0, count)
      : PublicDomainGenerator.getBasePublicDomainIPs(count);

    return applyPatchesByKey(base, getPatchesForEntity(bundle, 'publicDomainIP'), (p) => p.id);
  }
}