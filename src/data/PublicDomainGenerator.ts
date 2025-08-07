import { ScriptCharacter } from '@/types/game';

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
          screenTimeMinutes: 60,
          ageRange: [18, 30],
          requiredTraits: []
        },
        {
          id: 'juliet',
          name: 'Juliet',
          importance: 'lead',
          description: 'Young woman from feuding family',
          requiredType: 'actor',
          screenTimeMinutes: 60,
          ageRange: [16, 25],
          requiredTraits: []
        },
        {
          id: 'director',
          name: 'Director',
          importance: 'crew',
          description: 'Film director',
          requiredType: 'director',
          screenTimeMinutes: 0,
          ageRange: [30, 65],
          requiredTraits: []
        }
      ]
    }
  ];
};

export const getRandomPublicDomainSource = (): PublicDomainSource => {
  const sources = generatePublicDomainSources();
  return getRandomElement(sources);
};