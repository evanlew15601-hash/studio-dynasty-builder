import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/game/store';
import type { Project } from '@/types/game';
import { Building, Tv } from 'lucide-react';

interface AITelevisionStudiosProps {}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return '$' + (amount / 1_000_000_000).toFixed(1) + 'B';
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M';
  return '$' + Math.round(amount).toLocaleString();
}

function formatViews(amount?: number): string {
  if (!amount) return '—';
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(2) + 'B';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  return amount.toLocaleString();
}

export const AITelevisionStudios: React.FC<AITelevisionStudiosProps> = () => {
  const gameState = useGameStore((s) => s.game);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading AI studios...</div>;
  }

  const currentAbs = absWeek(gameState.currentWeek, gameState.currentYear);

  const tvReleases = (gameState.allReleases || [])
    .filter((r): r is Project => typeof (r as any)?.script !== 'undefined')
    .filter((p) => p.type === 'series' || p.type === 'limited-series')
    .filter((p) => !!p.releaseWeek && !!p.releaseYear)
    .sort((a, b) => absWeek(b.releaseWeek!, b.releaseYear!) - absWeek(a.releaseWeek!, a.releaseYear!));

  const released = tvReleases.filter((p) => absWeek(p.releaseWeek!, p.releaseYear!) <= currentAbs);
  const upcoming = tvReleases.filter((p) => absWeek(p.releaseWeek!, p.releaseYear!) > currentAbs);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            AI Television Studios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Released: {released.length}</Badge>
            <Badge variant="outline">Upcoming: {upcoming.length}</Badge>
            <Badge variant="secondary">Total tracked: {tvReleases.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            AI TV series are generated as part of the competitor slate and recorded in the world release catalog.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Recent AI TV Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tvReleases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No AI TV shows generated yet.</p>
          ) : (
            <div className="space-y-2">
              {tvReleases.slice(0, 20).map((p) => {
                const epCount = p.episodeCount || p.seasons?.[0]?.totalEpisodes;
                const views = p.metrics?.streaming?.totalViews;
                const isUpcoming = absWeek(p.releaseWeek!, p.releaseYear!) > currentAbs;

                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 border rounded">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.title}</span>
                        <Badge variant={isUpcoming ? 'secondary' : 'default'} className="text-xs">
                          {isUpcoming ? 'Upcoming' : 'Released'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{p.script?.genre}</Badge>
                        {typeof epCount === 'number' && (
                          <Badge variant="outline" className="text-xs">{epCount} eps</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.studioName || 'Unknown Studio'} • Y{p.releaseYear}W{p.releaseWeek}
                      </div>
                    </div>

                    <div className="text-right text-xs whitespace-nowrap">
                      <div className="text-muted-foreground">Budget</div>
                      <div className="font-mono">{formatMoney(p.budget?.total || 0)}</div>
                    </div>

                    <div className="text-right text-xs whitespace-nowrap">
                      <div className="text-muted-foreground">Views</div>
                      <div className="font-mono">{formatViews(views)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
