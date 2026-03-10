import { describe, expect, it } from 'vitest';
import { STUDIO_PROFILES } from '@/data/StudioGenerator';

describe('Studio profiles lore', () => {
  it('has handcrafted (non-empty) biography text for every base studio profile', () => {
    for (const s of STUDIO_PROFILES) {
      expect(typeof s.biography).toBe('string');
      expect((s.biography || '').trim().length).toBeGreaterThan(40);
    }
  });

  it('avoids overly recent founding years in base studio profiles', () => {
    for (const s of STUDIO_PROFILES) {
      expect(typeof s.foundedYear).toBe('number');
      expect(s.foundedYear).toBeGreaterThan(1800);
      expect(s.foundedYear).toBeLessThan(2010);
    }
  });
});
