import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { ensureTalentLore } from '@/utils/talentLorePatches';

describe('ensureTalentLore', () => {
  it('fills missing biographies deterministically', () => {
    const t: TalentPerson = {
      id: 't:missing-bio',
      name: 'Test Actor',
      type: 'actor',
      age: 31,
      experience: 7,
      reputation: 66,
      marketValue: 1_500_000,
      genres: ['drama', 'thriller'],
      contractStatus: 'available',
      availability: { start: new Date('2026-01-01'), end: new Date('2027-01-01') },
    };

    const gs = {
      currentYear: 2026,
      currentWeek: 1,
      talent: [t],
    } as unknown as GameState;

    const patchedA = ensureTalentLore(gs);
    const patchedB = ensureTalentLore(gs);

    expect((patchedA.talent[0].biography || '').trim().length).toBeGreaterThan(0);
    expect(patchedA.talent[0].biography).toEqual(patchedB.talent[0].biography);
  });

  it('does not overwrite existing biographies', () => {
    const t: TalentPerson = {
      id: 't:has-bio',
      name: 'Test Director',
      type: 'director',
      age: 46,
      experience: 20,
      reputation: 88,
      marketValue: 8_000_000,
      genres: ['action'],
      contractStatus: 'available',
      availability: { start: new Date('2026-01-01'), end: new Date('2027-01-01') },
      biography: 'Custom biography stays.',
    };

    const gs = {
      currentYear: 2026,
      currentWeek: 1,
      talent: [t],
    } as unknown as GameState;

    const patched = ensureTalentLore(gs);
    expect(patched.talent[0].biography).toBe('Custom biography stays.');
  });

  it('backfills canonical pre-game awards for core talent in older saves', () => {
    const t: TalentPerson = {
      id: 'core:eleanor-vale',
      name: 'Eleanor Vale',
      type: 'actor',
      age: 60,
      experience: 30,
      reputation: 84,
      marketValue: 10_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date('2050-01-01'), end: new Date('2051-01-01') },
      awards: [],
    };

    const gs = {
      currentYear: 2050,
      currentWeek: 1,
      talent: [t],
    } as unknown as GameState;

    const patched = ensureTalentLore(gs);
    const awards = patched.talent[0].awards || [];

    expect(awards.length).toBe(3);
    expect(awards.some((a) => a.ceremony === 'Crown' && a.category === 'Best Actress' && a.year === 2008)).toBe(true);
  });
});
