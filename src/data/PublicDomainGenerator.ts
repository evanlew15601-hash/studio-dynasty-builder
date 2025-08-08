import { ScriptCharacter, PublicDomainIP } from '@/types/game';

const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export interface PublicDomainSource {
  id: string;
  title: string;
  author: string;
  genre: string[];
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedBudget: { min: number; max: number };
  suggestedCharacters?: ScriptCharacter[];
  themes: string[];
  targetAudience: string[];
  adaptationNotes?: string;
}

export const generatePublicDomainSources = (): PublicDomainSource[] => {
  return [
    {
      id: 'pd-1',
      title: 'Romeo and Juliet',
      author: 'William Shakespeare',
      genre: ['Romance', 'Drama'],
      description: 'Star-crossed lovers from feuding families',
      difficulty: 'medium',
      estimatedBudget: { min: 15000000, max: 40000000 },
      themes: ['Love', 'Family Conflict', 'Tragedy'],
      targetAudience: ['Young Adult', 'General'],
      adaptationNotes: 'Can be modernized to any time period',
      suggestedCharacters: [
        {
          id: 'romeo',
          name: 'Romeo',
          importance: 'lead',
          description: 'Young man from feuding family',
          requiredType: 'actor',
          ageRange: [18, 30],
        },
        {
          id: 'juliet',
          name: 'Juliet',
          importance: 'lead',
          description: 'Young woman from feuding family',
          requiredType: 'actor',
          ageRange: [16, 25],
        },
        {
          id: 'director',
          name: 'Director',
          importance: 'crew',
          description: 'Film director',
          requiredType: 'director',
          ageRange: [30, 65],
        }
      ]
    }
  ];
};

export const getRandomPublicDomainSource = (): PublicDomainSource => {
  const sources = generatePublicDomainSources();
  return getRandomElement(sources);
};

// Compatibility generator to match existing imports in the game
export class PublicDomainGenerator {
  static generateInitialPublicDomainIPs(count: number = 20): PublicDomainIP[] {
    const sources = generatePublicDomainSources();

    // Map PublicDomainSource -> PublicDomainIP (structural match for gameplay systems)
    const mapped: PublicDomainIP[] = sources.map((s) => ({
      id: s.id,
      name: s.title,
      domainType: 'literature',
      dateEnteredDomain: '1900-01-01',
      coreElements: s.themes,
      genreFlexibility: (s.genre as any) || ['drama'],
      notableAdaptations: [],
      reputationScore: 70,
      adaptationFatigue: 0,
      lastAdaptationDate: undefined,
      culturalRelevance: 70,
      requiredElements: [],
      suggestedCharacters: s.suggestedCharacters,
      description: s.description,
      cost: 0
    }));

    // Expand to requested count by cycling and tweaking ids slightly
    const list: PublicDomainIP[] = [];
    for (let i = 0; i < count; i++) {
      const base = mapped[i % mapped.length];
      list.push({
        ...base,
        id: `${base.id}-${Math.floor(i / mapped.length) + 1}`
      });
    }

    return list;
  }
}