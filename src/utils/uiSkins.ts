export type UiSkinId = 'studio' | 'noir' | 'silent-era' | 'sci-fi' | 'horror' | 'art-deco' | 'retro-synth';

export type UiSkin = {
  id: UiSkinId;
  name: string;
  description: string;
  preview: {
    backgroundImage: string;
    swatches: [string, string, string, string];
  };
};

export const UI_SKINS: UiSkin[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Premium gold-on-charcoal (default).',
    preview: {
      backgroundImage:
        'linear-gradient(135deg, hsl(220 18% 10%), hsl(42 88% 68% / 0.18), hsl(230 25% 18%))',
      swatches: ['hsl(220 15% 8%)', 'hsl(45 12% 88%)', 'hsl(42 88% 68%)', 'hsl(42 95% 72%)'],
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Silver + smoke, cool highlights.',
    preview: {
      backgroundImage: 'linear-gradient(135deg, hsl(220 10% 6%), hsl(220 10% 14%), hsl(200 60% 22%))',
      swatches: ['hsl(220 10% 6%)', 'hsl(40 10% 92%)', 'hsl(45 15% 82%)', 'hsl(195 80% 60%)'],
    },
  },
  {
    id: 'silent-era',
    name: 'Silent Era',
    description: 'Sepia paper, inked panels.',
    preview: {
      backgroundImage: 'linear-gradient(135deg, hsl(35 30% 92%), hsl(35 45% 86%), hsl(28 54% 45% / 0.45))',
      swatches: ['hsl(35 30% 92%)', 'hsl(28 25% 18%)', 'hsl(28 54% 32%)', 'hsl(42 60% 45%)'],
    },
  },
  {
    id: 'sci-fi',
    name: 'Sci‑Fi',
    description: 'Neon edges, deep space.',
    preview: {
      backgroundImage: 'linear-gradient(135deg, hsl(230 35% 7%), hsl(185 92% 55% / 0.18), hsl(300 92% 62% / 0.16))',
      swatches: ['hsl(230 35% 7%)', 'hsl(210 40% 96%)', 'hsl(185 92% 55%)', 'hsl(300 92% 62%)'],
    },
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Atmospheric dread, bone + dried blood.',
    preview: {
      backgroundImage: 'linear-gradient(135deg, hsl(140 14% 5%), hsl(358 60% 42% / 0.20), hsl(88 22% 44% / 0.16))',
      swatches: ['hsl(140 14% 5%)', 'hsl(45 18% 90%)', 'hsl(358 60% 42%)', 'hsl(88 22% 44%)'],
    },
  },
  {
    id: 'art-deco',
    name: 'Art Deco',
    description: 'Ivory + gilt + emerald geometry.',
    preview: {
      backgroundImage:
        'linear-gradient(135deg, hsl(38 28% 92%), hsl(42 88% 68% / 0.22), hsl(156 65% 38% / 0.18))',
      swatches: ['hsl(220 15% 8%)', 'hsl(38 28% 92%)', 'hsl(42 88% 68%)', 'hsl(156 65% 38%)'],
    },
  },
  {
    id: 'retro-synth',
    name: 'Retro Synth',
    description: 'Neon magenta + cyan on midnight.',
    preview: {
      backgroundImage:
        'linear-gradient(135deg, hsl(255 55% 10%), hsl(300 92% 62% / 0.22), hsl(185 92% 55% / 0.18))',
      swatches: ['hsl(255 55% 10%)', 'hsl(210 40% 96%)', 'hsl(300 92% 62%)', 'hsl(185 92% 55%)'],
    },
  },
];

const STORAGE_KEY = 'studio-magnate-ui-skin';

export function normalizeUiSkinId(raw: string | null | undefined): UiSkinId {
  const v = (raw ?? '').trim() as UiSkinId;
  if (UI_SKINS.some((s) => s.id === v)) return v;
  return 'studio';
}

export function getStoredUiSkinId(): UiSkinId {
  if (typeof window === 'undefined') return 'studio';
  return normalizeUiSkinId(window.localStorage.getItem(STORAGE_KEY));
}

export function applyUiSkin(id: UiSkinId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.skin = id;
}

export function setUiSkin(id: UiSkinId) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  applyUiSkin(id);
}

export function initUiSkin() {
  const id = getStoredUiSkinId();
  applyUiSkin(id);
}
