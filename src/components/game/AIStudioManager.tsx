// AI Studio Manager - Handles competitor studio film production
import { Project, Studio, TalentPerson } from '@/types/game';
import { FinancialEngine } from './FinancialEngine';

export interface AIFilmProject {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  script: {
    genre: string;
    quality: number;
    budget: number;
  };
  status: 'development' | 'casting' | 'production' | 'post-production' | 'marketing' | 'released';
  timeline: {
    startWeek: number;
    startYear: number;
    productionWeeks: number;
    expectedReleaseWeek: number;
    expectedReleaseYear: number;
  };
  cast: {
    role: string;
    talentId: string;
    talentName: string;
    weeklyPay: number;
    commitmentWeeks: number[];
  }[];
  budget: {
    production: number;
    marketing: number;
    total: number;
  };
  performance?: {
    boxOffice: number;
    criticsScore: number;
    audienceScore: number;
    awards: string[];
  };
}

export interface TalentCommitment {
  talentId: string;
  filmId: string;
  role: string;
  studio: string;
  commitmentWeeks: number[];
  weeklyPay: number;
  startWeek: number;
  endWeek: number;
  year: number;
}

export class AIStudioManager {
  private static aiFilms: AIFilmProject[] = [];
  private static talentCommitments: TalentCommitment[] = [];
  private static nextFilmId = 1;

  // **CHECKPOINT 1 TEST**: Verify basic film creation
  static createAIFilm(
    studio: Studio,
    currentWeek: number,
    currentYear: number,
    availableTalent: TalentPerson[]
  ): AIFilmProject {
    const genres = ['action', 'drama', 'comedy', 'thriller', 'romance', 'horror', 'sci-fi'];
    const genre = genres[Math.floor(Math.random() * genres.length)];
    
    // Generate realistic budget based on studio reputation
    const studioRep = studio.reputation || 50;
    const baseBudget = 5000000 + (studioRep / 100) * 45000000; // 5M to 50M
    const budget = baseBudget + (Math.random() - 0.5) * baseBudget * 0.4; // ±20% variation
    
    const film: AIFilmProject = {
      id: `ai-film-${this.nextFilmId++}`,
      title: this.generateFilmTitle(genre),
      studioId: studio.id,
      studioName: studio.name,
      script: {
        genre,
        quality: Math.floor(Math.random() * 40) + 40, // 40-80 quality
        budget: Math.floor(budget)
      },
      status: 'development',
      timeline: {
        startWeek: currentWeek,
        startYear: currentYear,
        productionWeeks: Math.floor(Math.random() * 8) + 8, // 8-16 weeks
        expectedReleaseWeek: 0, // Will be calculated
        expectedReleaseYear: 0
      },
      cast: [],
      budget: {
        production: Math.floor(budget),
        marketing: Math.floor(budget * 0.4), // 40% for marketing
        total: Math.floor(budget * 1.4)
      }
    };

    // Calculate expected release date
    const totalProductionTime = 4 + film.timeline.productionWeeks + 6; // dev + prod + post
    film.timeline.expectedReleaseWeek = (currentWeek + totalProductionTime) % 52 || 52;
    film.timeline.expectedReleaseYear = currentYear + Math.floor((currentWeek + totalProductionTime) / 52);

    // Cast multiple talent members with variety - directors, leads, and supporting
    const directorCandidates = availableTalent.filter(t => t.type === 'director');
    const actorCandidates = availableTalent.filter(t => t.type === 'actor');
    
    const usedTalent = new Set<string>();
    const castingStartWeek = currentWeek + 1; // Start casting next week
    const totalCommitmentWeeks = film.timeline.productionWeeks + 4; // Production + buffer
    
    // Cast director (mandatory)
    if (directorCandidates.length > 0) {
      const director = directorCandidates[Math.floor(Math.random() * directorCandidates.length)];
      this.castTalentInAIFilm(film.id, director, 'Director', castingStartWeek, totalCommitmentWeeks, currentYear);
      usedTalent.add(director.id);
    }
    
    // Cast lead actor (mandatory)
    const availableActors = actorCandidates.filter(a => !usedTalent.has(a.id));
    if (availableActors.length > 0) {
      const leadActor = availableActors[Math.floor(Math.random() * availableActors.length)];
      this.castTalentInAIFilm(film.id, leadActor, 'Lead Actor', castingStartWeek, totalCommitmentWeeks, currentYear);
      usedTalent.add(leadActor.id);
    }

    // Cast 2-4 additional supporting actors for variety
    const supportingCount = Math.min(4, Math.floor(Math.random() * 3) + 2); // 2-4 supporting actors
    const remainingActors = actorCandidates.filter(a => !usedTalent.has(a.id));
    
    for (let i = 0; i < supportingCount && i < remainingActors.length; i++) {
      const supportingActor = remainingActors[Math.floor(Math.random() * remainingActors.length)];
      const supportingRoles = ['Supporting Actor', 'Supporting Actress', 'Character Actor', 'Ensemble Cast'];
      const role = supportingRoles[Math.floor(Math.random() * supportingRoles.length)];
      
      this.castTalentInAIFilm(film.id, supportingActor, role, castingStartWeek, totalCommitmentWeeks, currentYear);
      usedTalent.add(supportingActor.id);
      
      // Remove from available pool to ensure variety
      const actorIndex = remainingActors.indexOf(supportingActor);
      if (actorIndex > -1) remainingActors.splice(actorIndex, 1);
    }

    this.aiFilms.push(film);
    
    console.log(`🎬 AI STUDIO: ${studio.name} started "${film.title}" (${genre}, $${(budget/1000000).toFixed(1)}M) with ${usedTalent.size} cast members`);
    
    return film;
  }

