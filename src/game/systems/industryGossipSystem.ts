import type { GameEvent, GameState, Scandal, TalentPerson, WorldHistoryEntry } from '@/types/game';
import { clampMarketValue } from './talentLifecycleSystem';
import type { TickSystem } from '../core/types';
import { stableInt } from '@/utils/stableRandom';
import { pushWorldHistory } from '@/utils/worldHistory';
import { MediaEngine } from '@/components/game/MediaEngine';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function pickDeterministic<T>(seed: string, arr: readonly T[]): T {
  return arr[stableInt(seed, 0, Math.max(0, arr.length - 1))];
}

function createScandal(params: {
  universeSeed: number;
  talent: TalentPerson;
  week: number;
  year: number;
}): Scandal {
  const { universeSeed, talent, week, year } = params;
  const id = `scandal:${year}:W${week}:${talent.id}`;

  const type = pickDeterministic(`${universeSeed}|scandal|type|${id}`, ['personal', 'professional', 'legal', 'social'] as const);

  const fame = clamp(talent.fame ?? 0, 0, 100);
  const burnout = clamp(talent.burnoutLevel ?? 0, 0, 100);

  const severity = ((): Scandal['severity'] => {
    const n = stableInt(`${universeSeed}|scandal|severity|${id}`, 0, 99);
    if (fame >= 90 && burnout >= 85 && n < 25) return 'career-ending';
    if (n < 15) return 'major';
    if (n < 55) return 'moderate';
    return 'minor';
  })();

  const templates: Record<Scandal['type'], string[]> = {
    personal: [
      '{TalentName} is trending after a messy off-camera incident.',
      '{TalentName} faces tabloid fallout after a private dispute goes public.',
    ],
    professional: [
      '{TalentName} is accused of unprofessional behavior on set.',
      'A crew source alleges {TalentName} caused multiple production delays.',
    ],
    legal: [
      '{TalentName} is pulled into a legal dispute that could escalate.',
      '{TalentName} is named in filings connected to a messy business disagreement.',
    ],
    social: [
      'A social-media controversy flares up around {TalentName}.',
      '{TalentName} is criticized for comments that sparked backlash online.',
    ],
  };

  const base = pickDeterministic(`${universeSeed}|scandal|template|${id}`, templates[type]);
  const description = base.replace(/\{TalentName\}/g, talent.name);

  const severityMult = severity === 'career-ending' ? 3.2 : severity === 'major' ? 2.1 : severity === 'moderate' ? 1.2 : 0.6;
  const reputationImpact = -Math.round(3 * severityMult);
  const marketValueImpact = -Math.round((talent.marketValue || 0) * 0.05 * severityMult);

  return {
    id,
    type,
    severity,
    description,
    weekOccurred: week,
    yearOccurred: year,
    resolved: false,
    reputationImpact,
    marketValueImpact,
  };
}

function shouldTriggerQuarterlyScandal(t: TalentPerson): boolean {
  if (t.contractStatus === 'retired') return false;
  if (t.type !== 'actor' && t.type !== 'director') return false;
  return true;
}

function scandalScore(t: TalentPerson): number {
  const fame = clamp(t.fame ?? 0, 0, 100);
  const burnout = clamp(t.burnoutLevel ?? 0, 0, 100);
  const publicImage = clamp(t.publicImage ?? 50, 0, 100);

  const unresolvedMajor = (t.scandals || []).some((s) => !s.resolved && (s.severity === 'major' || s.severity === 'career-ending'));
  const penalty = unresolvedMajor ? 30 : 0;

  return fame * 0.55 + burnout * 0.35 + (50 - publicImage) * 0.35 - penalty;
}

function selectScandalCandidate(state: GameState, week: number, year: number): TalentPerson | null {
  const universeSeed = state.universeSeed ?? 0;

  let best: { t: TalentPerson; score: number } | null = null;

  for (const t of state.talent || []) {
    if (!shouldTriggerQuarterlyScandal(t)) continue;

    const base = scandalScore(t);
    if (base < 92) continue;

    const jitter = stableInt(`${universeSeed}|gossip|scandal|jitter|${year}:W${week}:${t.id}`, 0, 100) / 100;
    const s = base + jitter;

    if (!best || s > best.score) best = { t, score: s };
  }

  return best?.t || null;
}

function shouldTriggerRivalryPair(a: TalentPerson, b: TalentPerson): boolean {
  if (a.contractStatus === 'retired' || b.contractStatus === 'retired') return false;
  const fameA = clamp(a.fame ?? 0, 0, 100);
  const fameB = clamp(b.fame ?? 0, 0, 100);
  if (fameA < 65 || fameB < 65) return false;
  return true;
}

function getChemistry(a: TalentPerson, b: TalentPerson): number {
  const direct = a.chemistry?.[b.id];
  if (typeof direct === 'number') return direct;

  const rel = a.relationships?.[b.id];
  if (rel === 'hostile') return -70;
  if (rel === 'rivals') return -45;
  return 0;
}

