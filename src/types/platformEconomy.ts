// Platform economy / market state types (Streaming Wars groundwork)
//
// Notes:
// - This is additive, optional state; old saves may not have it.
// - Keep it resilient to partial/legacy shapes: most fields are optional.

export type PlatformOperationalStatus = 'active' | 'sold' | 'shutdown';
export type RivalPlatformStatus = 'healthy' | 'distress' | 'collapsed';

export interface PlatformTierMix {
  /** Percentage (0–100) of subs on the ad-supported tier. */
  adSupportedPct: number;
  /** Percentage (0–100) of subs on the ad-free tier. */
  adFreePct: number;
}

export interface PlatformWeeklyKpis {
  subscribers: number;
  churnRate: number;
  churned: number;
  acquired: number;
  netAdds: number;
  revenue: number;
  opsCost: number;
  profit: number;
}

export interface PlayerPlatformState {
  /** Stable platform id (e.g., player-platform:<studioId>) */
  id: string;
  name: string;
  launchedWeek?: number;
  launchedYear?: number;

  subscribers: number;
  /** Platform cash proxy (used for distress modelling). */
  cash: number;
  status: PlatformOperationalStatus;

  tierMix?: PlatformTierMix;
  /** Weekly promotion spend (abstracted algorithm control). */
  promotionBudgetPerWeek?: number;
  /** Abstract price competitiveness index (0.5–1.5 typical). */
  priceIndex?: number;

  /** Proxies for “does the platform have a compelling library”. */
  catalogValue?: number; // 0–100
  freshness?: number; // 0–100

  /** Used by hard-fail modeling. */
  distressWeeks?: number;

  // Optional knobs for future economy simulation
  monthlyPrice?: number;
  contentSpendPerWeek?: number;

  /** UI flavor; does not affect simulation directly (yet). */
  vibe?: string;
}

export interface RivalPlatformState {
  /** Stable id (provider id from ProviderDealsDatabase). */
  id: string;
  name: string;
  subscribers: number;

  cash: number;
  status: RivalPlatformStatus;
  distressWeeks?: number;

  tierMix?: PlatformTierMix;
  priceIndex?: number;
  catalogValue?: number;
  freshness?: number; // 0–100
}

export interface PlatformMarketState {
  /** Global market headroom for this save. */
  totalAddressableSubs?: number;

  player?: PlayerPlatformState;
  /** Always prefer an array when present, but allow legacy undefined. */
  rivals?: RivalPlatformState[];

  /** Weekly KPI snapshot for UI, recap cards, and debugging. */
  lastWeek?: {
    player?: PlatformWeeklyKpis;
    rivals?: Array<{ id: string; status: RivalPlatformStatus; kpis: PlatformWeeklyKpis }>;
  };

  lastUpdatedWeek?: number;
  lastUpdatedYear?: number;
}


