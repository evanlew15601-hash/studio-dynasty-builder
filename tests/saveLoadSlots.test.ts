import { describe, expect, it, beforeEach } from 'vitest';

import {
  deleteGameAsync,
  getActiveSaveSlotId,
  listSaveSlotsAsync,
  normalizeSlotId,
  saveSnapshotAsync,
  setActiveSaveSlotId,
  type SaveGameSnapshot,
} from '@/utils/saveLoad';

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
    meta: { savedAt: '2027-01-01T00:00:00.000Z', version: 'alpha-1' },
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
});
