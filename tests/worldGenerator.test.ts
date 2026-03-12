import { describe, expect, it } from 'vitest';
import { generateInitialTalentPool, generateInitialTalentPoolAsync } from '@/data/WorldGenerator';

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

  it('generateInitialTalentPoolAsync matches the synchronous generator', async () => {
    const sync = generateInitialTalentPool({ currentYear: 2026 });
    const asyncPool = await generateInitialTalentPoolAsync({ currentYear: 2026, yieldEvery: 25 });
    expect(asyncPool).toEqual(sync);
  });
});
