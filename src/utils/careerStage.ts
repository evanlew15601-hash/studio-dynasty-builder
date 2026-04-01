import type { TalentPerson } from '@/types/game';

export function determineCareerStage(age: number, experience: number, reputation: number): TalentPerson['careerStage'] {
  // Note: This intentionally matches the existing heuristics used in WorldGenerator/TalentDebutGenerator
  // to preserve determinism across saves.
  if (experience < 2 || reputation < 30) return 'unknown';
  if (experience < 8 && age < 30) return 'rising';
  if (experience < 15 && reputation < 80) return 'established';
  if (experience >= 15 || age > 50) return 'veteran';
  if (reputation > 90 && experience > 20) return 'legend';
  return 'established';
}
