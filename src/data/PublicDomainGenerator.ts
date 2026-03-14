import { ScriptCharacter, PublicDomainIP } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

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
      title: 'Sherlock Holmes',
      author: 'Arthur Conan Doyle',
      genre: ['Mystery', 'Crime', 'Thriller'],
      description: 'A sharp-witted detective and a steadfast companion take on baffling cases in foggy, gaslit streets. The appeal is cerebral: clues, misdirection, and the satisfaction of watching logic slice through chaos. It adapts cleanly to period drama, modern crime thriller, or even stylized neo-noir—as long as the mystery is fair and the partnership stays central.',
      difficulty: 'medium',
      estimatedBudget: { min: 20000000, max: 70000000 },
      themes: ['Logic', 'Friendship', 'Justice'],
      targetAudience: ['General', 'Adult'],
      adaptationNotes: 'Works across periods; modern or period settings both successful.',
      suggestedCharacters: [
        { id: 'holmes', name: 'Sherlock Holmes', importance: 'lead', description: 'Brilliant consulting detective', requiredType: 'actor', ageRange: [28, 55] },
        { id: 'watson', name: 'Dr. John Watson', importance: 'supporting', description: 'Loyal companion, physician', requiredType: 'actor', ageRange: [28, 55] },
        { id: 'inspector', name: 'Inspector Lestrade', importance: 'minor', description: 'Scotland Yard inspector', requiredType: 'actor', ageRange: [30, 60] },
        { id: 'villain', name: 'Primary Antagonist', importance: 'supporting', description: 'Case-specific foe (e.g., Moriarty, Adler)', requiredType: 'actor', ageRange: [25, 65] },
        { id: 'cameo-press', name: 'Newspaper Editor (Cameo)', importance: 'minor', description: 'One-scene cameo for flavor', requiredType: 'actor', ageRange: [30, 70] },
        { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-2',
      title: 'Dracula',
      author: 'Bram Stoker',
      genre: ['Horror', 'Gothic'],
      description: 'A charismatic predator arrives in polite society and turns charm into contagion. The story blends gothic romance, creeping dread, and the tension of a group trying to name the evil before it spreads. It can play as sensual horror, action-thriller, or psychological tragedy—just keep the atmosphere heavy and the stakes intimate.',
      difficulty: 'medium',
      estimatedBudget: { min: 25000000, max: 90000000 },
      themes: ['Temptation', 'Fear', 'Identity'],
      targetAudience: ['General', 'Mature'],
      adaptationNotes: 'Flexible tone: sensual horror to action-thriller.',
      suggestedCharacters: [
        { id: 'dracula', name: 'Count Dracula', importance: 'lead', description: 'Ancient vampire lord', requiredType: 'actor', ageRange: [30, 70] },
        { id: 'vanhelsing', name: 'Van Helsing', importance: 'supporting', description: 'Scholar and vampire hunter', requiredType: 'actor', ageRange: [40, 70] },
        { id: 'mina', name: 'Mina Harker', importance: 'supporting', description: 'Resilient heroine', requiredType: 'actor', ageRange: [20, 40] },
        { id: 'renfield', name: 'Renfield', importance: 'minor', description: 'Unhinged servant', requiredType: 'actor', ageRange: [25, 60] },
        { id: 'cameo-reporter', name: 'Sensationalist Reporter (Cameo)', importance: 'minor', description: 'One-scene press voice', requiredType: 'actor', ageRange: [25, 70] },
        { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-3',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      genre: ['Horror', 'Drama', 'Sci-Fi'],
      description: 'A brilliant outsider pushes past ethical limits and succeeds—only to realize creation comes with responsibility. The heart of the story is isolation: the maker, the made, and the damage done by fear and abandonment. It works as classic period horror, modern biotech thriller, or tragic drama, but it lands best when the “monster” has a point of view.',
      difficulty: 'easy',
      estimatedBudget: { min: 15000000, max: 60000000 },
      themes: ['Hubris', 'Creation', 'Isolation'],
      targetAudience: ['General', 'Mature'],
      adaptationNotes: 'Period or contemporary science reimagining both fit.',
      suggestedCharacters: [
        { id: 'victor', name: 'Victor Frankenstein', importance: 'lead', description: 'Driven scientist', requiredType: 'actor', ageRange: [25, 45] },
        { id: 'creature', name: 'The Creature', importance: 'supporting', description: 'Misunderstood creation', requiredType: 'actor', ageRange: [20, 50] },
        { id: 'mentor', name: 'Academic Mentor', importance: 'minor', description: 'University authority', requiredType: 'actor', ageRange: [40, 70] },
        { id: 'cameo-journalist', name: 'Trade Journalist (Cameo)', importance: 'minor', description: 'Brief interview scene', requiredType: 'actor', ageRange: [25, 70] },
        { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-4',
      title: 'Robin Hood',
      author: 'Medieval English Folklore',
      genre: ['Adventure', 'Action'],
      description: 'A folk-hero outlaw leads a band of misfits against corrupt power, redistributing wealth and humiliating tyrants in the process. The appeal is swashbuckling momentum—ambushes, disguises, daring rescues—grounded by a clear moral line. It can skew family-friendly adventure or gritty rebellion, but it needs camaraderie and a villain worth stealing from.',
      difficulty: 'medium',
      estimatedBudget: { min: 30000000, max: 120000000 },
      themes: ['Justice', 'Rebellion', 'Camaraderie'],
      targetAudience: ['Family', 'General'],
      adaptationNotes: 'Tone can be swashbuckling or gritty.',
      suggestedCharacters: [
        { id: 'robin', name: 'Robin Hood', importance: 'lead', requiredType: 'actor', ageRange: [25, 45] },
        { id: 'marian', name: 'Maid Marian', importance: 'supporting', requiredType: 'actor', ageRange: [20, 40] },
        { id: 'littlejohn', name: 'Little John', importance: 'supporting', requiredType: 'actor', ageRange: [25, 55] },
        { id: 'sheriff', name: 'Sheriff of Nottingham', importance: 'supporting', requiredType: 'actor', ageRange: [30, 60] },
        { id: 'cameo-bard', name: 'Traveling Bard (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-5',
      title: 'King Arthur',
      author: 'British Legend',
      genre: ['Fantasy', 'Adventure'],
      description: 'A legend of kingship, loyalty, and betrayal—where a single ideal (the Round Table) is constantly tested by human flaws. The story can be grand high fantasy or grounded political drama, but it always wants a strong sense of myth and consequence. Big battles are optional; the real scale comes from rival vows, doomed romances, and destinies that feel heavier than any sword.',
      difficulty: 'hard',
      estimatedBudget: { min: 60000000, max: 180000000 },
      themes: ['Honor', 'Destiny', 'Betrayal'],
      targetAudience: ['General'],
      adaptationNotes: 'High fantasy or grounded medieval drama both work.',
      suggestedCharacters: [
        { id: 'arthur', name: 'Arthur', importance: 'lead', requiredType: 'actor', ageRange: [20, 40] },
        { id: 'merlin', name: 'Merlin', importance: 'supporting', requiredType: 'actor', ageRange: [35, 80] },
        { id: 'guinevere', name: 'Guinevere', importance: 'supporting', requiredType: 'actor', ageRange: [20, 40] },
        { id: 'lancelot', name: 'Lancelot', importance: 'supporting', requiredType: 'actor', ageRange: [20, 45] },
        { id: 'cameo-herald', name: 'Royal Herald (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [20, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-6',
      title: 'Alice in Wonderland',
      author: 'Lewis Carroll',
      genre: ['Fantasy', 'Family'],
      description: 'A young wanderer tumbles into a dreamlike world where logic is optional and every character feels like a riddle. The adaptation challenge is tone: it works best when it’s funny, uncanny, and visually inventive without turning into noise. It can be animated, live-action, or surreal modern fantasy—keep the whimsy sharp and the emotional through-line simple.',
      difficulty: 'medium',
      estimatedBudget: { min: 30000000, max: 150000000 },
      themes: ['Imagination', 'Identity'],
      targetAudience: ['Family', 'General'],
      adaptationNotes: 'Animated, live-action, or surreal modern takes.',
      suggestedCharacters: [
        { id: 'alice', name: 'Alice', importance: 'lead', requiredType: 'actor', ageRange: [10, 18] },
        { id: 'hatter', name: 'Mad Hatter', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
        { id: 'queen', name: 'Queen of Hearts', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
        { id: 'cameo-narrator', name: 'Narrator (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [25, 80] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-7',
      title: 'The Wizard of Oz',
      author: 'L. Frank Baum',
      genre: ['Fantasy', 'Family', 'Adventure'],
      description: 'A displaced outsider crosses a fantastical landscape, gathering unlikely allies and learning what they already had all along. The material is flexible—musical warmth, fairy-tale adventure, or darker reimagining—but it needs strong character archetypes and a clear “home” theme. It succeeds when the world feels vivid and coherent instead of purely random.',
      difficulty: 'medium',
      estimatedBudget: { min: 40000000, max: 160000000 },
      themes: ['Home', 'Courage', 'Friendship'],
      targetAudience: ['Family', 'General'],
      adaptationNotes: 'Classic musical or darker reimagining.',
      suggestedCharacters: [
        { id: 'dorothy', name: 'Dorothy', importance: 'lead', requiredType: 'actor', ageRange: [10, 20] },
        { id: 'scarecrow', name: 'Scarecrow', importance: 'supporting', requiredType: 'actor', ageRange: [18, 60] },
        { id: 'tinman', name: 'Tin Man', importance: 'supporting', requiredType: 'actor', ageRange: [18, 60] },
        { id: 'lion', name: 'Cowardly Lion', importance: 'supporting', requiredType: 'actor', ageRange: [18, 60] },
        { id: 'cameo-munchkin', name: 'Munchkin Mayor (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-8',
      title: 'Peter Pan',
      author: 'J. M. Barrie',
      genre: ['Fantasy', 'Family', 'Adventure'],
      description: 'A timeless fantasy about refusing to grow up—equal parts wonder and melancholy. It can be staged as bright family adventure or as bittersweet coming-of-age, but it needs a sense of flight, danger, and longing. The emotional key is the contrast between freedom and responsibility, with a villain who’s fun to hate and a heroine who carries the stakes.',
      difficulty: 'medium',
      estimatedBudget: { min: 30000000, max: 120000000 },
      themes: ['Youth', 'Freedom', 'Responsibility'],
      targetAudience: ['Family', 'General'],
      adaptationNotes: 'Lighthearted or poignant coming-of-age angle.',
      suggestedCharacters: [
        { id: 'peter', name: 'Peter Pan', importance: 'lead', requiredType: 'actor', ageRange: [12, 25] },
        { id: 'wendy', name: 'Wendy', importance: 'supporting', requiredType: 'actor', ageRange: [10, 20] },
        { id: 'hook', name: 'Captain Hook', importance: 'supporting', requiredType: 'actor', ageRange: [25, 65] },
        { id: 'cameo-narrator2', name: 'London Narrator (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [25, 80] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-9',
      title: 'Moby-Dick',
      author: 'Herman Melville',
      genre: ['Adventure', 'Drama'],
      description: 'A sea-epic powered by obsession: one captain’s vendetta turns a voyage into a slow-motion disaster. The challenge is scale—weather, ships, and the feeling of isolation—balanced with character tension that keeps the story personal. It can be staged as grand adventure or intimate survival drama, but it needs a lead performance that makes obsession believable rather than cartoonish.',
      difficulty: 'hard',
      estimatedBudget: { min: 40000000, max: 140000000 },
      themes: ['Obsession', 'Nature', 'Fate'],
      targetAudience: ['General', 'Adult'],
      adaptationNotes: 'Sea epic or intimate survival drama.',
      suggestedCharacters: [
        { id: 'ahab', name: 'Ahab', importance: 'lead', requiredType: 'actor', ageRange: [35, 70] },
        { id: 'ishmael', name: 'Ishmael', importance: 'supporting', requiredType: 'actor', ageRange: [20, 45] },
        { id: 'queequeg', name: 'Queequeg', importance: 'supporting', requiredType: 'actor', ageRange: [20, 50] },
        { id: 'cameo-harbor', name: 'Harbor Master (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [30, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-10',
      title: 'The Odyssey',
      author: 'Homer',
      genre: ['Mythology', 'Adventure', 'Fantasy'],
      description: 'A mythic homecoming journey packed with monsters, temptations, and hard-earned cunning. The material loves big set pieces, but it’s really about endurance: the cost of survival and what “home” means after war and wandering. It can be adapted as a classical epic or a modern reimagining, as long as the structure remains a chain of trials that test identity.',
      difficulty: 'hard',
      estimatedBudget: { min: 70000000, max: 200000000 },
      themes: ['Perseverance', 'Cunning', 'Homecoming'],
      targetAudience: ['General'],
      adaptationNotes: 'Mythic epic or modern odyssey reinterpretation.',
      suggestedCharacters: [
        { id: 'odysseus', name: 'Odysseus', importance: 'lead', requiredType: 'actor', ageRange: [25, 55] },
        { id: 'penelope', name: 'Penelope', importance: 'supporting', requiredType: 'actor', ageRange: [20, 50] },
        { id: 'athena', name: 'Athena', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
        { id: 'cameo-bard2', name: 'Court Bard (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-11',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      genre: ['Romance', 'Drama'],
      description: 'A romantic social comedy where reputation, pride, and class pressure collide with genuine connection. The dialogue is the engine—barbed politeness, misunderstandings that feel earned, and slow shifts in perception as characters learn their own blind spots. It adapts beautifully as lush period drama or modernized ensemble romance, but it needs sharp writing and emotional restraint.',
      difficulty: 'easy',
      estimatedBudget: { min: 15000000, max: 40000000 },
      themes: ['Love', 'Class', 'Pride'],
      targetAudience: ['General'],
      adaptationNotes: 'Classic period or modernized social rom-drama.',
      suggestedCharacters: [
        { id: 'elizabeth', name: 'Elizabeth Bennet', importance: 'lead', requiredType: 'actor', ageRange: [18, 35] },
        { id: 'darcy', name: 'Mr. Darcy', importance: 'supporting', requiredType: 'actor', ageRange: [20, 40] },
        { id: 'mrsbennet', name: 'Mrs. Bennet', importance: 'minor', requiredType: 'actor', ageRange: [35, 65] },
        { id: 'cameo-baller', name: 'Ball MC (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [25, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
      ]
    },
    {
      id: 'pd-12',
      title: 'Huckleberry Finn',
      author: 'Mark Twain',
      genre: ['Adventure', 'Drama'],
      description: 'A river journey that starts as escape and becomes a moral awakening. The story works as adventure, drama, or character road movie, but it needs a clear sense of place and an honest look at the choices people make under social pressure. Handle the material with care: the heart is the bond between travelers and the cost of doing the right thing.',
      difficulty: 'easy',
      estimatedBudget: { min: 12000000, max: 35000000 },
      themes: ['Freedom', 'Friendship', 'Morality'],
      targetAudience: ['Family', 'General'],
      adaptationNotes: 'Coming-of-age road adventure.',
      suggestedCharacters: [
        { id: 'huck', name: 'Huck', importance: 'lead', requiredType: 'actor', ageRange: [10, 18] },
        { id: 'jim', name: 'Jim', importance: 'supporting', requiredType: 'actor', ageRange: [25, 60] },
        { id: 'cameo-ferryman', name: 'River Ferryman (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [25, 70] },
        { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director', ageRange: [30, 65] }
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
  static getBasePublicDomainIPs(count: number = 20): PublicDomainIP[] {
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

    // No duplicates - return only unique sources
    return mapped.slice(0, Math.min(count, mapped.length));
  }

  static generateInitialPublicDomainIPs(count: number = 20, mods?: ModBundle): PublicDomainIP[] {
    const base = PublicDomainGenerator.getBasePublicDomainIPs(count);
    const bundle = mods ?? getModBundle();
    return applyPatchesByKey(base, getPatchesForEntity(bundle, 'publicDomainIP'), (p) => p.id);
  }
}