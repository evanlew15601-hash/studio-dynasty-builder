import React, { useState } from 'react';
import { Project, AwardsCampaign, StudioAward } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AwardsShowModal } from './AwardsShowModal';
import { AwardsCalendar } from './AwardsCalendar';
import { 
  TrophyIcon, 
  StarIcon, 
  CalendarIcon,
  DollarIcon,
  TrendingIcon 
} from '@/components/ui/icons';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';

interface AwardsSystemProps {
  onNavigatePhase?: (phase: 'media' | 'distribution') => void;
}

export const AwardsSystem: React.FC<AwardsSystemProps> = ({ 
  onNavigatePhase
}) => {
  const gameState = useGameStore((s) => s.game);
  const setPhase = useUiStore((s) => s.setPhase);
  const navigatePhase = onNavigatePhase ?? ((phase: 'media' | 'distribution') => setPhase(phase));
  const replaceProject = useGameStore((s) => s.replaceProject);
  const updateStudio = useGameStore((s) => s.updateStudio);
  const addStudioAwards = useGameStore((s) => s.addStudioAwards);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const { toast } = useToast();
  const [showAwardsModal, setShowAwardsModal] = useState(false);
  const [currentCeremony, setCurrentCeremony] = useState<string>('');
  const [currentNominations, setCurrentNominations] = useState<Array<{
    project: Project;
    category: string;
    won: boolean;
    award?: StudioAward;
  }>>([]);
  // Track processed ceremonies to avoid duplicate triggers and store season momentum and nominations
  const [processedCeremonies, setProcessedCeremonies] = useState<Set<string>>(new Set());
  const [seasonMomentum, setSeasonMomentum] = useState<Record<string, number>>({});
  const [seasonNominations, setSeasonNominations] = useState<Record<string, { year: number; categories: Record<string, Array<{ project: Project; score: number }>> }>>({});

  const isTvProject = (project: Project) => project.type === 'series' || project.type === 'limited-series';

  React.useEffect(() => {
    if (!gameState) return;

    if (gameState.currentWeek === 1) {
      setProcessedCeremonies(new Set());
      setSeasonNominations({});
      setSeasonMomentum({});
    }
  }, [gameState?.currentYear, gameState?.currentWeek]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading awards system...</div>;
  }

  const awardShows = getAwardShowsForYear(gameState.currentYear);
  const lastCeremonyWeekFor = (medium: 'film' | 'tv') => {
    const weeks = awardShows.filter(s => s.medium === medium).map(s => s.ceremonyWeek);
    return weeks.length > 0 ? Math.max(...weeks) : 0;
  };

  const filmAwardsEndWeek = lastCeremonyWeekFor('film');
  const tvAwardsEndWeek = lastCeremonyWeekFor('tv');

  const filmCampaignWindowOpen = gameState.currentWeek >= 1 && gameState.currentWeek <= filmAwardsEndWeek;
  const tvCampaignWindowOpen = gameState.currentWeek >= 1 && gameState.currentWeek <= tvAwardsEndWeek;
  const isAnyCampaignWindowOpen = filmCampaignWindowOpen || tvCampaignWindowOpen;

  // Get eligible projects for awards (completed releases from previous year, including AI studios)
  const getEligibleProjects = (): Project[] => {
    // Include both player projects and AI studio releases
const playerProjects = gameState.projects.filter(project => 
  project.status === 'released' && 
  project.releaseYear === gameState.currentYear - 1 && // Released previous year
  project.metrics?.criticsScore && 
  project.metrics.criticsScore >= 45 // Lower threshold to 45
);
    
const aiProjects = gameState.allReleases.filter((release): release is Project => 
  'script' in release && // It's a Project, not BoxOfficeRelease
  release.status === 'released' &&
  release.releaseYear === gameState.currentYear - 1 &&
  release.metrics?.criticsScore && 
  release.metrics.criticsScore >= 45
);
    
    return [...playerProjects, ...aiProjects];
  };

  // Calculate award probability based on project metrics
  const calculateAwardsProbability = (project: Project): number => {
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;

    const medium: 'film' | 'tv' = isTvProject(project) ? 'tv' : 'film';

    let probability = criticsScore * 0.65 + audienceScore * 0.35;

    if (medium === 'film') {
      const boxOffice = project.metrics?.boxOfficeTotal || 0;
      const budget = project.budget.total;

      if (boxOffice > budget * 1.5) probability += 10;

      // Genre bonuses during the early-year film awards window
      if (gameState.currentWeek >= 1 && gameState.currentWeek <= 12) {
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

    // Awards campaign boost (for player projects only)
    const campaign = project.awardsCampaign as AwardsCampaign | undefined;
    if (campaign) {
      const budgetBoost = Math.min(12, campaign.budget / 250_000);
      const effectivenessBoost = (campaign.effectiveness || 0) * 0.1;
      probability += budgetBoost * 0.6 + effectivenessBoost * 0.4;
    }

    return Math.min(100, Math.max(0, probability));
  };

  // Start awards campaign
  const startAwardsCampaign = (project: Project, budget: number) => {
    // Prevent campaigning for AI films
    const isPlayerProject = gameState.projects.some(p => p.id === project.id);
    if (!isPlayerProject) {
      toast({
        title: "Not Allowed",
        description: "You can only run awards campaigns for your own projects.",
        variant: "destructive"
      });
      return;
    }

    if (budget > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: "Not enough studio budget for awards campaign.",
        variant: "destructive"
      });
      return;
    }

    const baseEffectiveness = 60 + Math.min(20, Math.floor(budget / 500_000) * 5);

    const targetCategories = isTvProject(project)
      ? ['Best Drama Series', 'Best Actor - Drama Series', 'Best Directing']
      : ['Best Picture', 'Best Director', 'Best Actor'];

    const campaign: AwardsCampaign = {
      projectId: project.id,
      targetCategories,
      budget,
      budgetSpent: 0,
      duration: 8, // 8 week campaign (tracked abstractly for now)
      weeksRemaining: 8,
      effectiveness: Math.min(100, baseEffectiveness),
      activities: [
        {
          type: 'screenings',
          name: 'Industry Screenings',
          cost: budget * 0.3,
          effectivenessBoost: 15,
          prestigeBoost: 5
        },
        {
          type: 'advertising',
          name: 'Trade Publications',
          cost: budget * 0.4,
          effectivenessBoost: 20,
          prestigeBoost: 3
        },
        {
          type: 'events',
          name: 'Awards Dinners',
          cost: budget * 0.3,
          effectivenessBoost: 10,
          prestigeBoost: 8
        }
      ]
    };

    // Persist campaign on the project so the headless awards engine can see it
    replaceProject({
      ...project,
      awardsCampaign: campaign
    });

    // Deduct budget
    updateBudget(-budget);

    toast({
      title: "Awards Campaign Started!",
      description: `${budget.toLocaleString()} campaign launched for "${project.title}". This will boost its awards chances this season.`,
    });
  };

  // Build per-show configuration (weeks sourced from centralized schedule)
  const getShowConfig = (ceremonyName: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    const show = schedule.find(s => s.name === ceremonyName);

    const base = (() => {
      switch (ceremonyName) {
        case 'Crystal Ring':
          return {
            prestige: 6,
            categories: ['Best Picture - Drama', 'Best Director'],
            nominationWeek: 2,
            ceremonyWeek: 6,
            momentumBonus: 8
          } as const;
        case 'Critics Circle':
          return {
            prestige: 5,
            categories: ['Best Film', 'Best Acting'],
            nominationWeek: 3,
            ceremonyWeek: 8,
            momentumBonus: 6
          } as const;
        default:
          return {
            prestige: 10,
            categories: ['Best Picture', 'Best Director', 'Best Actor'],
            nominationWeek: 4,
            ceremonyWeek: 10,
            momentumBonus: 12
          } as const; // Crown
      }
    })();

    return {
      ...base,
      nominationWeek: show?.nominationWeek ?? base.nominationWeek,
      ceremonyWeek: show?.ceremonyWeek ?? base.ceremonyWeek,
    };
  };

  // Generate and store nominations (top 5 per category) with momentum-aware scoring
  const announceNominations = (ceremonyName: string) => {
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (seasonNominations[key]) return; // idempotent

    const { categories } = getShowConfig(ceremonyName);
    const eligible = getEligibleProjects();

    const categoriesMap: Record<string, Array<{ project: Project; score: number }>> = {};

    categories.forEach(category => {
      const ranked = eligible
        .map(project => {
          const base = calculateAwardsProbability(project);
          const momentum = seasonMomentum[project.id] || 0;
          // Slight category bias: technical vs acting vs picture kept simple
          const categoryBias = category.toLowerCase().includes('director') ? 5 : category.toLowerCase().includes('actor') ? 3 : 0;
          const score = Math.min(100, base + momentum + categoryBias + (Math.random() * 6 - 3));
          return { project, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      categoriesMap[category] = ranked;
    });

    setSeasonNominations(prev => ({
      ...prev,
      [key]: { year: gameState.currentYear, categories: categoriesMap }
    }));

    toast({
      title: `${ceremonyName} Nominations Announced`,
      description: `Top contenders selected across ${categories.length} categories.`,
    });
  };

  // Host ceremony using stored nominations; apply momentum and awards
  const triggerAwardsCeremony = (ceremonyName: string) => {
    const { categories, ceremonyWeek, prestige, momentumBonus } = getShowConfig(ceremonyName);
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (gameState.currentWeek !== ceremonyWeek) return;
    if (processedCeremonies.has(key)) return;

    // Ensure nominations exist
    if (!seasonNominations[key]) {
      announceNominations(ceremonyName);
    }

    const nominationsRecord = seasonNominations[key];
    if (!nominationsRecord) return; // safety

    const flatForModal: Array<{ project: Project; category: string; won: boolean; award?: StudioAward }> = [];
    const winnersThisShow: string[] = [];

    categories.forEach(category => {
      const nominees = nominationsRecord.categories[category] || [];
      if (nominees.length === 0) return;
      // Winner: weighted pick favoring top nominee with randomness
      const weighted = nominees.map((n, idx) => ({ ...n, weight: (nominees.length - idx) * 1.5 + (seasonMomentum[n.project.id] || 0) / 10 }));
      const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
      let r = Math.random() * totalWeight;
      let winner = weighted[0];
      for (const w of weighted) { r -= w.weight; if (r <= 0) { winner = w; break; } }

      nominees.forEach(n => {
        const won = n.project.id === winner.project.id;
        const award: StudioAward | undefined = won
          ? {
              id: `award-${Date.now()}-${Math.random()}`,
              projectId: n.project.id,
              category,
              ceremony: ceremonyName,
              year: gameState.currentYear,
              prestige,
              reputationBoost: prestige * 2,
              revenueBoost: n.project.budget.total * (prestige / 100)
            }
          : undefined;
        flatForModal.push({ project: n.project, category, won, award });
        if (won) winnersThisShow.push(n.project.id);
      });
    });

    // Mark processed to avoid repeats
    setProcessedCeremonies(prev => new Set(prev).add(key));

    // Momentum: winners gain momentumBonus for later shows
    if (winnersThisShow.length > 0) {
      setSeasonMomentum(prev => {
        const next = { ...prev };
        winnersThisShow.forEach(pid => { next[pid] = (next[pid] || 0) + momentumBonus; });
        return next;
      });
    }

    if (flatForModal.length > 0) {
      setCurrentCeremony(ceremonyName);
      setCurrentNominations(flatForModal);
      setShowAwardsModal(true);

      // Apply player studio benefits for wins
      const wonAwards = flatForModal.filter(n => n.won && n.award).map(n => n.award!)
        .filter(a => gameState.projects.some(p => p.id === a.projectId));
      if (wonAwards.length > 0) {
        const totalReputation = wonAwards.reduce((sum, award) => sum + award.reputationBoost, 0);
        const totalRevenue = wonAwards.reduce((sum, award) => sum + award.revenueBoost, 0);

        updateStudio({
          reputation: Math.min(100, (gameState.studio.reputation || 0) + totalReputation),
        });
        updateBudget(totalRevenue);
        addStudioAwards(wonAwards);
      }
    }
  };

  

  // Weekly triggers for nominations and ceremonies
  // Note: Headless engine now handles triggers globally. This UI remains view-only.
  // React.useEffect(() => {
  //   if (!isAwardsSeasonActive) return;
  //   const shows = getAwardShowsForYear(gameState.currentYear);
  //   // Announcements
  //   shows.forEach(s => {
  //     if (gameState.currentWeek === s.nominationWeek) announceNominations(s.name);
  //   });
  //   // Ceremonies (triggerAwardsCeremony checks week and processed state internally)
  //   shows.forEach(s => triggerAwardsCeremony(s.name));
  // }, [gameState.currentWeek, isAwardsSeasonActive, gameState.currentYear]);

  const eligibleProjects = getEligibleProjects();

  return (
    <div className="space-y-6">
      <AwardsShowModal
        open={showAwardsModal}
        onClose={() => setShowAwardsModal(false)}
        ceremony={currentCeremony}
        nominations={currentNominations}
        year={gameState.currentYear}
      />
      {/* Awards Season Status */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <div className="p-2 rounded-lg bg-gradient-golden mr-3">
              <TrophyIcon className="text-primary-foreground" size={20} />
            </div>
            Awards Season {gameState.currentYear}
            {filmCampaignWindowOpen && (
              <Badge variant="default" className="ml-3">
                FILM WINDOW (≤W{filmAwardsEndWeek || 0})
              </Badge>
            )}
            {tvCampaignWindowOpen && (
              <Badge variant="secondary" className="ml-2">
                TV WINDOW (≤W{tvAwardsEndWeek || 0})
              </Badge>
            )}
          </CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            <strong>Eligibility Period:</strong> Projects released in {gameState.currentYear - 1} (January 1 - December 31)
            {isAnyCampaignWindowOpen && (
              <div className="mt-1">
                <strong>Campaign Windows:</strong> {filmCampaignWindowOpen ? `Film ≤ Week ${filmAwardsEndWeek}` : 'Film closed'} • {tvCampaignWindowOpen ? `TV ≤ Week ${tvAwardsEndWeek}` : 'TV closed'}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="text-sm text-muted-foreground">Campaign Status</div>
              <div className="text-xl font-bold text-primary">
                {isAnyCampaignWindowOpen ? 'Open' : 'Closed'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Week {gameState.currentWeek}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="text-sm text-muted-foreground">Eligible Projects</div>
              <div className="text-xl font-bold text-accent">
                {eligibleProjects.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                From {gameState.currentYear - 1}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/10">
              <div className="text-sm text-muted-foreground">Studio Prestige</div>
              <div className="text-xl font-bold text-yellow-600">
                {gameState.studio.prestige || 0}/100
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Awards boost prestige
              </div>
            </div>
          </div>
          
          {gameState.currentWeek >= 1 && gameState.currentWeek <= 12 && (
            <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center space-x-2 mb-2">
                <StarIcon className="text-primary" size={16} />
                <span className="font-medium text-primary">Film Awards Genre Boost Active</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Drama gets +15%, biography +10%, historical +8% (film awards window)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible Projects for Awards */}
      {eligibleProjects.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <CalendarIcon className="mr-2" size={20} />
              Awards Contenders ({gameState.currentYear - 1})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eligibleProjects.map(project => {
              const probability = calculateAwardsProbability(project);
              const isPlayerProject = gameState.projects.some(p => p.id === project.id);
              const campaign = isPlayerProject ? (project.awardsCampaign as AwardsCampaign | undefined) : undefined;

              return (
                <div key={project.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-lg">{project.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {isTvProject(project) ? 'TV' : 'Film'} • {project.script.genre} • Critics: {project.metrics?.criticsScore}/100 • 
                        Audience: {project.metrics?.audienceScore}/100
                      </div>
                    </div>
                    <Badge variant={probability >= 70 ? "default" : probability >= 50 ? "secondary" : "outline"}>
                      {probability >= 70 ? 'Strong Contender' : probability >= 50 ? 'Possible Nominee' : 'Long Shot'}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Awards Probability</span>
                      <span>{probability.toFixed(1)}%</span>
                    </div>
                    <Progress value={probability} className="h-2" />
                  </div>

                  {campaign && (
                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          Awards Campaign Active
                        </Badge>
                        <span>
                          Budget ${campaign.budget.toLocaleString()} • Effectiveness {Math.round(campaign.effectiveness).toString()}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {(isTvProject(project) ? tvCampaignWindowOpen : filmCampaignWindowOpen) && isPlayerProject && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => startAwardsCampaign(project, 500000)}
                          variant="outline"
                          disabled={!!campaign}
                        >
                          <DollarIcon className="mr-1" size={14} />
                          Basic Campaign ($500K)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => startAwardsCampaign(project, 1500000)}
                          variant="outline"
                          disabled={!!campaign}
                        >
                          <DollarIcon className="mr-1" size={14} />
                          Premium Campaign ($1.5M)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => startAwardsCampaign(project, 3000000)}
                          variant="outline"
                          disabled={!!campaign}
                        >
                          <DollarIcon className="mr-1" size={14} />
                          Prestige Campaign ($3M)
                        </Button>
                      </div>
                      {campaign && (
                        <div className="text-xs text-muted-foreground">
                          A campaign is already running for this project this season.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Studio Awards History */}
      {gameState.studio.awards && gameState.studio.awards.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <TrophyIcon className="mr-2" size={20} />
              Awards Cabinet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameState.studio.awards.map(award => (
                <div key={award.id} className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrophyIcon className="text-yellow-600" size={16} />
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {award.ceremony} {award.year}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{award.category}</div>
                  <div className="text-xs text-muted-foreground">
                    Project: {gameState.projects.find(p => p.id === award.projectId)?.title || 
                             gameState.allReleases.find((r): r is Project => 'script' in r && r.id === award.projectId)?.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Studio: {gameState.projects.find(p => p.id === award.projectId) ? 'Your Studio' : 
                            gameState.allReleases.find((r): r is Project => 'script' in r && r.id === award.projectId)?.studioName || 'Unknown'}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    +{award.reputationBoost} Reputation
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Navigate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigatePhase('media')}>
            Open Media Dashboard
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigatePhase('distribution')}>
            Manage Post-Theatrical Distribution
          </Button>
        </CardContent>
      </Card>

      {/* Awards Calendar */}
      <AwardsCalendar 
        currentWeek={gameState.currentWeek}
        currentYear={gameState.currentYear}
      />

      {eligibleProjects.length === 0 && (
        <Card className="card-premium">
          <CardContent className="text-center py-12">
            <TrophyIcon className="mx-auto text-muted-foreground/50 mb-4" size={48} />
            <div className="text-lg font-medium text-muted-foreground mb-2">
              No Projects Eligible for Awards
            </div>
            <div className="text-sm text-muted-foreground">
              Release quality films or TV shows to compete in next year's awards season
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};