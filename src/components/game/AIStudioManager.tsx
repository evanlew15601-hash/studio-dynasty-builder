// AI Studio Manager - Handles competitor studio film production
import type { AIStudioState, AIFilmProject, Studio, TalentCommitment, TalentPerson } from '@/types/game';
import type { SeededRng } from '@/game/core/rng';
import { FinancialEngine } from './FinancialEngine';

const emptyState = (): AIStudioState => ({ aiFilms: [], talentCommitments: [], nextFilmId: 1 });

export class AIStudioManager {
  private static aiFilms: AIFilmProject[] = [];
  private static talentCommitments: TalentCommitment[] = [];
  private static nextFilmId = 1;

  static hydrate(state?: AIStudioState): void {
    const src = state ?? emptyState();
    this.aiFilms = (src.aiFilms || []).map((f) => ({ ...f, cast: [...(f.cast || [])] }));
    this.talentCommitments = (src.talentCommitments || []).map((c) => ({ ...c, commitmentWeeks: [...(c.commitmentWeeks || [])] }));
    this.nextFilmId = typeof src.nextFilmId === 'number' ? src.nextFilmId : 1;
  }

  static snapshot(): AIStudioState {
    return {
      aiFilms: this.aiFilms.map((f) => ({ ...f, cast: [...(f.cast || [])] })),
      talentCommitments: this.talentCommitments.map((c) => ({ ...c, commitmentWeeks: [...(c.commitmentWeeks || [])] })),
      nextFilmId: this.nextFilmId,
    };
  }

  private static toAbsWeek(year: number, week: number): number {
    return (year * 52) + week;
  }

  private static fromAbsWeek(absWeek: number): { year: number; week: number } {
    const year = Math.floor((absWeek - 1) / 52);
    const week = ((absWeek - 1) % 52) + 1;
    return { year, week };
  }

