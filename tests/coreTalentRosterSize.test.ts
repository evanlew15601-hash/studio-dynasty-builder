import { describe, expect, it } from 'vitest';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';
import { generateInitialTalentPool } from '@/data/WorldGenerator';

describe('core talent roster sizing (cornellverse)', () => {
  it('meets target bible counts (150 actors / 40 directors)', () => {
    const actors = CORE_TALENT_BIBLE.filter((t) => t.type === 'actor');
    const directors = CORE_TALENT_BIBLE.filter((t) => t.type === 'director');

    expect(actors.length).toBeGreaterThanOrEqual(150);
    expect(directors.length).toBeGreaterThanOrEqual(40);
  });

  it('meets target active pool counts by 2026', () => {
    const pool = generateInitialTalentPool({ currentYear: 2026 });
    const actors = pool.filter((t) => t.type === 'actor');
    const directors = pool.filter((t) => t.type === 'director');

    expect(actors.length).toBeGreaterThanOrEqual(150);
    expect(directors.length).toBeGreaterThanOrEqual(40);
  });
});
