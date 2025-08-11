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

  // Trigger awards ceremony based on week
  const triggerAwardsCeremony = (ceremonyName: string, week: number) => {
    if (gameState.currentWeek !== week) return;
    
    const eligibleProjects = getEligibleProjects();
    const nominations: Array<{
      project: Project;
      category: string;
      won: boolean;
      award?: StudioAward;
    }> = [];
    
    eligibleProjects.forEach(project => {
      const probability = calculateAwardsProbability(project);
      
      // Determine nominations and wins based on ceremony
      let categories: string[] = [];
      let winThresholds: { [key: string]: number } = {};
      
      switch (ceremonyName) {
        case 'Oscar':
          categories = ['Best Picture', 'Best Director', 'Best Actor'];
          winThresholds = { 'Best Picture': 85, 'Best Director': 80, 'Best Actor': 75 };
          break;
        case 'Golden Globe':
          categories = ['Best Picture - Drama', 'Best Director'];
          winThresholds = { 'Best Picture - Drama': 70, 'Best Director': 75 };
          break;
        case 'Critics Choice':
          categories = ['Best Film', 'Best Acting'];
          winThresholds = { 'Best Film': 65, 'Best Acting': 70 };
          break;
      }
      
      categories.forEach(category => {
        if (probability >= (winThresholds[category] - 20)) { // Nomination threshold
          const won = probability >= winThresholds[category] && Math.random() * 100 < (probability - winThresholds[category] + 30);
          
          let award: StudioAward | undefined;
          if (won) {
            const prestigeValue = ceremonyName === 'Oscar' ? 10 : ceremonyName === 'Golden Globe' ? 6 : 5;
            award = {
              id: `award-${Date.now()}-${Math.random()}`,
              projectId: project.id,
              category,
              ceremony: ceremonyName,
              year: gameState.currentYear,
              prestige: prestigeValue,
              reputationBoost: prestigeValue * 2,
              revenueBoost: project.budget.total * (prestigeValue / 100)
            };
          }
          
          nominations.push({
            project,
            category,
            won,
            award
          });
        }
      });
    });
    
    if (nominations.length > 0) {
      setCurrentCeremony(ceremonyName);
      setCurrentNominations(nominations);
      setShowAwardsModal(true);
      
      // Apply awards to studio
      const wonAwards = nominations.filter(n => n.won).map(n => n.award!);
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

  // Check for awards ceremonies this week
  React.useEffect(() => {
    if (isAwardsSeasonActive) {
      if (gameState.currentWeek === 6) {
        triggerAwardsCeremony('Golden Globe', 6);
      } else if (gameState.currentWeek === 8) {
        triggerAwardsCeremony('Critics Choice', 8);
      } else if (gameState.currentWeek === 10) {
        triggerAwardsCeremony('Oscar', 10);
      }
    }
  }, [gameState.currentWeek]);

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
                  
                  {isAwardsSeasonActive && (
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