import type { GameState, TalentPerson } from '@/types/game';
import type { LeagueReleasedProjectSnapshot, OnlineLeagueTurnStateSlice } from '@/types/onlineLeague';
import { isPrimaryStreamingFilm } from '@/utils/projectMedium';

export type OnlineLeagueSignTalentCommand = {
  type: 'SIGN_TALENT';
  payload: {
    talentId: string;
    projectId: string;
    role: string;
    weeklyPay?: number;
  };
};

export type OnlineLeagueTurnSubmission = {
  version: 'online-turn-submission-1';
  submittedAt: string;
  studioName: string;
  commands: OnlineLeagueSignTalentCommand[];
  // Optional: a small snapshot slice for debugging and for lightweight shared-world views.
  // Keep it JSON-serializable (avoid Dates/BigInt/functions from full game state).
  state?: OnlineLeagueTurnStateSlice;
};

export type OnlineLeagueTurnBaseline = {
  contractedKeys: Set<string>;
};

export type OnlineLeagueTurnResolution = {
  version: 'online-turn-resolution-1';
  turn: number;
  resolvedAt: string;
  acceptedTalentIdsByUserId: Record<string, string[]>;
  rejectedTalentIdsByUserId: Record<string, string[]>;
  winnerUserIdByTalentId: Record<string, string>;
};

function contractKey(talentId: string, projectId: string, role: string): string {
  return `${talentId}::${projectId}::${role}`;
}

export function createOnlineLeagueTurnBaseline(state: GameState): OnlineLeagueTurnBaseline {
  if (!state) return { contractedKeys: new Set<string>() };
  const keys = new Set<string>();

  for (const project of state.projects || []) {
    for (const ct of project.contractedTalent || []) {
      keys.add(contractKey(ct.talentId, project.id, ct.role));
    }
  }

  return { contractedKeys: keys };
}

export function buildOnlineLeagueTurnSubmission(params: {
  baseline: OnlineLeagueTurnBaseline | null;
  current: GameState;
}): OnlineLeagueTurnSubmission {
  const { baseline, current } = params;

  const prevKeys = baseline?.contractedKeys ?? new Set<string>();
  const commands: OnlineLeagueSignTalentCommand[] = [];

  for (const project of current.projects || []) {
    for (const ct of project.contractedTalent || []) {
      const key = contractKey(ct.talentId, project.id, ct.role);
      if (prevKeys.has(key)) continue;

      commands.push({
        type: 'SIGN_TALENT',
        payload: {
          talentId: ct.talentId,
          projectId: project.id,
          role: ct.role,
          weeklyPay: ct.weeklyPay,
        },
      });
    }
  }

  const releasedProjects: LeagueReleasedProjectSnapshot[] = (current.projects || [])
    .filter((p) => p.status === 'released')
    .map((p) => {
      const franchiseId = p.script?.franchiseId ?? p.franchiseId;
      const publicDomainId = p.script?.publicDomainId ?? p.publicDomainId;

      const franchiseTitle = franchiseId
        ? current.franchises.find((f) => f.id === franchiseId)?.title
        : undefined;

      const publicDomainName = publicDomainId
        ? current.publicDomainIPs.find((ip) => ip.id === publicDomainId)?.name
        : undefined;

      const director = (() => {
        const roles = [...(p.crew || []), ...(p.cast || [])];
        const dir = roles.find((r) => r.role?.toLowerCase().includes('director'));
        if (!dir?.talentId) return undefined;
        return current.talent.find((t) => t.id === dir.talentId)?.name;
      })();

      const topCast = (() => {
        const roles = (p.cast || [])
          .filter((r) => !!r.talentId)
          .slice();

        const sorted = roles
          .sort((a, b) => {
            const aLead = a.role?.toLowerCase().includes('lead') ? 1 : 0;
            const bLead = b.role?.toLowerCase().includes('lead') ? 1 : 0;
            if (aLead !== bLead) return bLead - aLead;
            return (b.salary || 0) - (a.salary || 0);
          })
          .slice(0, 4)
          .map((r) => current.talent.find((t) => t.id === r.talentId)?.name)
          .filter(Boolean) as string[];

        return sorted.length > 0 ? sorted : undefined;
      })();

      const releaseLabel =
        p.metrics?.boxOfficeStatus || (isPrimaryStreamingFilm(p) ? 'Streaming Premiere' : undefined);

      return {
        id: p.id,
        title: p.title,
        studioName: current.studio?.name ?? 'Studio',
        type: p.type,
        genre: p.script?.genre,
        runtimeMins: p.script?.estimatedRuntime,
        releaseWeek: p.releaseWeek,
        releaseYear: p.releaseYear,
        releaseLabel,
        logline: p.script?.logline,
        director,
        topCast,
        criticsScore: p.metrics?.criticsScore,
        audienceScore: p.metrics?.audienceScore,
        boxOfficeTotal: p.metrics?.boxOfficeTotal,
        lastWeeklyRevenue: p.metrics?.lastWeeklyRevenue,
        weeksSinceRelease: p.metrics?.weeksSinceRelease,
        inTheaters: p.metrics?.inTheaters,
        publicDomainId,
        publicDomainName,
        franchiseId,
        franchiseTitle,
        releaseFormat: p.releaseFormat,
        totalEpisodes: p.seasons?.[0]?.totalEpisodes ?? p.episodeCount,
        episodesAired: p.seasons?.[0]?.episodesAired,
      };
    });

  return {
    version: 'online-turn-submission-1',
    submittedAt: new Date().toISOString(),
    studioName: current.studio?.name ?? 'Studio',
    commands,
    state: {
      studio: current.studio ? { id: current.studio.id, name: current.studio.name } : null,
      projects: (current.projects || []).map((p) => ({ id: p.id, title: p.title })),
      releasedProjects,
    },
  };
}

