import type {
  PlatformBrandingLayout,
  PlatformBrandingOverlay,
  PlatformLogoConfig,
  PlatformMarketState,
  PlayerPlatformBranding,
  RivalPlatformState,
} from '@/types/platformEconomy';
import { PROVIDER_DEALS } from '@/data/ProviderDealsDatabase';
import type { TickSystem } from '../core/types';

const DEFAULT_TOTAL_ADDRESSABLE_SUBS = 100_000_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeTierMix(input: any): { adSupportedPct: number; adFreePct: number } {
  const adSupportedPct = typeof input?.adSupportedPct === 'number' ? input.adSupportedPct : 50;
  const adFreePct = typeof input?.adFreePct === 'number' ? input.adFreePct : 50;
  const total = adSupportedPct + adFreePct;
  if (total <= 0) return { adSupportedPct: 50, adFreePct: 50 };
  return {
    adSupportedPct: clamp((adSupportedPct / total) * 100, 0, 100),
    adFreePct: clamp((adFreePct / total) * 100, 0, 100),
  };
}

function bootstrapRivals(totalAddressableSubs: number): RivalPlatformState[] {
  const streamingProviders = PROVIDER_DEALS.filter((p) => p.dealKind === 'streaming');

  return streamingProviders.map((p) => {
    const subscribers = Math.floor(totalAddressableSubs * 0.8 * (p.marketShare / 100));

    return {
      id: p.id,
      name: p.name,
      subscribers,
      cash: Math.floor(p.marketShare * 200_000_000),
      status: 'healthy',
      distressWeeks: 0,
      tierMix: { adSupportedPct: 50, adFreePct: 50 },
      promotionBudgetPerWeek: Math.floor(5_000_000 + p.marketShare * 250_000),
      priceIndex: 1,
      adLoadIndex: 55,
      serviceQuality: 55,
      catalogValue: 50,
      freshness: 55,
    };
  });
}

function normalizeExistingRivals(rivals: any[] | undefined, totalAddressableSubs: number): RivalPlatformState[] {
  const base = Array.isArray(rivals) ? rivals : [];

  const byId = new Map<string, RivalPlatformState>();

  for (const r of base) {
    if (!r || typeof r !== 'object') continue;
    const id = typeof (r as any).id === 'string' ? (r as any).id : null;
    if (!id) continue;

    byId.set(id, {
      id,
      name: typeof (r as any).name === 'string' ? (r as any).name : id,
      subscribers: typeof (r as any).subscribers === 'number' ? Math.max(0, Math.floor((r as any).subscribers)) : 0,
      cash: typeof (r as any).cash === 'number' ? (r as any).cash : 0,
      status: (r as any).status === 'distress' || (r as any).status === 'collapsed' ? (r as any).status : 'healthy',
      distressWeeks: typeof (r as any).distressWeeks === 'number' ? Math.max(0, Math.floor((r as any).distressWeeks)) : 0,
      tierMix: normalizeTierMix((r as any).tierMix),
      promotionBudgetPerWeek:
        typeof (r as any).promotionBudgetPerWeek === 'number' ? Math.max(0, Math.floor((r as any).promotionBudgetPerWeek)) : 0,
      priceIndex: typeof (r as any).priceIndex === 'number' ? (r as any).priceIndex : 1,
      adLoadIndex: typeof (r as any).adLoadIndex === 'number' ? clamp((r as any).adLoadIndex, 0, 100) : 55,
      serviceQuality: typeof (r as any).serviceQuality === 'number' ? clamp((r as any).serviceQuality, 0, 100) : 55,
      catalogValue: typeof (r as any).catalogValue === 'number' ? (r as any).catalogValue : 50,
      freshness: typeof (r as any).freshness === 'number' ? clamp((r as any).freshness, 0, 100) : 55,
    });
  }

  // Ensure at least the default provider rivals exist.
  for (const seeded of bootstrapRivals(totalAddressableSubs)) {
    if (!byId.has(seeded.id)) byId.set(seeded.id, seeded);
  }

  return [...byId.values()];
}



function normalizeBrandingOverlay(input: any): PlatformBrandingOverlay {
  if (input === 'spotlight' || input === 'grid' || input === 'scanlines' || input === 'none') return input;
  return 'spotlight';
}

function normalizeBrandingLayout(input: any): PlatformBrandingLayout | undefined {
  if (input === 'auto' || input === 'default' || input === 'mass' || input === 'prestige') return input;
  return undefined;
}

function normalizeLogo(input: any): PlatformLogoConfig | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const shape = (input as any).shape;
  const normalizedShape =
    shape === 'shield' ||
    shape === 'circle' ||
    shape === 'diamond' ||
    shape === 'hexagon' ||
    shape === 'star' ||
    shape === 'square'
      ? shape
      : undefined;

  const color = typeof (input as any).color === 'string' ? (input as any).color : undefined;
  const accent = typeof (input as any).accent === 'string' ? (input as any).accent : undefined;

  if (!normalizedShape || !color || !accent) return undefined;

  return {
    shape: normalizedShape,
    color,
    accent,
  };
}

function normalizeBranding(input: any): PlayerPlatformBranding | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const primaryColor = typeof (input as any).primaryColor === 'string' ? (input as any).primaryColor : undefined;
  const accentColor = typeof (input as any).accentColor === 'string' ? (input as any).accentColor : undefined;
  const overlay = normalizeBrandingOverlay((input as any).overlay);
  const layout = normalizeBrandingLayout((input as any).layout);
  const logo = normalizeLogo((input as any).logo);

  if (!primaryColor && !accentColor && !logo && overlay === 'spotlight' && !layout) return undefined;

  return {
    primaryColor,
    accentColor,
    overlay,
    layout,
    logo,
  };
}

