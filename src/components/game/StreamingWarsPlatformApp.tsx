import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGameStore } from '@/game/store';
import type { Genre, PostTheatricalRelease, Project, Script } from '@/types/game';
import type { EpisodeData, SeasonData, StreamingContract } from '@/types/streamingTypes';
import {
  getContractPlatformId,
  getDistributionChannelPlatformId,
  getReleaseStrategyPlatformId,
  getReleaseWindowPlatformId,
  isProjectOnPlatformAtTime,
} from '@/utils/platformIds';
import { stableInt } from '@/utils/stableRandom';
import { isDebugUiEnabled } from '@/utils/debugFlags';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import { getPlatformRelaunchWindow } from '@/utils/platformRelaunch';
import { StreamingPlatformPreview } from './StreamingPlatformPreview';
import { StudioIconCustomizer, DEFAULT_ICON, ICON_COLORS, ACCENT_COLORS, type StudioIconConfig } from './StudioIconCustomizer';
import type { PlayerPlatformBranding } from '@/types/platformEconomy';
import { BarChart3, Crown, Film, Home, LayoutGrid, Swords, TrendingUp, Users } from 'lucide-react';

const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const USD_COMPACT_FORMAT = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const USD_FORMAT = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCompact = (value: number) => {
  return COMPACT_NUMBER_FORMAT.format(value);
};

const formatUsdCompact = (value: number) => {
  return USD_COMPACT_FORMAT.format(value);
};

const formatUsd = (value: number) => {
  return USD_FORMAT.format(value);
};

const clamp = (n: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, n));
};

const clampInt = (n: number, min: number, max: number) => {
  return Math.floor(clamp(n, min, max));
};

const computeMonthlyPrice = (priceIndex: number) => {
  return Math.round(12.99 * clamp(priceIndex, 0.6, 1.7) * 100) / 100;
};

const ORIGINAL_PHASE_WEEKS: Record<'development' | 'production' | 'post-production', number> = {
  development: 8,
  production: 12,
  'post-production': 6,
};

const VIBE_BRANDING_PRESETS: Record<string, PlayerPlatformBranding> = {
  prestige: {
    primaryColor: 'amethyst',
    accentColor: 'white',
    overlay: 'none',
    logo: { shape: 'circle', color: 'amethyst', accent: 'white' },
  },
  mass: {
    primaryColor: 'crimson',
    accentColor: 'white',
    overlay: 'none',
    logo: { shape: 'square', color: 'crimson', accent: 'white' },
  },
  bundle: {
    primaryColor: 'emerald',
    accentColor: 'black',
    overlay: 'spotlight',
    logo: { shape: 'hexagon', color: 'emerald', accent: 'black' },
  },
  genre: {
    primaryColor: 'crimson',
    accentColor: 'gold',
    overlay: 'scanlines',
    logo: { shape: 'star', color: 'crimson', accent: 'gold' },
  },
  global: {
    primaryColor: 'amethyst',
    accentColor: 'silver',
    overlay: 'spotlight',
    logo: { shape: 'diamond', color: 'amethyst', accent: 'silver' },
  },
};

function getVibeBrandingPreset(vibe: string | undefined): PlayerPlatformBranding {
  if (vibe && VIBE_BRANDING_PRESETS[vibe]) return VIBE_BRANDING_PRESETS[vibe];
  return VIBE_BRANDING_PRESETS.prestige;
}

const estimateOriginalWeeksToPremiere = (project: Project): number | null => {
  if (!project?.id?.startsWith('project:original:')) return null;
  if (project.status === 'released') return 0;

  const phase =
    project.currentPhase === 'development' || project.currentPhase === 'production' || project.currentPhase === 'post-production'
      ? project.currentPhase
      : project.status === 'development' || project.status === 'production' || project.status === 'post-production'
        ? project.status
        : null;

  if (!phase) return null;

  const thisPhase = ORIGINAL_PHASE_WEEKS[phase];
  const remainingThisPhase = typeof project.phaseDuration === 'number' && project.phaseDuration > 0 ? Math.floor(project.phaseDuration) : thisPhase;

  if (phase === 'development') return remainingThisPhase + ORIGINAL_PHASE_WEEKS.production + ORIGINAL_PHASE_WEEKS['post-production'];
  if (phase === 'production') return remainingThisPhase + ORIGINAL_PHASE_WEEKS['post-production'];
  return remainingThisPhase;
};

const estimateOriginalWeeklySpend = (project: Project): number | null => {
  const phase =
    project.currentPhase === 'development' || project.currentPhase === 'production' || project.currentPhase === 'post-production'
      ? project.currentPhase
      : project.status === 'development' || project.status === 'production' || project.status === 'post-production'
        ? project.status
        : null;

  if (!phase) return null;

  const totalBudget = Math.max(0, Math.floor(project.budget?.total ?? 0));

  const phaseWeights: Record<'development' | 'production' | 'post-production', number> = {
    development: 0.15,
    production: 0.65,
    'post-production': 0.2,
  };

  const duration = ORIGINAL_PHASE_WEEKS[phase];
  const perWeek = duration > 0 ? (totalBudget * phaseWeights[phase]) / duration : 0;

  return clampInt(perWeek, 250_000, 15_000_000);
};

