import { describe, expect, it } from 'vitest';
import type { Project, Studio, TalentPerson } from '@/types/game';
import { evaluateTalentOffer, negotiateTalentContract, recordStudioNegotiationOutcome } from '@/utils/talentNegotiation';

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

describe('talentNegotiation offer evaluation', () => {
  it('counters when the offer is close to the ask and interest is decent', () => {
    const studio = { ...makeStudio(), reputation: 90 };
    const project = { ...makeProject(), script: { ...(makeProject().script as any), quality: 90 } };
    const talent = makeTalent({ reputation: 70, marketValue: 12_000_000, genres: ['drama'] });

    const probe = evaluateTalentOffer({
      talent,
      studio,
      project,
      requiredType: 'actor',
      importance: 'lead',
      offerWeeklyPay: 0,
      contractWeeks: 16,
      week: 10,
      year: 2024,
    });

    expect(probe.askWeeklyPay).toBeGreaterThan(0);

    const closeOffer = evaluateTalentOffer({
      talent,
      studio,
      project,
      requiredType: 'actor',
      importance: 'lead',
      offerWeeklyPay: Math.round(probe.askWeeklyPay * 0.9),
      contractWeeks: 16,
      week: 10,
      year: 2024,
    });

    expect(closeOffer.status).toBe('counter');
    if (closeOffer.status === 'counter') {
      expect(closeOffer.counterWeeklyPay).toBe(closeOffer.askWeeklyPay);
    }
  });

  it('accepts when the offer meets the ask', () => {
    const studio = { ...makeStudio(), reputation: 90 };
    const project = { ...makeProject(), script: { ...(makeProject().script as any), quality: 90 } };
    const talent = makeTalent({ reputation: 70, marketValue: 12_000_000, genres: ['drama'] });

    const probe = evaluateTalentOffer({
      talent,
      studio,
      project,
      requiredType: 'actor',
      importance: 'lead',
      offerWeeklyPay: 0,
      contractWeeks: 16,
      week: 10,
      year: 2024,
    });

    const accepted = evaluateTalentOffer({
      talent,
      studio,
      project,
      requiredType: 'actor',
      importance: 'lead',
      offerWeeklyPay: probe.askWeeklyPay,
      contractWeeks: 16,
      week: 10,
      year: 2024,
    });

    expect(accepted.status).toBe('accepted');
  });
});
