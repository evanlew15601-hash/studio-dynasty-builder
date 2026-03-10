import { describe, expect, it } from 'vitest';
import { generateProceduralDebuts } from '@/data/TalentDebutGenerator';

describe('TalentDebutGenerator (procedural debuts)', () => {
  it('is deterministic for the same year + seed + existing talent', () => {
    const a = generateProceduralDebuts({
      existingTalent: [],
      year: 2027,
      actorCount: 8,
      directorCount: 2,
      seed: 'test-seed',
    });

    const b = generateProceduralDebuts({
      existingTalent: [],
      year: 2027,
      actorCount: 8,
      directorCount: 2,
      seed: 'test-seed',
    });

    expect(a).toEqual(b);
  });

  it('generates unique ids and names within a rookie class', () => {
    const debuts = generateProceduralDebuts({
      existingTalent: [],
      year: 2031,
      actorCount: 12,
      directorCount: 3,
      seed: 'unique-check',
    });

    const ids = new Set(debuts.map((t) => t.id));
    const names = new Set(debuts.map((t) => t.name));

    expect(ids.size).toBe(debuts.length);
    expect(names.size).toBe(debuts.length);

    for (const t of debuts) {
      expect((t.biography || '').trim().length).toBeGreaterThan(0);
    }
  });

  it('differs across different seeds for the same year', () => {
    const a = generateProceduralDebuts({ existingTalent: [], year: 2032, actorCount: 8, directorCount: 2, seed: 'seed-a' });
    const b = generateProceduralDebuts({ existingTalent: [], year: 2032, actorCount: 8, directorCount: 2, seed: 'seed-b' });

    // Across the full rookie class, different seeds should yield a different set of names.
    expect(a.map((t) => t.name)).not.toEqual(b.map((t) => t.name));
  });
});
