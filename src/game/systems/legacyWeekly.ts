import type { TickContext, TickSystem } from '@/game/core/types';
import type { GameState, Genre, ProductionPhase, Project, Script, TalentPerson } from '@/types/game';
import { AIStudioManager } from '@/components/game/AIStudioManager';
import { BoxOfficeSystem } from '@/components/game/BoxOfficeSystem';
import { TVEpisodeSystem } from '@/components/game/TVEpisodeSystem';
import { TVRatingsSystem } from '@/components/game/TVRatingsSystem';
import { FinancialEngine } from '@/components/game/FinancialEngine';
import { applyEnhancedFinancialAccuracy } from '@/utils/enhancedFinancialAccuracy';
import { DeepReputationSystem } from '@/components/game/DeepReputationSystem';
import { MediaEngine } from '@/components/game/MediaEngine';
import { MediaFinancialIntegration } from '@/components/game/MediaFinancialIntegration';
import { MediaReputationIntegration } from '@/components/game/MediaReputationIntegration';
import { MediaResponseSystem } from '@/components/game/MediaResponseSystem';
import { CrisisManagement } from '@/components/game/CrisisManagement';
import { MediaRelationships } from '@/components/game/MediaRelationships';
import { SystemIntegration } from '@/components/game/SystemIntegration';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import { importRolesForScript } from '@/utils/roleImport';
import { attachBasicCastForAI } from '@/utils/aiCast';
import { StudioGenerator } from '@/data/StudioGenerator';

function getPhaseWeeks(phase: string): number {
  switch (phase) {
    case 'development':
      return 8;
    case 'pre-production':
      return 4;
    case 'production':
      return 12;
    case 'post-production':
      return 6;
    case 'marketing':
      return 4;
    case 'release':
      return 1;
    case 'distribution':
      return 0;
    default:
      return 4;
  }
}

function getNextPhase(currentPhase: string): ProductionPhase {
  switch (currentPhase) {
    case 'development':
      return 'pre-production';
    case 'pre-production':
      return 'production';
    case 'production':
      return 'post-production';
    case 'post-production':
      return 'marketing';
    case 'marketing':
      return 'release';
    case 'release':
      return 'distribution';
    default:
      return currentPhase as ProductionPhase;
  }
}

function processDevelopmentProgress(project: Project, baseState: GameState): Project {
  const progress = project.developmentProgress;

  let weeklyIncrease = 5;

  if (project.cast.length > 0) weeklyIncrease += 3;
  if (project.crew.some(c => baseState.talent.find(t => t.id === c.talentId)?.type === 'director')) {
    weeklyIncrease += 5;
  }

  const newProgress = {
    ...progress,
    scriptCompletion: Math.min(100, progress.scriptCompletion + weeklyIncrease),
    budgetApproval: project.cast.length > 0 ? Math.min(100, progress.budgetApproval + weeklyIncrease) : progress.budgetApproval,
    talentAttached: project.cast.length > 0 ? Math.min(100, progress.talentAttached + 10) : progress.talentAttached,
    locationSecured: Math.min(100, progress.locationSecured + weeklyIncrease)
  };

  return {
    ...project,
    developmentProgress: newProgress
  };
}

type WeeklyProjectEffectsResult = {
  projects: Project[];
  studioRevenueDelta: number;
  releasedProjects: Project[];
  phaseTransitions: { title: string; from: string; to: string }[];
  readyForMarketing: string[];
  marketingComplete: string[];
};

