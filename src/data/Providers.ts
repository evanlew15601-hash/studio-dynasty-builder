import type { Genre } from '@/types/game';
import type { ProviderDbRecord } from '@/types/industryDatabase';

export const DEFAULT_PROVIDERS: ProviderDbRecord[] = [
  {
    id: 'netflix',
    name: 'StreamFlix',
    type: 'streaming',
    tier: 'major',
    description: 'Global streaming leader with broad mainstream reach and heavy content spend.',
    reach: 92,
  },
  {
    id: 'amazon',
    name: 'Prime Stream',
    type: 'streaming',
    tier: 'major',
    description: 'Bundle-driven streaming service with strong international footprint.',
    reach: 88,
  },
  {
    id: 'hulu',
    name: 'StreamHub',
    type: 'streaming',
    tier: 'mid',
    description: 'Ad-supported streamer focused on next-day TV and adult-skewing originals.',
    reach: 75,
  },
  {
    id: 'disney',
    name: 'Magic Stream',
    type: 'streaming',
    tier: 'major',
    description: 'Family-focused streaming platform with franchise-first strategy.',
    reach: 85,
  },
  {
    id: 'apple',
    name: 'Orchard TV',
    type: 'streaming',
    tier: 'mid',
    description: 'Prestige-leaning streamer with curated originals and premium positioning.',
    reach: 65,
  },
  {
    id: 'hbo',
    name: 'Premium Stream',
    type: 'streaming',
    tier: 'major',
    description: 'High-end subscription streamer known for award-caliber drama and limited series.',
    reach: 78,
  },
  {
    id: 'paramount',
    name: 'Summit+',
    type: 'streaming',
    tier: 'mid',
    description: 'Studio-backed streamer mixing blockbuster libraries with reality and sports docs.',
    reach: 72,
  },
  {
    id: 'peacock',
    name: 'FeatherPlay',
    type: 'streaming',
    tier: 'mid',
    description: 'Hybrid streamer with a strong catalog and live-event integrations.',
    reach: 70,
  },

  // Cable networks (fictional)
  {
    id: 'signal8',
    name: 'Signal 8',
    type: 'cable',
    tier: 'major',
    description: 'Flagship cable network with award-friendly dramas and event miniseries.',
    reach: 80,
  },
  {
    id: 'northstar',
    name: 'Northstar Network',
    type: 'cable',
    tier: 'mid',
    description: 'General entertainment cable network with sports and unscripted blocks.',
    reach: 65,
  },
  {
    id: 'crestnews',
    name: 'Crest News',
    type: 'cable',
    tier: 'niche',
    description: '24-hour news channel with documentary programming and specials.',
    reach: 55,
  },
];

export function getDefaultProviders(): ProviderDbRecord[] {
  return DEFAULT_PROVIDERS.map((p) => ({ ...p }));
}

export function findDefaultProviderById(providerId?: string): ProviderDbRecord | undefined {
  if (!providerId) return undefined;
  return DEFAULT_PROVIDERS.find((p) => p.id === providerId);
}

export function chooseProviderForGenre(genre: Genre, providers: ProviderDbRecord[]): ProviderDbRecord {
  const list = providers.length > 0 ? providers : DEFAULT_PROVIDERS;

  const preference: Partial<Record<Genre, string[]>> = {
    family: ['disney', 'netflix', 'amazon'],
    animation: ['disney', 'netflix', 'peacock'],
    superhero: ['netflix', 'amazon', 'paramount'],
    action: ['netflix', 'amazon', 'paramount'],
    adventure: ['amazon', 'netflix', 'paramount'],
    'sci-fi': ['amazon', 'netflix', 'apple'],
    fantasy: ['amazon', 'netflix', 'hbo'],
    drama: ['hbo', 'apple', 'signal8', 'netflix'],
    thriller: ['hulu', 'netflix', 'signal8'],
    horror: ['hulu', 'netflix', 'signal8'],
    crime: ['signal8', 'hulu', 'netflix'],
    mystery: ['signal8', 'hulu', 'netflix'],
    romance: ['netflix', 'amazon', 'hulu'],
    comedy: ['netflix', 'peacock', 'hulu'],
    documentary: ['crestnews', 'hbo', 'apple', 'signal8'],
    sports: ['northstar', 'netflix', 'amazon'],
    biography: ['signal8', 'hbo', 'apple'],
    historical: ['signal8', 'hbo', 'apple'],
    war: ['signal8', 'hbo', 'northstar'],
    western: ['northstar', 'signal8', 'amazon'],
    musical: ['disney', 'netflix', 'apple'],
  };

  const prefs = preference[genre] || [];

  const scoreProvider = (p: ProviderDbRecord): number => {
    const reach = Math.max(0, Math.min(100, p.reach ?? 70));
    let score = reach / 100;

    const idx = prefs.indexOf(p.id);
    if (idx !== -1) {
      score += 1.2 - idx * 0.25;
    }

    // Gentle nudges by medium.
    if (p.type === 'cable' && (genre === 'sports' || genre === 'documentary' || genre === 'war' || genre === 'historical' || genre === 'biography')) {
      score += 0.25;
    }

    if (p.type === 'streaming' && (genre === 'superhero' || genre === 'fantasy' || genre === 'sci-fi' || genre === 'action')) {
      score += 0.1;
    }

    return score;
  };

  return list
    .slice()
    .sort((a, b) => scoreProvider(b) - scoreProvider(a) || a.name.localeCompare(b.name))
    [0];
}
