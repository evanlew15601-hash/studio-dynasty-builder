import type { CareerEvent, GameState, Project, TalentPerson, WorldHistoryEntry } from '@/types/game';
import { clampMarketValue } from './talentLifecycleSystem';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isReleasedThisWeek(p: Project, week: number, year: number): boolean {
  return p.status === 'released' && p.releaseWeek === week && p.releaseYear === year;
}

function getMultiplier(p: Project): number {
  const budget = (p.budget as any)?.total ?? 0;
  const boxOffice = (p.metrics as any)?.boxOfficeTotal ?? 0;
  if (!budget || budget <= 0) return 0;
  return boxOffice / budget;
}

function getCritics(p: Project): number {
  return (p.metrics as any)?.criticsScore ?? 0;
}

function extractKeyCredits(p: Project): { directorIds: string[]; leadActorIds: string[] } {
  const directorIds: string[] = [];
  const leadActorIds: string[] = [];

  const chars = p.script?.characters || [];
  for (const ch of chars) {
    const tid = ch.assignedTalentId;
    if (!tid) continue;

    if (ch.requiredType === 'director') {
      if (!directorIds.includes(tid)) directorIds.push(tid);
      continue;
    }

    if (ch.importance === 'lead') {
      if (!leadActorIds.includes(tid)) leadActorIds.push(tid);
    }
  }

  if (directorIds.length === 0 || leadActorIds.length === 0) {
    for (const c of p.cast || []) {
      const tid = c.talentId;
      if (!tid) continue;
      const role = (c.role || '').toLowerCase();

      if (role.includes('director')) {
        if (!directorIds.includes(tid)) directorIds.push(tid);
      } else if (role.includes('lead')) {
        if (!leadActorIds.includes(tid)) leadActorIds.push(tid);
      }
    }

    for (const c of p.crew || []) {
      const tid = c.talentId;
      if (!tid) continue;
      const role = (c.role || '').toLowerCase();
      if (role.includes('director')) {
        if (!directorIds.includes(tid)) directorIds.push(tid);
      }
    }
  }

  return { directorIds, leadActorIds };
}

function hasCareerEvent(t: TalentPerson, type: CareerEvent['type'], sourceProjectId: string): boolean {
  return (t.careerEvolution || []).some((e) => e.type === type && e.sourceProjectId === sourceProjectId);
}

function hadRecentFlop(t: TalentPerson, currentYear: number): boolean {
  const minYear = currentYear - 3;
  return (t.careerEvolution || []).some((e) => e.type === 'flop' && e.year >= minYear);
}

function pushTalentEvent(params: {
  talent: TalentPerson;
  event: CareerEvent;
}): TalentPerson {
  const { talent, event } = params;

  const rep = clamp(talent.reputation ?? 50, 0, 100);
  const mv = talent.marketValue ?? 0;

  return {
    ...talent,
    reputation: clamp(rep + (event.impactOnReputation || 0), 0, 100),
    marketValue: clampMarketValue(Math.max(0, mv + (event.impactOnMarketValue || 0)), talent.type),
    careerEvolution: [...(talent.careerEvolution || []), event],
  };
}

function maybeHistoryForTalentEvent(params: {
  entry: WorldHistoryEntry;
  worldHistory: WorldHistoryEntry[];
}): WorldHistoryEntry[] {
  const { entry, worldHistory } = params;
  return pushWorldHistory(worldHistory, entry);
}

/**
 * Career arc events derived from releases.
 *
 * This is intentionally conservative: it only targets key credits and uses outcome thresholds,
 * so events feel earned and don’t spam the timeline.
 */
