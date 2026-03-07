import { useEffect, useState } from 'react';
import { GameState, Project, Studio, StudioAward, TalentAward, TalentPerson } from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { useToast } from '@/hooks/use-toast';
import { AwardShowCeremony } from '@/components/game/IndividualAwardShowModal';
import { stablePick } from '@/utils/stablePick';
import { MediaEngine } from '@/components/game/MediaEngine';

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

  const isTvProject = (project: Project) => project.type === 'series' || project.type === 'limited-series';
  const isFilmProject = (project: Project) => !isTvProject(project);

  // Film awards are clustered early in the year (legacy behavior). We still keep the
  // seasonal genre bias there, but nominations/ceremonies can occur later.
  const filmAwardsEndWeek = (() => {
    const weeks = getAwardShowsForYear(gameState.currentYear)
      .filter(s => s.medium === 'film')
      .map(s => s.ceremonyWeek);
    return weeks.length > 0 ? Math.max(...weeks) : 12;
  })();
  const isFilmAwardsSeasonWindow = gameState.currentWeek >= 1 && gameState.currentWeek <= filmAwardsEndWeek;

  const getEligibleProjects = (medium: 'film' | 'tv'): Project[] => {
    const matchesMedium = (p: Project) => (medium === 'tv' ? isTvProject(p) : isFilmProject(p));

    const playerProjects = gameState.projects.filter(
      (project) =>
        project.status === 'released' &&
        project.releaseYear === gameState.currentYear - 1 &&
        project.metrics?.criticsScore &&
        project.metrics.criticsScore >= 45 &&
        matchesMedium(project)
    );

    const aiProjects = gameState.allReleases.filter((release): release is Project =>
      'script' in release &&
      release.status === 'released' &&
      release.releaseYear === gameState.currentYear - 1 &&
      release.metrics?.criticsScore &&
      release.metrics.criticsScore >= 45 &&
      matchesMedium(release)
    );

    return [...playerProjects, ...aiProjects];
  };

  const calculateAwardsProbability = (project: Project, medium: 'film' | 'tv'): number => {
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;

    let probability = criticsScore * 0.65 + audienceScore * 0.35;

    if (medium === 'film') {
      const boxOffice = project.metrics?.boxOfficeTotal || 0;
      const budget = project.budget.total;
      if (boxOffice > budget * 1.5) probability += 10;

      if (isFilmAwardsSeasonWindow) {
        if (project.script.genre === 'drama') probability += 15;
        if (project.script.genre === 'biography') probability += 10;
        if (project.script.genre === 'historical') probability += 8;
      }
    } else {
      const totalViews = project.metrics?.streaming?.totalViews || 0;
      const share = project.metrics?.streaming?.audienceShare || 0;
      const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;

      probability += Math.max(-8, Math.min(8, (criticalPotential - 5) * 2));

      if (totalViews >= 20_000_000) probability += 10;
      else if (totalViews >= 8_000_000) probability += 6;
      else if (totalViews >= 2_000_000) probability += 3;

      if (share >= 15) probability += 6;
      else if (share >= 8) probability += 3;
    }

    // Awards campaign boost (player projects only; shared by film/TV)
    const campaign = project.awardsCampaign;
    if (campaign) {
      const budgetBoost = Math.min(12, campaign.budget / 250_000);
      const effectivenessBoost = (campaign.effectiveness || 0) * 0.1;
      probability += budgetBoost * 0.6 + effectivenessBoost * 0.4;
    }

    return Math.min(100, Math.max(0, probability));
  };

  const getShowConfig = (ceremonyName: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    const show = schedule.find((s) => s.name === ceremonyName);

    const base = (() => {
      switch (ceremonyName) {
        case 'Crystal Ring':
          return {
            medium: 'film' as const,
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
        case 'Critics Circle':
          return {
            medium: 'film' as const,
            prestige: 5,
            categories: [
              'Best Film', 'Best Director', 'Best Actor', 'Best Actress',
              'Best Supporting Actor', 'Best Supporting Actress', 'Best Original Screenplay',
              'Best Cinematography', 'Best Visual Effects',
              'Best Editing', 'Best Production Design'
            ],
            nominationWeek: 3,
            ceremonyWeek: 8,
            momentumBonus: 6,
          } as const;
        case 'Beacon TV':
          return {
            medium: 'tv' as const,
            prestige: 8,
            categories: [
              'Best Drama Series',
              'Best Comedy Series',
              'Best Limited Series',
              'Best Actor - Drama Series',
              'Best Actress - Drama Series',
              'Best Actor - Comedy Series',
              'Best Actress - Comedy Series',
              'Best Supporting Actor',
              'Best Supporting Actress',
              'Best Writing',
              'Best Directing'
            ],
            nominationWeek: 34,
            ceremonyWeek: 38,
            momentumBonus: 10,
          } as const;
        case 'Crown':
          return {
            medium: 'film' as const,
            prestige: 10,
            categories: [
              'Best Picture', 'Best Director', 'Best Actor', 'Best Actress',
              'Best Supporting Actor', 'Best Supporting Actress', 'Best Original Screenplay',
              'Best Cinematography', 'Best Film Editing',
              'Best Visual Effects', 'Best Production Design', 'Best Costume Design',
              'Best Makeup and Hairstyling', 'Best Original Score', 'Best Original Song',
              'Best Sound', 'Best Animated Feature'
            ],
            nominationWeek: 4,
            ceremonyWeek: 10,
            momentumBonus: 12,
          } as const;
        case 'Performers Guild':
          return {
            medium: 'film' as const,
            prestige: 6,
            categories: [
              'Outstanding Ensemble',
              'Best Actor',
              'Best Actress',
              'Best Supporting Actor',
              'Best Supporting Actress',
              'Outstanding Stunt Ensemble'
            ],
            nominationWeek: 5,
            ceremonyWeek: 12,
            momentumBonus: 6,
          } as const;
        case 'Directors Circle':
          return {
            medium: 'film' as const,
            prestige: 7,
            categories: [
              'Directing Achievement',
              'First-Time Feature Director',
              'Best Director - Genre',
              'Best Director - Drama'
            ],
            nominationWeek: 6,
            ceremonyWeek: 13,
            momentumBonus: 7,
          } as const;
        case 'Writers Circle':
          return {
            medium: 'film' as const,
            prestige: 7,
            categories: [
              'Best Original Screenplay',
              'Best Adapted Screenplay',
              'Breakthrough Screenplay'
            ],
            nominationWeek: 7,
            ceremonyWeek: 14,
            momentumBonus: 7,
          } as const;
        case 'Britannia Screen':
          return {
            medium: 'film' as const,
            prestige: 8,
            categories: [
              'Best Film',
              'Best Director',
              'Best Actor',
              'Best Actress',
              'Best Screenplay',
              'Best Cinematography',
              'Best Debut'
            ],
            nominationWeek: 8,
            ceremonyWeek: 15,
            momentumBonus: 8,
          } as const;
        default:
          return {
            medium: 'film' as const,
            prestige: 6,
            categories: ['Best Picture', 'Best Director', 'Best Actor', 'Best Actress'],
            nominationWeek: 4,
            ceremonyWeek: 10,
            momentumBonus: 6,
          } as const;
      }
    })();

    return {
      ...base,
      medium: show?.medium ?? base.medium,
      nominationWeek: show?.nominationWeek ?? base.nominationWeek,
      ceremonyWeek: show?.ceremonyWeek ?? base.ceremonyWeek,
    };
  };

  const announceNominations = (ceremonyName: string) => {
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (seasonNominations[key]) return; // idempotent

    const { categories, medium } = getShowConfig(ceremonyName);
    const eligible = getEligibleProjects(medium);

    const categoriesMap: Record<string, Array<{ project: Project; score: number }>> = {};

    categories.forEach((category) => {
      const categoryLower = category.toLowerCase();

      const ranked = eligible
        .map((project) => {
          const base = calculateAwardsProbability(project, medium);
          const momentum = seasonMomentum[project.id] || 0;
          
          // Enhanced category bias
          let categoryBias = 0;
          if (categoryLower.includes('director') || categoryLower.includes('directing')) categoryBias = 5;
          else if (categoryLower.includes('actor') || categoryLower.includes('actress')) categoryBias = 3;
          else if (categoryLower.includes('screenplay')) categoryBias = 4;
          else if (categoryLower.includes('cinematography') || categoryLower.includes('visual')) categoryBias = 6;
          else if (categoryLower.includes('editing') || categoryLower.includes('sound')) categoryBias = 2;
          
          // Medium-aware category gating / bias
          if (medium === 'film') {
            if (categoryLower.includes('animated') && project.script?.genre !== 'animation') return { project, score: 0 };
            if (categoryLower.includes('comedy') && project.script?.genre !== 'comedy') categoryBias -= 3;
            if (categoryLower.includes('drama') && ['drama', 'biography', 'historical'].includes(project.script?.genre || '')) categoryBias += 5;
          } else {
            // TV awards
            if (categoryLower.includes('limited series') && project.type !== 'limited-series') return { project, score: 0 };

            if (categoryLower.includes('drama series')) {
              if (project.script?.genre !== 'drama') return { project, score: 0 };
              categoryBias += 4;
            }

            if (categoryLower.includes('comedy series')) {
              if (project.script?.genre !== 'comedy') return { project, score: 0 };
              categoryBias += 4;
            }

            if (categoryLower.includes('writing') || categoryLower.includes('directing')) {
              const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;
              categoryBias += Math.max(-3, Math.min(6, (criticalPotential - 5) * 1.5));
            }
          }

          // Critically acclaimed actor/director boost for individual categories
          let talentBonus = 0;
          const isActingCategory = categoryLower.includes('actor') || categoryLower.includes('actress');
          const isDirectorCategory = categoryLower.includes('director') || categoryLower.includes('directing');
          const isTalentCategory = isActingCategory || isDirectorCategory;

          if (isTalentCategory) {
            const talent = findRelevantTalent(project, category);
            if (talent) {
              const baseRep = talent.reputation || 50;
              const awardsCount = talent.awards?.length || 0;
              const fame = talent.fame ?? 0;

              // Reputation above/below 50 pulls score modestly.
              const repBonus = (baseRep - 50) * 0.4; // max about ±20
              // Prior awards and fame give additional small boosts.
              const awardsBonus = Math.min(10, awardsCount * 2);
              const fameBonus = Math.min(10, fame * 0.1);

              talentBonus = repBonus + awardsBonus + fameBonus;
            }
          }
          
          const score = Math.min(
            100,
            base + momentum + categoryBias + talentBonus + (Math.random() * 8 - 4)
          );
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

    // Hook nominations into the media feed (keep it lightweight: 1-2 highlight stories per show)
    const nominationHighlights: Array<{ project: Project; category: string }> = [];
    const isPlayerProject = (p: Project) => gameState.projects.some(pp => pp.id === p.id);

    for (const [category, ranked] of Object.entries(categoriesMap)) {
      const playerNominee = ranked.find(n => isPlayerProject(n.project));
      if (playerNominee) {
        nominationHighlights.push({ project: playerNominee.project, category });
        break;
      }
    }

    const headlineCategory =
      Object.keys(categoriesMap).find(c => /best (picture|film)/i.test(c)) ||
      Object.keys(categoriesMap)[0];

    if (headlineCategory) {
      const top = categoriesMap[headlineCategory]?.[0];
      if (top && !nominationHighlights.some(n => n.project.id === top.project.id)) {
        nominationHighlights.push({ project: top.project, category: headlineCategory });
      }
    }

    let queuedNominationMedia = false;
    nominationHighlights.slice(0, 2).forEach(({ project, category }) => {
      const isPlayer = isPlayerProject(project);
      const competitorStudio = !isPlayer && project.studioName
        ? gameState.competitorStudios.find(s => s.name === project.studioName)
        : undefined;
      const studioId = isPlayer ? gameState.studio.id : competitorStudio?.id;

      const isTalentCategory = category.toLowerCase().includes('actor') || category.toLowerCase().includes('actress') || category.toLowerCase().includes('director') || category.toLowerCase().includes('directing');
      const talent = isTalentCategory ? findRelevantTalent(project, category) : undefined;

      MediaEngine.queueMediaEvent({
        type: 'award_nomination',
        triggerType: 'automatic',
        priority: isPlayer ? 'high' : 'medium',
        entities: {
          studios: studioId ? [studioId] : undefined,
          projects: [project.id],
          talent: talent ? [talent.id] : undefined
        },
        eventData: {
          project,
          talent,
          awardName: `${ceremonyName} - ${category}`
        },
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
      queuedNominationMedia = true;
    });

    if (queuedNominationMedia) {
      MediaEngine.processMediaEvents(gameState);
    }

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
    let extraTalentStudioReputation = 0;

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
        const isDirectorCategory = category.toLowerCase().includes('director') || category.toLowerCase().includes('directing');
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

              // Small studio reputation bump for acting/director wins on player films
              const isPlayerProject = gameState.projects.some(p => p.id === n.project.id);
              if (isPlayerProject) {
                // Much smaller than full StudioAward; treat talent wins as secondary studio prestige.
                extraTalentStudioReputation += Math.max(1, Math.round(prestige * 0.5));
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

    // Hook player award wins into the media feed (1 headline story per ceremony)
    const playerWin = flatForModal.find(f => f.won && gameState.projects.some(p => p.id === f.project.id));
    if (playerWin) {
      const awardName = `${ceremonyName} - ${playerWin.category}`;
      const isTalentCategory = playerWin.category.toLowerCase().includes('actor') || playerWin.category.toLowerCase().includes('actress') || playerWin.category.toLowerCase().includes('director') || playerWin.category.toLowerCase().includes('directing');
      const talent = isTalentCategory ? findRelevantTalent(playerWin.project, playerWin.category) : undefined;

      MediaEngine.queueMediaEvent({
        type: 'award_win',
        triggerType: 'automatic',
        priority: 'breaking',
        entities: {
          studios: [gameState.studio.id],
          projects: [playerWin.project.id],
          talent: talent ? [talent.id] : undefined
        },
        eventData: { project: playerWin.project, talent, awardName, award: awardName },
        week: gameState.currentWeek,
        year: gameState.currentYear
      });

      MediaEngine.processMediaEvents(gameState);
    }

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
      const isPlayerProject = (p: Project) => gameState.projects.some(pp => pp.id === p.id);

      categories.forEach((category) => {
        const nominees = nominationsRecord.categories[category] || [];
        ceremonyData.nominations[category] = nominees.map(n => {
          const t = (category.toLowerCase().includes('actor') || category.toLowerCase().includes('actress') || category.toLowerCase().includes('director') || category.toLowerCase().includes('directing'))
            ? findRelevantTalent(n.project, category)
            : undefined;

          const isPlayer = isPlayerProject(n.project);
          const studioName = isPlayer ? gameState.studio.name : (n.project.studioName || 'AI Studio');

          return {
            ...n,
            category,
            project: { ...n.project, studioId: isPlayer ? 'player' : 'ai', studioName } as any,
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
            const isPlayer = isPlayerProject(winner.project);
            const studioName = isPlayer ? gameState.studio.name : (winner.project.studioName || 'AI Studio');

            (ceremonyData.winners as any)[category] = {
              ...winner,
              category,
              won: true,
              award: winnerData.award,
              talentName: winnerData.talentName,
              project: { ...winner.project, studioId: isPlayer ? 'player' : 'ai', studioName } as any
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

      if (wonStudioAwards.length > 0 || extraTalentStudioReputation > 0) {
        const totalReputationFromAwards = wonStudioAwards.reduce((sum, award) => sum + award.reputationBoost, 0);
        const totalReputation = totalReputationFromAwards + extraTalentStudioReputation;
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
    const shows = getAwardShowsForYear(gameState.currentYear);

    shows.forEach((s) => {
      if (gameState.currentWeek === s.nominationWeek) announceNominations(s.name);
    });
    shows.forEach((s) => triggerAwardsCeremony(s.name));
  }, [gameState.currentWeek, gameState.currentYear]);

  // Helper function to find relevant talent for awards categories
  const findRelevantTalent = (project: Project, category: string): TalentPerson | undefined => {
    const categoryLower = category.toLowerCase();

    // Prefer explicit cast/crew lists first
    const castEntries = project.cast || [];
    const crewEntries = project.crew || [];
    const characters = project.script?.characters || [];

    const getTalentById = (id?: string) => gameState.talent.find(t => t.id === id);
    const pick = <T,>(items: T[], suffix: string) => stablePick(items, `${project.id}|${categoryLower}|${suffix}`);

    // Director category
    if (categoryLower.includes('director') || categoryLower.includes('directing')) {
      // From cast/crew credits
      const directorEntries = [...castEntries, ...crewEntries].filter(c => (c.role || '').toLowerCase().includes('director'));
      const castDir = directorEntries.length > 1 ? pick(directorEntries, 'director') : directorEntries[0];
      if (castDir) {
        const t = getTalentById((castDir as any).talentId);
        if (t && t.type === 'director') return t;
      }

      // Fallback to script characters
      const directorChars = characters.filter(c => c.requiredType === 'director' && !!c.assignedTalentId);
      const charDir = directorChars.length > 1 ? pick(directorChars, 'director-char') : directorChars[0];
      const t = getTalentById(charDir?.assignedTalentId);
      if (t && t.type === 'director') return t;

      const directors = gameState.talent.filter(tt => tt.type === 'director');
      return directors.length > 0 ? pick(directors, 'global-director-fallback') : undefined;
    }

    // Acting categories - deterministic selection (no Math.random), with gender handling
    const isActress = categoryLower.includes('actress');
    const isSupporting = categoryLower.includes('supporting');

    const genderOkStrict = (talent: TalentPerson | undefined) => {
      if (!talent || talent.type !== 'actor') return false;
      if (isActress) return talent.gender === 'Female';
      return talent.gender !== 'Female';
    };

    const genderOkLoose = (talent: TalentPerson | undefined) => {
      return !!talent && talent.type === 'actor';
    };

    const byRoleMatch = (role: string) => role.toLowerCase().includes(isSupporting ? 'supporting' : 'lead');

    const roleCandidatesStrict = castEntries
      .filter(c => byRoleMatch(c.role))
      .filter(c => genderOkStrict(getTalentById((c as any).talentId)));

    const roleCandidates = roleCandidatesStrict.length > 0
      ? roleCandidatesStrict
      : castEntries
          .filter(c => byRoleMatch(c.role))
          .filter(c => genderOkLoose(getTalentById((c as any).talentId)));

    if (roleCandidates.length > 0) {
      const chosen = roleCandidates.length > 1 ? pick(roleCandidates, isSupporting ? 'supporting' : 'lead') : roleCandidates[0];
      const talent = getTalentById((chosen as any).talentId);
      if (talent && talent.type === 'actor') return talent;
    }

    // Any actor from cast (prefer gender-match but never return empty)
    const anyActorCastStrict = castEntries.filter(c => genderOkStrict(getTalentById((c as any).talentId)));
    const anyActorCast = anyActorCastStrict.length > 0
      ? anyActorCastStrict
      : castEntries.filter(c => genderOkLoose(getTalentById((c as any).talentId)));

    if (anyActorCast.length > 0) {
      const chosen = anyActorCast.length > 1 ? pick(anyActorCast, 'any-actor') : anyActorCast[0];
      const talent = getTalentById((chosen as any).talentId);
      if (talent && talent.type === 'actor') return talent;
    }

    // Fallback to script characters (prefer gender-match but never return empty)
    const charCandidatesStrict = characters.filter(ch => {
      if (ch.requiredType === 'director') return false;
      const talent = getTalentById(ch.assignedTalentId);
      if (!genderOkStrict(talent)) return false;
      if (isSupporting) return ch.importance === 'supporting';
      return ch.importance === 'lead';
    });

    const charCandidates = charCandidatesStrict.length > 0
      ? charCandidatesStrict
      : characters.filter(ch => {
          if (ch.requiredType === 'director') return false;
          const talent = getTalentById(ch.assignedTalentId);
          if (!genderOkLoose(talent)) return false;
          if (isSupporting) return ch.importance === 'supporting';
          return ch.importance === 'lead';
        });

    const chosenChar = charCandidates.length > 1
      ? pick(charCandidates, isSupporting ? 'supporting-char' : 'lead-char')
      : charCandidates[0];

    const talent = getTalentById(chosenChar?.assignedTalentId);
    if (talent && talent.type === 'actor') return talent;

    // Final fallback: pick any actor from the global pool.
    const actorPoolStrict = gameState.talent.filter(t => genderOkStrict(t));
    const actorPool = actorPoolStrict.length > 0 ? actorPoolStrict : gameState.talent.filter(t => genderOkLoose(t));
    return actorPool.length > 0 ? pick(actorPool, 'global-actor-fallback') : undefined;
  };
}
