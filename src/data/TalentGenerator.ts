// Comprehensive Talent Generation System
import { TalentPerson, Genre, TalentAgent, Race } from '@/types/game';
import { NATIONALITY_OPTIONS, RACE_OPTIONS } from '@/utils/demographics';

interface BiographyTemplate {
  careerPath: string;
  breakthrough: string;
  struggles: string;
  specialization: string;
  currentStatus: string;
  personality: string;
  controversies?: string;
  awards?: string;
}

const FIRST_NAMES_MALE = [
  'Alexander', 'Benjamin', 'Christopher', 'Daniel', 'Edward', 'Felix', 'Gabriel', 'Harrison', 'Isaac', 'James',
  'Katherine', 'Leonardo', 'Marcus', 'Nicholas', 'Oliver', 'Patrick', 'Quinn', 'Robert', 'Sebastian', 'Theodore',
  'Vincent', 'William', 'Xavier', 'Zachary', 'Adrian', 'Blake', 'Cameron', 'Dominic', 'Ethan', 'Francisco',
  'Griffin', 'Hunter', 'Ivan', 'Julian', 'Knox', 'Liam', 'Mason', 'Noah', 'Oscar', 'Phoenix'
];

const FIRST_NAMES_FEMALE = [
  'Adelaide', 'Beatrice', 'Camilla', 'Delphine', 'Elena', 'Francesca', 'Genevieve', 'Helena', 'Isabella', 'Josephine',
  'Katherine', 'Lillian', 'Margaret', 'Natalie', 'Ophelia', 'Penelope', 'Quinn', 'Rosalind', 'Sophia', 'Theodora',
  'Valencia', 'Winifred', 'Ximena', 'Yasmin', 'Zara', 'Aurora', 'Bianca', 'Celeste', 'Diana', 'Evangeline',
  'Flora', 'Grace', 'Harper', 'Iris', 'Juliet', 'Kiara', 'Luna', 'Maya', 'Nina', 'Oriana'
];

const LAST_NAMES = [
  'Sterling', 'Blackwood', 'Hartwell', 'Montrose', 'Ashford', 'Beaumont', 'Carrington', 'Dalton', 'Everett', 'Fairfax',
  'Grayson', 'Hawthorne', 'Ingram', 'Jensen', 'Kensington', 'Lancaster', 'Morrison', 'Newport', 'Oakley', 'Preston',
  'Quincy', 'Rothwell', 'Sinclair', 'Thornton', 'Underwood', 'Vanderbilt', 'Wellington', 'Winters', 'Yorke', 'Zelinski',
  'Chen', 'Rodriguez', 'Williams', 'Anderson', 'Martinez', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King'
];

const PERSONALITY_TRAITS = [
  'Method Actor', 'Charismatic', 'Perfectionist', 'Media Darling', 'Reclusive Genius', 'Party Animal', 'Intellectual',
  'Box Office Draw', 'Critics\' Favorite', 'Versatile', 'Unpredictable', 'Professional', 'Demanding', 'Collaborative',
  'Eccentric', 'Intense', 'Charming', 'Controversial', 'Mysterious', 'Ambitious', 'Humble', 'Egotistical',
  'Vulnerable', 'Powerful', 'Quirky', 'Sophisticated', 'Raw Talent', 'Trained Classical', 'Natural Born Star',
  'Character Actor', 'Leading Material', 'Supporting Specialist', 'Voice Actor', 'Physical Performer', 'Dramatic Range'
];

const AWARDS_LIST = [
  'Crown Award', 'Crystal Ring Award', 'Performers Guild Award', 'Britannia Screen Award', 'Critics Circle Award', 'Beacon TV Award', 'Stage Spotlight Award',
  'Riviera Golden Palm', 'Lagoon Golden Lion', 'Summit Grand Jury Prize', 'Independent Vision Prize', 'Screen Performers Guild',
  'Directors Circle Award', 'Writers Circle Award', 'Audience Choice Award', 'Pop Culture Movie Award', 'Youth Choice Award',
  'Starlight Genre Award', 'Rising Artist Award', 'Breakthrough Performance'
];

const CAREER_STAGES = ['unknown', 'rising', 'established', 'veteran', 'legend'] as const;

