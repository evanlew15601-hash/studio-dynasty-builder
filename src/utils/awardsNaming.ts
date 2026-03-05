import type { GameState } from '@/types/game';

const CEREMONY_NAME_MAP: Record<string, string> = {
  Oscar: 'Crown',
  'Academy Awards': 'Crown',
  'Golden Globe': 'Crystal Ring',
  'Critics Choice': 'Critics Circle',
  Emmy: 'Beacon TV',
};

export function normalizeAwardCeremonyName(ceremony: string): string {
  return CEREMONY_NAME_MAP[ceremony] ?? ceremony;
}

export function normalizeAwardNameText(text: string): string {
  // Common award strings are formatted as: "{Ceremony} - {Category}".
  const parts = text.split(' - ');
  if (parts.length > 1) {
    const [ceremony, ...rest] = parts;
    return [normalizeAwardCeremonyName(ceremony), ...rest].join(' - ');
  }

  // Fallback for free-form award mentions.
  return text
    .split('Academy Awards').join('Crown')
    .split('Academy Award').join('Crown Award')
    .split('Golden Globe').join('Crystal Ring')
    .split('Critics Choice').join('Critics Circle')
    .split('Oscar').join('Crown')
    .split('Emmy').join('Beacon TV');
}

export function ensureGameStateFictionalAwardNames(gameState: GameState): GameState {
  return {
    ...gameState,
    studio: {
      ...gameState.studio,
      awards: (gameState.studio.awards || []).map((a) => ({
        ...a,
        ceremony: normalizeAwardCeremonyName(a.ceremony),
      })),
    },
    talent: (gameState.talent || []).map((t) => ({
      ...t,
      awards: (t.awards || []).map((a) => ({
        ...a,
        ceremony: normalizeAwardCeremonyName(a.ceremony),
      })),
    })),
    projects: (gameState.projects || []).map((p) => ({
      ...p,
      metrics: {
        ...p.metrics,
        awards: (p.metrics?.awards || []).map(normalizeAwardNameText),
      },
    })),
    allReleases: (gameState.allReleases || []).map((r) => {
      if (!('script' in r)) return r;
      return {
        ...r,
        metrics: {
          ...r.metrics,
          awards: (r.metrics?.awards || []).map(normalizeAwardNameText),
        },
      };
    }),
    awardsCalendar: (gameState.awardsCalendar || []).map((e: any) => ({
      ...e,
      ceremony: normalizeAwardCeremonyName(e.ceremony),
      name: typeof e.name === 'string' ? normalizeAwardNameText(e.name) : e.name,
    })),
  };
}
