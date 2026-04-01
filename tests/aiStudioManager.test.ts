import { beforeEach, describe, expect, it } from 'vitest';
import { AIStudioManager } from '@/components/game/AIStudioManager';
import { FinancialEngine } from '@/components/game/FinancialEngine';
import { createRng } from '@/game/core/rng';

beforeEach(() => {
  AIStudioManager.resetAISystem();
  FinancialEngine.clearAll();
});

describe('AIStudioManager', () => {
  it('creates AI films with cast + talent commitments when talent is provided', () => {
    const studio = {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 75,
      budget: 50_000_000,
      founded: 2020,
      specialties: ['drama'],
    } as any;

    const talent = [
      { id: 'dir-1', name: 'Director One', type: 'director', reputation: 80 } as any,
      { id: 'act-1', name: 'Actor One', type: 'actor', reputation: 60 } as any,
      { id: 'act-2', name: 'Actor Two', type: 'actor', reputation: 55 } as any,
      { id: 'act-3', name: 'Actor Three', type: 'actor', reputation: 50 } as any,
    ];

    const film = AIStudioManager.createAIFilm(studio, 10, 2024, talent as any, createRng(1));

    expect(film.cast.length).toBeGreaterThanOrEqual(2);

    const commitments = AIStudioManager.getAllCommitments();
    expect(commitments.length).toBe(film.cast.length);
    expect(commitments.every(c => !!c.talentName)).toBe(true);
  });

  it('tracks commitments across year boundaries (week 52 -> next year)', () => {
    const studio = {
      id: 'studio-2',
      name: 'Year Boundary Studio',
      reputation: 75,
      budget: 50_000_000,
      founded: 2020,
      specialties: ['action'],
    } as any;

    const director = { id: 'dir-2', name: 'Director Two', type: 'director', reputation: 80 } as any;
    const actor = { id: 'act-4', name: 'Actor Four', type: 'actor', reputation: 60 } as any;

    AIStudioManager.createAIFilm(studio, 52, 2024, [director, actor] as any, createRng(2));

    const directorCommitment = AIStudioManager.getTalentCommitment('dir-2', 2, 2025);
    expect(directorCommitment).not.toBeNull();

    expect(AIStudioManager.isTalentAvailable('dir-2', 2, 4, 2025)).toBe(false);
  });

  it('releases marketing films even if the game has advanced beyond the expected year', () => {
    const studio = {
      id: 'studio-3',
      name: 'Release Studio',
      reputation: 75,
      budget: 50_000_000,
      founded: 2020,
      specialties: ['sci-fi'],
    } as any;

    const film = AIStudioManager.createAIFilm(studio, 1, 2024, [] as any, createRng(3));
    film.status = 'marketing';
    film.timeline.expectedReleaseWeek = 10;
    film.timeline.expectedReleaseYear = 2025;

    AIStudioManager.processWeeklyAIFilms(1, 2026, createRng(4));

    const updated = AIStudioManager.getAllAIFilms().find(f => f.id === film.id);
    expect(updated?.status).toBe('released');
  });
});