function selectRivalryPair(state: GameState, week: number, year: number): { a: TalentPerson; b: TalentPerson; chemistry: number } | null {
  const universeSeed = state.universeSeed ?? 0;

  const byId = new Map((state.talent || []).map((t) => [t.id, t] as const));

  let best: { a: TalentPerson; b: TalentPerson; chemistry: number; score: number } | null = null;

  for (const a of state.talent || []) {
    if (!a.relationships && !a.chemistry) continue;

    const links = new Set<string>([...Object.keys(a.relationships || {}), ...Object.keys(a.chemistry || {})]);

    for (const bid of links) {
      const b = byId.get(bid);
      if (!b) continue;
      if (a.id >= b.id) continue;

      if (!shouldTriggerRivalryPair(a, b)) continue;

      const chem = Math.min(getChemistry(a, b), getChemistry(b, a));
      if (chem > -40) continue;

      const fameSum = clamp(a.fame ?? 0, 0, 100) + clamp(b.fame ?? 0, 0, 100);
      const jitter = stableInt(`${universeSeed}|gossip|rivalry|jitter|${year}:W${week}:${a.id}:${b.id}`, 0, 100) / 100;
      const score = (-chem) + fameSum * 0.35 + jitter;

      if (!best || score > best.score) best = { a, b, chemistry: chem, score };
    }
  }

  return best ? { a: best.a, b: best.b, chemistry: best.chemistry } : null;
}

function injectGossipMedia(params: {
  id: string;
  type: 'news' | 'rumor' | 'editorial';
  headline: string;
  content: string;
  week: number;
  year: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  targets: { studios?: string[]; talent?: string[]; projects?: string[] };
  tags: string[];
  relatedEvents?: string[];
}): void {
  MediaEngine.injectDeterministicMediaItem({
    id: params.id,
    type: params.type,
    headline: params.headline,
    content: params.content,
    week: params.week,
    year: params.year,
    sentiment: params.sentiment,
    targets: params.targets,
    tags: params.tags,
    relatedEvents: params.relatedEvents,
    sourceType: 'trade_publication',
  });
}

function buildScandalEvent(params: {
  state: GameState;
  talent: TalentPerson;
  scandal: Scandal;
  week: number;
  year: number;
}): GameEvent {
  const { state, talent, scandal, week, year } = params;
  const weekAbs = absWeek(week, year);

  const prCost = Math.max(75_000, Math.round((talent.marketValue || 1_000_000) * 0.02));

  const severityLabel = scandal.severity === 'career-ending' ? 'catastrophic' : scandal.severity;

  return {
    id: `gossip:${weekAbs}:scandal:${talent.id}`,
    title: `Scandal: ${talent.name} (${severityLabel})`,
    description:
      `${scandal.description} ` +
      `The trades are calling it "${severityLabel}". How do you respond?`,
    type: 'crisis',
    triggerDate: new Date(Date.UTC(year, 0, 1 + (week - 1) * 7)),
    data: { kind: 'gossip:scandal', talentId: talent.id, scandalId: scandal.id },
    choices: [
      {
        id: 'deny',
        text: 'Deny and stay quiet',
        consequences: [
          { type: 'reputation', impact: -1, description: 'The story drags on.' },
        ],
      },
      {
        id: 'apology',
        text: 'Apologize and commit to changes',
        consequences: [
          { type: 'reputation', impact: 0, description: 'You stabilize the narrative.' },
        ],
      },
      {
        id: 'pr',
        text: `PR blitz (${prCost.toLocaleString()} budget)`,
        requirements: [{ type: 'budget', threshold: prCost, description: 'Not enough budget for a PR blitz.' }],
        consequences: [
          { type: 'budget', impact: -prCost, description: 'Pay for crisis comms.' },
          { type: 'reputation', impact: 1, description: 'You contain the headline cycle.' },
        ],
      },
      {
        id: 'cut',
        text: 'Cut ties',
        consequences: [
          { type: 'reputation', impact: -1, description: 'Some see you as ruthless.' },
        ],
      },
    ],
  };
}

