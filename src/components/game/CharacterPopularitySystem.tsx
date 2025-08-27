import React, { useState, useEffect } from 'react';
import { GameState, Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, Users, Award, Crown } from 'lucide-react';

interface CharacterPopularityProps {
  gameState: GameState;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
}

export interface CharacterPerformance {
  characterId: string;
  characterName: string;
  talentId: string;
  talentName: string;
  projectId: string;
  projectTitle: string;
  franchiseId?: string;
  performanceScore: number; // 0-100 based on talent skill + film success + screen time
  popularityGain: number; // How much character popularity increased
  screenTimeMinutes: number;
  releaseYear: number;
  releaseWeek: number;
  boxOfficeImpact: number; // Character's estimated contribution to box office
  criticalReception: number; // 0-100
  audienceReception: number; // 0-100
  awardsNominated: number;
  awardsWon: number;
  culturalMoments: string[]; // Notable scenes/quotes/moments
}

export interface CharacterPopularity {
  characterId: string;
  characterName: string;
  franchiseId?: string;
  totalPopularity: number; // 0-1000, cumulative across all performances
  peakPopularity: number; // Highest single performance score
  performances: CharacterPerformance[];
  spinoffPotential: number; // 0-100, calculated from popularity + recent performance
  iconicStatus: 'unknown' | 'recognized' | 'popular' | 'iconic' | 'legendary';
  marketValue: number; // Estimated value for licensing/spin-offs
  fanbaseSize: number; // Estimated number of fans
  culturalImpact: number; // 0-100, long-term cultural significance
  lastActiveYear: number;
  trendingScore: number; // Current buzz level
}

export interface TalentCharacterExpertise {
  talentId: string;
  characterId: string;
  characterName: string;
  franchiseId?: string;
  expertiseLevel: number; // 0-100, how well they embody this character
  performanceHistory: CharacterPerformance[];
  typeCastingRisk: number; // 0-100, how much they're associated with this character type
  fanExpectation: number; // 0-100, how much fans expect them in this role
  contractualRights: {
    hasFirstRefusal: boolean;
    sequelOptions: number;
    approvalRights: boolean;
  };
}

