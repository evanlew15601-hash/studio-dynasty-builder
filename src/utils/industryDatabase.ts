import type { GameState, Project, TalentPerson } from '@/types/game';
import type {
  AwardDbRecord,
  FilmDbRecord,
  IndustryDatabase,
  ProviderDbRecord,
  StudioDbRecord,
  TalentDbRecord,
  TvShowDbRecord,
} from '@/types/industryDatabase';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const DB_VERSION = 1 as const;

const KEY_PREFIX = `studio-magnate-industry-db-${DB_VERSION}-`;
const keyForSlot = (slotId: string) => `${KEY_PREFIX}${slotId}`;

export function listIndustryDatabaseSlots(storage?: StorageLike): string[] {
  const store: any = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return [];

  const keys: string[] = [];

  // StorageLike doesn't expose length/key, but browser localStorage does.
  if (typeof store.length === 'number' && typeof store.key === 'function') {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k) keys.push(k);
    }
  } else if (typeof store === 'object') {
    // Best-effort fallback for polyfills/mocks.
    for (const k of Object.keys(store)) keys.push(k);
  }

  return keys
    .filter((k) => k.startsWith(KEY_PREFIX))
    .map((k) => k.slice(KEY_PREFIX.length))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function deleteIndustryDatabaseSlot(slotId: string, storage?: StorageLike): void {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store || !store.removeItem) return;
  store.removeItem(keyForSlot(slotId));
}

function defaultProviders(): ProviderDbRecord[] {
  // IDs intentionally align with in-game streaming contract platform identifiers
  // (while names remain fictional to avoid copyright issues).
  return [
    {
      id: 'netflix',
      name: 'StreamFlix',
      type: 'streaming',
      tier: 'major',
      description: 'Global streaming leader with broad mainstream reach and heavy content spend.',
      reach: 92,
    },
    {
      id: 'amazon',
      name: 'Prime Stream',
      type: 'streaming',
      tier: 'major',
      description: 'Bundle-driven streaming service with strong international footprint.',
      reach: 88,
    },
    {
      id: 'hulu',
      name: 'StreamHub',
      type: 'streaming',
      tier: 'mid',
      description: 'Ad-supported streamer focused on next-day TV and adult-skewing originals.',
      reach: 75,
    },
    {
      id: 'disney',
      name: 'Magic Stream',
      type: 'streaming',
      tier: 'major',
      description: 'Family-focused streaming platform with franchise-first strategy.',
      reach: 85,
    },
    {
      id: 'apple',
      name: 'Orchard TV',
      type: 'streaming',
      tier: 'mid',
      description: 'Prestige-leaning streamer with curated originals and premium positioning.',
      reach: 65,
    },
    {
      id: 'hbo',
      name: 'Premium Stream',
      type: 'streaming',
      tier: 'major',
      description: 'High-end subscription streamer known for award-caliber drama and limited series.',
      reach: 78,
    },
    {
      id: 'paramount',
      name: 'Summit+',
      type: 'streaming',
      tier: 'mid',
      description: 'Studio-backed streamer mixing blockbuster libraries with reality and sports docs.',
      reach: 72,
    },
    {
      id: 'peacock',
      name: 'FeatherPlay',
      type: 'streaming',
      tier: 'mid',
      description: 'Hybrid streamer with a strong catalog and live-event integrations.',
      reach: 70,
    },

    // Cable networks (fictional)
    {
      id: 'signal8',
      name: 'Signal 8',
      type: 'cable',
      tier: 'major',
      description: 'Flagship cable network with award-friendly dramas and event miniseries.',
      reach: 80,
    },
    {
      id: 'northstar',
      name: 'Northstar Network',
      type: 'cable',
      tier: 'mid',
      description: 'General entertainment cable network with sports and unscripted blocks.',
      reach: 65,
    },
    {
      id: 'crestnews',
      name: 'Crest News',
      type: 'cable',
      tier: 'niche',
      description: '24-hour news channel with documentary programming and specials.',
      reach: 55,
    },
  ];
}

export function createEmptyIndustryDatabase(): IndustryDatabase {
  return {
    version: DB_VERSION,
    updatedAt: new Date(0).toISOString(),
    films: [],
    tvShows: [],
    talent: [],
    awards: [],
    studios: [],
    providers: defaultProviders(),
  };
}

