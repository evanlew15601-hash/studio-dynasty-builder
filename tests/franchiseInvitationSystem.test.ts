import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { FranchiseInvitationSystem } from '@/game/systems/franchiseInvitationSystem';
import { createRng } from '@/game/core/rng';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 60,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 10,
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
    franchises: [],
    publicDomainIPs: [],
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('FranchiseInvitationSystem', () => {
  it('clears an expired invitation token', () => {
    const weekIndex = (2027 * 52) + 1;

    const state = makeBaseState({
      currentYear: 2027,
      currentWeek: 1,
      projects: [{
        id: 'p1',
        title: 'Released Feature',
        script: {
          id: 's1',
          title: 'Released Feature',
          genre: 'drama',
          logline: 'x',
          writer: 'x',
          pages: 100,
          quality: 50,
          budget: 10,
          developmentStage: 'final',
          themes: [],
          targetAudience: 'general',
          estimatedRuntime: 100,
          characteristics: {
            tone: 'balanced',
            pacing: 'steady',
            dialogue: 'naturalistic',
            visualStyle: 'realistic',
            commercialAppeal: 5,
            criticalPotential: 5,
            cgiIntensity: 'minimal',
          },
          characters: [],
        },
        type: 'feature',
        currentPhase: 'distribution',
        budget: {
          total: 10,
          allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
          spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
          overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
        },
        cast: [],
        crew: [],
        timeline: {
          preProduction: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
          principalPhotography: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
          postProduction: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
          release: new Date('2027-01-01T00:00:00.000Z'),
          milestones: [],
        },
        locations: [],
        distributionStrategy: {
          primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
          international: [],
          windows: [],
          marketingBudget: 0,
        },
        status: 'released',
        metrics: { critical: { criticsConsensus: '' } },
        phaseDuration: 0,
        contractedTalent: [],
        developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
      } as any],
      studio: {
        ...makeBaseState().studio,
        franchiseInvitation: {
          franchiseId: 'world-1',
          offeredWeekIndex: weekIndex - 40,
          acceptedWeekIndex: weekIndex - 40,
          expiresWeekIndex: weekIndex - 1,
          usesRemaining: 1,
        },
      },
    });

    const next = FranchiseInvitationSystem.onTick(state, {
      rng: createRng(123),
      week: 1,
      year: 2027,
      quarter: 1,
      recap: [],
      debug: false,
    });

    expect(next.studio.franchiseInvitation).toBe(undefined);
  });
});

describe('franchise invitations (resolveGameEvent)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 111 }), 123);
  });

  it('accepting stores a 1-use invitation token on the studio', () => {
    const currentWeekIndex = (2027 * 52) + 10;

    const event: GameEvent = {
      id: 'event-invite',
      title: 'Invitation',
      description: '...',
      type: 'opportunity',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'franchise:invitation', franchiseId: 'world-1', offeredWeekIndex: currentWeekIndex, expiresWeekIndex: currentWeekIndex + 39 },
      choices: [{ id: 'accept', text: 'Accept', consequences: [] }],
    };

    useGameStore.getState().mergeGameState({ eventQueue: [event] });
    useGameStore.getState().resolveGameEvent('event-invite', 'accept');

    const studio = useGameStore.getState().game!.studio;

    expect(studio.franchiseInvitation?.franchiseId).toBe('world-1');
    expect(studio.franchiseInvitation?.usesRemaining).toBe(1);
    expect(studio.lastFranchiseInvitationWeekIndex).toBe(currentWeekIndex);
    expect(studio.franchiseInvitationCooldowns?.['world-1']).toBe(currentWeekIndex + 156);
  });

  it('declining sets cooldown and does not store an invitation token', () => {
    const currentWeekIndex = (2027 * 52) + 10;

    const event: GameEvent = {
      id: 'event-invite-decline',
      title: 'Invitation',
      description: '...',
      type: 'opportunity',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'franchise:invitation', franchiseId: 'world-2', offeredWeekIndex: currentWeekIndex, expiresWeekIndex: currentWeekIndex + 39 },
      choices: [{ id: 'decline', text: 'Decline', consequences: [] }],
    };

    useGameStore.getState().mergeGameState({ eventQueue: [event] });
    useGameStore.getState().resolveGameEvent('event-invite-decline', 'decline');

    const studio = useGameStore.getState().game!.studio;

    expect(studio.franchiseInvitation).toBe(undefined);
    expect(studio.lastFranchiseInvitationWeekIndex).toBe(currentWeekIndex);
    expect(studio.franchiseInvitationCooldowns?.['world-2']).toBe(currentWeekIndex + 156);
  });
});