export const CharacterPopularitySystem: React.FC<CharacterPopularityProps> = ({
  gameState,
  onGameStateUpdate
}) => {
  const [characterPopularities, setCharacterPopularities] = useState<CharacterPopularity[]>([]);
  const [talentExpertise, setTalentExpertise] = useState<TalentCharacterExpertise[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterPopularity | null>(null);

  // Calculate character performance when a film is released
  const calculateCharacterPerformance = (
    character: ScriptCharacter,
    talent: TalentPerson,
    project: Project
  ): CharacterPerformance => {
    const basePerformance = talent.reputation || 50;
    const projectSuccess = (project.metrics?.boxOffice?.profit || 0) > 0 ? 75 : 50;
    const screenTime = calculateScreenTime(character, project);
    const screenTimeBonus = Math.min(20, screenTime / 10); // Up to 20 point bonus
    
    const performanceScore = Math.min(100, basePerformance + (projectSuccess * 0.3) + screenTimeBonus);
    const popularityGain = Math.round(performanceScore * (screenTime / 100) * 2);
    
    return {
      characterId: character.id,
      characterName: character.name,
      talentId: talent.id,
      talentName: talent.name,
      projectId: project.id,
      projectTitle: project.title,
      franchiseId: project.franchiseId,
      performanceScore,
      popularityGain,
      screenTimeMinutes: screenTime,
      releaseYear: project.releaseYear || gameState.currentYear,
      releaseWeek: project.releaseWeek || gameState.currentWeek,
      boxOfficeImpact: calculateBoxOfficeImpact(performanceScore, screenTime, project),
      criticalReception: Math.min(100, performanceScore + (Math.random() * 20 - 10)),
      audienceReception: Math.min(100, performanceScore + (Math.random() * 15 - 7.5)),
      awardsNominated: 0, // Will be updated by awards system
      awardsWon: 0,
      culturalMoments: generateCulturalMoments(character, performanceScore)
    };
  };

  const calculateScreenTime = (character: ScriptCharacter, project: Project): number => {
    const baseTime = {
      'lead': 90,
      'supporting': 45,
      'minor': 15,
      'crew': 5
    }[character.importance] || 15;
    
    const budgetMultiplier = Math.min(1.5, (project.budget.total / 50000000) * 0.5 + 0.5);
    return Math.round(baseTime * budgetMultiplier);
  };

  const calculateBoxOfficeImpact = (
    performanceScore: number, 
    screenTime: number, 
    project: Project
  ): number => {
    const totalBoxOffice = (project.metrics?.boxOffice?.domesticTotal || 0) + 
                          (project.metrics?.boxOffice?.internationalTotal || 0);
    const characterContribution = (performanceScore / 100) * (screenTime / 120) * 0.3;
    return Math.round(totalBoxOffice * characterContribution);
  };

  const generateCulturalMoments = (character: ScriptCharacter, score: number): string[] => {
    if (score < 70) return [];
    
    const moments = [
      `Memorable ${character.name} entrance scene`,
      `Iconic ${character.name} dialogue moment`,
      `${character.name}'s character development arc`,
      `Emotional ${character.name} performance highlight`,
      `${character.name}'s action sequence`,
      `${character.name}'s comedic timing`
    ];
    
    const numMoments = Math.floor(((score - 70) / 30) * 3);
    return moments.slice(0, numMoments);
  };

  const updateCharacterPopularity = (performance: CharacterPerformance) => {
    setCharacterPopularities(prev => {
      const existing = prev.find(p => p.characterId === performance.characterId);
      
      if (existing) {
        const updatedPerformances = [...existing.performances, performance];
        const totalPopularity = existing.totalPopularity + performance.popularityGain;
        const peakPopularity = Math.max(existing.peakPopularity, performance.performanceScore);
        
        return prev.map(p => p.characterId === performance.characterId ? {
          ...p,
          totalPopularity,
          peakPopularity,
          performances: updatedPerformances,
          spinoffPotential: calculateSpinoffPotential(totalPopularity, peakPopularity, updatedPerformances),
          iconicStatus: getIconicStatus(totalPopularity),
          marketValue: calculateMarketValue(totalPopularity, peakPopularity),
          fanbaseSize: Math.round(totalPopularity * 1000),
          culturalImpact: calculateCulturalImpact(updatedPerformances),
          lastActiveYear: performance.releaseYear,
          trendingScore: calculateTrendingScore(updatedPerformances, gameState.currentYear)
        } : p);
      } else {
        const newCharacter: CharacterPopularity = {
          characterId: performance.characterId,
          characterName: performance.characterName,
          franchiseId: performance.franchiseId,
          totalPopularity: performance.popularityGain,
          peakPopularity: performance.performanceScore,
          performances: [performance],
          spinoffPotential: Math.min(100, performance.popularityGain * 2),
          iconicStatus: getIconicStatus(performance.popularityGain),
          marketValue: performance.popularityGain * 100000,
          fanbaseSize: performance.popularityGain * 1000,
          culturalImpact: Math.min(100, performance.performanceScore),
          lastActiveYear: performance.releaseYear,
          trendingScore: performance.performanceScore
        };
        return [...prev, newCharacter];
      }
    });
  };

  const calculateSpinoffPotential = (
    totalPop: number, 
    peakPop: number, 
    performances: CharacterPerformance[]
  ): number => {
    const recencyBonus = performances.length > 0 ? 
      Math.max(0, 50 - (gameState.currentYear - performances[performances.length - 1].releaseYear) * 10) : 0;
    const consistencyBonus = performances.length > 1 ? 
      Math.min(20, performances.filter(p => p.performanceScore > 70).length * 5) : 0;
    
    return Math.min(100, (totalPop / 10) + (peakPop * 0.3) + recencyBonus + consistencyBonus);
  };

  const getIconicStatus = (totalPop: number): CharacterPopularity['iconicStatus'] => {
    if (totalPop >= 800) return 'legendary';
    if (totalPop >= 500) return 'iconic';
    if (totalPop >= 200) return 'popular';
    if (totalPop >= 50) return 'recognized';
    return 'unknown';
  };

  const calculateMarketValue = (totalPop: number, peakPop: number): number => {
    return Math.round((totalPop * 50000) + (peakPop * 100000));
  };

  const calculateCulturalImpact = (performances: CharacterPerformance[]): number => {
    const avgScore = performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length;
    const longevityBonus = Math.min(30, performances.length * 5);
    const culturalMoments = performances.reduce((sum, p) => sum + p.culturalMoments.length, 0);
    
    return Math.min(100, avgScore + longevityBonus + (culturalMoments * 2));
  };

  const calculateTrendingScore = (performances: CharacterPerformance[], currentYear: number): number => {
    const recentPerformances = performances.filter(p => currentYear - p.releaseYear <= 2);
    if (recentPerformances.length === 0) return Math.max(0, 50 - (currentYear - performances[performances.length - 1].releaseYear) * 10);
    
    const avgRecentScore = recentPerformances.reduce((sum, p) => sum + p.performanceScore, 0) / recentPerformances.length;
    return Math.min(100, avgRecentScore + (recentPerformances.length * 10));
  };

  // Process completed projects to generate character performances
  useEffect(() => {
    const completedProjects = gameState.projects.filter(p => 
      p.status === 'released' && 
      p.script?.characters?.length > 0 &&
      !characterPopularities.some(cp => 
        cp.performances.some(perf => perf.projectId === p.id)
      )
    );

    completedProjects.forEach(project => {
      project.script.characters?.forEach(character => {
        if (character.assignedTalentId) {
          const talent = gameState.talent.find(t => t.id === character.assignedTalentId);
          if (talent) {
            const performance = calculateCharacterPerformance(character, talent, project);
            updateCharacterPopularity(performance);
            updateTalentExpertise(performance);
          }
        }
      });
    });
  }, [gameState.projects]);

  const updateTalentExpertise = (performance: CharacterPerformance) => {
    setTalentExpertise(prev => {
      const existing = prev.find(e => 
        e.talentId === performance.talentId && 
        e.characterId === performance.characterId
      );

      if (existing) {
        const updatedHistory = [...existing.performanceHistory, performance];
        const avgScore = updatedHistory.reduce((sum, p) => sum + p.performanceScore, 0) / updatedHistory.length;
        
        return prev.map(e => e === existing ? {
          ...e,
          expertiseLevel: Math.min(100, avgScore + (updatedHistory.length * 2)),
          performanceHistory: updatedHistory,
          typeCastingRisk: Math.min(100, updatedHistory.length * 15),
          fanExpectation: Math.min(100, avgScore + (updatedHistory.length * 5))
        } : e);
      } else {
        const newExpertise: TalentCharacterExpertise = {
          talentId: performance.talentId,
          characterId: performance.characterId,
          characterName: performance.characterName,
          franchiseId: performance.franchiseId,
          expertiseLevel: performance.performanceScore,
          performanceHistory: [performance],
          typeCastingRisk: 15,
          fanExpectation: performance.performanceScore,
          contractualRights: {
            hasFirstRefusal: performance.performanceScore > 80,
            sequelOptions: performance.performanceScore > 70 ? 2 : 0,
            approvalRights: performance.performanceScore > 85
          }
        };
        return [...prev, newExpertise];
      }
    });
  };

  const getTopCharacters = () => characterPopularities
    .sort((a, b) => b.totalPopularity - a.totalPopularity)
    .slice(0, 10);

  const getTrendingCharacters = () => characterPopularities
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 5);

  const getSpinoffCandidates = () => characterPopularities
    .filter(c => c.spinoffPotential > 60)
    .sort((a, b) => b.spinoffPotential - a.spinoffPotential)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Character Popularity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Character Popularity System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{characterPopularities.length}</div>
              <div className="text-sm text-muted-foreground">Tracked Characters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {characterPopularities.filter(c => c.iconicStatus === 'iconic' || c.iconicStatus === 'legendary').length}
              </div>
              <div className="text-sm text-muted-foreground">Iconic Characters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{getSpinoffCandidates().length}</div>
              <div className="text-sm text-muted-foreground">Spinoff Candidates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {characterPopularities.reduce((sum, c) => sum + c.marketValue, 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Market Value</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Characters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Most Popular Characters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getTopCharacters().map((character, index) => (
              <div 
                key={character.characterId}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedCharacter(character)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                  <div>
                    <p className="font-medium">{character.characterName}</p>
                    <p className="text-sm text-muted-foreground">
                      {character.fanbaseSize.toLocaleString()} fans • {character.performances.length} performances
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={character.iconicStatus === 'legendary' ? 'default' : 'outline'}>
                    {character.iconicStatus}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {character.totalPopularity} popularity
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending Characters */}
      {getTrendingCharacters().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Characters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getTrendingCharacters().map(character => (
                <div key={character.characterId} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{character.characterName}</p>
                    <p className="text-sm text-muted-foreground">
                      Last seen: {character.lastActiveYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={character.trendingScore} className="w-20" />
                    <span className="text-sm font-medium">{character.trendingScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spinoff Potential */}
      {getSpinoffCandidates().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Spinoff Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getSpinoffCandidates().map(character => (
                <div key={character.characterId} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{character.characterName}</p>
                    <Badge variant="outline">{character.spinoffPotential}% potential</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Market Value: ${character.marketValue.toLocaleString()}</p>
                    <p>Cultural Impact: {character.culturalImpact}%</p>
                    <p>Fan Base: {character.fanbaseSize.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Character Detail Modal would go here */}
      {selectedCharacter && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedCharacter.characterName} - Character Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Performance History</h4>
                <div className="space-y-2">
                  {selectedCharacter.performances.map(perf => (
                    <div key={`${perf.projectId}-${perf.characterId}`} className="p-2 border rounded">
                      <p className="font-medium">{perf.projectTitle} ({perf.releaseYear})</p>
                      <p className="text-sm">Portrayed by: {perf.talentName}</p>
                      <p className="text-sm">Performance: {perf.performanceScore}/100</p>
                      <p className="text-sm">Screen Time: {perf.screenTimeMinutes} minutes</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Cultural Impact</h4>
                <div className="space-y-2">
                  {selectedCharacter.performances.flatMap(p => p.culturalMoments).map((moment, index) => (
                    <p key={index} className="text-sm p-2 bg-muted rounded">"{moment}"</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};