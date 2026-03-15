import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import type { LeagueReleasedProjectSnapshot } from '@/types/onlineLeague';
import { getReleaseDirectorName, getReleaseSource, getReleaseStudioName, getReleaseTopCastNames, mergeLeagueReleaseSnapshotsIntoAllReleases, stableLeagueReleaseId, toLeagueReleaseProject } from '@/utils/leagueReleases';

function makeBaseGameState(): GameState {
  return {
    universeSeed: 1,
    rngState: 1,
    studio: {
      id: 'studio-1',
      name: 'You',
      reputation: 50,
      budget: 10_000_000,
      founded: 1965,
      specialties: ['drama'],
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0,
    },
    currentYear: 2000,
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
  } as any;
}

describe('leagueReleases', () => {
  it('toLeagueReleaseProject builds a stable id and copies public metadata into metrics', () => {
    const snapshot: LeagueReleasedProjectSnapshot = {
      id: 'p1',
      title: 'Remote Hit',
      studioName: 'Other Studio',
      type: 'feature',
      genre: 'drama',
      budgetTotal: 50_000_000,
      runtimeMins: 121,
      releaseLabel: 'Wide Release',
      logline: 'A big time movie.',
      director: 'Director Name',
      topCast: ['Star 1', 'Star 2'],
      franchiseTitle: 'Saga',
      publicDomainName: 'Old Tale',
      criticsScore: 80,
      audienceScore: 75,
    };

    const project = toLeagueReleaseProject({ leagueUserId: 'u2', snapshot });
    expect(project.id).toBe(stableLeagueReleaseId('u2', 'p1'));
    expect(project.title).toBe('Remote Hit');
    expect(project.studioName).toBe('Other Studio');
    expect(project.script.logline).toBe('A big time movie.');
    expect(project.metrics.sharedDirectorName).toBe('Director Name');
    expect(project.metrics.sharedTopCastNames).toEqual(['Star 1', 'Star 2']);
    expect(project.metrics.sharedFranchiseTitle).toBe('Saga');
    expect(project.metrics.sharedPublicDomainName).toBe('Old Tale');
  });

  it('mergeLeagueReleaseSnapshotsIntoAllReleases replaces legacy raw-id entries with stable ids', () => {
    const snapshot: LeagueReleasedProjectSnapshot = {
      id: 'p1',
      title: 'Remote Hit',
      studioName: 'Other Studio',
      type: 'feature',
    };

    const legacy = { id: 'p1', title: 'Remote Hit', studioName: 'Other Studio', status: 'released' } as any;
    const prevAllReleases = [legacy];

    const merged = mergeLeagueReleaseSnapshotsIntoAllReleases({
      prevAllReleases,
      incoming: [{ leagueUserId: 'u2', snapshot }],
      localStudioName: 'You',
    });

    expect(merged.some((r: any) => r.id === 'p1')).toBe(false);
    expect(merged.some((r: any) => r.id === 'league-u2-p1')).toBe(true);
  });

  it('getReleaseStudioName prefers release.studioName, then boxOffice release studio, then local project linkage', () => {
    const gameState = makeBaseGameState();

    expect(getReleaseStudioName({ gameState, release: { id: 'x', studioName: 'S', status: 'released' } as any })).toBe('S');
    expect(getReleaseStudioName({ gameState, release: { projectId: 'x', studio: 'BO', weeklyRevenue: 1, totalRevenue: 1, theaters: 1, weekInRelease: 1, title: 'T' } as any })).toBe('BO');

    const withLocal = {
      ...gameState,
      projects: [{ id: 'local-p', title: 'Local', status: 'released', script: { id: 's', title: 'Local', genre: 'drama' } } as any],
    } as any;

    expect(getReleaseStudioName({ gameState: withLocal, release: { id: 'local-p', title: 'Local', status: 'released' } as any })).toBe('You');
  });

  it('getReleaseSource / getReleaseDirectorName / getReleaseTopCastNames prefer shared metadata when present', () => {
    const gameState = makeBaseGameState();

    const project = {
      id: 'league-u2-p1',
      title: 'Remote Hit',
      studioName: 'Other Studio',
      status: 'released',
      script: { id: 's', title: 'Remote Hit', genre: 'drama' },
      cast: [],
      crew: [],
      metrics: {
        sharedPublicDomainName: 'Old Tale',
        sharedDirectorName: 'Director Name',
        sharedTopCastNames: ['Star 1', 'Star 2'],
      },
    } as any;

    expect(getReleaseSource({ gameState, project })).toBe('Public domain: Old Tale');
    expect(getReleaseDirectorName({ gameState, project })).toBe('Director Name');
    expect(getReleaseTopCastNames({ gameState, project, limit: 3 })).toEqual(['Star 1', 'Star 2']);
  });
});
