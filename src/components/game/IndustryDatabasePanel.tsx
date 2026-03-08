import React, { useEffect, useMemo, useState } from 'react';
import type { Genre } from '@/types/game';
import type { AwardDbRecord, FilmDbRecord, IndustryDatabase, TalentDbRecord, TvShowDbRecord } from '@/types/industryDatabase';
import { clearIndustryDatabase, createEmptyIndustryDatabase, loadIndustryDatabase, saveIndustryDatabase, syncIndustryDatabase } from '@/utils/industryDatabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ModsPanel } from './ModsPanel';
import { useGameStore } from '@/game/store';

interface IndustryDatabasePanelProps {
  slotId?: string;
}

const formatCurrency = (amount?: number): string => {
  if (!amount || amount <= 0) return '$0';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${Math.floor(amount)}`;
};

const formatNumber = (value?: number): string => {
  if (!value || value <= 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.floor(value)}`;
};

const ALL_GENRES: Genre[] = [
  'action',
  'adventure',
  'comedy',
  'drama',
  'horror',
  'thriller',
  'romance',
  'sci-fi',
  'fantasy',
  'documentary',
  'animation',
  'musical',
  'western',
  'war',
  'biography',
  'crime',
  'mystery',
  'superhero',
  'family',
  'sports',
  'historical',
];