export function loadIndustryDatabase(slotId: string, storage?: StorageLike): IndustryDatabase {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return createEmptyIndustryDatabase();

  try {
    const raw = store.getItem(keyForSlot(slotId));
    if (!raw) return createEmptyIndustryDatabase();

    const parsed = JSON.parse(raw) as IndustryDatabase;
    if (!parsed || parsed.version !== DB_VERSION) return createEmptyIndustryDatabase();

    // Forward-fill newly added collections so old saves don't break.
    if (!(parsed as any).providers) {
      return {
        ...parsed,
        providers: defaultProviders(),
      } as IndustryDatabase;
    }

    return parsed;
  } catch {
    return createEmptyIndustryDatabase();
  }
}

export function saveIndustryDatabase(slotId: string, db: IndustryDatabase, storage?: StorageLike): void {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  try {
    store.setItem(keyForSlot(slotId), JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to persist industry database', e);
  }
}

function getProjectStudioName(gameState: GameState, project: Project): string {
  if (project.studioName && project.studioName.trim()) return project.studioName;
  return gameState.studio.name;
}

function upsertById<T extends { id: string }>(list: T[], record: T): { list: T[]; changed: boolean } {
  const idx = list.findIndex((x) => x.id === record.id);
  if (idx === -1) {
    return { list: [...list, record], changed: true };
  }

  const prev = list[idx];
  const same = JSON.stringify(prev) === JSON.stringify(record);
  if (same) return { list, changed: false };

  const next = [...list];
  next[idx] = record;
  return { list: next, changed: true };
}

function buildFilmRecord(gameState: GameState, project: Project): FilmDbRecord {
  return {
    id: project.id,
    title: project.title,
    studioName: getProjectStudioName(gameState, project),
    releaseWeek: project.releaseWeek,
    releaseYear: project.releaseYear,
    genre: project.script?.genre,
    budget: project.budget?.total,
    boxOfficeTotal: project.metrics?.boxOfficeTotal,
    criticsScore: project.metrics?.criticsScore,
    audienceScore: project.metrics?.audienceScore,
  };
}

function buildTvShowRecord(gameState: GameState, project: Project): TvShowDbRecord {
  return {
    id: project.id,
    title: project.title,
    studioName: getProjectStudioName(gameState, project),
    releaseWeek: project.releaseWeek,
    releaseYear: project.releaseYear,
    genre: project.script?.genre,
    budget: project.budget?.total,
    totalViews: project.metrics?.streaming?.totalViews,
    audienceShare: project.metrics?.streaming?.audienceShare,
    criticsScore: project.metrics?.criticsScore,
    audienceScore: project.metrics?.audienceScore,
  };
}

function computeFame(t: TalentPerson): number {
  const rep = Math.round(t.reputation || 0);
  return Math.max(0, Math.min(100, t.fame ?? rep));
}

function buildTalentRecord(t: TalentPerson): TalentDbRecord {
  const awardsCount = (t.awards || []).length;
  const filmographyCount = (t.filmography || []).length;

  return {
    id: t.id,
    name: t.name,
    type: t.type === 'director' ? 'director' : 'actor',
    age: t.age,
    fame: t.type === 'actor' ? computeFame(t) : undefined,
    reputation: Math.round(t.reputation || 0),
    marketValue: t.marketValue,
    awardsCount,
    filmographyCount,
    genres: t.genres,
  };
}

function buildStudioRecord(gameState: GameState, studioId: string, name: string): StudioDbRecord {
  if (studioId === gameState.studio.id) {
    return {
      id: studioId,
      name: gameState.studio.name,
      founded: gameState.studio.founded,
      reputation: gameState.studio.reputation,
      specialties: gameState.studio.specialties,
    };
  }

  const st = gameState.competitorStudios.find((s) => s.id === studioId || s.name === name);
  return {
    id: studioId,
    name,
    founded: st?.founded,
    reputation: st?.reputation,
    specialties: st?.specialties,
  };
}

function buildAwardRecords(gameState: GameState): AwardDbRecord[] {
  const byProject = new Map<string, Project>();

  const allProjects: Project[] = [
    ...gameState.projects,
    ...gameState.allReleases.filter((r): r is Project => 'script' in r),
  ];

  allProjects.forEach((p) => byProject.set(p.id, p));

  const studioAwards: AwardDbRecord[] = (gameState.studio.awards || []).map((a) => {
    const project = byProject.get(a.projectId);
    const studioName = project ? getProjectStudioName(gameState, project) : 'Unknown Studio';

    return {
      id: a.id,
      awardType: 'studio',
      year: a.year,
      ceremony: a.ceremony,
      category: a.category,
      prestige: a.prestige,
      studioName,
      projectId: a.projectId,
      projectTitle: project?.title,
    };
  });

  const talentAwards: AwardDbRecord[] = gameState.talent
    .flatMap((t) => (t.awards || []).map((a) => ({ talent: t, award: a })))
    .map(({ talent, award }) => {
      const project = byProject.get(award.projectId);
      const studioName = project ? getProjectStudioName(gameState, project) : 'Unknown Studio';

      return {
        id: award.id,
        awardType: 'talent',
        year: award.year,
        ceremony: award.ceremony,
        category: award.category,
        prestige: award.prestige,
        studioName,
        projectId: award.projectId,
        projectTitle: project?.title,
        talentId: talent.id,
        talentName: talent.name,
      };
    });

  return [...studioAwards, ...talentAwards];
}

export function syncIndustryDatabase(db: IndustryDatabase, gameState: GameState): IndustryDatabase {
  let changed = false;

  let nextFilms = db.films;
  let nextTv = db.tvShows;
  let nextTalent = db.talent;
  let nextAwards = db.awards;
  let nextStudios = db.studios;
  const nextProviders = db.providers;

  const allProjects: Project[] = [
    ...gameState.projects,
    ...gameState.allReleases.filter((r): r is Project => 'script' in r),
  ];

  // Always include core studio rows (even if they haven't released yet).
  {
    const { list, changed: sc } = upsertById(nextStudios, buildStudioRecord(gameState, gameState.studio.id, gameState.studio.name));
    nextStudios = list;
    changed = changed || sc;

    for (const st of gameState.competitorStudios) {
      const { list: l2, changed: c2 } = upsertById(nextStudios, buildStudioRecord(gameState, st.id, st.name));
      nextStudios = l2;
      changed = changed || c2;
    }
  }

  // Released films + TV shows
  for (const p of allProjects) {
    const isReleased = p.status === 'released' || p.status === 'distribution' || p.status === 'archived';
    if (!isReleased) continue;

    const isTv = p.type === 'series' || p.type === 'limited-series';

    if (isTv) {
      const { list, changed: c } = upsertById(nextTv, buildTvShowRecord(gameState, p));
      nextTv = list;
      changed = changed || c;
    } else {
      const { list, changed: c } = upsertById(nextFilms, buildFilmRecord(gameState, p));
      nextFilms = list;
      changed = changed || c;
    }

    const stName = getProjectStudioName(gameState, p);
    const studioId = stName === gameState.studio.name ? gameState.studio.id : `studio:${stName}`;
    const { list: studiosList, changed: sc } = upsertById(nextStudios, buildStudioRecord(gameState, studioId, stName));
    nextStudios = studiosList;
    changed = changed || sc;
  }

  // Talent (actors + directors)
  for (const t of gameState.talent) {
    if (t.type !== 'actor' && t.type !== 'director') continue;
    const { list, changed: c } = upsertById(nextTalent, buildTalentRecord(t));
    nextTalent = list;
    changed = changed || c;
  }

  // Awards
  for (const award of buildAwardRecords(gameState)) {
    const { list, changed: c } = upsertById(nextAwards, award);
    nextAwards = list;
    changed = changed || c;
  }

  if (!changed) return db;

  return {
    version: DB_VERSION,
    updatedAt: new Date().toISOString(),
    films: nextFilms,
    tvShows: nextTv,
    talent: nextTalent,
    awards: nextAwards,
    studios: nextStudios,
    providers: nextProviders,
  };
}

export function syncAndPersistIndustryDatabase(slotId: string, gameState: GameState): IndustryDatabase {
  const existing = loadIndustryDatabase(slotId);
  const synced = syncIndustryDatabase(existing, gameState);
  if (synced !== existing) {
    saveIndustryDatabase(slotId, synced);
  }
  return synced;
}
