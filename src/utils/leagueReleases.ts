import type { BoxOfficeRelease, GameState, Project } from '@/types/game';
import type { LeagueReleasedProjectSnapshot } from '@/types/onlineLeague';

export function stableLeagueReleaseId(leagueUserId: string, projectId: string): string {
  return `league-${leagueUserId}-${projectId}`;
}

export function toLeagueReleaseProject(params: {
  leagueUserId: string;
  snapshot: LeagueReleasedProjectSnapshot;
}): Project {
  const { leagueUserId, snapshot } = params;

  const stableId = stableLeagueReleaseId(leagueUserId, snapshot.id);
  const budgetTotal = typeof snapshot.budgetTotal === 'number' ? snapshot.budgetTotal : 0;
  const genre = (snapshot.genre as any) || 'drama';
  const now = new Date();

  const script = {
    id: `league-script-${stableId}`,
    title: snapshot.title,
    genre,
    logline: typeof snapshot.logline === 'string' ? snapshot.logline : '',
    writer: 'Unknown',
    pages: 0,
    quality: 60,
    budget: budgetTotal,
    developmentStage: 'final',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: typeof snapshot.runtimeMins === 'number' ? snapshot.runtimeMins : 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    },
    franchiseId: snapshot.franchiseId,
    publicDomainId: snapshot.publicDomainId,
  } as any;

  return {
    id: stableId,
    title: snapshot.title,
    studioName: snapshot.studioName,
    type: (snapshot.type as any) || 'feature',
    script,
    currentPhase: 'release' as any,
    status: 'released' as any,
    phaseDuration: 0,
    budget: {
      total: budgetTotal,
      allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
    },
    cast: [],
    crew: [],
    timeline: {
      preProduction: { start: now, end: now } as any,
      principalPhotography: { start: now, end: now } as any,
      postProduction: { start: now, end: now } as any,
      release: now,
      milestones: [],
    } as any,
    locations: [],
    distributionStrategy: {
      primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
      international: [],
      windows: [],
      marketingBudget: 0,
    } as any,
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    } as any,
    releaseWeek: typeof snapshot.releaseWeek === 'number' ? snapshot.releaseWeek : undefined,
    releaseYear: typeof snapshot.releaseYear === 'number' ? snapshot.releaseYear : undefined,
    metrics: {
      criticsScore: typeof snapshot.criticsScore === 'number' ? snapshot.criticsScore : undefined,
      audienceScore: typeof snapshot.audienceScore === 'number' ? snapshot.audienceScore : undefined,
      boxOfficeTotal: typeof snapshot.boxOfficeTotal === 'number' ? snapshot.boxOfficeTotal : undefined,
      lastWeeklyRevenue: typeof snapshot.lastWeeklyRevenue === 'number' ? snapshot.lastWeeklyRevenue : undefined,
      weeksSinceRelease: typeof snapshot.weeksSinceRelease === 'number' ? snapshot.weeksSinceRelease : undefined,
      inTheaters: typeof snapshot.inTheaters === 'boolean' ? snapshot.inTheaters : undefined,
      boxOfficeStatus: typeof snapshot.releaseLabel === 'string' ? snapshot.releaseLabel : undefined,
      sharedDirectorName: typeof snapshot.director === 'string' ? snapshot.director : undefined,
      sharedTopCastNames: Array.isArray(snapshot.topCast) ? snapshot.topCast : undefined,
      sharedFranchiseTitle: typeof snapshot.franchiseTitle === 'string' ? snapshot.franchiseTitle : undefined,
      sharedPublicDomainName: typeof snapshot.publicDomainName === 'string' ? snapshot.publicDomainName : undefined,
    },
  } as any;
}

export function mergeLeagueReleaseSnapshotsIntoAllReleases(params: {
  prevAllReleases: Array<Project | BoxOfficeRelease>;
  incoming: Array<{ leagueUserId: string; snapshot: LeagueReleasedProjectSnapshot }>;
  localStudioName: string;
}): Array<Project | BoxOfficeRelease> {
  const { prevAllReleases, incoming, localStudioName } = params;

  const byId = new Map<string, Project | BoxOfficeRelease>();
  const order: string[] = [];

  for (const rel of prevAllReleases) {
    const id = (rel as any)?.id;
    if (!id || typeof id !== 'string') continue;
    if (!byId.has(id)) order.push(id);
    byId.set(id, rel);
  }

  for (const entry of incoming) {
    const stableId = stableLeagueReleaseId(entry.leagueUserId, entry.snapshot.id);

    // If we previously stored this remote release under its raw project id,
    // drop that legacy entry to avoid duplicate titles in the world feed.
    const legacyId = entry.snapshot.id;
    if (legacyId && legacyId !== stableId && byId.has(legacyId)) {
      const legacy = byId.get(legacyId) as any;
      if (legacy?.studioName === entry.snapshot.studioName && legacy?.studioName !== localStudioName) {
        byId.delete(legacyId);
        const idx = order.indexOf(legacyId);
        if (idx >= 0) order.splice(idx, 1);
      }
    }

    if (!byId.has(stableId)) order.push(stableId);
    byId.set(stableId, toLeagueReleaseProject({ leagueUserId: entry.leagueUserId, snapshot: entry.snapshot }));
  }

  return order.map((id) => byId.get(id)!).filter(Boolean);
}

export function getReleaseStudioName(params: {
  gameState: GameState;
  release: Project | BoxOfficeRelease;
}): string | null {
  const { gameState, release } = params;

  const anyRelease = release as any;

  if (typeof anyRelease?.studioName === 'string' && anyRelease.studioName.trim()) return anyRelease.studioName;
  if (typeof anyRelease?.studio === 'string' && anyRelease.studio.trim()) return anyRelease.studio;

  const releaseId = anyRelease?.id;
  if (typeof releaseId === 'string' && gameState.projects.some((p) => p.id === releaseId)) {
    return gameState.studio.name;
  }

  return null;
}