function processWeeklyProjectEffects(projects: Project[], baseState: GameState, ctx: TickContext): WeeklyProjectEffectsResult {
  const timeState = {
    currentWeek: ctx.week,
    currentYear: ctx.year,
    currentQuarter: ctx.quarter,
  };

  let studioRevenueDelta = 0;
  const releasedProjects: Project[] = [];
  const phaseTransitions: { title: string; from: string; to: string }[] = [];
  const readyForMarketing: string[] = [];
  const marketingComplete: string[] = [];

  const results = projects.map((project) => {
    let updatedProject = { ...project };

    // Process development phase
    if (project.currentPhase === 'development') {
      updatedProject = processDevelopmentProgress(project, baseState);
    }

    // Handle scheduled releases when their date arrives
    let justReleased = false;
    const effectiveReleaseWeek = project.scheduledReleaseWeek || project.releaseWeek;
    const effectiveReleaseYear = project.scheduledReleaseYear || project.releaseYear;

    if (project.status === 'scheduled-for-release' && effectiveReleaseWeek && effectiveReleaseYear) {
      const currentAbsoluteWeek = (timeState.currentYear * 52) + timeState.currentWeek;
      const releaseAbsoluteWeek = (effectiveReleaseYear * 52) + effectiveReleaseWeek;

      if (currentAbsoluteWeek === releaseAbsoluteWeek) {
        const resolvedReleaseWeek = effectiveReleaseWeek;
        const resolvedReleaseYear = effectiveReleaseYear;

        updatedProject = {
          ...updatedProject,
          releaseWeek: resolvedReleaseWeek,
          releaseYear: resolvedReleaseYear,
          scheduledReleaseWeek: resolvedReleaseWeek,
          scheduledReleaseYear: resolvedReleaseYear,
        };

        let openingWeekRevenue = 0;

        if (project.type === 'series' || project.type === 'limited-series') {
          updatedProject = {
            ...updatedProject,
            status: 'released' as const
          };

          updatedProject = TVEpisodeSystem.ensureSeason(updatedProject);
          updatedProject = TVEpisodeSystem.autoReleaseEpisodesIfDue(updatedProject, timeState.currentWeek, timeState.currentYear);
          updatedProject = TVEpisodeSystem.processWeeklyEpisodeDecay(updatedProject, timeState.currentWeek, timeState.currentYear);
        } else {
          updatedProject = BoxOfficeSystem.initializeRelease(updatedProject, resolvedReleaseWeek, resolvedReleaseYear);

          openingWeekRevenue = updatedProject.metrics?.boxOfficeTotal || 0;
          if (openingWeekRevenue > 0) {
            studioRevenueDelta += openingWeekRevenue * 0.55;
          }
        }

        MediaEngine.queueMediaEvent({
          type: 'release',
          triggerType: 'automatic',
          priority: 'high',
          entities: {
            studios: [baseState.studio.id],
            projects: [updatedProject.id],
            talent: (updatedProject.cast || []).map(c => c.talentId)
          },
          eventData: { project: updatedProject },
          week: timeState.currentWeek,
          year: timeState.currentYear
        });

        if (openingWeekRevenue > 0 && updatedProject.type !== 'series' && updatedProject.type !== 'limited-series') {
          MediaEngine.triggerBoxOfficeReport(updatedProject, openingWeekRevenue, baseState);
        }

        justReleased = true;
        releasedProjects.push(updatedProject);
      }
    }

    // Process box office / ratings for released projects (skip release week)
    if (project.status === 'released' && !justReleased) {
      if (project.type === 'series' || project.type === 'limited-series') {
        updatedProject = TVEpisodeSystem.ensureSeason(updatedProject);
        updatedProject = TVEpisodeSystem.autoReleaseEpisodesIfDue(updatedProject, timeState.currentWeek, timeState.currentYear);
        updatedProject = TVEpisodeSystem.processWeeklyEpisodeDecay(updatedProject, timeState.currentWeek, timeState.currentYear);

        updatedProject = TVRatingsSystem.processWeeklyRatings(
          updatedProject,
          timeState.currentWeek,
          timeState.currentYear
        );
      } else {
        const previousTotal = updatedProject.metrics?.boxOfficeTotal || 0;

        updatedProject = BoxOfficeSystem.processWeeklyRevenue(
          updatedProject,
          timeState.currentWeek,
          timeState.currentYear
        );

        const newTotal = updatedProject.metrics?.boxOfficeTotal || 0;
        const weeklyBoxOfficeRevenue = newTotal - previousTotal;

        if (weeklyBoxOfficeRevenue > 0) {
          studioRevenueDelta += weeklyBoxOfficeRevenue * 0.55;
        }
      }
    }

    // Process marketing campaigns
    if (updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining > 0) {
      const updatedActivities = updatedProject.marketingCampaign.activities.map(activity => ({
        ...activity,
        weeksRemaining: Math.max(0, activity.weeksRemaining - 1),
        status: activity.weeksRemaining <= 1 ? 'completed' as const : activity.status
      }));

      const newWeeksRemaining = Math.max(0, updatedProject.marketingCampaign.weeksRemaining - 1);

      const campaignBudget = updatedProject.marketingCampaign.budgetAllocated || 0;
      const weeklySpend = campaignBudget / updatedProject.marketingCampaign.duration;
      const weeklyBuzzGrowth = Math.max(2, Math.floor(weeklySpend / 500000));
      const newBuzz = Math.min(100, (updatedProject.marketingCampaign.buzz || 0) + weeklyBuzzGrowth);
      const newBudgetSpent = (updatedProject.marketingCampaign.budgetSpent || 0) + weeklySpend;

      updatedProject = {
        ...updatedProject,
        marketingCampaign: {
          ...updatedProject.marketingCampaign,
          activities: updatedActivities,
          weeksRemaining: newWeeksRemaining,
          buzz: newBuzz,
          budgetSpent: Math.min(campaignBudget, newBudgetSpent),
          effectiveness: Math.min(100, (updatedProject.marketingCampaign.effectiveness || 50) + 2)
        },
        marketingData: {
          ...updatedProject.marketingData,
          currentBuzz: newBuzz,
          totalSpent: updatedProject.marketingData?.totalSpent || campaignBudget,
          campaigns: updatedProject.marketingData?.campaigns || []
        }
      };

      if (newWeeksRemaining === 0) {
        const hasScheduledRelease = !!updatedProject.scheduledReleaseWeek && !!updatedProject.scheduledReleaseYear;

        updatedProject = {
          ...updatedProject,
          currentPhase: 'release',
          status: (hasScheduledRelease ? 'scheduled-for-release' : 'ready-for-release') as any,
          readyForRelease: !hasScheduledRelease,
          ...(hasScheduledRelease ? { phaseDuration: -1 } : {})
        };

        marketingComplete.push(updatedProject.title);
      }
    }

    // Post-theatrical revenue
    if (updatedProject.postTheatricalReleases && updatedProject.postTheatricalReleases.length > 0) {
      const updatedReleases = updatedProject.postTheatricalReleases.map(release => {
        if (release.status === 'planned') {
          return {
            ...release,
            status: 'active' as const,
            weeksActive: 1,
            revenue: release.weeklyRevenue
          };
        } else if (release.status === 'active') {
          const newWeeksActive = release.weeksActive + 1;
          const newRevenue = release.revenue + release.weeklyRevenue;

          return {
            ...release,
            weeksActive: newWeeksActive,
            revenue: newRevenue
          };
        }
        return release;
      });

      const weeklyPostTheatricalRevenue = updatedReleases
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + r.weeklyRevenue, 0);

      if (weeklyPostTheatricalRevenue > 0) {
        studioRevenueDelta += weeklyPostTheatricalRevenue;
      }

      updatedProject = {
        ...updatedProject,
        postTheatricalReleases: updatedReleases
      };
    }

    // Phase timers (skip manual-control phases via phaseDuration === -1)
    if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
      const newPhaseDuration = updatedProject.phaseDuration - 1;

      if (newPhaseDuration === 0) {
        const nextPhase = getNextPhase(updatedProject.currentPhase);

        // Stop auto-progression at post-production
        if (updatedProject.currentPhase === 'post-production') {
          updatedProject = {
            ...updatedProject,
            phaseDuration: 0,
            status: 'ready-for-marketing' as any,
            readyForMarketing: true
          };

          readyForMarketing.push(updatedProject.title);
        }
        // Stop auto-progression at marketing (handled by campaign completion)
        else if (updatedProject.currentPhase === 'marketing' && updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining === 0) {
          const hasScheduledRelease = !!updatedProject.scheduledReleaseWeek && !!updatedProject.scheduledReleaseYear;

          updatedProject = {
            ...updatedProject,
            currentPhase: 'release',
            phaseDuration: hasScheduledRelease ? -1 : 0,
            status: (hasScheduledRelease ? 'scheduled-for-release' : 'ready-for-release') as any,
            readyForRelease: !hasScheduledRelease
          };

          marketingComplete.push(updatedProject.title);
        }
        // Normal progression with gating for early phases
        else if (['development', 'pre-production', 'production'].includes(updatedProject.currentPhase)) {
          const fromPhase = updatedProject.currentPhase;

          // Gate: ensure roles imported before leaving development
          if (updatedProject.currentPhase === 'development' && nextPhase === 'pre-production') {
            const roles = updatedProject.script?.characters && updatedProject.script.characters.length > 0
              ? updatedProject.script.characters
              : importRolesForScript(updatedProject.script!, baseState);

            if (!roles || roles.length === 0) {
              updatedProject = { ...updatedProject, phaseDuration: 2 };
            } else {
              updatedProject = {
                ...updatedProject,
                script: { ...updatedProject.script!, characters: roles },
                currentPhase: nextPhase,
                phaseDuration: getPhaseWeeks(nextPhase),
                status: nextPhase as any
              };
              phaseTransitions.push({ title: updatedProject.title, from: fromPhase, to: nextPhase });
            }
          }
          // Gate: require Director + Lead actor before entering production
          else if (updatedProject.currentPhase === 'pre-production' && nextPhase === 'production') {
            const chars = updatedProject.script?.characters || [];
            const hasDirector = chars.some(c => c.requiredType === 'director' && c.assignedTalentId);
            const hasLead = chars.some(c => c.importance === 'lead' && c.requiredType !== 'director' && c.assignedTalentId);

            if (!hasDirector || !hasLead) {
              updatedProject = { ...updatedProject, phaseDuration: 2 };
            } else {
              updatedProject = {
                ...updatedProject,
                currentPhase: nextPhase,
                phaseDuration: getPhaseWeeks(nextPhase),
                status: nextPhase as any
              };
              phaseTransitions.push({ title: updatedProject.title, from: fromPhase, to: nextPhase });
            }
          }
          // Other early phases progress normally
          else {
            updatedProject = {
              ...updatedProject,
              currentPhase: nextPhase,
              phaseDuration: getPhaseWeeks(nextPhase),
              status: nextPhase as any
            };
            phaseTransitions.push({ title: updatedProject.title, from: fromPhase, to: nextPhase });
          }
        }
      } else {
        const shouldCountdown = ['development', 'pre-production', 'production', 'post-production'].includes(updatedProject.currentPhase) ||
          (updatedProject.currentPhase === 'marketing' && updatedProject.marketingCampaign);

        if (shouldCountdown) {
          updatedProject = {
            ...updatedProject,
            phaseDuration: newPhaseDuration
          };
        }
      }
    }

    return updatedProject;
  });

  return {
    projects: results,
    studioRevenueDelta,
    releasedProjects,
    phaseTransitions,
    readyForMarketing,
    marketingComplete,
  };
}

