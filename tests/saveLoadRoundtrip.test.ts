import { beforeEach, describe, expect, it } from 'vitest';

import type { GameState, Project } from '@/types/game';
import { loadGame, saveGame } from '@/utils/saveLoad';
import { invalidateModBundleCache } from '@/utils/moddingStore';
import { useGameStore } from '@/game/store';
import { validateGameState } from '@/game/core/coreLoopChecks';

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

function stableSerialize(value: any): string {
  const normalize = (v: any): any => {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(normalize);
    if (!v || typeof v !== 'object') return v;

    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = normalize(v[k]);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const project: Project = {
    id: 'project-1',
    title: 'Roundtrip Project',
    type: 'feature',
    currentPhase: 'production',
    status: 'production',
    script: { id: 'script-1', title: 'Script', genre: 'drama', quality: 60, characters: [] } as any,
    budget: { total: 10_000_000 } as any,
    cast: [],
    crew: [],
    timeline: {
      preProduction: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-08T00:00:00.000Z') },
      principalPhotography: { start: new Date('2027-01-09T00:00:00.000Z'), end: new Date('2027-01-16T00:00:00.000Z') },
      postProduction: { start: new Date('2027-01-17T00:00:00.000Z'), end: new Date('2027-01-24T00:00:00.000Z') },
      release: new Date('2027-12-31T00:00:00.000Z'),
      milestones: [],
    },
    locations: [],
    distributionStrategy: {} as any,
    metrics: {} as any,
    phaseDuration: 1,
    contractedTalent: [],
    developmentProgress: {} as any,
  } as any;

  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [project],
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
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 999,
    rngState: 999 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

describe('save/load roundtrip', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    (globalThis as any).window = { localStorage };
    invalidateModBundleCache();
  });

  it('roundtrips gameState through saveGame/loadGame and revives ISO dates', () => {
    useGameStore.getState().initGame(makeBaseState(), 123);

    const before = useGameStore.getState().game!;
    saveGame('roundtrip-slot', before);

    const snap = loadGame('roundtrip-slot');
    expect(snap).not.toBeNull();

    const after = snap!.gameState;

    expect(validateGameState(after)).toEqual([]);

    const p = after.projects[0] as any;
    expect(p.timeline.preProduction.start).toBeInstanceOf(Date);
    expect(p.timeline.release).toBeInstanceOf(Date);

    expect(stableSerialize(after)).toBe(stableSerialize(before));
  });
});