const BIOGRAPHY_TEMPLATES: BiographyTemplate[] = [
  {
    careerPath: "Started in small independent films",
    breakthrough: "caught attention with a breakout performance in",
    struggles: "overcame early typecasting concerns",
    specialization: "known for bringing emotional depth to complex characters",
    currentStatus: "actively seeking challenging roles",
    personality: "described by colleagues as deeply committed to craft"
  },
  {
    careerPath: "Discovered through social media viral videos",
    breakthrough: "landed first major role after",
    struggles: "navigated the transition from online fame to serious acting",
    specialization: "brings fresh energy to contemporary stories",
    currentStatus: "building credibility in dramatic roles",
    personality: "maintains strong connection with younger audiences"
  },
  {
    careerPath: "Trained at prestigious dramatic arts conservatory",
    breakthrough: "earned critical acclaim for",
    struggles: "balanced commercial success with artistic integrity",
    specialization: "masterful in period pieces and classical adaptations",
    currentStatus: "selective about projects, focusing on quality",
    personality: "respected for professional dedication and craft"
  },
  {
    careerPath: "Rose through television before transitioning to film",
    breakthrough: "made the jump to features with",
    struggles: "worked to shed television actor stigma",
    specialization: "excels in character-driven narratives",
    currentStatus: "established as reliable dramatic performer",
    personality: "known for collaborative approach and work ethic"
  },
  {
    careerPath: "Started as child actor and successfully transitioned",
    breakthrough: "proved adult acting chops in",
    struggles: "overcame public scrutiny during teenage years",
    specialization: "brings authenticity to coming-of-age stories",
    currentStatus: "emerged as serious adult performer",
    personality: "resilient and grounded despite early fame"
  },
  {
    careerPath: "International background brought unique perspective",
    breakthrough: "gained recognition for multilingual performance in",
    struggles: "navigated cultural barriers in Hollywood",
    specialization: "adds global authenticity to diverse stories",
    currentStatus: "bridge between international and domestic markets",
    personality: "culturally aware and linguistically gifted"
  },
  {
    careerPath: "Background in theater before screen work",
    breakthrough: "translated stage success to screen in",
    struggles: "adapted theatrical training to camera work",
    specialization: "powerful presence in dialogue-heavy scenes",
    currentStatus: "balances stage and screen commitments",
    personality: "brings classical training to modern stories"
  },
  {
    careerPath: "Late bloomer who started acting in their thirties",
    breakthrough: "surprised industry with natural talent in",
    struggles: "competed against actors with decades more experience",
    specialization: "authentic portrayal of mature characters",
    currentStatus: "proving age is no barrier to success",
    personality: "brings life experience to every role"
  },
  {
    careerPath: "Former athlete who transitioned to acting",
    breakthrough: "leveraged physical abilities in",
    struggles: "developed acting skills while maintaining physical demands",
    specialization: "convincing in action sequences and sports dramas",
    currentStatus: "expanding range beyond physical roles",
    personality: "disciplined and competitive, applies athletic mindset to craft"
  },
  {
    careerPath: "Music background informed acting approach",
    breakthrough: "showcased dual talents in",
    struggles: "balanced music career with acting ambitions",
    specialization: "natural rhythm and timing in performances",
    currentStatus: "successfully managing multiple entertainment careers",
    personality: "creative and versatile, approaches roles with artistic sensibility"
  },
  {
    careerPath: "Worked behind the camera before stepping in front of it",
    breakthrough: "won the industry over with",
    struggles: "learned to navigate politics without losing their voice",
    specialization: "brings a director’s eye to performance choices",
    currentStatus: "seeking collaborators who will take risks",
    personality: "quietly intense, with a reputation for thorough preparation"
  },
  {
    careerPath: "Built a reputation on short films and micro-budgets",
    breakthrough: "broke out after premiering",
    struggles: "survived early setbacks and a few harsh reviews",
    specialization: "turns small moments into audience favorites",
    currentStatus: "riding momentum into bigger productions",
    personality: "open-minded and relentlessly curious on set"
  },
  {
    careerPath: "Second-generation industry kid who refused the easy path",
    breakthrough: "proved they belonged with",
    struggles: "worked to escape the shadow of famous connections",
    specialization: "finds surprising humanity in flawed characters",
    currentStatus: "leaning into more ambitious material",
    personality: "known for disarming sincerity in interviews"
  },
  {
    careerPath: "Came up through improv and sketch comedy circuits",
    breakthrough: "unexpectedly turned heads with",
    struggles: "had to convince casting directors they could play it straight",
    specialization: "mixes precision timing with emotional honesty",
    currentStatus: "expanding into more dramatic territory",
    personality: "generous with scene partners and allergic to ego"
  },
  {
    careerPath: "Started as a stunt performer before pursuing principal roles",
    breakthrough: "earned wider recognition through",
    struggles: "trained relentlessly to match physicality with nuance",
    specialization: "brings lived-in realism to high-stakes scenes",
    currentStatus: "looking for roles that challenge expectations",
    personality: "disciplined, focused, and surprisingly funny between takes"
  },
  {
    careerPath: "Moved from writing rooms into directing and development",
    breakthrough: "made a name by shepherding",
    struggles: "balanced creative ambition with studio realities",
    specialization: "elevates dialogue and subtext over spectacle",
    currentStatus: "assembling projects built around strong scripts",
    personality: "thoughtful, sharp, and famously good at notes"
  }
];

