import { describe, expect, it } from 'vitest';
import { buildTalentSkills } from '@/utils/talentSkills';
import type { ActingSkills, DirectingSkills } from '@/types/game';

describe('talent skill profiles', () => {
  it('gives actors strengths that match their genres and identity', () => {
    const shared = { reputation: 55, experience: 8, genres: ['comedy'] as const };
    const comedian = buildTalentSkills('actor', {
      ...shared,
      archetype: 'Comedy lead with real heart',
      traits: ['Charismatic', 'Collaborative'],
    }, 'comedian') as ActingSkills;
    const actionActor = buildTalentSkills('actor', {
      reputation: 55,
      experience: 8,
      genres: ['action'],
      archetype: 'Physical performer and former athlete',
      traits: ['Physical Performer'],
    }, 'action-actor') as ActingSkills;

    expect(comedian.comedicTiming).toBeGreaterThan(comedian.subtlety);
    expect(comedian.improvisation).toBeGreaterThan(comedian.physicality);
    expect(actionActor.physicality).toBeGreaterThan(actionActor.comedicTiming);
  });

  it('gives directors different creative and operational strengths', () => {
    const shared = { reputation: 60, experience: 10, genres: ['drama'] as const };
    const disciplined = buildTalentSkills('director', {
      ...shared,
      archetype: 'Prestige director with legendary discipline',
      directingStyle: 'Actor\'s Director',
      temperament: 'Practical Problem-Solver',
      budgetApproach: 'Fiscally Responsible',
    }, 'disciplined') as DirectingSkills;
    const auteur = buildTalentSkills('director', {
      ...shared,
      archetype: 'Visionary but undisciplined auteur',
      directingStyle: 'Experimental',
      temperament: 'Visionary Dreamer',
      budgetApproach: 'Creative Over Cost',
    }, 'auteur') as DirectingSkills;

    expect(disciplined.productionManagement).toBeGreaterThan(auteur.productionManagement);
    expect(disciplined.budgetDiscipline).toBeGreaterThan(auteur.budgetDiscipline);
    expect(auteur.visualStorytelling).toBeGreaterThan(disciplined.productionManagement);
  });
});
