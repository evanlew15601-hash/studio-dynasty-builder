import type { GameState } from '@/types/game';

const CEREMONY_NAME_MAP: Record<string, string> = {
  Oscar: 'Crown',
  'Academy Awards': 'Crown',
  'Golden Globe': 'Crystal Ring',
  'Critics Choice': 'Critics Circle',
  Emmy: 'Beacon TV',

  // Common real-world guild/show aliases -> Cornellverse counterparts
  SAG: 'Performers Guild',
  'SAG Awards': 'Performers Guild',
  'Screen Actors Guild': 'Performers Guild',
  'Screen Actors Guild Awards': 'Performers Guild',

  DGA: 'Directors Circle',
  'DGA Awards': 'Directors Circle',
  'Directors Guild': 'Directors Circle',
  'Directors Guild Awards': 'Directors Circle',

  WGA: 'Writers Circle',
  'WGA Awards': 'Writers Circle',
  'Writers Guild': 'Writers Circle',
  'Writers Guild Awards': 'Writers Circle',

  BAFTA: 'Britannia Screen',
  'BAFTA Awards': 'Britannia Screen',
  'British Academy': 'Britannia Screen',
  'British Academy Awards': 'Britannia Screen',
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
    .split('Emmy').join('Beacon TV')
    .split('Screen Actors Guild Awards').join('Performers Guild')
    .split('Screen Actors Guild').join('Performers Guild')
    .split('SAG Awards').join('Performers Guild')
    .split('SAG').join('Performers Guild')
    .split('Directors Guild Awards').join('Directors Circle')
    .split('Directors Guild').join('Directors Circle')
    .split('DGA Awards').join('Directors Circle')
    .split('DGA').join('Directors Circle')
    .split('Writers Guild Awards').join('Writers Circle')
    .split('Writers Guild').join('Writers Circle')
    .split('WGA Awards').join('Writers Circle')
    .split('WGA').join('Writers Circle')
    .split('British Academy Awards').join('Britannia Screen')
    .split('British Academy').join('Britannia Screen')
    .split('BAFTA Awards').join('Britannia Screen')
    .split('BAFTA').join('Britannia Screen');
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
