import React, { useMemo, useState, Suspense } from 'react';
import type { Franchise, PublicDomainIP, Studio } from '@/types/game';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/game/store';
import { cn } from '@/lib/utils';
import { Book, Building, Film, Search, User } from 'lucide-react';

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
                      Rep: {Math.round(s.reputation || 0)}/100 • Budget: {formatMoney(s.budget || 0)}
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
                  <Badge variant="outline">Budget: {formatMoney(selected.budget || 0)}</Badge>
                  {selected.riskTolerance && (
                    <Badge variant="secondary" className="capitalize">{selected.riskTolerance} risk</Badge>
                  )}
                </div>

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
                  {!selected.brandIdentity && !selected.personality && !selected.businessTendency && (
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

// ─── Lazy Talent Biography ──────────────────────────────────────────────────────

const LazyTalentBiography = React.lazy(() =>
  import('./TalentBiographySystem').then(m => ({ default: m.TalentBiographySystem }))
);

// ─── Root ───────────────────────────────────────────────────────────────────────

export const LoreHub: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  const studios = useMemo(() => {
    if (!gameState) return [] as Studio[];
    return [gameState.studio, ...(gameState.competitorStudios || [])]
      .filter(Boolean)
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
  }, [gameState]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading encyclopedia...</div>;
  }

  const franchises = gameState.franchises || [];
  const publicDomain = gameState.publicDomainIPs || [];

  return (
    <Tabs defaultValue="talent" className="space-y-4">
      <TabsList>
        <TabsTrigger value="talent">
          <User className="mr-1.5 h-4 w-4" />
          Talent
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
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading talent biographies...</div>}>
          <LazyTalentBiography gameState={gameState} />
        </Suspense>
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
