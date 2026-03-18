import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/game/store';
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

  const platformMarket = gameState?.platformMarket;

  const { player, rivals, totalAddressableSubs, accountedSubs, rivalsCount, playerSharePct } = useMemo(() => {
    const player = platformMarket?.player;
    const rivals = platformMarket?.rivals ?? [];

    const accountedSubs = (player?.subscribers ?? 0) + rivals.reduce((sum, rival) => sum + (rival.subscribers ?? 0), 0);

    const totalAddressableSubs =
      typeof platformMarket?.totalAddressableSubs === 'number' && platformMarket.totalAddressableSubs > 0
        ? platformMarket.totalAddressableSubs
        : accountedSubs;

    const rivalsCount = rivals.length;

    const playerSharePct = player && totalAddressableSubs > 0 ? (player.subscribers / totalAddressableSubs) * 100 : 0;

    return {
      player,
      rivals,
      totalAddressableSubs,
      accountedSubs,
      rivalsCount,
      playerSharePct,
    };
  }, [platformMarket]);

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
            Early access view. This tab currently displays placeholder UI only.
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
                <p className="text-sm text-muted-foreground">Platform not launched yet.</p>
                <Button type="button" disabled>
                  Launch Platform
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
        </TabsContent>

        <TabsContent value="originals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Originals slate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Commissioning and production management will be implemented in a future update.
              </p>
              <Button type="button" disabled>
                Commission Original
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Prestige drama', 'High-concept sci‑fi', 'Family animation', 'True crime doc'].map((label) => (
              <Card key={label} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs text-muted-foreground">Placeholder project card</div>
                    </div>
                    <Badge variant="secondary">Prototype</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                      <span className="text-muted-foreground">Cash</span>
                      <span className="font-medium">{formatUsdCompact(player.cash ?? 0)}</span>
                    </div>
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
    </div>
  );
};
