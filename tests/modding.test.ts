import { describe, expect, it } from 'vitest';
import type { ModBundle } from '@/types/modding';
import { getProviderProfile } from '@/data/ProviderDealsDatabase';
import { RoleDatabase } from '@/data/RoleDatabase';
import type { Franchise, GameState } from '@/types/game';

function makeEmptyMods(): ModBundle {
  return { version: 1, mods: [], patches: [] };
}

describe('mod patch overlay (Option A)', () => {
  it('overrides a streaming provider field without replacing the default provider list', () => {
    const mods: ModBundle = {
      version: 1,
      mods: [{ id: 'm1', name: 'Provider Tweaks', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'p1',
          modId: 'm1',
          entityType: 'providerDeal',
          op: 'update',
          target: 'netflix',
          payload: { averageRate: 1234567 },
        },
      ],
    };

    const netflix = getProviderProfile('streaming', 'netflix', mods);
    const amazon = getProviderProfile('streaming', 'amazon', mods);

    expect(netflix?.averageRate).toBe(1234567);
    expect(amazon?.averageRate).toBeTruthy();
  });

  it('applies higher-priority mod patches later (wins conflicts)', () => {
    const mods: ModBundle = {
      version: 1,
      mods: [
        { id: 'm1', name: 'Low', version: '1.0.0', enabled: true, priority: 0 },
        { id: 'm2', name: 'High', version: '1.0.0', enabled: true, priority: 10 },
      ],
      patches: [
        { id: 'p1', modId: 'm1', entityType: 'providerDeal', op: 'update', target: 'netflix', payload: { averageRate: 111 } },
        { id: 'p2', modId: 'm2', entityType: 'providerDeal', op: 'update', target: 'netflix', payload: { averageRate: 222 } },
      ],
    };

    expect(getProviderProfile('streaming', 'netflix', mods)?.averageRate).toBe(222);
  });

  it('can replace a franchise role set while still getting director + cameo defaults', () => {
    const franchise: Franchise = {
      id: 'f-1',
      title: 'Space Saga',
      originDate: '2024-01-01',
      creatorStudioId: 'studio-1',
      genre: ['sci-fi'],
      tone: 'epic',
      parodySource: 'Star Wars',
      entries: [],
      status: 'active',
      franchiseTags: [],
      culturalWeight: 50,
      cost: 0,
    };

    const gameState: GameState = {
      studio: {
        id: 'studio-1',
        name: 'Test Studio',
        reputation: 50,
        budget: 1,
        founded: 2000,
        specialties: ['drama'],
      },
      currentYear: 2024,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: [],
      scripts: [],
      competitorStudios: [],
      marketConditions: {
        trendingGenres: ['drama'],
        audiencePreferences: [],
        economicClimate: 'stable',
        technologicalAdvances: [],
        regulatoryChanges: [],
        seasonalTrends: [],
        competitorReleases: [],
      },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [franchise],
      publicDomainIPs: [],
    };

    const mods: ModBundle = {
      version: 1,
      mods: [{ id: 'm1', name: 'Role Set Override', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'p1',
          modId: 'm1',
          entityType: 'franchiseRoleSet',
          op: 'update',
          target: 'Star Wars',
          payload: [{ id: 'lead', name: 'The Chosen One', importance: 'lead', requiredType: 'actor' }],
        },
      ],
    };

    const roles = RoleDatabase.getRolesForSource('franchise', franchise.id, gameState, mods);

    expect(roles.some((r) => r.requiredType === 'director')).toBe(true);
    expect(roles.some((r) => r.importance === 'minor')).toBe(true);
  });

  it('is a no-op with an empty mod bundle', () => {
    const mods = makeEmptyMods();
    const netflix = getProviderProfile('streaming', 'netflix', mods);
    expect(netflix?.id).toBe('netflix');
  });
});