  private static weeksOverlapAbs(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) <= Math.min(end1, end2);
  }

  private static isTalentAvailableAbs(talentId: string, startAbsWeek: number, endAbsWeek: number): boolean {
    const conflicts = this.talentCommitments.filter(commitment =>
      commitment.talentId === talentId &&
      this.weeksOverlapAbs(commitment.startAbsWeek, commitment.endAbsWeek, startAbsWeek, endAbsWeek)
    );

    return conflicts.length === 0;
  }

  // **CHECKPOINT 1 TEST**: Verify basic film creation
  static createAIFilm(
    studio: Studio,
    currentWeek: number,
    currentYear: number,
    availableTalent: TalentPerson[],
    rng: SeededRng
  ): AIFilmProject {
    const genres = ['action', 'drama', 'comedy', 'thriller', 'romance', 'horror', 'sci-fi'];
    const genre = rng.pick(genres) || 'drama';

    // Generate realistic budget based on studio reputation
    const studioRep = studio.reputation || 50;
    const baseBudget = 5000000 + (studioRep / 100) * 45000000; // 5M to 50M
    const budget = baseBudget + baseBudget * rng.nextFloat(-0.2, 0.2); // ±20% variation

    const film: AIFilmProject = {
      id: `ai-film-${this.nextFilmId++}`,
      title: this.generateFilmTitle(genre, rng),
      studioId: studio.id,
      studioName: studio.name,
      script: {
        genre,
        quality: rng.nextInt(40, 80),
        budget: Math.floor(budget)
      },
      status: 'development',
      timeline: {
        startWeek: currentWeek,
        startYear: currentYear,
        productionWeeks: rng.nextInt(8, 16),
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

    // Persist early so casting can resolve the film by ID
    this.aiFilms.push(film);

    // Cast multiple talent members with variety - directors, leads, and supporting
    const directorCandidates = availableTalent.filter(t => t.type === 'director');
    const actorCandidates = availableTalent.filter(t => t.type === 'actor');

    const usedTalent = new Set<string>();
    const castingStartWeek = currentWeek + 1; // Start casting next week
    const totalCommitmentWeeks = film.timeline.productionWeeks + 4; // Production + buffer

    const tryCast = (talent: TalentPerson | undefined, role: string) => {
      if (!talent) return;
      const ok = this.castTalentInAIFilm(film.id, talent, role, castingStartWeek, totalCommitmentWeeks, currentYear);
      if (ok) usedTalent.add(talent.id);
    };

    // Cast director (mandatory)
    if (directorCandidates.length > 0) {
      const director = rng.pick(directorCandidates);
      tryCast(director, 'Director');
    }

    // Cast lead actor (mandatory)
    const availableActors = actorCandidates.filter(a => !usedTalent.has(a.id));
    if (availableActors.length > 0) {
      const leadActor = rng.pick(availableActors);
      tryCast(leadActor, 'Lead Actor');
    }

    // Cast 2-4 additional supporting actors for variety
    const supportingCount = Math.min(4, rng.nextInt(2, 4)); // 2-4 supporting actors
    const remainingActors = actorCandidates.filter(a => !usedTalent.has(a.id));

    for (let i = 0; i < supportingCount && i < remainingActors.length; i++) {
      const supportingActor = rng.pick(remainingActors);
      const supportingRoles = ['Supporting Actor', 'Supporting Actress', 'Character Actor', 'Ensemble Cast'];
      const role = rng.pick(supportingRoles) || supportingRoles[0];

      tryCast(supportingActor, role);

      // Remove from available pool to ensure variety
      const actorIndex = supportingActor ? remainingActors.indexOf(supportingActor) : -1;
      if (actorIndex > -1) remainingActors.splice(actorIndex, 1);
    }

    console.log(`AI STUDIO: ${studio.name} started "${film.title}" (${genre}, \u0024${(budget/1000000).toFixed(1)}M) with ${usedTalent.size} cast members`);
    
    return film;
  }

  // **CHECKPOINT 1 TEST**: Verify film title generation
  private static generateFilmTitle(genre: string, rng: SeededRng): string {
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
    const part1 = rng.pick(genreParts) || genreParts[0];
    const part2 = rng.chance(0.5)
      ? (rng.pick(adjectives) || adjectives[0])
      : (rng.pick(nouns) || nouns[0]);

    return `${part1} ${part2}`;
  }

  // **CHECKPOINT 2**: Actor availability checking
  static isTalentAvailable(
    talentId: string, 
    startWeek: number, 
    endWeek: number, 
    year: number
  ): boolean {
    const startAbsWeek = this.toAbsWeek(year, startWeek);
    const endAbsWeek = this.toAbsWeek(year, endWeek);
    return this.isTalentAvailableAbs(talentId, startAbsWeek, endAbsWeek);
  }

  // **CHECKPOINT 2**: Get talent's current commitment info
  static getTalentCommitment(talentId: string, currentWeek: number, currentYear: number): TalentCommitment | null {
    const currentAbsWeek = this.toAbsWeek(currentYear, currentWeek);
    return this.talentCommitments.find(commitment =>
      commitment.talentId === talentId &&
      currentAbsWeek >= commitment.startAbsWeek &&
      currentAbsWeek <= commitment.endAbsWeek
    ) || null;
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
    const startAbsWeek = this.toAbsWeek(year, startWeek);
    const endAbsWeek = startAbsWeek + commitmentWeeks - 1;

    const start = this.fromAbsWeek(startAbsWeek);
    const end = this.fromAbsWeek(endAbsWeek);

    // Check availability
    if (!this.isTalentAvailableAbs(talent.id, startAbsWeek, endAbsWeek)) {
      console.log(`CASTING: ${talent.name} not available for ${role} (Y${start.year}W${start.week}-Y${end.year}W${end.week})`);
      return false;
    }

    const film = this.aiFilms.find(f => f.id === filmId);
    if (!film) {
      console.log(`CASTING: Film ${filmId} not found`);
      return false;
    }

    // Calculate weekly pay based on talent reputation and film budget
    const basePay = (talent.reputation || 50) * 1000; // Base 1k per reputation point
    const budgetMultiplier = film.budget.production / 20000000; // Scale with budget
    const weeklyPay = Math.floor(basePay * budgetMultiplier);

    const commitmentAbsWeeks = Array.from({length: commitmentWeeks}, (_, i) => startAbsWeek + i);

    // Add to film cast
    film.cast.push({
      role,
      talentId: talent.id,
      talentName: talent.name,
      weeklyPay,
      commitmentWeeks: commitmentAbsWeeks
    });

    // Add to talent commitments
    const commitment: TalentCommitment = {
      talentId: talent.id,
      talentName: talent.name,
      filmId: filmId,
      role,
      studio: film.studioName,
      commitmentWeeks: commitmentAbsWeeks,
      weeklyPay,
      startWeek: start.week,
      endWeek: end.week,
      startYear: start.year,
      endYear: end.year,
      startAbsWeek,
      endAbsWeek,
    };

    this.talentCommitments.push(commitment);

    console.log(`CASTING: ${talent.name} cast as ${role} in "${film.title}" (${commitmentWeeks} weeks, \u0024${weeklyPay}k/week)`);

    return true;
  }

  // **CHECKPOINT 3**: Process AI films weekly - Increased frequency
  static processWeeklyAIFilms(currentWeek: number, currentYear: number, rng: SeededRng): void {
    const currentAbsWeek = this.toAbsWeek(currentYear, currentWeek);

    this.aiFilms.forEach(film => {
      const weeksInProduction = this.calculateWeeksInProduction(film, currentWeek, currentYear);
      
      // Update film status based on timeline - Faster progression
      if (film.status === 'development' && weeksInProduction >= 1) {
        film.status = 'casting';
        console.log(`AI FILM: "${film.title}" moved to casting phase`);
      } else if (film.status === 'casting' && weeksInProduction >= 2) {
        film.status = 'production';
        console.log(`AI FILM: "${film.title}" started production`);
      } else if (film.status === 'production' && weeksInProduction >= (2 + Math.floor(film.timeline.productionWeeks * 0.7))) {
        film.status = 'post-production';
        console.log(`AI FILM: "${film.title}" moved to post-production`);
      } else if (film.status === 'post-production' && weeksInProduction >= (2 + Math.floor(film.timeline.productionWeeks * 0.7) + 3)) {
        film.status = 'marketing';
        console.log(`AI FILM: "${film.title}" moved to marketing`);
      } else if (film.status === 'marketing') {
        const expectedAbsWeek = this.toAbsWeek(film.timeline.expectedReleaseYear, film.timeline.expectedReleaseWeek);
        if (currentAbsWeek >= expectedAbsWeek) {
          this.releaseAIFilm(film, currentWeek, currentYear, rng);
        }
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
          if (castMember.commitmentWeeks.includes(currentAbsWeek)) {
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
    this.talentCommitments = this.talentCommitments.filter(commitment => commitment.endAbsWeek >= currentAbsWeek);

    // Prevent unbounded growth during long-running games (e.g., 40-year caps)
    const MAX_FILM_AGE_WEEKS = 520; // keep ~10 years of AI history
    const cutoffAbsWeek = currentAbsWeek - MAX_FILM_AGE_WEEKS;
    this.aiFilms = this.aiFilms.filter(film => {
      if (film.status !== 'released') return true;
      const expectedAbsWeek = this.toAbsWeek(film.timeline.expectedReleaseYear, film.timeline.expectedReleaseWeek);
      return expectedAbsWeek >= cutoffAbsWeek;
    });
  }

  // **CHECKPOINT 3**: Release AI film and calculate performance
  private static releaseAIFilm(film: AIFilmProject, currentWeek: number, currentYear: number, rng: SeededRng): void {
    film.status = 'released';
    
    // Calculate performance based on various factors
    const studioRep = 50; // Simplified for now
    const scriptQuality = film.script.quality;
    const castQuality = film.cast.reduce((sum, c) => sum + 50, 0) / Math.max(film.cast.length, 1); // Simplified
    const genreBonus = this.getGenreBoxOfficeBonus(film.script.genre);
    
    // Box office calculation
    const baseBoxOffice = film.budget.production * 1.5; // Break-even target
    const qualityMultiplier = (scriptQuality + castQuality + studioRep) / 150; // 0.66 to 1.33
    const randomFactor = rng.nextFloat(0.5, 1.5);

    const boxOffice = baseBoxOffice * qualityMultiplier * genreBonus * randomFactor;

    film.performance = {
      boxOffice: Math.floor(boxOffice),
      criticsScore: Math.floor(scriptQuality + rng.nextFloat(-10, 10)),
      audienceScore: Math.floor(scriptQuality + rng.nextFloat(-10, 10)),
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

    console.log(`AI RELEASE: "${film.title}" released - \u0024${(boxOffice/1000000).toFixed(1)}M box office`);
    
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
      console.log(`REPUTATION: ${castMember.talentName} ${reputationChange >= 0 ? '+' : ''}${reputationChange} from "${film.title}"`);
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
    const startAbsWeek = this.toAbsWeek(film.timeline.startYear, film.timeline.startWeek);
    const currentAbsWeek = this.toAbsWeek(currentYear, currentWeek);
    return Math.max(0, currentAbsWeek - startAbsWeek);
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
    this.hydrate(emptyState());
    console.log('AI STUDIO SYSTEM RESET');
  }
}