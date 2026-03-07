import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { ensureCompetitorStudiosLore } from '@/utils/competitorStudiosPatches';
import { StudioGenerator } from '@/data/StudioGenerator';

describe('competitorStudiosPatches', () => {
  it('patches competitor studio lore fields from current studio profiles', () => {
    const sg = new StudioGenerator();
    const profile = sg.getStudioProfile('Golden Horizon Studios');
    expect(profile).toBeTruthy();

    const gs: any = {
      studio: { id: 'player', name: 'Player Studio', reputation: 50, budget: 0, founded: 2020, specialties: [] },
      currentYear: 2024,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: [],
      scripts: [],
      competitorStudios: [
        {
          id: 'studio-golden-horizon-studios',
          name: 'Golden Horizon Studios',
          reputation: 81,
          budget: 75_000_000,
          founded: 2012,
          specialties: ['family'],
          personality: 'OLD',
          businessTendency: 'OLD',
          brandIdentity: 'OLD',
          riskTolerance: 'conservative',
          releaseFrequency: 5,
        },
      ],
      marketConditions: {},
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
    };

    const patched = ensureCompetitorStudiosLore(gs as unknown as GameState);
    const st = patched.competitorStudios[0];

    expect(st.personality).toBe(profile!.personality);
    expect(st.businessTendency).toBe(profile!.businessTendency);
    expect(st.brandIdentity).toBe(profile!.brandIdentity);
    expect(st.riskTolerance).toBe(profile!.riskTolerance);
    expect(st.releaseFrequency).toBe(profile!.releaseFrequency);
  });
});
