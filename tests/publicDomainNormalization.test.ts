import { describe, expect, it } from 'vitest';
import { normalizePublicDomainIPs, normalizePublicDomainState } from '@/utils/publicDomainNormalization';

describe('normalizePublicDomainIPs', () => {
  it('dedupes ids and merges key fields', () => {
    const input = [
      {
        id: 'pd-1',
        name: 'Sherlock Holmes',
        domainType: 'literature',
        dateEnteredDomain: '1900-01-01',
        coreElements: ['Logic'],
        genreFlexibility: ['mystery'],
        notableAdaptations: ['a'],
        reputationScore: 10,
        adaptationFatigue: 1,
        culturalRelevance: 10,
        requiredElements: ['Detective'],
        suggestedCharacters: [],
        cost: 0,
      },
      {
        id: 'pd-1',
        name: 'Sherlock Holmes (Updated)',
        domainType: 'literature',
        dateEnteredDomain: '1900-01-01',
        coreElements: ['Justice'],
        genreFlexibility: ['crime'],
        notableAdaptations: ['b'],
        reputationScore: 99,
        adaptationFatigue: 5,
        culturalRelevance: 20,
        requiredElements: ['Watson'],
        suggestedCharacters: [{ id: 'x', name: 'X', importance: 'lead' }],
        cost: 0,
      },
    ] as any;

    const out = normalizePublicDomainIPs(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('pd-1');
    expect(out[0].name).toBe('Sherlock Holmes');
    expect(out[0].coreElements).toEqual(['Logic', 'Justice']);
    expect(out[0].genreFlexibility).toEqual(['mystery', 'crime']);
    expect(out[0].notableAdaptations).toEqual(['a', 'b']);
    expect(out[0].requiredElements).toEqual(['Detective', 'Watson']);
    expect(out[0].reputationScore).toBe(99);
    expect(out[0].adaptationFatigue).toBe(5);
    expect(out[0].culturalRelevance).toBe(20);
  });
});

describe('normalizePublicDomainState', () => {
  it('merges duplicate public domain IPs by name and rewrites project/script references', () => {
    const base = {
      universeSeed: 1,
      rngState: 1,
      studio: { id: 'studio-1', name: 'You' },
      currentYear: 2000,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [
        { id: 'p1', publicDomainId: 'pd-a', script: { id: 's1', title: 'A', publicDomainId: 'pd-a' } },
        { id: 'p2', publicDomainId: 'pd-b', script: { id: 's2', title: 'B', publicDomainId: 'pd-b' } },
      ],
      scripts: [
        { id: 's1', title: 'A', publicDomainId: 'pd-a' },
        { id: 's2', title: 'B', publicDomainId: 'pd-b' },
      ],
      publicDomainIPs: [
        {
          id: 'pd-a',
          name: 'Dracula',
          domainType: 'literature',
          dateEnteredDomain: '1900-01-01',
          coreElements: [],
          genreFlexibility: [],
          notableAdaptations: [],
          reputationScore: 10,
          adaptationFatigue: 0,
          culturalRelevance: 10,
          requiredElements: [],
          cost: 0,
        },
        {
          id: 'pd-b',
          name: 'Dracula',
          domainType: 'literature',
          dateEnteredDomain: '1900-01-01',
          coreElements: [],
          genreFlexibility: [],
          notableAdaptations: [],
          reputationScore: 20,
          adaptationFatigue: 0,
          culturalRelevance: 10,
          requiredElements: [],
          cost: 0,
        },
      ],
      franchises: [],
    } as any;

    const normalized = normalizePublicDomainState(base);

    expect(normalized.publicDomainIPs).toHaveLength(1);
    expect(normalized.publicDomainIPs[0].id).toBe('pd-a');

    expect(normalized.projects[0].script.publicDomainId).toBe('pd-a');
    expect(normalized.projects[1].script.publicDomainId).toBe('pd-a');
    expect(normalized.projects[0].publicDomainId).toBe('pd-a');
    expect(normalized.projects[1].publicDomainId).toBe('pd-a');

    expect(normalized.scripts[0].publicDomainId).toBe('pd-a');
    expect(normalized.scripts[1].publicDomainId).toBe('pd-a');
  });
});