const CONTROVERSY_TEMPLATES = [
  "faced media scrutiny over",
  "weathered controversy regarding", 
  "overcame personal struggles with",
  "rebuilt reputation after",
  "learned from early career mistakes involving",
  "matured following",
  "emerged stronger after dealing with",
  "used personal challenges to inform later performances"
];

export class TalentGenerator {
  private usedNames = new Set<string>();
  private usedBiographies = new Set<string>();

  private selectRace(): Race {
    return RACE_OPTIONS[Math.floor(Math.random() * RACE_OPTIONS.length)] as Race;
  }

  private selectNationality(): string {
    return NATIONALITY_OPTIONS[Math.floor(Math.random() * NATIONALITY_OPTIONS.length)];
  }
  
  generateName(gender: 'male' | 'female' | 'non-binary'): string {
    let attempts = 0;
    let name: string;
    
    do {
      const firstNames = gender === 'female' ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      name = `${firstName} ${lastName}`;
      attempts++;
    } while (this.usedNames.has(name) && attempts < 100);
    
    this.usedNames.add(name);
    return name;
  }

  generateBiography(talent: Partial<TalentPerson>, template: BiographyTemplate): string {
    const age = talent.age || 30;
    const experience = talent.experience || 5;
    const reputation = talent.reputation || 50;
    const careerStage = this.determineCareerStage(age, experience, reputation);

    const name = talent.name || 'They';
    const primaryGenre = talent.genres?.[0] || 'drama';
    const roleLabel = talent.type === 'director' ? 'filmmaker' : 'performer';

    const pronouns = (() => {
      const g = (talent as any).gender;
      if (g === 'Male') return { subject: 'he', object: 'him', possessive: 'his' };
      if (g === 'Female') return { subject: 'she', object: 'her', possessive: 'her' };
      return { subject: 'they', object: 'them', possessive: 'their' };
    })();

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const projectDescriptors = [
      'critically acclaimed',
      'festival-favorite',
      'buzzed-about',
      'surprisingly mainstream',
      'risk-taking',
      'quietly devastating',
      'unexpectedly funny',
      'audience-approved'
    ];

    const pivotPhrases = [
      'Along the way,',
      'In the process,',
      'On the climb,',
      'Off the red carpet,',
      'Behind the scenes,'
    ];

    const stageLines = {
      unknown: [`still more rumor than résumé, but ${pronouns.possessive} momentum is real.`],
      rising: [`widely seen as a name-to-watch in ${primaryGenre}.`],
      established: [`now a steady presence in ${primaryGenre} projects.`],
      veteran: [`a veteran presence with instincts that younger crews lean on.`],
      legend: [`spoken about like a living reference point in the industry.`]
    } as const;

    const closers = [
      `These days, ${pronouns.subject} is ${template.currentStatus} and is ${template.personality}.`,
      `${name} is ${template.currentStatus}, and is ${template.personality}.`,
      `Now ${pronouns.subject} is ${template.currentStatus}—${template.personality}.`
    ];

    const buildBio = (): string => {
      const formatRoll = Math.random();
      const descriptor = pick(projectDescriptors);

      let bio = '';

      if (formatRoll < 0.34) {
        bio += `${template.careerPath}, ${name} ${template.breakthrough} a ${descriptor} ${primaryGenre} project. `;
      } else if (formatRoll < 0.67) {
        bio += `Known for ${template.specialization}, ${name} ${template.breakthrough} a ${descriptor} ${primaryGenre} project. `;
      } else {
        const trait = pick(PERSONALITY_TRAITS).toLowerCase();
        bio += `Industry chatter tags ${name} as a ${trait} ${roleLabel}. ${pronouns.subject[0].toUpperCase()}${pronouns.subject.slice(1)} ${template.breakthrough} a ${descriptor} ${primaryGenre} project. `;
      }

      bio += `${pivotPhrases[Math.floor(Math.random() * pivotPhrases.length)]} ${template.struggles}, and is ${template.specialization}. `;

      if (age < 25) {
        bio += `At ${age}, ${pronouns.subject} already shows unusual poise under pressure. `;
      } else if (age > 50) {
        bio += `With ${experience} years of experience, ${pronouns.subject} brings quiet authority to every set. `;
      }

      if (reputation > 80) {
        bio += `Colleagues praise ${pronouns.possessive} professionalism and focus. `;
        if (Math.random() < 0.25) {
          bio += `In recent years ${pronouns.subject} ${CONTROVERSY_TEMPLATES[Math.floor(Math.random() * CONTROVERSY_TEMPLATES.length)]} personal matters, and handled it with rare restraint. `;
        }
      } else if (reputation < 40) {
        bio += `${pronouns.subject[0].toUpperCase()}${pronouns.subject.slice(1)} is working to rebuild trust after ${CONTROVERSY_TEMPLATES[Math.floor(Math.random() * CONTROVERSY_TEMPLATES.length)]} past controversies. `;
      }

      const stage = (stageLines as any)[careerStage] || stageLines.established;
      bio += `In industry terms, ${pronouns.subject} is ${pick(stage)} `;

      bio += pick(closers);
      return bio.trim();
    };

    let finalBio = buildBio();
    let attempts = 0;

    while (this.usedBiographies.has(finalBio) && attempts < 12) {
      finalBio = buildBio();
      attempts++;
    }

    if (this.usedBiographies.has(finalBio)) {
      finalBio += ` Colleagues often cite ${pronouns.possessive} ${pick(PERSONALITY_TRAITS).toLowerCase()} streak as a defining trait.`;
    }

    this.usedBiographies.add(finalBio);
    return finalBio;
  }

