import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createEmptyIndustryDatabase, syncIndustryDatabase } from '@/utils/industryDatabase';

describe('industry database sync', () => {
  it('captures released films, tv shows, talent, and awards into a persisted catalog', () => {
    const gameState = {
      studio: {
        id: 'player-studio',
        name: 'Player Studio',
        reputation: 55,
        budget: 0,
        founded: 2020,
        specialties: ['drama'],
        awards: [
          {
            id: 'sa-1',
            projectId: 'film-1',
            category: 'Best Picture',
            ceremony: 'Academy Awards',
            year: 2024,
            prestige: 10,
            reputationBoost: 5,
          },
        ],
      },
      competitorStudios: [],
      currentWeek: 10,
      currentYear: 2024,
      projects: [
        {
          id: 'film-1',
          title: 'Test Film',
          type: 'feature',
          status: 'released',
          releaseWeek: 8,
          releaseYear: 2024,
          studioName: 'Player Studio',
          script: { genre: 'action' },
          budget: { total: 50_000_000 },
          metrics: { boxOfficeTotal: 120_000_000, criticsScore: 80, audienceScore: 75 },
        },
        {
          id: 'tv-1',
          title: 'Test Show',
          type: 'series',
          status: 'released',
          releaseWeek: 7,
          releaseYear: 2024,
          studioName: 'Player Studio',
          script: { genre: 'drama' },
          budget: { total: 80_000_000 },
          metrics: {
            criticsScore: 70,
            audienceScore: 72,
            streaming: { totalViews: 5_000_000, audienceShare: 12 },
          },
        },
      ],
      allReleases: [],
      talent: [
        {
          id: 'actor-1',
          name: 'A. Actor',
          type: 'actor',
          age: 30,
          reputation: 60,
          fame: 78,
          marketValue: 10_000_000,
          genres: ['action', 'drama'],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          awards: [
            {
              id: 'ta-1',
              talentId: 'actor-1',
              projectId: 'film-1',
              category: 'Best Actor',
              ceremony: 'Academy Awards',
              year: 2024,
              prestige: 9,
              reputationBoost: 3,
            },
          ],
          filmography: [{ projectId: 'film-1', title: 'Test Film', role: 'Lead Actor', year: 2024, boxOffice: 120_000_000 }],
        },
        {
          id: 'dir-1',
          name: 'D. Director',
          type: 'director',
          age: 44,
          reputation: 67,
          marketValue: 8_000_000,
          genres: ['drama'],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          awards: [],
          filmography: [],
        },
      ],
      // Remaining GameState fields not used by sync
      scripts: [],
      marketConditions: {},
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
    };

    const db0 = createEmptyIndustryDatabase();
    const db1 = syncIndustryDatabase(db0, gameState as unknown as GameState);

    expect(db1.films).toHaveLength(1);
    expect(db1.films[0]).toMatchObject({
      id: 'film-1',
      title: 'Test Film',
      studioName: 'Player Studio',
      genre: 'action',
      boxOfficeTotal: 120_000_000,
    });

    expect(db1.tvShows).toHaveLength(1);
    expect(db1.tvShows[0]).toMatchObject({
      id: 'tv-1',
      title: 'Test Show',
      totalViews: 5_000_000,
    });

    const actor = db1.talent.find((t) => t.id === 'actor-1');
    expect(actor).toBeTruthy();
    expect(actor).toMatchObject({ type: 'actor', fame: 78, awardsCount: 1, filmographyCount: 1 });

    const director = db1.talent.find((t) => t.id === 'dir-1');
    expect(director).toBeTruthy();
    expect(director).toMatchObject({ type: 'director', reputation: 67 });

    expect(db1.awards).toHaveLength(2);
    expect(db1.awards.map((a) => a.year)).toEqual([2024, 2024]);
  });

  it('updates existing film records as metrics change', () => {
    const gameState = {
      studio: { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 0, founded: 2020, specialties: [] },
      competitorStudios: [],
      currentWeek: 12,
      currentYear: 2024,
      projects: [
        {
          id: 'film-1',
          title: 'Test Film',
          type: 'feature',
          status: 'released',
          releaseWeek: 8,
          releaseYear: 2024,
          studioName: 'Player Studio',
          script: { genre: 'action' },
          budget: { total: 50_000_000 },
          metrics: { boxOfficeTotal: 120_000_000, criticsScore: 80, audienceScore: 75 },
        },
      ],
      allReleases: [],
      talent: [],
      scripts: [],
      marketConditions: {},
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
    };

    const db1 = syncIndustryDatabase(createEmptyIndustryDatabase(), gameState as unknown as GameState);
    expect(db1.films[0].boxOfficeTotal).toBe(120_000_000);

    const gameState2 = {
      ...gameState,
      projects: [
        {
          ...gameState.projects[0],
          metrics: {
            ...gameState.projects[0].metrics,
            boxOfficeTotal: 250_000_000,
          },
        },
      ],
    };

    const db2 = syncIndustryDatabase(db1, gameState2 as unknown as GameState);

    expect(db2.films[0].boxOfficeTotal).toBe(250_000_000);
  });
});
