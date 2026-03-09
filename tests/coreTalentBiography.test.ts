import { describe, expect, it } from 'vitest';
import { generateInitialTalentPool } from '@/data/WorldGenerator';

describe('core talent biographies (handcrafted)', () => {
  it('uses handcrafted biography text when provided in the world bible', () => {
    const pool = generateInitialTalentPool({ currentYear: 2026, actorCount: 0, directorCount: 0 });

    const eleanor = pool.find((t) => t.name === 'Eleanor Vale');
    expect(eleanor).toBeTruthy();

    // The new handcrafted biography should show up in talent profiles (t.biography)
    expect(eleanor!.biography || '').toContain('Eleanor Vale broke out in late-90s prestige cinema');

    // The procedural fallback includes this phrase; handcrafted bios should not.
    expect(eleanor!.biography || '').not.toContain('Industry shorthand:');
  });
});
