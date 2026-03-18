/**
 * Selectors — derived data from GameState.
 *
 * Used by UI to read specific slices without subscribing to the whole state.
 * Keep these as pure functions; memoization happens at the store/hook level.
 */

import type { GameState, Project, TalentPerson, Studio, Franchise } from '@/types/game';

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export const selectStudio = (s: GameState): Studio => s.studio;
export const selectBudget = (s: GameState): number => s.studio.budget;
export const selectReputation = (s: GameState): number => s.studio.reputation;
export const selectDebt = (s: GameState): number => s.studio.debt ?? 0;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export const selectWeek = (s: GameState): number => s.currentWeek;
export const selectYear = (s: GameState): number => s.currentYear;
export const selectQuarter = (s: GameState): number => s.currentQuarter;
export const selectTimeLabel = (s: GameState): string =>
  `Week ${s.currentWeek}, ${s.currentYear}`;

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const selectProjects = (s: GameState): Project[] => s.projects;
export const selectActiveProjects = (s: GameState): Project[] =>
  s.projects.filter((p) => p.status !== 'archived' && p.status !== 'released');
export const selectReleasedProjects = (s: GameState): Project[] =>
  s.projects.filter((p) => p.status === 'released');
export const selectProjectById = (s: GameState, id: string): Project | undefined =>
  s.projects.find((p) => p.id === id);

// ---------------------------------------------------------------------------
// Talent
// ---------------------------------------------------------------------------

export const selectTalent = (s: GameState): TalentPerson[] => s.talent;
export const selectAvailableTalent = (s: GameState): TalentPerson[] =>
  s.talent.filter((t) => t.contractStatus === 'available');
export const selectDirectors = (s: GameState): TalentPerson[] =>
  s.talent.filter((t) => t.type === 'director');
export const selectActors = (s: GameState): TalentPerson[] =>
  s.talent.filter((t) => t.type === 'actor');

// ---------------------------------------------------------------------------
// Franchises
// ---------------------------------------------------------------------------

export const selectFranchises = (s: GameState): Franchise[] => s.franchises ?? [];
export const selectActiveFranchises = (s: GameState): Franchise[] =>
  (s.franchises ?? []).filter((f) => f.status === 'active');

// ---------------------------------------------------------------------------
// Competitor / AI
// ---------------------------------------------------------------------------

export const selectCompetitorStudios = (s: GameState) => s.competitorStudios;
export const selectAllReleases = (s: GameState) => s.allReleases;

// ---------------------------------------------------------------------------
// Derived counts (cheap)
// ---------------------------------------------------------------------------

export const selectTalentCount = (s: GameState): number => s.talent.length;
export const selectProjectCount = (s: GameState): number => s.projects.length;
export const selectFranchiseCount = (s: GameState): number => (s.franchises ?? []).length;
