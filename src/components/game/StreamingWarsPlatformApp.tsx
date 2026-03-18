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
import type { Genre, Project, Script } from '@/types/game';
import type { StreamingContract } from '@/types/streamingTypes';
import { getPlatformIdForProject } from '@/utils/platformIds';
import { BarChart3, Crown, Film, Home, Swords, TrendingUp, Users } from 'lucide-react';

const formatCompact = (value: number) => {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const formatUsdCompact = (value: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const clampInt = (n: number, min: number, max: number) => {
  return Math.floor(Math.max(min, Math.min(max, n)));
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

  const platformMarket = gameState?.platformMarket;

  const [launchOpen, setLaunchOpen] = useState(false);
  const [launchName, setLaunchName] = useState('');
  const [launchVibe, setLaunchVibe] = useState('prestige');
  const [launchAdSupportedPct, setLaunchAdSupportedPct] = useState(50);
  const [launchPriceIndex, setLaunchPriceIndex] = useState(1);
  const [launchPromoBudget, setLaunchPromoBudget] = useState(15_000_000);

  const [originalsOpen, setOriginalsOpen] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalGenre, setOriginalGenre] = useState<Genre>('drama');
  const [originalEpisodeCount, setOriginalEpisodeCount] = useState(10);
  const [originalEpisodeBudget, setOriginalEpisodeBudget] = useState(2_500_000);

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

    const released = (gameState?.projects ?? []).filter((p) => p.status === 'released');
    const titlesOnPlatform = playerPlatformId
      ? released.filter((p) => getPlatformIdForProject(p) === playerPlatformId)
      : [];

    const originals = playerPlatformId
      ? (gameState?.projects ?? []).filter((p) => p.streamingContract?.platformId === playerPlatformId)
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
  }, [gameState?.projects, platformMarket]);

  const launchCost = 75_000_000;

  const releasedProjectsCount = (gameState?.projects ?? []).filter((p) => p.status === 'released').length;
  const hasEnoughBudget = (gameState?.studio.budget ?? 0) >= launchCost;
  const hasEnoughReputation = (gameState?.studio.reputation ?? 0) >= 60;
  const hasEnoughReleases = releasedProjectsCount >= 12;

  const canLaunchPlatform = !player && hasEnoughBudget && hasEnoughReputation && hasEnoughReleases;

  const ensureLaunchDefaults = () => {
    if (launchName.trim().length === 0) {
      setLaunchName(`${gameState?.studio.name ?? 'Studio'}+`);
    }
  };

  const onLaunchPlatform = () => {
    if (!gameState) return;

    ensureLaunchDefaults();

    const name = launchName.trim().length > 0 ? launchName.trim() : `${gameState.studio.name}+`;
    const vibe = launchVibe;

    const platformId = `player-platform:${gameState.studio.id}`;

    const tierMix = {
      adSupportedPct: clampInt(launchAdSupportedPct, 0, 100),
      adFreePct: clampInt(100 - launchAdSupportedPct, 0, 100),
    };

    if (!canLaunchPlatform) return;

    const spendResult = spendStudioFunds(launchCost);
    if (!spendResult.success) return;

    setGameState((prev) => {
      const market = prev.platformMarket ?? {};

      return {
        ...prev,
        platformMarket: {
          ...market,
          player: {
            id: platformId,
            name,
            launchedWeek: prev.currentWeek,
            launchedYear: prev.currentYear,
            subscribers: 0,
            cash: 0,
            status: 'active',
            tierMix,
            promotionBudgetPerWeek: launchPromoBudget,
            priceIndex: launchPriceIndex,
            vibe,
          },
        },
      };
    });

    setLaunchOpen(false);
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
    const spendResult = spendStudioFunds(commissionFee);
    if (!spendResult.success) return;

    const script: Script = {
      id: `script:${Date.now()}`,
      title,
      genre: originalGenre,
      logline: `An original ${originalGenre} series commissioned for ${gameState.platformMarket?.player?.name ?? 'your platform'}.`,
      writer: 'In-house',
      pages: 60,
      quality: 65,
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

    const contract: StreamingContract = {
      id: `contract:${Date.now()}`,
      dealKind: 'streaming',
      platformId: playerPlatformId,
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
      expectedViewers: 0,
      expectedCompletionRate: 0.72,
      expectedSubscriberGrowth: 0,
      status: 'active',
      performanceScore: 0,
      exclusivityClause: true,
      marketingSupport: 0,
    };

    const totalBudget = perEpisodeBudget * episodeCount;

    const project: Project = {
      id: `project:${Date.now()}`,
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
        preProduction: { start: new Date(), end: new Date() },
        principalPhotography: { start: new Date(), end: new Date() },
        postProduction: { start: new Date(), end: new Date() },
        release: new Date(),
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
      phaseDuration: 4,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 0,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 60,
        issues: [],
      },
      releaseFormat: 'weekly',
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
                  disabled={!hasEnoughBudget || !hasEnoughReputation || !hasEnoughReleases}
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
                    ? `You no longer own ${player.name}. The platform loop is locked for the rest of this save.`
                    : `${player.name} has been shut down. The platform loop is locked for the rest of this save.`}
                </p>
                <Badge variant={statusVariant(player.status)} className="capitalize w-fit">
                  {player.status}
                </Badge>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New on {player.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {titlesOnPlatform.length > 0 ? (
                  <div className="space-y-2">
                    {titlesOnPlatform
                      .slice()
                      .sort((a, b) => {
                        const aAbs = (a.releaseYear ?? 0) * 52 + (a.releaseWeek ?? 0);
                        const bAbs = (b.releaseYear ?? 0) * 52 + (b.releaseWeek ?? 0);
                        return bAbs - aAbs;
                      })
                      .slice(0, 8)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <div className="text-sm font-medium">{p.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {p.type.replace('-', ' ')} • {p.script?.genre}
                            </div>
                          </div>
                          <Badge variant="outline">On platform</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No titles are currently routed to your platform. Use streaming premieres, Originals, and post-theatrical windows to build your catalog.
                  </p>
                )}
              </CardContent>
            </Card>
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
                <p className="text-sm text-muted-foreground">
                  Originals increase retention, but they also increase burn while you’re still building scale.
                </p>
              )}

              <Button type="button" onClick={() => setOriginalsOpen(true)} disabled={!playerPlatformId || player?.status !== 'active'}>
                Commission Original
              </Button>

              {originals.length > 0 ? (
                <div className="space-y-2">
                  {originals
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <div className="text-sm font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {p.type.replace('-', ' ')} • {p.script?.genre} • {p.status}
                          </div>
                        </div>
                        <Badge variant="outline">Original</Badge>
                      </div>
                    ))}
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

                    {platformMarket?.lastWeek?.player && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net adds (last tick)</span>
                          <span className="font-medium">{formatCompact(platformMarket.lastWeek.player.netAdds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Churn (last tick)</span>
                          <span className="font-medium">{(platformMarket.lastWeek.player.churnRate * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue (last tick)</span>
                          <span className="font-medium">{formatUsdCompact(platformMarket.lastWeek.player.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ops cost (last tick)</span>
                          <span className="font-medium">{formatUsdCompact(platformMarket.lastWeek.player.opsCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit (last tick)</span>
                          <span className={platformMarket.lastWeek.player.profit >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                            {formatUsdCompact(platformMarket.lastWeek.player.profit)}
                          </span>
                        </div>
                      </>
                    )}
                    {typeof player.monthlyPrice === 'number' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly price</span>
                        <span className="font-medium">{formatUsdCompact(player.monthlyPrice)}</span>
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

                        <p className="text-xs text-muted-foreground">
                          Higher prices increase ARPU but worsen churn. Promotion reduces churn and improves acquisition with diminishing returns.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
};
