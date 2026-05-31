import { describe, expect, it } from 'vitest';
import { generateInitialTalentPool } from '@/data/WorldGenerator';

describe('world generator (core universe)', () => {
  it('includes a large core roster with seeded history + relationships', () => {
    const pool = generateInitialTalentPool({ currentYear: 2026 });

    // Cornellverse defaults to core-only (no procedural filler).
    expect(pool.some((t) => t.isNotable === false)).toBe(false);

    // Core roster should be substantial.
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

  it('includes handcrafted young core actors with lore in the 2026 starting pool', () => {
    const pool = generateInitialTalentPool({ currentYear: 2026, actorCount: 0, directorCount: 0 });
    const youngCoreNames = ['Nia Park', 'Malik Baptiste', 'Sofía Marín', 'Aisha Okonkwo', 'Meilin Zhou', 'Noah Sato'];

    for (const name of youngCoreNames) {
      const actor = pool.find((t) => t.name === name);
      expect(actor, `${name} should be in the core starting pool`).toBeTruthy();
      expect(actor!.type).toBe('actor');
      expect(actor!.isNotable).toBe(true);
      expect(actor!.age).toBeGreaterThanOrEqual(20);
      expect(actor!.age).toBeLessThanOrEqual(30);
      expect((actor!.biography || '').trim().length).toBeGreaterThan(120);
      expect(actor!.archetype).toBeTruthy();
      expect(actor!.narratives?.length || 0).toBeGreaterThan(0);
      expect(actor!.movementTags?.length || 0).toBeGreaterThan(0);
    }
  });

});
