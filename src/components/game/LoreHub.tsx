import React, { useMemo, useState } from 'react';
import type { Franchise, GameState, Project, PublicDomainIP, Studio, TalentPerson } from '@/types/game';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TalentPortrait } from '@/components/ui/talent-portrait';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { cn } from '@/lib/utils';
import { Book, Building, Film, Search, User, ExternalLink, ScrollText, Trophy } from 'lucide-react';
import { formatMoneyCompact as formatMoneyCompactUtil } from '@/utils/money';
import { ReleaseDetailsDialog } from './ReleaseDetailsDialog';

const formatMoney = (amount: number) => "$" + (amount / 1_000_000).toFixed(0) + "M";

const TwoPaneLayout: React.FC<{
  title: React.ReactNode;
  search: string;
  setSearch: (v: string) => void;
  list: React.ReactNode;
  detail: React.ReactNode;
}> = ({ title, search, setSearch, list, detail }) => (
  <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
        {list}
      </CardContent>
    </Card>
    {detail}
  </div>
);

function findReleaseById(gameState: GameState | null, projectId: string): Project | null {
  if (!gameState) return null;

  const player = (gameState.projects || []).find((p) => p.id === projectId);
  if (player) return player;

  const all = (gameState.allReleases || []).find(
    (r): r is Project => !!r && 'script' in (r as any) && (r as any).id === projectId
  );

  return all || null;
}

// ─── Talent ─────────────────────────────────────────────────────────────────────

