import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { FESTIVALS } from '@/data/Festivals';
import { createRng, seedFromString } from '@/game/core/rng';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function alreadySeededFestivalProjects(state: GameState, festivalId: string, year: number): boolean {
  const allProjects = [
    ...(state.projects || []),
    ...((state.aiStudioProjects as any) || []),
    ...(state.allReleases || []),
  ];

  return allProjects.some((project) => {
    if (!isProjectLike(project)) return false;
    if (project.releaseStrategy?.type !== 'festival') return false;
    if ((project.releaseStrategy as any)?.festivalId !== festivalId) return false;
    return project.releaseYear === year || project.scheduledReleaseYear === year;
  });
}

function generateFestivalProjectTitle(festivalName: string, rng: ReturnType<typeof createRng>): string {
  const adjectives = ['Hidden', 'Silver', 'Midnight', 'Lost', 'Golden', 'Shadow', 'Autumn', 'Broken', 'Final'];
  const nouns = ['Promise', 'Portrait', 'City', 'River', 'Dream', 'Season', 'Echo', 'Resonance', 'Silence'];
  const adjective = rng.pick(adjectives) || adjectives[0];
  const noun = rng.pick(nouns) || nouns[0];
  return `${adjective} ${noun}`;
}

function createFestivalIndieProject(
  festivalId: string,
  festivalName: string,
  year: number,
  week: number,
  index: number,
  rng: ReturnType<typeof createRng>
): Project {
  const title = generateFestivalProjectTitle(festivalName, rng);
  const genreOptions: Array<NonNullable<Project['script']>['genre']> = [
    'drama',
    'thriller',
    'mystery',
    'romance',
    'documentary',
    'fantasy',
    'horror',
  ];
  const genre = rng.pick(genreOptions) || 'drama';
  const budgetTotal = 2_000_000 + rng.nextInt(0, 4_000_000);
  const quality = 45 + rng.nextInt(0, 30);

  return {
    id: `festival-${festivalId}-${year}-indie-${index + 1}`,
    title,
    script: {
      id: `script-festival-${festivalId}-${year}-${index + 1}`,
      title,
      genre: genre as any,
      logline: `A festival-bound indie explores hidden truths in a ${genre} setting.`,
      writer: `Alex ${rng.nextInt(1, 99)}`,
      pages: 90 + rng.nextInt(0, 20),
      quality,
      budget: Math.floor(budgetTotal),
      developmentStage: 'final',
      themes: ['identity', 'conflict'],
      targetAudience: 'general',
      estimatedRuntime: 85 + rng.nextInt(0, 35),
      characteristics: {
        tone: 'dramatic',
        pacing: 'slow-burn',
        dialogue: 'stylized',
        visualStyle: 'minimal',
        commercialAppeal: rng.nextInt(1, 4),
        criticalPotential: rng.nextInt(6, 10),
        cgiIntensity: 'minimal',
        content: {
          violence: rng.nextInt(0, 3),
          nudity: rng.nextInt(0, 2),
          language: rng.nextInt(0, 3),
          substance: rng.nextInt(0, 2),
        },
      },
    },
    type: 'feature',
    currentPhase: 'marketing',
    status: 'ready-for-release',
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    },
    budget: {
      total: Math.floor(budgetTotal),
      allocated: {
        aboveTheLine: Math.floor(budgetTotal * 0.2),
        belowTheLine: Math.floor(budgetTotal * 0.3),
        postProduction: Math.floor(budgetTotal * 0.15),
        marketing: Math.floor(budgetTotal * 0.2),
        distribution: Math.floor(budgetTotal * 0.1),
        contingency: 0,
      },
      spent: {
        aboveTheLine: Math.floor(budgetTotal * 0.2),
        belowTheLine: Math.floor(budgetTotal * 0.3),
        postProduction: Math.floor(budgetTotal * 0.15),
        marketing: Math.floor(budgetTotal * 0.2),
        distribution: Math.floor(budgetTotal * 0.1),
        contingency: 0,
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
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    locations: [],
    distributionStrategy: {
      primary: {
        platform: 'Festival Circuit',
        type: 'theatrical',
        revenue: { type: 'box-office', studioShare: 40 },
      },
      international: [],
      windows: [],
      marketingBudget: Math.floor(budgetTotal * 0.2),
    },
    metrics: {
      inTheaters: false,
      boxOfficeTotal: 0,
      theaterCount: 0,
      weeksSinceRelease: 0,
      criticsScore: Math.min(100, 50 + rng.nextInt(0, 25)),
      audienceScore: Math.min(100, 55 + rng.nextInt(0, 20)),
      boxOfficeStatus: 'Current' as any,
      theatricalRunLocked: false,
      boxOffice: {
        openingWeekend: 0,
        domesticTotal: 0,
        internationalTotal: 0,
        production: Math.floor(budgetTotal * 0.8),
        marketing: Math.floor(budgetTotal * 0.2),
        profit: 0,
        theaters: 0,
        weeks: 0,
      },
    },
    releaseWeek: week,
    releaseYear: year,
    releaseStrategy: { type: 'festival', festivalId, festivalName } as any,
    indie: true as any,
  } as Project;
}

export function seedFestivalIndieProjectsForWeek(state: GameState, week: number, year: number): GameState {
  if (state.mode === 'online') return state;

  const festival = FESTIVALS.find((fest) => fest.scheduleWeek === week);
  if (!festival) return state;

  if (alreadySeededFestivalProjects(state, festival.id, year)) return state;

  const seed = seedFromString(`${state.universeSeed || 0}|festival|${festival.id}|${year}`);
  const rng = createRng(seed);
  const count = 2 + rng.nextInt(0, 1);

  const newProjects: Project[] = [];
  for (let i = 0; i < count; i += 1) {
    const project = createFestivalIndieProject(festival.id, festival.name, year, week, i, rng);
    newProjects.push(attachBasicCastForAI(project, state.talent || []));
  }

  return {
    ...state,
    aiStudioProjects: [...((state.aiStudioProjects as any) || []), ...newProjects],
  } as GameState;
}

export const FestivalIndieSupplySystem: TickSystem = {
  id: 'festivalIndieSupply',
  label: 'Festival indie supply',
  dependsOn: ['competitorReleases'],
  onTick: (state, ctx) => {
    return seedFestivalIndieProjectsForWeek(state, ctx.week, ctx.year);
  },
};
