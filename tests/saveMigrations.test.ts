import { beforeEach, describe, expect, it } from 'vitest';

import { loadGame, type SaveGameSnapshot } from '@/utils/saveLoad';

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

function makeAlpha0Snapshot(): SaveGameSnapshot {
  return {
    meta: { savedAt: '2027-01-01T00:00:00.000Z' } as any,
    gameState: {
      studio: { id: 'player', name: 'Test Studio', reputation: 50, budget: 1_000_000, founded: 2000, specialties: ['drama'], debt: 0, lastProjectWeek: 0, weeksSinceLastProject: 0 },
      currentYear: 2027,
      currentWeek: 1,
      currentQuarter: 1,
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
      universeSeed: 123,
      rngState: 123,
    } as any,
  };
}

describe('save-game migrations', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    (globalThis as any).window = { localStorage };
  });

  it('upgrades missing-version snapshots to the current version on load', () => {
    const snapshot = makeAlpha0Snapshot();
    (globalThis as any).window.localStorage.setItem('studio-magnate-save-slot1', JSON.stringify(snapshot));

    const loaded = loadGame('slot1');
    expect(loaded).not.toBeNull();
    expect(loaded?.meta.version).toBe('alpha-1');

    expect(Array.isArray(loaded?.gameState.projects)).toBe(true);
    expect(Array.isArray(loaded?.gameState.talent)).toBe(true);
    expect(Array.isArray(loaded?.gameState.scripts)).toBe(true);
    expect(Array.isArray(loaded?.gameState.competitorStudios)).toBe(true);
  });
});
