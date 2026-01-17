import type { Project, ProductionPhase } from '@/types/game';

/**
 * Utility helpers for reasoning about project phases and statuses.
 * This centralizes the mapping between currentPhase and allowed status values
 * so systems can share a single source of truth.
 */

export type ProjectStatus = Project['status'];

export type ProjectKind = 'film' | 'tv';

/**
 * Infer whether a project is primarily treated as film or TV for state purposes.
 */
export function inferProjectKind(project: Project): ProjectKind {
  if (project.type === 'series' || project.type === 'limited-series') {
    return 'tv';
  }
  return 'film';
}

/**
 * Allowed statuses for each production phase.
 * This mirrors and centralizes the logic previously embedded in SystemIntegration.
 */
export function getAllowedStatusesForPhase(phase: ProductionPhase): ProjectStatus[] {
  switch (phase) {
    case 'development':
      return ['development'];
    case 'pre-production':
      return ['pre-production'];
    case 'production':
      return ['production', 'filming'];
    case 'post-production':
      return ['post-production', 'completed', 'ready-for-marketing'];
    case 'marketing':
      return ['marketing', 'ready-for-marketing', 'ready-for-release'];
    case 'release':
      return ['release', 'ready-for-release', 'scheduled-for-release', 'released'];
    case 'distribution':
      return ['distribution', 'released', 'archived'];
    default:
      // Fallback: allow the phase name itself as a status
      return [phase as ProjectStatus];
  }
}

/**
 * Simple validation helper to check if a project's current phase/status
 * combination is internally consistent.
 */
export function isPhaseStatusCombinationValid(project: Project): boolean {
  if (!project.currentPhase || !project.status) {
    return true;
  }
  const allowed = getAllowedStatusesForPhase(project.currentPhase);
  return allowed.includes(project.status);
}

/**
 * Advance a project through its core lifecycle in a conservative way.
 * This is not meant to cover every action in the game, but to provide
 * a shared helper for common transitions.
 */
export type ProjectAction =
  | 'advancePhase'          // complete current phase and move to the next logical one
  | 'markReadyForMarketing' // post-production finished and ready to move into marketing
  | 'startMarketing'        // explicitly move into marketing
  | 'markReadyForRelease'   // marketing complete and ready to schedule release
  | 'scheduleRelease'       // schedule an actual release week/year
  | 'premiere'              // move into released state
  | 'archive';              // mark project as archived after long tail completes

export interface AdvanceContext {
  currentWeek: number;
  currentYear: number;
}

/**
 * Core project state transition helper.
 * Returns a new project object with updated phase/status and optional fields.
 */
export function advanceProjectState(
  project: Project,
  action: ProjectAction,
  context?: AdvanceContext
): Project {
  const kind = inferProjectKind(project);

  switch (action) {
    case 'advancePhase': {
      // Basic automatic progression for films; TV is largely manual.
      if (kind === 'film') {
        if (project.currentPhase === 'development') {
          return {
            ...project,
            currentPhase: 'pre-production',
            status: 'pre-production',
          };
        }
        if (project.currentPhase === 'pre-production') {
          return {
            ...project,
            currentPhase: 'production',
            status: 'production',
          };
        }
        if (project.currentPhase === 'production') {
          return {
            ...project,
            currentPhase: 'post-production',
            status: 'post-production',
          };
        }
        if (project.currentPhase === 'post-production') {
          // Hand off to marketing systems rather than skipping ahead
          return {
            ...project,
            currentPhase: 'post-production',
            status: 'ready-for-marketing',
            readyForMarketing: true,
          };
        }
      }
      // Default: no-op
      return project;
    }

    case 'markReadyForMarketing': {
      return {
        ...project,
        currentPhase: 'post-production',
        status: 'ready-for-marketing',
        readyForMarketing: true,
      };
    }

    case 'startMarketing': {
      return {
        ...project,
        currentPhase: 'marketing',
        status: 'marketing',
        readyForMarketing: false,
      };
    }

    case 'markReadyForRelease': {
      return {
        ...project,
        currentPhase: 'release',
        status: 'ready-for-release',
        readyForRelease: true,
      };
    }

    case 'scheduleRelease': {
      // ScheduleRelease is expected to set releaseWeek/Year upstream; this helper
      // just enforces the phase/status pairing and disables auto-phase advancement.
      return {
        ...project,
        currentPhase: 'release',
        status: 'scheduled-for-release',
        readyForRelease: false,
        phaseDuration: -1,
      };
    }

    case 'premiere': {
      return {
        ...project,
        currentPhase: 'release',
        status: 'released',
        readyForRelease: false,
        metrics: {
          ...project.metrics,
          inTheaters: kind === 'film' ? true : project.metrics?.inTheaters,
          weeksSinceRelease: project.metrics?.weeksSinceRelease ?? 0,
        },
      };
    }

    case 'archive': {
      return {
        ...project,
        currentPhase: 'distribution',
        status: 'archived',
      };
    }

    default:
      return project;
  }
}