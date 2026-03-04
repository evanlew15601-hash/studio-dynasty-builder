import React, { useEffect, useMemo, useState } from 'react';
import type { GameState, Genre } from '@/types/game';
import type { AwardDbRecord, FilmDbRecord, IndustryDatabase, ProviderDbRecord, TalentDbRecord, TvShowDbRecord } from '@/types/industryDatabase';
import { createEmptyIndustryDatabase, deleteIndustryDatabaseSlot, listIndustryDatabaseSlots, loadIndustryDatabase, saveIndustryDatabase, syncIndustryDatabase } from '@/utils/industryDatabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IndustryDatabasePanelProps {
  gameState: GameState;
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

export const IndustryDatabasePanel: React.FC<IndustryDatabasePanelProps> = ({ gameState, slotId }) => {
  const defaultSlot = slotId || 'slot1';

  const [slot, setSlot] = useState<string>(defaultSlot);

  const [db, setDb] = useState<IndustryDatabase>(() => {
    if (typeof window === 'undefined') return createEmptyIndustryDatabase();
    return loadIndustryDatabase(defaultSlot);
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [defaultSlot];
    const slots = listIndustryDatabaseSlots();
    return slots.length > 0 ? slots : [defaultSlot];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAvailableSlots((prev) => {
      const next = listIndustryDatabaseSlots();
      return next.length > 0 ? next : prev;
    });
  }, [db.updatedAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDb(loadIndustryDatabase(slot));
  }, [slot]);

  // Keep the persisted database synced with the current world state.
  // We sync on week/year changes and on major catalog size changes to avoid doing
  // a full scan on every small UI interaction.
  useEffect(() => {
    setDb((prev) => {
      const synced = syncIndustryDatabase(prev, gameState);
      if (synced !== prev) {
        saveIndustryDatabase(slot, synced);
      }
      return synced;
    });
  }, [
    slot,
    gameState.currentWeek,
    gameState.currentYear,
    gameState.projects.length,
    gameState.allReleases.length,
    gameState.talent.length,
    gameState.competitorStudios.length,
    gameState.studio.awards?.length || 0,
  ]);

  const exportDatabase = () => {
    const payload = JSON.stringify(db, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `industry-database-${slot}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<IndustryDatabase>;
    // Basic validation: must look like an industry db
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('films' in parsed) || !('awards' in parsed)) {
      throw new Error('Invalid database file');
    }

    const empty = createEmptyIndustryDatabase();
    const normalized: IndustryDatabase = {
      version: empty.version,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      films: Array.isArray(parsed.films) ? (parsed.films as any) : [],
      tvShows: Array.isArray(parsed.tvShows) ? (parsed.tvShows as any) : [],
      talent: Array.isArray(parsed.talent) ? (parsed.talent as any) : [],
      awards: Array.isArray(parsed.awards) ? (parsed.awards as any) : [],
      studios: Array.isArray(parsed.studios) ? (parsed.studios as any) : [],
      providers: Array.isArray((parsed as any).providers) ? ((parsed as any).providers as any) : empty.providers,
    };

    saveIndustryDatabase(slot, normalized);
    setDb(normalized);
  };

  const resetDatabase = () => {
    const ok = window.confirm(`Reset database "${slot}"? This clears the persisted catalog for this slot.`);
    if (!ok) return;
    const empty = createEmptyIndustryDatabase();
    saveIndustryDatabase(slot, empty);
    setDb(empty);
  };

  const saveAsNewSlot = () => {
    const name = window.prompt('Save database as new slot name:', `mod-${slot}`);
    const next = (name || '').trim();
    if (!next) return;
    saveIndustryDatabase(next, db);
    setAvailableSlots((prev) => Array.from(new Set([...prev, next])).sort((a, b) => a.localeCompare(b)));
    setSlot(next);
  };

  const deleteSlot = () => {
    if (slot === defaultSlot) {
      window.alert('Default slot cannot be deleted. You can reset it instead.');
      return;
    }
    const ok = window.confirm(`Delete database slot "${slot}"? This cannot be undone.`);
    if (!ok) return;
    deleteIndustryDatabaseSlot(slot);
    const nextSlots = listIndustryDatabaseSlots();
    setAvailableSlots(nextSlots.length > 0 ? nextSlots : [defaultSlot]);
    setSlot(defaultSlot);
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

  const [selectedStudio, setSelectedStudio] = useState<string>(() => studios[0] || gameState.studio.name);

  const [activeTab, setActiveTab] = useState<'films' | 'tv' | 'actors' | 'directors' | 'awards' | 'studios' | 'providers' | 'modding'>('films');

  // ===== Modding / editor state =====
  const [talentDraft, setTalentDraft] = useState<Partial<TalentDbRecord> & { type?: 'actor' | 'director' }>({
    type: 'actor',
    name: '',
    reputation: 50,
    fame: 50,
  });
  const [editingTalentId, setEditingTalentId] = useState<string | null>(null);

  const [studioDraft, setStudioDraft] = useState<{ id?: string; name: string; founded?: number; reputation?: number; specialties?: Genre[] }>({
    name: '',
    founded: new Date().getFullYear(),
    reputation: 50,
    specialties: ['drama'],
  });
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);

  const [providerDraft, setProviderDraft] = useState<Partial<ProviderDbRecord> & { type?: 'streaming' | 'cable'; tier?: 'major' | 'mid' | 'niche' }>({
    type: 'streaming',
    tier: 'major',
    name: '',
    reach: 70,
    description: '',
  });
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const parseGenres = (raw: string): Genre[] => {
    const parts = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const allowed = new Set(ALL_GENRES);
    return parts.filter((g): g is Genre => allowed.has(g as Genre));
  };

  const persistDb = (next: IndustryDatabase) => {
    saveIndustryDatabase(slot, next);
    setDb(next);
  };

  const upsertTalent = (record: TalentDbRecord) => {
    const idx = db.talent.findIndex((t) => t.id === record.id);
    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      talent: idx === -1 ? [...db.talent, record] : db.talent.map((t) => (t.id === record.id ? record : t)),
    };
    persistDb(next);
  };

  const deleteTalent = (id: string) => {
    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      talent: db.talent.filter((t) => t.id !== id),
      awards: db.awards.filter((a) => a.talentId !== id),
    };
    persistDb(next);
  };

  const upsertStudio = (record: { id: string; name: string; founded?: number; reputation?: number; specialties?: Genre[] }) => {
    const idx = db.studios.findIndex((s) => s.id === record.id);
    const nextStudios = idx === -1
      ? [...db.studios, record]
      : db.studios.map((s) => (s.id === record.id ? record : s));

    // Keep any film/tv/award studioName references consistent if the name changed.
    const prev = idx === -1 ? undefined : db.studios[idx];
    const prevName = prev?.name;

    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      studios: nextStudios,
      films: prevName && prevName !== record.name ? db.films.map((f) => (f.studioName === prevName ? { ...f, studioName: record.name } : f)) : db.films,
      tvShows: prevName && prevName !== record.name ? db.tvShows.map((t) => (t.studioName === prevName ? { ...t, studioName: record.name } : t)) : db.tvShows,
      awards: prevName && prevName !== record.name ? db.awards.map((a) => (a.studioName === prevName ? { ...a, studioName: record.name } : a)) : db.awards,
    };

    persistDb(next);
  };

  const deleteStudio = (id: string) => {
    const st = db.studios.find((s) => s.id === id);
    const name = st?.name;
    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      studios: db.studios.filter((s) => s.id !== id),
      // We don't delete films/TV by studio automatically; just orphan the studio row.
      awards: name ? db.awards.map((a) => (a.studioName === name ? { ...a, studioName: 'Unknown Studio' } : a)) : db.awards,
    };
    persistDb(next);
  };

  const upsertProvider = (record: ProviderDbRecord) => {
    const idx = db.providers.findIndex((p) => p.id === record.id);
    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      providers: idx === -1 ? [...db.providers, record] : db.providers.map((p) => (p.id === record.id ? record : p)),
    };
    persistDb(next);
  };

  const deleteProvider = (id: string) => {
    const next: IndustryDatabase = {
      ...db,
      updatedAt: new Date().toISOString(),
      providers: db.providers.filter((p) => p.id !== id),
    };
    persistDb(next);
  };

  useEffect(() => {
    if (!selectedStudio && studios.length > 0) setSelectedStudio(studios[0]);
  }, [selectedStudio, studios]);

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
          <CardTitle>Industry Databases (Persisted)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            Browsable databases for released films, TV shows, talent, awards, and studios. This catalog is stored in this browser and continues to update as the simulation runs.
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="text-sm text-muted-foreground">Database slot</div>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}{s === defaultSlot ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={saveAsNewSlot}>
                Save As…
              </Button>
              <Button size="sm" variant="outline" onClick={exportDatabase}>
                Export JSON
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await importDatabase(file);
                    } catch {
                      window.alert('Failed to import database. Make sure this is a valid JSON export.');
                    } finally {
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button size="sm" variant="outline" type="button">
                  Import JSON
                </Button>
              </label>
              <Button size="sm" variant="outline" onClick={resetDatabase}>
                Reset
              </Button>
              <Button size="sm" variant="outline" onClick={deleteSlot}>
                Delete Slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="films">Films</TabsTrigger>
          <TabsTrigger value="tv">TV Shows</TabsTrigger>
          <TabsTrigger value="actors">Actors</TabsTrigger>
          <TabsTrigger value="directors">Directors</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="studios">Studios</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="modding">Modding</TabsTrigger>
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

        <TabsContent value="providers" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Providers (Streaming Platforms + Cable Networks)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Providers are used for TV/streaming distribution. Streaming contracts (where present) are shown here; deeper competitor/provider slates can be layered in as the TV system is refined.
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Unassigned TV Shows</span>
                <Badge variant="outline">{db.tvShows.filter((s) => !s.providerId || !db.providers.some((p) => p.id === s.providerId)).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {db.tvShows.filter((s) => !s.providerId || !db.providers.some((p) => p.id === s.providerId)).length === 0 ? (
                <div className="text-sm text-muted-foreground">All TV shows in this database are linked to a provider.</div>
              ) : (
                <ScrollArea className="h-[200px] rounded border">
                  <div className="p-2 space-y-2">
                    {db.tvShows
                      .filter((s) => !s.providerId || !db.providers.some((p) => p.id === s.providerId))
                      .slice()
                      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0))
                      .slice(0, 25)
                      .map((s) => (
                        <div key={s.id} className="p-2 rounded border bg-muted/10">
                          <div className="text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.studioName} • {s.releaseYear ? `Y${s.releaseYear}` : '—'}{s.releaseWeek ? ` W${s.releaseWeek}` : ''}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Providers Directory</span>
                <Badge variant="outline">{db.providers.length} providers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px] rounded border">
                {db.providers.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No providers in this database.</div>
                ) : (
                  <div className="p-2 space-y-2">
                    {db.providers
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => {
                        const activeContracts = gameState.projects.filter(
                          (pr) => pr.streamingContract && (pr.streamingContract as any).platform === (p.id as any)
                        );

                        const catalogShows = db.tvShows
                          .filter((s) => s.providerId === p.id)
                          .slice()
                          .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || (b.totalViews || 0) - (a.totalViews || 0));

                        return (
                          <div key={p.id} className="p-3 rounded border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.type} • {p.tier || '—'} • reach {p.reach ?? '—'}
                                </div>
                                {p.description && (
                                  <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{catalogShows.length} shows</Badge>
                                <Badge variant="secondary">{activeContracts.length} contract{activeContracts.length === 1 ? '' : 's'}</Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProviderId(p.id);
                                    setProviderDraft({ ...p });
                                    setActiveTab('modding');
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>

                            {catalogShows.length > 0 ? (
                              <div className="mt-3 rounded border bg-muted/10 p-3">
                                <div className="text-xs font-medium mb-2">Catalog shows</div>
                                <div className="space-y-2">
                                  {catalogShows.slice(0, 8).map((s) => (
                                    <div key={s.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                                      <div className="text-sm">{s.title}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {s.studioName} • {s.releaseYear ? `Y${s.releaseYear}` : '—'}{s.releaseWeek ? ` W${s.releaseWeek}` : ''} • views {s.totalViews != null ? formatNumber(s.totalViews) : '—'}
                                      </div>
                                    </div>
                                  ))}
                                  {catalogShows.length > 8 && (
                                    <div className="text-xs text-muted-foreground">+ {catalogShows.length - 8} more…</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-muted-foreground">No catalog shows currently assigned to this provider.</div>
                            )}

                            {activeContracts.length > 0 ? (
                              <div className="mt-3 rounded border bg-muted/10 p-3">
                                <div className="text-xs font-medium mb-2">Active contracts</div>
                                <div className="space-y-2">
                                  {activeContracts.map((pr) => {
                                    const c: any = pr.streamingContract;
                                    return (
                                      <div key={pr.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                                        <div className="text-sm">{pr.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {c.status} • {c.startYear} W{c.startWeek} → {c.endYear} W{c.endWeek} • upfront {formatCurrency(c.upfrontPayment)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-muted-foreground">No active contracts currently tracked for this provider.</div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Unassigned TV shows</span>
                <Badge variant="outline">{db.tvShows.filter((s) => !s.providerId).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>
                These shows have no providerId yet. This usually means they haven’t been linked to a provider (or the project’s distribution platform doesn’t match a provider id).
              </div>
              <ScrollArea className="h-[260px] rounded border">
                {db.tvShows.filter((s) => !s.providerId).length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">All TV shows are assigned to a provider.</div>
                ) : (
                  <div className="p-2 space-y-2">
                    {db.tvShows
                      .filter((s) => !s.providerId)
                      .slice()
                      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || (b.totalViews || 0) - (a.totalViews || 0))
                      .slice(0, 20)
                      .map((s) => (
                        <div key={s.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 p-2 rounded border">
                          <div className="text-sm">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.studioName} • {s.releaseYear ? `Y${s.releaseYear}` : '—'}{s.releaseWeek ? ` W${s.releaseWeek}` : ''} • views {s.totalViews != null ? formatNumber(s.totalViews) : '—'}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modding" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Quick Modding (People, Studios, Providers)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                This edits the selected database slot only. Use <strong>Export/Import</strong> to share mods.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Talent (Actors / Directors)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={(talentDraft.type || 'actor') as any}
                        onValueChange={(v) => setTalentDraft((prev) => ({ ...prev, type: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actor">Actor</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={talentDraft.name || ''}
                        onChange={(e) => setTalentDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                      />

                      <Input
                        value={String(talentDraft.age ?? '')}
                        onChange={(e) => setTalentDraft((prev) => ({ ...prev, age: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Age"
                        inputMode="numeric"
                      />

                      <Input
                        value={String(talentDraft.reputation ?? '')}
                        onChange={(e) => setTalentDraft((prev) => ({ ...prev, reputation: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Reputation (0-100)"
                        inputMode="numeric"
                      />

                      {(talentDraft.type || 'actor') === 'actor' && (
                        <Input
                          value={String(talentDraft.fame ?? '')}
                          onChange={(e) => setTalentDraft((prev) => ({ ...prev, fame: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="Fame (0-100)"
                          inputMode="numeric"
                        />
                      )}

                      <Input
                        value={String(talentDraft.marketValue ?? '')}
                        onChange={(e) => setTalentDraft((prev) => ({ ...prev, marketValue: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Market Value (number)"
                        inputMode="numeric"
                      />

                      <Input
                        value={(talentDraft.genres || []).join(', ')}
                        onChange={(e) => setTalentDraft((prev) => ({ ...prev, genres: parseGenres(e.target.value) }))}
                        placeholder="Genres (comma separated)"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const name = (talentDraft.name || '').trim();
                          if (!name) {
                            window.alert('Name is required.');
                            return;
                          }

                          const id = editingTalentId || `mod-talent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                          const type = (talentDraft.type || 'actor') as any;

                          const record: TalentDbRecord = {
                            id,
                            name,
                            type,
                            age: talentDraft.age,
                            reputation: talentDraft.reputation,
                            fame: type === 'actor' ? talentDraft.fame : undefined,
                            marketValue: talentDraft.marketValue,
                            awardsCount: talentDraft.awardsCount,
                            filmographyCount: talentDraft.filmographyCount,
                            genres: talentDraft.genres,
                          };

                          upsertTalent(record);
                          setEditingTalentId(null);
                          setTalentDraft({ type: 'actor', name: '', reputation: 50, fame: 50 });
                        }}
                      >
                        {editingTalentId ? 'Save Changes' : 'Add Talent'}
                      </Button>

                      {editingTalentId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTalentId(null);
                            setTalentDraft({ type: 'actor', name: '', reputation: 50, fame: 50 });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[300px] rounded border">
                      {db.talent.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No talent in this database yet.</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {db.talent
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{t.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t.type} • rep {t.reputation ?? '—'}{t.type === 'actor' ? ` • fame ${t.fame ?? '—'}` : ''}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTalentId(t.id);
                                      setTalentDraft({ ...t });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const ok = window.confirm(`Delete ${t.name}?`);
                                      if (!ok) return;
                                      deleteTalent(t.id);
                                      if (editingTalentId === t.id) {
                                        setEditingTalentId(null);
                                        setTalentDraft({ type: 'actor', name: '', reputation: 50, fame: 50 });
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Studios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={studioDraft.name}
                        onChange={(e) => setStudioDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Studio name"
                      />
                      <Input
                        value={String(studioDraft.founded ?? '')}
                        onChange={(e) => setStudioDraft((prev) => ({ ...prev, founded: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Founded year"
                        inputMode="numeric"
                      />
                      <Input
                        value={String(studioDraft.reputation ?? '')}
                        onChange={(e) => setStudioDraft((prev) => ({ ...prev, reputation: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Reputation (0-100)"
                        inputMode="numeric"
                      />
                      <Input
                        value={(studioDraft.specialties || []).join(', ')}
                        onChange={(e) => setStudioDraft((prev) => ({ ...prev, specialties: parseGenres(e.target.value) }))}
                        placeholder="Specialties (comma separated)"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const name = (studioDraft.name || '').trim();
                          if (!name) {
                            window.alert('Studio name is required.');
                            return;
                          }
                          const id = editingStudioId || `mod-studio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                          upsertStudio({
                            id,
                            name,
                            founded: studioDraft.founded,
                            reputation: studioDraft.reputation,
                            specialties: studioDraft.specialties,
                          });
                          setEditingStudioId(null);
                          setStudioDraft({ name: '', founded: new Date().getFullYear(), reputation: 50, specialties: ['drama'] });
                        }}
                      >
                        {editingStudioId ? 'Save Changes' : 'Add Studio'}
                      </Button>

                      {editingStudioId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingStudioId(null);
                            setStudioDraft({ name: '', founded: new Date().getFullYear(), reputation: 50, specialties: ['drama'] });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[300px] rounded border">
                      {db.studios.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No studios in this database yet.</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {db.studios
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{s.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    founded {s.founded ?? '—'} • rep {s.reputation ?? '—'}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingStudioId(s.id);
                                      setStudioDraft({
                                        id: s.id,
                                        name: s.name,
                                        founded: s.founded,
                                        reputation: s.reputation,
                                        specialties: s.specialties,
                                      });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const ok = window.confirm(`Delete studio ${s.name}?`);
                                      if (!ok) return;
                                      deleteStudio(s.id);
                                      if (editingStudioId === s.id) {
                                        setEditingStudioId(null);
                                        setStudioDraft({ name: '', founded: new Date().getFullYear(), reputation: 50, specialties: ['drama'] });
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Providers (Streaming / Cable)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={(providerDraft.type || 'streaming') as any}
                        onValueChange={(v) => setProviderDraft((prev) => ({ ...prev, type: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="streaming">Streaming</SelectItem>
                          <SelectItem value="cable">Cable Network</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={(providerDraft.tier || 'major') as any}
                        onValueChange={(v) => setProviderDraft((prev) => ({ ...prev, tier: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="niche">Niche</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={providerDraft.name || ''}
                        onChange={(e) => setProviderDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Provider name"
                      />

                      <Input
                        value={String(providerDraft.reach ?? '')}
                        onChange={(e) => setProviderDraft((prev) => ({ ...prev, reach: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Reach (0-100)"
                        inputMode="numeric"
                      />

                      <Input
                        value={providerDraft.description || ''}
                        onChange={(e) => setProviderDraft((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Short description"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const name = (providerDraft.name || '').trim();
                          if (!name) {
                            window.alert('Provider name is required.');
                            return;
                          }

                          const id = editingProviderId || `mod-provider-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

                          const record: ProviderDbRecord = {
                            id,
                            name,
                            type: (providerDraft.type || 'streaming') as any,
                            tier: (providerDraft.tier || 'major') as any,
                            description: (providerDraft.description || '').trim() || undefined,
                            reach: providerDraft.reach,
                          };

                          upsertProvider(record);
                          setEditingProviderId(null);
                          setProviderDraft({ type: 'streaming', tier: 'major', name: '', reach: 70, description: '' });
                        }}
                      >
                        {editingProviderId ? 'Save Changes' : 'Add Provider'}
                      </Button>

                      {editingProviderId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProviderId(null);
                            setProviderDraft({ type: 'streaming', tier: 'major', name: '', reach: 70, description: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[300px] rounded border">
                      {db.providers.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No providers in this database yet.</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {db.providers
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{p.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {p.type} • {p.tier || '—'} • reach {p.reach ?? '—'}
                                  </div>
                                  {p.description && (
                                    <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingProviderId(p.id);
                                      setProviderDraft({ ...p });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const ok = window.confirm(`Delete provider ${p.name}?`);
                                      if (!ok) return;
                                      deleteProvider(p.id);
                                      if (editingProviderId === p.id) {
                                        setEditingProviderId(null);
                                        setProviderDraft({ type: 'streaming', tier: 'major', name: '', reach: 70, description: '' });
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Genre keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {ALL_GENRES.map((g) => (
                      <Badge key={g} variant="outline" className="text-xs capitalize">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
