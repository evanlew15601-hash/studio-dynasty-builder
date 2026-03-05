/**
 * Command types — player actions dispatched to the engine.
 *
 * UI never calls system code directly; it dispatches commands.
 * Commands are validated, then applied to state.
 */

import type { GameState, Genre, Project, Script, Studio, TalentPerson } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import type { Command, CommandType } from '../core/types';

// ---------------------------------------------------------------------------
// Command payloads
// ---------------------------------------------------------------------------

export interface AdvanceWeekPayload {
  suppressRecap?: boolean;
}

export interface CreateProjectPayload {
  script: Script;
  overrides?: Partial<Project>;
}

export interface UpdateProjectPayload {
  projectId: string;
  updates: Partial<Project>;
  marketingCost?: number;
}

export interface UpdateStudioPayload {
  updates: Partial<Studio>;
}

export interface SignTalentPayload {
  talentId: string;
  projectId: string;
  role: string;
  salary: number;
}

export interface SaveGamePayload {
  slotId: string;
  note?: string;
  currentPhase?: string;
  unlockedAchievementIds?: string[];
}

export interface LoadGamePayload {
  slotId: string;
}

export interface ApplyModsPayload {
  modBundle: ModBundle;
}

// ---------------------------------------------------------------------------
// Command factory helpers
// ---------------------------------------------------------------------------

export function createCommand<T extends CommandType, P>(type: T, payload: P): Command<T, P> {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}

export const Commands = {
  advanceWeek: (payload?: AdvanceWeekPayload) =>
    createCommand('ADVANCE_WEEK', payload ?? {}),

  createProject: (script: Script, overrides?: Partial<Project>) =>
    createCommand('CREATE_PROJECT', { script, overrides } as CreateProjectPayload),

  updateProject: (projectId: string, updates: Partial<Project>, marketingCost?: number) =>
    createCommand('UPDATE_PROJECT', { projectId, updates, marketingCost } as UpdateProjectPayload),

  updateStudio: (updates: Partial<Studio>) =>
    createCommand('UPDATE_STUDIO', { updates } as UpdateStudioPayload),

  saveGame: (slotId: string, options?: Omit<SaveGamePayload, 'slotId'>) =>
    createCommand('SAVE_GAME', { slotId, ...options } as SaveGamePayload),

  loadGame: (slotId: string) =>
    createCommand('LOAD_GAME', { slotId } as LoadGamePayload),

  applyMods: (modBundle: ModBundle) =>
    createCommand('APPLY_MODS', { modBundle } as ApplyModsPayload),
} as const;