  determineCareerStage(age: number, experience: number, reputation: number): typeof CAREER_STAGES[number] {
    if (experience < 2 || reputation < 30) return 'unknown';
    if (experience < 8 && age < 30) return 'rising';
    if (experience < 15 && reputation < 80) return 'established';
    if (experience >= 15 || age > 50) return 'veteran';
    if (reputation > 90 && experience > 20) return 'legend';
    return 'established';
  }

  generateMarketValue(age: number, experience: number, reputation: number, type: 'actor' | 'director'): number {
    let baseValue = type === 'director' ? 2000000 : 1000000;
    
    // Experience multiplier
    baseValue *= Math.pow(1.15, experience);
    
    // Reputation multiplier
    baseValue *= (reputation / 50);
    
    // Age factor (peak earning years 25-45 for actors, 35-55 for directors)
    const optimalAge = type === 'director' ? 45 : 35;
    const ageFactor = 1 - Math.abs(age - optimalAge) * 0.01;
    baseValue *= Math.max(0.3, ageFactor);
    
    // Add randomness
    baseValue *= (0.8 + Math.random() * 0.4);
    
    // Cap values
    return Math.min(baseValue, type === 'director' ? 15000000 : 20000000);
  }

  generateAwards(careerStage: typeof CAREER_STAGES[number], reputation: number): string[] {
    const awards: string[] = [];
    const awardProbability = {
      'unknown': 0,
      'rising': 0.2,
      'established': 0.5,
      'veteran': 0.8,
      'legend': 0.95
    }[careerStage];
    
    if (Math.random() < awardProbability) {
      const numAwards = Math.floor(Math.random() * 3) + 1;
      const availableAwards = [...AWARDS_LIST];
      
      for (let i = 0; i < numAwards && availableAwards.length > 0; i++) {
        const index = Math.floor(Math.random() * availableAwards.length);
        awards.push(availableAwards.splice(index, 1)[0]);
      }
    }
    
    return awards;
  }

