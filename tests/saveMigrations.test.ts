import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { loadGame } from '@/utils/saveLoad';

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

function loadFixture(name: string): unknown {
  const baseDir = dirname(fileURLToPath(import.meta.url));
  const path = join(baseDir, 'fixtures', 'snapshots', name);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('save-game migrations', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    (globalThis as any).window = { localStorage };
  });

  it('upgrades fixture snapshots to the current version on load', () => {
    const snapshot = loadFixture('alpha-0.json');
    (globalThis as any).window.localStorage.setItem('studio-magnate-save-slot1', JSON.stringify(snapshot));

    const loaded = loadGame('slot1');
    expect(loaded).not.toBeNull();
    expect(loaded?.meta.version).toBe('alpha-3');

    expect(Array.isArray(loaded?.gameState.projects)).toBe(true);
    expect(Array.isArray(loaded?.gameState.talent)).toBe(true);
    expect(Array.isArray(loaded?.gameState.scripts)).toBe(true);
    expect(Array.isArray(loaded?.gameState.competitorStudios)).toBe(true);

    expect(Array.isArray((loaded as any)?.gameState.worldHistory)).toBe(true);
    expect(Array.isArray((loaded as any)?.gameState.worldYearbooks)).toBe(true);
  });

  it('normalizes legacy Streaming Wars DLC flags during alpha-2 -> alpha-3 migration', () => {
    const snapshot = {
      gameState: {
        studio: {
          id: 'studio-1',
          name: 'Test Studio',
          reputation: 50,
          budget: 1000000,
          founded: 1980,
          specialties: [],
        },
        currentWeek: 1,
        currentYear: 2020,
        currentQuarter: 1,
        expansions: {
          enableStreamingWars: true,
        },
      },
      meta: {
        savedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        version: 'alpha-2',
      },
    };

    (globalThis as any).window.localStorage.setItem('studio-magnate-save-slot1', JSON.stringify(snapshot));

    const loaded = loadGame('slot1');
    expect(loaded).not.toBeNull();
    expect(loaded?.meta.version).toBe('alpha-3');

    expect((loaded as any)?.gameState?.dlc).toEqual({ streamingWars: true });
    expect(typeof (loaded as any)?.gameState?.dlc?.streamingWars).toBe('boolean');
    expect((loaded as any)?.gameState?.expansions).toBeUndefined();

    const snapshot2 = {
      gameState: {
        studio: {
          id: 'studio-1',
          name: 'Test Studio',
          reputation: 50,
          budget: 1000000,
          founded: 1980,
          specialties: [],
        },
        currentWeek: 1,
        currentYear: 2020,
        currentQuarter: 1,
        dlc: {
          streamingWars: {
            enabled: false,
          },
        },
      },
      meta: {
        savedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        version: 'alpha-2',
      },
    };

    (globalThis as any).window.localStorage.setItem('studio-magnate-save-slot1', JSON.stringify(snapshot2));

    const loaded2 = loadGame('slot1');
    expect(loaded2).not.toBeNull();
    expect((loaded2 as any)?.gameState?.dlc).toEqual({ streamingWars: false });
    expect(typeof (loaded2 as any)?.gameState?.dlc?.streamingWars).toBe('boolean');
  });
});
