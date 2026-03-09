// AI Studio System - Generates competing studios and their autonomous film releases
import { Studio, Genre, Project, Script } from '@/types/game';

interface StudioProfile {
  name: string;
  personality: string;
  budget: number;
  reputation: number;
  specialties: Genre[];
  businessTendency: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  releaseFrequency: number; // films per year
  brandIdentity: string;
  foundedYear?: number;
}

const STUDIO_PROFILES: StudioProfile[] = [
  {
    name: 'Crimson Peak Entertainment',
    personality: 'Edgy and provocative storytelling (with a marketing department that owns seventeen smoke machines)',
    budget: 45000000,
    reputation: 72,
    specialties: ['horror', 'thriller', 'mystery'],
    businessTendency: 'Mid-budget horror specialist with a cult following and a suspiciously large fake-blood line item',
    riskTolerance: 'aggressive',
    releaseFrequency: 8,
    brandIdentity: 'Dark atmospherics, psychological tension, and posters that are 90% fog'
  },
  {
    name: 'Golden Horizon Studios',
    personality: 'Nostalgic and heartwarming content (engineered to make your aunt cry on a plane)',
    budget: 75000000,
    reputation: 81,
    specialties: ['family', 'drama', 'biography'],
    businessTendency: 'Prestige pictures with awards potential and the safest possible third-act redemption',
    riskTolerance: 'conservative',
    releaseFrequency: 5,
    brandIdentity: 'Timeless stories, tasteful fonts, and a score that gently tells you what to feel'
  },
  {
    name: 'Velocity Pictures',
    personality: 'High-octane thrill rides (plot optional, momentum mandatory)',
    budget: 120000000,
    reputation: 68,
    specialties: ['action', 'adventure', 'sci-fi'],
    businessTendency: 'Spectacle-driven blockbusters, calibrated product placement, and trailers mixed at aircraft volume',
    riskTolerance: 'moderate',
    releaseFrequency: 6,
    brandIdentity: 'Cutting-edge visuals, intense sequences, and at least one shot of a vehicle doing something illegal'
  },
  {
    name: 'Moonbeam Independent',
    personality: 'Artistic and character-driven (two minutes of silence counts as a scene)',
    budget: 15000000,
    reputation: 85,
    specialties: ['drama', 'romance', 'documentary'],
    businessTendency: 'Festival circuit darlings, limited releases, and Q&As that become confessions',
    riskTolerance: 'moderate',
    releaseFrequency: 12,
    brandIdentity: 'Intimate storytelling, emerging talent, and posters that look like poetry homework'
  },
  {
    name: 'Apex Entertainment Group',
    personality: 'Commercial powerhouse (the cinematic universe has its own org chart)',
    budget: 200000000,
    reputation: 76,
    specialties: ['superhero', 'fantasy', 'action'],
    businessTendency: 'Franchise builder, tent-pole events, and release dates announced before scripts exist',
    riskTolerance: 'conservative',
    releaseFrequency: 4,
    brandIdentity: 'Spectacle for global audiences, synchronized trailers, and a logo reveal you can hear'
  },
  {
    name: 'Laughing Matter Productions',
    personality: 'Comedy-focused entertainment (tested until it is safely hilarious to everyone)',
    budget: 35000000,
    reputation: 64,
    specialties: ['comedy', 'family', 'romance'],
    businessTendency: 'Crowd-pleasing comedies and rom-coms with a third-act airport sprint clause',
    riskTolerance: 'moderate',
    releaseFrequency: 10,
    brandIdentity: 'Feel-good star vehicles, charming chaos, and taglines that promise “the comedy event”'
  },
  {
    name: 'Heritage Films',
    personality: 'Period pieces and literary adaptations (corsets, candles, and one devastating monologue)',
    budget: 60000000,
    reputation: 89,
    specialties: ['historical', 'biography', 'war'],
    businessTendency: 'Prestigious historical epics with authenticity consultants and a wardrobe department that could unionize',
    riskTolerance: 'conservative',
    releaseFrequency: 3,
    brandIdentity: 'Lavish productions, tasteful suffering, and prestige that smells faintly of parchment',
    foundedYear: 1965
  },
  {
    name: 'Neon Circuit Studios',
    personality: 'Tech-savvy and futuristic (believes every narrative problem can be solved with more holograms)',
    budget: 80000000,
    reputation: 71,
    specialties: ['sci-fi', 'animation', 'thriller'],
    businessTendency: 'Innovation in storytelling technology, experimental formats, and “beta” marketing campaigns',
    riskTolerance: 'aggressive',
    releaseFrequency: 7,
    brandIdentity: 'Future-forward narratives, digital swagger, and a color grade that looks like midnight energy drinks'
  },
  {
    name: 'Wildwood Pictures',
    personality: 'Outdoor adventures and sports (a drone shot for every emotion)',
    budget: 40000000,
    reputation: 66,
    specialties: ['adventure', 'sports', 'western'],
    businessTendency: 'Action-adventure in natural settings, inspirational training montages, and “based on a true hike” vibes',
    riskTolerance: 'moderate',
    releaseFrequency: 6,
    brandIdentity: 'Authentic outdoor spectacle, wide vistas, and motivational quotes over slow-motion snow'
  },
  {
    name: 'Midnight Society Films',
    personality: 'Cult and genre filmmaking (will absolutely release the four-hour director’s cut, unasked)',
    budget: 25000000,
    reputation: 78,
    specialties: ['horror', 'crime', 'mystery'],
    businessTendency: 'Distinctive genre pieces with strong following, aggressive midnight screenings, and “ending explained” discourse',
    riskTolerance: 'aggressive',
    releaseFrequency: 9,
    brandIdentity: 'A unique voice in genre filmmaking, plus a poster tagline that dares you to watch alone'
  },
  {
    name: 'Reboot Quarry Pictures',
    personality: 'Cheerfully shameless IP revivalists',
    budget: 130000000,
    reputation: 62,
    specialties: ['superhero', 'action', 'fantasy'],
    businessTendency: 'Reboots, requels, and “fresh takes” on familiar brands',
    riskTolerance: 'moderate',
    releaseFrequency: 3,
    brandIdentity: 'New logo, same movie, louder trailer'
  },
  {
    name: 'Saffron Kettle Cinema',
    personality: 'Serious posters, unserious sense of humor',
    budget: 25000000,
    reputation: 79,
    specialties: ['drama', 'comedy', 'romance'],
    businessTendency: 'Festival plays and sharp scripts with occasional accidental meme hits',
    riskTolerance: 'moderate',
    releaseFrequency: 4,
    brandIdentity: 'Human-scale stories with one perfect needle-drop'
  }
];

