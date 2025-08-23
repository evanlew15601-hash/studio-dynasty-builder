import { useEffect, useState } from 'react';
import { GameState, Project, Studio, StudioAward, TalentAward, TalentPerson } from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { useToast } from '@/hooks/use-toast';
import { AwardShowCeremony } from '@/components/game/IndividualAwardShowModal';

// Headless awards season engine: runs nominations and ceremonies regardless of UI phase
export function useAwardsEngine(
  gameState: GameState,
  onStudioUpdate: (updates: Partial<Studio>) => void,
  onTalentUpdate?: (talentId: string, updates: Partial<TalentPerson>) => void,
  onAwardShowTrigger?: (ceremony: AwardShowCeremony) => void
) {
  const { toast } = useToast();

  const [processedCeremonies, setProcessedCeremonies] = useState<Set<string>>(new Set());
  const [seasonMomentum, setSeasonMomentum] = useState<Record<string, number>>({});
  const [seasonNominations, setSeasonNominations] = useState<
    Record<string, { year: number; categories: Record<string, Array<{ project: Project; score: number }>> }>
  >({});

  const isAwardsSeasonActive = gameState.currentWeek >= 1 && gameState.currentWeek <= 12;

  const getEligibleProjects = (): Project[] => {
const playerProjects = gameState.projects.filter(
  (project) =>
    project.status === 'released' &&
    project.releaseYear === gameState.currentYear - 1 &&
    project.metrics?.criticsScore &&
    project.metrics.criticsScore >= 45
);

const aiProjects = gameState.allReleases.filter((release): release is Project =>
  'script' in release &&
  release.status === 'released' &&
  release.releaseYear === gameState.currentYear - 1 &&
  release.metrics?.criticsScore &&
  release.metrics.criticsScore >= 45
);

    return [...playerProjects, ...aiProjects];
  };

  const calculateAwardsProbability = (project: Project): number => {
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;
    const boxOffice = project.metrics?.boxOfficeTotal || 0;
    const budget = project.budget.total;

    let probability = (criticsScore + audienceScore) / 2;
    if (boxOffice > budget * 1.5) probability += 10;
    if (isAwardsSeasonActive) {
      if (project.script.genre === 'drama') probability += 15;
      if (project.script.genre === 'biography') probability += 10;
      if (project.script.genre === 'historical') probability += 8;
    }
    return Math.min(100, Math.max(0, probability));
  };

  const getShowConfig = (ceremonyName: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    const show = schedule.find((s) => s.name === ceremonyName);

    const base = (() => {
      switch (ceremonyName) {
        case 'Golden Globe':
          return {
            prestige: 6,
            categories: [
              'Best Picture - Drama', 'Best Picture - Comedy/Musical', 'Best Director',
              'Best Actor - Drama', 'Best Actress - Drama', 'Best Actor - Comedy/Musical',
              'Best Actress - Comedy/Musical', 'Best Supporting Actor', 'Best Supporting Actress',
              'Best Screenplay', 'Best Original Score'
            ],
            nominationWeek: 2,
            ceremonyWeek: 6,
            momentumBonus: 8,
          } as const;
        case 'Critics Choice':
          return {
            prestige: 5,
            categories: [
              'Best Film', 'Best Director', 'Best Actor', 'Best Actress',
              'Best Supporting Actor', 'Best Supporting Actress', 'Best Original Screenplay',
              'Best Adapted Screenplay', 'Best Cinematography', 'Best Visual Effects',
              'Best Editing', 'Best Production Design'
            ],
            nominationWeek: 3,
            ceremonyWeek: 8,
            momentumBonus: 6,
          } as const;
        default:
          return {
            prestige: 10,
            categories: [
              'Best Picture', 'Best Director', 'Best Actor', 'Best Actress',
              'Best Supporting Actor', 'Best Supporting Actress', 'Best Original Screenplay',
              'Best Adapted Screenplay', 'Best Cinematography', 'Best Film Editing',
              'Best Visual Effects', 'Best Production Design', 'Best Costume Design',
              'Best Makeup and Hairstyling', 'Best Original Score', 'Best Original Song',
              'Best Sound', 'Best Animated Feature'
            ],
            nominationWeek: 4,
            ceremonyWeek: 10,
            momentumBonus: 12,
          } as const; // Oscar
      }
    })();

    return {
      ...base,
      nominationWeek: show?.nominationWeek ?? base.nominationWeek,
      ceremonyWeek: show?.ceremonyWeek ?? base.ceremonyWeek,
    };
  };

  const announceNominations = (ceremonyName: string) => {
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (seasonNominations[key]) return; // idempotent

    const { categories } = getShowConfig(ceremonyName);
    const eligible = getEligibleProjects();

    const categoriesMap: Record<string, Array<{ project: Project; score: number }>> = {};

    categories.forEach((category) => {
      const ranked = eligible
        .map((project) => {
          const base = calculateAwardsProbability(project);
          const momentum = seasonMomentum[project.id] || 0;
          
          // Enhanced category bias
          let categoryBias = 0;
          if (category.toLowerCase().includes('director')) categoryBias = 5;
          else if (category.toLowerCase().includes('actor') || category.toLowerCase().includes('actress')) categoryBias = 3;
          else if (category.toLowerCase().includes('screenplay')) categoryBias = 4;
          else if (category.toLowerCase().includes('cinematography') || category.toLowerCase().includes('visual')) categoryBias = 6;
          else if (category.toLowerCase().includes('editing') || category.toLowerCase().includes('sound')) categoryBias = 2;
          
          // Genre bonuses for specific categories
          if (category.toLowerCase().includes('animated') && project.script?.genre !== 'animation') return { project, score: 0 };
          if (category.toLowerCase().includes('comedy') && project.script?.genre !== 'comedy') categoryBias -= 3;
          if (category.toLowerCase().includes('drama') && ['drama', 'biography', 'historical'].includes(project.script?.genre || '')) categoryBias += 5;
          
          const score = Math.min(100, base + momentum + categoryBias + (Math.random() * 8 - 4));
          return { project, score };
        })
        .filter(({ score }) => score > 10) // Filter out clearly ineligible
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      categoriesMap[category] = ranked;
    });

    setSeasonNominations((prev) => ({
      ...prev,
      [key]: { year: gameState.currentYear, categories: categoriesMap },
    }));

    console.log(`[AwardsEngine] ${ceremonyName} nominations announced for Y${gameState.currentYear}`);
    toast({
      title: `${ceremonyName} Nominations Announced`,
      description: `Top contenders selected across ${categories.length} categories.`,
    });
  };

  const triggerAwardsCeremony = (ceremonyName: string) => {
    const { categories, ceremonyWeek, prestige, momentumBonus } = getShowConfig(ceremonyName);
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (gameState.currentWeek !== ceremonyWeek) return;
    if (processedCeremonies.has(key)) return;

    if (!seasonNominations[key]) {
      announceNominations(ceremonyName);
    }
    const nominationsRecord = seasonNominations[key];
    if (!nominationsRecord) return;

    const flatForModal: Array<{ project: Project; category: string; won: boolean; award?: StudioAward; talentAward?: TalentAward; talentName?: string }> = [];
    const winnersThisShow: string[] = [];

    categories.forEach((category) => {
      const nominees = nominationsRecord.categories[category] || [];
      if (nominees.length === 0) return;
      const weighted = nominees.map((n, idx) => ({
        ...n,
        weight: (nominees.length - idx) * 1.5 + (seasonMomentum[n.project.id] || 0) / 10,
      }));
      const totalWeight = weighted.reduce((s, w) => s + (w as any).weight, 0);
      let r = Math.random() * totalWeight;
      let winner = weighted[0] as any;
      for (const w of weighted as any[]) {
        r -= w.weight;
        if (r <= 0) {
          winner = w;
          break;
        }
      }

      nominees.forEach((n) => {
        const won = n.project.id === winner.project.id;
        const isActingCategory = category.toLowerCase().includes('actor') || category.toLowerCase().includes('actress');
        const isDirectorCategory = category.toLowerCase().includes('director');
        const isTalentCategory = isActingCategory || isDirectorCategory;
        
        let talentAward: TalentAward | undefined;
        let studioAward: StudioAward | undefined;
        let talentName: string | undefined;

        if (won) {
          if (isTalentCategory) {
            // Find relevant talent for this category
            const relevantTalent = findRelevantTalent(n.project, category);
            if (relevantTalent) {
              talentAward = {
                id: `talent-award-${Date.now()}-${Math.random()}`,
                talentId: relevantTalent.id,
                projectId: n.project.id,
                category,
                ceremony: ceremonyName,
                year: gameState.currentYear,
                prestige,
                reputationBoost: prestige * 3,
                marketValueBoost: relevantTalent.marketValue * (prestige / 50),
              };
              talentName = relevantTalent.name;
              
              // Update talent with award
              if (onTalentUpdate) {
                const currentAwards = relevantTalent.awards || [];
                onTalentUpdate(relevantTalent.id, {
                  reputation: Math.min(100, relevantTalent.reputation + talentAward.reputationBoost),
                  marketValue: relevantTalent.marketValue + (talentAward.marketValueBoost || 0),
                  awards: [...currentAwards, talentAward],
                });
              }
            }
          } else {
            // Studio award for non-talent categories
            studioAward = {
              id: `award-${Date.now()}-${Math.random()}`,
              projectId: n.project.id,
              category,
              ceremony: ceremonyName,
              year: gameState.currentYear,
              prestige,
              reputationBoost: prestige * 2,
              revenueBoost: n.project.budget.total * (prestige / 100),
            };
          }
        }
        
        flatForModal.push({ project: n.project, category, won, award: studioAward, talentAward, talentName });
        if (won) winnersThisShow.push(n.project.id);
      });
    });

    setProcessedCeremonies((prev) => new Set(prev).add(key));

    if (winnersThisShow.length > 0) {
      setSeasonMomentum((prev) => {
        const next = { ...prev };
        winnersThisShow.forEach((pid) => {
          next[pid] = (next[pid] || 0) + momentumBonus;
        });
        return next;
      });
    }

    if (flatForModal.length > 0) {
      // Create ceremony object for modal
      const ceremonyData: AwardShowCeremony = {
        ceremonyName,
        year: gameState.currentYear,
        nominations: {},
        winners: {}
      };

      // Convert nominations to proper format for modal (include talentName for talent categories)
      categories.forEach((category) => {
        const nominees = nominationsRecord.categories[category] || [];
        ceremonyData.nominations[category] = nominees.map(n => {
          const t = (category.toLowerCase().includes('actor') || category.toLowerCase().includes('actress') || category.toLowerCase().includes('director'))
            ? findRelevantTalent(n.project, category)
            : undefined;
          return {
            ...n,
            category,
            project: { ...n.project, studioId: n.project.id.includes('player') ? 'player' : 'ai' } as any,
            talentName: t?.name
          } as any;
        });
      });

      // Add winners to ceremony data
      categories.forEach((category) => {
        const nominees = nominationsRecord.categories[category] || [];
        const winner = nominees.find(n => flatForModal.some(f => f.project.id === n.project.id && f.category === category && f.won));
        if (winner) {
          const winnerData = flatForModal.find(f => f.project.id === winner.project.id && f.category === category && f.won);
          if (winnerData) {
            (ceremonyData.winners as any)[category] = {
              ...winner,
              category,
              won: true,
              award: winnerData.award,
              talentName: winnerData.talentName,
              project: { ...winner.project, studioId: winner.project.id.includes('player') ? 'player' : 'ai' } as any
            };
          }
        }
      });

      // Trigger award show modal if callback provided
      if (onAwardShowTrigger) {
        onAwardShowTrigger(ceremonyData);
      }

      const wonStudioAwards = flatForModal
        .filter((n) => n.won && n.award)
        .map((n) => n.award!)
        .filter((a) => gameState.projects.some((p) => p.id === a.projectId));

      if (wonStudioAwards.length > 0) {
        const totalReputation = wonStudioAwards.reduce((sum, award) => sum + award.reputationBoost, 0);
        const totalRevenue = wonStudioAwards.reduce((sum, award) => sum + award.revenueBoost, 0);
        onStudioUpdate({
          reputation: Math.min(100, (gameState.studio.reputation || 0) + totalReputation),
          budget: (gameState.studio.budget || 0) + totalRevenue,
          awards: [...(gameState.studio.awards || []), ...wonStudioAwards],
        });
      }

      console.log(
        `[AwardsEngine] ${ceremonyName} ceremony processed for Y${gameState.currentYear} (awards: ${flatForModal.length})`
      );
      toast({
        title: `${ceremonyName} Winners Announced`,
        description: `${flatForModal.filter((f) => f.won).length} category winners selected.`,
      });
    }
  };

  // Reset season each year/week 1
  useEffect(() => {
    if (gameState.currentWeek === 1) {
      setProcessedCeremonies(new Set());
      setSeasonNominations({});
      setSeasonMomentum({});
      console.log(`[AwardsEngine] Reset season state for Y${gameState.currentYear}`);
    }
  }, [gameState.currentYear, gameState.currentWeek]);

  // Weekly triggers
  useEffect(() => {
    if (!isAwardsSeasonActive) return;
    const shows = getAwardShowsForYear(gameState.currentYear);

    shows.forEach((s) => {
      if (gameState.currentWeek === s.nominationWeek) announceNominations(s.name);
    });
    shows.forEach((s) => triggerAwardsCeremony(s.name));
  }, [gameState.currentWeek, isAwardsSeasonActive, gameState.currentYear]);

  // Helper function to find relevant talent for awards categories
  const findRelevantTalent = (project: Project, category: string): TalentPerson | undefined => {
    const categoryLower = category.toLowerCase();

    // Prefer explicit cast list first
    const castEntries = project.cast || [];
    const characters = project.script?.characters || [];

    const getTalentById = (id?: string) => gameState.talent.find(t => t.id === id);

    // Director category
    if (categoryLower.includes('director')) {
      // From cast
      const castDir = castEntries.find(c => c.role.toLowerCase().includes('director'));
      if (castDir) {
        const t = getTalentById(castDir.talentId);
        if (t && t.type === 'director') return t;
      }
      // Fallback to script characters
      const charDir = characters.find(c => c.requiredType === 'director');
      const t = getTalentById(charDir?.assignedTalentId);
      if (t && t.type === 'director') return t;
      return undefined;
    }

    // Acting categories
    const isActress = categoryLower.includes('actress');
    const isSupporting = categoryLower.includes('supporting');

    const matchActorFromCast = (predicate: (role: string) => boolean, preferGender?: 'female' | 'male' | 'any'): TalentPerson | undefined => {
      const entry = castEntries.find(c => predicate(c.role.toLowerCase()));
      if (!entry) return undefined;
      let t = getTalentById(entry.talentId);
      if (!t || t.type !== 'actor') return undefined;
      if (preferGender === 'female' && t.gender !== 'female') {
        // try to find a female alternative from characters
        const alt = characters.find(ch => ch.assignedTalentId && (ch.importance === 'lead' || ch.importance === 'supporting'));
        const altT = getTalentById(alt?.assignedTalentId);
        if (altT && altT.type === 'actor' && altT.gender === 'female') return altT;
      }
      if (preferGender === 'male' && t.gender === 'female') {
        const alt = characters.find(ch => ch.assignedTalentId && (ch.importance === 'lead' || ch.importance === 'supporting'));
        const altT = getTalentById(alt?.assignedTalentId);
        if (altT && altT.type === 'actor' && altT.gender !== 'female') return altT;
      }
      return t;
    };

    const preferGender: 'female' | 'male' | 'any' = isActress ? 'female' : 'any';

    // Try cast first
    const castMatch = matchActorFromCast(
      role => isSupporting ? role.includes('supporting') : role.includes('lead') || role.includes('protagonist'),
      preferGender
    );
    if (castMatch) return castMatch;

    // Fallback to script characters
    const char = characters.find(ch => {
      if (ch.requiredType === 'director') return false;
      if (isSupporting) return ch.importance === 'supporting';
      return ch.importance === 'lead';
    });
    const t = getTalentById(char?.assignedTalentId);
    if (t && t.type === 'actor') {
      if (isActress && t.gender !== 'female') {
        // try to find a female actor
        const alt = characters
          .map(ch => getTalentById(ch.assignedTalentId))
          .find(tt => tt && tt.type === 'actor' && tt.gender === 'female');
        return alt as TalentPerson | undefined;
      }
      return t;
    }

    return undefined;
  };
}