const TalentEncyclopedia: React.FC<{ talent: TalentPerson[] }> = ({ talent }) => {
  const gameState = useGameStore((s) => s.game);
  const [activeRelease, setActiveRelease] = useState<Project | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'actor' | 'director'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(talent[0]?.id ?? null);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return talent
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
  }, [talent, search, typeFilter]);

  const selected = useMemo(
    () => talent.find(t => t.id === selectedId) || filtered[0] || null,
    [filtered, selectedId, talent]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['all', 'actor', 'director'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={typeFilter === f ? 'default' : 'outline'}
            className="capitalize"
            onClick={() => setTypeFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      <TwoPaneLayout
        title={<span className="flex items-center gap-2"><User className="h-4 w-4 text-primary" />Talent ({filtered.length})</span>}
        search={search}
        setSearch={setSearch}
        list={
          <ScrollArea className="h-[56vh] pr-3">
            <div className="space-y-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                    selected?.id === t.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <TalentPortrait talent={t} size="sm" />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {t.type} • Age {t.age} • {t.experience}y exp
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{Math.round(t.reputation || 0)}</Badge>
                  </div>
                  {t.archetype && (
                    <div className="mt-1 text-xs text-muted-foreground truncate">{t.archetype}</div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">No talent match your search.</div>
              )}
            </div>
          </ScrollArea>
        }
        detail={
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <CardTitle className="text-lg">{selected?.name ?? 'Select Talent'}</CardTitle>
              {selected && (
                <Button size="sm" variant="outline" onClick={() => openTalentProfile(selected.id)}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Full Profile
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a talent to view their profile.</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">{selected.type}</Badge>
                    <Badge variant="secondary">Rep: {Math.round(selected.reputation || 0)}/100</Badge>
                    {typeof selected.fame === 'number' && (
                      <Badge variant="secondary">Fame: {Math.round(selected.fame)}/100</Badge>
                    )}
                    <Badge variant="outline">Age: {selected.age}</Badge>
                    <Badge variant="outline">Exp: {selected.experience}y</Badge>
                    <Badge variant="outline" className="capitalize">{selected.contractStatus}</Badge>
                    <Badge variant="secondary">Value: {formatMoney(selected.marketValue || 0)}</Badge>
                  </div>

                  {(selected.archetype || selected.biography) && (
                    <div className="space-y-1">
                      {selected.archetype && <p className="text-sm font-medium">{selected.archetype}</p>}
                      {selected.biography && <p className="text-sm text-muted-foreground">{selected.biography}</p>}
                    </div>
                  )}

                  {(selected.traits || []).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Traits</div>
                      <div className="flex flex-wrap gap-2">
                        {(selected.traits || []).slice(0, 10).map((t) => (
                          <Badge key={t} variant="outline">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selected.genres || []).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Genres</div>
                      <div className="flex flex-wrap gap-2">
                        {(selected.genres || []).slice(0, 10).map((g) => (
                          <Badge key={g} variant="secondary" className="capitalize">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selected.careerEvolution || []).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Career Events</div>
                        <div className="space-y-1">
                          {(selected.careerEvolution || [])
                            .slice()
                            .sort((a: any, b: any) => (b.year || 0) - (a.year || 0) || (b.week || 0) - (a.week || 0))
                            .slice(0, 5)
                            .map((e: any, i: number) => (
                              <div key={`${e.type}-${e.year}-${e.week}-${e.sourceProjectId || i}`} className="rounded border p-2 text-sm">
                                <div className="font-medium capitalize">{String(e.type || 'event')}</div>
                                <div className="text-muted-foreground text-xs">{e.year ? `Y${e.year}W${e.week || '—'}` : ''}</div>
                                {e.description && <div className="mt-1 text-sm">{e.description}</div>}
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(selected.awards || []).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Awards ({(selected.awards || []).length})</div>
                        <div className="space-y-1">
                          {(selected.awards || [])
                            .slice()
                            .sort((a: any, b: any) => (b.year || 0) - (a.year || 0))
                            .slice(0, 5)
                            .map((a: any, i: number) => (
                              <div key={a.id || i} className="rounded border p-2 text-sm">
                                <div className="font-medium">
                                  {(a.year ? `${a.year} ` : '') + (a.ceremony || 'Award')} — {a.category || 'Award'}
                                </div>
                                {(a.projectTitle || a.projectId) && (
                                  <div className="text-muted-foreground text-xs">{a.projectTitle || a.projectId}</div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(selected.filmography || []).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Recent Filmography</div>
                        <div className="space-y-1">
                          {(selected.filmography || [])
                            .slice()
                            .sort((a, b) => (b.year || 0) - (a.year || 0))
                            .slice(0, 5)
                            .map((f) => {
                              const release = findReleaseById(gameState, f.projectId);

                              return (
                                <div key={f.projectId} className="rounded border p-2 text-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-medium">{f.year ? `${f.year} — ` : ''}{f.title}</div>
                                      <div className="text-muted-foreground text-xs">
                                        {f.role}{typeof f.boxOffice === 'number' ? ` • ${Math.round(f.boxOffice / 1_000_000)}M` : ''}
                                      </div>
                                    </div>
                                    {release && (
                                      <Button size="sm" variant="outline" onClick={() => setActiveRelease(release)}>
                                        View
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    className="w-full mt-2"
                    variant="outline"
                    onClick={() => openTalentProfile(selected.id)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Button>

                  {gameState && (
                    <ReleaseDetailsDialog
                      gameState={gameState}
                      project={activeRelease}
                      open={!!activeRelease}
                      onOpenChange={(open) => {
                        if (!open) setActiveRelease(null);
                      }}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
};

// ─── Studios ───────────────────────────────────────────────────────────────────

const StudioEncyclopedia: React.FC<{ studios: Studio[] }> = ({ studios }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(studios[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? studios.filter(s => s.name.toLowerCase().includes(q)) : studios;
  }, [studios, search]);

  const selected = useMemo(
    () => studios.find(s => s.id === selectedId) || filtered[0] || studios[0] || null,
    [filtered, selectedId, studios]
  );

  return (
    <TwoPaneLayout
      title={<span className="flex items-center gap-2"><Building className="h-4 w-4 text-primary" />Studios</span>}
      search={search}
      setSearch={setSearch}
      list={
        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-2">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                  selected?.id === s.id && 'border-primary bg-primary/5'
                )}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Rep: {Math.round(s.reputation || 0)}/100 • Budget: {s.budget ? formatMoney(s.budget) : '—'}
                    </div>
                  </div>
                  {s.riskTolerance && (
                    <Badge variant="secondary" className="capitalize">{s.riskTolerance}</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(s.specialties || []).slice(0, 6).map((g) => (
                    <Badge key={g} variant="outline" className="capitalize text-xs">{g}</Badge>
                  ))}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No studios match your search.</div>
            )}
          </div>
        </ScrollArea>
      }
      detail={
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selected?.name ?? 'Studio'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">No studio selected.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Rep: {Math.round(selected.reputation || 0)}/100</Badge>
                  <Badge variant="outline">Founded: {selected.founded || '—'}</Badge>
                  <Badge variant="outline">Budget: {selected.budget ? formatMoney(selected.budget) : '—'}</Badge>
                  {selected.riskTolerance && (
                    <Badge variant="secondary" className="capitalize">{selected.riskTolerance} risk</Badge>
                  )}
                </div>

                {selected.biography && (
                  <div>
                    <div className="text-sm font-medium">Biography</div>
                    <div className="text-sm text-muted-foreground">{selected.biography}</div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium">Specialties</div>
                  <div className="flex flex-wrap gap-2">
                    {(selected.specialties || []).map((g) => (
                      <Badge key={g} variant="outline" className="capitalize">{g}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {selected.brandIdentity && (
                    <div>
                      <div className="text-sm font-medium">Brand</div>
                      <div className="text-sm text-muted-foreground">{selected.brandIdentity}</div>
                    </div>
                  )}
                  {selected.personality && (
                    <div>
                      <div className="text-sm font-medium">Personality</div>
                      <div className="text-sm text-muted-foreground">{selected.personality}</div>
                    </div>
                  )}
                  {selected.businessTendency && (
                    <div>
                      <div className="text-sm font-medium">Business Approach</div>
                      <div className="text-sm text-muted-foreground">{selected.businessTendency}</div>
                    </div>
                  )}
                  {!selected.biography && !selected.brandIdentity && !selected.personality && !selected.businessTendency && (
                    <div className="text-sm text-muted-foreground">
                      No additional lore available for this studio yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      }
    />
  );
};

// ─── Franchises ────────────────────────────────────────────────────────────────

const FranchiseEncyclopedia: React.FC<{ franchises: Franchise[] }> = ({ franchises }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(franchises[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? franchises.filter(f => f.title.toLowerCase().includes(q)) : franchises;
  }, [franchises, search]);

  const selected = useMemo(
    () => franchises.find(f => f.id === selectedId) || filtered[0] || franchises[0] || null,
    [filtered, franchises, selectedId]
  );

  return (
    <TwoPaneLayout
      title={<span className="flex items-center gap-2"><Film className="h-4 w-4 text-primary" />Franchises</span>}
      search={search}
      setSearch={setSearch}
      list={
        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-2">
            {filtered.map((f) => (
              <button
                key={f.id}
                type="button"
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                  selected?.id === f.id && 'border-primary bg-primary/5'
                )}
                onClick={() => setSelectedId(f.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground">Status: {f.status} • Tone: {f.tone}</div>
                  </div>
                  <Badge variant="secondary">{Math.round(f.culturalWeight)}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(f.genre || []).slice(0, 6).map((g) => (
                    <Badge key={g} variant="outline" className="capitalize text-xs">{g}</Badge>
                  ))}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No franchises match your search.</div>
            )}
          </div>
        </ScrollArea>
      }
      detail={
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selected?.title ?? 'Franchise'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">No franchise selected.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{selected.status}</Badge>
                  <Badge variant="secondary" className="capitalize">{selected.tone}</Badge>
                  <Badge variant="outline">Cultural Weight: {Math.round(selected.culturalWeight)}</Badge>
                  <Badge variant="outline">License: {formatMoney(selected.cost || 0)}</Badge>
                </div>

                {selected.description && (
                  <div className="text-sm text-muted-foreground">{selected.description}</div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium">Genres</div>
                  <div className="flex flex-wrap gap-2">
                    {(selected.genre || []).map((g) => (
                      <Badge key={g} variant="outline" className="capitalize">{g}</Badge>
                    ))}
                  </div>
                </div>

                {(selected.franchiseTags || []).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {(selected.franchiseTags || []).slice(0, 16).map((t) => (
                          <Badge key={t} variant="secondary">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      }
    />
  );
};

// ─── Public Domain ─────────────────────────────────────────────────────────────

const PublicDomainEncyclopedia: React.FC<{ ips: PublicDomainIP[] }> = ({ ips }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(ips[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ips.filter(ip => ip.name.toLowerCase().includes(q)) : ips;
  }, [ips, search]);

  const selected = useMemo(
    () => ips.find(ip => ip.id === selectedId) || filtered[0] || ips[0] || null,
    [filtered, ips, selectedId]
  );

  return (
    <TwoPaneLayout
      title={<span className="flex items-center gap-2"><Book className="h-4 w-4 text-primary" />Public Domain</span>}
      search={search}
      setSearch={setSearch}
      list={
        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-2">
            {filtered.map((ip) => (
              <button
                key={ip.id}
                type="button"
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                  selected?.id === ip.id && 'border-primary bg-primary/5'
                )}
                onClick={() => setSelectedId(ip.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{ip.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{ip.domainType}</div>
                  </div>
                  <Badge variant="secondary">{Math.round(ip.reputationScore || 0)}</Badge>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No public domain IPs match your search.</div>
            )}
          </div>
        </ScrollArea>
      }
      detail={
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selected?.name ?? 'Public Domain IP'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">No IP selected.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">{selected.domainType}</Badge>
                  <Badge variant="outline">Iconic: {Math.round(selected.reputationScore || 0)}/100</Badge>
                  <Badge variant="outline">Cost: {formatMoney(selected.cost || 0)}</Badge>
                </div>

                {selected.description && (
                  <div className="text-sm text-muted-foreground">{selected.description}</div>
                )}

                {(selected.genreFlexibility || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Genre Flexibility</div>
                    <div className="flex flex-wrap gap-2">
                      {(selected.genreFlexibility || []).slice(0, 10).map((g) => (
                        <Badge key={g} variant="outline" className="capitalize">{g}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.coreElements || []).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Core Elements</div>
                      <div className="flex flex-wrap gap-2">
                        {(selected.coreElements || []).slice(0, 16).map((e, i) => (
                          <Badge key={i} variant="secondary">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(selected.requiredElements || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Required Elements</div>
                    <div className="flex flex-wrap gap-2">
                      {(selected.requiredElements || []).slice(0, 16).map((e, i) => (
                        <Badge key={i} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      }
    />
  );
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TimelineEncyclopedia: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);
  const [search, setSearch] = useState('');
  const [activeRelease, setActiveRelease] = useState<Project | null>(null);

  const yearbooks = useMemo(() => {
    const yb = gameState?.worldYearbooks || [];
    return yb.slice().sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [gameState]);

  const history = useMemo(() => {
    const h = gameState?.worldHistory || [];
    return h.slice().sort((a, b) => (b.year || 0) - (a.year || 0) || (b.importance || 0) - (a.importance || 0));
  }, [gameState]);

  const filteredYearbooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return yearbooks;
    return yearbooks.filter((y) =>
      String(y.year).includes(q) || y.title.toLowerCase().includes(q) || y.body.toLowerCase().includes(q)
    );
  }, [yearbooks, search]);

  const [selectedYear, setSelectedYear] = useState<number | null>(filteredYearbooks[0]?.year ?? null);

  const selected = useMemo(() => {
    const year = selectedYear ?? filteredYearbooks[0]?.year;
    if (!year) return null;
    return yearbooks.find((y) => y.year === year) || null;
  }, [filteredYearbooks, selectedYear, yearbooks]);

  const eventsForYear = useMemo(() => {
    const year = selected?.year;
    if (!year) return [];
    return history
      .filter((e) => e.year === year)
      .slice()
      .sort((a, b) => (b.importance || 0) - (a.importance || 0) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  }, [history, selected]);

  return (
    <>
      <TwoPaneLayout
        title={<span className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" />Timeline</span>}
        search={search}
        setSearch={setSearch}
        list={
          <ScrollArea className="h-[60vh] pr-3">
            <div className="space-y-2">
              {filteredYearbooks.map((y) => (
                <button
                  key={y.id}
                  type="button"
                  className={cn(
                    'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                    selected?.year === y.year && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedYear(y.year)}
                >
                  <div className="font-medium">{y.year}</div>
                  <div className="text-xs text-muted-foreground truncate">{y.title}</div>
                </button>
              ))}
              {filteredYearbooks.length === 0 && (
                <div className="text-sm text-muted-foreground">No yearbooks yet. Advance time to generate a Year in Review.</div>
              )}
            </div>
          </ScrollArea>
        }
        detail={
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selected?.title ?? 'Year in Review'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a year to view the review.</div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap text-sm">{selected.body}</div>

                  {eventsForYear.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Notable Events</div>
                        <div className="space-y-1">
                          {eventsForYear.slice(0, 12).map((e) => {
                            const talentId = e.entityIds?.talentIds?.[0];
                            const talentExtra = (e.entityIds?.talentIds?.length || 0) - (talentId ? 1 : 0);

                            const projectId = e.entityIds?.projectIds?.[0];
                            const project = projectId ? findReleaseById(gameState, projectId) : null;
                            const projectExtra = (e.entityIds?.projectIds?.length || 0) - (project ? 1 : 0);

                            return (
                              <div key={e.id} className="rounded border p-2 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="font-medium">{e.title}</div>
                                  {typeof e.importance === 'number' && (
                                    <Badge variant="secondary">{e.importance}</Badge>
                                  )}
                                </div>
                                <div className="mt-1 text-muted-foreground text-xs capitalize">{e.kind.replace(/_/g, ' ')}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{e.body}</div>

                                {(talentId || project) && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {talentId && (
                                      <Button size="sm" variant="outline" onClick={() => openTalentProfile(talentId)}>
                                        View talent
                                        {talentExtra > 0 ? ` (+${talentExtra})` : ''}
                                      </Button>
                                    )}
                                    {project && (
                                      <Button size="sm" variant="outline" onClick={() => setActiveRelease(project)}>
                                        View release
                                        {projectExtra > 0 ? ` (+${projectExtra})` : ''}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {eventsForYear.length > 12 && (
                            <div className="text-xs text-muted-foreground">…and {eventsForYear.length - 12} more</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        }
      />

      {gameState && (
        <ReleaseDetailsDialog
          gameState={gameState}
          project={activeRelease}
          open={!!activeRelease}
          onOpenChange={(open) => {
            if (!open) setActiveRelease(null);
          }}
        />
      )}
    </>
  );
};

const LegacyEncyclopedia: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const [activeRelease, setActiveRelease] = useState<Project | null>(null);

  const legacy = gameState?.playerLegacy;
  const studio = gameState?.studio;

  const milestones = useMemo(() => {
    const studioId = studio?.id;
    if (!studioId) return [];

    return (gameState?.worldHistory || [])
      .filter((e) => e.kind === 'studio_milestone')
      .filter((e) => (e.entityIds?.studioIds || []).includes(studioId))
      .slice()
      .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.importance || 0) - (a.importance || 0) || a.id.localeCompare(b.id));
  }, [gameState, studio]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Legacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!legacy || !studio ? (
          <div className="text-sm text-muted-foreground">No legacy data yet. Advance a year to generate the first summary.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Releases: {legacy.totalReleases}</Badge>
              <Badge variant="secondary">Awards: {legacy.totalAwards}</Badge>
              <Badge variant="secondary">Box office: {formatMoneyCompactUtil(legacy.totalBoxOffice)}</Badge>
            </div>

            {legacy.biggestHit && (
              <div className="rounded border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Biggest hit</div>
                    <div className="text-sm">{legacy.biggestHit.title} ({legacy.biggestHit.year})</div>
                    <div className="text-xs text-muted-foreground">{formatMoneyCompactUtil(legacy.biggestHit.boxOffice)} box office</div>
                  </div>
                  {(() => {
                    const release = findReleaseById(gameState, legacy.biggestHit!.projectId);
                    if (!release) return null;
                    return (
                      <Button size="sm" variant="outline" onClick={() => setActiveRelease(release)}>
                        View
                      </Button>
                    );
                  })()}
                </div>
              </div>
            )}

            {milestones.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Milestones</div>
                  <div className="space-y-1">
                    {milestones.slice(0, 12).map((m) => (
                      <div key={m.id} className="rounded border p-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-medium">{m.title}</div>
                          {typeof m.importance === 'number' && <Badge variant="secondary">{m.importance}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">Y{m.year}</div>
                      </div>
                    ))}
                    {milestones.length > 12 && (
                      <div className="text-xs text-muted-foreground">…and {milestones.length - 12} more</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      {gameState && (
        <ReleaseDetailsDialog
          gameState={gameState}
          project={activeRelease}
          open={!!activeRelease}
          onOpenChange={(open) => {
            if (!open) setActiveRelease(null);
          }}
        />
      )}
    </Card>
  );
};

// ─── Root ───────────────────────────────────────────────────────────────────────

export const LoreHub: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  const studios = useMemo(() => {
    if (!gameState) return [] as Studio[];

    const byId = new Map<string, Studio>();
    const order: string[] = [];

    for (const s of [gameState.studio, ...(gameState.competitorStudios || [])]) {
      if (!s?.id) continue;
      if (!byId.has(s.id)) order.push(s.id);
      byId.set(s.id, s);
    }

    return order
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => (b!.reputation || 0) - (a!.reputation || 0)) as Studio[];
  }, [gameState]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading encyclopedia...</div>;
  }

  const uniqById = <T extends { id: string }>(items: T[]): T[] => {
    const byId = new Map<string, T>();
    const order: string[] = [];

    for (const item of items) {
      if (!item?.id) continue;
      if (!byId.has(item.id)) order.push(item.id);
      byId.set(item.id, item);
    }

    return order.map((id) => byId.get(id)!).filter(Boolean);
  };

  const allTalent = uniqById(gameState.talent || []);
  const franchises = uniqById(gameState.franchises || []);
  const publicDomain = uniqById(gameState.publicDomainIPs || []);

  return (
    <Tabs defaultValue="talent" className="space-y-4">
      <TabsList>
        <TabsTrigger value="talent">
          <User className="mr-1.5 h-4 w-4" />
          Talent
        </TabsTrigger>
        <TabsTrigger value="timeline">
          <ScrollText className="mr-1.5 h-4 w-4" />
          Timeline
        </TabsTrigger>
        <TabsTrigger value="legacy">
          <Trophy className="mr-1.5 h-4 w-4" />
          Legacy
        </TabsTrigger>
        <TabsTrigger value="studios">
          <Building className="mr-1.5 h-4 w-4" />
          Studios
        </TabsTrigger>
        <TabsTrigger value="franchises">
          <Film className="mr-1.5 h-4 w-4" />
          Franchises
        </TabsTrigger>
        <TabsTrigger value="public-domain">
          <Book className="mr-1.5 h-4 w-4" />
          Public Domain
        </TabsTrigger>
      </TabsList>

      <TabsContent value="talent">
        <TalentEncyclopedia talent={allTalent} />
      </TabsContent>

      <TabsContent value="timeline">
        <TimelineEncyclopedia />
      </TabsContent>

      <TabsContent value="legacy">
        <LegacyEncyclopedia />
      </TabsContent>

      <TabsContent value="studios">
        <StudioEncyclopedia studios={studios} />
      </TabsContent>

      <TabsContent value="franchises">
        <FranchiseEncyclopedia franchises={franchises} />
      </TabsContent>

      <TabsContent value="public-domain">
        <PublicDomainEncyclopedia ips={publicDomain} />
      </TabsContent>
    </Tabs>
  );
};
