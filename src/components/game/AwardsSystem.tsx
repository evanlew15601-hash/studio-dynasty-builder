import React, { useState } from 'react';
import { GameState, Project, AwardsEvent, AwardsCampaign, StudioAward } from '@/types/game';
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
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
  onStudioUpdate: (updates: any) => void;
}

export const AwardsSystem: React.FC<AwardsSystemProps> = ({ 
  gameState, 
  onProjectUpdate, 
  onStudioUpdate 
}) => {
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
  // Check if it's awards season (Jan-Mar = weeks 1-12)
  const isAwardsSeasonActive = gameState.currentWeek >= 1 && gameState.currentWeek <= 12;

  // Get eligible projects for awards (completed releases from previous year, including AI studios)
  const getEligibleProjects = (): Project[] => {
    // Include both player projects and AI studio releases
    const playerProjects = gameState.projects.filter(project => 
      project.status === 'released' && 
      project.releaseYear === gameState.currentYear - 1 && // Released previous year
      project.metrics?.criticsScore && 
      project.metrics.criticsScore >= 60 // Minimum quality threshold
    );
    
    const aiProjects = gameState.allReleases.filter((release): release is Project => 
      'script' in release && // It's a Project, not BoxOfficeRelease
      release.status === 'released' &&
      release.releaseYear === gameState.currentYear - 1 &&
      release.metrics?.criticsScore && 
      release.metrics.criticsScore >= 60
    );
    
    return [...playerProjects, ...aiProjects];
  };

  // Calculate award probability based on project metrics
  const calculateAwardsProbability = (project: Project): number => {
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;
    const boxOffice = project.metrics?.boxOfficeTotal || 0;
    const budget = project.budget.total;
    
    // Higher scores = better chance
    let probability = (criticsScore + audienceScore) / 2;
    
    // Bonus for profitable films
    if (boxOffice > budget * 1.5) probability += 10;
    
    // Genre bonuses during awards season
    if (isAwardsSeasonActive) {
      if (project.script.genre === 'drama') probability += 15;
      if (project.script.genre === 'biography') probability += 10;
      if (project.script.genre === 'historical') probability += 8;
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
        description: "You can only run awards campaigns for your own films.",
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

    const campaign: AwardsCampaign = {
      projectId: project.id,
      targetCategories: ['Best Picture', 'Best Director', 'Best Actor'],
      budget,
      budgetSpent: 0,
      duration: 8, // 8 week campaign
      weeksRemaining: 8,
      effectiveness: 60,
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

    // Deduct budget
    onStudioUpdate({
      budget: gameState.studio.budget - budget
    });

    toast({
      title: "Awards Campaign Started!",
      description: `$${budget.toLocaleString()} campaign launched for "${project.title}"`,
    });
  };

  // Build per-show configuration (weeks sourced from centralized schedule)
  const getShowConfig = (ceremonyName: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    const show = schedule.find(s => s.name === ceremonyName);

    const base = (() => {
      switch (ceremonyName) {
        case 'Golden Globe':
          return {
            prestige: 6,
            categories: ['Best Picture - Drama', 'Best Director'],
            nominationWeek: 2,
            ceremonyWeek: 6,
            momentumBonus: 8
          } as const;
        case 'Critics Choice':
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
          } as const; // Oscar
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

    // Momentum: winners gain momentumBonus for later shows (helps Oscars)
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
        onStudioUpdate({
          reputation: Math.min(100, gameState.studio.reputation + totalReputation),
          budget: gameState.studio.budget + totalRevenue,
          awards: [...(gameState.studio.awards || []), ...wonAwards]
        });
      }
    }
  };

  // Reset season state at the start of a new season
  React.useEffect(() => {
    if (gameState.currentWeek === 1) {
      setProcessedCeremonies(new Set());
      setSeasonNominations({});
      setSeasonMomentum({});
    }
  }, [gameState.currentYear, gameState.currentWeek]);

  // Weekly triggers for nominations and ceremonies
  React.useEffect(() => {
    if (!isAwardsSeasonActive) return;
    const shows = getAwardShowsForYear(gameState.currentYear);
    // Announcements
    shows.forEach(s => {
      if (gameState.currentWeek === s.nominationWeek) announceNominations(s.name);
    });
    // Ceremonies (triggerAwardsCeremony checks week and processed state internally)
    shows.forEach(s => triggerAwardsCeremony(s.name));
  }, [gameState.currentWeek, isAwardsSeasonActive, gameState.currentYear]);

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
            {isAwardsSeasonActive && (
              <Badge variant="default" className="ml-3 animate-pulse">
                ACTIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="text-sm text-muted-foreground">Season Status</div>
              <div className="text-xl font-bold text-primary">
                {isAwardsSeasonActive ? 'Active' : 'Inactive'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isAwardsSeasonActive ? `Week ${gameState.currentWeek}/12` : 'Returns in January'}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="text-sm text-muted-foreground">Eligible Films</div>
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
          
          {isAwardsSeasonActive && (
            <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center space-x-2 mb-2">
                <StarIcon className="text-primary" size={16} />
                <span className="font-medium text-primary">Awards Season Boost Active</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Quality films get +15% chance for drama, +10% for biography, +8% for historical
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
              return (
                <div key={project.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-lg">{project.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.script.genre} • Critics: {project.metrics?.criticsScore}/100 • 
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
                  
                  {isAwardsSeasonActive && gameState.projects.some(p => p.id === project.id) && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => startAwardsCampaign(project, 500000)}
                        variant="outline"
                      >
                        <DollarIcon className="mr-1" size={14} />
                        Basic Campaign ($500K)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startAwardsCampaign(project, 1500000)}
                        variant="outline"
                      >
                        <DollarIcon className="mr-1" size={14} />
                        Premium Campaign ($1.5M)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startAwardsCampaign(project, 3000000)}
                        variant="outline"
                      >
                        <DollarIcon className="mr-1" size={14} />
                        Prestige Campaign ($3M)
                      </Button>
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
              No Films Eligible for Awards
            </div>
            <div className="text-sm text-muted-foreground">
              Release quality films to compete in next year's awards season
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};