function processWeeklyCosts(currentState: GameState, projects: Project[], ctx: TickContext) {
  const studio = { ...currentState.studio };

  const baseOperationalCost = 25000;
  const projectCount = projects.filter(p => ['development', 'pre-production', 'production', 'post-production'].includes(p.status)).length;
  const operationalCost = baseOperationalCost + (projectCount * 10000);

  let productionCosts = 0;
  projects.forEach(project => {
    if (project.currentPhase === 'production') {
      const weeklyProductionCost = project.budget.total * 0.7 / getPhaseWeeks('production');
      productionCosts += weeklyProductionCost;
    }
  });

  const totalWeeklyCosts = operationalCost + productionCosts;

  studio.budget -= totalWeeklyCosts;

  if (studio.budget < 0) {
    const loanAmount = Math.abs(studio.budget);
    studio.debt = (studio.debt || 0) + loanAmount;
    studio.budget = 0;
  }

  if (studio.budget > 1000000 && studio.debt && studio.debt > 0) {
    const debtPayment = Math.min(studio.debt, studio.budget * 0.05);
    studio.debt -= debtPayment;
    studio.budget -= debtPayment;
  }

  if (studio.debt && studio.debt > 0) {
    const weeklyInterest = studio.debt * 0.0002;
    studio.debt += weeklyInterest;
  }

  studio.weeksSinceLastProject = (studio.weeksSinceLastProject || 0) + 1;

  if (studio.weeksSinceLastProject > 12) {
    const reputationLoss = Math.min(1, (studio.weeksSinceLastProject - 12) * 0.25);
    studio.reputation = Math.max(0, studio.reputation - reputationLoss);
  }

  projects.forEach(project => {
    if (project.status === 'released' && project.metrics?.boxOfficeTotal && project.metrics?.inTheaters === false) {
      const totalRevenue = project.metrics.boxOfficeTotal;
      const budget = project.budget.total;
      const profitMargin = (totalRevenue * 0.55) / budget;

      if (profitMargin > 2.0) {
        studio.reputation = Math.min(100, studio.reputation + 3);
      } else if (profitMargin > 1.2) {
        studio.reputation = Math.min(100, studio.reputation + 1);
      } else if (profitMargin < 0.3) {
        studio.reputation = Math.max(0, studio.reputation - 2);
      }
    }
  });

  return { studio };
}

