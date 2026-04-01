import { describe, expect, it } from 'vitest';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';

describe('core talent biographies (handcrafted)', () => {
  it('has explicit (non-template) biography text for every marquee core talent entry', () => {
    const marquee = CORE_TALENT_BIBLE.filter((t) => t.tier === 'marquee');
    expect(marquee.length).toBeGreaterThan(0);

    for (const t of marquee) {
      expect(typeof t.biography).toBe('string');
      expect((t.biography || '').trim().length).toBeGreaterThan(0);

      // The procedural fallback uses this phrase; marquees should not be using that format.
      expect(t.biography || '').not.toContain('Industry shorthand:');
    }
  });

  it('has explicit (non-template) biography text for every notable core talent entry', () => {
    const notable = CORE_TALENT_BIBLE.filter((t) => t.tier === 'notable');
    expect(notable.length).toBeGreaterThan(0);

    for (const t of notable) {
      expect(typeof t.biography).toBe('string');
      expect((t.biography || '').trim().length).toBeGreaterThan(0);

      // The procedural fallback uses this phrase.
      expect(t.biography || '').not.toContain('Industry shorthand:');
    }
  });

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
