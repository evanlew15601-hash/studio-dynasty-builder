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