export const IndustryGossipSystem: TickSystem = {
  id: 'industryGossip',
  label: 'Industry gossip',
  dependsOn: ['talentCareerArcs'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    // Quarterly gossip cycle keeps history high-signal.
    if (ctx.week % 13 !== 0) return state;

    const universeSeed = state.universeSeed ?? 0;

    let changed = false;

    let worldHistory = state.worldHistory || [];
    const nextTalent = (state.talent || []).map((t) => t);
    const byId = new Map(nextTalent.map((t) => [t.id, t] as const));

    const recapLines: string[] = [];

    // ---------------------------------------------------------------------
    // 1) Scandal cycle
    // ---------------------------------------------------------------------

    const scandalTalent = selectScandalCandidate(state, ctx.week, ctx.year);

    if (scandalTalent) {
      const t = byId.get(scandalTalent.id);
      if (t) {
        const scandal = createScandal({ universeSeed, talent: t, week: ctx.week, year: ctx.year });

        const already = (t.scandals || []).some((s) => s.id === scandal.id);

        if (!already) {
          const rep = clamp(t.reputation ?? 50, 0, 100);
          const mv = Math.max(0, t.marketValue ?? 0);
          const pi = clamp(t.publicImage ?? rep, 0, 100);

          const nextRep = clamp(rep + scandal.reputationImpact, 0, 100);
          const nextMv = Math.max(0, mv + scandal.marketValueImpact);
          const nextPi = clamp(pi + Math.round(scandal.reputationImpact * 1.2), 0, 100);

          const next: TalentPerson = {
            ...t,
            reputation: nextRep,
            marketValue: nextMv,
            publicImage: nextPi,
            scandals: [...(t.scandals || []), scandal],
            careerEvolution: [
              ...(t.careerEvolution || []),
              {
                type: 'scandal',
                year: ctx.year,
                week: ctx.week,
                description: scandal.description,
                impactOnReputation: scandal.reputationImpact,
                impactOnMarketValue: scandal.marketValueImpact,
              },
            ],
          };

          byId.set(t.id, next);
          changed = true;

          const importance: WorldHistoryEntry['importance'] =
            scandal.severity === 'career-ending' ? 5 : scandal.severity === 'major' ? 4 : scandal.severity === 'moderate' ? 3 : 2;

          worldHistory = pushWorldHistory(worldHistory, {
            id: `hist:talent_scandal:${ctx.year}:W${ctx.week}:${t.id}`,
            kind: 'talent_scandal',
            year: ctx.year,
            week: ctx.week,
            title: `Scandal: ${t.name}`,
            body: scandal.description,
            entityIds: { talentIds: [t.id] },
            importance,
          });

          injectGossipMedia({
            id: `media:gossip:scandal:${ctx.year}:W${ctx.week}:${t.id}`,
            type: 'news',
            headline: `Scandal watch: ${t.name} faces ${scandal.severity} backlash`,
            content: scandal.description,
            week: ctx.week,
            year: ctx.year,
            sentiment: 'negative',
            targets: { talent: [t.id] },
            tags: ['scandal', 'gossip'],
          });

          recapLines.push(`• Scandal: ${t.name} (${scandal.severity})`);

          const studioId = state.studio.id;
          const contractedToPlayer =
            (t.contractStatus === 'contracted' || t.contractStatus === 'exclusive') &&
            (t.studioLoyalty?.[studioId] ?? 50) >= 0;

          if ((state.eventQueue || []).length === 0 && contractedToPlayer) {
            const ev = buildScandalEvent({ state, talent: t, scandal, week: ctx.week, year: ctx.year });

            ctx.recap.push({
              type: 'talent',
              title: 'Scandal: decision required',
              body: ev.title,
              severity: 'warning',
            });

            return {
              ...state,
              talent: nextTalent.map((x) => byId.get(x.id) || x),
              worldHistory,
              eventQueue: [...(state.eventQueue || []), ev],
            };
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // 2) Rivalry cycle
    // ---------------------------------------------------------------------

    const rivalry = selectRivalryPair(state, ctx.week, ctx.year);

    if (rivalry) {
      const a = byId.get(rivalry.a.id);
      const b = byId.get(rivalry.b.id);

      if (a && b) {
        const id = `hist:talent_rivalry:${ctx.year}:W${ctx.week}:${a.id}:${b.id}`;
        const already = (state.worldHistory || []).some((e) => e.id === id);

        if (!already) {
          const title = `Rivalry heats up: ${a.name} vs ${b.name}`;
          const body = `Industry chatter suggests tensions between ${a.name} and ${b.name} are escalating.`;

          worldHistory = pushWorldHistory(worldHistory, {
            id,
            kind: 'talent_rivalry',
            year: ctx.year,
            week: ctx.week,
            title,
            body,
            entityIds: { talentIds: [a.id, b.id] },
            importance: 3,
          });

          injectGossipMedia({
            id: `media:gossip:rivalry:${ctx.year}:W${ctx.week}:${a.id}:${b.id}`,
            type: 'rumor',
            headline: `${a.name} and ${b.name} feud rumors intensify`,
            content: body,
            week: ctx.week,
            year: ctx.year,
            sentiment: 'neutral',
            targets: { talent: [a.id, b.id] },
            tags: ['rivalry', 'gossip'],
          });

          recapLines.push(`• Rivalry: ${a.name} vs ${b.name}`);
          changed = true;

          // Nudge chemistry further negative so feuds persist.
          const bump = -5;
          const nextA: TalentPerson = {
            ...a,
            chemistry: { ...(a.chemistry || {}), [b.id]: clamp((a.chemistry?.[b.id] ?? rivalry.chemistry) + bump, -100, 100) },
          };
          const nextB: TalentPerson = {
            ...b,
            chemistry: { ...(b.chemistry || {}), [a.id]: clamp((b.chemistry?.[a.id] ?? rivalry.chemistry) + bump, -100, 100) },
          };

          byId.set(a.id, nextA);
          byId.set(b.id, nextB);
        }
      }
    }

    if (!changed) return state;

    if (recapLines.length > 0) {
      ctx.recap.push({
        type: 'talent',
        title: 'Gossip cycle',
        body: recapLines.join('\n'),
        severity: 'info',
      });
    }

    return {
      ...state,
      talent: nextTalent.map((x) => byId.get(x.id) || x),
      worldHistory,
    };
  },
};
