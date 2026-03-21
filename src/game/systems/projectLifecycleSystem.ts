import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { importRolesForScript } from '@/utils/roleImport';
import { isDirectorRole } from '@/utils/scriptRoles';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function getPhaseWeeks(phase: string): number {
  switch (phase) {
    case 'development':
      return 8;
    case 'pre-production':
      return 6;
    case 'production':
      return 12;
    case 'post-production':
      return 16;
    case 'marketing':
      return 8;
    case 'release':
      return 2;
    case 'distribution':
      return 8;
    default:
      return 1;
  }
}

function getNextPhase(currentPhase: string): string {
  switch (currentPhase) {
    case 'development':
      return 'pre-production';
    case 'pre-production':
      return 'production';
    case 'production':
      return 'post-production';
    case 'post-production':
      return 'marketing';
    case 'marketing':
      return 'release';
    case 'release':
      return 'distribution';
    default:
      return currentPhase;
  }
}

export const ProjectLifecycleSystem: TickSystem = {
  id: 'projectLifecycle',
  label: 'Project lifecycle',
  onTick: (state, ctx) => {
    const projects = state.projects || [];

    let changed = false;

    const nextProjects = projects.map((p0) => {
      if (!isProjectLike(p0)) return p0;

      let p: Project = p0;

      // Development progress (deterministic; no RNG)
      if (p.currentPhase === 'development' && p.developmentProgress) {
        const progress = p.developmentProgress;

        let weeklyIncrease = 5;
        if ((p.cast || []).length > 0) weeklyIncrease += 3;

        const hasDirector = (p.crew || []).some((c) => {
          const t = (state.talent || []).find((tt) => tt.id === c.talentId);
          return t?.type === 'director';
        });
        if (hasDirector) weeklyIncrease += 5;

        const newProgress = {
          ...progress,
          scriptCompletion: Math.min(100, (progress.scriptCompletion || 0) + weeklyIncrease),
          budgetApproval:
            (p.cast || []).length > 0
              ? Math.min(100, (progress.budgetApproval || 0) + weeklyIncrease)
              : progress.budgetApproval,
          talentAttached:
            (p.cast || []).length > 0
              ? Math.min(100, (progress.talentAttached || 0) + 10)
              : progress.talentAttached,
          locationSecured: Math.min(100, (progress.locationSecured || 0) + weeklyIncrease),
        };

        p = { ...p, developmentProgress: newProgress };
        changed = true;
      }

      // Countdown-based phases are engine-owned now.
      // Skip marketing: MarketingCampaignSystem owns that countdown + transitions.
      if (p.currentPhase === 'marketing') return p;

      // Only these phases count down automatically.
      if (!['development', 'pre-production', 'production', 'post-production'].includes(p.currentPhase as string)) return p;

      const phaseDuration0 = typeof p.phaseDuration === 'number' ? p.phaseDuration : undefined;
      if (typeof phaseDuration0 !== 'number' || phaseDuration0 <= 0) return p;

      const newPhaseDuration = phaseDuration0 - 1;

      if (newPhaseDuration > 0) {
        p = { ...p, phaseDuration: newPhaseDuration };
        changed = true;
        return p;
      }

      // Phase timer hit zero.
      const nextPhase = getNextPhase(p.currentPhase);

      // Stop auto-progression at post-production: wait for manual marketing campaign.
      if (p.currentPhase === 'post-production') {
        p = {
          ...p,
          phaseDuration: 0,
          status: 'ready-for-marketing' as any,
          readyForMarketing: true,
        };
        changed = true;

        ctx.recap.push({
          type: 'system',
          title: 'Post-production complete',
          body: `“${p.title}” is ready for a marketing campaign.`,
          severity: 'info',
          relatedIds: { projectId: p.id },
        });

        return p;
      }

      // Gate: roles must exist before leaving development.
      if (p.currentPhase === 'development' && nextPhase === 'pre-production') {
        const chars0 = p.script?.characters || [];
        const chars = chars0.length > 0 ? chars0 : importRolesForScript(p.script, state);

        if (!chars || chars.length === 0) {
          p = { ...p, phaseDuration: 2 };
          changed = true;
          return p;
        }

        p = {
          ...p,
          script: { ...p.script, characters: chars },
          currentPhase: nextPhase as any,
          phaseDuration: getPhaseWeeks(nextPhase),
          status: nextPhase as any,
        };
        changed = true;
        return p;
      }

      // Gate: require Director + Lead actor before entering production.
      if (p.currentPhase === 'pre-production' && nextPhase === 'production') {
        const chars = p.script?.characters || [];
        const hasDirector = chars.some((c) => isDirectorRole(c) && !!c.assignedTalentId);
        const hasLead = chars.some((c) => c.importance === 'lead' && !isDirectorRole(c) && !!c.assignedTalentId);

        if (!hasDirector || !hasLead) {
          p = { ...p, phaseDuration: 2 };
          changed = true;
          return p;
        }
      }

      // Default: advance to next phase.
      p = {
        ...p,
        currentPhase: nextPhase as any,
        phaseDuration: getPhaseWeeks(nextPhase),
        status: nextPhase as any,
      };
      changed = true;

      return p;
    });

    if (!changed) return state;

    return {
      ...(state as GameState),
      projects: nextProjects as Project[],
    };
  },
};