function buildDeterministicId(ctx: TickContext, prefix: string): string {
  const a = ctx.rng.nextInt(0, 0xffffff);
  const b = ctx.rng.nextInt(0, 0xffffff);
  return `${prefix}-${a.toString(36)}${b.toString(36)}`;
}

export const legacyWeeklyTickSystem: TickSystem = {
  id: 'legacyWeekly',
  label: 'Weekly simulation',
  onTick: (state, ctx) => {
    const timeState = {
      currentWeek: ctx.week,
      currentYear: ctx.year,
      currentQuarter: ctx.quarter,
    };

    // AI studio timelines
    try {
      AIStudioManager.processWeeklyAIFilms(timeState.currentWeek, timeState.currentYear);
      if (state.competitorStudios.length > 0) {
        const shouldStartAIFilm = (timeState.currentWeek % 4 === 1) || ctx.rng.chance(0.35);
        if (shouldStartAIFilm) {
          const randomStudio = ctx.rng.pick(state.competitorStudios);
          if (randomStudio) {
            AIStudioManager.createAIFilm(
              randomStudio,
              timeState.currentWeek,
              timeState.currentYear,
              state.talent.filter(t => t.contractStatus === 'available')
            );
          }
        }
      }
    } catch (e) {
      console.warn('AI Studio processing error', e);
    }

    let updatedProjects = state.projects;

    const aiReleased = state.allReleases
      .filter((r): r is Project => 'script' in r && (r as any).status === 'released' && !!r.releaseWeek && !!r.releaseYear)
      .map(r => {
        const weeksSinceRelease =
          ((timeState.currentYear * 52) + timeState.currentWeek) -
          ((r.releaseYear! * 52) + r.releaseWeek!);

        return {
          id: r.id,
          title: r.title,
          weeksSinceRelease: Math.max(0, weeksSinceRelease),
          budget: (r as any).budget?.total || (r as any).budget || 10000000,
          genre: (r as any).script?.genre || (r as any).genre || 'drama'
        };
      });

    try {
      FinancialEngine.simulateBoxOfficeWeek(aiReleased, timeState.currentWeek, timeState.currentYear);
    } catch (e) {
      console.warn('Box office simulation error', e);
    }

    try {
      FinancialEngine.processWeeklyFinancialEvents(
        timeState.currentWeek,
        timeState.currentYear,
        [state.studio, ...state.competitorStudios],
        updatedProjects
      );
    } catch (e) {
      console.warn('Financial events error', e);
    }

    const weeklyProjectEffects = processWeeklyProjectEffects(updatedProjects, state, ctx);
    updatedProjects = weeklyProjectEffects.projects;

    const financialAccuracy = applyEnhancedFinancialAccuracy(updatedProjects);
    updatedProjects = financialAccuracy.projects;

    if (weeklyProjectEffects.releasedProjects.length > 0) {
      ctx.recap.push({
        type: 'release',
        title: `${weeklyProjectEffects.releasedProjects.length} release${weeklyProjectEffects.releasedProjects.length === 1 ? '' : 's'} this week`,
        body: weeklyProjectEffects.releasedProjects.map(p => `• ${p.title}`).join('\n'),
        severity: 'good',
      });
    }

    if (weeklyProjectEffects.studioRevenueDelta > 0) {
      ctx.recap.push({
        type: 'financial',
        title: 'Box office revenue',
        body: 'Studio share earned: \u0024' + Math.round(weeklyProjectEffects.studioRevenueDelta).toLocaleString(),
        severity: 'good',
      });
    }

    if (weeklyProjectEffects.readyForMarketing.length > 0) {
      ctx.recap.push({
        type: 'system',
        title: 'Projects ready for marketing',
        body: weeklyProjectEffects.readyForMarketing.slice(0, 6).map(t => `• ${t}`).join('\n') +
          (weeklyProjectEffects.readyForMarketing.length > 6 ? `\n• +${weeklyProjectEffects.readyForMarketing.length - 6} more` : ''),
        severity: 'info',
      });
    }

    if (weeklyProjectEffects.marketingComplete.length > 0) {
      ctx.recap.push({
        type: 'system',
        title: 'Marketing campaigns completed',
        body: weeklyProjectEffects.marketingComplete.slice(0, 6).map(t => `• ${t}`).join('\n') +
          (weeklyProjectEffects.marketingComplete.length > 6 ? `\n• +${weeklyProjectEffects.marketingComplete.length - 6} more` : ''),
        severity: 'good',
      });
    }

    if (weeklyProjectEffects.phaseTransitions.length > 0) {
      ctx.recap.push({
        type: 'system',
        title: 'Production progressed',
        body: weeklyProjectEffects.phaseTransitions.slice(0, 6).map(t => `• ${t.title}: ${t.from} → ${t.to}`).join('\n') +
          (weeklyProjectEffects.phaseTransitions.length > 6 ? `\n• +${weeklyProjectEffects.phaseTransitions.length - 6} more` : ''),
        severity: 'info',
      });
    }

    const newAIReleases: Project[] = [];

    const hasAiSlateForYear = state.allReleases.some(
      (r): r is Project => 'script' in r && r.releaseYear === timeState.currentYear
    );

    if (!hasAiSlateForYear && state.competitorStudios.length > 0) {
      const sg = new StudioGenerator();

      for (let w = 1; w <= 52; w++) {
        let releasesThisWeek = 0;

        for (const st of state.competitorStudios) {
          const profile = sg.getStudioProfile(st.name);
          const rel = profile ? sg.generateStudioRelease(profile, w, timeState.currentYear) : null;
          if (rel) {
            newAIReleases.push(attachBasicCastForAI(rel, state.talent));
            releasesThisWeek += 1;
          }
        }

        if (releasesThisWeek === 0 && state.competitorStudios[0]) {
          const fallback = sg.getStudioProfile(state.competitorStudios[0].name);
          if (fallback) {
            const rel = sg.generateStudioRelease(fallback, w, timeState.currentYear);
            if (rel) {
              newAIReleases.push(attachBasicCastForAI(rel, state.talent));
            } else {
              const genre = fallback.specialties[0] as Genre;
              const script = {
                id: buildDeterministicId(ctx, `script-${timeState.currentYear}-${w}`),
                title: sg.generateFilmTitle(genre, fallback.name),
                genre,
                logline: 'An indie story released to keep the slate full.',
                writer: 'Staff Writer',
                pages: 100,
                quality: 60,
                budget: 12000000,
                developmentStage: 'final',
                themes: ['indie','festival'],
                targetAudience: 'general',
                estimatedRuntime: 110,
                characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 6, cgiIntensity: 'minimal' }
              } as Script;

              const indie: Project = {
                id: buildDeterministicId(ctx, `ai-project-${timeState.currentYear}-${w}`),
                title: script.title,
                script,
                type: 'feature',
                currentPhase: 'release',
                status: 'released',
                phaseDuration: 0,
                contractedTalent: [],
                developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
                budget: {
                  total: script.budget,
                  allocated: { aboveTheLine: script.budget * 0.2, belowTheLine: script.budget * 0.3, postProduction: script.budget * 0.15, marketing: script.budget * 0.25, distribution: script.budget * 0.1, contingency: 0 },
                  spent: { aboveTheLine: script.budget * 0.2, belowTheLine: script.budget * 0.3, postProduction: script.budget * 0.15, marketing: script.budget * 0.25, distribution: script.budget * 0.1, contingency: 0 },
                  overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }
                },
                cast: [],
                crew: [],
                timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] },
                locations: [],
                distributionStrategy: { primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } }, international: [], windows: [], marketingBudget: script.budget * 0.25 },
                metrics: {
                  inTheaters: true,
                  boxOfficeTotal: Math.floor(script.budget * 2.2),
                  theaterCount: 1200,
                  weeksSinceRelease: 0,
                  criticsScore: 70,
                  audienceScore: 72,
                  boxOfficeStatus: 'Current',
                  theatricalRunLocked: false,
                  boxOffice: { openingWeekend: 0, domesticTotal: 0, internationalTotal: 0, production: script.budget, marketing: script.budget * 0.25, profit: 0, theaters: 1200, weeks: 0 }
                },
                releaseWeek: w,
                releaseYear: timeState.currentYear,
                studioName: fallback.name
              };

              newAIReleases.push(attachBasicCastForAI(indie, state.talent));
            }
          }
        }
      }

      const thisWeekRelease = newAIReleases.find(r => r.releaseWeek === timeState.currentWeek);
      if (thisWeekRelease) {
        const studio = state.competitorStudios.find(s => s.name === thisWeekRelease.studioName) || state.competitorStudios[0];

        MediaEngine.queueMediaEvent({
          type: 'release',
          triggerType: 'competitor_action',
          priority: 'low',
          entities: {
            studios: studio ? [studio.id] : undefined,
            projects: [thisWeekRelease.id],
            talent: (thisWeekRelease.cast || []).slice(0, 2).map(c => c.talentId)
          },
          eventData: { project: thisWeekRelease },
          week: timeState.currentWeek,
          year: timeState.currentYear
        });
      }
    }

    const weeklyResults = processWeeklyCosts(state, updatedProjects, ctx);

    let deepRepResult = { reputation: weeklyResults.studio.reputation ?? 0 } as any;
    try {
      DeepReputationSystem.updateIndustryContext([...state.competitorStudios, state.studio], timeState as any);
      deepRepResult = DeepReputationSystem.calculateDeepReputation(
        weeklyResults.studio,
        updatedProjects,
        state.talent,
        timeState as any,
        state.competitorStudios
      );
    } catch (e) {
      console.warn('Deep reputation error', e);
    }

    const enhancedStudio = {
      ...weeklyResults.studio,
      reputation: deepRepResult.reputation,
      budget: weeklyResults.studio.budget + weeklyProjectEffects.studioRevenueDelta
    };

    const currentAbsWeek = (timeState.currentYear * 52) + timeState.currentWeek;
    let updatedTalent: TalentPerson[] = state.talent.map(t => {
      let status = t.contractStatus;
      let busyUntil = t.busyUntilWeek;
      if (status === 'busy' && typeof busyUntil === 'number' && busyUntil <= currentAbsWeek) {
        status = 'available';
        busyUntil = undefined;
      }
      return { ...t, contractStatus: status, busyUntilWeek: busyUntil };
    });

    updatedTalent = updatedTalent.map(t => {
      const commitment = AIStudioManager.getTalentCommitment(t.id, timeState.currentWeek, timeState.currentYear);
      if (!commitment) return t;

      const endAbsWeek = (timeState.currentYear * 52) + commitment.endWeek;
      const existingBusyUntil = typeof t.busyUntilWeek === 'number' ? t.busyUntilWeek : 0;

      return {
        ...t,
        contractStatus: 'busy',
        busyUntilWeek: Math.max(existingBusyUntil, endAbsWeek)
      };
    });

    updatedProjects.forEach(p => {
      if (p.currentPhase === 'production' || p.status === 'filming') {
        p.cast?.forEach(c => {
          const idx = updatedTalent.findIndex(t => t.id === c.talentId);
          if (idx >= 0) {
            const isCameo = c.role.toLowerCase().includes('cameo') || c.role.toLowerCase().includes('minor');
            const durationWeeks = isCameo ? 2 : 8;
            updatedTalent[idx] = {
              ...updatedTalent[idx],
              contractStatus: 'busy',
              busyUntilWeek: currentAbsWeek + durationWeeks
            };
          }
        });
      }
    });

    const releasedForFilmography = [
      ...weeklyProjectEffects.releasedProjects,
      ...newAIReleases.filter(r => r.status === 'released')
    ];

    if (releasedForFilmography.length > 0) {
      let filmographyState: GameState = { ...state, talent: updatedTalent };
      for (const released of releasedForFilmography) {
        filmographyState = TalentFilmographyManager.updateFilmographyOnRelease(filmographyState, released);
      }
      updatedTalent = filmographyState.talent as typeof updatedTalent;
    }

    const MAX_RELEASE_AGE_WEEKS = 156;
    const currentAbsoluteWeek = (timeState.currentYear * 52) + timeState.currentWeek;

    const prunedReleases = [...state.allReleases, ...newAIReleases].filter((release) => {
      if (!('releaseWeek' in release) || !('releaseYear' in release)) return true;
      const releaseAbsWeek = ((release as Project).releaseYear! * 52) + (release as Project).releaseWeek!;
      return (currentAbsoluteWeek - releaseAbsWeek) <= MAX_RELEASE_AGE_WEEKS;
    });

    const prunedBoxOfficeHistory = (state.boxOfficeHistory || []).filter((entry: any) => {
      if (!entry.week || !entry.year) return true;
      const entryAbsWeek = (entry.year * 52) + entry.week;
      return (currentAbsoluteWeek - entryAbsWeek) <= MAX_RELEASE_AGE_WEEKS;
    });

    const prunedTopFilmsHistory = (state.topFilmsHistory || []).slice(-52);

    const newState: GameState = {
      ...state,
      projects: updatedProjects,
      studio: enhancedStudio,
      allReleases: prunedReleases,
      aiStudioProjects: prunedReleases.filter((r): r is Project => 'script' in r),
      talent: updatedTalent,
      boxOfficeHistory: prunedBoxOfficeHistory,
      topFilmsHistory: prunedTopFilmsHistory,
    } as any;

    try {
      MediaResponseSystem.processWeeklyCampaigns(newState);
    } catch (e) {
      console.warn('Media response campaign processing error', e);
    }

    try {
      MediaEngine.triggerAutomaticEvents(newState, state);
      MediaEngine.processMediaEvents(newState);

      try {
        MediaFinancialIntegration.applyFinancialEffects(newState);
      } catch (e) {
        console.warn('Media financial integration error', e);
      }
    } catch (e) {
      console.warn('Media engine processing error', e);
    }

    try {
      MediaReputationIntegration.processWeeklyReputationUpdates(newState);
    } catch (e) {
      console.warn('Media reputation integration error', e);
    }

    if (timeState.currentWeek % 10 === 0) {
      CrisisManagement.performMaintenanceCleanup(timeState.currentWeek, timeState.currentYear);
      MediaRelationships.performMaintenanceCleanup(timeState.currentWeek, timeState.currentYear);
      FinancialEngine.performMemoryCleanup(timeState.currentWeek, timeState.currentYear);
    }

    if (ctx.debug) {
      SystemIntegration.runDiagnostics(newState);
    }

    return newState;
  },
};
