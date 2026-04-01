import type { Genre } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

export type DealKind = 'streaming' | 'cable';

export type ProviderId =
  | 'streamflix'
  | 'primewave'
  | 'streamhub'
  | 'magicstream'
  | 'orchardstream'
  | 'premiumstream'
  | 'amotion'
  | 'flux'
  | 'dynamite'
  | 'unity'
  | 'sciwave'
  | 'chronicle';

export interface ProviderDealProfile {
  id: ProviderId;
  dealKind: DealKind;
  name: string;
  color: string;
  marketShare: number;
  averageRate: number;
  bonusMultiplier: number;
  requirements: {
    minQuality: number;
    minBudget?: number;
    preferredGenres?: Genre[];
  };
  expectations: {
    viewersPerShare: number;
    completionRate: number;
    subscriberGrowthRate: number;
  };
}

export const PROVIDER_DEALS: ProviderDealProfile[] = [
  {
    id: 'streamflix',
    dealKind: 'streaming',
    name: 'StreamFlix',
    color: 'bg-red-600',
    marketShare: 25,
    averageRate: 2500000,
    bonusMultiplier: 1.2,
    requirements: {
      minQuality: 55,
      preferredGenres: ['drama', 'thriller', 'sci-fi', 'crime']
    },
    expectations: {
      viewersPerShare: 1_000_000,
      completionRate: 65,
      subscriberGrowthRate: 0.05
    }
  },
  {
    id: 'primewave',
    dealKind: 'streaming',
    name: 'PrimeWave',
    color: 'bg-blue-600',
    marketShare: 20,
    averageRate: 2200000,
    bonusMultiplier: 1.1,
    requirements: {
      minQuality: 50,
      preferredGenres: ['action', 'comedy', 'drama', 'family']
    },
    expectations: {
      viewersPerShare: 950_000,
      completionRate: 62,
      subscriberGrowthRate: 0.045
    }
  },
  {
    id: 'streamhub',
    dealKind: 'streaming',
    name: 'StreamHub',
    color: 'bg-green-600',
    marketShare: 15,
    averageRate: 1800000,
    bonusMultiplier: 1.0,
    requirements: {
      minQuality: 48,
      preferredGenres: ['comedy', 'drama', 'romance']
    },
    expectations: {
      viewersPerShare: 900_000,
      completionRate: 60,
      subscriberGrowthRate: 0.04
    }
  },
  {
    id: 'magicstream',
    dealKind: 'streaming',
    name: 'Magic Stream',
    color: 'bg-purple-600',
    marketShare: 18,
    averageRate: 2800000,
    bonusMultiplier: 1.3,
    requirements: {
      minQuality: 60,
      preferredGenres: ['family', 'animation', 'fantasy', 'adventure', 'superhero']
    },
    expectations: {
      viewersPerShare: 1_050_000,
      completionRate: 68,
      subscriberGrowthRate: 0.055
    }
  },
  {
    id: 'orchardstream',
    dealKind: 'streaming',
    name: 'Orchard Stream',
    color: 'bg-gray-600',
    marketShare: 12,
    averageRate: 3200000,
    bonusMultiplier: 1.4,
    requirements: {
      minQuality: 65,
      preferredGenres: ['drama', 'biography', 'thriller', 'sci-fi']
    },
    expectations: {
      viewersPerShare: 900_000,
      completionRate: 70,
      subscriberGrowthRate: 0.05
    }
  },
  {
    id: 'premiumstream',
    dealKind: 'streaming',
    name: 'Premium Stream',
    color: 'bg-indigo-600',
    marketShare: 10,
    averageRate: 3500000,
    bonusMultiplier: 1.5,
    requirements: {
      minQuality: 70,
      preferredGenres: ['drama', 'crime', 'historical', 'thriller']
    },
    expectations: {
      viewersPerShare: 850_000,
      completionRate: 72,
      subscriberGrowthRate: 0.045
    }
  },
  {
    id: 'amotion',
    dealKind: 'cable',
    name: 'American Motion Channel',
    color: 'bg-zinc-700',
    marketShare: 7,
    averageRate: 1400000,
    bonusMultiplier: 1.05,
    requirements: {
      minQuality: 58,
      preferredGenres: ['drama', 'thriller', 'horror']
    },
    expectations: {
      viewersPerShare: 800_000,
      completionRate: 55,
      subscriberGrowthRate: 0.02
    }
  },
  {
    id: 'flux',
    dealKind: 'cable',
    name: 'Flux Network',
    color: 'bg-orange-600',
    marketShare: 6,
    averageRate: 1600000,
    bonusMultiplier: 1.1,
    requirements: {
      minQuality: 60,
      preferredGenres: ['crime', 'drama', 'comedy', 'thriller']
    },
    expectations: {
      viewersPerShare: 780_000,
      completionRate: 56,
      subscriberGrowthRate: 0.02
    }
  },
  {
    id: 'dynamite',
    dealKind: 'cable',
    name: 'Dynamite Drama',
    color: 'bg-rose-600',
    marketShare: 8,
    averageRate: 1500000,
    bonusMultiplier: 1.0,
    requirements: {
      minQuality: 52,
      preferredGenres: ['action', 'drama', 'crime']
    },
    expectations: {
      viewersPerShare: 820_000,
      completionRate: 54,
      subscriberGrowthRate: 0.018
    }
  },
  {
    id: 'unity',
    dealKind: 'cable',
    name: 'Unity Network',
    color: 'bg-sky-600',
    marketShare: 7,
    averageRate: 1350000,
    bonusMultiplier: 1.0,
    requirements: {
      minQuality: 50,
      preferredGenres: ['drama', 'comedy', 'crime']
    },
    expectations: {
      viewersPerShare: 800_000,
      completionRate: 53,
      subscriberGrowthRate: 0.017
    }
  },
  {
    id: 'sciwave',
    dealKind: 'cable',
    name: 'SciWave Channel',
    color: 'bg-fuchsia-600',
    marketShare: 5,
    averageRate: 1250000,
    bonusMultiplier: 1.15,
    requirements: {
      minQuality: 55,
      preferredGenres: ['sci-fi', 'fantasy', 'horror']
    },
    expectations: {
      viewersPerShare: 750_000,
      completionRate: 55,
      subscriberGrowthRate: 0.02
    }
  },
  {
    id: 'chronicle',
    dealKind: 'cable',
    name: 'Chronicle Network',
    color: 'bg-amber-700',
    marketShare: 5,
    averageRate: 1100000,
    bonusMultiplier: 1.05,
    requirements: {
      minQuality: 52,
      preferredGenres: ['historical', 'documentary', 'biography', 'war']
    },
    expectations: {
      viewersPerShare: 720_000,
      completionRate: 52,
      subscriberGrowthRate: 0.015
    }
  }
];

export const STREAMING_PROVIDERS = PROVIDER_DEALS.filter(p => p.dealKind === 'streaming');
export const CABLE_PROVIDERS = PROVIDER_DEALS.filter(p => p.dealKind === 'cable');

export const ALL_PROVIDERS = PROVIDER_DEALS;

export function getEffectiveProviderDeals(mods?: ModBundle): ProviderDealProfile[] {
  const bundle = mods ?? getModBundle();
  const patches = getPatchesForEntity(bundle, 'providerDeal');
  return applyPatchesByKey(PROVIDER_DEALS, patches, (p) => p.id);
}

export function getAllProviders(mods?: ModBundle): ProviderDealProfile[] {
  return getEffectiveProviderDeals(mods);
}

export function getStreamingProviders(mods?: ModBundle): ProviderDealProfile[] {
  return getAllProviders(mods).filter((p) => p.dealKind === 'streaming');
}

export function getCableProviders(mods?: ModBundle): ProviderDealProfile[] {
  return getAllProviders(mods).filter((p) => p.dealKind === 'cable');
}

export function getProviderProfile(dealKind: DealKind, providerId: string, mods?: ModBundle) {
  return getAllProviders(mods).find(p => p.dealKind === dealKind && p.id === providerId);
}
