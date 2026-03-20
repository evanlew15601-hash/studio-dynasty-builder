import { useEffect } from 'react';
import { AwardsSeasonState, GameEvent, GameState, Project, Studio, StudioAward, TalentAward, TalentPerson } from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import { useToast } from '@/hooks/use-toast';
import { AwardShowCeremony } from '@/components/game/IndividualAwardShowModal';
import { hashStringToUint32, stablePick } from '@/utils/stablePick';
import { stableFloat01 } from '@/utils/stableRandom';
import { MediaEngine } from '@/components/game/MediaEngine';
import { logDebug } from '@/utils/logger';

// Headless awards season engine: runs nominations and ceremonies regardless of UI phase
export function useAwardsEngine(
  gameState: GameState,
  onStudioUpdate: (updates: Partial<Studio>) => void,
  onTalentUpdate?: (talentId: string, updates: Partial<TalentPerson>) => void,
  onAwardShowTrigger?: (ceremony: AwardShowCeremony) => void,
  onGameStateUpdate?: (updates: Partial<GameState>) => void,
  options?: { suppressAwardShowEvents?: boolean }
) {
  const { toast } = useToast();

  const isTvProject = (project: Project) => project.type === 'series' || project.type === 'limited-series';
  const isFilmProject = (project: Project) => !isTvProject(project);

  const getSeasonState = (): AwardsSeasonState => {
    const existing = gameState.awardsSeason;
    if (existing && existing.year === gameState.currentYear) return existing;
    return {
      year: gameState.currentYear,
      processedCeremonies: [],
      seasonMomentum: {},
      seasonNominations: {},
    };
  };

  const setSeasonState = (next: AwardsSeasonState) => {
    if (!onGameStateUpdate) return;
    onGameStateUpdate({ awardsSeason: next });
  };

  function triggerDateFromWeekYear(year: number, week: number): Date {
    // Game years are not real-world years; we just need a stable Date for UI ordering.
    return new Date(year, 0, 1 + Math.max(0, week - 1) * 7);
  }

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

  const getShowByKey = (key: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    return schedule.find((s) => s.id === key) ?? schedule.find((s) => s.name === key);
  };

  const isTalentCategory = (category: AwardCategoryDefinition): boolean => {
    if (category.awardKind === 'talent') return true;
    const cl = category.name.toLowerCase();
    return cl.includes('actor') || cl.includes('actress') || cl.includes('director') || cl.includes('directing');
  };

  const computeNominations = (showId: string): {
    showName: string;
    medium: 'film' | 'tv';
    categories: AwardCategoryDefinition[];
    nominationsForState: Record<string, Array<{ projectId: string; score: number }>>;
    nominationsWithProjects: Record<string, Array<{ project: Project; score: number }>>;
  } | null => {
    const show = getShowByKey(showId);
    if (!show) return null;

    const categories = show.categories || [];
    const eligible = getEligibleProjects(show.medium);

    const season = getSeasonState();
    const seasonMomentum = season.seasonMomentum || {};

    const seedRoot = `awards|${gameState.universeSeed ?? 0}|Y${gameState.currentYear}|${show.id}`;

    const nominationsForState: Record<string, Array<{ projectId: string; score: number }>> = {};
    const nominationsWithProjects: Record<string, Array<{ project: Project; score: number }>> = {};

    categories.forEach((category) => {
      const categoryName = category.name;
      const categoryLower = categoryName.toLowerCase();

      const ranked = eligible
        .map((project) => {
          if (category.eligibility?.projectTypes && !category.eligibility.projectTypes.includes(project.type)) {
            return { project, score: 0 };
          }

          if (category.eligibility?.genres && !category.eligibility.genres.includes(project.script.genre)) {
            return { project, score: 0 };
          }

          if (category.eligibility?.requireAnimation && project.script.genre !== 'animation') {
            return { project, score: 0 };
          }

          const base = calculateAwardsProbability(project, show.medium);
          const momentum = seasonMomentum[project.id] || 0;

          // Enhanced category bias
          let categoryBias = 0;
          if (categoryLower.includes('director') || categoryLower.includes('directing')) categoryBias = 5;
          else if (categoryLower.includes('actor') || categoryLower.includes('actress')) categoryBias = 3;
          else if (categoryLower.includes('screenplay')) categoryBias = 4;
          else if (categoryLower.includes('cinematography') || categoryLower.includes('visual')) categoryBias = 6;
          else if (categoryLower.includes('editing') || categoryLower.includes('sound')) categoryBias = 2;

          if (typeof category.bias === 'number') categoryBias += category.bias;

          // Medium-aware category gating / bias (fallback logic driven by the category name)
          if (show.medium === 'film') {
            if (categoryLower.includes('animated') && project.script.genre !== 'animation') return { project, score: 0 };
            if (categoryLower.includes('comedy') && project.script.genre !== 'comedy') categoryBias -= 3;
            if (categoryLower.includes('drama') && ['drama', 'biography', 'historical'].includes(project.script.genre || '')) categoryBias += 5;
          } else {
            // TV awards
            if (categoryLower.includes('limited series') && project.type !== 'limited-series') return { project, score: 0 };

            if (categoryLower.includes('drama series')) {
              if (project.script.genre !== 'drama') return { project, score: 0 };
              categoryBias += 4;
            }

            if (categoryLower.includes('comedy series')) {
              if (project.script.genre !== 'comedy') return { project, score: 0 };
              categoryBias += 4;
            }

            if (categoryLower.includes('writing') || categoryLower.includes('directing')) {
              const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;
              categoryBias += Math.max(-3, Math.min(6, (criticalPotential - 5) * 1.5));
            }
          }

          // Critically acclaimed actor/director boost for individual categories
          let talentBonus = 0;
          if (isTalentCategory(category)) {
            const talent = findRelevantTalent(project, categoryName, category);
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

          const noise = (stableFloat01(`${seedRoot}|${categoryName}|${project.id}|noise`) * 8) - 4;

          const score = Math.min(100, base + momentum + categoryBias + talentBonus + noise);
          return { project, score };
        })
        .filter(({ score }) => score > 10) // Filter out clearly ineligible
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      nominationsWithProjects[categoryName] = ranked;
      nominationsForState[categoryName] = ranked.map((r) => ({ projectId: r.project.id, score: r.score }));
    });

    return {
      showName: show.name,
      medium: show.medium,
      categories,
      nominationsForState,
      nominationsWithProjects,
    };
  };

  const announceNominations = (showKey: string) => {
    const show = getShowByKey(showKey);
    if (!show) return;

    const key = `${show.id}-${gameState.currentYear}`;
    const season = getSeasonState();

    if (season.seasonNominations[key]) return; // idempotent

    const computed = computeNominations(show.id);
    if (!computed) return;

    const nextSeason: AwardsSeasonState = {
      ...season,
      seasonNominations: {
        ...season.seasonNominations,
        [key]: { year: gameState.currentYear, categories: computed.nominationsForState },
      },
    };

    setSeasonState(nextSeason);

    // Hook nominations into the media feed (1 highlight story per show)
    const isPlayerProject = (p: Project) => gameState.projects.some(pp => pp.id === p.id);

    let highlight: { project: Project; category: string } | undefined;

    for (const [category, ranked] of Object.entries(computed.nominationsWithProjects)) {
      const playerNominee = ranked.find(n => isPlayerProject(n.project));
      if (playerNominee) {
        highlight = { project: playerNominee.project, category };
        break;
      }
    }

    if (!highlight) {
      const headlineCategory =
        Object.keys(computed.nominationsWithProjects).find(c => /best (picture|film)/i.test(c)) ||
        Object.keys(computed.nominationsWithProjects)[0];

      if (headlineCategory) {
        const top = computed.nominationsWithProjects[headlineCategory]?.[0];
        if (top) highlight = { project: top.project, category: headlineCategory };
      }
    }

    const categoryDefByName = new Map(computed.categories.map((c) => [c.name, c] as const));

    let queuedNominationMedia = false;
    if (highlight) {
      const { project, category } = highlight;
      const isPlayer = isPlayerProject(project);
      const competitorStudio = !isPlayer && project.studioName
        ? gameState.competitorStudios.find(s => s.name === project.studioName)
        : undefined;
      const studioId = isPlayer ? gameState.studio.id : competitorStudio?.id;

      const categoryDef = categoryDefByName.get(category);
      const talent = categoryDef && isTalentCategory(categoryDef)
        ? findRelevantTalent(project, category, categoryDef)
        : undefined;

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
          awardName: `${show.name} - ${category}`
        },
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
      queuedNominationMedia = true;
    }

    if (queuedNominationMedia) {
      MediaEngine.processMediaEvents(gameState);
    }

    logDebug(`[AwardsEngine] ${show.name} nominations announced for Y${gameState.currentYear}`);
    toast({
      title: `${show.name} Nominations Announced`,
      description: `Top contenders selected across ${computed.categories.length} categories.`,
    });
  };

  const triggerAwardsCeremony = (showKey: string) => {
    const show = getShowByKey(showKey);
    if (!show) return;

    const { ceremonyWeek, prestige, momentumBonus, categories } = show;
    const ceremonyName = show.name;

    const key = `${show.id}-${gameState.currentYear}`;
    if (gameState.currentWeek !== ceremonyWeek) return;

    let season = getSeasonState();
    if (season.processedCeremonies.includes(key)) return;

    if (!season.seasonNominations[key]) {
      const computed = computeNominations(show.id);
      if (!computed) return;

      season = {
        ...season,
        seasonNominations: {
          ...season.seasonNominations,
          [key]: { year: gameState.currentYear, categories: computed.nominationsForState },
        },
      };
      setSeasonState(season);
    }

    const nominationsRecord = season.seasonNominations[key];
    if (!nominationsRecord) return;

    const eligible = getEligibleProjects(show.medium);
    const byId = new Map(eligible.map((p) => [p.id, p] as const));

    const categoryDefByName = new Map(categories.map((c) => [c.name, c] as const));

    const flatForModal: Array<{ project: Project; category: string; won: boolean; award?: StudioAward; talentAward?: TalentAward; talentName?: string }> = [];
    const winnersThisShow: string[] = [];
    let extraTalentStudioReputation = 0;

    const seedRoot = `awards|${gameState.universeSeed ?? 0}|Y${gameState.currentYear}|${show.id}|ceremony`;

    categories.forEach((categoryDef) => {
      const category = categoryDef.name;

      const nominees = (nominationsRecord.categories[category] || [])
        .map((n) => {
          const project = byId.get(n.projectId);
          return project ? { project, score: n.score } : null;
        })
        .filter(Boolean) as Array<{ project: Project; score: number }>;

      if (nominees.length === 0) return;

      const weighted = nominees.map((n, idx) => ({
        ...n,
        weight: (nominees.length - idx) * 1.5 + (season.seasonMomentum[n.project.id] || 0) / 10,
      }));

      const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
      let r = stableFloat01(`${seedRoot}|${category}|pick`) * totalWeight;
      let winner = weighted[0];
      for (const w of weighted) {
        r -= w.weight;
        if (r <= 0) {
          winner = w;
          break;
        }
      }

      nominees.forEach((n) => {
        const won = n.project.id === winner.project.id;
        const categoryIsTalent = isTalentCategory(categoryDef);

        let talentAward: TalentAward | undefined;
        let studioAward: StudioAward | undefined;
        let talentName: string | undefined;

        if (won) {
          const catKey = hashStringToUint32(category).toString(36);

          if (categoryIsTalent) {
            // Find relevant talent for this category
            const relevantTalent = findRelevantTalent(n.project, category, categoryDef);
            if (relevantTalent) {
              talentAward = {
                id: `talent-award:${show.id}:${gameState.currentYear}:${catKey}:${relevantTalent.id}:${n.project.id}`,
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
              id: `award:${show.id}:${gameState.currentYear}:${catKey}:${n.project.id}`,
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
      const def = categoryDefByName.get(playerWin.category);
      const talent = def && isTalentCategory(def) ? findRelevantTalent(playerWin.project, playerWin.category, def) : undefined;

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

    season = {
      ...season,
      processedCeremonies: [...season.processedCeremonies, key],
    };

    if (winnersThisShow.length > 0) {
      const next = { ...(season.seasonMomentum || {}) };
      winnersThisShow.forEach((pid) => {
        next[pid] = (next[pid] || 0) + momentumBonus;
      });
      season = {
        ...season,
        seasonMomentum: next,
      };
    }

    setSeasonState(season);

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

      categories.forEach((categoryDef) => {
        const category = categoryDef.name;

        const nominees = (nominationsRecord.categories[category] || [])
          .map((n) => {
            const project = byId.get(n.projectId);
            return project ? { project, score: n.score } : null;
          })
          .filter(Boolean) as Array<{ project: Project; score: number }>;

        ceremonyData.nominations[category] = nominees.map(n => {
          const t = isTalentCategory(categoryDef) ? findRelevantTalent(n.project, category, categoryDef) : undefined;

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
      categories.forEach((categoryDef) => {
        const category = categoryDef.name;

        const nominees = (nominationsRecord.categories[category] || [])
          .map((n) => {
            const project = byId.get(n.projectId);
            return project ? { project, score: n.score } : null;
          })
          .filter(Boolean) as Array<{ project: Project; score: number }>;

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

      if (!options?.suppressAwardShowEvents && onGameStateUpdate) {
        const eventId = `awards:ceremony:${show.id}:${gameState.currentYear}`;
        const alreadyQueued = (gameState.eventQueue || []).some((e) => e?.id === eventId);

        if (!alreadyQueued) {
          const awardEvent: GameEvent = {
            id: eventId,
            title: `${ceremonyName} Awards`,
            description: `The ${ceremonyName} Awards are live this week.\n\nYou can watch the ceremony now, or skip and review the results later in the Awards tab.`,
            type: 'opportunity',
            triggerDate: triggerDateFromWeekYear(gameState.currentYear, gameState.currentWeek),
            data: {
              kind: 'awards:ceremony',
              ceremony: ceremonyData,
              showId: show.id,
              year: gameState.currentYear,
            },
            choices: [
              {
                id: 'watch',
                text: 'Watch the show',
                consequences: [],
              },
              {
                id: 'skip',
                text: 'Skip (view results later)',
                consequences: [],
              },
            ],
          };

          onGameStateUpdate({
            eventQueue: [...(gameState.eventQueue || []), awardEvent],
          });
        }
      } else if (onAwardShowTrigger) {
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

      logDebug(
        `[AwardsEngine] ${ceremonyName} ceremony processed for Y${gameState.currentYear} (awards: ${flatForModal.length})`
      );
      
    }
  };

  // Reset season each year/week 1
  useEffect(() => {
    if (gameState.currentWeek !== 1) return;

    const season = gameState.awardsSeason;
    if (season && season.year === gameState.currentYear && season.processedCeremonies.length === 0) return;

    setSeasonState({
      year: gameState.currentYear,
      processedCeremonies: [],
      seasonMomentum: {},
      seasonNominations: {},
    });

    logDebug(`[AwardsEngine] Reset season state for Y${gameState.currentYear}`);
  }, [gameState.currentYear, gameState.currentWeek]);

  // Weekly triggers
  useEffect(() => {
    const shows = getAwardShowsForYear(gameState.currentYear);

    shows.forEach((s) => {
      if (gameState.currentWeek === s.nominationWeek) announceNominations(s.id);
    });
    shows.forEach((s) => triggerAwardsCeremony(s.id));
  }, [gameState.currentWeek, gameState.currentYear]);

  // Helper function to find relevant talent for awards categories
  const findRelevantTalent = (project: Project, category: string, categoryDef?: AwardCategoryDefinition): TalentPerson | undefined => {
    const categoryLower = category.toLowerCase();

    // Prefer explicit cast/crew lists first
    const castEntries = project.cast || [];
    const crewEntries = project.crew || [];
    const characters = project.script?.characters || [];

    const getTalentById = (id?: string) => gameState.talent.find(t => t.id === id);
    const pick = <T,>(items: T[], suffix: string) => stablePick(items, `${project.id}|${categoryLower}|${suffix}`);

    const desiredTalentType = categoryDef?.talent?.type;
    const desiredGender = categoryDef?.talent?.gender;
    const desiredSupporting = categoryDef?.talent?.supporting;

    // Director category
    const directorCategory = desiredTalentType === 'director' || categoryLower.includes('director') || categoryLower.includes('directing');

    if (directorCategory) {
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
    const isSupporting = desiredSupporting ?? categoryLower.includes('supporting');

    const genderOkStrict = (talent: TalentPerson | undefined) => {
      if (!talent || talent.type !== 'actor') return false;
      if (desiredGender) return talent.gender === desiredGender;
      if (categoryLower.includes('actress')) return talent.gender === 'Female';
      if (categoryLower.includes('actor')) return talent.gender !== 'Female';
      return true;
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
