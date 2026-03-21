import { describe, expect, it } from 'vitest';
import type { Project, Studio, TalentPerson } from '@/types/game';
import { negotiateTalentContract, recordStudioNegotiationOutcome } from '@/utils/talentNegotiation';

function makeStudio(): Studio {
  return {
    id: 'studio-1',
    name: 'Studio',
    reputation: 60,
    budget: 10_000_000,
    founded: 2000,
    specialties: ['drama'],
    awards: [],
  } as any;
}

function makeProject(): Project {
  return {
    id: 'p1',
    title: 'Film',
    type: 'feature',
    currentPhase: 'development' as any,
    status: 'development',
    budget: { total: 10_000_000 } as any,
    script: { id: 's', title: 'S', genre: 'drama', quality: 70, characters: [] } as any,
    cast: [],
    crew: [],
    timeline: {} as any,
    locations: [],
    distributionStrategy: {} as any,
    metrics: {} as any,
    phaseDuration: 1,
    contractedTalent: [],
    developmentProgress: {} as any,
  } as any;
}

function makeTalent(overrides?: Partial<TalentPerson>): TalentPerson {
  return {
    id: 't1',
    name: 'Star',
    type: 'actor',
    age: 30,
    experience: 10,
    reputation: 70,
    marketValue: 10_000_000,
    genres: ['drama'],
    contractStatus: 'available',
    availability: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    ...(overrides || {}),
  } as any;
}

describe('talentNegotiation studio interest memory', () => {
  it('blocks negotiation when talent is in a per-studio rejection cooldown', () => {
    const studio = makeStudio();
    const project = makeProject();

    const base = makeTalent();
    const studioInterest = recordStudioNegotiationOutcome({
      talent: base,
      studioId: studio.id,
      currentWeek: 10,
      currentYear: 2024,
      interestScore: 10,
      outcome: 'rejected',
    });

    const talent = makeTalent({ studioInterest });

    const res = negotiateTalentContract({
      talent,
      studio,
      project,
      requiredType: 'actor',
      importance: 'lead',
      week: 11,
      year: 2024,
    });

    expect(res.accepted).toBe(false);
    if (!res.accepted) expect(res.reason).toBe('not-interested');
  });

  it('clears rejection cooldown on signing and improves interest', () => {
    const studio = makeStudio();
    const base = makeTalent();

    const rejected = recordStudioNegotiationOutcome({
      talent: base,
      studioId: studio.id,
      currentWeek: 10,
      currentYear: 2024,
      interestScore: 10,
      outcome: 'rejected',
    });

    const signed = recordStudioNegotiationOutcome({
      talent: makeTalent({ studioInterest: rejected }),
      studioId: studio.id,
      currentWeek: 30,
      currentYear: 2024,
      interestScore: 70,
      outcome: 'signed',
    });

    expect(signed[studio.id].rejectedUntilWeekIndex).toBeUndefined();
    expect(signed[studio.id].interest).toBeGreaterThan(50);
  });
});