// Dynamic title generation keywords
const TITLE_KEYWORDS = {
  action: ['Strike', 'Fury', 'Impact', 'Storm', 'Fire', 'Steel', 'Thunder', 'Blade', 'Shadow', 'Phoenix'],
  drama: ['Heart', 'Soul', 'Truth', 'Light', 'Hope', 'Dream', 'Journey', 'Bridge', 'River', 'Mountain'],
  comedy: ['Love', 'Laugh', 'Crazy', 'Wild', 'Funny', 'Mad', 'Happy', 'Silly', 'Sweet', 'Bright'],
  horror: ['Dark', 'Blood', 'Fear', 'Terror', 'Night', 'Curse', 'Ghost', 'Demon', 'Dead', 'Evil'],
  romance: ['Love', 'Heart', 'Kiss', 'Sweet', 'Forever', 'Together', 'Promise', 'Dream', 'Dance', 'Song'],
  'sci-fi': ['Future', 'Star', 'Space', 'Time', 'Mind', 'Code', 'Digital', 'Cyber', 'Nova', 'Quantum'],
  thriller: ['Edge', 'Hunt', 'Chase', 'Kill', 'Run', 'Hide', 'Trap', 'Game', 'Web', 'Net'],
  fantasy: ['Magic', 'Dragon', 'Crown', 'Realm', 'Quest', 'Legend', 'Myth', 'Spell', 'Kingdom', 'Sword'],
  family: ['Home', 'Family', 'Together', 'Adventure', 'Magic', 'Wonder', 'Joy', 'Smile', 'Happy', 'Friends'],
  superhero: ['Hero', 'Guardian', 'Defender', 'Justice', 'Power', 'Shield', 'Force', 'League', 'Rising', 'Dawn']
};

