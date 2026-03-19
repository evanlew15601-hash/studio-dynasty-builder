import { describe, expect, it } from 'vitest';
import { PublicDomainGenerator } from '@/data/PublicDomainGenerator';
import type { ModBundle } from '@/types/modding';

describe('Public domain IP modding', () => {
  it('applies publicDomainIP patches by id', () => {
    const base = PublicDomainGenerator.getBasePublicDomainIPs(20).find((p) => p.id === 'pd-1');
    expect(base).toBeTruthy();

    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'publicDomainIP:test:pd-1',
          modId: 'test',
          entityType: 'publicDomainIP',
          op: 'update',
          target: 'pd-1',
          payload: { name: 'Patched Sherlock Holmes', reputationScore: 99 },
        },
      ],
    };

    const patched = PublicDomainGenerator.generateInitialPublicDomainIPs(20, bundle).find((p) => p.id === 'pd-1');
    expect(patched?.name).toBe('Patched Sherlock Holmes');
    expect(patched?.reputationScore).toBe(99);
  });

  it('supports insert and delete patches', () => {
    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'publicDomainIP:test:pd-2',
          modId: 'test',
          entityType: 'publicDomainIP',
          op: 'delete',
          target: 'pd-2',
        },
        {
          id: 'publicDomainIP:test:pd-custom-1',
          modId: 'test',
          entityType: 'publicDomainIP',
          op: 'insert',
          target: 'pd-custom-1',
          payload: {
            id: 'pd-custom-1',
            name: 'Custom PD IP',
            domainType: 'literature',
            dateEnteredDomain: '1900-01-01',
            coreElements: [],
            genreFlexibility: [],
            notableAdaptations: [],
            reputationScore: 10,
            adaptationFatigue: 0,
            culturalRelevance: 10,
            requiredElements: [],
            suggestedCharacters: [],
            cost: 0,
          },
        },
      ],
    };

    const patched = PublicDomainGenerator.generateInitialPublicDomainIPs(20, bundle);
    expect(patched.find((p) => p.id === 'pd-2')).toBeUndefined();
    expect(patched.find((p) => p.id === 'pd-custom-1')?.name).toBe('Custom PD IP');
  });

  it('can override the entire public-domain catalog', () => {
    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'publicDomainCatalog:test',
          modId: 'test',
          entityType: 'publicDomainCatalog',
          op: 'insert',
          payload: [
            {
              id: 'pd-custom-all-1',
              name: 'Override PD 1',
              domainType: 'literature',
              dateEnteredDomain: '1900-01-01',
              coreElements: [],
              genreFlexibility: [],
              notableAdaptations: [],
              reputationScore: 10,
              adaptationFatigue: 0,
              culturalRelevance: 10,
              requiredElements: [],
              suggestedCharacters: [],
              cost: 0,
            },
          ],
        },
      ],
    };

    const patched = PublicDomainGenerator.generateInitialPublicDomainIPs(20, bundle);
    expect(patched).toHaveLength(1);
    expect(patched[0]?.id).toBe('pd-custom-all-1');
  });
});