export const IndustryDatabasePanel: React.FC<IndustryDatabasePanelProps> = ({ slotId }) => {
  const gameState = useGameStore((s) => s.game);
  const { toast } = useToast();
  const slot = slotId || 'slot1';

  const [db, setDb] = useState<IndustryDatabase>(() => {
    if (typeof window === 'undefined') return createEmptyIndustryDatabase();
    return loadIndustryDatabase(slot);
  });

  // Keep the persisted database synced with the current world state.
  // We sync on week/year changes and on major catalog size changes to avoid doing
  // a full scan on every small UI interaction.
  useEffect(() => {
    if (!gameState) return;

    setDb((prev) => {
      const synced = syncIndustryDatabase(prev, gameState);
      if (synced !== prev) {
        saveIndustryDatabase(slot, synced);
      }
      return synced;
    });
  }, [
    slot,
    gameState?.currentWeek,
    gameState?.currentYear,
    gameState?.projects.length,
    gameState?.allReleases.length,
    gameState?.talent.length,
    gameState?.competitorStudios.length,
    gameState?.studio.awards?.length || 0,
  ]);

  const handleCopyDatabaseJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(db, null, 2));
      toast({ title: 'Copied', description: 'Industry database JSON copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard in this browser.',
        variant: 'destructive',
      });
    }
  };

  const handleImportDatabaseJson = () => {
    const raw = window.prompt('Paste industry database JSON to import (this will overwrite the current slot).');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as IndustryDatabase;
      if (!parsed || (parsed as any).version !== 1) {
        toast({ title: 'Invalid database', description: 'JSON did not look like an IndustryDatabase v1.', variant: 'destructive' });
        return;
      }

      setDb(parsed);
      saveIndustryDatabase(slot, parsed);
      toast({ title: 'Imported', description: 'Industry database imported into this slot.' });
    } catch {
      toast({ title: 'Invalid JSON', description: 'Could not parse JSON.', variant: 'destructive' });
    }
  };

  const handleResetDatabase = () => {
    clearIndustryDatabase(slot);
    const empty = createEmptyIndustryDatabase();
    setDb(empty);
    saveIndustryDatabase(slot, empty);
    toast({ title: 'Reset', description: 'Industry database reset for this slot.' });
  };

  const filmStudios = useMemo(() => {
    const studios = new Set(db.films.map((f) => f.studioName).filter(Boolean));
    return Array.from(studios).sort((a, b) => a.localeCompare(b));
  }, [db.films]);

  const tvStudios = useMemo(() => {
    const studios = new Set(db.tvShows.map((t) => t.studioName).filter(Boolean));
    return Array.from(studios).sort((a, b) => a.localeCompare(b));
  }, [db.tvShows]);

  const awardYears = useMemo(() => {
    const years = new Set(db.awards.map((a) => a.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [db.awards]);

  // ===== Films tab state =====
  const [filmSearch, setFilmSearch] = useState('');
  const [filmGenre, setFilmGenre] = useState<string>('all');
  const [filmStudio, setFilmStudio] = useState<string>('all');
  const [filmYear, setFilmYear] = useState<string>('all');
  const [minBoxOfficeM, setMinBoxOfficeM] = useState<string>('');
  const [filmSort, setFilmSort] = useState<'boxOffice' | 'critics' | 'audience'>('boxOffice');

  const filmYears = useMemo(() => {
    const years = new Set(db.films.map((f) => f.releaseYear).filter(Boolean) as number[]);
    return Array.from(years).sort((a, b) => b - a);
  }, [db.films]);

  const filteredFilms = useMemo(() => {
    const minBo = minBoxOfficeM.trim() ? Number(minBoxOfficeM) * 1_000_000 : null;

    const list = db.films.filter((f) => {
      if (filmSearch.trim() && !f.title.toLowerCase().includes(filmSearch.trim().toLowerCase())) return false;
      if (filmGenre !== 'all' && f.genre !== filmGenre) return false;
      if (filmStudio !== 'all' && f.studioName !== filmStudio) return false;
      if (filmYear !== 'all' && String(f.releaseYear || '') !== filmYear) return false;
      if (minBo !== null && (f.boxOfficeTotal || 0) < minBo) return false;
      return true;
    });

    const sorted = [...list].sort((a, b) => {
      if (filmSort === 'critics') return (b.criticsScore || 0) - (a.criticsScore || 0);
      if (filmSort === 'audience') return (b.audienceScore || 0) - (a.audienceScore || 0);
      return (b.boxOfficeTotal || 0) - (a.boxOfficeTotal || 0);
    });

    return sorted;
  }, [db.films, filmGenre, filmSearch, filmSort, filmStudio, filmYear, minBoxOfficeM]);

  // ===== TV tab state =====
  const [tvSearch, setTvSearch] = useState('');
  const [tvGenre, setTvGenre] = useState<string>('all');
  const [tvStudio, setTvStudio] = useState<string>('all');
  const [tvYear, setTvYear] = useState<string>('all');
  const [tvSort, setTvSort] = useState<'totalViews' | 'audienceScore' | 'criticsScore'>('totalViews');

  const tvYears = useMemo(() => {
    const years = new Set(db.tvShows.map((f) => f.releaseYear).filter(Boolean) as number[]);
    return Array.from(years).sort((a, b) => b - a);
  }, [db.tvShows]);

  const filteredTv = useMemo(() => {
    const list = db.tvShows.filter((t) => {
      if (tvSearch.trim() && !t.title.toLowerCase().includes(tvSearch.trim().toLowerCase())) return false;
      if (tvGenre !== 'all' && t.genre !== tvGenre) return false;
      if (tvStudio !== 'all' && t.studioName !== tvStudio) return false;
      if (tvYear !== 'all' && String(t.releaseYear || '') !== tvYear) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (tvSort === 'criticsScore') return (b.criticsScore || 0) - (a.criticsScore || 0);
      if (tvSort === 'audienceScore') return (b.audienceScore || 0) - (a.audienceScore || 0);
      return (b.totalViews || 0) - (a.totalViews || 0);
    });
  }, [db.tvShows, tvGenre, tvSearch, tvSort, tvStudio, tvYear]);

  // ===== Talent tab state =====
  const [talentSearch, setTalentSearch] = useState('');
  const [actorSort, setActorSort] = useState<'fame' | 'reputation' | 'marketValue'>('fame');
  const [directorSort, setDirectorSort] = useState<'reputation' | 'marketValue'>('reputation');

  const actors = useMemo(() => {
    const list = db.talent
      .filter((t) => t.type === 'actor')
      .filter((t) => (talentSearch.trim() ? t.name.toLowerCase().includes(talentSearch.trim().toLowerCase()) : true));

    return [...list].sort((a, b) => {
      if (actorSort === 'marketValue') return (b.marketValue || 0) - (a.marketValue || 0);
      if (actorSort === 'reputation') return (b.reputation || 0) - (a.reputation || 0);
      return (b.fame || 0) - (a.fame || 0);
    });
  }, [actorSort, db.talent, talentSearch]);

  const directors = useMemo(() => {
    const list = db.talent
      .filter((t) => t.type === 'director')
      .filter((t) => (talentSearch.trim() ? t.name.toLowerCase().includes(talentSearch.trim().toLowerCase()) : true));

    return [...list].sort((a, b) => {
      if (directorSort === 'marketValue') return (b.marketValue || 0) - (a.marketValue || 0);
      return (b.reputation || 0) - (a.reputation || 0);
    });
  }, [db.talent, directorSort, talentSearch]);

  // ===== Awards tab state =====
  const [awardYear, setAwardYear] = useState<string>('all');
  const [awardType, setAwardType] = useState<'all' | 'studio' | 'talent'>('all');
  const [awardCeremony, setAwardCeremony] = useState<string>('all');

  const awardCeremonies = useMemo(() => {
    const ceremonies = new Set(db.awards.map((a) => a.ceremony).filter(Boolean));
    return Array.from(ceremonies).sort((a, b) => a.localeCompare(b));
  }, [db.awards]);

  const filteredAwards = useMemo(() => {
    return db.awards
      .filter((a) => (awardYear === 'all' ? true : String(a.year) === awardYear))
      .filter((a) => (awardType === 'all' ? true : a.awardType === awardType))
      .filter((a) => (awardCeremony === 'all' ? true : a.ceremony === awardCeremony))
      .sort((a, b) => b.year - a.year);
  }, [awardCeremony, awardType, awardYear, db.awards]);

  // ===== Studios tab state =====
  const studios = useMemo(() => {
    const names = new Set<string>();
    db.studios.forEach((s) => names.add(s.name));
    db.films.forEach((f) => names.add(f.studioName));
    db.tvShows.forEach((t) => names.add(t.studioName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [db.films, db.studios, db.tvShows]);

  const [selectedStudio, setSelectedStudio] = useState<string>('');

  useEffect(() => {
    if (!selectedStudio && studios.length > 0) {
      setSelectedStudio(studios[0]);
      return;
    }

    if (!selectedStudio && gameState?.studio.name) {
      setSelectedStudio(gameState.studio.name);
    }
  }, [gameState, selectedStudio, studios]);

  const studioFilms = useMemo(() => {
    return db.films
      .filter((f) => f.studioName === selectedStudio)
      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || (b.boxOfficeTotal || 0) - (a.boxOfficeTotal || 0));
  }, [db.films, selectedStudio]);

  const studioTv = useMemo(() => {
    return db.tvShows
      .filter((t) => t.studioName === selectedStudio)
      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || (b.totalViews || 0) - (a.totalViews || 0));
  }, [db.tvShows, selectedStudio]);

  const studioTotals = useMemo(() => {
    const totalBoxOffice = studioFilms.reduce((sum, f) => sum + (f.boxOfficeTotal || 0), 0);
    const totalViews = studioTv.reduce((sum, t) => sum + (t.totalViews || 0), 0);
    return { totalBoxOffice, totalViews };
  }, [studioFilms, studioTv]);

  const renderFilmsTable = (rows: FilmDbRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Studio</TableHead>
          <TableHead>Genre</TableHead>
          <TableHead className="text-right">Box Office</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Critics</TableHead>
          <TableHead className="text-right">Audience</TableHead>
          <TableHead>Release</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="font-medium">{f.title}</TableCell>
            <TableCell>{f.studioName}</TableCell>
            <TableCell className="capitalize">{f.genre || 'unknown'}</TableCell>
            <TableCell className="text-right">{formatCurrency(f.boxOfficeTotal)}</TableCell>
            <TableCell className="text-right">{formatCurrency(f.budget)}</TableCell>
            <TableCell className="text-right">{f.criticsScore ?? '—'}</TableCell>
            <TableCell className="text-right">{f.audienceScore ?? '—'}</TableCell>
            <TableCell>
              {f.releaseYear ? `Y${f.releaseYear}` : '—'}
              {f.releaseWeek ? ` W${f.releaseWeek}` : ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderTvTable = (rows: TvShowDbRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Studio</TableHead>
          <TableHead>Genre</TableHead>
          <TableHead className="text-right">Total Views</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="text-right">Critics</TableHead>
          <TableHead className="text-right">Audience</TableHead>
          <TableHead>Release</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t, idx) => (
          <TableRow key={t.id}>
            <TableCell>
              <Badge variant="secondary">#{idx + 1}</Badge>
            </TableCell>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{t.studioName}</TableCell>
            <TableCell className="capitalize">{t.genre || 'unknown'}</TableCell>
            <TableCell className="text-right">{formatNumber(t.totalViews)}</TableCell>
            <TableCell className="text-right">{t.audienceShare != null ? `${t.audienceShare}%` : '—'}</TableCell>
            <TableCell className="text-right">{t.criticsScore ?? '—'}</TableCell>
            <TableCell className="text-right">{t.audienceScore ?? '—'}</TableCell>
            <TableCell>
              {t.releaseYear ? `Y${t.releaseYear}` : '—'}
              {t.releaseWeek ? ` W${t.releaseWeek}` : ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderTalentTable = (rows: TalentDbRecord[], rankLabel: 'Fame' | 'Rep') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">{rankLabel}</TableHead>
          <TableHead className="text-right">Market Value</TableHead>
          <TableHead className="text-right">Awards</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead>Genres</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t, idx) => (
          <TableRow key={t.id}>
            <TableCell>
              <Badge variant="secondary">#{idx + 1}</Badge>
            </TableCell>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell className="text-right">{rankLabel === 'Fame' ? (t.fame ?? '—') : (t.reputation ?? '—')}</TableCell>
            <TableCell className="text-right">{t.marketValue ? formatCurrency(t.marketValue) : '—'}</TableCell>
            <TableCell className="text-right">{t.awardsCount ?? 0}</TableCell>
            <TableCell className="text-right">{t.filmographyCount ?? 0}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(t.genres || []).slice(0, 3).map((g) => (
                  <Badge key={g} variant="outline" className="text-xs capitalize">
                    {g}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderAwardsTable = (rows: AwardDbRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Year</TableHead>
          <TableHead>Ceremony</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Talent</TableHead>
          <TableHead>Studio</TableHead>
          <TableHead className="text-right">Prestige</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((a) => (
          <TableRow key={a.id}>
            <TableCell>Y{a.year}</TableCell>
            <TableCell>{a.ceremony}</TableCell>
            <TableCell>{a.category}</TableCell>
            <TableCell>{a.projectTitle || a.projectId}</TableCell>
            <TableCell>{a.talentName || (a.awardType === 'studio' ? '—' : a.talentId || '—')}</TableCell>
            <TableCell>{a.studioName}</TableCell>
            <TableCell className="text-right">{a.prestige}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Industry Databases (Persisted)</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{slot}</Badge>
              <Button size="sm" variant="secondary" onClick={handleCopyDatabaseJson}>
                Copy JSON
              </Button>
              <Button size="sm" variant="secondary" onClick={handleImportDatabaseJson}>
                Import JSON
              </Button>
              <Button size="sm" variant="destructive" onClick={handleResetDatabase}>
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Browsable databases for released films, TV shows, talent, awards, and studios. This catalog is stored in this browser and continues to update as the simulation runs.
        </CardContent>
      </Card>

      <Tabs defaultValue="films" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="films">Films</TabsTrigger>
          <TabsTrigger value="tv">TV Shows</TabsTrigger>
          <TabsTrigger value="actors">Actors</TabsTrigger>
          <TabsTrigger value="directors">Directors</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="studios">Studios</TabsTrigger>
          <TabsTrigger value="mods">Mods</TabsTrigger>
        </TabsList>

        <TabsContent value="films" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Films Database</span>
                <Badge variant="outline">{filteredFilms.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input value={filmSearch} onChange={(e) => setFilmSearch(e.target.value)} placeholder="Search title..." />

                <Select value={filmGenre} onValueChange={setFilmGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genres</SelectItem>
                    {ALL_GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filmStudio} onValueChange={setFilmStudio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Studio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All studios</SelectItem>
                    {filmStudios.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filmYear} onValueChange={setFilmYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {filmYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={minBoxOfficeM}
                  onChange={(e) => setMinBoxOfficeM(e.target.value)}
                  placeholder="Min box office ($M)"
                  inputMode="decimal"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">Sort by</div>
                <Select value={filmSort} onValueChange={(v) => {
                  if (v === 'boxOffice' || v === 'critics' || v === 'audience') setFilmSort(v);
                }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boxOffice">Box Office</SelectItem>
                    <SelectItem value="critics">Critics Score</SelectItem>
                    <SelectItem value="audience">Audience Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[520px] rounded border">
                {filteredFilms.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No films match your filters yet.</div>
                ) : (
                  <div className="p-2">{renderFilmsTable(filteredFilms)}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tv" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>TV Shows Database + Ratings Ranking</span>
                <Badge variant="outline">{filteredTv.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input value={tvSearch} onChange={(e) => setTvSearch(e.target.value)} placeholder="Search title..." />

                <Select value={tvGenre} onValueChange={setTvGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genres</SelectItem>
                    {ALL_GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={tvStudio} onValueChange={setTvStudio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Studio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All studios</SelectItem>
                    {tvStudios.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={tvYear} onValueChange={setTvYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {tvYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={tvSort} onValueChange={(v) => {
                  if (v === 'totalViews' || v === 'audienceScore' || v === 'criticsScore') setTvSort(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalViews">Total Views (Ranking)</SelectItem>
                    <SelectItem value="audienceScore">Audience Score</SelectItem>
                    <SelectItem value="criticsScore">Critics Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[520px] rounded border">
                {filteredTv.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No TV shows match your filters yet.</div>
                ) : (
                  <div className="p-2">{renderTvTable(filteredTv)}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actors" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Actors Database + Fame Ranking</span>
                <Badge variant="outline">{actors.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="Search talent..." />
                <Select value={actorSort} onValueChange={(v) => {
                  if (v === 'fame' || v === 'reputation' || v === 'marketValue') setActorSort(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fame">Fame</SelectItem>
                    <SelectItem value="reputation">Reputation</SelectItem>
                    <SelectItem value="marketValue">Market Value</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground flex items-center">
                  Fame is persisted from the game talent pool (fallbacks to reputation if needed).
                </div>
              </div>

              <ScrollArea className="h-[520px] rounded border">
                {actors.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No actors available.</div>
                ) : (
                  <div className="p-2">{renderTalentTable(actors, 'Fame')}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directors" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Directors Database</span>
                <Badge variant="outline">{directors.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="Search talent..." />
                <Select value={directorSort} onValueChange={(v) => {
                  if (v === 'reputation' || v === 'marketValue') setDirectorSort(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reputation">Reputation</SelectItem>
                    <SelectItem value="marketValue">Market Value</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground flex items-center">Includes all directors in the persistent talent catalog.</div>
              </div>

              <ScrollArea className="h-[520px] rounded border">
                {directors.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No directors available.</div>
                ) : (
                  <div className="p-2">{renderTalentTable(directors, 'Rep')}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awards" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Awards Database (Filter by Year)</span>
                <Badge variant="outline">{filteredAwards.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={awardYear} onValueChange={setAwardYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {awardYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={awardCeremony} onValueChange={setAwardCeremony}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ceremony" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ceremonies</SelectItem>
                    {awardCeremonies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={awardType} onValueChange={(v) => {
                  if (v === 'all' || v === 'studio' || v === 'talent') setAwardType(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All awards</SelectItem>
                    <SelectItem value="studio">Studio awards</SelectItem>
                    <SelectItem value="talent">Talent awards</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground flex items-center">
                  Awards are captured from both studio wins and talent wins.
                </div>
              </div>

              <ScrollArea className="h-[520px] rounded border">
                {filteredAwards.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No awards match your filters.</div>
                ) : (
                  <div className="p-2">{renderAwardsTable(filteredAwards)}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="studios" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Studios + Released Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={selectedStudio} onValueChange={setSelectedStudio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select studio" />
                  </SelectTrigger>
                  <SelectContent>
                    {studios.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="p-3 rounded border bg-muted/20">
                  <div className="text-sm text-muted-foreground">Total Box Office</div>
                  <div className="text-lg font-semibold">{formatCurrency(studioTotals.totalBoxOffice)}</div>
                </div>

                <div className="p-3 rounded border bg-muted/20">
                  <div className="text-sm text-muted-foreground">Total TV Views</div>
                  <div className="text-lg font-semibold">{formatNumber(studioTotals.totalViews)}</div>
                </div>
              </div>

              <Tabs defaultValue="films" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="films">Films ({studioFilms.length})</TabsTrigger>
                  <TabsTrigger value="tv">TV Shows ({studioTv.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="films">
                  <ScrollArea className="h-[420px] rounded border">
                    {studioFilms.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">No films recorded for this studio yet.</div>
                    ) : (
                      <div className="p-2">{renderFilmsTable(studioFilms)}</div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tv">
                  <ScrollArea className="h-[420px] rounded border">
                    {studioTv.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">No TV shows recorded for this studio yet.</div>
                    ) : (
                      <div className="p-2">{renderTvTable(studioTv)}</div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mods" className="space-y-4">
          <ModsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
