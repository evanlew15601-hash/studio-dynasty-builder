import type { GameState, Project, StudioAward } from '@/types/game';
import type { TickSystem } from '../core/types';
import { getFestivalById } from '@/data/Festivals';

export const FestivalOutcomeSystem: TickSystem = {
  id: 'festivalOutcome',
  label: 'Festival outcomes & rewards',
  dependsOn: ['boxOffice'],
  onTick: (state) => {
    const projects = [...(state.projects || []), ...((state.aiStudioProjects as any) || []), ...((state.allReleases || []) as any[])];

    let studioDeltaRep = 0;
    const studioAwards: StudioAward[] = [];
    const updatedById = new Map<string, Project>();

    for (const p of projects) {
      if (!p || !p.metrics) continue;
      if (!p.metrics.festivalProcessed) continue;
      if (p.metrics.festivalReputationGranted) continue;

      const outcome = String(p.metrics.festivalOutcome || '').toLowerCase();
      const festivalId = String(p.metrics.festivalId || (p.releaseStrategy as any)?.festivalId || '');
      const festivalDef = getFestivalById(festivalId) || { name: festivalId || 'Festival', prestige: 60 };

      let repBoost = 0;
      let awardPrestige = 3;
      if (outcome === 'sweep') {
        repBoost = 10;
        awardPrestige = 9;
      } else if (outcome === 'hit') {
        repBoost = 6;
        awardPrestige = 7;
      } else if (outcome === 'well-received') {
        repBoost = 3;
        awardPrestige = 5;
      }

      // Scale by festival prestige modestly
      const festivalPrestige = (festivalDef.prestige || 60);
      repBoost += Math.max(0, Math.floor((festivalPrestige - 60) / 15));

      if (repBoost > 0) {
        studioDeltaRep += repBoost;

        const award: StudioAward = {
          id: `festival-laurel-${p.id}`,
          projectId: p.id,
          projectTitle: p.title,
          category: `${festivalDef.name} ${p.metrics.festivalOutcome}`,
          ceremony: festivalDef.name,
          year: p.releaseYear || (p.scheduledReleaseYear || new Date().getUTCFullYear()),
          prestige: Math.min(10, awardPrestige),
          reputationBoost: repBoost,
        };

        studioAwards.push(award);
      }

      updatedById.set(p.id, {
        ...p,
        metrics: {
          ...(p.metrics || {}),
          festivalReputationGranted: true,
        },
      });
    }

    if (updatedById.size === 0 && studioDeltaRep === 0 && studioAwards.length === 0) return state;

    const patchProject = (v: any) => {
      if (!v || typeof v !== 'object' || typeof v.id !== 'string') return v;
      return updatedById.get(v.id) || v;
    };

    const nextProjects = (state.projects || []).map(patchProject);
    const nextAi = ((state.aiStudioProjects as any) || []).map((p: any) => patchProject(p));
    const nextAllReleases = (state.allReleases || []).map((p: any) => patchProject(p));

    const studio0 = state.studio;

    const nextStudio = studio0
      ? {
          ...studio0,
          reputation: Math.max(0, (studio0.reputation || 0) + studioDeltaRep),
          awards: [...(studio0.awards || []), ...studioAwards],
        }
      : studio0;

    return {
      ...state,
      projects: nextProjects,
      aiStudioProjects: nextAi as any,
      allReleases: nextAllReleases,
      studio: nextStudio,
    } as GameState;
  },
};