const absWeek = (week: number, year: number) => {
  return year * 52 + week;
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const statusVariant = (status: string | undefined): BadgeVariant => {
  switch (status) {
    // Player platform operational
    case 'shutdown':
      return 'destructive';
    case 'sold':
      return 'secondary';
    case 'active':
      return 'default';

    // Rival health
    case 'collapsed':
      return 'destructive';
    case 'distress':
      return 'secondary';
    case 'healthy':
      return 'default';

    default:
      return 'outline';
  }
};

export const StreamingWarsPlatformApp: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const setGameState = useGameStore((s) => s.setGameState);
  const addProject = useGameStore((s) => s.addProject);
  const upsertScript = useGameStore((s) => s.upsertScript);
  const spendStudioFunds = useGameStore((s) => s.spendStudioFunds);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateBudget = useGameStore((s) => s.updateBudget);

  const platformMarket = gameState?.platformMarket;

  const [launchOpen, setLaunchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [launchName, setLaunchName] = useState('');
  const [launchVibe, setLaunchVibe] = useState('prestige');
  const [launchAdSupportedPct, setLaunchAdSupportedPct] = useState(50);
  const [launchAdLoadIndex, setLaunchAdLoadIndex] = useState(55);
  const [launchPriceIndex, setLaunchPriceIndex] = useState(1);
  const [launchPromoBudget, setLaunchPromoBudget] = useState(15_000_000);

  const [brandingConflictOpen, setBrandingConflictOpen] = useState(false);
  const [brandingConflictMessage, setBrandingConflictMessage] = useState('');

  const [originalsOpen, setOriginalsOpen] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalGenre, setOriginalGenre] = useState<Genre>('drama');
  const [originalEpisodeCount, setOriginalEpisodeCount] = useState(10);
  const [originalEpisodeBudget, setOriginalEpisodeBudget] = useState(2_500_000);
  const [originalReleaseFormat, setOriginalReleaseFormat] = useState<'weekly' | 'binge' | 'batch'>('weekly');

  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseProject, setLicenseProject] = useState<Project | null>(null);
  const [licenseRivalId, setLicenseRivalId] = useState('');
  const [licenseDurationWeeks, setLicenseDurationWeeks] = useState(26);

  const [titleOpen, setTitleOpen] = useState(false);
  const [titleProject, setTitleProject] = useState<Project | null>(null);

  const {
    player,
    rivals,
    totalAddressableSubs,
    accountedSubs,
    rivalsCount,
    playerSharePct,
    playerPlatformId,
    titlesOnPlatform,
    originals,
  } = useMemo(() => {
    const player = platformMarket?.player;
    const rivals = platformMarket?.rivals ?? [];

    const accountedSubs = (player?.subscribers ?? 0) + rivals.reduce((sum, rival) => sum + (rival.subscribers ?? 0), 0);

    const totalAddressableSubs =
      typeof platformMarket?.totalAddressableSubs === 'number' && platformMarket.totalAddressableSubs > 0
        ? platformMarket.totalAddressableSubs
        : accountedSubs;

    const rivalsCount = rivals.length;

    const playerSharePct = player && totalAddressableSubs > 0 ? (player.subscribers / totalAddressableSubs) * 100 : 0;

    const playerPlatformId = player?.id;

    const week = gameState?.currentWeek ?? 0;
    const year = gameState?.currentYear ?? 0;

    const candidates = [
      ...(gameState?.projects ?? []),
      ...(gameState?.aiStudioProjects ?? []),
      ...(gameState?.allReleases ?? []),
    ].filter((p): p is Project => !!p && typeof (p as any).id === 'string' && !!(p as any).script);

    const seenProjectIds = new Set<string>();
    const uniqueCandidates = candidates.filter((p) => {
      if (seenProjectIds.has(p.id)) return false;
      seenProjectIds.add(p.id);
      return true;
    });

    const titlesOnPlatform = playerPlatformId
      ? uniqueCandidates.filter((p) => isProjectOnPlatformAtTime(p, playerPlatformId, week, year))
      : [];

    const originals = playerPlatformId
      ? (gameState?.projects ?? []).filter((p) => getContractPlatformId(p.streamingContract) === playerPlatformId)
      : [];

    return {
      player,
      rivals,
      totalAddressableSubs,
      accountedSubs,
      rivalsCount,
      playerSharePct,
      playerPlatformId,
      titlesOnPlatform,
      originals,
    };
  }, [gameState?.projects, gameState?.aiStudioProjects, gameState?.allReleases, platformMarket]);

  const effectiveBranding = useMemo(() => {
    const preset = getVibeBrandingPreset(player?.vibe);
    const branding = player?.branding ?? {};

    return {
      primaryColor: branding.primaryColor ?? preset.primaryColor,
      accentColor: branding.accentColor ?? preset.accentColor,
      overlay: branding.overlay ?? preset.overlay,
      layout: branding.layout ?? 'auto',
      logo: (branding.logo as StudioIconConfig | undefined) ?? (preset.logo as StudioIconConfig | undefined) ?? DEFAULT_ICON,
    } satisfies PlayerPlatformBranding;
  }, [player?.branding, player?.vibe]);

  const updatePlayerBranding = (patch: Partial<PlayerPlatformBranding>) => {
    if (!playerPlatformId) return;

    setGameState((prev) => {
      const pm = prev.platformMarket;
      if (!pm?.player) return prev;
      if (pm.player.id !== playerPlatformId) return prev;
      if (pm.player.status !== 'active') return prev;

      return {
        ...prev,
        platformMarket: {
          ...pm,
          player: {
            ...pm.player,
            branding: {
              ...(pm.player.branding ?? {}),
              ...patch,
            },
          },
        },
      };
    });
  };

  const launchCost = 75_000_000;

  const debugUi = isDebugUiEnabled();

  const releasedProjectsCount = (gameState?.projects ?? []).filter((p) => p.status === 'released').length;
  const hasEnoughBudget = (gameState?.studio.budget ?? 0) >= launchCost;
  const hasEnoughReputation = (gameState?.studio.reputation ?? 0) >= 60;
  const hasEnoughReleases = releasedProjectsCount >= 12;

  const relaunchWindow = getPlatformRelaunchWindow({
    player,
    currentWeek: gameState?.currentWeek ?? 0,
    currentYear: gameState?.currentYear ?? 0,
  });

  const canLaunchNewPlatform =
    !player &&
    ((hasEnoughBudget && hasEnoughReputation && hasEnoughReleases) || debugUi);

  const canRelaunchPlatform =
    !!player &&
    player.status !== 'active' &&
    relaunchWindow.canRelaunch &&
    ((hasEnoughBudget && hasEnoughReputation) || debugUi);

  const canLaunchPlatform = canLaunchNewPlatform || canRelaunchPlatform;

  const ensureLaunchDefaults = () => {
    if (launchName.trim().length === 0) {
      setLaunchName(`${gameState?.studio.name ?? 'Studio'}+`);
    }
  };

  const getDirectPlatformId = (project: Project): string | null => {
    return (
      getContractPlatformId(project.streamingContract) ||
      project.streamingPremiereDeal?.providerId ||
      getReleaseStrategyPlatformId(project.releaseStrategy) ||
      getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
      getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]) ||
      null
    );
  };

  const isExclusiveTitle = (project: Project): boolean => {
    const exclusiveFlag = project.releaseStrategy?.streamingExclusive;
    const contractExclusive = (project.streamingContract as any)?.exclusivityClause;
    return exclusiveFlag !== false && contractExclusive !== false;
  };

  const hasRivalStreamingWindow = (project: Project, platformId: string): boolean => {
    return (project.postTheatricalReleases ?? []).some((r: any) => {
      if (!r || r.platform !== 'streaming') return false;
      const pid = r.providerId || r.platformId;
      return pid && pid !== platformId;
    });
  };

  const computeLicenseOffer = (project: Project, rivalId: string, durationWeeks: number): number => {
    const quality = project.script?.quality ?? 60;
    const duration = clampInt(durationWeeks, 8, 52);

    const rival = rivals.find((r) => r.id === rivalId);
    const sizeFactor = rival ? clampInt(rival.subscribers ?? 0, 0, 100_000_000) / 80_000_000 : 0.6;

    const base = 18_000_000 + quality * 650_000;
    const durationFactor = duration / 26;

    return clampInt(base * durationFactor * (0.85 + sizeFactor * 0.35), 15_000_000, 280_000_000);
  };

  type StrategicSaleOffer = {
    buyerId: string;
    buyerName: string;
    salePrice: number;
    transferredSubs: number;
    transferredCatalog: number;
  };

  type OutputDealOffer = {
    buyerId: string;
    buyerName: string;
    upfrontPayment: number;
    termWeeks: number;
    windowDelayWeeks: number;
    windowDurationWeeks: number;
  };

  

  const openLicenseDialog = (project: Project) => {
    if (!playerPlatformId) return;

    const eligible = rivals.filter((r) => r.status !== 'collapsed');
    if (eligible.length === 0) return;

    setLicenseProject(project);
    setLicenseRivalId(eligible[0].id);
    setLicenseDurationWeeks(26);
    setLicenseOpen(true);
  };

  const licenseOffer = useMemo(() => {
    if (!licenseProject || !licenseRivalId) return 0;
    return computeLicenseOffer(licenseProject, licenseRivalId, licenseDurationWeeks);
  }, [licenseDurationWeeks, licenseProject, licenseRivalId]);

  const strategicSaleOffers = useMemo((): StrategicSaleOffer[] => {
    if (!player || player.status !== 'active') return [];

    const eligible = rivals.filter((r) => r.status !== 'collapsed');
    if (eligible.length === 0) return [];

    const subs = Math.max(0, Math.floor(player.subscribers ?? 0));
    const freshness = clamp(player.freshness ?? 50, 0, 100);
    const catalogValue = clamp(player.catalogValue ?? 40, 0, 100);
    const serviceQuality = clamp(player.serviceQuality ?? 55, 0, 100);

    const profit = platformMarket?.lastWeek?.player?.profit ?? 0;
    const annualProfit = Math.max(0, profit) * 52;
    const profitComponent = profit > 0 ? annualProfit * 3.5 : 0;

    const qualityComponent = freshness * 1_200_000 + catalogValue * 1_000_000 + serviceQuality * 600_000;

    const seedBase = `${gameState?.universeSeed ?? 0}|platform:strategic-sale|${gameState?.currentYear ?? 0}:W${gameState?.currentWeek ?? 0}|${player.id}`;

    return eligible
      .map((rival) => {
        const sizeRatio = totalAddressableSubs > 0 ? clamp((rival.subscribers ?? 0) / totalAddressableSubs, 0, 1) : 0.4;
        const perSub = clamp(28 + sizeRatio * 18, 24, 48);

        const base = subs * perSub + qualityComponent + profitComponent;

        const jitter = stableInt(`${seedBase}|${rival.id}|jitter`, -7, 7) / 100;
        const salePrice = clampInt(base * (1 + jitter), 75_000_000, 12_000_000_000);

        const transferPct = stableInt(`${seedBase}|${rival.id}|transfer`, 86, 95) / 100;
        const transferredSubs = Math.floor(subs * transferPct);
        const transferredCatalog = clamp((player.catalogValue ?? 40) * transferPct, 0, 100);

        return {
          buyerId: rival.id,
          buyerName: rival.name,
          salePrice,
          transferredSubs,
          transferredCatalog,
        };
      })
      .sort((a, b) => b.salePrice - a.salePrice);
  }, [
    gameState?.currentWeek,
    gameState?.currentYear,
    gameState?.universeSeed,
    platformMarket?.lastWeek?.player?.profit,
    player,
    rivals,
    totalAddressableSubs,
  ]);

  const bestStrategicSaleOffer = strategicSaleOffers[0] ?? null;

  const outputDealOffers = useMemo((): OutputDealOffer[] => {
    if (!player || player.status !== 'active') return [];
    if (player.outputDeal) return [];

    const eligible = rivals.filter((r) => r.status !== 'collapsed');
    if (eligible.length === 0) return [];

    const subs = Math.max(0, Math.floor(player.subscribers ?? 0));
    const freshness = clamp(player.freshness ?? 50, 0, 100);
    const catalogValue = clamp(player.catalogValue ?? 40, 0, 100);

    const termWeeks = 52;
    const windowDelayWeeks = 14;
    const windowDurationWeeks = 26;

    const base = 85_000_000 + subs * 11 + freshness * 850_000 + catalogValue * 700_000;

    const seedBase = `${gameState?.universeSeed ?? 0}|platform:output-deal|${gameState?.currentYear ?? 0}:W${gameState?.currentWeek ?? 0}|${player.id}`;

    return eligible
      .map((rival) => {
        const sizeBoost = clampInt((rival.subscribers ?? 0) / 1_000_000, 0, 120) * 3_200_000;
        const jitter = stableInt(`${seedBase}|${rival.id}|jitter`, -8, 10) / 100;

        const upfrontPayment = clampInt((base + sizeBoost) * (1 + jitter), 60_000_000, 4_500_000_000);

        return {
          buyerId: rival.id,
          buyerName: rival.name,
          upfrontPayment,
          termWeeks,
          windowDelayWeeks,
          windowDurationWeeks,
        };
      })
      .sort((a, b) => b.upfrontPayment - a.upfrontPayment);
  }, [
    gameState?.currentWeek,
    gameState?.currentYear,
    gameState?.universeSeed,
    player,
    rivals,
  ]);

  const bestOutputDealOffer = outputDealOffers[0] ?? null;

  const outputDealBuyout = useMemo(() => {
    if (!gameState) return null;
    if (!player || player.status !== 'active') return null;
    if (!player.outputDeal) return null;

    const currentAbs = absWeek(gameState.currentWeek ?? 0, gameState.currentYear ?? 0);
    const endAbs = absWeek(player.outputDeal.endWeek, player.outputDeal.endYear);
    const remainingWeeks = Math.max(0, endAbs - currentAbs);

    const base = Math.floor(player.outputDeal.upfrontPayment * 0.45);
    const timeComponent = remainingWeeks * 2_500_000;

    const buyoutCost = clampInt(base + timeComponent, 40_000_000, Math.max(80_000_000, player.outputDeal.upfrontPayment));

    return { buyoutCost, remainingWeeks };
  }, [gameState, player]);

  const shutdownPlan = useMemo(() => {
    if (!player || player.status !== 'active') return null;

    const subs = Math.max(0, Math.floor(player.subscribers ?? 0));
    const catalogValue = clamp(player.catalogValue ?? 40, 0, 100);

    const proceeds = clampInt(12_000_000 + subs * 8 + catalogValue * 650_000, 10_000_000, 950_000_000);

    const recipient = rivals
      .filter((r) => r.status !== 'collapsed')
      .sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))[0];

    const transferredSubs = recipient ? Math.floor(subs * 0.65) : 0;

    return {
      proceeds,
      transferredSubs,
      recipientId: recipient?.id,
      recipientName: recipient?.name,
    };
  }, [player, rivals]);

  const libraryPackageTitles = useMemo(() => {
    if (!gameState) return [] as Project[];
    if (!playerPlatformId) return [] as Project[];
    if (!player || player.status !== 'active') return [] as Project[];

    return titlesOnPlatform
      .filter((p) => p && p.status === 'released')
      .filter((p) => getDirectPlatformId(p) === playerPlatformId)
      .filter((p) => isExclusiveTitle(p))
      .filter((p) => !hasRivalStreamingWindow(p, playerPlatformId))
      .slice()
      .sort((a, b) => {
        const aAbs = typeof a.releaseWeek === 'number' && typeof a.releaseYear === 'number' ? absWeek(a.releaseWeek, a.releaseYear) : 0;
        const bAbs = typeof b.releaseWeek === 'number' && typeof b.releaseYear === 'number' ? absWeek(b.releaseWeek, b.releaseYear) : 0;
        return (bAbs - aAbs) || a.title.localeCompare(b.title);
      })
      .slice(0, 4);
  }, [gameState, player, playerPlatformId, titlesOnPlatform]);

  const libraryLicensingOffers = useMemo(() => {
    if (!player || player.status !== 'active') return [] as Array<{ buyerId: string; buyerName: string; licenseFee: number; windowWeeks: number; titleProjectIds: string[] }>;
    if (libraryPackageTitles.length === 0) return [] as Array<{ buyerId: string; buyerName: string; licenseFee: number; windowWeeks: number; titleProjectIds: string[] }>;

    const titleProjectIds = libraryPackageTitles.map((t) => t.id);

    const totalQuality = libraryPackageTitles.reduce((sum, p) => sum + (p.script?.quality ?? 60), 0);
    const subs = Math.max(0, Math.floor(player.subscribers ?? 0));

    const base = 30_000_000 + totalQuality * 650_000 + subs * 7;

    const seedBase = `${gameState?.universeSeed ?? 0}|platform:library-package|${gameState?.currentYear ?? 0}:W${gameState?.currentWeek ?? 0}|${player.id}`;

    const windowWeeks = 26;

    return rivals
      .filter((r) => r.status !== 'collapsed')
      .map((r) => {
        const sizeBoost = clampInt((r.subscribers ?? 0) / 1_000_000, 0, 120) * 900_000;
        const jitter = stableInt(`${seedBase}|${r.id}|jitter`, -8, 10) / 100;
        const licenseFee = clampInt((base + sizeBoost) * (1 + jitter), 20_000_000, 650_000_000);

        return {
          buyerId: r.id,
          buyerName: r.name,
          licenseFee,
          windowWeeks,
          titleProjectIds,
        };
      })
      .sort((a, b) => b.licenseFee - a.licenseFee);
  }, [gameState?.currentWeek, gameState?.currentYear, gameState?.universeSeed, libraryPackageTitles, player, rivals]);

  const librarySyndicationPayouts = useMemo(() => {
    if (libraryLicensingOffers.length === 0) {
      return { top2: 0, all: 0 };
    }

    const top2 =
      libraryLicensingOffers.length >= 2
        ? Math.floor(libraryLicensingOffers[0].licenseFee * 0.78 + libraryLicensingOffers[1].licenseFee * 0.78)
        : 0;

    const all = Math.floor(libraryLicensingOffers.reduce((sum, o) => sum + o.licenseFee, 0) * 0.55);

    return { top2, all };
  }, [libraryLicensingOffers]);

  const queueStrategicSaleEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;

    const offers = strategicSaleOffers;
    if (offers.length === 0) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      if (!pm || !pl || pl.status !== 'active') return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:strategic-sale:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const title = `Strategic sale: ${pl.name}`;
      const description = `Rivals are willing to buy ${pl.name}. You'll receive cash upfront, your subscribers transfer to the buyer, and the brand is locked (no relaunch under the same name).`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'market',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:strategic-sale',
              playerPlatformId: pl.id,
              offers,
            },
            choices: [
              ...offers.map((o) => ({
                id: `sell:${o.buyerId}`,
                text: `Sell to ${o.buyerName} (${formatUsdCompact(o.salePrice)})`,
                consequences: [
                  { type: 'budget', impact: o.salePrice, description: `${pl.name} sale proceeds` },
                  { type: 'reputation', impact: -1, description: 'Strategic exit optics' },
                ],
              })),
              { id: 'keep', text: 'Stay independent', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const queueOutputDealEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;
    if (player.outputDeal) return;

    const offers = outputDealOffers;
    if (offers.length === 0) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      if (!pm || !pl || pl.status !== 'active') return prev;
      if ((pl as any).outputDeal) return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:output-deal:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const title = `Output deal: ${pl.name}`;
      const description = `Rivals want a pay-one output deal for your future theatrical releases. You get a big minimum guarantee now, but your exclusivity moat weakens over the next year.`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'market',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:output-deal',
              playerPlatformId: pl.id,
              offers,
            },
            choices: [
              ...offers.map((o) => ({
                id: `output:${o.buyerId}`,
                text: `Sign with ${o.buyerName} (${formatUsdCompact(o.upfrontPayment)})`,
                consequences: [
                  { type: 'budget', impact: o.upfrontPayment, description: 'Output deal guarantee' },
                  { type: 'reputation', impact: -1, description: 'Exclusivity optics' },
                ],
              })),
              { id: 'pass', text: 'Pass (stay exclusive)', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const queueOutputDealBuyoutEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;
    if (!player.outputDeal) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      const deal = (pl as any)?.outputDeal;
      if (!pm || !pl || pl.status !== 'active' || !deal) return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:output-deal-buyout:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const currentAbs = absWeek(week, year);
      const endAbs = absWeek(deal.endWeek, deal.endYear);
      const remainingWeeks = Math.max(0, endAbs - currentAbs);

      const base = Math.floor((deal.upfrontPayment ?? 0) * 0.45);
      const timeComponent = remainingWeeks * 2_500_000;
      const buyoutCost = clampInt(base + timeComponent, 40_000_000, Math.max(80_000_000, deal.upfrontPayment ?? 0));

      const title = `Buy out output deal: ${pl.name}`;
      const description = `You can pay a termination fee to end the output deal early. Future theatrical releases will remain exclusive unless you sign a new agreement.`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'market',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:output-deal-buyout',
              playerPlatformId: pl.id,
              buyoutCost,
              remainingWeeks,
              partnerId: deal.partnerId,
              partnerName: deal.partnerName,
            },
            choices: [
              {
                id: 'buyout',
                text: `Pay buyout (${formatUsdCompact(buyoutCost)})`,
                consequences: [{ type: 'budget', impact: -buyoutCost, description: 'Termination fee' }],
              },
              { id: 'keep', text: 'Keep the output deal', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const queueVoluntaryShutdownEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;
    if (!shutdownPlan) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      if (!pm || !pl || pl.status !== 'active') return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:voluntary-shutdown:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const title = `Voluntary shutdown: ${pl.name}`;
      const description = `You can shut down ${pl.name} now to stop the bleed. You'll take a one-time liquidation payout, but most subscribers will churn into rival services and the brand will be locked.`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'crisis',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:voluntary-shutdown',
              playerPlatformId: pl.id,
              proceeds: shutdownPlan.proceeds,
              transferredSubs: shutdownPlan.transferredSubs,
              recipientId: shutdownPlan.recipientId,
              recipientName: shutdownPlan.recipientName,
            },
            choices: [
              {
                id: 'shutdown',
                text: `Shut down (${formatUsdCompact(shutdownPlan.proceeds)} proceeds)`,
                consequences: [
                  { type: 'budget', impact: shutdownPlan.proceeds, description: 'Liquidation proceeds' },
                  { type: 'reputation', impact: -3, description: 'Shutdown optics' },
                ],
              },
              { id: 'keep', text: 'Keep the platform running', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const queueLibraryLicensingEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;

    const offers = libraryLicensingOffers;
    if (offers.length === 0) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      if (!pm || !pl || pl.status !== 'active') return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:library-licensing:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const titles = offers[0]?.titleProjectIds?.length ?? 0;

      const title = `Library package: ${pl.name}`;
      const description = `Rivals want a time-limited package of your exclusives (${titles} titles). You get cash now, but your moat weakens and churn rises.`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'market',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:library-licensing',
              playerPlatformId: pl.id,
              offers,
            },
            choices: [
              ...offers.map((o) => ({
                id: `license:${o.buyerId}`,
                text: `License to ${o.buyerName} (${formatUsdCompact(o.licenseFee)})`,
                consequences: [
                  { type: 'budget', impact: o.licenseFee, description: 'Licensing fee' },
                  { type: 'reputation', impact: -1, description: 'Exclusivity optics' },
                ],
              })),
              { id: 'keep', text: 'Keep the library exclusive', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const queueLibrarySyndicationEvent = () => {
    if (!player || player.status !== 'active') return;
    if (!gameState) return;

    const offers = libraryLicensingOffers;
    if (offers.length < 2) return;

    const top2Payout = librarySyndicationPayouts.top2;
    const allPayout = librarySyndicationPayouts.all;

    if (top2Payout <= 0 && allPayout <= 0) return;

    setGameState((prev) => {
      if ((prev.eventQueue || []).length > 0) return prev;

      const pm = prev.platformMarket;
      const pl = pm?.player;
      if (!pm || !pl || pl.status !== 'active') return prev;

      const year = prev.currentYear;
      const week = prev.currentWeek;
      const eventId = `platform:library-syndication:${year}:W${week}:${pl.id}`;

      if ((prev.eventQueue || []).some((e) => e.id === eventId)) return prev;

      const titles = offers[0]?.titleProjectIds?.length ?? 0;

      const title = `Library syndication: ${pl.name}`;
      const description = `Instead of one buyer, you can syndicate a package of your exclusives (${titles} titles) across multiple rival services. You get cash now, but exclusivity erosion is severe.`;

      return {
        ...prev,
        eventQueue: [
          ...(prev.eventQueue || []),
          {
            id: eventId,
            title,
            description,
            type: 'market',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'platform:library-syndication',
              playerPlatformId: pl.id,
              offers,
              top2Payout,
              allPayout,
            },
            choices: [
              {
                id: 'syndicate:top2',
                text: `Syndicate to top 2 (${formatUsdCompact(top2Payout)})`,
                consequences: [
                  { type: 'budget', impact: top2Payout, description: 'Syndication proceeds' },
                  { type: 'reputation', impact: -2, description: 'Exclusivity optics' },
                ],
              },
              {
                id: 'syndicate:all',
                text: `Syndicate to all rivals (${formatUsdCompact(allPayout)})`,
                consequences: [
                  { type: 'budget', impact: allPayout, description: 'Syndication proceeds' },
                  { type: 'reputation', impact: -3, description: 'Exclusivity optics' },
                ],
              },
              { id: 'keep', text: 'Keep the library exclusive', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });
  };

  const openTitle = (project: Project) => {
    setTitleProject(project);
    setTitleOpen(true);
  };

  const { heroTitle, topTen, newArrivals, originalsReleased, comingSoon } = useMemo(() => {
    const playerPlatformId = player?.id;

    if (!gameState || !playerPlatformId || player?.status !== 'active') {
      return {
        heroTitle: null as Project | null,
        topTen: [] as Project[],
        newArrivals: [] as Project[],
        originalsReleased: [] as Project[],
        comingSoon: [] as Array<{ project: Project; arrivalAbs?: number; label: string }>,
      };
    }

    const week = gameState.currentWeek ?? 0;
    const year = gameState.currentYear ?? 0;
    const currentAbs = absWeek(week, year);

    const releasedOnPlatform = titlesOnPlatform.filter((p) => p.status === 'released');

    const scored = releasedOnPlatform
      .map((p) => {
        const quality = p.script?.quality ?? 60;
        const relAbs = typeof p.releaseWeek === 'number' && typeof p.releaseYear === 'number' ? absWeek(p.releaseWeek, p.releaseYear) : currentAbs;
        const weeksSince = Math.max(0, currentAbs - relAbs);
        const recency = Math.max(0, 18 - weeksSince);
        const noise = stableInt(`${gameState.universeSeed || 'seed'}|platform-trending|${year}:W${week}|${p.id}`, 0, 40);
        const score = quality * 2 + recency * 5 + noise;
        return { project: p, score };
      })
      .sort((a, b) => (b.score - a.score) || a.project.title.localeCompare(b.project.title));

    const topTen = scored.slice(0, 10).map((x) => x.project);

    const newArrivals = releasedOnPlatform
      .slice()
      .sort((a, b) => {
        const aAbs = typeof a.releaseWeek === 'number' && typeof a.releaseYear === 'number' ? absWeek(a.releaseWeek, a.releaseYear) : 0;
        const bAbs = typeof b.releaseWeek === 'number' && typeof b.releaseYear === 'number' ? absWeek(b.releaseWeek, b.releaseYear) : 0;
        return (bAbs - aAbs) || a.title.localeCompare(b.title);
      })
      .slice(0, 12);

    const originalsReleased = releasedOnPlatform
      .filter((p) => getContractPlatformId(p.streamingContract) === playerPlatformId)
      .slice()
      .sort((a, b) => (b.script?.quality ?? 0) - (a.script?.quality ?? 0))
      .slice(0, 12);

    const comingSoon: Array<{ project: Project; arrivalAbs?: number; label: string }> = [];

    for (const p of gameState.projects ?? []) {
      if (!p) continue;

      if (getContractPlatformId(p.streamingContract) === playerPlatformId && p.status !== 'released') {
        comingSoon.push({ project: p, label: `Original • ${p.status}` });
      }

      for (const r of p.postTheatricalReleases ?? []) {
        if (!r || r.platform !== 'streaming') continue;
        const pid = (r as any).platformId || (r as any).providerId;
        if (pid !== playerPlatformId) continue;
        if (typeof (r as any).releaseWeek !== 'number' || typeof (r as any).releaseYear !== 'number') continue;
        const arrivalAbs = absWeek((r as any).releaseWeek, (r as any).releaseYear);
        if (arrivalAbs <= currentAbs) continue;

        comingSoon.push({ project: p, arrivalAbs, label: 'Windowed arrival' });
      }
    }

    comingSoon.sort((a, b) => (a.arrivalAbs ?? 999999) - (b.arrivalAbs ?? 999999));

    const heroTitle = topTen[0] ?? newArrivals[0] ?? null;

    return { heroTitle, topTen, newArrivals, originalsReleased, comingSoon: comingSoon.slice(0, 12) };
  }, [gameState, player?.id, player?.status, titlesOnPlatform]);

  const onLicenseTitleToRival = () => {
    if (!gameState) return;
    if (!playerPlatformId) return;
    if (!player || player.status !== 'active') return;
    if (!licenseProject) return;
    if (!licenseRivalId) return;

    const offer = computeLicenseOffer(licenseProject, licenseRivalId, licenseDurationWeeks);

    const releaseDate = new Date(Date.UTC(gameState.currentYear, 0, 1 + Math.max(0, gameState.currentWeek - 1) * 7));
    const releaseId = `release:${licenseProject.id}:${licenseRivalId}:${gameState.currentYear}:W${gameState.currentWeek}`;

    const newWindow: PostTheatricalRelease = {
      id: releaseId,
      projectId: licenseProject.id,
      platform: 'streaming',
      providerId: licenseRivalId,
      releaseDate,
      releaseWeek: gameState.currentWeek,
      releaseYear: gameState.currentYear,
      delayWeeks: 0,
      revenue: offer,
      weeklyRevenue: 0,
      weeksActive: 0,
      status: 'planned',
      cost: 0,
      durationWeeks: clampInt(licenseDurationWeeks, 8, 52),
    };

    const nextPost: PostTheatricalRelease[] = (licenseProject.postTheatricalReleases ?? []).some((r) => r.id === releaseId)
      ? [...(licenseProject.postTheatricalReleases ?? [])]
      : [...(licenseProject.postTheatricalReleases ?? []), newWindow];

    updateBudget(offer);

    updateProject(licenseProject.id, {
      releaseStrategy: licenseProject.releaseStrategy
        ? {
            ...licenseProject.releaseStrategy,
            streamingExclusive: false,
          }
        : licenseProject.releaseStrategy,
      streamingContract:
        licenseProject.streamingContract && licenseProject.streamingContract.platformId === playerPlatformId
          ? {
              ...(licenseProject.streamingContract as any),
              exclusivityClause: false,
            }
          : licenseProject.streamingContract,
      postTheatricalReleases: nextPost,
    });

    const moatPenalty = clampInt(Math.floor((clampInt(licenseDurationWeeks, 8, 52) / 52) * 4), 1, 4);

    setGameState((prev) => {
      const pm = prev.platformMarket;
      if (!pm?.player || pm.player.status !== 'active') return prev;
      if (pm.player.id !== playerPlatformId) return prev;

      return {
        ...prev,
        platformMarket: {
          ...pm,
          player: {
            ...pm.player,
            cash: (pm.player.cash ?? 0) + offer,
            freshness: clampInt((pm.player.freshness ?? 50) - moatPenalty, 0, 100),
            catalogValue: clampInt((pm.player.catalogValue ?? 45) - 1, 0, 100),
          },
        },
      };
    });

    setLicenseOpen(false);
  };

  const onLaunchPlatform = () => {
    if (!gameState) return;

    ensureLaunchDefaults();

    const name = launchName.trim().length > 0 ? launchName.trim() : `${gameState.studio.name}+`;
    const vibe = launchVibe;

    const platformId = `player-platform:${gameState.studio.id}`;

    const proposedKey = name.trim().toLowerCase();
    const rivalNameMatch = rivals.find((r) => r && r.status !== 'collapsed' && r.name.trim().toLowerCase() === proposedKey);
    const registryMatch = (platformMarket?.brandRegistry ?? []).find(
      (b) => b && typeof b.name === 'string' && b.name.trim().toLowerCase() === proposedKey
    );

    const relaunching = !!player && player.status !== 'active';

    // Prevent reusing a retired/sold brand, and prevent name collisions with rivals.
    if (
      (relaunching && player && player.name.trim().toLowerCase() === proposedKey) ||
      !!rivalNameMatch ||
      !!registryMatch
    ) {
      const ownerLabel = registryMatch?.ownerName || rivalNameMatch?.name || 'another service';
      const reason =
        relaunching && player && player.name.trim().toLowerCase() === proposedKey
          ? 'That brand is tied up in the aftermath of your previous platform.'
          : `That name is already in use by ${ownerLabel}.`;

      setBrandingConflictMessage(
        `${reason}\n\nIn-universe: the trademark lawyers (and app stores) won’t let you relaunch under a conflicting brand. Pick a new platform name.`
      );
      setBrandingConflictOpen(true);
      return;
    }

    const tierMix = {
      adSupportedPct: clampInt(launchAdSupportedPct, 0, 100),
      adFreePct: clampInt(100 - launchAdSupportedPct, 0, 100),
    };

    if (!canLaunchPlatform) return;

    let spendResult = spendStudioFunds(launchCost);
    if (!spendResult.success && debugUi) {
      updateBudget(250_000_000);
      spendResult = spendStudioFunds(launchCost);
    }
    if (!spendResult.success) return;

    const initialSubscribers = clampInt(
      250_000 + releasedProjectsCount * 45_000 + Math.max(0, (gameState.studio.reputation ?? 0) - 60) * 35_000,
      100_000,
      5_000_000
    );

    setGameState((prev) => {
      const market = prev.platformMarket ?? {};

      const registry = Array.isArray((market as any).brandRegistry) ? [...((market as any).brandRegistry as any[])] : [];
      const key = name.trim().toLowerCase();
      if (key && !registry.some((e) => typeof e?.name === 'string' && e.name.trim().toLowerCase() === key)) {
        registry.push({
          name: name.trim(),
          ownerId: platformId,
          ownerName: prev.studio.name,
          acquiredWeek: prev.currentWeek,
          acquiredYear: prev.currentYear,
        });
      }

      return {
        ...prev,
        platformMarket: {
          ...market,
          brandRegistry: registry,
          player: {
            id: platformId,
            name,
            launchedWeek: prev.currentWeek,
            launchedYear: prev.currentYear,
            closedWeek: undefined,
            closedYear: undefined,
            subscribers: initialSubscribers,
            cash: -launchCost,
            status: 'active',
            tierMix,
            promotionBudgetPerWeek: launchPromoBudget,
            priceIndex: launchPriceIndex,
            adLoadIndex: clampInt(launchAdLoadIndex, 0, 100),
            originalsQualityBonus: 0,
            freshness: 35,
            catalogValue: 20,
            vibe,
            branding: getVibeBrandingPreset(vibe),
          },
        },
      };
    });

    setLaunchOpen(false);
    setOnboardingOpen(true);
  };

  const addWeeks = (startWeek: number, startYear: number, duration: number) => {
    const startAbs = startYear * 52 + startWeek;
    const endAbs = startAbs + duration;

    let endYear = Math.floor(endAbs / 52);
    let endWeek = endAbs % 52;

    if (endWeek === 0) {
      endWeek = 52;
      endYear -= 1;
    }

    return { endWeek, endYear };
  };

  const onCommissionOriginal = () => {
    if (!gameState) return;
    if (!playerPlatformId) return;

    const title = originalTitle.trim();
    if (title.length === 0) return;

    const episodeCount = clampInt(originalEpisodeCount, 4, 22);
    const perEpisodeBudget = clampInt(originalEpisodeBudget, 250_000, 20_000_000);

    const commissionFee = 15_000_000;
    let spendResult = spendStudioFunds(commissionFee);
    if (!spendResult.success && debugUi) {
      updateBudget(50_000_000);
      spendResult = spendStudioFunds(commissionFee);
    }
    if (!spendResult.success) return;

    const idSeedRoot = `${gameState.universeSeed ?? 0}|${gameState.studio?.id ?? 'studio'}|${gameState.currentYear}:W${gameState.currentWeek}|original|${title}|${gameState.projects.length}|${gameState.scripts.length}`;
    const idSuffix = stableInt(idSeedRoot, 100000, 999999);

    const qualityBonus = clampInt(gameState.platformMarket?.player?.originalsQualityBonus ?? 0, 0, 20);
    const baseQuality = stableInt(`${idSeedRoot}|quality`, 58, 82);
    const finalQuality = clampInt(baseQuality + qualityBonus, 40, 95);

    const script: Script = {
      id: `script:original:${gameState.currentYear}:W${gameState.currentWeek}:${idSuffix}`,
      title,
      genre: originalGenre,
      logline: `An original ${originalGenre} series commissioned for ${gameState.platformMarket?.player?.name ?? 'your platform'}.`,
      writer: 'In-house',
      pages: 60,
      quality: finalQuality,
      budget: perEpisodeBudget,
      developmentStage: 'concept',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 50,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 6,
        criticalPotential: 6,
        cgiIntensity: 'minimal',
      },
    };

    upsertScript(script);

    const duration = 52;
    const { endWeek, endYear } = addWeeks(gameState.currentWeek, gameState.currentYear, duration);

    const baselineSubs = clampInt((player?.subscribers ?? 1_000_000) as number, 250_000, 120_000_000);
    const expectedViewers = clampInt(Math.floor(baselineSubs * 0.75), 350_000, 90_000_000);

    const contract: StreamingContract = {
      id: `contract:original:${gameState.currentYear}:W${gameState.currentWeek}:${idSuffix}`,
      dealKind: 'streaming',
      platformId: playerPlatformId,
      persistentRights: true,
      name: `${gameState.platformMarket?.player?.name ?? 'Your Platform'} Original - ${title}`,
      type: 'series',
      duration,
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      endWeek,
      endYear,
      upfrontPayment: 0,
      episodeRate: perEpisodeBudget,
      performanceBonus: [],
      expectedViewers,
      expectedCompletionRate: 72,
      expectedSubscriberGrowth: Math.floor(expectedViewers * 0.03),
      status: 'active',
      performanceScore: 0,
      exclusivityClause: true,
      marketingSupport: 0,
    };

    const totalBudget = perEpisodeBudget * episodeCount;

    const releaseFormat = originalReleaseFormat;

    const episodes: EpisodeData[] = Array.from({ length: episodeCount }).map((_, idx) => {
      const n = idx + 1;
      return {
        episodeNumber: n,
        seasonNumber: 1,
        title: `Episode ${n}`,
        runtime: stableInt(`${idSeedRoot}|runtime:${n}`, 42, 64),
        viewers: 0,
        completionRate: 0,
        averageWatchTime: 0,
        replayViews: 0,
        productionCost: perEpisodeBudget,
        weeklyViews: [],
        cumulativeViews: 0,
        viewerRetention: 0,
      };
    });

    const season1: SeasonData = {
      seasonNumber: 1,
      totalEpisodes: episodeCount,
      episodesAired: 0,
      releaseFormat,
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget,
      spentBudget: 0,
      productionStatus: 'planning',
      episodes,
    };

    const now = new Date(Date.UTC(gameState.currentYear, 0, 1 + (Math.max(1, gameState.currentWeek) - 1) * 7));

    const project: Project = {
      id: `project:original:${gameState.currentYear}:W${gameState.currentWeek}:${idSuffix}`,
      title,
      script,
      type: 'series',
      currentPhase: 'development',
      budget: {
        total: totalBudget,
        allocated: {
          aboveTheLine: Math.floor(totalBudget * 0.35),
          belowTheLine: Math.floor(totalBudget * 0.25),
          postProduction: Math.floor(totalBudget * 0.15),
          marketing: Math.floor(totalBudget * 0.15),
          distribution: Math.floor(totalBudget * 0.05),
          contingency: Math.floor(totalBudget * 0.05),
        },
        spent: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0,
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0,
        },
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: { start: now, end: now },
        principalPhotography: { start: now, end: now },
        postProduction: { start: now, end: now },
        release: now,
        milestones: [],
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: gameState.platformMarket?.player?.name ?? 'Your Platform',
          platformId: playerPlatformId,
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 1 },
        },
        international: [],
        windows: [],
        marketingBudget: Math.floor(totalBudget * 0.15),
      },
      status: 'development',
      metrics: {},
      phaseDuration: 8,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 0,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 60,
        issues: [],
      },
      seasons: [season1],
      currentSeason: 1,
      totalOrderedSeasons: 1,
      releaseFormat,
      episodeCount,
      streamingContract: contract,
    };

    addProject(project);

    setOriginalTitle('');
    setOriginalsOpen(false);
  };

  if (!gameState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading platform view...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Streaming Wars: Platform</h3>
          <p className="text-sm text-muted-foreground">
            Launch your platform, commission Originals, and survive churn, burn, and consolidation.
          </p>
        </div>
        {!platformMarket && <Badge variant="outline">No market data</Badge>}
      </div>

      <Tabs defaultValue="home" className="space-y-4">
        <TabsList>
          <TabsTrigger value="home" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            App
          </TabsTrigger>
          <TabsTrigger value="originals" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Originals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="rivals" className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Rivals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          {!player && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your platform</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You don’t own a platform yet. Launching is expensive and only makes sense once you have reputation and a catalog.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Launch cost</div>
                    <div className="font-medium">{formatUsdCompact(launchCost)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Reputation</div>
                    <div className={hasEnoughReputation ? 'font-medium' : 'font-medium text-muted-foreground'}>
                      {gameState.studio.reputation ?? 0}/60
                    </div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Released titles</div>
                    <div className={hasEnoughReleases ? 'font-medium' : 'font-medium text-muted-foreground'}>
                      {releasedProjectsCount}/12
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    ensureLaunchDefaults();
                    setLaunchOpen(true);
                  }}
                  disabled={!canLaunchPlatform}
                >
                  Launch Platform
                </Button>
              </CardContent>
            </Card>
          )}

          {player && player.status !== 'active' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your platform</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {player.status === 'sold'
                    ? `You sold ${player.name}. If you want back into streaming, you can relaunch a new service once the dust settles.`
                    : `${player.name} has been shut down. You can relaunch a new service once the cooldown ends (and you can afford it).`}
                </p>

                {relaunchWindow.weeksRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">Relaunch available in {relaunchWindow.weeksRemaining} weeks.</p>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(player.status)} className="capitalize w-fit">
                    {player.status}
                  </Badge>
                  <Badge variant="outline" className="w-fit">
                    Relaunch cost: {formatUsdCompact(launchCost)}
                  </Badge>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    ensureLaunchDefaults();
                    setLaunchOpen(true);
                  }}
                  disabled={!canRelaunchPlatform}
                >
                  Relaunch Platform
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total addressable subs</p>
                    <p className="text-2xl font-bold">{formatCompact(totalAddressableSubs)}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rivals</p>
                    <p className="text-2xl font-bold">{rivalsCount}</p>
                  </div>
                  <Swords className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your subscribers</p>
                    <p className="text-2xl font-bold">{player ? formatCompact(player.subscribers) : '—'}</p>
                    {player && (
                      <Badge variant={statusVariant(player.status)} className="mt-1 capitalize">
                        {player.status}
                      </Badge>
                    )}
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your market share</p>
                    <p className="text-2xl font-bold">{player ? `${playerSharePct.toFixed(1)}%` : '—'}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your share</span>
                <span className="font-medium">{player ? `${playerSharePct.toFixed(1)}%` : '—'}</span>
              </div>
              <Progress value={Math.max(0, Math.min(100, playerSharePct))} />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tracked subs</span>
                <span>{formatCompact(accountedSubs)}</span>
              </div>

              {platformMarket?.lastUpdatedWeek != null && platformMarket?.lastUpdatedYear != null && (
                <p className="text-xs text-muted-foreground">
                  Updated week {platformMarket.lastUpdatedWeek}, {platformMarket.lastUpdatedYear}
                </p>
              )}
            </CardContent>
          </Card>

          {player && player.status === 'active' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Strategic options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If you want out of streaming, you can sell {player.name} to a rival. Or you can sign an output deal to monetize future releases while keeping the platform running.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Best sale offer</div>
                      <div className="font-medium">{bestStrategicSaleOffer ? formatUsdCompact(bestStrategicSaleOffer.salePrice) : '—'}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Subscribers transferred</div>
                      <div className="font-medium">
                        {bestStrategicSaleOffer && player.subscribers > 0
                          ? `${Math.round((bestStrategicSaleOffer.transferredSubs / player.subscribers) * 100)}%`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Interested buyers</div>
                      <div className="font-medium">{strategicSaleOffers.length}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Best output deal</div>
                      <div className="font-medium">
                        {player.outputDeal
                          ? `Active: ${player.outputDeal.partnerName}`
                          : bestOutputDealOffer
                            ? formatUsdCompact(bestOutputDealOffer.upfrontPayment)
                            : '—'}
                      </div>
                      {!player.outputDeal && bestOutputDealOffer && (
                        <div className="text-muted-foreground">Term {Math.round(bestOutputDealOffer.termWeeks / 52)}y • {bestOutputDealOffer.windowDelayWeeks}w delay</div>
                      )}
                      {player.outputDeal && (
                        <div className="text-muted-foreground">Ends Y{player.outputDeal.endYear}W{player.outputDeal.endWeek}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={queueStrategicSaleEvent}
                      disabled={(gameState.eventQueue || []).length > 0 || strategicSaleOffers.length === 0}
                    >
                      Explore strategic sale
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={queueVoluntaryShutdownEvent}
                      disabled={(gameState.eventQueue || []).length > 0 || !shutdownPlan}
                    >
                      Explore shutdown ({shutdownPlan ? formatUsdCompact(shutdownPlan.proceeds) : '—'})
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={queueOutputDealEvent}
                      disabled={(gameState.eventQueue || []).length > 0 || outputDealOffers.length === 0 || !!player.outputDeal}
                    >
                      Explore output deal ({bestOutputDealOffer ? formatUsdCompact(bestOutputDealOffer.upfrontPayment) : '—'})
                    </Button>

                    {player.outputDeal && outputDealBuyout && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={queueOutputDealBuyoutEvent}
                        disabled={(gameState.eventQueue || []).length > 0}
                      >
                        Buy out output deal ({formatUsdCompact(outputDealBuyout.buyoutCost)})
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={queueLibraryLicensingEvent}
                      disabled={(gameState.eventQueue || []).length > 0 || libraryLicensingOffers.length === 0}
                    >
                      Package license ({libraryLicensingOffers.length > 0 ? formatUsdCompact(libraryLicensingOffers[0].licenseFee) : '—'})
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={queueLibrarySyndicationEvent}
                      disabled={(gameState.eventQueue || []).length > 0 || libraryLicensingOffers.length < 2}
                    >
                      Syndicate package ({libraryLicensingOffers.length > 1 ? formatUsdCompact(librarySyndicationPayouts.top2) : '—'})
                    </Button>
                  </div>

                  {(gameState.eventQueue || []).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Resolve your current pending event before starting a sale process.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{player.name} Home</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {heroTitle ? (
                    <button
                      type="button"
                      onClick={() => openTitle(heroTitle)}
                      className="w-full text-left rounded-lg border bg-gradient-to-br from-primary/10 via-card to-card p-4 hover:bg-card/80 transition"
                    >
                      <div className="text-xs tracking-wide text-muted-foreground uppercase">Spotlight</div>
                      <div className="mt-1 text-xl font-semibold">{heroTitle.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground capitalize">
                        {heroTitle.type.replace('-', ' ')} • {heroTitle.script?.genre}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getContractPlatformId(heroTitle.streamingContract) === playerPlatformId && <Badge variant="secondary">Original</Badge>}
                        {playerPlatformId && getDirectPlatformId(heroTitle) === playerPlatformId && isExclusiveTitle(heroTitle) && (
                          <Badge variant="outline">Exclusive</Badge>
                        )}
                        {playerPlatformId && hasRivalStreamingWindow(heroTitle, playerPlatformId) && <Badge variant="secondary">Licensed out</Badge>}
                        <Badge variant="outline">Details</Badge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Quality: {Math.round(heroTitle.script?.quality ?? 60)} • Critics: {Math.round(heroTitle.metrics?.criticsScore ?? 0)}/100 • Audience:{' '}
                        {Math.round(heroTitle.metrics?.audienceScore ?? 0)}/100
                      </div>
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No titles are currently on your platform. Use streaming premieres, Originals, and post-theatrical windows to build your catalog.
                    </p>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Top 10</div>
                        <div className="text-xs text-muted-foreground">Trending now</div>
                      </div>
                      {topTen.length > 0 ? (
                        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
                          {topTen.map((p, idx) => {
                            const initials = p.title
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join('')
                              .slice(0, 2);

                            const isOriginal = getContractPlatformId(p.streamingContract) === playerPlatformId;
                            const isExclusive = playerPlatformId && getDirectPlatformId(p) === playerPlatformId && isExclusiveTitle(p);
                            const isLicensedOut = playerPlatformId && hasRivalStreamingWindow(p, playerPlatformId);
                            const canLicense =
                              playerPlatformId &&
                              player?.status === 'active' &&
                              getDirectPlatformId(p) === playerPlatformId &&
                              isExclusiveTitle(p) &&
                              rivals.some((r) => r.status !== 'collapsed');

                            return (
                              <div key={p.id} className="w-[150px] shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openTitle(p)}
                                  className="w-full text-left"
                                >
                                  <div className="relative aspect-[2/3] rounded-md border bg-gradient-to-br from-slate-900/10 via-card to-card flex items-center justify-center">
                                    <div className="text-lg font-extrabold tracking-wider text-muted-foreground">{initials || 'TV'}</div>
                                    <div className="absolute left-2 top-2 rounded-full border bg-background/70 px-2 py-0.5 text-[10px] font-semibold">
                                      #{idx + 1}
                                    </div>
                                    {isOriginal && (
                                      <div className="absolute left-2 bottom-2 rounded-full border bg-background/70 px-2 py-0.5 text-[10px] font-semibold">
                                        Original
                                      </div>
                                    )}
                                    {isExclusive && (
                                      <div className="absolute right-2 bottom-2 rounded-full border bg-background/70 px-2 py-0.5 text-[10px] font-semibold">
                                        Exclusive
                                      </div>
                                    )}
                                    {isLicensedOut && (
                                      <div className="absolute right-2 top-2 rounded-full border bg-background/70 px-2 py-0.5 text-[10px] font-semibold">
                                        Windowed
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2 text-sm font-medium truncate">{p.title}</div>
                                  <div className="text-xs text-muted-foreground capitalize truncate">{p.script?.genre}</div>
                                </button>

                                {canLicense && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="mt-2 w-full"
                                    onClick={() => openLicenseDialog(p)}
                                  >
                                    License out
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No titles available yet.</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">New releases</div>
                        <div className="text-xs text-muted-foreground">Fresh to library</div>
                      </div>
                      {newArrivals.length > 0 ? (
                        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
                          {newArrivals.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openTitle(p)}
                              className="w-[160px] shrink-0 text-left rounded-md border bg-card/40 p-3 hover:bg-card/60 transition"
                            >
                              <div className="text-sm font-medium truncate">{p.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground capitalize truncate">{p.type.replace('-', ' ')} • {p.script?.genre}</div>
                              <div className="mt-2 text-xs text-muted-foreground">Quality {Math.round(p.script?.quality ?? 60)}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No new arrivals this week.</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Originals</div>
                        <div className="text-xs text-muted-foreground">Built for {player.name}</div>
                      </div>
                      {originalsReleased.length > 0 ? (
                        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
                          {originalsReleased.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openTitle(p)}
                              className="w-[160px] shrink-0 text-left rounded-md border bg-card/40 p-3 hover:bg-card/60 transition"
                            >
                              <div className="text-sm font-medium truncate">{p.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground capitalize truncate">{p.script?.genre}</div>
                              <div className="mt-2 text-xs text-muted-foreground">Quality {Math.round(p.script?.quality ?? 60)}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No released Originals yet.</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Coming soon</div>
                        <div className="text-xs text-muted-foreground">Pipeline + windows</div>
                      </div>
                      {comingSoon.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {comingSoon.map((x) => {
                            const currentAbs = absWeek(gameState.currentWeek ?? 0, gameState.currentYear ?? 0);
                            const etaWeeks = typeof x.arrivalAbs === 'number' ? Math.max(0, x.arrivalAbs - currentAbs) : null;

                            return (
                              <button
                                key={`${x.project.id}:${x.arrivalAbs ?? 'pipeline'}`}
                                type="button"
                                onClick={() => openTitle(x.project)}
                                className="text-left rounded-md border bg-card/40 p-3 hover:bg-card/60 transition perf-cv-row"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-medium truncate">{x.project.title}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">{x.label}{etaWeeks !== null ? ` • Arrives in ${etaWeeks}w` : ''}</div>
                                  </div>
                                  <Badge variant="outline">Soon</Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No upcoming arrivals are scheduled.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="app" className="space-y-4">
          {!playerPlatformId || !player ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform app</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Launch your platform to unlock the consumer-facing app preview.</p>
              </CardContent>
            </Card>
          ) : player.status !== 'active' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform app</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Your platform is no longer active.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <StreamingPlatformPreview
                  platformId={playerPlatformId}
                  platformName={player.name}
                  vibe={player.vibe}
                  branding={effectiveBranding}
                  heroTitle={heroTitle}
                  topTen={topTen}
                  newArrivals={newArrivals}
                  originals={originalsReleased}
                  onSelectTitle={openTitle}
                />
              </div>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Platform name</Label>
                    <Input
                      id="platform-name"
                      value={player.name}
                      onChange={(e) => {
                        const next = e.target.value;
                        setGameState((prev) => {
                          const pm = prev.platformMarket;
                          if (!pm?.player) return prev;
                          if (pm.player.id !== playerPlatformId) return prev;
                          if (pm.player.status !== 'active') return prev;
                          return {
                            ...prev,
                            platformMarket: {
                              ...pm,
                              player: {
                                ...pm.player,
                                name: next,
                              },
                            },
                          };
                        });
                      }}
                      placeholder="Your platform name"
                    />
                    <p className="text-xs text-muted-foreground">This name is used in contracts, events, and the in-universe app.</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Primary color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updatePlayerBranding({ primaryColor: c.id })}
                          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                            effectiveBranding.primaryColor === c.id
                              ? 'border-foreground scale-110 shadow-md'
                              : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
                          }`}
                          style={{ backgroundColor: `hsl(${c.hsl})` }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Accent color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {ACCENT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updatePlayerBranding({ accentColor: c.id })}
                          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                            effectiveBranding.accentColor === c.id
                              ? 'border-foreground scale-110 shadow-md'
                              : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
                          }`}
                          style={{ backgroundColor: `hsl(${c.hsl})` }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>App layout</Label>
                    <Select
                      value={effectiveBranding.layout ?? 'auto'}
                      onValueChange={(v) => updatePlayerBranding({ layout: v as PlayerPlatformBranding['layout'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (based on vibe)</SelectItem>
                        <SelectItem value="mass">Mass market</SelectItem>
                        <SelectItem value="prestige">Prestige</SelectItem>
                        <SelectItem value="default">Classic</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">This only affects the in-universe app preview.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Background overlay</Label>
                    <Select
                      value={effectiveBranding.overlay ?? 'spotlight'}
                      onValueChange={(v) => updatePlayerBranding({ overlay: v as PlayerPlatformBranding['overlay'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spotlight">Spotlight</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="scanlines">Scanlines</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <StudioIconCustomizer
                    label="Platform logo"
                    description="A simple mark that shows up in the app header."
                    value={(effectiveBranding.logo as StudioIconConfig | undefined) ?? DEFAULT_ICON}
                    onChange={(cfg) => updatePlayerBranding({ logo: cfg })}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updatePlayerBranding({ ...getVibeBrandingPreset(player.vibe), layout: 'auto' })}
                    >
                      Reset to vibe default
                    </Button>
                    <Badge variant="outline" className="capitalize">
                      {player.vibe ?? 'prestige'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="originals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Originals slate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!playerPlatformId ? (
                <p className="text-sm text-muted-foreground">Launch your platform to commission Originals.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Originals increase retention, but they also increase burn while you’re still building scale.
                  </p>
                  {player?.status === 'active' && (player.originalsQualityBonus ?? 0) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Overall deal bonus: +{Math.round(player.originalsQualityBonus ?? 0)} baseline quality on newly commissioned Originals.
                    </p>
                  )}
                </div>
              )}

              <Button type="button" onClick={() => setOriginalsOpen(true)} disabled={!playerPlatformId || player?.status !== 'active'}>
                Commission Original
              </Button>

              {originals.length > 0 ? (
                <div className="space-y-2">
                  {originals
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((p) => {
                      const eta = estimateOriginalWeeksToPremiere(p);
                      const phase =
                        p.currentPhase === 'development' || p.currentPhase === 'production' || p.currentPhase === 'post-production'
                          ? p.currentPhase
                          : p.status === 'development' || p.status === 'production' || p.status === 'post-production'
                            ? p.status
                            : null;

                      const releaseFormat = p.releaseFormat === 'binge' || p.releaseFormat === 'batch' || p.releaseFormat === 'weekly' ? p.releaseFormat : 'weekly';

                      const isSeriesLike = p.type === 'series' || p.type === 'limited-series';

                      const seasons = isSeriesLike && Array.isArray(p.seasons) ? p.seasons : [];
                      const currentAbs = absWeek(gameState.currentWeek ?? 0, gameState.currentYear ?? 0);
                      const releaseAbs =
                        typeof p.releaseWeek === 'number' && typeof p.releaseYear === 'number' ? absWeek(p.releaseWeek, p.releaseYear) : currentAbs;

                      let currentSeason = typeof p.currentSeason === 'number' && p.currentSeason > 0 ? p.currentSeason : 1;
                      let displaySeason = seasons.find((s) => s?.seasonNumber === currentSeason) ?? seasons[0];

                      if (p.status === 'released' && seasons.length > 0) {
                        const candidates = seasons
                          .map((s, idx) => {
                            const seasonNumber = typeof s?.seasonNumber === 'number' ? s.seasonNumber : idx + 1;

                            const premiereAbs =
                              typeof (s as any)?.premiereDate?.week === 'number' && typeof (s as any)?.premiereDate?.year === 'number'
                                ? absWeek((s as any).premiereDate.week, (s as any).premiereDate.year)
                                : seasonNumber === 1
                                  ? releaseAbs
                                  : null;

                            if (premiereAbs == null || premiereAbs > currentAbs) return null;

                            const totalRaw =
                              typeof (s as any)?.totalEpisodes === 'number'
                                ? (s as any).totalEpisodes
                                : seasonNumber === 1 && typeof p.episodeCount === 'number'
                                  ? p.episodeCount
                                  : 10;

                            const total = typeof totalRaw === 'number' && totalRaw > 0 ? clampInt(totalRaw, 1, 30) : 0;
                            const airedRaw = typeof (s as any)?.episodesAired === 'number' ? (s as any).episodesAired : 0;
                            const aired = total > 0 ? clampInt(airedRaw, 0, total) : 0;

                            return {
                              season: s,
                              seasonNumber,
                              premiereAbs,
                              isComplete: total > 0 && aired >= total,
                            };
                          })
                          .filter((x): x is { season: any; seasonNumber: number; premiereAbs: number; isComplete: boolean } => x !== null);

                        const active =
                          candidates.filter((c) => !c.isComplete).sort((a, b) => b.premiereAbs - a.premiereAbs)[0] ??
                          candidates.sort((a, b) => b.premiereAbs - a.premiereAbs)[0];

                        if (active) {
                          displaySeason = active.season;
                          currentSeason = active.seasonNumber;
                        }
                      }

                      const totalEpisodes = isSeriesLike
                        ? typeof (displaySeason as any)?.totalEpisodes === 'number'
                          ? (displaySeason as any).totalEpisodes
                          : currentSeason === 1 && typeof p.episodeCount === 'number'
                            ? p.episodeCount
                            : 10
                        : undefined;
                      const episodesAired = isSeriesLike ? (displaySeason as any)?.episodesAired : undefined;

                      const phaseLabel = phase
                        ? `${phase}${typeof p.phaseDuration === 'number' && p.phaseDuration > 0 ? ` • ${Math.floor(p.phaseDuration)}w left` : ''}`
                        : p.status;

                      const weeklySpend = estimateOriginalWeeklySpend(p);
                      const rushWeeks = 2;
                      const rushCost = typeof weeklySpend === 'number' && weeklySpend > 0 ? Math.floor(weeklySpend * rushWeeks * 1.25) : null;

                      const remainingForRush =
                        phase !== null
                          ? typeof p.phaseDuration === 'number' && p.phaseDuration > 0
                            ? Math.floor(p.phaseDuration)
                            : ORIGINAL_PHASE_WEEKS[phase]
                          : 0;

                      const canRush =
                        player?.status === 'active' &&
                        phase === 'production' &&
                        remainingForRush > 1 &&
                        p.status !== 'released' &&
                        typeof rushCost === 'number' &&
                        rushCost > 0 &&
                        (player.cash ?? 0) >= rushCost;

                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-md border p-3 gap-3 perf-cv-row">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.title}</div>
                            <div className="text-xs text-muted-foreground capitalize truncate">
                              {p.type.replace('-', ' ')} • {p.script?.genre} • {releaseFormat} • {phaseLabel}
                              {typeof totalEpisodes === 'number' ? ` • S${currentSeason} ${typeof episodesAired === 'number' ? episodesAired : 0}/${totalEpisodes} eps` : ''}
                              {typeof eta === 'number' && eta > 0 ? ` • ETA ~${eta}w` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canRush && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setGameState((prev) => {
                                    if (!prev.platformMarket?.player) return prev;
                                    if (prev.platformMarket.player.status !== 'active') return prev;

                                    const projects = (prev.projects ?? []).map((proj) => {
                                      if (!proj || proj.id !== p.id) return proj;

                                      const projPhase =
                                        proj.currentPhase === 'development' || proj.currentPhase === 'production' || proj.currentPhase === 'post-production'
                                          ? proj.currentPhase
                                          : proj.status === 'development' || proj.status === 'production' || proj.status === 'post-production'
                                            ? proj.status
                                            : null;

                                      if (projPhase !== 'production') return proj;

                                      const base = ORIGINAL_PHASE_WEEKS[projPhase];
                                      const remaining = typeof proj.phaseDuration === 'number' && proj.phaseDuration > 0 ? Math.floor(proj.phaseDuration) : base;
                                      const nextRemaining = Math.max(1, remaining - rushWeeks);

                                      return {
                                        ...proj,
                                        phaseDuration: nextRemaining,
                                      };
                                    });

                                    return {
                                      ...prev,
                                      projects,
                                      platformMarket: {
                                        ...prev.platformMarket,
                                        player: {
                                          ...prev.platformMarket.player,
                                          cash: (prev.platformMarket.player.cash ?? 0) - (rushCost ?? 0),
                                        },
                                      },
                                    };
                                  });
                                }}
                              >
                                Rush {rushWeeks}w ({formatUsdCompact(rushCost ?? 0)})
                              </Button>
                            )}
                            <Badge variant="outline">Original</Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Originals commissioned yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Player platform</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {player ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={statusVariant(player.status)} className="capitalize">
                        {player.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscribers</span>
                      <span className="font-medium">{formatCompact(player.subscribers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform cashflow (cumulative)</span>
                      <span className="font-medium">{formatUsdCompact(player.cash ?? 0)}</span>
                    </div>

                    {platformMarket?.lastWeek?.player && (() => {
                      const kpis = platformMarket.lastWeek.player;
                      const churnPct = kpis.churnRate * 100;

                      const guidance: string[] = [];

                      if (kpis.netAdds < 0) {
                        guidance.push('Net adds are negative. Consider lowering price, reducing ad load, increasing promotion, or improving service quality.');
                      }

                      if (kpis.churnRate > 0.04) {
                        guidance.push('Churn is spiking. Reduce price/ad load and keep Originals cadence steady to stabilize retention.');
                      } else if (kpis.churnRate > 0.03) {
                        guidance.push('Churn is elevated. Watch pricing/ad load and consider a short promo boost.');
                      }

                      if (kpis.profit < 0) {
                        guidance.push('You are burning cash. Reduce weekly promotion spend or raise price slightly to improve unit economics.');
                      }

                      if ((player.freshness ?? 0) < 45) {
                        guidance.push('Freshness is low. Release Originals or acquire an exclusive license to lift retention.');
                      }

                      if ((player.catalogValue ?? 0) < 45) {
                        guidance.push('Catalog value is low. Add windowed titles or win a library pack to improve acquisition.');
                      }

                      const churnTone = churnPct > 4 ? 'font-medium text-red-700' : churnPct > 3 ? 'font-medium text-yellow-700' : 'font-medium';
                      const netAddsTone = kpis.netAdds > 0 ? 'font-medium text-green-700' : kpis.netAdds < 0 ? 'font-medium text-red-700' : 'font-medium';

                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Acquired (last tick)</span>
                            <span className="font-medium">{formatCompact(kpis.acquired)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Churned (last tick)</span>
                            <span className="font-medium">{formatCompact(kpis.churned)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Net adds (last tick)</span>
                            <span className={netAddsTone}>
                              {kpis.netAdds > 0 ? '+' : ''}{formatCompact(kpis.netAdds)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Churn (last tick)</span>
                            <span className={churnTone}>{churnPct.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Revenue (last tick)</span>
                            <span className="font-medium">{formatUsdCompact(kpis.revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ops cost (last tick)</span>
                            <span className="font-medium">{formatUsdCompact(kpis.opsCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Profit (last tick)</span>
                            <span className={kpis.profit >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                              {formatUsdCompact(kpis.profit)}
                            </span>
                          </div>

                          {player.status === 'active' && (
                            <div className="pt-3 border-t space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">Guidance</div>
                              {guidance.length > 0 ? (
                                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                  {guidance.slice(0, 3).map((tip) => (
                                    <li key={tip}>{tip}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground">Stable week. Keep Originals cadence steady and watch churn.</p>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {player && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{typeof player.monthlyPrice === 'number' ? 'Monthly price' : 'Monthly price (est.)'}</span>
                        <span className="font-medium">
                          {formatUsd(typeof player.monthlyPrice === 'number' ? player.monthlyPrice : computeMonthlyPrice(player.priceIndex ?? 1))}
                        </span>
                      </div>
                    )}
                    {typeof player.contentSpendPerWeek === 'number' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Content spend / week</span>
                        <span className="font-medium">{formatUsdCompact(player.contentSpendPerWeek)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Freshness</span>
                      <span className="font-medium">{Math.round(player.freshness ?? 0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Catalog value</span>
                      <span className="font-medium">{Math.round(player.catalogValue ?? 0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Originals quality bonus</span>
                      <span className="font-medium">+{Math.round(player.originalsQualityBonus ?? 0)}</span>
                    </div>

                    {player.status === 'active' && (
                      <div className="pt-3 border-t space-y-3">
                        <div className="text-xs font-medium text-muted-foreground">Platform controls</div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Ad-supported share (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={player.tierMix?.adSupportedPct ?? 50}
                              onChange={(e) => {
                                const next = clampInt(parseInt(e.target.value || '0', 10), 0, 100);
                                setGameState((prev) => {
                                  if (!prev.platformMarket?.player) return prev;
                                  if (prev.platformMarket.player.status !== 'active') return prev;
                                  return {
                                    ...prev,
                                    platformMarket: {
                                      ...prev.platformMarket,
                                      player: {
                                        ...prev.platformMarket.player,
                                        tierMix: {
                                          adSupportedPct: next,
                                          adFreePct: 100 - next,
                                        },
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Price index</Label>
                            <Input
                              type="number"
                              step={0.05}
                              min={0.7}
                              max={1.6}
                              value={player.priceIndex ?? 1}
                              onChange={(e) => {
                                const next = Math.max(0.7, Math.min(1.6, parseFloat(e.target.value || '1')));
                                setGameState((prev) => {
                                  if (!prev.platformMarket?.player) return prev;
                                  if (prev.platformMarket.player.status !== 'active') return prev;
                                  return {
                                    ...prev,
                                    platformMarket: {
                                      ...prev.platformMarket,
                                      player: {
                                        ...prev.platformMarket.player,
                                        priceIndex: next,
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Approx. {formatUsd(computeMonthlyPrice(player.priceIndex ?? 1))}/mo
                            </p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Promotion / week</Label>
                            <Input
                              type="number"
                              step={1000000}
                              min={0}
                              value={player.promotionBudgetPerWeek ?? 0}
                              onChange={(e) => {
                                const next = Math.max(0, parseInt(e.target.value || '0', 10));
                                setGameState((prev) => {
                                  if (!prev.platformMarket?.player) return prev;
                                  if (prev.platformMarket.player.status !== 'active') return prev;
                                  return {
                                    ...prev,
                                    platformMarket: {
                                      ...prev.platformMarket,
                                      player: {
                                        ...prev.platformMarket.player,
                                        promotionBudgetPerWeek: next,
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Ad load</Label>
                            <Select
                              value={String(player.adLoadIndex ?? 55)}
                              onValueChange={(v) => {
                                const next = clampInt(parseInt(v, 10), 0, 100);
                                setGameState((prev) => {
                                  if (!prev.platformMarket?.player) return prev;
                                  if (prev.platformMarket.player.status !== 'active') return prev;
                                  return {
                                    ...prev,
                                    platformMarket: {
                                      ...prev.platformMarket,
                                      player: {
                                        ...prev.platformMarket.player,
                                        adLoadIndex: next,
                                      },
                                    },
                                  };
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">Light</SelectItem>
                                <SelectItem value="55">Standard</SelectItem>
                                <SelectItem value="80">Heavy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Higher prices increase ARPU but worsen churn. Promotion improves acquisition with diminishing returns. Higher ad load boosts ad ARPU but worsens churn on the ad tier.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Launch your platform to start tracking performance.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total addressable subs</span>
                    <span className="font-medium">{formatCompact(totalAddressableSubs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rivals</span>
                    <span className="font-medium">{rivalsCount}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Your market share</span>
                    <span className="font-medium">{player ? `${playerSharePct.toFixed(1)}%` : '—'}</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, playerSharePct))} />
                </div>

                {platformMarket?.lastUpdatedWeek != null && platformMarket?.lastUpdatedYear != null && (
                  <p className="text-xs text-muted-foreground">
                    Data last updated week {platformMarket.lastUpdatedWeek}, {platformMarket.lastUpdatedYear}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rivals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Competitive landscape</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rivals.length > 0 ? (
                <div className="space-y-2">
                  {rivals.map((rival) => (
                    <div key={rival.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="text-sm font-medium">{rival.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCompact(rival.subscribers)} subs • {rival.name}
                        </div>
                      </div>
                      <Badge variant={statusVariant(rival.status)} className="capitalize">
                        {rival.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No rival platforms are tracked for this market yet.</p>
              )}

              <p className="text-xs text-muted-foreground">
                Rival tactics and counter-programming are out of scope for this view.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={titleOpen}
        onOpenChange={(open) => {
          setTitleOpen(open);
          if (!open) setTitleProject(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{titleProject?.title ?? 'Title details'}</DialogTitle>
          </DialogHeader>

          {titleProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Quality</div>
                  <div className="font-semibold">{Math.round(titleProject.script?.quality ?? 60)}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Genre</div>
                  <div className="font-semibold capitalize">{titleProject.script?.genre ?? '—'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {getContractPlatformId(titleProject.streamingContract) === playerPlatformId && <Badge variant="secondary">Original</Badge>}
                {playerPlatformId && getDirectPlatformId(titleProject) === playerPlatformId && isExclusiveTitle(titleProject) && (
                  <Badge variant="outline">Exclusive</Badge>
                )}
                <Badge variant="outline" className="capitalize">{titleProject.type.replace('-', ' ')}</Badge>
                <Badge variant="outline" className="capitalize">{titleProject.status}</Badge>
              </div>

              <div className="rounded border p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On your platform</span>
                  <span className="font-medium">
                    {playerPlatformId &&
                    isProjectOnPlatformAtTime(titleProject, playerPlatformId, gameState?.currentWeek ?? 0, gameState?.currentYear ?? 0)
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Critics</span>
                  <span className="font-medium">{Math.round(titleProject.metrics?.criticsScore ?? 0)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audience</span>
                  <span className="font-medium">{Math.round(titleProject.metrics?.audienceScore ?? 0)}/100</span>
                </div>
              </div>

              {(titleProject.postTheatricalReleases ?? []).length > 0 && (
                <div className="rounded border p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Streaming windows</div>
                  <div className="mt-2 space-y-1">
                    {(titleProject.postTheatricalReleases ?? [])
                      .filter((r) => r && r.platform === 'streaming')
                      .slice(0, 6)
                      .map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3">
                          <div className="text-muted-foreground truncate">{(r as any).providerId || (r as any).platformId}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {(r as any).status}{typeof (r as any).durationWeeks === 'number' ? ` • ${Math.round((r as any).durationWeeks)}w` : ''}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setTitleOpen(false)}>
              Close
            </Button>
            {titleProject &&
              playerPlatformId &&
              player?.status === 'active' &&
              getDirectPlatformId(titleProject) === playerPlatformId &&
              isExclusiveTitle(titleProject) &&
              rivals.some((r) => r.status !== 'collapsed') && (
                <Button
                  type="button"
                  onClick={() => {
                    openLicenseDialog(titleProject);
                    setTitleOpen(false);
                  }}
                >
                  License out
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brandingConflictOpen} onOpenChange={setBrandingConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branding conflict</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground whitespace-pre-line">{brandingConflictMessage}</div>

          <DialogFooter>
            <Button type="button" onClick={() => setBrandingConflictOpen(false)}>
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch your streaming platform</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform name</Label>
              <Input
                id="platform-name"
                value={launchName}
                onChange={(e) => setLaunchName(e.target.value)}
                placeholder={`${gameState.studio.name}+`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vibe</Label>
                <Select value={launchVibe} onValueChange={setLaunchVibe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prestige">Prestige</SelectItem>
                    <SelectItem value="mass">Mass</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="genre">Genre</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-tier">Ad-supported share (%)</Label>
                <Input
                  id="ad-tier"
                  type="number"
                  min={0}
                  max={100}
                  value={launchAdSupportedPct}
                  onChange={(e) => setLaunchAdSupportedPct(clampInt(parseInt(e.target.value || '0', 10), 0, 100))}
                />
              </div>

              <div className="space-y-2">
                <Label>Ad load</Label>
                <Select value={String(launchAdLoadIndex)} onValueChange={(v) => setLaunchAdLoadIndex(parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Light</SelectItem>
                    <SelectItem value="55">Standard</SelectItem>
                    <SelectItem value="80">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price-index">Price index</Label>
                <Input
                  id="price-index"
                  type="number"
                  step={0.05}
                  min={0.7}
                  max={1.6}
                  value={launchPriceIndex}
                  onChange={(e) => setLaunchPriceIndex(Math.max(0.7, Math.min(1.6, parseFloat(e.target.value || '1'))))}
                />
                <p className="text-xs text-muted-foreground">Higher = more ARPU, but worse churn.</p>
                <p className="text-xs text-muted-foreground">Approx. {formatUsd(computeMonthlyPrice(launchPriceIndex))}/mo</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-budget">Promotion budget / week</Label>
                <Input
                  id="promo-budget"
                  type="number"
                  step={1000000}
                  min={0}
                  value={launchPromoBudget}
                  onChange={(e) => setLaunchPromoBudget(Math.max(0, parseInt(e.target.value || '0', 10)))}
                />
              </div>
            </div>

            <div className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Upfront launch cost</span>
                <span className="font-medium">{formatUsdCompact(launchCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Studio budget</span>
                <span className={hasEnoughBudget ? 'font-medium' : 'font-medium text-red-700'}>
                  {formatUsdCompact(gameState.studio.budget ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setLaunchOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onLaunchPlatform} disabled={!canLaunchPlatform}>
              Launch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

     <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to Streaming Wars</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Your platform updates weekly. The loop is: exclusives + Originals boost freshness and reduce churn, while promotion and pricing
              determine growth vs. burn.
            </p>

            <div className="rounded border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <span>
                  Keep <span className="font-medium">churn</span> under control. If net adds go negative, crises can fire.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>
                  <span className="font-medium">Exclusives matter</span>. Licensing out titles weakens differentiation.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>
                  <span className="font-medium">Distress is slow</span>, but extreme sustained losses can force a sale or shutdown.
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: The Week Recap will warn you well before any forced sale/shutdown becomes possible.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setOnboardingOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={originalsOpen} onOpenChange={setOriginalsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commission an Original series</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="original-title">Title</Label>
              <Input
                id="original-title"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="A show people can’t stop watching"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={originalGenre} onValueChange={(v) => setOriginalGenre(v as Genre)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="animation">Animation</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="episodes">Episode count</Label>
                <Input
                  id="episodes"
                  type="number"
                  min={4}
                  max={22}
                  value={originalEpisodeCount}
                  onChange={(e) => setOriginalEpisodeCount(clampInt(parseInt(e.target.value || '10', 10), 4, 22))}
                />
              </div>

              <div className="space-y-2">
                <Label>Release format</Label>
                <Select value={originalReleaseFormat} onValueChange={(v) => setOriginalReleaseFormat(v as 'weekly' | 'binge' | 'batch')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="batch">Batch (3 eps/week)</SelectItem>
                    <SelectItem value="binge">Binge (all at once)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="episode-budget">Per-episode budget</Label>
              <Input
                id="episode-budget"
                type="number"
                min={250000}
                step={250000}
                value={originalEpisodeBudget}
                onChange={(e) => setOriginalEpisodeBudget(Math.max(250000, parseInt(e.target.value || '2500000', 10)))}
              />
              <p className="text-xs text-muted-foreground">Commissioning costs a one-time fee (to prevent spam) and increases platform burn while the show is in the pipeline.</p>
              <p className="text-xs text-muted-foreground">It will progress automatically and premiere on your platform in ~{ORIGINAL_PHASE_WEEKS.development + ORIGINAL_PHASE_WEEKS.production + ORIGINAL_PHASE_WEEKS['post-production']} weeks.</p>
              <p className="text-xs text-muted-foreground">Weekly and batch releases keep freshness elevated longer than binge drops.</p>
              {player?.status === 'active' && (
                <p className="text-xs text-muted-foreground">Current Originals quality bonus: +{Math.round(player.originalsQualityBonus ?? 0)}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setOriginalsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onCommissionOriginal} disabled={!playerPlatformId || originalTitle.trim().length === 0}>
              Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>License a title to a rival</DialogTitle>
          </DialogHeader>

          {licenseProject ? (
            <div className="space-y-4">
              <div className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium">{licenseProject.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Script quality</span>
                  <span className="font-medium">{Math.round(licenseProject.script?.quality ?? 60)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rival platform</Label>
                <Select value={licenseRivalId} onValueChange={setLicenseRivalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rival" />
                  </SelectTrigger>
                  <SelectContent>
                    {rivals
                      .filter((r) => r.status !== 'collapsed')
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license-duration">Window length (weeks)</Label>
                <Input
                  id="license-duration"
                  type="number"
                  min={8}
                  max={52}
                  value={licenseDurationWeeks}
                  onChange={(e) => setLicenseDurationWeeks(clampInt(parseInt(e.target.value || '26', 10), 8, 52))}
                />
                <p className="text-xs text-muted-foreground">You get the cash upfront, but your platform loses differentiation while the window runs.</p>
              </div>

              <div className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Upfront fee</span>
                  <span className="font-medium">{formatUsdCompact(licenseOffer)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Effect</span>
                  <span className="font-medium">Exclusivity → non-exclusive</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a title first.</p>
          )}

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setLicenseOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onLicenseTitleToRival} disabled={!licenseProject || !licenseRivalId}>
              License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
