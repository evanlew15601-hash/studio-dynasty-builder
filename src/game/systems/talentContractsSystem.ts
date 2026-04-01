import type { GameState, Project, TalentPerson } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';
import type { TickSystem } from '../core/types';

function sumActiveContracts(state: GameState): Set<string> {
  const out = new Set<string>();
  for (const p of state.projects || []) {
    for (const ct of p?.contractedTalent || []) {
      if (!ct?.talentId) continue;
      const wr = typeof ct.weeksRemaining === 'number' ? ct.weeksRemaining : ct.contractWeeks;
      if ((wr ?? 0) > 0) out.add(ct.talentId);
    }
  }
  return out;
}

export const TalentContractsSystem: TickSystem = {
  id: 'talentContracts',
  label: 'Talent contracts',
  dependsOn: ['projectLifecycle'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const projects0 = state.projects || [];
    if (projects0.length === 0) return state;

    let payroll = 0;
    let projectsChanged = false;

    const updatedById = new Map<string, Project>();

    const nextProjects = projects0.map((p0) => {
      if (!p0) return p0;
      const contracted0 = p0.contractedTalent || [];
      if (contracted0.length === 0) return p0;

      let changed = false;
      const nextContracted = contracted0
        .map((ct0) => {
          if (!ct0) return ct0 as any;

          const wr0 = typeof ct0.weeksRemaining === 'number' ? ct0.weeksRemaining : ct0.contractWeeks;
          const wr = Math.max(0, Math.floor(wr0 ?? 0));

          if (wr <= 0) {
            changed = true;
            return null;
          }

          payroll += Math.max(0, ct0.weeklyPay ?? 0);

          const nextWr = Math.max(0, wr - 1);

          if (nextWr <= 0) {
            changed = true;
            return null;
          }

          if (nextWr !== ct0.weeksRemaining) {
            changed = true;
            return { ...ct0, weeksRemaining: nextWr };
          }

          return ct0;
        })
        .filter(Boolean) as any;

      if (!changed) return p0;
      projectsChanged = true;
      const next = { ...p0, contractedTalent: nextContracted };
      updatedById.set(p0.id, next);
      return next;
    });

    const studio0 = state.studio;
    const budget0 = studio0.budget ?? 0;
    const debt0 = studio0.debt ?? 0;

    let nextBudget = budget0 - payroll;
    let nextDebt = debt0;

    if (nextBudget < 0) {
      nextDebt += -nextBudget;
      nextBudget = 0;
    }

    // Normalize talent contractStatus based on whether they appear in any contractedTalent list.
    const activeContractIds = sumActiveContracts({ ...state, projects: nextProjects } as GameState);

    let talentChanged = false;
    const nextTalent = (state.talent || []).map((t0): TalentPerson => {
      if (!t0) return t0 as any;
      if (t0.contractStatus === 'retired') return t0;

      const hasContract = activeContractIds.has(t0.id);

      // If a contract ended while they were 'busy' with base='contracted', clear the base.
      if (!hasContract && t0.contractStatus === 'busy' && t0.contractStatusBase === 'contracted') {
        talentChanged = true;
        return { ...t0, contractStatusBase: 'available' };
      }

      // Don't override exclusive deals.
      if (t0.contractStatus === 'exclusive') {
        if (hasContract && t0.contractStatusBase !== 'exclusive') {
          // Keep base clean; exclusives already represent a contract.
        }
        return t0;
      }

      if (hasContract) {
        if (t0.contractStatus === 'available') {
          talentChanged = true;
          return { ...t0, contractStatus: 'contracted' };
        }
        if (t0.contractStatus === 'busy' && !t0.contractStatusBase) {
          talentChanged = true;
          return { ...t0, contractStatusBase: 'contracted' };
        }
        return t0;
      }

      if (t0.contractStatus === 'contracted') {
        talentChanged = true;
        return { ...t0, contractStatus: 'available' };
      }

      return t0;
    });

    const studioChanged = payroll !== 0 && (nextBudget !== budget0 || nextDebt !== debt0);

    if (!projectsChanged && !talentChanged && !studioChanged) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...state,
      projects: projectsChanged ? nextProjects : state.projects,
      aiStudioProjects: projectsChanged ? ((state.aiStudioProjects as any) || []).map(patch) : state.aiStudioProjects,
      allReleases: projectsChanged ? (state.allReleases || []).map(patch) : state.allReleases,
      talent: talentChanged ? nextTalent : state.talent,
      studio: studioChanged
        ? {
            ...studio0,
            budget: nextBudget,
            debt: nextDebt,
          }
        : studio0,
    } as GameState;
  },
};
