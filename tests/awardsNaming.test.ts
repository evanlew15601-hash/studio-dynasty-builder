import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { ensureGameStateFictionalAwardNames, normalizeAwardCeremonyName, normalizeAwardNameText } from '@/utils/awardsNaming';

describe('awardsNaming', () => {
  it('normalizes award show ceremony names', () => {
    expect(normalizeAwardCeremonyName('Oscar')).toBe('Crown');
    expect(normalizeAwardCeremonyName('Golden Globe')).toBe('Crystal Ring');
    expect(normalizeAwardCeremonyName('Critics Choice')).toBe('Critics Circle');
    expect(normalizeAwardCeremonyName('Emmy')).toBe('Beacon TV');
    expect(normalizeAwardCeremonyName('Other')).toBe('Other');
  });

  it('normalizes award text strings', () => {
    expect(normalizeAwardNameText('Oscar - Best Picture')).toBe('Crown - Best Picture');
    expect(normalizeAwardNameText('Golden Globe - Best Film')).toBe('Crystal Ring - Best Film');
    expect(normalizeAwardNameText('Academy Award for Best Picture')).toBe('Crown Award for Best Picture');
  });

  it('patches a loaded game state to remove real-world award names', () => {
    const gs: any = {
      studio: {
        id: 'studio-1',
        name: 'Test Studio',
        reputation: 50,
        budget: 0,
        founded: 2020,
        specialties: [],
        awards: [{ id: 'a1', projectId: 'p1', category: 'Best Picture', ceremony: 'Oscar', year: 2024, prestige: 10, reputationBoost: 5 }],
      },
      currentYear: 2024,
      currentWeek: 10,
      currentQuarter: 1,
      projects: [
        {
          id: 'p1',
          title: 'Film',
          script: { id: 's1', title: 'Film', genre: 'drama', logline: 'x', writer: 'x', pages: 90, quality: 50, budget: 100, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' } },
          type: 'feature',
          currentPhase: 'release',
          budget: { total: 100, allocated: {}, spent: {}, overages: {} },
          cast: [],
          crew: [],
          timeline: {},
          locations: [],
          distributionStrategy: { primary: { platform: 'Theaters', type: 'theatrical', revenue: { type: 'box-office', studioShare: 0.5 } }, international: [], windows: [], marketingBudget: 0 },
          status: 'released',
          metrics: { awards: ['Golden Globe - Best Film'] },
          phaseDuration: 0,
          contractedTalent: [],
          developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
        },
      ],
      talent: [
        {
          id: 't1',
          name: 'Actor',
          type: 'actor',
          age: 30,
          reputation: 50,
          marketValue: 1,
          genres: [],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          awards: [{ id: 'ta1', talentId: 't1', projectId: 'p1', category: 'Best Actor', ceremony: 'Academy Awards', year: 2024, prestige: 10, reputationBoost: 2 }],
        },
      ],
      scripts: [],
      competitorStudios: [],
      marketConditions: {},
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [{ id: 'e1', name: 'Oscar - Best Picture', ceremony: 'Oscar', category: 'Best Picture', eligibilityWeek: 4, ceremonyWeek: 10, year: 2024, prestige: 10, eligibleProjects: [], qualityThreshold: 0 }],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
    };

    const patched = ensureGameStateFictionalAwardNames(gs as unknown as GameState);

    expect(patched.studio.awards?.[0].ceremony).toBe('Crown');
    expect(patched.projects[0].metrics.awards?.[0]).toBe('Crystal Ring - Best Film');
    expect(patched.talent[0].awards?.[0].ceremony).toBe('Crown');
    expect((patched.awardsCalendar as any)[0].ceremony).toBe('Crown');
    expect((patched.awardsCalendar as any)[0].name).toBe('Crown - Best Picture');
  });
});
