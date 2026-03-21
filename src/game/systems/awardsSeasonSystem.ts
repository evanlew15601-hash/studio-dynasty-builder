import type {
  AwardsCeremonyRecord,
  AwardsSeasonState,
  GameEvent,
  GameState,
  Project,
  StudioAward,
  TalentAward,
  TalentPerson,
} from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import type { AwardCategoryDefinition, AwardShowDefinition } from '@/data/AwardsSchedule';
import { hashStringToUint32, stablePick } from '@/utils/stablePick';
import { stableFloat01 } from '@/utils/stableRandom';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import type { TickSystem } from '../core/types';



function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

function isFilmProject(project: Project): boolean {
  return !isTvProject(project);
}

function isTalentCategory(category: AwardCategoryDefinition): boolean {
  if (category.awardKind === 'talent') return true;
  if (category.talent) return true;
  const cl = category.name.toLowerCase();
  return cl.includes('actor') || cl.includes('actress') || cl.includes('director') || cl.includes('directing');
}

function isActorCategory(category: AwardCategoryDefinition): boolean {
  if (category.talent?.type === 'actor') return true;
  const cl = category.name.toLowerCase();
  if (cl.includes('director') || cl.includes('directing')) return false;
  return cl.includes('actor') || cl.includes('actress');
}

function actorDedupKey(category: AwardCategoryDefinition): string {
  const gender = category.talent?.gender;
  if (gender) return gender;

  const cl = category.name.toLowerCase();
  if (cl.includes('actress')) return 'Female';
  if (cl.includes('actor')) return 'Male';

  return 'any';
}



function getSeasonState(state: GameState, year: number): AwardsSeasonState {
  const existing = state.awardsSeason;
  if (existing && existing.year === year) return existing;
  return {
    year,
    processedCeremonies: [],
    seasonMomentum: {},
    seasonNominations: {},
    ceremonyHistory: {},
  };
}

function getFilmAwardsEndWeek(year: number): number {
  const weeks = getAwardShowsForYear(year)
    .filter((s) => s.medium === 'film')
    .map((s) => s.ceremonyWeek);
  return weeks.length > 0 ? Math.max(...weeks) : 12;
}

function getEligibleProjects(state: GameState, year: number, medium: 'film' | 'tv'): Project[] {
  const matchesMedium = (p: Project) => (medium === 'tv' ? isTvProject(p) : isFilmProject(p));

  const playerProjects = (state.projects || []).filter(
    (project) =>
      project.status === 'released' &&
      project.releaseYear === year - 1 &&
      !!project.metrics?.criticsScore &&
      (project.metrics.criticsScore || 0) >= 45 &&
      matchesMedium(project)
  );

  const aiProjects = (state.allReleases || []).filter((release): release is Project => {
    if (!release) return false;
    if (!('script' in (release as any))) return false;
    const p = release as any as Project;
    return (
      p.status === 'released' &&
      p.releaseYear === year - 1 &&
      !!p.metrics?.criticsScore &&
      (p.metrics.criticsScore || 0) >= 45 &&
      matchesMedium(p)
    );
  });

  const byId = new Map<string, Project>();
  for (const p of playerProjects) byId.set(p.id, p);
  for (const p of aiProjects) byId.set(p.id, p);

  return [...byId.values()];
}

function calculateAwardsProbability(params: {
  state: GameState;
  project: Project;
  medium: 'film' | 'tv';
  year: number;
  isFilmAwardsSeasonWindow: boolean;
}): number {
  const { state, project, medium, isFilmAwardsSeasonWindow } = params;

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
}

