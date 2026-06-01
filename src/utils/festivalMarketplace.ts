import type { GameState, Project } from '@/types/game';
import type { SeededRng } from '@/game/core/rng';
import { createRng } from '@/game/core/rng';

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

// Multi-round auction simulation with simple genre biasing. Returns round-by-round rival bids,
// the final highest rival offer, whether the `userOffer` wins, and a suggested minimum to win.
export function runFestivalAuctionRounds(
  state: GameState,
  project: Project,
  festivalId?: string,
  userOffer: number = 0,
  rounds: number = 3,
  rng?: SeededRng
) {
  const commercial = project.script?.characteristics?.commercialAppeal ?? project.script?.quality ?? 5;

  // Genre bias: popular/commercial genres attract stronger rival interest
  const genre = (project.script?.genre || '').toLowerCase();
  const popularGenres = ['action', 'sci-fi', 'fantasy', 'superhero', 'romcom', 'comedy'];
  const midGenres = ['drama', 'thriller', 'mystery'];
  const artyGenres = ['arthouse', 'experimental', 'documentary'];

  let genreBias = 0;
  if (popularGenres.includes(genre)) genreBias = 0.15;
  else if (midGenres.includes(genre)) genreBias = 0.05;
  else if (artyGenres.includes(genre)) genreBias = -0.08;

  rng = rng ?? createRng(1);

  const baseRivals = Math.max(1, Math.floor(2 + Math.max(0, (commercial - 3) / 3)));
  const rivalCount = baseRivals + Math.floor(rng.next() * 3); // 0-2 extra rivals

  const seedBudget = project.budget?.total || 500000;

  const roundsOut: Array<{ round: number; rivalBids: number[]; highest: number }> = [];

  // Initialize rival bids
  const rivalBids: number[] = [];
  for (let i = 0; i < rivalCount; i++) {
    const aggression = 0.8 + rng.next() * 0.8; // 0.8 - 1.6
    const willingness = 0.25 + (commercial / 12) + genreBias * rng.nextFloat(0.1, 1.0);
    const initial = Math.max(0, Math.floor(seedBudget * Math.max(0.05, willingness) * aggression));
    rivalBids.push(initial);
  }

  for (let r = 0; r < rounds; r++) {
    // Each round rivals may increment their bid based on aggression and round pressure
    for (let i = 0; i < rivalCount; i++) {
      const prev = rivalBids[i];
      // Chance to raise decreases each round slightly, but amount can increase
      const raiseChance = 0.6 - r * 0.12 + rng.nextFloat(0, 0.4); // ~0.3-1.0
      if (rng.next() < raiseChance) {
        const raiseFactor = 1 + (0.05 + rng.nextFloat(0, 0.25)) * (1 + r * 0.3);
        rivalBids[i] = Math.floor(prev * raiseFactor + rng.nextFloat(0, seedBudget * 0.02));
      }
    }

    const highest = rivalBids.reduce((a, b) => Math.max(a, b), 0);
    roundsOut.push({ round: r + 1, rivalBids: [...rivalBids], highest });
  }

  const finalHighest = roundsOut.length ? roundsOut[roundsOut.length - 1].highest : 0;
  const minIncrement = Math.max(10000, Math.ceil(finalHighest * 0.05));
  const requiredToWin = finalHighest + minIncrement;
  const userWins = userOffer >= requiredToWin;

  return { rounds: roundsOut, rivalCount, finalHighest, userWins, requiredToWin };
}
