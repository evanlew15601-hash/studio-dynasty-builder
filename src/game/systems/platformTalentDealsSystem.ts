import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent } from '@/types/game';
import { stablePick } from '@/utils/stablePick';
import { stableInt } from '@/utils/stableRandom';
import type { TickSystem } from '../core/types';

function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(year, 0, 1 + Math.max(0, week - 1) * 7);
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

const SHOWRUNNER_FIRST = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Taylor', 'Avery', 'Sam', 'Jamie'];
const SHOWRUNNER_LAST = ['Park', 'Santos', 'Bennett', 'Khan', 'Ishikawa', 'Cole', 'Reed', 'Navarro', 'Shaw', 'Nguyen'];

function pickShowrunnerName(seed: string): string {
  const first = stablePick(SHOWRUNNER_FIRST, `${seed}|first`) || SHOWRUNNER_FIRST[0];
  const last = stablePick(SHOWRUNNER_LAST, `${seed}|last`) || SHOWRUNNER_LAST[0];
  return `${first} ${last}`;
}

export const PlatformTalentDealsSystem: TickSystem = {
  id: 'platformTalentDeals',
  label: 'Platform talent deals (Streaming Wars)',
  dependsOn: ['platformCrisis'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;
    if ((state.eventQueue || []).length > 0) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;

    if (!market || !player || player.status !== 'active') return state;

    const offerWeek = stableInt(`${state.universeSeed || 'seed'}|platform:talent-offer-week|${ctx.year}|${player.id}`, 16, 24);
    if (ctx.week !== offerWeek) return state;
    if (player.lastTalentOfferYear === ctx.year) return state;

    const rivals = (market.rivals || []).filter((r) => r && r.status !== 'collapsed');
    if (rivals.length === 0) return state;

    const rival = rivals.slice().sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))[0];

    const showrunner = pickShowrunnerName(`${state.universeSeed || 'seed'}|platform-talent|${ctx.year}|${player.id}|${rival.id}`);

    const qualityBonus = 4;

    const rivalScale = clampInt((rival.subscribers ?? 0) / 1_000_000, 0, 120);
    const matchCost = clampInt(35_000_000 + rivalScale * 450_000, 35_000_000, 120_000_000);

    const event: GameEvent = {
      id: `platform:overall-deal:${ctx.year}:W${ctx.week}:${player.id}:${rival.id}`,
      title: 'Talent war: showrunner overall deal',
      description: `${rival.name} is offering a big overall deal to showrunner ${showrunner}.

If you match the deal, your Originals will ship with higher baseline quality (and retention impact). If you let them go, ${rival.name} gains momentum.`,
      type: 'opportunity',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:overall-deal',
        playerPlatformId: player.id,
        rivalId: rival.id,
        rivalName: rival.name,
        showrunner,
        matchCost,
        qualityBonus,
      },
      choices: [
        {
          id: 'match',
          text: `Match the deal (${Math.round(matchCost / 1_000_000)}M)`,
          requirements: [
            {
              type: 'budget',
              threshold: matchCost,
              description: `Requires ${Math.round(matchCost / 1_000_000)}M budget to secure the overall deal`,
            },
          ],
          consequences: [
            {
              type: 'budget',
              impact: -matchCost,
              description: `-${Math.round(matchCost / 1_000_000)}M overall deal spend`,
            },
            {
              type: 'reputation',
              impact: 1,
              description: '+1 studio reputation (talent win)',
            },
          ],
        },
        {
          id: 'let-go',
          text: 'Let them go',
          consequences: [
            {
              type: 'reputation',
              impact: -1,
              description: '-1 studio reputation (press frames it as a loss)',
            },
          ],
        },
      ],
    };

    ctx.recap.push({
      type: 'market',
      title: 'Talent war: overall deal',
      body: `${rival.name} is making a play for showrunner ${showrunner}. Match the deal to boost Originals quality — or let them go.`,
      severity: 'info',
    });

    return {
      ...state,
      platformMarket: {
        ...market,
        player: {
          ...player,
          lastTalentOfferYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