export function resolveOnlineLeagueTalentConflicts(params: {
  turn: number;
  readyOrderUserIds: string[];
  submissionsByUserId: Record<string, OnlineLeagueTurnSubmission | null | undefined>;
  initiallyTakenTalentIds: Set<string>;
}): OnlineLeagueTurnResolution {
  const { turn, readyOrderUserIds, submissionsByUserId, initiallyTakenTalentIds } = params;

  const acceptedTalentIdsByUserId: Record<string, string[]> = {};
  const rejectedTalentIdsByUserId: Record<string, string[]> = {};
  const winnerUserIdByTalentId: Record<string, string> = {};

  const taken = new Set(initiallyTakenTalentIds);

  for (const userId of readyOrderUserIds) {
    const submission = submissionsByUserId[userId];
    if (!submission) continue;

    for (const cmd of submission.commands || []) {
      if (cmd.type !== 'SIGN_TALENT') continue;

      const talentId = cmd.payload.talentId;
      if (!talentId) continue;

      if (taken.has(talentId)) {
        rejectedTalentIdsByUserId[userId] = rejectedTalentIdsByUserId[userId] || [];
        rejectedTalentIdsByUserId[userId].push(talentId);
        continue;
      }

      taken.add(talentId);
      winnerUserIdByTalentId[talentId] = userId;
      acceptedTalentIdsByUserId[userId] = acceptedTalentIdsByUserId[userId] || [];
      acceptedTalentIdsByUserId[userId].push(talentId);
    }
  }

  return {
    version: 'online-turn-resolution-1',
    turn,
    resolvedAt: new Date().toISOString(),
    acceptedTalentIdsByUserId,
    rejectedTalentIdsByUserId,
    winnerUserIdByTalentId,
  };
}

export function applyOnlineLeagueTalentResolution(params: {
  prev: GameState;
  selfUserId: string | null;
  resolution: OnlineLeagueTurnResolution;
}): { next: GameState; rejectedTalentIds: string[] } {
  const { prev, selfUserId, resolution } = params;

  const rejectedTalentIds = selfUserId
    ? (resolution.rejectedTalentIdsByUserId[selfUserId] || [])
    : [];

  const acceptedByOthers = new Set<string>();
  for (const [uid, ids] of Object.entries(resolution.acceptedTalentIdsByUserId || {})) {
    if (selfUserId && uid === selfUserId) continue;
    for (const id of ids || []) acceptedByOthers.add(id);
  }

  const rejected = new Set(rejectedTalentIds);

  const nextProjects = (prev.projects || []).map((p) => {
    const filteredContracted = (p.contractedTalent || []).filter((ct) => !rejected.has(ct.talentId));
    const filteredCast = (p.cast || []).filter((c: any) => !rejected.has(c.talentId));
    const filteredCrew = (p.crew || []).filter((c: any) => !rejected.has(c.talentId));

    let nextScript = p.script;
    if (nextScript?.characters && nextScript.characters.length > 0) {
      nextScript = {
        ...nextScript,
        characters: nextScript.characters.map((ch: any) =>
          rejected.has(ch.assignedTalentId) ? { ...ch, assignedTalentId: undefined } : ch
        ),
      } as any;
    }

    if (
      filteredContracted !== p.contractedTalent ||
      filteredCast !== p.cast ||
      filteredCrew !== p.crew ||
      nextScript !== p.script
    ) {
      return {
        ...p,
        contractedTalent: filteredContracted,
        cast: filteredCast,
        crew: filteredCrew,
        script: nextScript,
      };
    }

    return p;
  });

  const nextTalent = (prev.talent || []).map((t) => {
    if (rejected.has(t.id)) {
      return { ...t, contractStatus: 'available' as TalentPerson['contractStatus'] };
    }

    if (acceptedByOthers.has(t.id) && t.contractStatus === 'available') {
      return { ...t, contractStatus: 'contracted' as TalentPerson['contractStatus'] };
    }

    return t;
  });

  const next: GameState = {
    ...prev,
    projects: nextProjects,
    talent: nextTalent,
  };

  return { next, rejectedTalentIds };
}
