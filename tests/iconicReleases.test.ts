import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { WORLD_ICONIC_RELEASES } from '@/data/WorldIconicReleases';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';
import { buildCoreTalent } from '@/data/WorldGenerator';
import { seedIconicReleasesState } from '@/utils/iconicReleases';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const year = overrides?.currentYear ?? 2030;

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
    currentYear: year,
    currentWeek: 10,
    currentQuarter: 1,
    projects: [],
    talent: buildCoreTalent(year),
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

    const has2022Yearbook = (seeded.worldYearbooks || []).some((y) => y.year === 2022);
    expect(has2022Yearbook).toBe(false);

    const has2022History = (seeded.worldHistory || []).some((e) => e.year === 2022);
    expect(has2022History).toBe(false);
  });

  it('rewrites core talent filmography + awards to link to seeded canon releases', () => {
    const base = makeBaseState({ currentYear: 2030, currentWeek: 10 });
    const seeded = seedIconicReleasesState(base);

    for (const def of WORLD_ICONIC_RELEASES) {
      const linkedFilmography = (seeded.talent || []).some((t) =>
        (t.filmography || []).some((f) => f.title === def.title && f.year === def.releaseYear && f.projectId === def.id)
      );
      expect(linkedFilmography).toBe(true);

      const hasAwardInBible = CORE_TALENT_BIBLE.some((b) =>
        (b.awards || []).some((a) => a.projectTitle === def.title && a.year === def.releaseYear)
      );

      if (hasAwardInBible) {
        const linkedAward = (seeded.talent || []).some((t) =>
          (t.awards || []).some((a) => a.projectTitle === def.title && a.year === def.releaseYear && a.projectId === def.id)
        );
        expect(linkedAward).toBe(true);
      }
    }
  });

  it('seeds canon yearbooks + history and recent market snapshots', () => {
    const base = makeBaseState({ currentYear: 2030, currentWeek: 10 });
    const seeded = seedIconicReleasesState(base);

    const distinctYears = new Set(WORLD_ICONIC_RELEASES.map((d) => d.releaseYear));
    expect((seeded.worldYearbooks || []).length).toBe(distinctYears.size);

    expect((seeded.worldHistory || []).some((e) => e.id === 'hist:canon:boxoffice:iconic:film:iron-angel-2018')).toBe(true);

    const hasIronAngelInBoxOffice = (seeded.boxOfficeHistory || []).some((w) =>
      (w.releases || []).some((r) => r.projectId === 'iconic:film:iron-angel-2018')
    );
    expect(hasIronAngelInBoxOffice).toBe(true);

    const hasIronAngelInTopFilms = (seeded.topFilmsHistory || []).some((w) =>
      (w.topFilms || []).some((r) => r.projectId === 'iconic:film:iron-angel-2018')
    );
    expect(hasIronAngelInTopFilms).toBe(true);
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