  generateTraits(personality: string[], careerStage: typeof CAREER_STAGES[number]): string[] {
    const numTraits = Math.floor(Math.random() * 4) + 2;
    const availableTraits = [...PERSONALITY_TRAITS];
    const traits: string[] = [];
    
    for (let i = 0; i < numTraits && availableTraits.length > 0; i++) {
      const index = Math.floor(Math.random() * availableTraits.length);
      traits.push(availableTraits.splice(index, 1)[0]);
    }
    
    return traits;
  }

  generateActor(): TalentPerson {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const age = 18 + Math.floor(Math.random() * 47); // 18-65
    const experience = Math.min(age - 16, Math.floor(Math.random() * 25));
    const reputation = Math.max(10, Math.floor(Math.random() * 90) + (experience * 2));
    const careerStage = this.determineCareerStage(age, experience, reputation);

    const name = this.generateName(gender);
    const genres = this.selectGenres(2 + Math.floor(Math.random() * 3));
    const marketValue = this.generateMarketValue(age, experience, reputation, 'actor');
    const awards: any[] = [];
    const traits = this.generateTraits([], careerStage);

    const template = BIOGRAPHY_TEMPLATES[Math.floor(Math.random() * BIOGRAPHY_TEMPLATES.length)];

    const fame = Math.min(100, Math.round(reputation * 0.7 + (awards.length * 5)));

    const actor: TalentPerson = {
      id: `actor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type: 'actor',
      gender: gender === 'male' ? 'Male' : 'Female',
      race: this.selectRace(),
      nationality: this.selectNationality(),
      age,
      experience,
      reputation,
      marketValue,
      contractStatus: 'available',
      genres,
      awards,
      traits,
      careerStage,
      agent: this.selectAgent(),
      availability: {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      // Advanced talent management fields
      burnoutLevel: Math.floor(Math.random() * 30), // 0-30 starting burnout
      studioLoyalty: {},
      chemistry: {},
      futureHolds: [],
      recentProjects: [],
      // Fame & filmography
      fame,
      filmography: []
    };
    
    // Add biography as a custom property
    (actor as any).biography = this.generateBiography(actor, template);
    
    return actor;
  }

  generateDirector(): TalentPerson {
    const gender = Math.random() < 0.7 ? 'male' : 'female'; // Industry reality
    const age = 25 + Math.floor(Math.random() * 35); // 25-60
    const experience = Math.min(age - 20, Math.floor(Math.random() * 30));
    const reputation = Math.max(20, Math.floor(Math.random() * 80) + (experience * 3));
    const careerStage = this.determineCareerStage(age, experience, reputation);

    const name = this.generateName(gender);
    const genres = this.selectGenres(1 + Math.floor(Math.random() * 2));
    const marketValue = this.generateMarketValue(age, experience, reputation, 'director');
    const awards: any[] = [];
    const traits = this.generateTraits([], careerStage);

    const template = BIOGRAPHY_TEMPLATES[Math.floor(Math.random() * BIOGRAPHY_TEMPLATES.length)];

    const fame = Math.min(100, Math.round(reputation * 0.6 + (awards.length * 4)));

    const director: TalentPerson = {
      id: `director-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type: 'director',
      gender: gender === 'male' ? 'Male' : 'Female',
      race: this.selectRace(),
      nationality: this.selectNationality(),
      age,
      experience,
      reputation,
      marketValue,
      contractStatus: 'available',
      genres,
      awards,
      traits,
      careerStage,
      agent: this.selectAgent(),
      availability: {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      // Advanced talent management fields
      burnoutLevel: Math.floor(Math.random() * 20), // Directors have lower starting burnout
      studioLoyalty: {},
      chemistry: {},
      futureHolds: [],
      recentProjects: [],
      // Fame & filmography
      fame,
      filmography: []
    };
    
    // Add biography and director-specific traits
    (director as any).biography = this.generateBiography(director, template);
    (director as any).directingStyle = this.selectDirectingStyle();
    (director as any).temperament = this.selectTemperament();
    (director as any).budgetApproach = this.selectBudgetApproach();
    
    return director;
  }

  private selectGenres(count: number): Genre[] {
    const allGenres: Genre[] = [
      'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
      'romance', 'sci-fi', 'fantasy', 'documentary', 'animation',
      'musical', 'western', 'war', 'biography', 'crime', 'mystery',
      'superhero', 'family', 'sports', 'historical'
    ];
    
    const selected: Genre[] = [];
    const available = [...allGenres];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
  }

  private selectAgent(): TalentAgent {
    const agencies = [
      { name: 'Northstar Talent', powerLevel: 9, commission: 10 },
      { name: 'Silverline Agency', powerLevel: 9, commission: 10 },
      { name: 'Summit Artists', powerLevel: 8, commission: 10 },
      { name: 'Keystone Management', powerLevel: 7, commission: 10 },
      { name: 'Redwood Representation', powerLevel: 6, commission: 8 },
      { name: 'Apex Partners', powerLevel: 5, commission: 8 },
      { name: 'Lantern Group', powerLevel: 4, commission: 8 },
      { name: 'Independent', powerLevel: 3, commission: 5 }
    ];
    
    const agentNames = [
      'Morgan Sterling', 'Harper Chen', 'Casey Rodriguez', 'Avery Hartwell',
      'Jordan Kim', 'Riley Foster', 'Cameron Wilson', 'Parker Sinclair',
      'Taylor Ashford', 'Quinn Martinez', 'Rowan Lancaster', 'Sage Davis'
    ];
    
    const agency = agencies[Math.floor(Math.random() * agencies.length)];
    const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];
    
    return {
      id: `agent_${Math.random().toString(36).substr(2, 9)}`,
      name: agentName,
      agency: agency.name,
      powerLevel: agency.powerLevel + Math.floor(Math.random() * 2) - 1, // ±1 variation
      commission: agency.commission,
      specialties: this.selectGenres(Math.floor(Math.random() * 3) + 1),
      clientList: [], // Will be populated later
      reputation: Math.floor(Math.random() * 50) + 50, // 50-100
      connectionStrength: Math.floor(Math.random() * 40) + 60 // 60-100
    };
  }

