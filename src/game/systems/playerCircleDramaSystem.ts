import type { GameEvent, GameState, Project, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function relationshipToChemistry(type: NonNullable<TalentPerson['relationships']>[string] | undefined): number {
  switch (type) {
    case 'romantic':
      return 60;
    case 'friendly':
      return 25;
    case 'mentor-mentee':
      return 30;
    case 'professional':
      return 12;
    case 'rivals':
      return -35;
    case 'hostile':
      return -65;
    default:
      return 0;
  }
}

function getChemistry(a: TalentPerson, b: TalentPerson): number {
  const direct = a.chemistry?.[b.id];
  if (typeof direct === 'number') return direct;
  return relationshipToChemistry(a.relationships?.[b.id]);
}

function getTalentIdsOnProject(project: Project): string[] {
  const ids: string[] = [];

  for (const r of project.cast || []) ids.push(r.talentId);
  for (const r of project.crew || []) ids.push(r.talentId);
  for (const c of project.script?.characters || []) {
    if (c.assignedTalentId) ids.push(c.assignedTalentId);
  }

  return Array.from(new Set(ids));
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function findWorstChemistryPair(
  talentById: Map<string, TalentPerson>,
  project: Project
): { a: TalentPerson; b: TalentPerson; chemistry: number } | null {
  const ids = getTalentIdsOnProject(project);
  const present = ids.map((id) => talentById.get(id)).filter(Boolean) as TalentPerson[];
  if (present.length < 2) return null;

  let worst: { a: TalentPerson; b: TalentPerson; chemistry: number } | null = null;

  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i];
      const b = present[j];
      const chemistry = Math.min(getChemistry(a, b), getChemistry(b, a));
      if (!worst || chemistry < worst.chemistry) {
        worst = { a, b, chemistry };
      }
    }
  }

  return worst;
}

function weekStartDate(week: number, year: number): Date {
  // Deterministic "week start" approximation for event sorting/display.
  return new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
}

function formatDollars(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const digits = String(abs);
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}\u0024${withCommas}`;
}

function buildPoachingEvent(
  state: GameState,
  weekAbs: number,
  week: number,
  year: number,
  talent: TalentPerson,
  rivalStudioId: string
): GameEvent {
  const studioId = state.studio.id;
  const loyalty = clamp(talent.studioLoyalty?.[studioId] ?? 50, 0, 100);
  const cost = Math.max(50_000, Math.round((talent.marketValue || 1_000_000) * 0.035));

  return {
    id: `circle:${weekAbs}:poach:${talent.id}:${rivalStudioId}`,
    title: `${talent.name} gets a poaching offer`,
    description:
      `${talent.name}'s agent is fielding a serious offer from a rival studio. ` +
      `Their loyalty to ${state.studio.name} is shaky (${Math.round(loyalty)}/100).`,
    type: 'talent',
    triggerDate: weekStartDate(week, year),
    data: { kind: 'circle:poach', talentId: talent.id, rivalStudioId },
    choices: [
      {
        id: 'match',
        text: `Match the offer (${formatDollars(cost)})`,
        consequences: [
          { type: 'budget', impact: -cost, description: 'Pay a retention bonus to hold the line.' },
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: talent.id, studioId },
            impact: 18,
            description: 'Loyalty improves.'
          },
          { type: 'reputation', impact: 1, description: 'Industry sees you protect your people.' },
        ],
      },
      {
        id: 'promise',
        text: 'Promise them a prestige vehicle (no cash)',
        consequences: [
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: talent.id, studioId },
            impact: 8,
            description: 'Loyalty improves a bit.'
          },
          { type: 'reputation', impact: 0, description: 'No immediate change.' },
        ],
      },
      {
        id: 'let-walk',
        text: 'Let them walk',
        consequences: [
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: talent.id, studioId },
            impact: -20,
            description: 'Loyalty collapses.'
          },
          { type: 'reputation', impact: -1, description: 'Reputation takes a small hit.' },
        ],
      },
    ],
  };
}

