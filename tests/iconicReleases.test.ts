import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { WORLD_ICONIC_RELEASES } from '@/data/WorldIconicReleases';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';
import { seedIconicReleasesState } from '@/utils/iconicReleases';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    mode: 'single',
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2030,
    currentWeek: 10,
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
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('iconic releases seeding', () => {
  it('seeds the curated back-catalog into allReleases (idempotent)', () => {
    const base = makeBaseState({ currentYear: 2030, currentWeek: 10 });

    const seeded1 = seedIconicReleasesState(base);
    const seeded2 = seedIconicReleasesState(seeded1);

    const seededProjects = (seeded2.allReleases || []).filter((r: any) => r && typeof r === 'object' && 'script' in r);

    expect(seededProjects.length).toBe(WORLD_ICONIC_RELEASES.length);

    // Basic invariants for Metaboxd + DB
    for (const p of seededProjects as any[]) {
      expect(p.status).toBe('released');
      expect(typeof p.releaseYear).toBe('number');
      expect(p.metrics?.criticsScore).toBeTypeOf('number');
      expect(p.metrics?.audienceScore).toBeTypeOf('number');
      expect(Array.isArray(p.metrics?.sharedTopCastNames)).toBe(true);
    }

    const tvCount = seededProjects.filter((p: any) => p.type === 'series' || p.type === 'limited-series').length;
    expect(tvCount).toBeGreaterThan(0);
    expect(tvCount).toBeLessThan(WORLD_ICONIC_RELEASES.length);
  });

  it('does not seed titles from last year / current year (relative to state.currentYear)', () => {
    // cutoffYear = currentYear - 2; with currentYear=2023, 2022 titles should not be added.
    const base = makeBaseState({ currentYear: 2023, currentWeek: 1 });
    const seeded = seedIconicReleasesState(base);

    const seededProjects = (seeded.allReleases || []).filter((r: any) => r && typeof r === 'object' && 'script' in r) as any[];

    const has2022 = seededProjects.some((p) => p.releaseYear === 2022);
    expect(has2022).toBe(false);
  });

  it('each curated title is anchored to a core-talent resume entry (filmography)', () => {
    const coreBySlug = new Map(CORE_TALENT_BIBLE.map((t) => [t.slug, t] as const));

    for (const def of WORLD_ICONIC_RELEASES) {
      let found = false;

      for (const credit of def.credits) {
        const core = coreBySlug.get(credit.slug);
        expect(core).toBeTruthy();

        if (core?.filmography?.some((f) => f.title === def.title && f.year === def.releaseYear)) {
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
    }
  });
});
