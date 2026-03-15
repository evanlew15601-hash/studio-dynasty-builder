import type { OnlineLeagueSnapshotRow } from '@/integrations/supabase/onlineLeagueSnapshots';

export type LeagueAwardsNominee = {
  userId: string;
  studioName: string;
  budget: number;
  reputation: number;
  releasedTitles: number;
};

export type LeagueAwardsCategory = {
  id: string;
  name: string;
  nominees: LeagueAwardsNominee[];
  winnerUserId: string;
};

export type LeagueAwardsCeremony = {
  version: 'league-awards-1';
  ceremonyName: string;
  year: number;
  categories: LeagueAwardsCategory[];
};

function parseBudget(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stableTop(params: {
  nominees: LeagueAwardsNominee[];
  score: (n: LeagueAwardsNominee) => number;
  max: number;
}): LeagueAwardsNominee[] {
  const { nominees, score, max } = params;

  return nominees
    .slice()
    .sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sb !== sa) return sb - sa;
      return a.userId.localeCompare(b.userId);
    })
    .slice(0, max);
}

export function computeLeagueAwardsCeremony(params: {
  year: number;
  ceremonyName?: string;
  snapshots: OnlineLeagueSnapshotRow[];
}): LeagueAwardsCeremony | null {
  const { year, ceremonyName, snapshots } = params;

  const nominees: LeagueAwardsNominee[] = (snapshots || [])
    .filter((s) => !!s.user_id)
    .map((s) => ({
      userId: s.user_id,
      studioName: s.studio_name || 'Studio',
      budget: parseBudget(s.budget),
      reputation: Number.isFinite(s.reputation) ? s.reputation : 0,
      releasedTitles: Number.isFinite(s.released_titles) ? s.released_titles : 0,
    }));

  if (!nominees.length) return null;

  const bestOverall = stableTop({
    nominees,
    max: 5,
    score: (n) => {
      const budgetScore = Math.min(40, Math.log10(Math.max(1, n.budget)) * 10);
      return Math.round(n.reputation * 2 + n.releasedTitles * 15 + budgetScore);
    },
  });

  const bestRep = stableTop({ nominees, max: 5, score: (n) => Math.round(n.reputation * 100) });
  const bestBudget = stableTop({ nominees, max: 5, score: (n) => Math.round(n.budget) });
  const mostReleases = stableTop({ nominees, max: 5, score: (n) => n.releasedTitles });

  return {
    version: 'league-awards-1',
    ceremonyName: ceremonyName ?? 'League Awards',
    year,
    categories: [
      {
        id: 'studio-of-the-year',
        name: 'Studio of the Year',
        nominees: bestOverall,
        winnerUserId: bestOverall[0].userId,
      },
      {
        id: 'best-reputation',
        name: 'Most Celebrated Studio',
        nominees: bestRep,
        winnerUserId: bestRep[0].userId,
      },
      {
        id: 'biggest-budget',
        name: 'Biggest War Chest',
        nominees: bestBudget,
        winnerUserId: bestBudget[0].userId,
      },
      {
        id: 'most-releases',
        name: 'Most Prolific Slate',
        nominees: mostReleases,
        winnerUserId: mostReleases[0].userId,
      },
    ],
  };
}