  private selectDirectingStyle(): string {
    const styles = [
      'Visual Storyteller', 'Actor\'s Director', 'Technical Perfectionist', 'Improvisational',
      'Classical Narrative', 'Experimental', 'Genre Specialist', 'Character-Driven',
      'Action Choreographer', 'Intimate Realist', 'Epic Scope', 'Minimalist'
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private selectTemperament(): string {
    const temperaments = [
      'Calm and Methodical', 'Passionate and Intense', 'Collaborative', 'Demanding Perfectionist',
      'Easygoing', 'Visionary Dreamer', 'Practical Problem-Solver', 'Inspiring Leader',
      'Detail-Oriented', 'Big Picture Thinker', 'Patient Teacher', 'Decisive Commander'
    ];
    return temperaments[Math.floor(Math.random() * temperaments.length)];
  }

  private selectBudgetApproach(): string {
    const approaches = [
      'Fiscally Responsible', 'Creative Over Cost', 'Efficient Operator', 'Value Maximizer',
      'Big Spender', 'Penny Pincher', 'Strategic Investor', 'Resource Optimizer'
    ];
    return approaches[Math.floor(Math.random() * approaches.length)];
  }

  generateTalentPool(actorCount: number = 300, directorCount: number = 50): TalentPerson[] {
    const talent: TalentPerson[] = [];
    
    // Generate actors
    for (let i = 0; i < actorCount; i++) {
      talent.push(this.generateActor());
    }
    
    // Generate directors
    for (let i = 0; i < directorCount; i++) {
      talent.push(this.generateDirector());
    }
    
    return talent;
  }
}