const TITLE_MODIFIERS = [
  'The', 'Last', 'First', 'Final', 'Lost', 'Hidden', 'Secret', 'Forgotten', 'Rising', 'Falling',
  'Beyond', 'Above', 'Under', 'Dark', 'Bright', 'New', 'Old', 'Ancient', 'Modern', 'Future'
];

const TITLE_SUFFIXES = [
  'Returns', 'Rising', 'Reborn', 'Awakens', 'Begins', 'Ends', 'Forever', 'Again', 'Unleashed', 'Revealed',
  'Chronicles', 'Legacy', 'Destiny', 'Origins', 'Saga', 'Tales', 'Story', 'Legend', 'Myth', 'Code'
];

export class StudioGenerator {
  private usedTitles = new Set<string>();
  private studioReleaseSchedules = new Map<string, number>(); // Track weeks since last release

  generateFilmTitle(genre: Genre, studioName: string): string {
    const keywords = TITLE_KEYWORDS[genre] || TITLE_KEYWORDS.drama;
    let attempts = 0;
    let title: string;

    do {
      const structure = Math.random();
      
      if (structure < 0.3) {
        // Single word titles
        title = keywords[Math.floor(Math.random() * keywords.length)];
      } else if (structure < 0.6) {
        // Modifier + Keyword
        const modifier = TITLE_MODIFIERS[Math.floor(Math.random() * TITLE_MODIFIERS.length)];
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        title = `${modifier} ${keyword}`;
      } else {
        // Keyword + Suffix
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const suffix = TITLE_SUFFIXES[Math.floor(Math.random() * TITLE_SUFFIXES.length)];
        title = `${keyword} ${suffix}`;
      }
      
      attempts++;
    } while (this.usedTitles.has(title) && attempts < 50);

    // If we can't find a unique title, add studio name
    if (this.usedTitles.has(title)) {
      title = `${title}: ${studioName.split(' ')[0]} Edition`;
    }

    this.usedTitles.add(title);
    return title;
  }

  generateScript(genre: Genre, studioProfile: StudioProfile): Script {
    const budgetRanges = {
      conservative: { min: 0.3, max: 0.6 },
      moderate: { min: 0.5, max: 0.8 },
      aggressive: { min: 0.7, max: 1.0 }
    };

    const range = budgetRanges[studioProfile.riskTolerance];
    const budgetMultiplier = range.min + Math.random() * (range.max - range.min);
    const projectBudget = studioProfile.budget * budgetMultiplier;

    const title = this.generateFilmTitle(genre, studioProfile.name);

    return {
      id: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      genre,
      logline: this.generateLogline(genre, title),
      writer: this.generateWriterName(),
      pages: 90 + Math.floor(Math.random() * 40),
      quality: 30 + Math.floor(Math.random() * 70),
      budget: projectBudget,
      developmentStage: 'final',
      themes: this.generateThemes(genre),
      targetAudience: this.selectTargetAudience(genre),
      estimatedRuntime: 85 + Math.floor(Math.random() * 50),
      characteristics: this.generateCharacteristics(genre, studioProfile)
    };
  }