  // **CHECKPOINT 1 TEST**: Verify film title generation
  private static generateFilmTitle(genre: string): string {
    const titleParts = {
      action: ['Steel', 'Thunder', 'Fire', 'Shadow', 'Storm'],
      drama: ['The Last', 'Silent', 'Broken', 'Hidden', 'Lost'],
      comedy: ['My Crazy', 'The Funny', 'Super', 'Big', 'Little'],
      thriller: ['Dead', 'Dark', 'Night', 'Blood', 'Fear'],
      romance: ['Love in', 'The Heart', 'Sweet', 'Forever', 'True'],
      horror: ['The Curse', 'Haunted', 'Evil', 'Death', 'Terror'],
      'sci-fi': ['Star', 'Future', 'Cyber', 'Space', 'Time']
    };
    
    const adjectives = ['Rising', 'Falling', 'Final', 'Secret', 'Golden', 'Silver', 'Midnight', 'Dawn'];
    const nouns = ['City', 'Dreams', 'Journey', 'Mission', 'Legacy', 'Chronicles', 'Awakening', 'War'];
    
    const genreParts = titleParts[genre as keyof typeof titleParts] || titleParts.drama;
    const part1 = genreParts[Math.floor(Math.random() * genreParts.length)];
    const part2 = Math.random() > 0.5 ? 
      adjectives[Math.floor(Math.random() * adjectives.length)] :
      nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${part1} ${part2}`;
  }

  // **CHECKPOINT 2**: Actor availability checking
  static isTalentAvailable(
    talentId: string, 
    startWeek: number, 
    endWeek: number, 
    year: number
  ): boolean {
    const conflicts = this.talentCommitments.filter(commitment => 
      commitment.talentId === talentId &&
      commitment.year === year &&
      this.weeksOverlap(commitment.startWeek, commitment.endWeek, startWeek, endWeek)
    );
    
    return conflicts.length === 0;
  }

  // **CHECKPOINT 2**: Get talent's current commitment info
  static getTalentCommitment(talentId: string, currentWeek: number, currentYear: number): TalentCommitment | null {
    return this.talentCommitments.find(commitment =>
      commitment.talentId === talentId &&
      commitment.year === currentYear &&
      currentWeek >= commitment.startWeek &&
      currentWeek <= commitment.endWeek
    ) || null;
  }

  // **CHECKPOINT 2**: Helper function for week overlap detection
  private static weeksOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) <= Math.min(end1, end2);
  }

  // **CHECKPOINT 2**: Cast talent in AI film
  static castTalentInAIFilm(
    filmId: string,
    talent: TalentPerson,
    role: string,
    startWeek: number,
    commitmentWeeks: number,
    year: number
  ): boolean {
    const endWeek = startWeek + commitmentWeeks - 1;
    
    // Check availability
    if (!this.isTalentAvailable(talent.id, startWeek, endWeek, year)) {
      console.log(`❌ CASTING: ${talent.name} not available for ${role} (weeks ${startWeek}-${endWeek})`);
      return false;
    }

    const film = this.aiFilms.find(f => f.id === filmId);
    if (!film) {
      console.log(`❌ CASTING: Film ${filmId} not found`);
      return false;
    }

    // Calculate weekly pay based on talent reputation and film budget
    const basePay = (talent.reputation || 50) * 1000; // Base 1k per reputation point
    const budgetMultiplier = film.budget.production / 20000000; // Scale with budget
    const weeklyPay = Math.floor(basePay * budgetMultiplier);

    // Add to film cast
    film.cast.push({
      role,
      talentId: talent.id,
      talentName: talent.name,
      weeklyPay,
      commitmentWeeks: Array.from({length: commitmentWeeks}, (_, i) => startWeek + i)
    });

    // Add to talent commitments
    const commitment: TalentCommitment = {
      talentId: talent.id,
      filmId: filmId,
      role,
      studio: film.studioName,
      commitmentWeeks: Array.from({length: commitmentWeeks}, (_, i) => startWeek + i),
      weeklyPay,
      startWeek,
      endWeek,
      year
    };

    this.talentCommitments.push(commitment);

    console.log(`✅ CASTING: ${talent.name} cast as ${role} in "${film.title}" (${commitmentWeeks} weeks, $${weeklyPay}k/week)`);
    
    return true;
  }

  // **CHECKPOINT 3**: Process AI films weekly - Increased frequency
  static processWeeklyAIFilms(currentWeek: number, currentYear: number): void {
    this.aiFilms.forEach(film => {
      const weeksInProduction = this.calculateWeeksInProduction(film, currentWeek, currentYear);
      
      // Update film status based on timeline - Faster progression
      if (film.status === 'development' && weeksInProduction >= 1) {
        film.status = 'casting';
        console.log(`🎬 AI FILM: "${film.title}" moved to casting phase`);
      } else if (film.status === 'casting' && weeksInProduction >= 2) {
        film.status = 'production';
        console.log(`🎬 AI FILM: "${film.title}" started production`);
      } else if (film.status === 'production' && weeksInProduction >= (2 + Math.floor(film.timeline.productionWeeks * 0.7))) {
        film.status = 'post-production';
        console.log(`🎬 AI FILM: "${film.title}" moved to post-production`);
      } else if (film.status === 'post-production' && weeksInProduction >= (2 + Math.floor(film.timeline.productionWeeks * 0.7) + 3)) {
        film.status = 'marketing';
        console.log(`🎬 AI FILM: "${film.title}" moved to marketing`);
      } else if (film.status === 'marketing' && 
                 currentWeek >= film.timeline.expectedReleaseWeek && 
                 currentYear >= film.timeline.expectedReleaseYear) {
        this.releaseAIFilm(film, currentWeek, currentYear);
      }

      // Record weekly expenses during production
      if (film.status === 'production' || film.status === 'post-production') {
        const weeklyProductionCost = film.budget.production * 0.05; // 5% per week
        FinancialEngine.recordTransaction(
          'expense',
          'production',
          weeklyProductionCost,
          currentWeek,
          currentYear,
          `AI Studio production - ${film.title}`,
          film.id
        );

        // Pay talent weekly
        film.cast.forEach(castMember => {
          if (castMember.commitmentWeeks.includes(currentWeek)) {
            FinancialEngine.recordTransaction(
              'expense',
              'talent',
              castMember.weeklyPay,
              currentWeek,
              currentYear,
              `AI Studio talent payment - ${castMember.talentName}`,
              film.id
            );
          }
        });
      }
    });

    // Clean up expired commitments
    this.talentCommitments = this.talentCommitments.filter(commitment =>
      !(commitment.year < currentYear || 
        (commitment.year === currentYear && commitment.endWeek < currentWeek))
    );
  }

  // **CHECKPOINT 3**: Release AI film and calculate performance
  private static releaseAIFilm(film: AIFilmProject, currentWeek: number, currentYear: number): void {
    film.status = 'released';
    
    // Calculate performance based on various factors
    const studioRep = 50; // Simplified for now
    const scriptQuality = film.script.quality;
    const castQuality = film.cast.reduce((sum, c) => sum + 50, 0) / Math.max(film.cast.length, 1); // Simplified
    const genreBonus = this.getGenreBoxOfficeBonus(film.script.genre);
    
    // Box office calculation
    const baseBoxOffice = film.budget.production * 1.5; // Break-even target
    const qualityMultiplier = (scriptQuality + castQuality + studioRep) / 150; // 0.66 to 1.33
    const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
    
    const boxOffice = baseBoxOffice * qualityMultiplier * genreBonus * randomFactor;
    
    film.performance = {
      boxOffice: Math.floor(boxOffice),
      criticsScore: Math.floor(scriptQuality + Math.random() * 20 - 10), // ±10 variation
      audienceScore: Math.floor(scriptQuality + Math.random() * 20 - 10),
      awards: [] // Will be populated by awards system
    };

    // Record AI film revenue
    FinancialEngine.recordTransaction(
      'revenue',
      'boxoffice',
      boxOffice,
      currentWeek,
      currentYear,
      `AI Film box office - ${film.title}`,
      film.id
    );

    console.log(`🎭 AI RELEASE: "${film.title}" released - $${(boxOffice/1000000).toFixed(1)}M box office`);
    
    // Update cast member reputations based on performance
    this.updateCastReputations(film);
  }

  // **CHECKPOINT 3**: Update actor reputations based on AI film performance
  private static updateCastReputations(film: AIFilmProject): void {
    if (!film.performance) return;

    const roi = film.performance.boxOffice / film.budget.total;
    let reputationChange = 0;

    if (roi > 2.0) reputationChange = 5; // Hit
    else if (roi > 1.5) reputationChange = 3; // Success
    else if (roi > 1.0) reputationChange = 1; // Break-even
    else if (roi > 0.5) reputationChange = -1; // Disappointing
    else reputationChange = -3; // Flop

    film.cast.forEach(castMember => {
      console.log(`📊 REPUTATION: ${castMember.talentName} ${reputationChange >= 0 ? '+' : ''}${reputationChange} from "${film.title}"`);
    });
  }

  private static getGenreBoxOfficeBonus(genre: string): number {
    const bonuses: Record<string, number> = {
      'action': 1.3,
      'comedy': 1.1,
      'drama': 0.9,
      'thriller': 1.0,
      'romance': 0.8,
      'horror': 1.2,
      'sci-fi': 1.4
    };
    return bonuses[genre] || 1.0;
  }

  private static calculateWeeksInProduction(film: AIFilmProject, currentWeek: number, currentYear: number): number {
    if (currentYear < film.timeline.startYear) return 0;
    if (currentYear > film.timeline.startYear) return 52 - film.timeline.startWeek + currentWeek;
    return currentWeek - film.timeline.startWeek;
  }

  // **TESTING METHODS**
  static getAllAIFilms(): AIFilmProject[] {
    return [...this.aiFilms];
  }

  static getAllCommitments(): TalentCommitment[] {
    return [...this.talentCommitments];
  }

  static getFilmsByStudio(studioId: string): AIFilmProject[] {
    return this.aiFilms.filter(f => f.studioId === studioId);
  }

  static getTalentFilmography(talentId: string): AIFilmProject[] {
    return this.aiFilms.filter(film => 
      film.cast.some(c => c.talentId === talentId) && film.status === 'released'
    );
  }

  // **TESTING**: Reset system for debugging
  static resetAISystem(): void {
    this.aiFilms = [];
    this.talentCommitments = [];
    this.nextFilmId = 1;
    console.log('🔄 AI STUDIO SYSTEM RESET');
  }
}