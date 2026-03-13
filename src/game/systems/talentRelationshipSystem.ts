import type { GameState, Project, RelationshipType, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const relationshipBaseChemistry = (type: RelationshipType): number => {
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
};

function computeCompatibility(a: TalentPerson, b: TalentPerson): number {
  const sharedGenres = (a.genres || []).filter((g) => (b.genres || []).includes(g)).length;
  const genreScore = Math.min(20, sharedGenres * 5);

  const ageScore = clamp(20 - Math.abs((a.age || 0) - (b.age || 0)), 0, 20);

  const expScore = clamp(10 - Math.abs((a.experience || 0) - (b.experience || 0)) / 2, 0, 10);

  // 0..50-ish → map to -10..+30, then clamp.
  const raw = genreScore + ageScore + expScore;
  return clamp(Math.round(raw - 15), -10, 30);
}

function evolveRelationship(current: RelationshipType, chemistry: number, a: TalentPerson, b: TalentPerson): RelationshipType {
  // Preserve authored mentor relationships unless they become openly hostile.
  if (current === 'mentor-mentee') {
    if (chemistry <= -75) return 'hostile';
    if (chemistry <= -45) return 'rivals';
    return current;
  }

  // Romantic is sticky unless chemistry completely collapses.
  if (current === 'romantic') {
    if (chemistry <= 10) return 'professional';
    return current;
  }

  const bothActors = a.type === 'actor' && b.type === 'actor';
  if (bothActors && chemistry >= 92) return 'romantic';

  if (chemistry >= 55) return 'friendly';
  if (chemistry <= -80) return 'hostile';
  if (chemistry <= -45) return 'rivals';

  // De-escalation and drift back to neutral.
  if (current === 'friendly' && chemistry < 35) return 'professional';
  if ((current === 'rivals' || current === 'hostile') && chemistry > -20) return 'professional';

  if (current === 'friendly' || current === 'rivals' || current === 'hostile') return current;

  return 'professional';
}

function relationshipNote(type: RelationshipType, projectTitle?: string): string | undefined {
  const p = projectTitle ? ` on "${projectTitle}"` : '';
  switch (type) {
    case 'friendly':
      return `Built a strong rapport${p}.`;
    case 'rivals':
      return `Creative friction intensified${p}.`;
    case 'hostile':
      return `Their working relationship broke down${p}.`;
    case 'romantic':
      return `Rumored to have become romantically involved${p}.`;
    default:
      return undefined;
  }
}

function getProjectKeyParticipants(project: Project): string[] {
  const ids: string[] = [];

  const characters = project.script?.characters || [];
  const director = characters.find((c) => c.requiredType === 'director')?.assignedTalentId;
  if (director) ids.push(director);

  const leads = characters
    .filter((c) => c.importance === 'lead' && !!c.assignedTalentId)
    .map((c) => c.assignedTalentId as string)
    .slice(0, 3);
  ids.push(...leads);

  if (ids.length === 0) {
    const crewDirector = (project.crew || []).find((r) => r.role.toLowerCase().includes('director'))?.talentId;
    if (crewDirector) ids.push(crewDirector);

    const cast = (project.cast || [])
      .map((c) => c.talentId)
      .filter(Boolean)
      .slice(0, 3);
    ids.push(...cast);
  }

  return Array.from(new Set(ids)).slice(0, 4);
}

function isInProduction(project: Project): boolean {
  return (
    project.currentPhase === 'production' ||
    project.status === 'production' ||
    project.status === 'filming'
  );
}

export const TalentRelationshipSystem: TickSystem = {
  id: 'talentRelationships',
  label: 'Talent relationships',
  onTick: (state, ctx) => {
    const talent = state.talent || [];
    if (talent.length === 0) return state;

    const activeProjects = (state.projects || []).filter(isInProduction);
    if (activeProjects.length === 0) return state;

    const byId = new Map(talent.map((t) => [t.id, t] as const));
    const mutable = new Map<string, TalentPerson>();

    const ensure = (id: string): TalentPerson | undefined => {
      const existing = mutable.get(id);
      if (existing) return existing;
      const base = byId.get(id);
      if (!base) return undefined;
      const clone: TalentPerson = {
        ...base,
        relationships: { ...(base.relationships || {}) },
        relationshipNotes: { ...(base.relationshipNotes || {}) },
        chemistry: { ...(base.chemistry || {}) },
      };
      mutable.set(id, clone);
      return clone;
    };

    const relationshipChanges: Array<{ a: string; b: string; from: RelationshipType; to: RelationshipType; project: string }> = [];

    for (const project of activeProjects) {
      const participants = getProjectKeyParticipants(project);
      if (participants.length < 2) continue;

      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const idA = participants[i];
          const idB = participants[j];

          const a0 = byId.get(idA);
          const b0 = byId.get(idB);
          if (!a0 || !b0) continue;

          const a = ensure(idA);
          const b = ensure(idB);
          if (!a || !b) continue;

          const currentType = (a.relationships?.[idB] || b.relationships?.[idA] || 'professional') as RelationshipType;
          const compat = computeCompatibility(a0, b0);

          // Working together can amplify the baseline relationship.
          // High compatibility pairs can climb into friendship/romance territory; low compatibility pairs can spiral.
          const collaborationBoost = compat >= 20 ? 30 : compat >= 10 ? 15 : 0;
          const frictionBoost = compat <= -5 ? -50 : 0;

          const desired = clamp(relationshipBaseChemistry(currentType) + compat + collaborationBoost + frictionBoost, -90, 90);

          const currentChem = typeof a.chemistry?.[idB] === 'number' ? (a.chemistry![idB] as number) : 0;

          const diff = desired - currentChem;
          const step = clamp(Math.round(Math.abs(diff) / 12), 0, 3);
          const nextChem = clamp(currentChem + Math.sign(diff) * step, -100, 100);

          if (nextChem !== currentChem) {
            a.chemistry = { ...(a.chemistry || {}), [idB]: nextChem };
            b.chemistry = { ...(b.chemistry || {}), [idA]: nextChem };
          }

          const nextType = evolveRelationship(currentType, nextChem, a0, b0);
          if (nextType !== currentType) {
            a.relationships = { ...(a.relationships || {}), [idB]: nextType };
            b.relationships = { ...(b.relationships || {}), [idA]: nextType };

            const note = relationshipNote(nextType, project.title);
            if (note) {
              if (!a.relationshipNotes?.[idB]) a.relationshipNotes = { ...(a.relationshipNotes || {}), [idB]: note };
              if (!b.relationshipNotes?.[idA]) b.relationshipNotes = { ...(b.relationshipNotes || {}), [idA]: note };
            }

            relationshipChanges.push({ a: idA, b: idB, from: currentType, to: nextType, project: project.title });
          }
        }
      }
    }

    if (mutable.size === 0) return state;

    const updatedTalent = talent.map((t) => mutable.get(t.id) || t);

    if (relationshipChanges.length > 0) {
      const lines = relationshipChanges
        .slice(0, 6)
        .map((c) => {
          const a = byId.get(c.a)?.name || c.a;
          const b = byId.get(c.b)?.name || c.b;
          return `• ${a} ↔ ${b}: ${c.from} → ${c.to}${c.project ? ` (${c.project})` : ''}`;
        });

      ctx.recap.push({
        type: 'talent',
        title: `Industry relationships shifted (${relationshipChanges.length})`,
        body: lines.join('\n') + (relationshipChanges.length > 6 ? `\n…and ${relationshipChanges.length - 6} more` : ''),
        severity: relationshipChanges.some((c) => c.to === 'hostile' || c.to === 'rivals') ? 'warning' : 'info',
      });
    }

    return {
      ...state,
      talent: updatedTalent,
    };
  },
};
