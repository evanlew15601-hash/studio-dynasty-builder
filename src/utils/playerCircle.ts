import type { GameState, MediaSource, Studio, TalentAgent, TalentPerson } from '@/types/game';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';

export type PlayerCircleCollaborator = {
  talent: TalentPerson;
  loyalty: number;
};

export type PlayerCircleRival = {
  talent: TalentPerson;
  score: number;
  relationshipCount: number;
};

export type PlayerCircleStudioRivalry = {
  studio: Studio;
  rivalry: number;
};

export type PlayerCircle = {
  collaborators: PlayerCircleCollaborator[];
  rivals: PlayerCircleRival[];
  managers: TalentAgent[];
  critics: MediaSource[];
  studios: PlayerCircleStudioRivalry[];
};

function getStudioLoyalty(talent: TalentPerson, studioId: string): number {
  return talent.studioLoyalty?.[studioId] ?? 50;
}

function studioRivalryScore(player: Studio, competitor: Studio): number {
  const playerGenres = new Set(player.specialties || []);
  const competitorGenres = new Set(competitor.specialties || []);

  let overlap = 0;
  for (const g of competitorGenres) if (playerGenres.has(g)) overlap += 1;

  const repDiff = Math.abs((player.reputation ?? 0) - (competitor.reputation ?? 0));

  // Overlap matters most, then closeness in reputation.
  return overlap * 30 + (100 - Math.min(100, repDiff));
}

export function computePlayerCircle(state: GameState, options?: { limit?: number }): PlayerCircle {
  const limit = Math.max(1, Math.min(20, options?.limit ?? 8));

  const studioId = state.studio.id;

  const byId = new Map((state.talent || []).map((t) => [t.id, t] as const));

  // Collaborators are people you have worked with (credits/contracts) or who have studio loyalty.
  const collaboratorIds = new Set<string>();

  // Current contracts
  for (const t of state.talent || []) {
    if (t.contractStatus === 'contracted' || t.contractStatus === 'exclusive') {
      collaboratorIds.add(t.id);
    }
    // Talent who have developed loyalty to the player studio through past work
    if ((t.studioLoyalty?.[studioId] ?? 0) > 50) {
      collaboratorIds.add(t.id);
    }
  }

  // Active project assignments
  for (const p of state.projects || []) {
    for (const c of p.cast || []) {
      if ((c as any)?.talentId) collaboratorIds.add((c as any).talentId);
    }
    for (const c of p.crew || []) {
      if ((c as any)?.talentId) collaboratorIds.add((c as any).talentId);
    }
    for (const ct of p.contractedTalent || []) {
      if ((ct as any)?.talentId) collaboratorIds.add((ct as any).talentId);
    }
    // Script character assignments (the primary casting data structure)
    for (const ch of p.script?.characters || []) {
      if (ch.assignedTalentId) collaboratorIds.add(ch.assignedTalentId);
    }
  }

  // Also include talent from released projects (allReleases) who have worked with us
  for (const r of state.allReleases || []) {
    if (!r || !('script' in (r as any))) continue;
    const p = r as any;
    for (const ch of p.script?.characters || []) {
      if (ch.assignedTalentId) collaboratorIds.add(ch.assignedTalentId);
    }
    for (const c of p.cast || []) {
      if ((c as any)?.talentId) collaboratorIds.add((c as any).talentId);
    }
  }

  const collaboratorTalents = [...collaboratorIds]
    .map((id) => byId.get(id))
    .filter((t): t is TalentPerson => !!t)
    .sort((a, b) => {
      const la = getStudioLoyalty(a, studioId);
      const lb = getStudioLoyalty(b, studioId);
      if (lb !== la) return lb - la;
      if ((b.reputation ?? 0) !== (a.reputation ?? 0)) return (b.reputation ?? 0) - (a.reputation ?? 0);
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  const collaborators: PlayerCircleCollaborator[] = collaboratorTalents
    .map((t) => ({ talent: t, loyalty: getStudioLoyalty(t, studioId) }));

  const collaboratorsSet = new Set(collaborators.map((c) => c.talent.id));

  // Rivals are talent that have explicit hostile/rivals relationships with your collaborators.
  const rivalScore = new Map<string, { score: number; relationshipCount: number }>();

  for (const c of collaborators) {
    const rels = c.talent.relationships || {};
    for (const [otherId, type] of Object.entries(rels)) {
      if (type !== 'rivals' && type !== 'hostile') continue;
      if (!byId.has(otherId)) continue;
      if (collaboratorsSet.has(otherId)) continue;

      const prev = rivalScore.get(otherId) || { score: 0, relationshipCount: 0 };
      const weight = type === 'hostile' ? 3 : 2;

      rivalScore.set(otherId, {
        score: prev.score + weight,
        relationshipCount: prev.relationshipCount + 1,
      });
    }
  }

  const rivals: PlayerCircleRival[] = [...rivalScore.entries()]
    .map(([id, v]) => ({ talent: byId.get(id)!, score: v.score, relationshipCount: v.relationshipCount }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.talent.reputation ?? 0) !== (a.talent.reputation ?? 0)) return (b.talent.reputation ?? 0) - (a.talent.reputation ?? 0);
      return a.talent.name.localeCompare(b.talent.name);
    })
    .slice(0, limit);

  const managerById = new Map<string, TalentAgent>();
  for (const c of collaborators) {
    const a = c.talent.agent;
    if (a && a.id) managerById.set(a.id, a);
  }

  const managers = [...managerById.values()].sort((a, b) => {
    if ((b.powerLevel ?? 0) !== (a.powerLevel ?? 0)) return (b.powerLevel ?? 0) - (a.powerLevel ?? 0);
    return a.name.localeCompare(b.name);
  });

  const critics = MediaSourceGenerator.generateMediaSources()
    .slice()
    .sort((a, b) => {
      if (b.credibility !== a.credibility) return b.credibility - a.credibility;
      if (b.reach !== a.reach) return b.reach - a.reach;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.min(10, limit));

  const studios = (state.competitorStudios || [])
    .slice()
    .map((s) => ({ studio: s, rivalry: studioRivalryScore(state.studio, s) }))
    .sort((a, b) => {
      if (b.rivalry !== a.rivalry) return b.rivalry - a.rivalry;
      return a.studio.name.localeCompare(b.studio.name);
    })
    .slice(0, Math.min(10, limit));

  return {
    collaborators,
    rivals,
    managers,
    critics,
    studios,
  };
}
