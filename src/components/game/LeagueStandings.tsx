import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/game/store';
import type { OnlineLeagueTickGateState, OnlineLeagueTickGateRemoteStudio } from '@/hooks/useOnlineLeagueTickGate';
import type { Project } from '@/types/game';
import { getReleaseDirectorName, getReleaseSource, getReleaseStudioName } from '@/utils/leagueReleases';
import { ReleaseDetailsDialog } from './ReleaseDetailsDialog';
import { StudioProfileDialog } from './StudioProfileDialog';

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

type SortKey = 'reputation' | 'released';

type LeagueRosterRow = OnlineLeagueTickGateRemoteStudio & { isYou?: boolean };

export const LeagueStandings: React.FC<{ tickGate: OnlineLeagueTickGateState }> = ({ tickGate }) => {
  const gameState = useGameStore((s) => s.game);
  const [sortKey, setSortKey] = useState<SortKey>('reputation');
  const [activeStudioName, setActiveStudioName] = useState<string | null>(null);
  const [activeRelease, setActiveRelease] = useState<Project | null>(null);

  const roster = useMemo(() => {
    if (!gameState) return [] as LeagueRosterRow[];

    const you: LeagueRosterRow = {
      userId: tickGate.userId ?? 'you',
      studioName: gameState.studio.name,
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

      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      const br = b.releasedTitles ?? 0;
      const ar = a.releasedTitles ?? 0;
      if (br !== ar) return br - ar;
      return a.studioName.localeCompare(b.studioName);
    });

    return sorted;
  }, [gameState, tickGate.remoteStudios, tickGate.userId, sortKey]);

  const leagueIndustry = useMemo(() => {
    if (!gameState) return { recent: [] as Project[], topCritics: [] as Project[], topAudience: [] as Project[], headlines: [] as string[] };

    const leagueNames = new Set(roster.map((r) => r.studioName).filter(Boolean));

    const all = (gameState.allReleases || []) as any[];

    const studioNameFor = (p: any): string | undefined => {
      const studioName = getReleaseStudioName({ gameState, release: p as any });
      return studioName || undefined;
    };

    const releases = all
      .filter((r) => r && r.status === 'released')
      .filter((r) => {
        const studioName = studioNameFor(r);
        return typeof studioName === 'string' && leagueNames.has(studioName);
      }) as Project[];

    const recencyKey = (p: any) => ((p.releaseYear ?? 0) * 52) + (p.releaseWeek ?? 0);

    const recent = releases
      .slice()
      .sort((a: any, b: any) => recencyKey(b) - recencyKey(a))
      .slice(0, 8);

    const topCritics = releases
      .slice()
      .sort((a: any, b: any) => (Number(b.metrics?.criticsScore ?? 0) - Number(a.metrics?.criticsScore ?? 0)))
      .slice(0, 5);

    const topAudience = releases
      .slice()
      .sort((a: any, b: any) => (Number(b.metrics?.audienceScore ?? 0) - Number(a.metrics?.audienceScore ?? 0)))
      .slice(0, 5);

    const headlineFor = (p: any): string => {
      const studio = studioNameFor(p) || 'A studio';
      const critics = Number(p.metrics?.criticsScore ?? 0);
      const audience = Number(p.metrics?.audienceScore ?? 0);
      const avg = (critics * 0.65) + (audience * 0.35);

      if (avg >= 82) return `${studio}’s ${p.title} is the talk of the town (Index-tier buzz).`;
      if (avg >= 68) return `${studio} lands a solid hit with ${p.title}.`;
      if (avg >= 55) return `${studio}’s ${p.title} splits critics and audiences.`;
      return `${studio} struggles to find momentum with ${p.title}.`;
    };

    const headlines = recent.map(headlineFor).slice(0, 4);

    return { recent, topCritics, topAudience, headlines };
  }, [gameState, roster]);

  const activeStudio = useMemo(() => {
    if (!activeStudioName) return null;
    return roster.find((r) => r.studioName === activeStudioName) || null;
  }, [activeStudioName, roster]);

  const activeStudioReleases = useMemo(() => {
    if (!gameState) return [] as Project[];
    if (!activeStudioName) return [] as Project[];

    const all = (gameState.allReleases || []).filter((item): item is Project => (item as any) && 'script' in (item as any));

    const releases = all
      .filter((p) => p.status === 'released')
      .filter((p) => (getReleaseStudioName({ gameState, release: p }) || '').trim() === activeStudioName);

    const recencyKey = (p: any) => ((p.releaseYear ?? 0) * 52) + (p.releaseWeek ?? 0);

    return releases
      .slice()
      .sort((a: any, b: any) => recencyKey(b) - recencyKey(a));
  }, [activeStudioName, gameState]);

  const activeStudioStats = useMemo(() => {
    const released = activeStudioReleases;
    const count = released.length;

    if (!count) {
      return {
        releasedCount: 0,
        avgCritics: null as number | null,
        avgAudience: null as number | null,
        totalBoxOffice: 0,
      };
    }

    const criticsScores = released.map((p) => Number(p.metrics?.criticsScore ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
    const audienceScores = released.map((p) => Number(p.metrics?.audienceScore ?? 0)).filter((n) => Number.isFinite(n) && n > 0);

    const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

    const totalBoxOffice = released.reduce((sum, p) => sum + Number(p.metrics?.boxOfficeTotal ?? 0), 0);

    return {
      releasedCount: count,
      avgCritics: avg(criticsScores),
      avgAudience: avg(audienceScores),
      totalBoxOffice,
    };
  }, [activeStudioReleases]);

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
            </div>
          </div>

          <div className="space-y-2">
            {roster.map((row, idx) => (
              <div
                key={row.userId}
                className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/5"
                role="button"
                tabIndex={0}
                onClick={() => setActiveStudioName(row.studioName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveStudioName(row.studioName);
                  }
                }}
              >
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
                    {(row.releasedTitles ?? 0)} released
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle>League Industry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Shared, lightweight signals based on league releases.
          </div>

          {leagueIndustry.headlines.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Headlines</div>
              <div className="space-y-2">
                {leagueIndustry.headlines.map((h) => (
                  <div key={h} className="rounded-md border p-3 text-sm">{h}</div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Top critics</div>
              <div className="space-y-2">
                {leagueIndustry.topCritics.map((p) => (
                  <div
                    key={p.id}
                    className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/5"
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveRelease(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveRelease(p);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{getReleaseStudioName({ gameState, release: p as any }) || 'Studio'}</div>
                      {(() => {
                        const source = getReleaseSource({ gameState, project: p });
                        const director = getReleaseDirectorName({ gameState, project: p });
                        const bits = [source, director ? `Dir. ${director}` : null].filter(Boolean);
                        if (bits.length === 0) return null;
                        return <div className="text-xs text-muted-foreground">{bits.join(' • ')}</div>;
                      })()}
                    </div>
                    <div className="text-right text-sm">
                      {Math.round(Number(p.metrics?.criticsScore ?? 0))}/100
                    </div>
                  </div>
                ))}
                {leagueIndustry.topCritics.length === 0 && (
                  <div className="text-sm text-muted-foreground">No releases yet.</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Top audience</div>
              <div className="space-y-2">
                {leagueIndustry.topAudience.map((p) => (
                  <div
                    key={p.id}
                    className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/5"
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveRelease(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveRelease(p);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{getReleaseStudioName({ gameState, release: p as any }) || 'Studio'}</div>
                      {(() => {
                        const source = getReleaseSource({ gameState, project: p });
                        const director = getReleaseDirectorName({ gameState, project: p });
                        const bits = [source, director ? `Dir. ${director}` : null].filter(Boolean);
                        if (bits.length === 0) return null;
                        return <div className="text-xs text-muted-foreground">{bits.join(' • ')}</div>;
                      })()}
                    </div>
                    <div className="text-right text-sm">
                      {Math.round(Number(p.metrics?.audienceScore ?? 0))}/100
                    </div>
                  </div>
                ))}
                {leagueIndustry.topAudience.length === 0 && (
                  <div className="text-sm text-muted-foreground">No releases yet.</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent releases</div>
            <div className="space-y-2">
              {leagueIndustry.recent.map((p) => (
                <div
                  key={p.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/5"
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveRelease(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveRelease(p);
                    }
                  }}
                >
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(getReleaseStudioName({ gameState, release: p as any }) || 'Studio')} • Week {p.releaseWeek ?? '—'}, {p.releaseYear ?? '—'}
                    </div>
                    {(() => {
                      const source = getReleaseSource({ gameState, project: p });
                      const director = getReleaseDirectorName({ gameState, project: p });
                      const bits = [source, director ? `Dir. ${director}` : null].filter(Boolean);
                      if (bits.length === 0) return null;
                      return <div className="text-xs text-muted-foreground">{bits.join(' • ')}</div>;
                    })()}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    C {Math.round(Number(p.metrics?.criticsScore ?? 0))} • A {Math.round(Number(p.metrics?.audienceScore ?? 0))}
                  </div>
                </div>
              ))}
              {leagueIndustry.recent.length === 0 && (
                <div className="text-sm text-muted-foreground">No releases yet.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <StudioProfileDialog
        gameState={gameState}
        studioName={activeStudioName}
        reputation={activeStudio?.reputation}
        open={!!activeStudioName}
        onOpenChange={(open) => {
          if (!open) setActiveStudioName(null);
        }}
        releases={activeStudioReleases}
        stats={activeStudioStats}
        onSelectRelease={(project) => {
          setActiveStudioName(null);
          setActiveRelease(project);
        }}
      />

      <ReleaseDetailsDialog
        gameState={gameState}
        project={activeRelease}
        open={!!activeRelease}
        onOpenChange={(open) => {
          if (!open) setActiveRelease(null);
        }}
      />
    </div>
  );
};
