import type { GameState, Project, Studio } from '@/types/game';
import type { TickSystem } from '../core/types';
import { TVEpisodeSystem } from '@/components/game/TVEpisodeSystem';
import { TVRatingsSystem } from '@/components/game/TVRatingsSystem';
import { stableInt } from '@/utils/stableRandom';

function isTvProject(p: Project): boolean {
  return p.type === 'series' || p.type === 'limited-series';
}

const MAX_RELEASE_AGE_WEEKS = 156;
const MAX_UNKNOWN_RELEASES = 500;

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function dateForWeek(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
}

function buildCompetitorTvProject(studio: Studio, seed: string, week: number, year: number): Project {
  const genres = (studio.specialties || []) as any[];
  const genre = genres.length > 0 ? (genres[stableInt(`${seed}|genre`, 0, genres.length - 1)] as any) : ('drama' as any);

  const type = stableInt(`${seed}|type`, 0, 99) < 80 ? 'series' : 'limited-series';
  const episodeCount = type === 'limited-series' ? stableInt(`${seed}|eps`, 4, 8) : stableInt(`${seed}|eps`, 8, 13);

  const titleWords = {
    action: ['Strike', 'Rogue', 'Velocity', 'Aftershock'],
    drama: ['Hearts', 'Legacy', 'Crossroads', 'The Long Road'],
    comedy: ['Roommates', 'Disaster', 'Weekend', 'Absolutely Not'],
    horror: ['Nightfall', 'Hollow', 'The Door', 'Ash & Bone'],
    thriller: ['Signal', 'The Pact', 'Blackout', 'Under Watch'],
    romance: ['Second Chances', 'Slow Burn', 'The Promise', 'Moonlight'],
    'sci-fi': ['Frontier', 'Singularity', 'Orbit', 'Neon Sky'],
    fantasy: ['Runes', 'The Crown', 'Dragonsong', 'Mythic'],
    mystery: ['Case Files', 'The Guest', 'Cold Trail', 'Hidden Room'],
    family: ['Bright Days', 'The Map', 'Home Team', 'Campfire Stories'],
    superhero: ['Mask', 'Vigil', 'The League', 'Powerline'],
    documentary: ['Untold', 'Inside', 'Witness', 'Archive'],
  } as Record<string, string[]>;

  const titlePool = titleWords[genre] || titleWords.drama;
  const title = titlePool[stableInt(`${seed}|title`, 0, titlePool.length - 1)];

  const perEpisodeBudget = Math.max(500_000, Math.floor((studio.budget || 10_000_000) * (0.03 + stableInt(`${seed}|budg`, 0, 60) / 1000)));
  const seasonBudget = perEpisodeBudget * episodeCount;

  const criticsScore = stableInt(`${seed}|critics`, 45, 92);
  const audienceScore = stableInt(`${seed}|audience`, 45, 95);

  const now = dateForWeek(year, week);

  const id = `ai-tv-${studio.id}-${year}-W${week}`;

  return {
    id,
    title,
    type: type as any,
    status: 'released' as any,
    currentPhase: 'distribution' as any,
    phaseDuration: -1,
    studioName: studio.name,
    episodeCount,
    releaseFormat: 'weekly',
    script: {
      id: `script-${id}`,
      title,
      genre: genre as any,
      logline: `A ${genre} series from ${studio.name}.`,
      writer: 'AI Writers Room',
      pages: 60,
      quality: stableInt(`${seed}|quality`, 40, 95),
      budget: perEpisodeBudget,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 45,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'episodic' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    budget: {
      total: seasonBudget,
      allocated: {
        aboveTheLine: seasonBudget * 0.3,
        belowTheLine: seasonBudget * 0.4,
        postProduction: seasonBudget * 0.15,
        marketing: seasonBudget * 0.1,
        distribution: seasonBudget * 0.03,
        contingency: seasonBudget * 0.02,
      },
      spent: {
        aboveTheLine: seasonBudget * 0.3,
        belowTheLine: seasonBudget * 0.4,
        postProduction: seasonBudget * 0.15,
        marketing: seasonBudget * 0.1,
        distribution: seasonBudget * 0.03,
        contingency: seasonBudget * 0.02,
      },
      overages: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
    },
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: now, end: now },
      principalPhotography: { start: now, end: now },
      postProduction: { start: now, end: now },
      release: now,
      milestones: [],
    },
    distributionStrategy: {
      primary: {
        platform: 'Streaming',
        type: 'streaming',
        revenue: { type: 'subscription-share', studioShare: 60 },
      },
      international: [],
      windows: [],
      marketingBudget: seasonBudget * 0.1,
    },
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    },
    metrics: {
      criticsScore,
      audienceScore,
      weeksSinceRelease: 0,
    },
    releaseWeek: week,
    releaseYear: year,
  } as Project;
}

