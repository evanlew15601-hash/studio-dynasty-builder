import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createOnlineLeagueTurnBaseline, buildOnlineLeagueTurnSubmission } from '@/utils/onlineLeagueTurnCompile';
import { mergeLeagueReleaseSnapshotsIntoAllReleases } from '@/utils/leagueReleases';

function makeBaseGameState(): GameState {
  return {
    studio: { id: 's1', name: 'Studio One' },
    currentYear: 2026,
    currentWeek: 10,
    projects: [
      {
        id: 'p1',
        title: 'Binge Show',
        type: 'series',
        status: 'released',
        releaseWeek: 10,
        releaseYear: 2026,
        releaseFormat: 'binge',
        episodeCount: 10,
        seasons: [{
          seasonNumber: 1,
          totalEpisodes: 10,
          episodesAired: 10,
          releaseFormat: 'binge',
          productionStatus: 'complete',
          airingStatus: 'complete',
          episodes: []
        }],
        metrics: {}
      }
    ] as any,
    allReleases: [],
    talent: [],
    competitorStudios: [],
    franchises: [],
    publicDomainIPs: []
  } as any;
}

describe('Online League Binge Sync', () => {
  it('correctly creates a snapshot and merges it without crashing', () => {
    const state = makeBaseGameState();
    const baseline = createOnlineLeagueTurnBaseline(state);
    
    // pretend we did some stuff, now compile turn
    const submission = buildOnlineLeagueTurnSubmission({ current: state as any, baseline });
    
    const incoming = [
      {
        leagueUserId: 'player-2',
        snapshot: submission.state.releasedProjects![0]
      }
    ];

    const mergedAllReleases = mergeLeagueReleaseSnapshotsIntoAllReleases({
      prevAllReleases: [],
      incoming,
      localStudioName: 'Studio Two'
    });

    expect(mergedAllReleases.length).toBe(1);
    const mergedProject = mergedAllReleases[0];
    
    expect(mergedProject.id).toBe('league-player-2-p1');
    expect(mergedProject.title).toBe('Binge Show');
    expect(mergedProject.releaseFormat).toBe('binge');
    expect(mergedProject.seasons[0].totalEpisodes).toBe(10);
  });
});
