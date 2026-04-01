import type { GameState, Project, TalentPerson } from '@/types/game';
import type {
  AwardDbRecord,
  FilmDbRecord,
  IndustryDatabase,
  StudioDbRecord,
  TalentDbRecord,
  TvShowDbRecord,
} from '@/types/industryDatabase';

import { getActiveModSlot } from '@/utils/moddingStore';
import { normalizeSlotId } from '@/utils/saveLoad';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const DB_VERSION = 2 as const;

const keyForSlot = (slotId: string, modSlotId?: string) => {
  const db = normalizeSlotId(modSlotId ?? getActiveModSlot()) || 'default';
  const slot = normalizeSlotId(slotId);
  return `studio-magnate-industry-db-${DB_VERSION}-${db}-${slot}`;
};

export function createEmptyIndustryDatabase(): IndustryDatabase {
  return {
    version: DB_VERSION,
    updatedAt: new Date(0).toISOString(),
    films: [],
    tvShows: [],
    talent: [],
    awards: [],
    studios: [],
  };
}

let industryDbStorageDisabled = false;

function isStorageAccessDenied(e: unknown): boolean {
  const DomEx = (globalThis as any).DOMException as (new (...args: any[]) => any) | undefined;
  if (!DomEx) return false;
  if (!(e instanceof DomEx)) return false;
  return e.name === 'SecurityError' || e.name === 'InvalidAccessError';
}

export function loadIndustryDatabase(slotId: string, storage?: StorageLike): IndustryDatabase {
  if (industryDbStorageDisabled) return createEmptyIndustryDatabase();

  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return createEmptyIndustryDatabase();

  try {
    const raw = store.getItem(keyForSlot(slotId));
    if (!raw) return createEmptyIndustryDatabase();

    const parsed = JSON.parse(raw) as IndustryDatabase;
    if (!parsed || parsed.version !== DB_VERSION) return createEmptyIndustryDatabase();

    return parsed;
  } catch (e) {
    if (isStorageAccessDenied(e)) industryDbStorageDisabled = true;
    return createEmptyIndustryDatabase();
  }
}

export function saveIndustryDatabase(slotId: string, db: IndustryDatabase, storage?: StorageLike): void {
  if (industryDbStorageDisabled) return;

  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  try {
    store.setItem(keyForSlot(slotId), JSON.stringify(db));
  } catch (e) {
    if (isStorageAccessDenied(e)) industryDbStorageDisabled = true;
    console.warn('Failed to persist industry database', e);
  }
}

export function clearIndustryDatabase(slotId: string, storage?: StorageLike): void {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  try {
    store.removeItem?.(keyForSlot(slotId));
  } catch (e) {
    console.warn('Failed to clear industry database', e);
  }
}

function getProjectStudioName(gameState: GameState, project: Project): string {
  if (project.studioName && project.studioName.trim()) return project.studioName;
  const isPlayerProject = gameState.projects.some((p) => p.id === project.id);
  if (isPlayerProject) return gameState.studio.name;
  return 'Unknown Studio';
}

function shallowEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;

  const equalValue = (av: unknown, bv: unknown): boolean => {
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      for (let i = 0; i < av.length; i += 1) {
        if (av[i] !== bv[i]) return false;
      }
      return true;
    }
    return av === bv;
  };

  // Records in this module are plain objects with primitive-ish values.
  for (const k in a) {
    if (!equalValue(a[k], b[k])) return false;
  }
  for (const k in b) {
    if (!(k in a)) return false;
  }
  return true;
}

function upsertById<T extends { id: string }>(list: T[], record: T): { list: T[]; changed: boolean } {
  const idx = list.findIndex((x) => x.id === record.id);
  if (idx === -1) {
    return { list: [...list, record], changed: true };
  }

  const prev = list[idx];
  const same = shallowEqualRecord(prev as unknown as Record<string, unknown>, record as unknown as Record<string, unknown>);
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
    gender: t.gender,
    race: t.race,
    nationality: t.nationality,
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

  const allStudioAwards = [
    ...(gameState.studio.awards || []),
    ...gameState.competitorStudios.flatMap((s) => s.awards || []),
  ];

  const studioAwards: AwardDbRecord[] = allStudioAwards.map((a) => {
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
      projectTitle: project?.title || a.projectTitle,
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
        projectTitle: project?.title || award.projectTitle,
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
  };
}

export function syncAndPersistIndustryDatabase(slotId: string, gameState: GameState): IndustryDatabase {
  if (industryDbStorageDisabled) return createEmptyIndustryDatabase();

  const existing = loadIndustryDatabase(slotId);
  const synced = syncIndustryDatabase(existing, gameState);
  if (synced !== existing) {
    saveIndustryDatabase(slotId, synced);
  }
  return synced;
}
