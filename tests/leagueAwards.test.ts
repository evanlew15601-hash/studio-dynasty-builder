import { describe, expect, it } from 'vitest';
import { computeLeagueAwardsCeremony } from '@/utils/leagueAwards';

describe('computeLeagueAwardsCeremony', () => {
  it('selects deterministic winners with tie-break by userId', () => {
    const ceremony = computeLeagueAwardsCeremony({
      year: 2000,
      ceremonyName: 'League Crown',
      snapshots: [
        { league_id: 'l', user_id: 'b', studio_name: 'B', budget: 10_000_000, reputation: 60, week: 1, year: 2000, released_titles: 2, updated_at: '' },
        { league_id: 'l', user_id: 'a', studio_name: 'A', budget: 10_000_000, reputation: 60, week: 1, year: 2000, released_titles: 2, updated_at: '' },
      ] as any,
    });

    expect(ceremony?.categories.find((c) => c.id === 'best-reputation')?.winnerUserId).toBe('a');
    expect(ceremony?.categories.find((c) => c.id === 'most-releases')?.winnerUserId).toBe('a');
  });
});
