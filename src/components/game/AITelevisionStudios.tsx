import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGameStore } from '@/game/store';
import type { Project } from '@/types/game';
import { Building, Tv } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

function AITelevisionStudiosInner({ gameState }: { gameState: any }) {
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'airing' | 'released' | 'upcoming'>('all');
  const didInitFilter = useRef(false);

  const { currentAbs, tvReleases, released, upcoming, airing } = useMemo(() => {
    const currentAbs = absWeek(gameState.currentWeek, gameState.currentYear);

    const competitorNames = new Set((gameState.competitorStudios || []).map((s: any) => s.name));
    const playerProjectIds = new Set((gameState.projects || []).map((p: any) => p.id));

    const tvReleases = (gameState.allReleases || [])
      .filter((r: any): r is Project => typeof (r as any)?.script !== 'undefined')
      .filter((p: Project) => p.type === 'series' || p.type === 'limited-series')
      .filter((p: Project) => !!p.releaseWeek && !!p.releaseYear)
      // Only show competitor studio TV shows (exclude player projects that may be copied into allReleases)
      .filter((p: Project) => !playerProjectIds.has(p.id))
      .filter((p: Project) => !!p.studioName && competitorNames.has(p.studioName))
      .sort((a: Project, b: Project) => absWeek(b.releaseWeek!, b.releaseYear!) - absWeek(a.releaseWeek!, a.releaseYear!));

    const released = tvReleases.filter((p: Project) => absWeek(p.releaseWeek!, p.releaseYear!) <= currentAbs);
    const upcoming = tvReleases.filter((p: Project) => absWeek(p.releaseWeek!, p.releaseYear!) > currentAbs);

    const airing = released.filter((p: Project) => {
      const season = p.seasons?.[0];
      const aired = season?.episodesAired || 0;
      const total = season?.totalEpisodes || p.episodeCount || 0;
      return aired > 0 && total > 0 && aired < total;
    });

    return { currentAbs, tvReleases, released, upcoming, airing };
  }, [gameState]);

  useEffect(() => {
    if (didInitFilter.current) return;
    didInitFilter.current = true;

    if (airing.length > 0) setStatusFilter('airing');
    else if (released.length > 0) setStatusFilter('released');
    else if (upcoming.length > 0) setStatusFilter('upcoming');
  }, [airing.length, released.length, upcoming.length]);

  const airingIds = useMemo(() => new Set(airing.map((p: Project) => p.id)), [airing]);
  const releasedIds = useMemo(() => new Set(released.map((p: Project) => p.id)), [released]);
  const upcomingIds = useMemo(() => new Set(upcoming.map((p: Project) => p.id)), [upcoming]);

  const filteredShows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tvReleases.filter((p: Project) => {
      if (statusFilter === 'airing' && !airingIds.has(p.id)) return false;
      if (statusFilter === 'released' && !releasedIds.has(p.id)) return false;
      if (statusFilter === 'upcoming' && !upcomingIds.has(p.id)) return false;

      if (!q) return true;
      const haystack = `${p.title} ${(p.studioName || '')} ${(p.script?.genre || '')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [airingIds, releasedIds, searchQuery, statusFilter, tvReleases, upcomingIds]);

  useEffect(() => {
    if (selectedShowId) return;
    const preferred = airing[0] || released[0] || tvReleases[0];
    if (preferred) setSelectedShowId(preferred.id);
  }, [airing, released, selectedShowId, tvReleases]);

  const selected = useMemo(() => {
    if (!selectedShowId) return null;
    return tvReleases.find((p: Project) => p.id === selectedShowId) || null;
  }, [selectedShowId, tvReleases]);

  const selectOptions = useMemo(() => {
    if (!selected) return filteredShows;
    if (filteredShows.some((p) => p.id === selected.id)) return filteredShows;
    return [selected, ...filteredShows];
  }, [filteredShows, selected]);

  const selectedSeason = selected?.seasons?.[0];
  const selectedAired = selectedSeason?.episodesAired || 0;
  const selectedTotal = selectedSeason?.totalEpisodes || selected?.episodeCount || 0;

  const episodeChartData = useMemo(() => {
    const episodes = selectedSeason?.episodes || [];
    const slice = episodes.slice(0, Math.max(0, selectedAired));

    return slice.map((e: any) => ({
      episode: `E${e.episodeNumber}`,
      viewers: e.viewers || 0,
      completionRate: e.completionRate || 0,
      cumulativeViews: e.cumulativeViews || 0,
    }));
  }, [selectedAired, selectedSeason]);

  const weeklyTimelineData = useMemo(() => {
    const absToWeekYear = (abs: number): { week: number; year: number } => {
      const year = Math.floor((abs - 1) / 52);
      const week = ((abs - 1) % 52) + 1;
      return { week, year };
    };

    const episodes = selectedSeason?.episodes || [];
    const aired = episodes.slice(0, Math.max(0, selectedAired));

    const byAbsWeek = new Map<number, number>();

    for (const ep of aired) {
      if (!ep.airDate) continue;
      const baseAbs = absWeek(ep.airDate.week, ep.airDate.year);
      const weeklyViews = ep.weeklyViews || [];

      for (let idx = 0; idx < weeklyViews.length; idx += 1) {
        const abs = baseAbs + idx;
        byAbsWeek.set(abs, (byAbsWeek.get(abs) || 0) + (weeklyViews[idx] || 0));
      }
    }

    const absWeeks = [...byAbsWeek.keys()].sort((a, b) => a - b);

    const keep = 18;
    const tail = absWeeks.slice(Math.max(0, absWeeks.length - keep));

    let cumulative = 0;

    return tail.map((abs) => {
      const v = byAbsWeek.get(abs) || 0;
      cumulative += v;

      const { week, year } = absToWeekYear(abs);

      return {
        week: `Y${year}W${week}`,
        weeklyViews: v,
        cumulativeViews: cumulative,
      };
    });
  }, [selectedAired, selectedSeason]);

  const selectedStreaming = selected?.metrics?.streaming;

  const selectedIsUpcoming = !!selected && absWeek(selected.releaseWeek!, selected.releaseYear!) > currentAbs;
  const selectedIsAiring =
    !!selected && !selectedIsUpcoming && selectedAired > 0 && selectedTotal > 0 && selectedAired < selectedTotal;

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
            <Badge variant="outline">Airing: {airing.length}</Badge>
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
            Show Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tvReleases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No AI TV shows generated yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-end">
                <div>
                  <div className="text-sm font-medium mb-1">Search</div>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, studio, genre..."
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Showing {filteredShows.length} of {tvReleases.length}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
                    All
                  </Button>
                  <Button size="sm" variant={statusFilter === 'airing' ? 'default' : 'outline'} onClick={() => setStatusFilter('airing')}>
                    Airing
                  </Button>
                  <Button size="sm" variant={statusFilter === 'released' ? 'default' : 'outline'} onClick={() => setStatusFilter('released')}>
                    Released
                  </Button>
                  <Button size="sm" variant={statusFilter === 'upcoming' ? 'default' : 'outline'} onClick={() => setStatusFilter('upcoming')}>
                    Upcoming
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">Select show</div>
                  <Select value={selectedShowId} onValueChange={setSelectedShowId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a competitor show" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {selectOptions.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-muted-foreground">No shows available.</div>
                      ) : (
                        <>
                          {filteredShows.length === 0 && searchQuery.trim() && (
                            <div className="px-2 py-2 text-xs text-muted-foreground">No matches. Showing current selection.</div>
                          )}
                          {selectOptions.slice(0, 200).map((p: Project) => (
                            <SelectItem key={p.id} value={p.id} textValue={`${p.title} ${p.studioName || ''}`}>
                              <span className="block w-full truncate">
                                {p.title}{' '}
                                <span className="text-muted-foreground">({p.studioName})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selected && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedIsUpcoming ? 'secondary' : 'default'} className="text-xs">
                      {selectedIsUpcoming ? 'Upcoming' : selectedIsAiring ? 'Airing' : 'Released'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{selected.script?.genre}</Badge>
                    <Badge variant="outline" className="text-xs">Y{selected.releaseYear}W{selected.releaseWeek}</Badge>
                  </div>
                )}
              </div>

              {selected && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground break-words" title={selected.title}>{selected.title}</span> • {selected.studioName || 'Unknown Studio'}
                    </div>

                    {selectedTotal > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Season progress</span>
                          <span className="font-mono">{selectedAired}/{selectedTotal} eps</span>
                        </div>
                        <Progress value={selectedTotal > 0 ? (selectedAired / selectedTotal) * 100 : 0} className="mt-1" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <div className="font-mono text-sm">{formatMoney(selected.budget?.total || 0)}</div>
                      </div>
                      <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground">Total views</div>
                        <div className="font-mono text-sm">{formatViews(selectedStreaming?.totalViews)}</div>
                      </div>
                      <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground">Completion</div>
                        <div className="font-mono text-sm">{selectedStreaming?.completionRate ?? '—'}%</div>
                      </div>
                      <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground">Audience share</div>
                        <div className="font-mono text-sm">{selectedStreaming?.audienceShare ?? '—'}%</div>
                      </div>
                    </div>

                    {selectedSeason?.premiereDate && (
                      <div className="text-xs text-muted-foreground">
                        Premiered Y{selectedSeason.premiereDate.year}W{selectedSeason.premiereDate.week}
                        {selectedSeason.finaleDate ? ` • Finale Y${selectedSeason.finaleDate.year}W${selectedSeason.finaleDate.week}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="h-64">
                    {episodeChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No aired episodes yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={episodeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="episode" />
                          <YAxis yAxisId="left" tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : v)} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                          <Tooltip
                            formatter={(value: any, name) => {
                              if (name === 'completionRate') return [`${value}%`, 'Completion'];
                              if (name === 'viewers') return [Number(value).toLocaleString(), 'Viewers'];
                              if (name === 'cumulativeViews') return [Number(value).toLocaleString(), 'Cumulative'];
                              return [value, name];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="viewers" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="completionRate" stroke="#16a34a" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="h-56">
                    {weeklyTimelineData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Weekly trend will appear after at least one episode has aired.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={weeklyTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis yAxisId="left" tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : v)} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : v)} />
                          <Tooltip
                            formatter={(value: any, name) => {
                              if (name === 'weeklyViews') return [Number(value).toLocaleString(), 'Weekly views'];
                              if (name === 'cumulativeViews') return [Number(value).toLocaleString(), 'Cumulative (window)'];
                              return [value, name];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="weeklyViews" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="cumulativeViews" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Episode viewers and completion rates are simulated each week. Shows can be mid-season even at game start.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            AI TV Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tvReleases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No AI TV shows generated yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Filtered: {filteredShows.length} / {tvReleases.length}</span>
                <span className="hidden md:inline">Click a row to view details above</span>
              </div>

              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2">
                  {filteredShows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No matching shows.</div>
                  ) : (
                    filteredShows.map((p: Project) => {
                    const epCount = p.episodeCount || p.seasons?.[0]?.totalEpisodes;
                    const views = p.metrics?.streaming?.totalViews;
                    const isUpcoming = absWeek(p.releaseWeek!, p.releaseYear!) > currentAbs;

                    const season = p.seasons?.[0];
                    const aired = season?.episodesAired || 0;
                    const total = season?.totalEpisodes || epCount || 0;
                    const isAiring = !isUpcoming && aired > 0 && total > 0 && aired < total;

                    const isSelected = p.id === selectedShowId;

                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedShowId(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setSelectedShowId(p.id);
                        }}
                        className={`p-3 border rounded cursor-pointer hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring ${
                          isSelected ? 'bg-muted/50 border-primary/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate" title={p.title}>{p.title}</span>
                              <Badge variant={isUpcoming ? 'secondary' : 'default'} className="text-xs shrink-0">
                                {isUpcoming ? 'Upcoming' : isAiring ? 'Airing' : 'Released'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{p.script?.genre}</Badge>
                              {typeof total === 'number' && total > 0 && (
                                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                                  {aired > 0 ? `${aired}/${total} eps` : `${total} eps`}
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground mt-1">
                              {p.studioName || 'Unknown Studio'} • Y{p.releaseYear}W{p.releaseWeek}
                            </div>
                          </div>

                          <div className="hidden md:flex items-start gap-6">
                            <div className="text-right text-xs whitespace-nowrap">
                              <div className="text-muted-foreground">Budget</div>
                              <div className="font-mono">{formatMoney(p.budget?.total || 0)}</div>
                            </div>

                            <div className="text-right text-xs whitespace-nowrap">
                              <div className="text-muted-foreground">Views</div>
                              <div className="font-mono">{formatViews(views)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground md:hidden">
                          <div>
                            Budget <span className="font-mono text-foreground">{formatMoney(p.budget?.total || 0)}</span>
                          </div>
                          <div>
                            Views <span className="font-mono text-foreground">{formatViews(views)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const AITelevisionStudios: React.FC<AITelevisionStudiosProps> = () => {
  const gameState = useGameStore((s) => s.game);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading AI studios...</div>;
  }

  return <AITelevisionStudiosInner gameState={gameState} />;
};
