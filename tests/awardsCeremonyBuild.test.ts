import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { buildAwardShowCeremonyForModal } from '@/utils/awardsCeremony';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2025,
    currentWeek: 6,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama', 'comedy', 'action'],
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
    universeSeed: 99,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('buildAwardShowCeremonyForModal', () => {
  it('reconstructs a ceremony from the saved ceremonyHistory record', () => {
    const playerProject = {
      id: 'p1',
      title: 'Player Film',
      status: 'released',
      releaseWeek: 10,
      releaseYear: 2024,
      type: 'film',
      script: { id: 's1', title: 'Player Film', genre: 'drama', characters: [] },
      budget: { total: 10_000_000 },
      metrics: { criticsScore: 90, audienceScore: 80 },
      cast: [],
      crew: [],
    } as any;

    const director = { id: 't1', name: 'Famous Director', reputation: 70, awards: [], fame: 50 } as any;

    const state = makeBaseState({
      projects: [playerProject],
      allReleases: [playerProject],
      talent: [director],
      awardsSeason: {
        year: 2025,
        processedCeremonies: ['crown-2025'],
        seasonMomentum: {},
        seasonNominations: {},
        ceremonyHistory: {
          crown: {
            showId: 'crown',
            year: 2025,
            ceremonyName: 'Crown',
            prestige: 10,
            nominations: {
              'Best Picture': [{ projectId: 'p1', score: 98 }],
              'Best Director': [{ projectId: 'p1', score: 95, talentId: 't1' }],
            },
            winners: {
              'Best Picture': { projectId: 'p1', score: 98 },
              'Best Director': { projectId: 'p1', score: 95, talentId: 't1' },
            },
          },
        },
      },
    });

    const ceremony = buildAwardShowCeremonyForModal(state, 'crown', 2025);

    expect(ceremony?.ceremonyName).toBe('Crown');
    expect(ceremony?.nominations['Best Picture']?.[0]?.project?.title).toBe('Player Film');

    const winner = ceremony?.winners['Best Picture'];
    expect(winner?.project?.title).toBe('Player Film');
    expect(winner?.award).toBeTruthy();
    expect(winner?.award?.reputationBoost).toBe(20);
  });
});
