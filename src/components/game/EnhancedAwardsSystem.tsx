
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Project, TalentPerson, Studio, GameState } from '@/types/game';
import { TimeSystem } from './TimeSystem';
import { Trophy, Star, Calendar, Award, Crown, Users } from 'lucide-react';

interface AwardCategory {
  id: string;
  name: string;
  type: 'film' | 'talent' | 'technical';
  weight: number; // Importance/prestige of the award
}

interface AwardNomination {
  id: string;
  categoryId: string;
  projectId?: string;
  talentId?: string;
  studioId?: string;
  year: number;
  score: number; // Qualification score
  winner?: boolean;
}

interface AwardsCeremony {
  id: string;
  name: string;
  year: number;
  week: number;
  prestige: number;
  categories: AwardCategory[];
  nominations: AwardNomination[];
  status: 'upcoming' | 'active' | 'completed';
}

interface EnhancedAwardsSystemProps {
  gameState: GameState;
  onReputationUpdate?: (studioId: string, change: number) => void;
  onTalentReputationUpdate?: (talentId: string, change: number) => void;
}

export const EnhancedAwardsSystem: React.FC<EnhancedAwardsSystemProps> = ({
  gameState,
  onReputationUpdate,
  onTalentReputationUpdate
}) => {
  const [activeCeremonies, setActiveCeremonies] = useState<AwardsCeremony[]>([]);
  const [viewMode, setViewMode] = useState<'upcoming' | 'nominees' | 'history'>('upcoming');

  useEffect(() => {
    processAnnualAwards();
  }, [gameState.currentYear, gameState.currentWeek, gameState.projects]);

  const AWARD_CATEGORIES: AwardCategory[] = [
    { id: 'best-picture', name: 'Best Picture', type: 'film', weight: 10 },
    { id: 'best-director', name: 'Best Director', type: 'talent', weight: 8 },
    { id: 'best-actor', name: 'Best Lead Actor', type: 'talent', weight: 7 },
    { id: 'best-actress', name: 'Best Lead Actress', type: 'talent', weight: 7 },
    { id: 'best-supporting-actor', name: 'Best Supporting Actor', type: 'talent', weight: 5 },
    { id: 'best-supporting-actress', name: 'Best Supporting Actress', type: 'talent', weight: 5 },
    { id: 'best-screenplay', name: 'Best Original Screenplay', type: 'technical', weight: 4 },
    { id: 'best-cinematography', name: 'Best Cinematography', type: 'technical', weight: 3 },
    { id: 'best-visual-effects', name: 'Best Visual Effects', type: 'technical', weight: 3 },
    { id: 'best-score', name: 'Best Original Score', type: 'technical', weight: 3 }
  ];

  const processAnnualAwards = () => {
    // Awards season runs in weeks 8-12 of each year
    const isAwardsSeason = gameState.currentWeek >= 8 && gameState.currentWeek <= 12;
    
    if (isAwardsSeason) {
      // Check if we already have a ceremony for this year
      const existingCeremony = activeCeremonies.find(c => c.year === gameState.currentYear);
      
      if (!existingCeremony) {
        console.log(`🏆 AWARDS SEASON ${gameState.currentYear} - Generating nominations...`);
        generateAwardsCeremony();
      } else if (gameState.currentWeek === 10 && existingCeremony.status === 'upcoming') {
        // Ceremony happens in week 10
        hostAwardsCeremony(existingCeremony);
      }
    }
  };

  const generateAwardsCeremony = () => {
    // Get eligible projects (released in the past year)
    const eligibleProjects = getAllEligibleProjects();
    console.log(`   📋 ${eligibleProjects.length} eligible projects found`);
    
    if (eligibleProjects.length === 0) {
      console.log('   ❌ No eligible projects for awards');
      return;
    }

    const ceremony: AwardsCeremony = {
      id: `awards-${gameState.currentYear}`,
      name: `Academy Awards ${gameState.currentYear}`,
      year: gameState.currentYear,
      week: 10,
      prestige: 100,
      categories: AWARD_CATEGORIES,
      nominations: [],
      status: 'upcoming'
    };

    // Generate nominations for each category
    AWARD_CATEGORIES.forEach(category => {
      const nominees = generateNominations(category, eligibleProjects);
      ceremony.nominations.push(...nominees);
    });

    setActiveCeremonies(prev => [...prev, ceremony]);
    console.log(`   ✅ Generated ${ceremony.nominations.length} nominations across ${AWARD_CATEGORIES.length} categories`);
  };

  const getAllEligibleProjects = (): Project[] => {
    // Include both player and AI studio projects
    const playerProjects = gameState.projects.filter(project => 
      project.status === 'released' && 
      project.releaseYear === gameState.currentYear - 1 && // Released last year
      project.metrics?.boxOfficeTotal && project.metrics.boxOfficeTotal > 0
    );

    // Get AI studio projects - they should be in gameState.aiStudioProjects or similar
    const aiProjects = gameState.aiStudioProjects || [];
    const eligibleAIProjects = aiProjects.filter(project =>
      project.status === 'released' &&
      project.releaseYear === gameState.currentYear - 1 &&
      project.metrics?.boxOfficeTotal && project.metrics.boxOfficeTotal > 0
    );

    console.log(`   Player projects: ${playerProjects.length}, AI projects: ${eligibleAIProjects.length}`);
    return [...playerProjects, ...eligibleAIProjects];
  };

  const generateNominations = (category: AwardCategory, eligibleProjects: Project[]): AwardNomination[] => {
    const nominations: AwardNomination[] = [];
    
    eligibleProjects.forEach(project => {
      const score = calculateAwardScore(project, category);
      
      if (score > 45) { // lowered threshold from 60 -> 45 to avoid unrealistically high bar
        const nomination: AwardNomination = {
          id: `nom-${category.id}-${project.id}`,
          categoryId: category.id,
          projectId: project.id,
          year: gameState.currentYear,
          score
        };

        // Add talent-specific nominations
        if (category.type === 'talent') {
          const talentId = getRelevantTalent(project, category.id);
          if (talentId) {
            nomination.talentId = talentId;
          }
        }

        nominations.push(nomination);
      }
    });

    // Sort by score and take top 5
    return nominations.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const calculateAwardScore = (project: Project, category: AwardCategory): number => {
    let score = 0;
    
    // Base score from critical reception
    score += (project.metrics?.criticsScore || 50) * 0.4;
    
    // Box office performance (less weight for technical categories)
    const boxOfficeScore = Math.min(100, (project.metrics?.boxOfficeTotal || 0) / 50000000 * 50);
    score += boxOfficeScore * (category.type === 'technical' ? 0.2 : 0.3);
    
    // Budget considerations (higher budget films more likely for technical awards)
    const budgetScore = Math.min(50, project.budget.total / 2000000);
    if (category.type === 'technical') {
      score += budgetScore * 0.3;
    }
    
    // Genre bonuses
    if (category.id === 'best-picture') {
      const genreBonuses: Record<string, number> = {
        'drama': 10, 'biography': 8, 'historical': 8,
        'war': 6, 'thriller': 4, 'romance': 4
      };
      score += genreBonuses[project.script?.genre || ''] || 0;
    }
    
    // Studio reputation bonus
    if (project.studioName) {
      // For AI studio projects
      const aiStudio = undefined;
      if (aiStudio) {
        score += (aiStudio.reputation - 50) * 0.2;
      }
    } else {
      // For player studio projects
      score += (gameState.studio.reputation - 50) * 0.2;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const getRelevantTalent = (project: Project, categoryId: string): string | undefined => {
    if (!project.cast || project.cast.length === 0) return undefined;
    
    // For now, return the first cast member - this should be enhanced to match role types
    const relevantRoles = {
      'best-director': 'director',
      'best-actor': 'lead',
      'best-actress': 'lead',
      'best-supporting-actor': 'supporting',
      'best-supporting-actress': 'supporting'
    };
    
    const targetRole = relevantRoles[categoryId as keyof typeof relevantRoles];
    const castMember = project.cast.find(c => c.role.toLowerCase().includes(targetRole || 'lead'));
    
    return castMember?.talentId || project.cast[0]?.talentId;
  };

  const hostAwardsCeremony = (ceremony: AwardsCeremony) => {
    console.log(`🎭 HOSTING AWARDS CEREMONY: ${ceremony.name}`);
    
    // Determine winners for each category
    ceremony.categories.forEach(category => {
      const categoryNominations = ceremony.nominations.filter(n => n.categoryId === category.id);
      
      if (categoryNominations.length > 0) {
        // Winner is determined by score with some randomness
        const winnerIndex = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * Math.min(3, categoryNominations.length));
        const winner = categoryNominations[winnerIndex];
        winner.winner = true;
        
        // Apply reputation bonuses
        applyAwardWinBonuses(winner, category);
        
        console.log(`   🏆 ${category.name}: ${getWinnerDisplayName(winner)}`);
      }
    });

    ceremony.status = 'completed';
    setActiveCeremonies(prev => prev.map(c => c.id === ceremony.id ? ceremony : c));
  };

  const applyAwardWinBonuses = (winner: AwardNomination, category: AwardCategory) => {
    const reputationBonus = category.weight * 2; // Bigger categories give more reputation
    
    if (winner.projectId) {
      const project = gameState.projects.find(p => p.id === winner.projectId);
      if (project) {
        // Player studio project
        onReputationUpdate?.(gameState.studio.id, reputationBonus);
      } else {
        // AI studio project
        const aiProject = undefined;
        if (aiProject && aiProject.studioName) {
          // Update AI studio reputation (if we have that system)
          console.log(`AI Studio ${aiProject.studioName} wins ${category.name}`);
        }
      }
    }
    
    if (winner.talentId) {
      onTalentReputationUpdate?.(winner.talentId, reputationBonus);
    }
  };

  const getWinnerDisplayName = (winner: AwardNomination): string => {
    const project = gameState.projects.find(p => p.id === winner.projectId) ||
                   undefined;
    
    if (!project) return 'Unknown Project';
    
    if (winner.talentId) {
      const talent = gameState.talent.find(t => t.id === winner.talentId);
      return `${talent?.name || 'Unknown'} (${project.title})`;
    }
    
    return project.title;
  };

  const getCurrentCeremony = () => {
    return activeCeremonies.find(c => c.year === gameState.currentYear);
  };

  const getCompletedCeremonies = () => {
    return activeCeremonies.filter(c => c.status === 'completed').reverse();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Awards Season
          </h2>
          <p className="text-muted-foreground">Industry recognition and prestige</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setViewMode('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={viewMode === 'nominees' ? 'default' : 'outline'}
            onClick={() => setViewMode('nominees')}
          >
            Nominees
          </Button>
          <Button
            variant={viewMode === 'history' ? 'default' : 'outline'}
            onClick={() => setViewMode('history')}
          >
            History
          </Button>
        </div>
      </div>

      {/* Upcoming Ceremony */}
      {viewMode === 'upcoming' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Awards Calendar {gameState.currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameState.currentWeek < 8 ? (
              <div className="text-center py-8">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Awards Season Approaching</h3>
                <p className="text-muted-foreground">
                  Awards nominations will be announced in {8 - gameState.currentWeek} weeks
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Films released in {gameState.currentYear - 1} are eligible for nomination
                </p>
              </div>
            ) : gameState.currentWeek > 12 ? (
              <div className="text-center py-8">
                <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Awards Season Complete</h3>
                <p className="text-muted-foreground">
                  The {gameState.currentYear} ceremony has concluded
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Awards Season Progress</span>
                    <span>Week {gameState.currentWeek} of 12</span>
                  </div>
                  <Progress value={(gameState.currentWeek / 12) * 100} />
                </div>
                
                {getCurrentCeremony() && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Current Status:</h4>
                    {gameState.currentWeek < 10 ? (
                      <p>📋 Nominations announced • Ceremony in {10 - gameState.currentWeek} weeks</p>
                    ) : gameState.currentWeek === 10 ? (
                      <p>🎭 Ceremony happening this week!</p>
                    ) : (
                      <p>✅ Ceremony complete • Winners announced</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nominees View */}
      {viewMode === 'nominees' && (
        <div>
          {getCurrentCeremony() ? (
            <div className="space-y-4">
              {AWARD_CATEGORIES.map(category => {
                const categoryNoms = getCurrentCeremony()!.nominations.filter(n => n.categoryId === category.id);
                
                if (categoryNoms.length === 0) return null;
                
                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryNoms.map(nom => (
                          <div key={nom.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{getWinnerDisplayName(nom)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{nom.score.toFixed(0)}</Badge>
                              {nom.winner && <Crown className="h-4 w-4 text-yellow-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active awards ceremony</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History View */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {getCompletedCeremonies().map(ceremony => (
            <Card key={ceremony.id}>
              <CardHeader>
                <CardTitle>{ceremony.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ceremony.nominations.filter(n => n.winner).map(winner => {
                    const category = ceremony.categories.find(c => c.id === winner.categoryId);
                    return (
                      <div key={winner.id} className="flex items-center gap-2 p-2 border rounded">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="font-medium">{category?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {getWinnerDisplayName(winner)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {getCompletedCeremonies().length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No awards history yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
