// Platform economy / market state types (Streaming Wars)
//
// Notes:
// - This is additive, optional state; old saves may not have it.
// - Keep it resilient to partial/legacy shapes: most fields are optional.

export type PlatformOperationalStatus = 'active' | 'sold' | 'shutdown';
export type RivalPlatformStatus = 'healthy' | 'distress' | 'collapsed';

export type PlatformBrandingOverlay = 'spotlight' | 'grid' | 'scanlines' | 'none';

export type PlatformBrandingLayout = 'auto' | 'default' | 'mass' | 'prestige';

export interface PlatformLogoConfig {
  shape: 'shield' | 'circle' | 'diamond' | 'hexagon' | 'star' | 'square';
  color: string; // key from shared palette (see StudioIconCustomizer)
  accent: string; // key from shared palette (see StudioIconCustomizer)
}

export interface PlayerPlatformBranding {
  /** Palette id for primary UI accents. */
  primaryColor?: string;
  /** Palette id for UI accents + highlights. */
  accentColor?: string;
  overlay?: PlatformBrandingOverlay;
  /** Controls which in-universe app template is used. */
  layout?: PlatformBrandingLayout;
  logo?: PlatformLogoConfig;
}

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

  /** Last time the platform loop was closed (sold/shutdown). Used for relaunch cooldown. */
  closedWeek?: number;
  closedYear?: number;

  branding?: PlayerPlatformBranding;

  subscribers: number;
  /** Platform cash proxy (used for distress modelling). */
  cash: number;
  status: PlatformOperationalStatus;

  tierMix?: PlatformTierMix;
  /** Weekly promotion spend (abstracted algorithm control). */
  promotionBudgetPerWeek?: number;
  /** Abstract price competitiveness index (0.5–1.5 typical). */
  priceIndex?: number;

  /** 0–100 ad load intensity (higher = more ad ARPU, worse churn on ad tier). */
  adLoadIndex?: number;

  /** 0–100 service reliability/quality (separate from content freshness). */
  serviceQuality?: number;

  /** 0–20 baseline script quality bonus applied to platform Originals (from talent deal events). */
  originalsQualityBonus?: number;

  /** 0–100; retention proxy used by churn/acquisition model. */
  freshness?: number;
  /** 0–100; long-tail catalog depth proxy. */
  catalogValue?: number;

  /** Internal: prevents spamming annual overall-deal/talent poaching offers. */
  lastTalentOfferYear?: number;

  /** Internal: prevents spamming annual bidding war offers. */
  lastBiddingWarYear?: number;

  /** Flavor: chosen at launch. */
  vibe?: string;

  /** Distress counter used for extreme hard-fail gating. */
  distressWeeks?: number;

  /** Internal (legacy): last time we generated a major platform business offer (prevents spam). */
  lastOfferYear?: number;

  /** Internal: prevents spamming annual licensing offers. */
  lastLicenseOfferYear?: number;

  /** Internal: prevents spamming annual M&A offers. */
  lastMnaOfferYear?: number;

  /** Internal: ensures the outage crisis is at most once per year. */
  lastOutageYear?: number;

  // Optional knobs for future economy simulation
  monthlyPrice?: number;
  contentSpendPerWeek?: number;
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
  promotionBudgetPerWeek?: number;
  priceIndex?: number;
  adLoadIndex?: number;
  serviceQuality?: number;
  catalogValue?: number;
  freshness?: number; // 0–100
}

export interface PlatformMarketLastWeek {
  player?: PlatformWeeklyKpis;
  rivals?: Array<{ id: string; status: RivalPlatformStatus; kpis: PlatformWeeklyKpis }>;
}

export interface PlatformMarketState {
  /** Global market headroom for this save. */
  totalAddressableSubs?: number;

  player?: PlayerPlatformState;
  /** Always prefer an array when present, but allow legacy undefined. */
  rivals?: RivalPlatformState[];

  /** Optional telemetry snapshot for UI and event triggers. */
  lastWeek?: PlatformMarketLastWeek;

  lastUpdatedWeek?: number;
  lastUpdatedYear?: number;
}




