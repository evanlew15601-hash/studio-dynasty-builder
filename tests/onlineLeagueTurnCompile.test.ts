import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import {
  applyOnlineLeagueTalentResolution,
  buildOnlineLeagueTurnSubmission,
  createOnlineLeagueTurnBaseline,
  resolveOnlineLeagueTalentConflicts,
} from '@/utils/onlineLeagueTurnCompile';

function makeBaseGameState(): GameState {
  return {
    universeSeed: 1,
    rngState: 1,
    studio: {
      id: 'studio-1',
      name: 'You',
      reputation: 50,
      budget: 10_000_000,
      founded: 1965,
      specialties: ['drama'],
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0,
    },
    currentYear: 2000,
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
      awardsSeasonActive: false,
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    aiStudioProjects: [],
  } as any;
}

describe('onlineLeagueTurnCompile', () => {
  it('buildOnlineLeagueTurnSubmission emits SIGN_TALENT commands for new contracted talent', () => {
    const base = makeBaseGameState();
    const baseline = createOnlineLeagueTurnBaseline({
      ...base,
      projects: [
        {
          id: 'p1',
          title: 'Film',
          contractedTalent: [],
          cast: [],
          crew: [],
          script: { id: 's1', title: 'Film', genre: 'drama' } as any,
        } as any,
      ],
    });

    const current: GameState = {
      ...base,
      projects: [
        {
          id: 'p1',
          title: 'Film',
          contractedTalent: [{ talentId: 't1', role: 'Lead Actor', weeklyPay: 1000 } as any],
          cast: [],
          crew: [],
          script: { id: 's1', title: 'Film', genre: 'drama' } as any,
        } as any,
      ],
    };

    const submission = buildOnlineLeagueTurnSubmission({ baseline, current });
    expect(submission.commands).toHaveLength(1);
    expect(submission.commands[0].type).toBe('SIGN_TALENT');
    expect(submission.commands[0].payload.talentId).toBe('t1');
    expect(submission.commands[0].payload.projectId).toBe('p1');
  });

  it('resolveOnlineLeagueTalentConflicts uses ready order (first ready wins)', () => {
    const res = resolveOnlineLeagueTalentConflicts({
      turn: 2,
      readyOrderUserIds: ['u1', 'u2'],
      submissionsByUserId: {
        u1: {
          version: 'online-turn-submission-1',
          submittedAt: new Date().toISOString(),
          studioName: 'A',
          commands: [{ type: 'SIGN_TALENT', payload: { talentId: 't1', projectId: 'p1', role: 'Lead' } }],
        },
        u2: {
          version: 'online-turn-submission-1',
          submittedAt: new Date().toISOString(),
          studioName: 'B',
          commands: [{ type: 'SIGN_TALENT', payload: { talentId: 't1', projectId: 'p2', role: 'Lead' } }],
        },
      },
      initiallyTakenTalentIds: new Set(),
    });

    expect(res.acceptedTalentIdsByUserId.u1).toEqual(['t1']);
    expect(res.rejectedTalentIdsByUserId.u2).toEqual(['t1']);
    expect(res.winnerUserIdByTalentId.t1).toBe('u1');
  });

  it('applyOnlineLeagueTalentResolution reverts rejected talent and locks accepted-by-others talent', () => {
    const base = makeBaseGameState();
    const prev: GameState = {
      ...base,
      talent: [
        { id: 't1', name: 'Star', contractStatus: 'contracted' } as any,
        { id: 't2', name: 'Other Star', contractStatus: 'available' } as any,
      ],
      projects: [
        {
          id: 'p1',
          title: 'Film',
          contractedTalent: [{ talentId: 't1', role: 'Lead' } as any],
          cast: [{ talentId: 't1', role: 'Lead' } as any],
          crew: [],
          script: { id: 's1', title: 'Film', genre: 'drama', characters: [{ id: 'c1', assignedTalentId: 't1' }] } as any,
        } as any,
      ],
    };

    const resolution = {
      version: 'online-turn-resolution-1',
      turn: 2,
      resolvedAt: new Date().toISOString(),
      acceptedTalentIdsByUserId: { other: ['t2'] },
      rejectedTalentIdsByUserId: { me: ['t1'] },
      winnerUserIdByTalentId: { t2: 'other' },
    } as any;

    const applied = applyOnlineLeagueTalentResolution({ prev, selfUserId: 'me', resolution });
    const next = applied.next;

    expect(next.talent.find((t: any) => t.id === 't1')?.contractStatus).toBe('available');
    expect(next.projects[0].contractedTalent).toHaveLength(0);
    expect(next.projects[0].cast).toHaveLength(0);
    expect(next.projects[0].script.characters[0].assignedTalentId).toBeUndefined();

    expect(next.talent.find((t: any) => t.id === 't2')?.contractStatus).toBe('contracted');
  });
});
