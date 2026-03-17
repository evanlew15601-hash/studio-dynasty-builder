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
    expect(loaded?.meta.version).toBe('alpha-2');

    expect(Array.isArray(loaded?.gameState.projects)).toBe(true);
    expect(Array.isArray(loaded?.gameState.talent)).toBe(true);
    expect(Array.isArray(loaded?.gameState.scripts)).toBe(true);
    expect(Array.isArray(loaded?.gameState.competitorStudios)).toBe(true);

    expect(Array.isArray((loaded as any)?.gameState.worldHistory)).toBe(true);
    expect(Array.isArray((loaded as any)?.gameState.worldYearbooks)).toBe(true);
  });
});
