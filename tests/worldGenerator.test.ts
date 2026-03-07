import { describe, expect, it } from 'vitest';
import { generateInitialTalentPool } from '@/data/WorldGenerator';

describe('world generator (core universe)', () => {
  it('includes a large core roster with seeded history + relationships', () => {
    const pool = generateInitialTalentPool({ currentYear: 2026, actorCount: 5, directorCount: 2 });

    // Core roster should be substantial even with tiny filler.
    expect(pool.length).toBeGreaterThanOrEqual(110);

    const eleanor = pool.find((t) => t.name === 'Eleanor Vale');
    const jonah = pool.find((t) => t.name === 'Jonah Pike');

    expect(eleanor).toBeTruthy();
    expect(jonah).toBeTruthy();

    expect(eleanor?.isNotable).toBe(true);
    expect(eleanor?.filmography && eleanor.filmography.length).toBeGreaterThan(0);
    expect(eleanor?.awards && eleanor.awards.length).toBeGreaterThan(0);

    // Relationship web is wired by id.
    expect(eleanor?.relationships?.[jonah!.id]).toBe('rivals');
    expect(typeof eleanor?.relationshipNotes?.[jonah!.id]).toBe('string');

    // Chemistry is derived from relationship type (negative for rivals)
    expect((eleanor?.chemistry?.[jonah!.id] ?? 0)).toBeLessThan(0);
  });
});