export const TalentCareerArcSystem: TickSystem = {
  id: 'talentCareerArcs',
  label: 'Talent career arcs',
  dependsOn: ['talentFilmography'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const releasedById = new Map<string, Project>();
    for (const p of state.projects || []) {
      if (isReleasedThisWeek(p, ctx.week, ctx.year)) releasedById.set(p.id, p);
    }

    for (const r of state.allReleases || []) {
      if (!r) continue;
      if (!('script' in (r as any))) continue;
      const p = r as Project;
      if (isReleasedThisWeek(p, ctx.week, ctx.year)) releasedById.set(p.id, p);
    }

    const released = [...releasedById.values()];
    if (released.length === 0) return state;

    let worldHistory = state.worldHistory || [];

    const byId = new Map((state.talent || []).map((t) => [t.id, t] as const));
    let changed = false;

    const updatedTalent = (state.talent || []).map((t) => {
      // We'll update specific talent via byId at the end.
      return t;
    });

    const nextById = new Map(byId);

    const recapLines: string[] = [];

    for (const p of released) {
      const multiplier = getMultiplier(p);
      const critics = getCritics(p);

      const isHit = multiplier >= 2.0 || critics >= 85;
      const isBomb = multiplier > 0 && multiplier <= 0.6;

      if (!isHit && !isBomb) continue;

      const { directorIds, leadActorIds } = extractKeyCredits(p);
      const keyIds = [...new Set([...directorIds, ...leadActorIds])];

      for (const tid of keyIds) {
        const t = nextById.get(tid);
        if (!t) continue;
        if (t.contractStatus === 'retired') continue;

        if (isHit) {
          const isVeteran = t.careerStage === 'veteran' || t.careerStage === 'legend';
          const comeback = isVeteran && hadRecentFlop(t, ctx.year);

          if (comeback) {
            if (hasCareerEvent(t, 'comeback', p.id)) continue;

            const ev: CareerEvent = {
              type: 'comeback',
              year: ctx.year,
              week: ctx.week,
              description: `${t.name} staged a comeback with "${p.title}".`,
              impactOnReputation: 2,
              impactOnMarketValue: 3,
              sourceProjectId: p.id,
            };

            const nextT = pushTalentEvent({ talent: t, event: ev });
            nextById.set(tid, nextT);
            changed = true;
            recapLines.push(`• Comeback: ${t.name} — "${p.title}"`);

            const importance: 3 | 4 | 5 | undefined = (t.reputation ?? 0) >= 95 ? 5 : (t.reputation ?? 0) >= 85 ? 4 : undefined;
            if (importance) {
              worldHistory = maybeHistoryForTalentEvent({
                worldHistory,
                entry: {
                  id: `hist:talent_comeback:${ctx.year}:${ctx.week}:${t.id}:${p.id}`,
                  kind: 'talent_comeback',
                  year: ctx.year,
                  week: ctx.week,
                  title: `${t.name} comeback`,
                  body: `"${p.title}" marked a comeback moment for ${t.name}.`,
                  entityIds: { talentIds: [t.id], projectIds: [p.id] },
                  importance,
                },
              });
            }

            continue;
          }

          const isRising = t.careerStage === 'rising' || (t.experience ?? 0) <= 5;
          if (isRising) {
            if (hasCareerEvent(t, 'breakthrough', p.id)) continue;

            const ev: CareerEvent = {
              type: 'breakthrough',
              year: ctx.year,
              week: ctx.week,
              description: `${t.name} broke through with "${p.title}".`,
              impactOnReputation: 2,
              impactOnMarketValue: 2,
              sourceProjectId: p.id,
            };

            const nextT = pushTalentEvent({ talent: t, event: ev });
            nextById.set(tid, nextT);
            changed = true;
            recapLines.push(`• Breakthrough: ${t.name} — "${p.title}"`);

            const importance: 3 | 4 | 5 | undefined = (t.reputation ?? 0) >= 90 ? 4 : t.isNotable ? 3 : undefined;
            if (importance) {
              worldHistory = maybeHistoryForTalentEvent({
                worldHistory,
                entry: {
                  id: `hist:talent_breakthrough:${ctx.year}:${ctx.week}:${t.id}:${p.id}`,
                  kind: 'talent_breakthrough',
                  year: ctx.year,
                  week: ctx.week,
                  title: `${t.name} breakthrough`,
                  body: `"${p.title}" marked a breakthrough moment for ${t.name}.`,
                  entityIds: { talentIds: [t.id], projectIds: [p.id] },
                  importance,
                },
              });
            }
          }
        }

        if (isBomb) {
          if (hasCareerEvent(t, 'flop', p.id)) continue;

          const ev: CareerEvent = {
            type: 'flop',
            year: ctx.year,
            week: ctx.week,
            description: `"${p.title}" flopped, denting ${t.name}'s momentum.`,
            impactOnReputation: -2,
            impactOnMarketValue: -2,
            sourceProjectId: p.id,
          };

          const nextT = pushTalentEvent({ talent: t, event: ev });
          nextById.set(tid, nextT);
          changed = true;
          recapLines.push(`• Flop: ${t.name} — "${p.title}"`);

          const importance: 3 | 4 | 5 | undefined = (t.reputation ?? 0) >= 90 ? 3 : undefined;
          if (importance) {
            worldHistory = maybeHistoryForTalentEvent({
              worldHistory,
              entry: {
                id: `hist:talent_flop:${ctx.year}:${ctx.week}:${t.id}:${p.id}`,
                kind: 'talent_flop',
                year: ctx.year,
                week: ctx.week,
                title: `${t.name} takes a hit`,
                body: `"${p.title}" underperformed and sparked industry doubts about ${t.name}.`,
                entityIds: { talentIds: [t.id], projectIds: [p.id] },
                importance,
              },
            });
          }
        }
      }
    }

    if (!changed) return state;

    const mergedTalent = updatedTalent.map((t) => nextById.get(t.id) || t);

    if (recapLines.length > 0) {
      ctx.recap.push({
        type: 'talent',
        title: 'Career moments',
        body: recapLines.slice(0, 12).join('\n') + (recapLines.length > 12 ? `\n…and ${recapLines.length - 12} more` : ''),
        severity: 'info',
      });
    }

    return {
      ...state,
      talent: mergedTalent,
      worldHistory,
    };
  },
};