function normalizePlayerPlatform(player: any | undefined): PlatformMarketState['player'] {
  if (!player || typeof player !== 'object') return undefined;

  const status = (player as any).status;
  const normalizedStatus = status === 'sold' || status === 'shutdown' ? status : 'active';

  return {
    id: typeof (player as any).id === 'string' ? (player as any).id : 'player-platform',
    name: typeof (player as any).name === 'string' ? (player as any).name : 'Your Platform',
    launchedWeek: typeof (player as any).launchedWeek === 'number' ? (player as any).launchedWeek : undefined,
    launchedYear: typeof (player as any).launchedYear === 'number' ? (player as any).launchedYear : undefined,
    closedWeek: typeof (player as any).closedWeek === 'number' ? (player as any).closedWeek : undefined,
    closedYear: typeof (player as any).closedYear === 'number' ? (player as any).closedYear : undefined,
    branding: normalizeBranding((player as any).branding),
    subscribers: typeof (player as any).subscribers === 'number' ? Math.max(0, Math.floor((player as any).subscribers)) : 0,
    cash: typeof (player as any).cash === 'number' ? (player as any).cash : 0,
    status: normalizedStatus,
    distressWeeks: typeof (player as any).distressWeeks === 'number' ? Math.max(0, Math.floor((player as any).distressWeeks)) : 0,
    tierMix: normalizeTierMix((player as any).tierMix),
    promotionBudgetPerWeek:
      typeof (player as any).promotionBudgetPerWeek === 'number' ? Math.max(0, Math.floor((player as any).promotionBudgetPerWeek)) : 0,
    priceIndex: typeof (player as any).priceIndex === 'number' ? (player as any).priceIndex : 1,
    adLoadIndex:
      typeof (player as any).adLoadIndex === 'number' ? clamp((player as any).adLoadIndex, 0, 100) : 55,
    serviceQuality:
      typeof (player as any).serviceQuality === 'number' ? clamp((player as any).serviceQuality, 0, 100) : 55,
    originalsQualityBonus:
      typeof (player as any).originalsQualityBonus === 'number' ? clamp((player as any).originalsQualityBonus, 0, 20) : 0,
    freshness: typeof (player as any).freshness === 'number' ? clamp((player as any).freshness, 0, 100) : undefined,
    catalogValue: typeof (player as any).catalogValue === 'number' ? clamp((player as any).catalogValue, 0, 100) : undefined,
    monthlyPrice: typeof (player as any).monthlyPrice === 'number' ? (player as any).monthlyPrice : undefined,
    contentSpendPerWeek: typeof (player as any).contentSpendPerWeek === 'number' ? (player as any).contentSpendPerWeek : undefined,
    vibe: typeof (player as any).vibe === 'string' ? (player as any).vibe : undefined,
    lastOfferYear: typeof (player as any).lastOfferYear === 'number' ? (player as any).lastOfferYear : undefined,
    lastLicenseOfferYear:
      typeof (player as any).lastLicenseOfferYear === 'number'
        ? (player as any).lastLicenseOfferYear
        : typeof (player as any).lastOfferYear === 'number'
          ? (player as any).lastOfferYear
          : undefined,
    lastMnaOfferYear: typeof (player as any).lastMnaOfferYear === 'number' ? (player as any).lastMnaOfferYear : undefined,
    lastTalentOfferYear: typeof (player as any).lastTalentOfferYear === 'number' ? (player as any).lastTalentOfferYear : undefined,
    lastBiddingWarYear: typeof (player as any).lastBiddingWarYear === 'number' ? (player as any).lastBiddingWarYear : undefined,
    lastOutageYear: typeof (player as any).lastOutageYear === 'number' ? (player as any).lastOutageYear : undefined,
  };
}

export const PlatformMarketBootstrapSystem: TickSystem = {
  id: 'platformMarketBootstrap',
  label: 'Platform market bootstrap (Streaming Wars)',
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const raw = (state as any).platformMarket as PlatformMarketState | undefined;

    const totalAddressableSubs =
      typeof raw?.totalAddressableSubs === 'number' && raw.totalAddressableSubs > 0
        ? raw.totalAddressableSubs
        : DEFAULT_TOTAL_ADDRESSABLE_SUBS;

    const rivals = normalizeExistingRivals(raw?.rivals as any, totalAddressableSubs);
    const player = normalizePlayerPlatform(raw?.player as any);

    const nextMarket: PlatformMarketState = {
      ...raw,
      totalAddressableSubs,
      player,
      rivals,
      lastUpdatedWeek: ctx.week,
      lastUpdatedYear: ctx.year,
    };

    // Avoid unnecessary churn when already bootstrapped.
    const already = raw && typeof raw === 'object' && Array.isArray(raw.rivals) && raw.rivals.length > 0;
    if (already && raw.totalAddressableSubs === nextMarket.totalAddressableSubs) {
      // Still update timestamp.
      if (raw.lastUpdatedWeek === ctx.week && raw.lastUpdatedYear === ctx.year) return state;
      return { ...state, platformMarket: nextMarket };
    }

    return {
      ...state,
      platformMarket: nextMarket,
    };
  },
};