function buildFeudEvent(
  state: GameState,
  weekAbs: number,
  week: number,
  year: number,
  project: Project,
  a: TalentPerson,
  b: TalentPerson,
  chemistry: number
): GameEvent {
  const studioId = state.studio.id;
  const cost = 125_000;
  const severityLabel = chemistry <= -75 ? 'explosive' : chemistry <= -60 ? 'serious' : 'tense';

  return {
    id: `circle:${weekAbs}:feud:${project.id}:${a.id}:${b.id}`,
    title: `On-set conflict turns ${severityLabel}`,
    description:
      `${a.name} and ${b.name} are clashing on ${project.title}. ` +
      `Chemistry is at ${Math.round(chemistry)}/100 and it's starting to slow the shoot.`,
    type: 'crisis',
    triggerDate: weekStartDate(week, year),
    data: { kind: 'circle:feud', projectId: project.id, talentAId: a.id, talentBId: b.id },
    choices: [
      {
        id: 'mediate',
        text: `Bring in a mediator (${formatDollars(cost)})`,
        consequences: [
          { type: 'budget', impact: -cost, description: 'Pay for mediation + schedule smoothing.' },
          {
            type: 'talent-relationship',
            relationship: 'chemistry',
            target: { talentId: a.id, otherTalentId: b.id },
            impact: 22,
            description: 'Chemistry improves.'
          },
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: a.id, studioId },
            impact: 4,
            description: 'Loyalty improves.'
          },
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: b.id, studioId },
            impact: 4,
            description: 'Loyalty improves.'
          },
        ],
      },
      {
        id: 'pick-a',
        text: `Back ${a.name}`,
        consequences: [
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: a.id, studioId },
            impact: 12,
            description: `${a.name} feels protected.`
          },
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: b.id, studioId },
            impact: -14,
            description: `${b.name} feels slighted.`
          },
          { type: 'reputation', impact: -1, description: 'The crew senses favoritism.' },
        ],
      },
      {
        id: 'replace-b',
        text: `Replace ${b.name}`,
        consequences: [
          { type: 'reputation', impact: -2, description: 'Press sniffs instability.' },
          {
            type: 'talent-relationship',
            relationship: 'loyalty',
            target: { talentId: a.id, studioId },
            impact: 6,
            description: `${a.name} is relieved.`
          },
        ],
      },
    ],
  };
}

export const PlayerCircleDramaSystem: TickSystem = {
  id: 'playerCircleDrama',
  label: 'Inner circle drama',
  onTick: (state, ctx) => {
    // Keep the queue manageable: if something is already waiting on the player, don't add more.
    if ((state.eventQueue || []).length > 0) return state;

    const weekAbs = absWeek(ctx.week, ctx.year);

    const talentById = new Map((state.talent || []).map((t) => [t.id, t] as const));

    // ---------------------------------------------------------------------
    // Candidate 1: On-set feud (player-caused, so allowed in Online League)
    // ---------------------------------------------------------------------

    const dramaProjects = (state.projects || []).filter((p) =>
      ['pre-production', 'production', 'post-production', 'marketing'].includes(p.currentPhase)
    );

    let worstFeud: {
      project: Project;
      a: TalentPerson;
      b: TalentPerson;
      chemistry: number;
    } | null = null;

    for (const project of dramaProjects) {
      const pair = findWorstChemistryPair(talentById, project);
      if (!pair) continue;
      if (!worstFeud || pair.chemistry < worstFeud.chemistry) {
        worstFeud = { project, ...pair };
      }
    }

    const feudSevere = !!worstFeud && worstFeud.chemistry <= -60;

    // ---------------------------------------------------------------------
    // Candidate 2: Poaching attempt (disabled in Online League)
    // ---------------------------------------------------------------------

    const studioId = state.studio.id;

    const poachable = state.mode === 'online'
      ? []
      : (state.talent || [])
          .filter((t) => t.contractStatus === 'contracted' || t.contractStatus === 'exclusive')
          .map((t) => ({
            talent: t,
            loyalty: clamp(t.studioLoyalty?.[studioId] ?? 50, 0, 100),
          }))
          .filter((t) => t.loyalty <= 40)
          .sort((a, b) => a.loyalty - b.loyalty);

    const topPoach = poachable[0];
    const poachSevere = !!topPoach && topPoach.loyalty <= 25;

    // ---------------------------------------------------------------------
    // Decide which event to emit (worst-first, then probabilistic)
    // ---------------------------------------------------------------------

    const shouldFeud = feudSevere || (!!worstFeud && ctx.rng.chance(clamp((-worstFeud.chemistry - 45) / 120, 0, 0.25)));
    const shouldPoach = poachSevere || (!!topPoach && state.competitorStudios.length > 0 && ctx.rng.chance(clamp((40 - topPoach.loyalty) / 200, 0, 0.2)));

    let event: GameEvent | null = null;

    if (shouldFeud && worstFeud) {
      event = buildFeudEvent(state, weekAbs, ctx.week, ctx.year, worstFeud.project, worstFeud.a, worstFeud.b, worstFeud.chemistry);
    } else if (shouldPoach && topPoach && state.competitorStudios.length > 0) {
      const rival = ctx.rng.pick(state.competitorStudios) || state.competitorStudios[0];
      event = buildPoachingEvent(state, weekAbs, ctx.week, ctx.year, topPoach.talent, rival.id);
    }

    if (!event) return state;

    ctx.recap.push({
      type: 'talent',
      title: 'Inner Circle: decision required',
      body: event.title,
      severity: 'warning',
    });

    return {
      ...state,
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