  private generateLogline(genre: Genre, title: string): string {
    const templates = {
      action: `When ${this.getRandomCharacter()} must ${this.getRandomAction()}, they discover ${this.getRandomTwist()}.`,
      drama: `A ${this.getRandomCharacter()} struggles to ${this.getRandomGoal()} while facing ${this.getRandomObstacle()}.`,
      comedy: `${this.getRandomCharacter()} finds themselves in ${this.getRandomSituation()} leading to ${this.getRandomOutcome()}.`,
      horror: `${this.getRandomCharacter()} encounters ${this.getRandomThreat()} in ${this.getRandomLocation()}.`,
      romance: `Two ${this.getRandomLovers()} must overcome ${this.getRandomObstacle()} to find ${this.getRandomEnding()}.`,
      'sci-fi': `In ${this.getRandomFuture()}, ${this.getRandomCharacter()} discovers ${this.getRandomTechnology()}.`,
      thriller: `${this.getRandomCharacter()} becomes trapped in ${this.getRandomDangerousSituation()}.`,
      fantasy: `${this.getRandomCharacter()} embarks on ${this.getRandomQuest()} in ${this.getRandomMagicalWorld()}.`
    };

    return templates[genre] || templates.drama;
  }

  private getRandomCharacter(): string {
    const characters = [
      'a determined detective', 'an unlikely hero', 'a skilled warrior', 'a brilliant scientist',
      'a troubled veteran', 'a young prodigy', 'a mysterious stranger', 'a desperate parent',
      'an ambitious lawyer', 'a retired assassin', 'a gifted artist', 'a hardened criminal'
    ];
    return characters[Math.floor(Math.random() * characters.length)];
  }

