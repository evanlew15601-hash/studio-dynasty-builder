import { describe, expect, it, beforeEach } from 'vitest';

import {
  deleteDatabaseSavesAsync,
  deleteGameAsync,
  getActiveSaveSlotId,
  listSaveSlotsAsync,
  loadGame,
  moveDatabaseSavesAsync,
  normalizeSlotId,
  saveGame,
  saveSnapshotAsync,
  setActiveSaveSlotId,
  type SaveGameSnapshot,
} from '@/utils/saveLoad';
import { invalidateModBundleCache, setActiveModSlot } from '@/utils/moddingStore';

type LocalStorageMock = {
  length: number;
  key: (index: number) => string | null;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createLocalStorageMock(): LocalStorageMock {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

function makeSnapshot(): SaveGameSnapshot {
  return {
    meta: { savedAt: '2027-01-01T00:00:00.000Z', version: 'alpha-2' },
    gameState: {
      studio: { id: 'player', name: 'Test Studio', reputation: 50, budget: 1_000_000, founded: 2000, specialties: ['drama'], debt: 0, lastProjectWeek: 0, weeksSinceLastProject: 0 },
      currentYear: 2027,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: [],
      scripts: [],
      competitorStudios: [],
      marketConditions: {
        trendingGenres: ['drama'],
        audiencePreferences: [],
        economicClimate: 'stable',
        technologicalAdvances: [],
        regulatoryChanges: [],
        seasonalTrends: [],
        competitorReleases: [],
        awardsSeasonActive: false,
      },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
      aiStudioProjects: [],
      universeSeed: 123,
      rngState: 123,
    } as any,
  };
}

describe('saveLoad slots', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    (globalThis as any).window = { localStorage };
    invalidateModBundleCache();
  });

  it('normalizes slot ids', () => {
    expect(normalizeSlotId('  My Slot 1  ')).toBe('My-Slot-1');
    expect(normalizeSlotId('weird/$id')).toBe('weirdid');
  });

  it('persists and reads active slot id', () => {
    expect(getActiveSaveSlotId()).toBe('slot1');
    setActiveSaveSlotId('run 2');
    expect(getActiveSaveSlotId()).toBe('run-2');
  });

  it('lists and deletes save slots in localStorage', async () => {
    await saveSnapshotAsync('slot1', makeSnapshot());
    await saveSnapshotAsync('slot2', makeSnapshot());

    expect(await listSaveSlotsAsync()).toEqual(['slot1', 'slot2']);

    await deleteGameAsync('slot1');
    expect(await listSaveSlotsAsync()).toEqual(['slot2']);
  });

  it('stores mod fingerprint in saves created via saveGame()', () => {
    const snap = makeSnapshot();
    saveGame('slot1', snap.gameState);

    const loaded = loadGame('slot1');
    expect(loaded).not.toBeNull();

    expect(loaded?.meta.modSlotId).toBe('default');
    expect(loaded?.meta.modBundleHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('partitions saves by mod slot (database)', async () => {
    const a = makeSnapshot();
    a.gameState.studio.name = 'DB-A';
    await saveSnapshotAsync('slot1', a);

    setActiveModSlot('my-mod');
    invalidateModBundleCache();

    const b = makeSnapshot();
    b.gameState.studio.name = 'DB-B';
    await saveSnapshotAsync('slot1', b);

    expect(await listSaveSlotsAsync()).toEqual(['slot1']);
    expect(await listSaveSlotsAsync('default')).toEqual(['slot1']);

    const loadedA = loadGame('slot1', 'default');
    const loadedB = loadGame('slot1', 'my-mod');

    expect(loadedA?.gameState.studio.name).toBe('DB-A');
    expect(loadedB?.gameState.studio.name).toBe('DB-B');
  });

  it('moves saves when a database is renamed', async () => {
    const snap = makeSnapshot();
    snap.gameState.studio.name = 'Old DB';
    await saveSnapshotAsync('slot1', snap, 'old-db');
    await saveSnapshotAsync('slot2', snap, 'old-db');

    expect(await listSaveSlotsAsync('old-db')).toEqual(['slot1', 'slot2']);

    const moved = await moveDatabaseSavesAsync('old-db', 'new-db');
    expect(moved).toBe(2);

    expect(await listSaveSlotsAsync('old-db')).toEqual([]);
    expect(await listSaveSlotsAsync('new-db')).toEqual(['slot1', 'slot2']);

    const loaded = loadGame('slot1', 'new-db');
    expect(loaded?.meta.modSlotId).toBe('new-db');
  });

  it('deletes all saves in a database', async () => {
    const snap = makeSnapshot();
    await saveSnapshotAsync('slot1', snap, 'db-x');
    await saveSnapshotAsync('slot2', snap, 'db-x');

    const deleted = await deleteDatabaseSavesAsync('db-x');
    expect(deleted).toBe(2);

    expect(await listSaveSlotsAsync('db-x')).toEqual([]);
  });
});
