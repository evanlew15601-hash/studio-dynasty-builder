import type { GameState, Project } from '@/types/game';

// List available indie projects at a festival. Policy: "indie" films are those
// with `script?.characteristics?.commercialAppeal` < 6 or explicit `indie: true` flag.
export function listAvailableFestivalIndieProjects(state: GameState, festivalId?: string): Project[] {
  const candidates: Project[] = [];
  for (const p of (state.allReleases || [])) {
    if (!p) continue;
    if (p.status === 'released') continue;
    if (p.releaseStrategy?.type !== 'festival') continue;
    if (festivalId && (p.releaseStrategy as any)?.festivalId && (p.releaseStrategy as any).festivalId !== festivalId) continue;

    const commercial = p.script?.characteristics?.commercialAppeal ?? p.script?.quality ?? 5;
    const isIndie = (p as any).indie === true || commercial < 6;
    if (isIndie) candidates.push(p);
  }
  return candidates;
}

// Create an update patch for purchasing a film's rights at festival bidding.
export function createPurchasePatch(project: Project, buyerStudioId: string, offerAmount: number, week: number, year: number) {
  const patch: Partial<Project> = {
    studioName: buyerStudioId,
    status: 'acquired',
    distributionStrategy: project.distributionStrategy || {},
    metrics: {
      ...(project.metrics || {}),
      acquiredAtWeek: week,
      acquiredAtYear: year,
    },
  } as any;

  return patch;
}

// Simulate rival bidders for a festival auction. Returns highest rival offer and whether user wins.
export function simulateFestivalAuction(state: GameState, project: Project, festivalId?: string, userOffer: number = 0) {
  const festival = festivalId ? undefined : undefined; // placeholder if festival data needed

  // Determine number of rivals based on project's commercial appeal and festival availability
  const commercial = project.script?.characteristics?.commercialAppeal ?? project.script?.quality ?? 5;
  const baseRivals = Math.max(1, Math.floor(3 - (commercial / 4)));
  const rivalCount = baseRivals + Math.floor(Math.random() * 3);

  // Rival bid distribution: influenced by festival prestige (not available here) and commercial appeal
  let highest = 0;
  for (let i = 0; i < rivalCount; i++) {
    // Rival willingness scale: more commercial -> higher rival bids
    const willingness = 0.3 + (commercial / 10) + Math.random() * 0.7; // 0.3 - 1.3
    const rivalBid = Math.floor((project.budget?.total || 500000) * willingness);
    if (rivalBid > highest) highest = rivalBid;
  }

  const userWins = userOffer >= highest;

  return { rivalCount, highestRivalOffer: highest, userWins };
}