  private getRandomAction(): string {
    const actions = [
      'save their family', 'stop a conspiracy', 'clear their name', 'find the truth',
      'protect the innocent', 'uncover secrets', 'prevent disaster', 'seek revenge'
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  private getRandomTwist(): string {
    const twists = [
      'nothing is as it seems', 'their enemy is closer than they think', 'the real threat lies within',
      'their past holds the key', 'time is running out', 'they are not alone'
    ];
    return twists[Math.floor(Math.random() * twists.length)];
  }

  private getRandomGoal(): string {
    const goals = [
      'reconnect with their estranged child', 'overcome their fears', 'find redemption',
      'save their business', 'honor their legacy', 'discover their true identity'
    ];
    return goals[Math.floor(Math.random() * goals.length)];
  }

  private getRandomObstacle(): string {
    const obstacles = [
      'family disapproval', 'financial ruin', 'social prejudice', 'personal demons',
      'professional rivalry', 'health challenges', 'legal troubles', 'cultural differences'
    ];
    return obstacles[Math.floor(Math.random() * obstacles.length)];
  }

  private getRandomSituation(): string {
    const situations = [
      'a case of mistaken identity', 'an unexpected inheritance', 'a social media mix-up',
      'a workplace mishap', 'a travel disaster', 'a family reunion', 'a blind date gone wrong'
    ];
    return situations[Math.floor(Math.random() * situations.length)];
  }

  private getRandomOutcome(): string {
    const outcomes = [
      'hilarious consequences', 'unexpected romance', 'personal growth', 'family bonding',
      'new friendships', 'career opportunities', 'life-changing revelations'
    ];
    return outcomes[Math.floor(Math.random() * outcomes.length)];
  }

  private getRandomThreat(): string {
    const threats = [
      'an ancient curse', 'a supernatural entity', 'a serial killer', 'paranormal activity',
      'a deadly virus', 'demonic possession', 'a haunted location', 'mysterious disappearances'
    ];
    return threats[Math.floor(Math.random() * threats.length)];
  }

  private getRandomLocation(): string {
    const locations = [
      'an isolated cabin', 'an abandoned hospital', 'a small town', 'an old mansion',
      'a remote island', 'a dark forest', 'a subway tunnel', 'a college campus'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getRandomLovers(): string {
    const lovers = [
      'star-crossed lovers', 'childhood friends', 'business rivals', 'unlikely partners',
      'opposites', 'former enemies', 'coworkers', 'neighbors'
    ];
    return lovers[Math.floor(Math.random() * lovers.length)];
  }

  private getRandomEnding(): string {
    const endings = [
      'true love', 'happiness', 'their destiny', 'a new beginning',
      'forgiveness', 'acceptance', 'their soulmate', 'peace'
    ];
    return endings[Math.floor(Math.random() * endings.length)];
  }

  private getRandomFuture(): string {
    const futures = [
      'a dystopian future', 'the year 2087', 'a post-apocalyptic world', 'a space colony',
      'a cyberpunk city', 'an alternate timeline', 'a virtual reality', 'a parallel universe'
    ];
    return futures[Math.floor(Math.random() * futures.length)];
  }

  private getRandomTechnology(): string {
    const tech = [
      'a dangerous AI', 'time travel', 'mind control technology', 'alien contact',
      'genetic manipulation', 'interdimensional travel', 'consciousness transfer', 'reality manipulation'
    ];
    return tech[Math.floor(Math.random() * tech.length)];
  }

  private getRandomDangerousSituation(): string {
    const situations = [
      'a deadly game', 'a conspiracy', 'a terrorist plot', 'a murder scheme',
      'a kidnapping', 'corporate espionage', 'witness protection failure', 'identity theft'
    ];
    return situations[Math.floor(Math.random() * situations.length)];
  }

  private getRandomQuest(): string {
    const quests = [
      'a perilous journey', 'a sacred mission', 'a heroic quest', 'a magical adventure',
      'a dangerous expedition', 'a noble cause', 'a divine calling', 'an epic voyage'
    ];
    return quests[Math.floor(Math.random() * quests.length)];
  }

  private getRandomMagicalWorld(): string {
    const worlds = [
      'a forgotten realm', 'an enchanted kingdom', 'a mystical land', 'a magical dimension',
      'an ancient world', 'a fairy tale kingdom', 'a legendary empire', 'a mythical realm'
    ];
    return worlds[Math.floor(Math.random() * worlds.length)];
  }

  private generateWriterName(): string {
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Taylor'];
    const lastNames = ['Mitchell', 'Parker', 'Collins', 'Reed', 'Hayes', 'Brooks', 'Stone', 'Wells'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private generateThemes(genre: Genre): string[] {
    const themeMap = {
      action: ['justice', 'redemption', 'survival', 'loyalty'],
      drama: ['family', 'identity', 'loss', 'hope', 'growth'],
      comedy: ['friendship', 'love', 'self-discovery', 'acceptance'],
      horror: ['fear', 'isolation', 'survival', 'evil'],
      romance: ['love', 'commitment', 'sacrifice', 'destiny'],
      'sci-fi': ['technology', 'humanity', 'progress', 'ethics'],
      thriller: ['paranoia', 'trust', 'danger', 'mystery'],
      fantasy: ['heroism', 'magic', 'destiny', 'good vs evil']
    };

    const themes = themeMap[genre] || themeMap.drama;
    return themes.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  private selectTargetAudience(genre: Genre): 'general' | 'mature' | 'teen' | 'family' {
    const audienceMap = {
      horror: 'mature',
      family: 'family',
      superhero: 'teen',
      animation: 'family',
      war: 'mature',
      crime: 'mature',
      comedy: 'general',
      drama: 'general'
    };

    return audienceMap[genre] || 'general';
  }

  private generateCharacteristics(genre: Genre, studioProfile: StudioProfile): any {
    return {
      tone: this.selectTone(genre),
      pacing: this.selectPacing(genre),
      dialogue: this.selectDialogue(studioProfile.personality),
      visualStyle: this.selectVisualStyle(genre),
      commercialAppeal: 3 + Math.floor(Math.random() * 7),
      criticalPotential: 2 + Math.floor(Math.random() * 8),
      cgiIntensity: this.selectCGIIntensity(genre)
    };
  }

  private selectTone(genre: Genre): string {
    const toneMap = {
      horror: 'dark',
      comedy: 'light',
      drama: 'balanced',
      action: 'dramatic',
      'sci-fi': 'satirical'
    };
    return toneMap[genre] || 'balanced';
  }

  private selectPacing(genre: Genre): string {
    const pacingMap = {
      action: 'fast-paced',
      thriller: 'fast-paced',
      drama: 'slow-burn',
      horror: 'steady',
      comedy: 'episodic'
    };
    return pacingMap[genre] || 'steady';
  }

  private selectDialogue(personality: string): string {
    if (personality.includes('edgy')) return 'stylized';
    if (personality.includes('heartwarming')) return 'naturalistic';
    if (personality.includes('artistic')) return 'philosophical';
    return 'witty';
  }

  private selectVisualStyle(genre: Genre): string {
    const styleMap = {
      fantasy: 'epic',
      'sci-fi': 'stylized',
      drama: 'realistic',
      horror: 'stylized',
      family: 'realistic'
    };
    return styleMap[genre] || 'realistic';
  }

  private selectCGIIntensity(genre: Genre): string {
    const cgiMap = {
      'sci-fi': 'heavy',
      fantasy: 'heavy',
      superhero: 'heavy',
      action: 'moderate',
      horror: 'moderate',
      drama: 'minimal',
      comedy: 'minimal'
    };
    return cgiMap[genre] || 'minimal';
  }

  shouldStudioRelease(studioProfile: StudioProfile, currentWeek: number): boolean {
    const studioId = studioProfile.name;
    const weeksSinceLastRelease = this.studioReleaseSchedules.get(studioId) || 0;
    
    // Calculate weeks between releases based on frequency
    const weeksPerRelease = Math.floor(52 / studioProfile.releaseFrequency);
    
    // Add some randomness
    const threshold = weeksPerRelease + Math.floor(Math.random() * 4) - 2;
    
    return weeksSinceLastRelease >= threshold;
  }

  generateStudioRelease(studioProfile: StudioProfile, currentWeek: number, currentYear: number): Project | null {
    if (!this.shouldStudioRelease(studioProfile, currentWeek)) {
      // Increment weeks since last release
      const current = this.studioReleaseSchedules.get(studioProfile.name) || 0;
      this.studioReleaseSchedules.set(studioProfile.name, current + 1);
      return null;
    }

    // Reset counter
    this.studioReleaseSchedules.set(studioProfile.name, 0);

    // Some studios will release TV shows (stored in allReleases for market/world simulation).
    const tvChance =
      studioProfile.riskTolerance === 'aggressive'
        ? 0.22
        : studioProfile.riskTolerance === 'moderate'
          ? 0.16
          : 0.10;

    if (Math.random() < tvChance) {
      return this.generateStudioTvRelease(studioProfile, currentWeek, currentYear);
    }

    // Select genre based on studio specialties
    const genre = studioProfile.specialties[Math.floor(Math.random() * studioProfile.specialties.length)];
    const script = this.generateScript(genre, studioProfile);

    const project: Project = {
      id: `ai-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: script.title,
      script,
      type: 'feature',
      currentPhase: 'release',
      status: 'released',
      phaseDuration: 0,
      studioName: studioProfile.name,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: []
      },
      budget: {
        total: script.budget,
        allocated: {
          aboveTheLine: script.budget * 0.2,
          belowTheLine: script.budget * 0.3,
          postProduction: script.budget * 0.15,
          marketing: script.budget * 0.25,
          distribution: script.budget * 0.1,
          contingency: 0
        },
        spent: {
          aboveTheLine: script.budget * 0.2,
          belowTheLine: script.budget * 0.3,
          postProduction: script.budget * 0.15,
          marketing: script.budget * 0.25,
          distribution: script.budget * 0.1,
          contingency: 0
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        }
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: { start: new Date(), end: new Date() },
        principalPhotography: { start: new Date(), end: new Date() },
        postProduction: { start: new Date(), end: new Date() },
        release: new Date(),
        milestones: []
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'Theatrical',
          type: 'theatrical',
          revenue: { type: 'box-office', studioShare: 50 }
        },
        international: [],
        windows: [],
        marketingBudget: script.budget * 0.25
      },
      metrics: {
        inTheaters: true,
        boxOfficeTotal: this.generateBoxOfficeTotal(script.budget, genre),
        theaterCount: this.generateTheaterCount('major'), // Use helper method
        weeksSinceRelease: 0,
        criticsScore: this.generateCriticsScore(genre, studioProfile.reputation),
        audienceScore: this.generateAudienceScore(genre, studioProfile.reputation),
        boxOfficeStatus: 'Current' as any,
        theatricalRunLocked: false,
        boxOffice: {
          openingWeekend: 0,
          domesticTotal: 0,
          internationalTotal: 0,
          production: script.budget,
          marketing: script.budget * 0.25,
          profit: 0,
          theaters: this.generateTheaterCount('major'),
          weeks: 0
        }
      },
      releaseWeek: currentWeek,
      releaseYear: currentYear
    };

    return project;
  }

  private generateStudioTvRelease(studioProfile: StudioProfile, currentWeek: number, currentYear: number): Project {
    const genre = studioProfile.specialties[Math.floor(Math.random() * studioProfile.specialties.length)];

    const episodeCount = 8 + Math.floor(Math.random() * 6); // 8-13

    const perEpisodeBudgetBase = studioProfile.budget * (0.05 + Math.random() * 0.05);
    const perEpisodeBudget = Math.floor(perEpisodeBudgetBase);
    const seasonBudget = perEpisodeBudget * episodeCount;

    const title = `${this.generateFilmTitle(genre, studioProfile.name)}: The Series`;

    const script: Script = {
      id: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      genre,
      logline: this.generateLogline(genre, title),
      writer: this.generateWriterName(),
      pages: 55 + Math.floor(Math.random() * 20),
      quality: 35 + Math.floor(Math.random() * 65),
      // For TV, script budget represents per-episode budget.
      budget: perEpisodeBudget,
      developmentStage: 'final',
      themes: this.generateThemes(genre),
      targetAudience: this.selectTargetAudience(genre),
      estimatedRuntime: 45,
      characteristics: {
        ...this.generateCharacteristics(genre, studioProfile),
        pacing: 'episodic'
      }
    };

    const criticsScore = this.generateCriticsScore(genre, studioProfile.reputation);
    const audienceScore = this.generateAudienceScore(genre, studioProfile.reputation);

    const viewsFirstWeek = Math.max(100_000, Math.floor(seasonBudget / 20));
    const tailMultiplier = 6 + Math.random() * 10;
    const totalViews = Math.floor(viewsFirstWeek * tailMultiplier);

    return {
      id: `ai-tv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      script,
      type: Math.random() < 0.75 ? 'series' : 'limited-series',
      currentPhase: 'distribution',
      status: 'released',
      phaseDuration: 0,
      studioName: studioProfile.name,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: []
      },
      episodeCount,
      budget: {
        total: seasonBudget,
        allocated: {
          aboveTheLine: seasonBudget * 0.3,
          belowTheLine: seasonBudget * 0.4,
          postProduction: seasonBudget * 0.15,
          marketing: seasonBudget * 0.1,
          distribution: seasonBudget * 0.03,
          contingency: seasonBudget * 0.02
        },
        spent: {
          aboveTheLine: seasonBudget * 0.3,
          belowTheLine: seasonBudget * 0.4,
          postProduction: seasonBudget * 0.15,
          marketing: seasonBudget * 0.1,
          distribution: seasonBudget * 0.03,
          contingency: seasonBudget * 0.02
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        }
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: { start: new Date(), end: new Date() },
        principalPhotography: { start: new Date(), end: new Date() },
        postProduction: { start: new Date(), end: new Date() },
        release: new Date(),
        milestones: []
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'Streaming',
          type: 'streaming',
          revenue: { type: 'subscription-share', studioShare: 60 }
        },
        international: [],
        windows: [],
        marketingBudget: seasonBudget * 0.1
      },
      metrics: {
        weeksSinceRelease: 0,
        criticsScore,
        audienceScore,
        streaming: {
          viewsFirstWeek,
          totalViews,
          completionRate: Math.min(95, Math.max(35, Math.floor(55 + (criticsScore + audienceScore) * 0.2))),
          audienceShare: Math.min(40, Math.max(3, Math.floor(4 + (audienceScore - 50) * 0.2))),
          watchTimeHours: Math.max(1000, Math.floor((totalViews * 45) / 60)),
          subscriberGrowth: Math.floor(viewsFirstWeek * 0.02)
        }
      },
      releaseWeek: currentWeek,
      releaseYear: currentYear,
      releaseFormat: Math.random() < 0.6 ? 'weekly' : 'binge'
    };
  }

  getAllStudios(): Studio[] {
    return this.generateCompetitorStudios();
  }

  generateCompetitorStudios(): Studio[] {
    return STUDIO_PROFILES.map(profile => ({
      id: `studio-${profile.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: profile.name,
      reputation: profile.reputation,
      budget: profile.budget,
      founded: profile.foundedYear ?? (2010 + Math.floor(Math.random() * 10)),
      specialties: profile.specialties,
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0,
      // Lore fields
      personality: profile.personality,
      businessTendency: profile.businessTendency,
      brandIdentity: profile.brandIdentity,
      riskTolerance: profile.riskTolerance,
      releaseFrequency: profile.releaseFrequency,
    }));
  }

  getStudioProfile(studioName: string): StudioProfile | undefined {
    return STUDIO_PROFILES.find(profile => profile.name === studioName);
  }

  private generateBoxOfficeTotal(budget: number, genre: Genre): number {
    // Generate realistic box office based on budget and genre
    const multiplier = this.getGenreMultiplier(genre);
    const basePerformance = 1.5 + (Math.random() * 3); // 1.5x to 4.5x budget
    return Math.floor(budget * basePerformance * multiplier);
  }

  private generateTheaterCount(studioSize: string): number {
    const sizeMap = {
      'major': 2500 + Math.floor(Math.random() * 1500), // 2500-4000 theaters
      'mid-tier': 1000 + Math.floor(Math.random() * 1000), // 1000-2000 theaters
      'independent': 200 + Math.floor(Math.random() * 300) // 200-500 theaters
    };
    return sizeMap[studioSize as keyof typeof sizeMap] || 1500;
  }

  private generateCriticsScore(genre: Genre, studioReputation: number): number {
    // Base score influenced by genre and studio reputation
    const genreBase = {
      'drama': 70,
      'biography': 75,
      'historical': 72,
      'thriller': 65,
      'action': 60,
      'comedy': 62,
      'horror': 58,
      'sci-fi': 68,
      'fantasy': 65,
      'family': 70
    }[genre] || 65;

    const reputationBonus = (studioReputation - 50) * 0.3; // ±15 points based on rep
    const randomness = (Math.random() - 0.5) * 20; // ±10 points random
    
    return Math.max(30, Math.min(95, Math.floor(genreBase + reputationBonus + randomness)));
  }

  private generateAudienceScore(genre: Genre, studioReputation: number): number {
    // Audience scores tend to be higher and vary differently than critics
    const genreBase = {
      'action': 75,
      'comedy': 78,
      'family': 80,
      'fantasy': 73,
      'sci-fi': 74,
      'horror': 70,
      'thriller': 72,
      'drama': 68,
      'biography': 65,
      'historical': 67
    }[genre] || 72;

    const reputationBonus = (studioReputation - 50) * 0.2; // ±10 points based on rep
    const randomness = (Math.random() - 0.5) * 25; // ±12.5 points random
    
    return Math.max(40, Math.min(95, Math.floor(genreBase + reputationBonus + randomness)));
  }

  private getGenreMultiplier(genre: Genre): number {
    // Different genres have different commercial potential
    const multipliers = {
      'action': 1.3,
      'superhero': 1.5,
      'family': 1.4,
      'comedy': 1.2,
      'sci-fi': 1.3,
      'fantasy': 1.3,
      'horror': 1.1,
      'thriller': 1.0,
      'drama': 0.8,
      'biography': 0.7,
      'historical': 0.8
    };
    return multipliers[genre] || 1.0;
  }
}