export const AiTelevisionSystem: TickSystem = {
  id: 'aiTelevision',
  label: 'AI television',
  onTick: (state, ctx) => {
    const baseAllReleases = state.allReleases || [];
    if (baseAllReleases.length === 0) return state;

    // Performance guard: late-game saves can accumulate very large allReleases arrays.
    // The TV system only needs a recent window; keep a bounded subset to avoid long main-thread stalls.
    const currentAbs = absWeek(ctx.week, ctx.year);
    const cutoffAbs = currentAbs - MAX_RELEASE_AGE_WEEKS;

    let unknownKept = 0;
    const reversed: any[] = [];

    for (let i = baseAllReleases.length - 1; i >= 0; i -= 1) {
      const r: any = baseAllReleases[i];
      const y = typeof r?.releaseYear === 'number' ? r.releaseYear : undefined;
      const w = typeof r?.releaseWeek === 'number' ? r.releaseWeek : undefined;

      if (typeof y === 'number' && typeof w === 'number') {
        const rAbs = absWeek(w, y);
        if (Number.isFinite(rAbs) && rAbs >= cutoffAbs) {
          reversed.push(r);
        }
        continue;
      }

      if (unknownKept < MAX_UNKNOWN_RELEASES) {
        reversed.push(r);
        unknownKept += 1;
      }
    }

    const workingAllReleases = reversed.reverse();

    const playerProjectIds = new Set((state.projects || []).map((p) => p.id));

    let changed = false;

    // ---------------------------------------------------------------------
    // 1) Occasionally generate new competitor TV premieres
    // ---------------------------------------------------------------------

    const competitorStudios = state.competitorStudios || [];

    const hasPremiereThisWeek = workingAllReleases
      .filter((r): r is Project => typeof (r as any)?.script !== 'undefined')
      .filter((p) => !playerProjectIds.has(p.id))
      .filter((p) => isTvProject(p))
      .some((p) => p.releaseWeek === ctx.week && p.releaseYear === ctx.year);

    const activeAiringCount = workingAllReleases
      .filter((r): r is Project => typeof (r as any)?.script !== 'undefined')
      .filter((p) => !playerProjectIds.has(p.id))
      .filter((p) => isTvProject(p))
      .filter((p) => {
        const season = p.seasons?.[0];
        const aired = season?.episodesAired || 0;
        const total = season?.totalEpisodes || p.episodeCount || 0;
        return aired > 0 && total > 0 && aired < total;
      }).length;

    const MAX_ACTIVE_AIRING = 10;

    const shouldPremiere =
      competitorStudios.length > 0 &&
      !hasPremiereThisWeek &&
      activeAiringCount < MAX_ACTIVE_AIRING &&
      ctx.rng.chance(0.08);

    const additions: Project[] = [];

    if (shouldPremiere) {
      const studio = ctx.rng.pick(competitorStudios);
      if (studio) {
        const seed = `${state.universeSeed ?? 0}|ai-tv|${studio.id}|${ctx.year}|${ctx.week}`;
        const candidate = buildCompetitorTvProject(studio, seed, ctx.week, ctx.year);
        const exists = baseAllReleases.some((r: any) => ('id' in r ? (r as any).id === candidate.id : false));

        if (!exists) {
          additions.push(candidate);
          changed = true;
          ctx.recap.push({
            type: 'market',
            title: 'Competitor TV premiere',
            body: `${studio.name} premiered "${candidate.title}" (Y${ctx.year}W${ctx.week}).`,
            severity: 'info',
          });
        }
      }
    }

    const didPrune = workingAllReleases.length !== baseAllReleases.length;

    const allReleases = additions.length > 0 ? [...workingAllReleases, ...additions] : workingAllReleases;

    // ---------------------------------------------------------------------
    // 2) Tick competitor TV shows forward (episodes + decay + ratings)
    // ---------------------------------------------------------------------

    const nextAllReleases = allReleases.map((r) => {
      if (!('script' in (r as any))) return r;

      const p = r as Project;
      if (playerProjectIds.has(p.id)) return r;
      if (!isTvProject(p)) return r;
      if (!p.releaseWeek || !p.releaseYear) return r;

      let next = TVEpisodeSystem.ensureSeason(p);
      next = TVEpisodeSystem.autoReleaseEpisodesIfDue(next, ctx.week, ctx.year);
      next = TVEpisodeSystem.processWeeklyEpisodeDecay(next, ctx.week, ctx.year);
      next = TVRatingsSystem.processWeeklyRatings(next, ctx.week, ctx.year);

      if (next !== p) changed = true;
      return next;
    });

    if (!changed && !didPrune) return state;

    const nextState: GameState = {
      ...state,
      allReleases: nextAllReleases as any,
    };

    return nextState;
  },
};