function findRelevantTalent(params: {
  state: GameState;
  project: Project;
  category: string;
  categoryDef?: AwardCategoryDefinition;
}): TalentPerson | undefined {
  const { state, project, category, categoryDef } = params;

  const categoryLower = category.toLowerCase();

  // Prefer explicit cast/crew lists first
  const castEntries = project.cast || [];
  const crewEntries = project.crew || [];
  const characters = project.script?.characters || [];

  const getTalentById = (id?: string) => (state.talent || []).find((t) => t.id === id);
  const pick = <T,>(items: T[], suffix: string) => stablePick(items, `${project.id}|${categoryLower}|${suffix}`);

  const desiredTalentType = categoryDef?.talent?.type;
  const desiredGender = categoryDef?.talent?.gender;
  const desiredSupporting = categoryDef?.talent?.supporting;

  // Director category
  const directorCategory = desiredTalentType === 'director' || categoryLower.includes('director') || categoryLower.includes('directing');

  if (directorCategory) {
    // From cast/crew credits
    const directorEntries = [...castEntries, ...crewEntries].filter((c) => (c.role || '').toLowerCase().includes('director'));
    const castDir = directorEntries.length > 1 ? pick(directorEntries, 'director') : directorEntries[0];
    if (castDir) {
      const t = getTalentById((castDir as any).talentId);
      if (t && t.type === 'director') return t;
    }

    // Fallback to script characters
    const directorChars = characters.filter((c) => c.requiredType === 'director' && !!c.assignedTalentId);
    const charDir = directorChars.length > 1 ? pick(directorChars, 'director-char') : directorChars[0];
    const t = getTalentById(charDir?.assignedTalentId);
    if (t && t.type === 'director') return t;

    const directors = (state.talent || []).filter((tt) => tt.type === 'director');
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
    .filter((c) => byRoleMatch(c.role))
    .filter((c) => genderOkStrict(getTalentById((c as any).talentId)));

  const roleCandidates =
    roleCandidatesStrict.length > 0
      ? roleCandidatesStrict
      : castEntries
          .filter((c) => byRoleMatch(c.role))
          .filter((c) => genderOkLoose(getTalentById((c as any).talentId)));

  if (roleCandidates.length > 0) {
    const chosen = roleCandidates.length > 1 ? pick(roleCandidates, isSupporting ? 'supporting' : 'lead') : roleCandidates[0];
    const talent = getTalentById((chosen as any).talentId);
    if (talent && talent.type === 'actor') return talent;
  }

  // Any actor from cast (prefer gender-match but never return empty)
  const anyActorCastStrict = castEntries.filter((c) => genderOkStrict(getTalentById((c as any).talentId)));
  const anyActorCast =
    anyActorCastStrict.length > 0 ? anyActorCastStrict : castEntries.filter((c) => genderOkLoose(getTalentById((c as any).talentId)));

  if (anyActorCast.length > 0) {
    const chosen = anyActorCast.length > 1 ? pick(anyActorCast, 'any-actor') : anyActorCast[0];
    const talent = getTalentById((chosen as any).talentId);
    if (talent && talent.type === 'actor') return talent;
  }

  // Fallback to script characters (prefer gender-match but never return empty)
  const charCandidatesStrict = characters.filter((ch) => {
    if (ch.requiredType === 'director') return false;
    const talent = getTalentById(ch.assignedTalentId);
    if (!genderOkStrict(talent)) return false;
    if (isSupporting) return ch.importance === 'supporting';
    return ch.importance === 'lead';
  });

  const charCandidates =
    charCandidatesStrict.length > 0
      ? charCandidatesStrict
      : characters.filter((ch) => {
          if (ch.requiredType === 'director') return false;
          const talent = getTalentById(ch.assignedTalentId);
          if (!genderOkLoose(talent)) return false;
          if (isSupporting) return ch.importance === 'supporting';
          return ch.importance === 'lead';
        });

  const chosenChar = charCandidates.length > 1 ? pick(charCandidates, isSupporting ? 'supporting-char' : 'lead-char') : charCandidates[0];

  const talent = getTalentById(chosenChar?.assignedTalentId);
  if (talent && talent.type === 'actor') return talent;

  // Final fallback: pick any actor from the global pool.
  const actorPoolStrict = (state.talent || []).filter((t) => genderOkStrict(t));
  const actorPool = actorPoolStrict.length > 0 ? actorPoolStrict : (state.talent || []).filter((t) => genderOkLoose(t));
  return actorPool.length > 0 ? pick(actorPool, 'global-actor-fallback') : undefined;
}

function computeNominations(params: {
  state: GameState;
  year: number;
  show: AwardShowDefinition;
  season: AwardsSeasonState;
  isFilmAwardsSeasonWindow: boolean;
}): {
  nominationsForState: Record<string, Array<{ projectId: string; score: number }>>;
  nominationsWithProjects: Record<string, Array<{ project: Project; score: number }>>;
} {
  const { state, year, show, season, isFilmAwardsSeasonWindow } = params;

  const categories = show.categories || [];
  const eligible = getEligibleProjects(state, year, show.medium);
  const seasonMomentum = season.seasonMomentum || {};

  const seedRoot = `awards|${state.universeSeed ?? 0}|Y${year}|${show.id}`;

  const nominationsForState: Record<string, Array<{ projectId: string; score: number }>> = {};
  const nominationsWithProjects: Record<string, Array<{ project: Project; score: number }>> = {};

  const actorCandidatesByCategory: Record<string, Array<{ project: Project; score: number; talentId: string }>> = {};
  const actorCategories = new Set<string>();

  categories.forEach((category) => {
    const categoryName = category.name;
    const categoryLower = categoryName.toLowerCase();

    const ranked = eligible
      .map((project) => {
        if (category.eligibility?.projectTypes && !category.eligibility.projectTypes.includes(project.type)) {
          return { project, score: 0, talentId: undefined as string | undefined };
        }

        if (category.eligibility?.genres && !category.eligibility.genres.includes(project.script.genre)) {
          return { project, score: 0, talentId: undefined as string | undefined };
        }

        if (category.eligibility?.requireAnimation && project.script.genre !== 'animation') {
          return { project, score: 0, talentId: undefined as string | undefined };
        }

        const base = calculateAwardsProbability({
          state,
          project,
          medium: show.medium,
          year,
          isFilmAwardsSeasonWindow,
        });

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
          const genre = project.script.genre;
          const isDramaBucket = ['drama', 'biography', 'historical'].includes(genre || '');

          if (categoryLower.includes('animated') && genre !== 'animation') return { project, score: 0, talentId: undefined as string | undefined };

          if (categoryLower.includes('comedy') && (categoryLower.includes('best picture') || isTalentCategory(category))) {
            if (genre !== 'comedy') return { project, score: 0, talentId: undefined as string | undefined };
            categoryBias += 3;
          }

          if (categoryLower.includes('drama') && (categoryLower.includes('best picture') || isTalentCategory(category))) {
            if (!isDramaBucket) return { project, score: 0, talentId: undefined as string | undefined };
            categoryBias += 5;
          }
        } else {
          // TV awards
          if (categoryLower.includes('limited series') && project.type !== 'limited-series') return { project, score: 0, talentId: undefined as string | undefined };

          if (categoryLower.includes('drama series')) {
            if (project.script.genre !== 'drama') return { project, score: 0, talentId: undefined as string | undefined };
            categoryBias += 4;
          }

          if (categoryLower.includes('comedy series')) {
            if (project.script.genre !== 'comedy') return { project, score: 0, talentId: undefined as string | undefined };
            categoryBias += 4;
          }

          if (categoryLower.includes('writing') || categoryLower.includes('directing')) {
            const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;
            categoryBias += Math.max(-3, Math.min(6, (criticalPotential - 5) * 1.5));
          }
        }

        // Critically acclaimed actor/director boost for individual categories
        let talentBonus = 0;
        let talentId: string | undefined;

        if (isTalentCategory(category)) {
          const relevantTalent = findRelevantTalent({ state, project, category: categoryName, categoryDef: category });

          if (relevantTalent) {
            const baseRep = relevantTalent.reputation || 50;
            const awardsCount = relevantTalent.awards?.length || 0;
            const fame = relevantTalent.fame ?? 0;

            // Reputation above/below 50 pulls score modestly.
            const repBonus = (baseRep - 50) * 0.4; // max about ±20
            // Prior awards and fame give additional small boosts.
            const awardsBonus = Math.min(10, awardsCount * 2);
            const fameBonus = Math.min(10, fame * 0.1);

            talentBonus = repBonus + awardsBonus + fameBonus;

            if (isActorCategory(category)) {
              const desiredGender = category.talent?.gender;
              const castIds = new Set((project.cast || []).map((c: any) => c?.talentId).filter(Boolean));
              const characterIds = new Set((project.script?.characters || []).map((c: any) => c?.assignedTalentId).filter(Boolean));

              const appearsInProject = castIds.has(relevantTalent.id) || characterIds.has(relevantTalent.id);
              const genderOk = desiredGender ? relevantTalent.gender === desiredGender : true;

              if (appearsInProject && genderOk) {
                talentId = relevantTalent.id;
              } else {
                talentId = undefined;
              }
            } else {
              talentId = relevantTalent.id;
            }
          }
        }

        const noise = stableFloat01(`${seedRoot}|${categoryName}|${project.id}|noise`) * 8 - 4;

        const score = Math.min(100, base + momentum + categoryBias + talentBonus + noise);
        return { project, score, talentId };
      })
      .filter(({ score }) => score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (isActorCategory(category)) {
      actorCategories.add(categoryName);
      actorCandidatesByCategory[categoryName] = ranked
        .filter((r) => !!r.talentId)
        .map((r) => ({ project: r.project, score: r.score, talentId: r.talentId! }));
      return;
    }

    const top = ranked.slice(0, 5).map((r) => ({ project: r.project, score: r.score }));
    nominationsWithProjects[categoryName] = top;
    nominationsForState[categoryName] = top.map((r) => ({ projectId: r.project.id, score: r.score }));
  });

  if (actorCategories.size > 0) {
    const usedTalentIdsByKey = new Map<string, Set<string>>();

    for (const categoryDef of categories) {
      if (!isActorCategory(categoryDef)) continue;

      const categoryName = categoryDef.name;
      const candidates = actorCandidatesByCategory[categoryName] || [];

      const key = actorDedupKey(categoryDef);
      const used = usedTalentIdsByKey.get(key) || new Set<string>();
      usedTalentIdsByKey.set(key, used);

      const picked: Array<{ project: Project; score: number }> = [];

      for (const cand of candidates) {
        if (used.has(cand.talentId)) continue;
        picked.push({ project: cand.project, score: cand.score });
        used.add(cand.talentId);
        if (picked.length >= 5) break;
      }

      nominationsWithProjects[categoryName] = picked;
      nominationsForState[categoryName] = picked.map((r) => ({ projectId: r.project.id, score: r.score }));
    }
  }

  return { nominationsForState, nominationsWithProjects };
}

export const AwardsSeasonSystem: TickSystem = {
  id: 'awardsSeason',
  label: 'Awards season',
  onTick: (state, ctx) => {
    // Online league has a separate synchronized awards flow.
    if (state.mode === 'online') return state;

    const year = ctx.year;
    const week = ctx.week;

    const shows = getAwardShowsForYear(year);

    const filmAwardsEndWeek = getFilmAwardsEndWeek(year);
    const isFilmAwardsSeasonWindow = week >= 1 && week <= filmAwardsEndWeek;

    const marketConditions = {
      ...state.marketConditions,
      awardsSeasonActive: isFilmAwardsSeasonWindow,
    };

    let changed = marketConditions.awardsSeasonActive !== state.marketConditions.awardsSeasonActive;

    let season = getSeasonState(state, year);

    // Reset season on new year rollover (week 1).
    if (week === 1 && (!state.awardsSeason || state.awardsSeason.year !== year)) {
      season = {
        year,
        processedCeremonies: [],
        seasonMomentum: {},
        seasonNominations: {},
        ceremonyHistory: {},
      };
      changed = true;
    }

    // Nominations
    for (const show of shows) {
      if (week !== show.nominationWeek) continue;

      const key = `${show.id}-${year}`;
      if (season.seasonNominations[key]) continue;

      const computed = computeNominations({ state, year, show, season, isFilmAwardsSeasonWindow });
      const hasAnyNominees = Object.values(computed.nominationsForState).some((rows) => (rows || []).length > 0);
      if (!hasAnyNominees) continue;

      season = {
        ...season,
        seasonNominations: {
          ...season.seasonNominations,
          [key]: { year, categories: computed.nominationsForState },
        },
      };

      changed = true;

      const playerProjectIds = new Set((state.projects || []).map((p) => p.id));
      const nominatedPlayer = Object.values(computed.nominationsForState).some((rows) => rows.some((r) => playerProjectIds.has(r.projectId)));

      if (nominatedPlayer) {
        ctx.recap.push({
          type: 'award',
          title: `${show.name} nominations announced`,
          body: 'Your releases are in the running this season.',
          severity: 'good',
        });
      }
    }

    let studio = state.studio;
    let talent = state.talent;
    let eventQueue = state.eventQueue || [];

    // Ceremonies
    for (const show of shows) {
      if (week !== show.ceremonyWeek) continue;

      const key = `${show.id}-${year}`;
      if (season.processedCeremonies.includes(key)) continue;

      let seasonNominations = season.seasonNominations;
      if (!seasonNominations[key]) {
        const computed = computeNominations({ state, year, show, season, isFilmAwardsSeasonWindow });
        seasonNominations = {
          ...seasonNominations,
          [key]: { year, categories: computed.nominationsForState },
        };
        season = {
          ...season,
          seasonNominations,
        };
        changed = true;
      }

      const nominationsRecord = seasonNominations[key];
      if (!nominationsRecord) continue;

      const hasAnyNominees = Object.values(nominationsRecord.categories || {}).some((rows) => (rows || []).length > 0);
      if (!hasAnyNominees) continue;

      const eligible = getEligibleProjects(state, year, show.medium);
      const byId = new Map(eligible.map((p) => [p.id, p] as const));
      const playerProjectIds = new Set((state.projects || []).map((p) => p.id));
      const playerNominated = Object.values(nominationsRecord.categories || {}).some((rows) =>
        (rows || []).some((n) => playerProjectIds.has(n.projectId))
      );

      const winnersThisShow: string[] = [];
      const winnerProjectIdByCategory: Record<string, string> = {};
      let extraTalentStudioReputation = 0;
      const wonStudioAwards: StudioAward[] = [];

      const seedRoot = `awards|${state.universeSeed ?? 0}|Y${year}|${show.id}|ceremony`;

      const updatedTalentById = new Map<string, TalentPerson>();

      for (const categoryDef of show.categories || []) {
        const category = categoryDef.name;

        const nominees = (nominationsRecord.categories[category] || [])
          .map((n) => {
            const project = byId.get(n.projectId);
            return project ? { project, score: n.score } : null;
          })
          .filter(Boolean) as Array<{ project: Project; score: number }>;

        if (nominees.length === 0) continue;

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

        for (const n of nominees) {
          if (n.project.id !== winner.project.id) continue;

          const catKey = hashStringToUint32(category).toString(36);

          if (isTalentCategory(categoryDef)) {
            const relevantTalent = findRelevantTalent({ state, project: n.project, category, categoryDef });
            if (relevantTalent) {
              const talentAward: TalentAward = {
                id: `talent-award:${show.id}:${year}:${catKey}:${relevantTalent.id}:${n.project.id}`,
                talentId: relevantTalent.id,
                projectId: n.project.id,
                category,
                ceremony: show.name,
                year,
                prestige: show.prestige,
                reputationBoost: show.prestige * 3,
                marketValueBoost: relevantTalent.marketValue * (show.prestige / 50),
              };

              const existing = updatedTalentById.get(relevantTalent.id) || relevantTalent;
              const currentAwards = existing.awards || [];

              updatedTalentById.set(relevantTalent.id, {
                ...existing,
                reputation: Math.min(100, existing.reputation + talentAward.reputationBoost),
                marketValue: existing.marketValue + (talentAward.marketValueBoost || 0),
                awards: [...currentAwards, talentAward],
              });

              if (playerProjectIds.has(n.project.id)) {
                extraTalentStudioReputation += Math.max(1, Math.round(show.prestige * 0.5));
              }
            }
          } else if (playerProjectIds.has(n.project.id)) {
            wonStudioAwards.push({
              id: `award:${show.id}:${year}:${catKey}:${n.project.id}`,
              projectId: n.project.id,
              category,
              ceremony: show.name,
              year,
              prestige: show.prestige,
              reputationBoost: show.prestige * 2,
              revenueBoost: n.project.budget.total * (show.prestige / 100),
            });
          }

          winnerProjectIdByCategory[category] = n.project.id;
          winnersThisShow.push(n.project.id);
        }
      }

      if (updatedTalentById.size > 0) {
        talent = (state.talent || []).map((t) => updatedTalentById.get(t.id) || t);
        changed = true;
      }

      if (wonStudioAwards.length > 0 || extraTalentStudioReputation > 0) {
        const totalReputationFromAwards = wonStudioAwards.reduce((sum, award) => sum + award.reputationBoost, 0);
        const totalReputation = totalReputationFromAwards + extraTalentStudioReputation;
        const totalRevenue = wonStudioAwards.reduce((sum, award) => sum + (award.revenueBoost || 0), 0);

        studio = {
          ...studio,
          reputation: Math.min(100, (studio.reputation || 0) + totalReputation),
          budget: (studio.budget || 0) + totalRevenue,
          awards: [...(studio.awards || []), ...wonStudioAwards],
        };
        changed = true;
      }

      // Update season processing state
      season = {
        ...season,
        processedCeremonies: [...season.processedCeremonies, key],
      };
      changed = true;

      if (winnersThisShow.length > 0) {
        const nextMomentum = { ...(season.seasonMomentum || {}) };
        for (const pid of winnersThisShow) {
          nextMomentum[pid] = (nextMomentum[pid] || 0) + show.momentumBonus;
        }
        season = { ...season, seasonMomentum: nextMomentum };
      }

      // Persist a lightweight ceremony record for "watch now" UI.
      {
        const ceremonyHistory = { ...(season.ceremonyHistory || {}) };
        const record: AwardsCeremonyRecord = {
          showId: show.id,
          year,
          ceremonyName: show.name,
          prestige: show.prestige,
          nominations: {},
          winners: {},
        };

        for (const categoryDef of show.categories || []) {
          const category = categoryDef.name;
          const storedNominees = nominationsRecord.categories[category] || [];
          if (storedNominees.length === 0) continue;

          record.nominations[category] = storedNominees.map((n) => {
            const project = byId.get(n.projectId);
            const talentId =
              project && isTalentCategory(categoryDef)
                ? findRelevantTalent({ state, project, category, categoryDef })?.id
                : undefined;

            return {
              projectId: n.projectId,
              score: n.score,
              talentId,
            };
          });

          const winnerProjectId = winnerProjectIdByCategory[category];
          if (!winnerProjectId) continue;

          const winnerProject = byId.get(winnerProjectId);
          if (!winnerProject) continue;

          const winnerScore = storedNominees.find((n) => n.projectId === winnerProjectId)?.score ?? winnerProject.metrics?.criticsScore ?? 0;
          const winnerTalentId = isTalentCategory(categoryDef)
            ? findRelevantTalent({ state, project: winnerProject, category, categoryDef })?.id
            : undefined;

          record.winners[category] = {
            projectId: winnerProjectId,
            score: winnerScore,
            talentId: winnerTalentId,
          };
        }

        ceremonyHistory[show.id] = record;
        season = {
          ...season,
          ceremonyHistory,
        };
      }

      // Queue a lightweight event (UI reconstructs the ceremony from ceremonyHistory).
      // Only surface this to the player if they're nominated (otherwise this can spam the event queue).
      if (playerNominated) {
        const eventId = `awards:ceremony:${show.id}:${year}`;
        if (!eventQueue.some((e) => e?.id === eventId)) {
          const awardEvent: GameEvent = {
            id: eventId,
            title: `${show.name} Awards`,
            description: `The ${show.name} Awards are live this week.\n\nYou can watch the ceremony now, or skip and review the results later in the Awards tab.`,
            type: 'opportunity',
            triggerDate: triggerDateFromWeekYear(year, week),
            data: {
              kind: 'awards:ceremony',
              showId: show.id,
              year,
            },
            choices: [
              { id: 'watch', text: 'Watch the show', consequences: [] },
              { id: 'skip', text: 'Skip (view results later)', consequences: [] },
            ],
          };
          eventQueue = [...eventQueue, awardEvent];
          changed = true;
        }
      }

      const playerAwardsWon = wonStudioAwards.length;
      if (playerNominated) {
        ctx.recap.push({
          type: 'award',
          title: `${show.name} ceremony`,
          body:
            playerAwardsWon > 0
              ? `Your studio won ${playerAwardsWon} award${playerAwardsWon === 1 ? '' : 's'}.`
              : 'The winners have been announced.',
          severity: playerAwardsWon > 0 ? 'good' : 'info',
        });
      }
    }

    if (!changed) return state;

    return {
      ...state,
      marketConditions,
      awardsSeason: season,
      studio,
      talent,
      eventQueue,
    };
  },
};
