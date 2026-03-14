import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/game/store';
import type { OnlineLeagueTickGateState, OnlineLeagueTickGateRemoteStudio } from '@/hooks/useOnlineLeagueTickGate';

function formatMoney(amount: number): string {
  return `$${(amount / 1_000_000).toFixed(0)}M`;
}

function formatAgo(iso?: string): string {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '—';

  const s = Math.floor(ms / 1000);
  if (s < 90) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 90) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 72) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type SortKey = 'reputation' | 'released' | 'budget';

type LeagueRosterRow = OnlineLeagueTickGateRemoteStudio & { isYou?: boolean };

export const LeagueStandings: React.FC<{ tickGate: OnlineLeagueTickGateState }> = ({ tickGate }) => {
  const gameState = useGameStore((s) => s.game);
  const [sortKey, setSortKey] = useState<SortKey>('reputation');

  const roster = useMemo(() => {
    if (!gameState) return [] as LeagueRosterRow[];

    const you: LeagueRosterRow = {
      userId: tickGate.userId ?? 'you',
      studioName: gameState.studio.name,
      budget: gameState.studio.budget,
      reputation: gameState.studio.reputation,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      releasedTitles: gameState.projects.filter((p) => p.status === 'released').length,
      updatedAt: new Date().toISOString(),
      isYou: true,
    };

    const list: LeagueRosterRow[] = [you, ...(tickGate.remoteStudios || [])];

    const sorted = list.slice().sort((a, b) => {
      if (sortKey === 'released') {
        const ar = a.releasedTitles ?? 0;
        const br = b.releasedTitles ?? 0;
        if (br !== ar) return br - ar;
      }

      if (sortKey === 'budget') {
        if (b.budget !== a.budget) return b.budget - a.budget;
      }

      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      const br = b.releasedTitles ?? 0;
      const ar = a.releasedTitles ?? 0;
      if (br !== ar) return br - ar;
      return b.budget - a.budget;
    });

    return sorted;
  }, [gameState, tickGate.remoteStudios, tickGate.userId, sortKey]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading league standings…</div>;
  }

  if (tickGate.status !== 'ready') {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle>League Standings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Online league status: {tickGate.status}</div>
          {tickGate.error && <div className="text-destructive">{tickGate.error}</div>}
          <div className="text-xs">This panel only shows studios that are members of your league.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>League Standings</span>
            <Badge variant="outline" className="font-mono">{tickGate.leagueCode}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={tickGate.isHost ? 'default' : 'secondary'}>{tickGate.isHost ? 'Host' : 'Member'}</Badge>
            <Badge variant="outline">Turn {tickGate.turn}</Badge>
            <Badge variant={tickGate.isReady ? 'default' : 'secondary'}>
              {tickGate.isReady ? 'Ready' : 'Not ready'} ({tickGate.readyCount}/{tickGate.memberCount || '?'})
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {roster.length} studio{roster.length === 1 ? '' : 's'} • sorted by {sortKey}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={sortKey === 'reputation' ? 'default' : 'outline'}
                onClick={() => setSortKey('reputation')}
              >
                Reputation
              </Button>
              <Button
                size="sm"
                variant={sortKey === 'released' ? 'default' : 'outline'}
                onClick={() => setSortKey('released')}
              >
                Released
              </Button>
              <Button
                size="sm"
                variant={sortKey === 'budget' ? 'default' : 'outline'}
                onClick={() => setSortKey('budget')}
              >
                Budget
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {roster.map((row, idx) => (
              <div key={row.userId} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">
                    {idx + 1}. {row.studioName}{row.isYou ? ' (You)' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Week {row.week ?? '—'}, {row.year ?? '—'} • Updated {formatAgo(row.updatedAt)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm">Rep {Math.round(row.reputation)}/100</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(row.budget)} • {(row.releasedTitles ?? 0)} released
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
